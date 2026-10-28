import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { XMarkIcon, MagnifyingGlassIcon, StopCircleIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline'
import Loader from '../ui/Loader'
import ConfirmationDialog from '../ui/ConfirmationDialog'
import SavingOverlay from '../ui/SavingOverlay'
import { telegramBroadcastService, canUnsend, RecipientStatus } from '../../services/telegramBroadcastService'
import { StatusBadge, AudienceBadge, ProgressBar, fmtDateTime } from './broadcastUi'

interface Props {
  broadcastId: number | null
  onClose: () => void
}

const RECIPIENT_STYLE: Record<RecipientStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  sent: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-amber-50 text-amber-700',
  deleted: 'bg-violet-50 text-violet-700',
}

const errMsg = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || fallback

const BroadcastDetailModal: React.FC<Props> = ({ broadcastId, onClose }) => {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | RecipientStatus>('all')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<null | 'cancel' | 'unsend'>(null)
  const [acting, setActing] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)

  const { data: b, isLoading } = useQuery(
    ['tg-broadcast', broadcastId],
    () => telegramBroadcastService.get(broadcastId as number),
    {
      enabled: broadcastId !== null,
      // Poll while the bot is still sending
      refetchInterval: (data) => (data?.status === 'sending' ? 3000 : false),
      onError: (e: any) => toast.error(errMsg(e, 'Failed to load broadcast')),
    }
  )

  useEffect(() => { setFilter('all'); setSearch('') }, [broadcastId])

  // The media endpoint needs the Authorization header → fetch as a blob
  useEffect(() => {
    let url: string | null = null
    let alive = true
    setMediaUrl(null)
    if (b?.media?.url) {
      telegramBroadcastService
        .getMediaObjectUrl(b.media.url)
        .then((u) => { url = u; if (alive) setMediaUrl(u) })
        .catch(() => {})
    }
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [b?.media?.url])

  const recipients = b?.recipients ?? []
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: recipients.length, pending: 0, sent: 0, failed: 0, cancelled: 0, deleted: 0 }
    recipients.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1 })
    return c
  }, [recipients])
  const rows = recipients.filter((r) => {
    const term = search.trim().toLowerCase()
    return (filter === 'all' || r.status === filter) &&
      (!term || r.username.toLowerCase().includes(term) || r.full_name.toLowerCase().includes(term))
  })

  const act = async () => {
    if (!b || !confirm) return
    const kind = confirm
    setConfirm(null)
    setActing(true)
    try {
      if (kind === 'cancel') await telegramBroadcastService.cancel(b.id)
      else await telegramBroadcastService.unsend(b.id)
      toast.success(kind === 'cancel' ? 'Broadcast cancelled' : 'Deleting the message from chats…')
      qc.invalidateQueries(['tg-broadcast', b.id])
      qc.invalidateQueries('tg-broadcasts')
    } catch (e) {
      toast.error(errMsg(e, kind === 'cancel' ? 'Failed to cancel' : 'Failed to unsend'))
    } finally {
      setActing(false)
    }
  }

  if (broadcastId === null) return null

  return (
    <>
      <SavingOverlay show={acting} label="Please wait..." />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {isLoading || !b ? (
            <Loader label="Loading broadcast..." />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-bold text-slate-900">{b.title || 'Untitled broadcast'}</h2>
                    <StatusBadge status={b.status} unsent={!!b.unsent_at} />
                    <AudienceBadge audience={b.audience} isTest={b.is_test} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    #{b.id} · by {b.created_by || '—'} · {fmtDateTime(b.created_at)}
                    {b.finished_at && <> · finished {fmtDateTime(b.finished_at)}</>}
                    {b.unsent_at && <> · unsent {fmtDateTime(b.unsent_at)}</>}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {b.status === 'sending' && (
                    <button onClick={() => setConfirm('cancel')} className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100">
                      <StopCircleIcon className="h-4 w-4" /> Cancel
                    </button>
                  )}
                  {canUnsend(b) && (
                    <button onClick={() => setConfirm('unsend')} className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
                      <ArrowUturnLeftIcon className="h-4 w-4" /> Unsend
                    </button>
                  )}
                  <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto px-6 py-5 space-y-5">
                {/* Progress */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Total', value: b.total, cls: 'text-slate-900' },
                      { label: 'Sent', value: b.sent, cls: 'text-green-600' },
                      { label: 'Failed', value: b.failed, cls: 'text-red-600' },
                      { label: 'Pending', value: b.pending, cls: 'text-slate-500' },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{s.label}</p>
                        <p className={`text-2xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <ProgressBar sent={b.sent} failed={b.failed} total={b.total} />
                  {b.status === 'sending' && <p className="mt-2 text-xs text-blue-600">Sending… updating every 3 seconds</p>}
                </div>

                {/* Message */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px]">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Recipients</h3>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {(['all', 'sent', 'failed', 'pending', 'cancelled', 'deleted'] as const).map((k) =>
                        k === 'all' || counts[k] > 0 ? (
                          <button
                            key={k}
                            onClick={() => setFilter(k)}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                              filter === k ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {k} ({counts[k] ?? 0})
                          </button>
                        ) : null
                      )}
                      <div className="relative ml-auto w-44">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search..."
                          className="w-full rounded-md border border-slate-300 py-1 pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                        />
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto no-scrollbar rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="px-3 py-2 text-left">Broker</th>
                            <th className="px-3 py-2 text-center">Status</th>
                            <th className="px-3 py-2 text-left">Sent at / Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows.length === 0 ? (
                            <tr><td colSpan={3} className="px-3 py-8 text-center text-xs text-slate-400">No recipients</td></tr>
                          ) : (
                            rows.map((r) => (
                              <tr key={r.broker_id}>
                                <td className="px-3 py-2">
                                  <p className="font-medium text-slate-800">{r.full_name || r.username}</p>
                                  <p className="text-[11px] text-slate-500">@{r.username}</p>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${RECIPIENT_STYLE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {r.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  {r.error ? <span className="text-red-600">{r.error}</span> : <span className="text-slate-500">{fmtDateTime(r.sent_at)}</span>}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Message</h3>
                    <div className="rounded-xl bg-[#dfe6ee] p-3">
                      <div className="overflow-hidden rounded-2xl rounded-bl-md bg-white shadow-sm">
                        {b.media && (
                          mediaUrl ? (
                            b.media.kind === 'video' ? <video src={mediaUrl} className="w-full" controls muted /> : <img src={mediaUrl} alt="" className="w-full" />
                          ) : (
                            <div className="flex h-24 items-center justify-center bg-slate-100 text-xs text-slate-400">Loading {b.media.kind}…</div>
                          )
                        )}
                        {b.message_html && (
                          <div className="tg-preview whitespace-pre-wrap break-words px-3 py-2 text-[13px] leading-snug text-slate-900" dangerouslySetInnerHTML={{ __html: b.message_html }} />
                        )}
                      </div>
                      {b.buttons.map((btn, i) => (
                        <a key={i} href={btn.url} target="_blank" rel="noreferrer" className="mt-1 block rounded-lg bg-white/70 py-1.5 text-center text-[13px] font-medium text-[#3390ec] hover:bg-white">
                          {btn.text} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={act}
        type={confirm === 'unsend' ? 'danger' : 'warning'}
        title={confirm === 'unsend' ? 'Unsend broadcast?' : 'Cancel broadcast?'}
        message={
          confirm === 'unsend'
            ? 'This deletes the message from every broker chat it reached. It cannot be undone.'
            : 'Brokers who already got the message keep it. The remaining ones will not receive it.'
        }
        confirmText={confirm === 'unsend' ? 'Unsend' : 'Stop sending'}
      />
      <style>{`
        .tg-preview p { margin: 0; }
        .tg-preview a { color: #3390ec; }
        .tg-preview blockquote { border-left: 3px solid #3390ec; padding-left: .5rem; }
        .tg-preview code, .tg-preview pre { font-family: ui-monospace, monospace; font-size: .85em; background: #eef2f6; border-radius: .25rem; padding: 0 .2rem; }
        .tg-preview tg-spoiler, .tg-preview .tg-spoiler { background: #cbd5e1; color: transparent; border-radius: .2rem; }
      `}</style>
    </>
  )
}

export default BroadcastDetailModal
