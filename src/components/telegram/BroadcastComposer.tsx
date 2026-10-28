import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import {
  XMarkIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import RichTextEditor from './RichTextEditor'
import SavingOverlay from '../ui/SavingOverlay'
import ConfirmationDialog from '../ui/ConfirmationDialog'
import {
  telegramBroadcastService,
  Broadcast,
  BroadcastButton,
  MediaKind,
  MEDIA_RULES,
  ACCEPTED_MEDIA,
  LIMITS,
  mediaKindOf,
  PreviewResult,
} from '../../services/telegramBroadcastService'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSent: (broadcast: Broadcast) => void
}

type AudienceChoice = 'active' | 'all' | 'selected'

interface MediaState {
  file: File
  kind: MediaKind
  localUrl: string
  media_id: string | null
  progress: number
  uploading: boolean
  error: string | null
}

const URL_RE = /^(https?:\/\/|tg:\/\/)\S+$/i

// Telegram-like chat look for the live preview
const TG_PREVIEW_CSS = `
  .tg-wallpaper {
    background-color: #c8d7c2;
    background-image:
      radial-gradient(rgba(255,255,255,.35) 1px, transparent 1.2px),
      linear-gradient(160deg, #d4e3c4 0%, #b8cfb4 50%, #a9c4b8 100%);
    background-size: 14px 14px, 100% 100%;
  }
  .tg-bubble::after {
    content: ''; position: absolute; left: -6px; bottom: 0;
    border-width: 0 0 10px 8px; border-style: solid;
    border-color: transparent transparent #fff transparent;
  }
  .tg-preview p { margin: 0; }
  .tg-preview a { color: #3390ec; text-decoration: none; }
  .tg-preview blockquote { border-left: 3px solid #3390ec; padding-left: .5rem; margin: .25rem 0; }
  .tg-preview code, .tg-preview pre { font-family: ui-monospace, monospace; font-size: .85em; background: #eef2f6; border-radius: .25rem; padding: 0 .2rem; }
  .tg-preview ul { list-style: disc; padding-left: 1.1rem; }
  .tg-preview ol { list-style: decimal; padding-left: 1.1rem; }
  .tg-preview .tg-spoiler, .tg-preview tg-spoiler { background: #cbd5e1; color: transparent; border-radius: .2rem; }
`

// Visible text of the editor HTML (what Telegram counts, tags excluded)
const textOf = (html: string) => {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || '').replace(/ /g, ' ')
}

const errMsg = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback

const BroadcastComposer: React.FC<Props> = ({ isOpen, onClose, onSent }) => {
  const [title, setTitle] = useState('')
  const [html, setHtml] = useState('')
  const [media, setMedia] = useState<MediaState | null>(null)
  const [buttons, setButtons] = useState<BroadcastButton[]>([])
  const [audience, setAudience] = useState<AudienceChoice>('active')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [linkedOnly, setLinkedOnly] = useState(true)
  const [testBrokerId, setTestBrokerId] = useState<number | ''>('')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [busy, setBusy] = useState<null | 'test' | 'send'>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: aud, isLoading: audLoading } = useQuery(
    'tg-audience',
    () => telegramBroadcastService.getAudience(),
    { enabled: isOpen, staleTime: 30000, onError: (e: any) => toast.error(errMsg(e, 'Failed to load audience')) }
  )

  // Reset everything each time the composer opens
  useEffect(() => {
    if (!isOpen) return
    setTitle(''); setHtml(''); setButtons([]); setAudience('active'); setSelected(new Set())
    setSearch(''); setLinkedOnly(true); setTestBrokerId(''); setPreview(null); setShowErrors(false)
    setMedia((m) => { if (m) URL.revokeObjectURL(m.localUrl); return null })
  }, [isOpen])

  // Server preview (cleaned HTML + Telegram length), debounced
  const plain = textOf(html)
  const hasMedia = !!media
  useEffect(() => {
    if (!isOpen) return
    if (!plain.trim()) { setPreview(null); return }
    setPreviewLoading(true)
    const t = window.setTimeout(async () => {
      try {
        setPreview(await telegramBroadcastService.preview(html, hasMedia))
      } catch {
        setPreview(null) // fall back to the local count
      } finally {
        setPreviewLoading(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [html, hasMedia, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const length = preview?.length || plain.length
  const overLimit = length > LIMITS.message
  const overCaption = hasMedia && length > LIMITS.caption

  // ─── Media ─────────────────────────────────────────────────────────
  const pickMedia = async (file: File | null) => {
    if (!file) return
    const kind = mediaKindOf(file)
    if (!kind) { toast.error('Use a photo (.jpg .png .webp), video (.mp4 .m4v .mov) or GIF'); return }
    const rule = MEDIA_RULES[kind]
    if (file.size > rule.maxMb * 1024 * 1024) { toast.error(`${rule.label} must be ${rule.maxMb} MB or smaller`); return }

    if (media) URL.revokeObjectURL(media.localUrl)
    const localUrl = URL.createObjectURL(file)
    setMedia({ file, kind, localUrl, media_id: null, progress: 0, uploading: true, error: null })
    try {
      const { media_id } = await telegramBroadcastService.uploadMedia(file, (p) =>
        setMedia((m) => (m && m.file === file ? { ...m, progress: p } : m))
      )
      setMedia((m) => (m && m.file === file ? { ...m, media_id, uploading: false, progress: 1 } : m))
    } catch (e) {
      setMedia((m) => (m && m.file === file ? { ...m, uploading: false, error: errMsg(e, 'Upload failed') } : m))
    }
  }

  const removeMedia = () => {
    if (media) URL.revokeObjectURL(media.localUrl)
    setMedia(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ─── Buttons ───────────────────────────────────────────────────────
  const setButton = (i: number, patch: Partial<BroadcastButton>) =>
    setButtons((bs) => bs.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  const buttonError = (b: BroadcastButton) => {
    if (!b.text.trim()) return 'Text is required'
    if (b.text.trim().length > LIMITS.buttonText) return `Max ${LIMITS.buttonText} characters`
    if (!URL_RE.test(b.url.trim())) return 'URL must start with https://, http:// or tg://'
    return null
  }

  // ─── Audience ──────────────────────────────────────────────────────
  const brokers = aud?.brokers ?? []
  const linkedBrokers = useMemo(
    () => brokers.filter((b) => b.telegram_linked).sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username)),
    [brokers]
  )
  const visibleBrokers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return brokers.filter(
      (b) =>
        (!linkedOnly || b.telegram_linked) &&
        (!term || b.username.toLowerCase().includes(term) || b.full_name.toLowerCase().includes(term) || String(b.id).includes(term))
    )
  }, [brokers, search, linkedOnly])

  const toggle = (id: number) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectableVisible = visibleBrokers.filter((b) => b.telegram_linked)
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((b) => selected.has(b.id))
  const toggleAllVisible = () =>
    setSelected((s) => {
      const n = new Set(s)
      selectableVisible.forEach((b) => (allVisibleSelected ? n.delete(b.id) : n.add(b.id)))
      return n
    })

  const recipientCount =
    audience === 'active' ? aud?.linked_active ?? 0 : audience === 'all' ? aud?.linked ?? 0 : selected.size

  // ─── Validation ────────────────────────────────────────────────────
  const errors: string[] = []
  if (title.trim().length > LIMITS.title) errors.push(`Title must be ${LIMITS.title} characters or fewer`)
  if (!plain.trim() && !media) errors.push('Write a message or add a photo / video / GIF')
  if (overLimit) errors.push(`Message is longer than ${LIMITS.message} characters`)
  if (media?.uploading) errors.push('Wait for the media upload to finish')
  if (media?.error) errors.push('Media upload failed. Remove it or try again')
  if (buttons.some((b) => buttonError(b))) errors.push('Fix the link buttons')
  const contentValid = errors.length === 0
  const botDown = aud ? !aud.bot_running : false

  // First thing blocking a send (shown in the preview summary), or null when ready
  const readinessIssue: string | null = botDown
    ? 'Telegram bot is offline'
    : errors[0] ??
      (recipientCount === 0
        ? audience === 'selected'
          ? 'Select at least one broker'
          : 'No linked brokers in this audience'
        : null)

  const buildPayload = () => ({
    title: title.trim() || 'Untitled broadcast',
    message: html,
    media_id: media?.media_id || undefined,
    buttons: buttons.map((b) => ({ text: b.text.trim(), url: b.url.trim() })),
  })

  // ─── Actions ───────────────────────────────────────────────────────
  const sendTest = async () => {
    setShowErrors(true)
    if (!contentValid || !testBrokerId) return
    setBusy('test')
    try {
      const { broadcast } = await telegramBroadcastService.send({ ...buildPayload(), test_broker_id: Number(testBrokerId) })
      const who = linkedBrokers.find((b) => b.id === Number(testBrokerId))
      toast.success(`Test sent to ${who?.full_name || who?.username || 'broker'}`)
      onSent({ ...broadcast, is_test: true })
    } catch (e) {
      toast.error(errMsg(e, 'Failed to send test'))
    } finally {
      setBusy(null)
    }
  }

  const requestSend = () => {
    setShowErrors(true)
    if (!contentValid) return
    if (audience === 'selected' && selected.size === 0) { toast.error('Select at least one broker'); return }
    if (recipientCount === 0) { toast.error('No linked brokers in this audience'); return }
    setConfirmOpen(true)
  }

  const send = async () => {
    setConfirmOpen(false)
    setBusy('send')
    try {
      const { broadcast, message } = await telegramBroadcastService.send({
        ...buildPayload(),
        audience,
        ...(audience === 'selected' ? { broker_ids: Array.from(selected) } : {}),
      })
      toast.success(message || 'Broadcast started')
      onSent(broadcast)
      onClose()
    } catch (e) {
      toast.error(errMsg(e, 'Failed to send broadcast'))
    } finally {
      setBusy(null)
    }
  }

  if (!isOpen) return null

  const previewHtml = preview?.html || html
  const sectionLabel = 'mb-1.5 block text-xs font-semibold text-slate-700'
  const audienceOptions: { key: AudienceChoice; label: string; hint: string; count: number | string }[] = [
    { key: 'active', label: 'Active brokers', hint: 'All active brokers who linked Telegram', count: aud?.linked_active ?? '—' },
    { key: 'all', label: 'All brokers', hint: 'Including inactive brokers who linked Telegram', count: aud?.linked ?? '—' },
    { key: 'selected', label: 'Selected brokers', hint: 'Choose specific brokers below', count: selected.size },
  ]

  return (
    <>
      <SavingOverlay show={!!busy} label={busy === 'test' ? 'Sending test...' : 'Starting broadcast...'} />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
        <div
          className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">New Telegram Broadcast</h2>
              <p className="text-xs text-slate-500">Only brokers who linked Telegram receive it</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {botDown && (
            <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
              <ExclamationTriangleIcon className="h-4 w-4" />
              The Telegram bot is not running. Sending is disabled until it is back online.
            </div>
          )}

          <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_380px]">
            {/* ─── Form ─── */}
            <div className="space-y-5 overflow-y-auto px-6 py-5">
              {/* Title */}
              <div>
                <label className={sectionLabel}>
                  Title <span className="font-normal text-slate-400">(for history only, not sent)</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={LIMITS.title}
                  placeholder="e.g. Diwali offer"
                  className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Message */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Message</label>
                  <span className={`text-xs tabular-nums ${overLimit ? 'font-semibold text-red-600' : overCaption ? 'text-amber-600' : 'text-slate-500'}`}>
                    {previewLoading ? '…' : length.toLocaleString('en-IN')} / {(hasMedia ? LIMITS.caption : LIMITS.message).toLocaleString('en-IN')}
                    {hasMedia && ' (caption)'}
                  </span>
                </div>
                <RichTextEditor value={html} onChange={setHtml} placeholder="Write your message… emoji work too 🎉" />
                {overCaption && !overLimit && (
                  <p className="mt-1.5 text-xs text-amber-700">
                    Longer than a caption ({LIMITS.caption}): the text is sent as its own message right after the media, with the buttons.
                  </p>
                )}
              </div>

              {/* Media */}
              <div>
                <label className={sectionLabel}>
                  Media <span className="font-normal text-slate-400">(optional · photo 10 MB, video / GIF 50 MB)</span>
                </label>
                {!media ? (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 px-4 py-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <PhotoIcon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-800">Add a photo, video or GIF</span>
                      <span className="block text-xs text-slate-500">.jpg .png .webp · .mp4 .m4v .mov · .gif</span>
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {media.kind === 'video' ? (
                        <video src={media.localUrl} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={media.localUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{media.file.name}</p>
                      <p className="text-xs text-slate-500">
                        {MEDIA_RULES[media.kind].label} · {(media.file.size / 1048576).toFixed(2)} MB
                      </p>
                      {media.uploading && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full bg-blue-600 transition-[width]" style={{ width: `${Math.max(3, media.progress * 100)}%` }} />
                        </div>
                      )}
                      {media.media_id && !media.uploading && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                          <CheckCircleIcon className="h-3.5 w-3.5" /> Uploaded
                        </p>
                      )}
                      {media.error && <p className="mt-1 text-xs text-red-600">{media.error}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      {media.error && (
                        <button onClick={() => pickMedia(media.file)} className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                          Retry
                        </button>
                      )}
                      <button onClick={removeMedia} title="Remove" className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept={ACCEPTED_MEDIA} className="hidden" onChange={(e) => pickMedia(e.target.files?.[0] ?? null)} />
              </div>

              {/* Link buttons */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Link buttons <span className="font-normal text-slate-400">(up to {LIMITS.buttons}, one per row)</span>
                  </label>
                  {buttons.length < LIMITS.buttons && (
                    <button
                      type="button"
                      onClick={() => setButtons((b) => [...b, { text: '', url: 'https://' }])}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      <PlusIcon className="h-3.5 w-3.5" /> Add button
                    </button>
                  )}
                </div>
                {buttons.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400">No buttons</p>
                ) : (
                  <div className="space-y-2">
                    {buttons.map((b, i) => {
                      const err = showErrors ? buttonError(b) : null
                      return (
                        <div key={i}>
                          <div className="flex items-center gap-2">
                            <input
                              value={b.text}
                              maxLength={LIMITS.buttonText}
                              onChange={(e) => setButton(i, { text: e.target.value })}
                              placeholder="Button text"
                              className="w-2/5 rounded-lg border-2 border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                            />
                            <div className="relative flex-1">
                              <LinkIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                              <input
                                value={b.url}
                                onChange={(e) => setButton(i, { url: e.target.value })}
                                placeholder="https://..."
                                className="w-full rounded-lg border-2 border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                              />
                            </div>
                            <button onClick={() => setButtons((bs) => bs.filter((_, idx) => idx !== i))} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                          {err && <p className="mt-1 text-[11px] text-red-600">{err}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Audience */}
              <div>
                <label className={sectionLabel}>Audience</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {audienceOptions.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setAudience(o.key)}
                      className={`rounded-lg border-2 px-3 py-2.5 text-left transition-colors ${
                        audience === o.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${audience === o.key ? 'text-blue-800' : 'text-slate-800'}`}>{o.label}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{o.count}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">{o.hint}</p>
                    </button>
                  ))}
                </div>

                {audience === 'selected' && (
                  <div className="mt-3 rounded-lg border border-slate-200">
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-2">
                      <div className="relative flex-1 min-w-[180px]">
                        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search brokers..."
                          className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" checked={linkedOnly} onChange={(e) => setLinkedOnly(e.target.checked)} className="h-3.5 w-3.5 rounded text-blue-600" />
                        Linked only
                      </label>
                      <button onClick={toggleAllVisible} className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                        {allVisibleSelected ? 'Unselect visible' : 'Select visible'}
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {audLoading ? (
                        <p className="p-4 text-center text-sm text-slate-400">Loading brokers…</p>
                      ) : visibleBrokers.length === 0 ? (
                        <p className="p-4 text-center text-sm text-slate-400">No brokers found</p>
                      ) : (
                        visibleBrokers.map((b) => (
                          <label
                            key={b.id}
                            className={`flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 ${
                              b.telegram_linked ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed opacity-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={!b.telegram_linked}
                              checked={selected.has(b.id)}
                              onChange={() => toggle(b.id)}
                              className="h-4 w-4 rounded text-blue-600"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-800">{b.full_name || b.username}</span>
                              <span className="block text-[11px] text-slate-500">@{b.username} · ID {b.id}</span>
                            </span>
                            {!b.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Inactive</span>}
                            {b.telegram_linked ? (
                              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Linked</span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Not linked</span>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {showErrors && errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  {errors.map((e) => (
                    <p key={e} className="text-xs text-red-700">• {e}</p>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Telegram preview + send summary ─── */}
            <div className="hidden min-h-0 flex-col gap-3 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 lg:flex">
              {/* Chat window */}
              <div className="flex min-h-[340px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                {/* Chat header */}
                <div className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-3 py-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
                    BE
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">BrokerEye Bot</p>
                    <p className="text-[11px] text-slate-500">bot</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Preview
                  </span>
                </div>

                {/* Messages area (Telegram-style wallpaper) */}
                <div className="tg-wallpaper flex flex-1 flex-col justify-end overflow-y-auto px-3 py-4">
                  <div className="mb-3 self-center rounded-full bg-black/10 px-2.5 py-0.5 text-[10px] font-medium text-white">Today</div>

                  {plain.trim() || media ? (
                    <div className="max-w-[88%]">
                      <div className="tg-bubble relative rounded-2xl rounded-bl-sm bg-white shadow-sm">
                        {media && (
                          <div className="overflow-hidden rounded-t-2xl">
                            {media.kind === 'video' ? (
                              <video src={media.localUrl} className="max-h-56 w-full bg-black object-cover" controls muted />
                            ) : (
                              <img src={media.localUrl} alt="" className="max-h-56 w-full object-cover" />
                            )}
                          </div>
                        )}
                        {plain.trim() && (
                          <div
                            className="tg-preview whitespace-pre-wrap break-words px-3 pt-2 text-[13.5px] leading-snug text-slate-900"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                          />
                        )}
                        <p className="px-3 pb-1.5 pt-0.5 text-right text-[10px] text-slate-400">
                          {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {buttons.filter((b) => b.text.trim()).map((b, i) => (
                        <div
                          key={i}
                          className="mt-1 flex items-center justify-center gap-1 rounded-lg bg-black/25 py-2 text-center text-[13px] font-medium text-white backdrop-blur-sm"
                        >
                          {b.text}
                          <span className="text-[10px] opacity-80">↗</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Empty state: a faded sample of what will appear */
                    <div className="max-w-[88%]">
                      <div className="opacity-60">
                        <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2.5 shadow-sm">
                          <div className="mb-2 h-2.5 w-32 rounded bg-slate-200" />
                          <div className="mb-1.5 h-2 w-48 rounded bg-slate-100" />
                          <div className="mb-1.5 h-2 w-40 rounded bg-slate-100" />
                          <div className="h-2 w-24 rounded bg-slate-100" />
                        </div>
                        <div className="mt-1 h-8 rounded-lg bg-black/15" />
                      </div>
                      <p className="mt-3 rounded-full bg-black/20 px-3 py-1 text-center text-[11px] font-medium text-white">
                        Start typing to see how brokers will receive it
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Send summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Summary</p>
                {[
                  {
                    label: 'Audience',
                    value: `${audienceOptions.find((o) => o.key === audience)?.label} · ${recipientCount}`,
                    cls: recipientCount === 0 ? 'text-red-600' : 'text-slate-900',
                  },
                  {
                    label: 'Media',
                    value: media ? MEDIA_RULES[media.kind].label + (media.uploading ? ' (uploading…)' : '') : 'None',
                    cls: 'text-slate-900',
                  },
                  { label: 'Buttons', value: String(buttons.length), cls: 'text-slate-900' },
                  {
                    label: 'Length',
                    value: `${length.toLocaleString('en-IN')} / ${(hasMedia ? LIMITS.caption : LIMITS.message).toLocaleString('en-IN')}`,
                    cls: overLimit ? 'text-red-600' : overCaption ? 'text-amber-600' : 'text-slate-900',
                  },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-xs last:border-0">
                    <span className="text-slate-500">{r.label}</span>
                    <span className={`font-semibold tabular-nums ${r.cls}`}>{r.value}</span>
                  </div>
                ))}

                {/* Readiness */}
                <div
                  className={`mt-2.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
                    readinessIssue ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'
                  }`}
                >
                  {readinessIssue ? (
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                  )}
                  {readinessIssue ?? 'Ready to send'}
                </div>
              </div>

              <style>{TG_PREVIEW_CSS}</style>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <select
                value={testBrokerId}
                onChange={(e) => setTestBrokerId(e.target.value ? Number(e.target.value) : '')}
                className="max-w-[220px] rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="">Test broker…</option>
                {linkedBrokers.map((b) => (
                  <option key={b.id} value={b.id}>{b.full_name || b.username} (@{b.username})</option>
                ))}
              </select>
              <button
                onClick={sendTest}
                disabled={!testBrokerId || !!busy || botDown}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <BeakerIcon className="h-4 w-4" /> Send test
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={requestSend}
                disabled={!!busy || botDown}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                Send to {recipientCount} broker{recipientCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={send}
        type="info"
        title="Send broadcast?"
        message={`This will send "${title.trim() || 'Untitled broadcast'}" to ${recipientCount} broker${recipientCount === 1 ? '' : 's'} on Telegram. You can cancel while it is sending, and unsend within 48 hours.`}
        confirmText="Send now"
      />
    </>
  )
}

export default BroadcastComposer
