import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import {
  ArrowPathIcon,
  PlusIcon,
  EyeIcon,
  LinkIcon,
  NoSymbolIcon,
  UsersIcon,
  CheckBadgeIcon,
  PhotoIcon,
  VideoCameraIcon,
  MegaphoneIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import PageHeaderShell from '../components/layout/PageHeaderShell'
import Loader from '../components/ui/Loader'
import BroadcastComposer from '../components/telegram/BroadcastComposer'
import BroadcastDetailModal from '../components/telegram/BroadcastDetailModal'
import { StatusBadge, AudienceBadge, ProgressBar, fmtDateTime } from '../components/telegram/broadcastUi'
import { telegramBroadcastService, Broadcast } from '../services/telegramBroadcastService'

const errMsg = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || fallback

const TelegramBroadcasts: React.FC = () => {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [composerOpen, setComposerOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data: list, isLoading, isFetching, refetch } = useQuery(
    ['tg-broadcasts', page, limit],
    () => telegramBroadcastService.list(page, limit),
    {
      keepPreviousData: true,
      // Keep the table live while anything is still sending
      refetchInterval: (d) => (d?.broadcasts.some((b) => b.status === 'sending') ? 5000 : false),
      onError: (e: any) => toast.error(errMsg(e, 'Failed to load broadcasts')),
    }
  )

  const { data: aud } = useQuery('tg-audience', () => telegramBroadcastService.getAudience(), { staleTime: 30000 })

  const botRunning = list?.bot_running ?? aud?.bot_running
  const totalPages = Math.max(1, Math.ceil((list?.total ?? 0) / limit))
  const broadcasts = list?.broadcasts ?? []

  const handleSent = (b: Broadcast) => {
    qc.invalidateQueries('tg-broadcasts')
    if (b.id) setDetailId(b.id)
  }

  const statCards = [
    { label: 'Linked Telegram', value: aud?.linked, hint: 'brokers who can receive', icon: LinkIcon, accent: 'text-blue-600 bg-blue-50' },
    { label: 'Linked & Active', value: aud?.linked_active, hint: 'default "Active" audience', icon: CheckBadgeIcon, accent: 'text-green-600 bg-green-50' },
    { label: 'Not Linked', value: aud?.not_linked, hint: 'will not receive broadcasts', icon: NoSymbolIcon, accent: 'text-slate-600 bg-slate-100' },
    { label: 'Total Brokers', value: aud?.total_brokers, hint: 'all brokers', icon: UsersIcon, accent: 'text-violet-600 bg-violet-50' },
  ]

  return (
    <div className="min-h-screen bg-white font-sans">
      <PageHeaderShell>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/brokers')}
              title="Back to Brokers"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700">
              <PaperAirplaneIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                Telegram Broadcasts
              </h1>
              <p className="text-xs font-medium text-slate-500">Brokers · Send promotions, alerts and notices through the Telegram bot</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {botRunning !== undefined && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
                  botRunning ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${botRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                Bot {botRunning ? 'running' : 'offline'}
              </span>
            )}
            <button
              onClick={() => { refetch(); qc.invalidateQueries('tg-audience') }}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={() => setComposerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" /> New Broadcast
            </button>
          </div>
        </div>
      </PageHeaderShell>

      <main className="space-y-3 px-2 pb-6 pt-3">
        {/* Audience stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map(({ label, value, hint, icon: Icon, accent }) => (
            <div key={label} className="group rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
                  <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {value === undefined ? '—' : value.toLocaleString('en-IN')}
                  </div>
                  <p className="mt-3 truncate text-xs text-slate-500">{hint}</p>
                </div>
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* History */}
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Broadcast History <span className="font-normal text-slate-500">({list?.total ?? 0})</span>
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
              >
                {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">‹</button>
              <span>{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">›</button>
            </div>
          </div>

          {isLoading ? (
            <Loader label="Loading broadcasts..." />
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <MegaphoneIcon className="h-7 w-7 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No broadcasts yet</p>
              <p className="mt-1 text-xs text-slate-500">Send your first message to brokers on Telegram.</p>
              <button
                onClick={() => setComposerOpen(true)}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4" /> New Broadcast
              </button>
            </div>
          ) : (
            <div className="overflow-auto no-scrollbar max-h-[calc(100vh-220px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Broadcast</th>
                    <th className="px-3 py-2.5 text-center">Audience</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="w-56 px-3 py-2.5 text-left">Delivery</th>
                    <th className="px-3 py-2.5 text-left">Created</th>
                    <th className="px-3 py-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {broadcasts.map((b) => (
                    <tr key={b.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => setDetailId(b.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {b.media && (
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500" title={b.media.kind}>
                              {b.media.kind === 'video' ? <VideoCameraIcon className="h-4 w-4" /> : <PhotoIcon className="h-4 w-4" />}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{b.title || 'Untitled broadcast'}</p>
                            <p className="truncate text-xs text-slate-500">
                              #{b.id}{b.buttons.length > 0 && ` · ${b.buttons.length} button${b.buttons.length > 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center"><AudienceBadge audience={b.audience} isTest={b.is_test} /></td>
                      <td className="px-3 py-3 text-center"><StatusBadge status={b.status} unsent={!!b.unsent_at} /></td>
                      <td className="px-3 py-3">
                        <ProgressBar sent={b.sent} failed={b.failed} total={b.total} compact />
                        <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                          <span className="font-semibold text-green-600">{b.sent}</span>/{b.total} sent
                          {b.failed > 0 && <> · <span className="font-semibold text-red-600">{b.failed}</span> failed</>}
                          {b.pending > 0 && <> · {b.pending} pending</>}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">
                        <p>{fmtDateTime(b.created_at)}</p>
                        <p className="text-slate-400">by {b.created_by || '—'}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailId(b.id) }}
                          className="rounded-lg bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-700 hover:text-white"
                          title="View details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <BroadcastComposer isOpen={composerOpen} onClose={() => setComposerOpen(false)} onSent={handleSent} />
      <BroadcastDetailModal broadcastId={detailId} onClose={() => setDetailId(null)} />
    </div>
  )
}

export default TelegramBroadcasts
