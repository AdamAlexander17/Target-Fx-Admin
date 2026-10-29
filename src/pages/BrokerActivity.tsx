import React, { useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  SignalIcon,
  CalendarDaysIcon,
  UsersIcon,
  NoSymbolIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  TableCellsIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { BoltIcon } from '@heroicons/react/24/solid'
import PageHeaderShell from '../components/layout/PageHeaderShell'
import Loader from '../components/ui/Loader'
import { exportBrokerActivityExcel, exportBrokerActivityCsv } from '../components/brokerActivity/exportBrokerActivity'
import {
  brokerActivityService,
  ActivityChannel,
  BrokerActivityRow,
} from '../services/brokerActivityService'

// ─── Helpers ─────────────────────────────────────────────────────────
const CHANNEL_META: Record<ActivityChannel, { label: string; icon: any; dot: string; bar: string; chip: string }> = {
  app: { label: 'App', icon: DevicePhoneMobileIcon, dot: 'bg-blue-600', bar: 'bg-blue-600', chip: 'bg-blue-50 text-blue-700' },
  telegram: { label: 'Telegram', icon: ChatBubbleLeftRightIcon, dot: 'bg-sky-500', bar: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700' },
  ai: { label: 'AI', icon: SparklesIcon, dot: 'bg-violet-600', bar: 'bg-violet-600', chip: 'bg-violet-50 text-violet-700' },
}

/** "2s ago", "4m ago", "3h ago", "2d ago" */
const relative = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || seconds < 0) return '—'
  if (seconds < 60) return `${Math.floor(seconds)}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Seconds since the last activity, preferring the server's idle_seconds
const idleOf = (b: BrokerActivityRow): number | null => {
  if (b.idle_seconds !== null && b.idle_seconds !== undefined) return b.idle_seconds
  if (b.last_active_ts) return Math.max(0, Date.now() / 1000 - b.last_active_ts)
  return null
}

const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const fmtDateTime = (s: string | null) => {
  if (!s) return '—'
  const d = new Date(s.replace(' ', 'T'))
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Component ───────────────────────────────────────────────────────
const BrokerActivity: React.FC = () => {
  const [days, setDays] = useState(30)
  const [liveMinutes, setLiveMinutes] = useState(5)
  const [liveOnly, setLiveOnly] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const { data, isLoading, isFetching, refetch } = useQuery(
    ['broker-activity', days, liveMinutes, liveOnly],
    () => brokerActivityService.getActivity({ days, live_minutes: liveMinutes, live_only: liveOnly }),
    {
      keepPreviousData: true,
      refetchInterval: autoRefresh ? 30000 : false,
      refetchOnWindowFocus: false,
      onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to load broker activity'),
    }
  )

  const summary = data?.summary
  const daily = data?.daily ?? []
  const maxDaily = Math.max(1, ...daily.map((d) => d.brokers))
  const channels = summary?.live_by_channel ?? { app: 0, telegram: 0, ai: 0 }
  const channelTotal = Math.max(1, channels.app + channels.telegram + channels.ai)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = data?.brokers ?? []
    if (!term) return list
    return list.filter(
      (b) => b.username.toLowerCase().includes(term) || b.full_name.toLowerCase().includes(term) || String(b.id).includes(term)
    )
  }, [data, search])

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExportOpen(false)
    if (!data) return
    if (filtered.length === 0) { toast.error('Nothing to export'); return }
    const suffix = liveOnly ? 'live' : 'all'
    setExporting(true)
    try {
      if (format === 'csv') exportBrokerActivityCsv(filtered, suffix)
      else await exportBrokerActivityExcel(data, filtered, suffix)
      toast.success(`Exported ${filtered.length} broker${filtered.length === 1 ? '' : 's'}`)
    } catch (e) {
      console.error('Export failed:', e)
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const selectCls =
    'px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-300 shadow-sm'

  const statCards = summary
    ? [
        { label: 'Live Now', value: summary.live_now, hint: `active in last ${data?.live_minutes} min`, icon: SignalIcon, accent: 'text-green-600 bg-green-50', live: true },
        { label: 'Active Today', value: summary.active_today, hint: 'used BrokerEye today', icon: BoltIcon, accent: 'text-blue-600 bg-blue-50' },
        { label: 'Active 7 Days', value: summary.active_7d, hint: 'last 7 calendar days', icon: CalendarDaysIcon, accent: 'text-indigo-600 bg-indigo-50' },
        { label: 'Active 30 Days', value: summary.active_30d, hint: 'last 30 calendar days', icon: CalendarDaysIcon, accent: 'text-violet-600 bg-violet-50' },
        { label: 'Never Used', value: summary.never_used, hint: 'since tracking began', icon: NoSymbolIcon, accent: 'text-slate-600 bg-slate-100' },
        { label: 'Total Brokers', value: summary.total_brokers, hint: `${summary.active_accounts} active accounts`, icon: UsersIcon, accent: 'text-slate-700 bg-slate-100' },
      ]
    : []

  return (
    <div className="min-h-screen bg-white font-sans">
      <PageHeaderShell>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center">
              <SignalIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                Brokers Activity
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Who is using BrokerEye right now
                {data?.generated_at && (
                  <> · updated {fmtDateTime(data.generated_at)}{data.timezone ? ` (${data.timezone})` : ''}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={days}
              onChange={(e) => { setDays(Number(e.target.value)); setPage(1) }}
              className={selectCls}
              title="History length"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <select
              value={liveMinutes}
              onChange={(e) => { setLiveMinutes(Number(e.target.value)); setPage(1) }}
              className={selectCls}
              title="A broker counts as live if active within this window"
            >
              <option value={5}>Live: 5 min</option>
              <option value={15}>Live: 15 min</option>
              <option value={30}>Live: 30 min</option>
              <option value={60}>Live: 60 min</option>
            </select>
            <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer shadow-sm hover:bg-slate-50">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              Auto-refresh
            </label>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg flex items-center gap-1.5 shadow-sm text-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Export: every row of the current view (All / Live only + search), not just this page */}
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                disabled={!data || exporting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm text-sm font-semibold disabled:opacity-60"
              >
                {exporting ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="w-4 h-4" />
                )}
                Export
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">
                      {filtered.length} {liveOnly ? 'live ' : ''}broker{filtered.length === 1 ? '' : 's'}
                      {search.trim() ? ' matching your search' : ''}
                    </p>
                    {[
                      { key: 'xlsx', label: 'Excel (.xlsx)', hint: 'Brokers, summary & daily sheets', icon: TableCellsIcon, color: 'text-green-600 bg-green-50' },
                      { key: 'csv', label: 'CSV (.csv)', hint: 'Broker list only', icon: DocumentTextIcon, color: 'text-blue-600 bg-blue-50' },
                    ].map((o) => (
                      <button
                        key={o.key}
                        onClick={() => handleExport(o.key as 'xlsx' | 'csv')}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${o.color}`}>
                          <o.icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-slate-800">{o.label}</span>
                          <span className="block text-[11px] text-slate-500">{o.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </PageHeaderShell>

      <main className="px-2 pt-3 pb-6 space-y-3">
        {isLoading && !data ? (
          <Loader label="Loading broker activity..." />
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {statCards.map(({ label, value, hint, icon: Icon, accent, live }) => (
                <div
                  key={label}
                  className="group rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {label}
                      </div>
                      <div className="flex items-center gap-2">
                        {live && (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                          </span>
                        )}
                        <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                          {value.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="mt-3 truncate text-xs text-slate-500">{hint}</p>
                    </div>
                    <div
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Daily active brokers */}
              <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Daily Active Brokers</h3>
                  <span className="text-xs text-slate-500">last {data?.days} days</span>
                </div>
                {daily.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">No activity data yet</p>
                ) : (
                  <div className="flex h-24 items-end gap-[3px]">
                    {daily.map((d, i) => {
                      const h = (d.brokers / maxDaily) * 100
                      const showLabel = daily.length <= 14 || i % Math.ceil(daily.length / 10) === 0 || i === daily.length - 1
                      return (
                        <div key={d.date} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                          <div className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
                            {shortDate(d.date)}: <span className="font-semibold">{d.brokers}</span> brokers
                          </div>
                          <div
                            className={`w-full rounded-t ${d.brokers > 0 ? 'bg-blue-600 group-hover:bg-blue-700' : 'bg-slate-100'}`}
                            style={{ height: `${Math.max(d.brokers > 0 ? 4 : 2, h)}%` }}
                          />
                          <span className={`mt-1 h-3 text-[9px] text-slate-400 ${showLabel ? '' : 'invisible'}`}>
                            {shortDate(d.date)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Live by channel */}
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Live by Channel</h3>
                  <span className="text-xs text-slate-500">{summary?.live_now ?? 0} live</span>
                </div>
                <div className="space-y-2">
                  {(Object.keys(CHANNEL_META) as ActivityChannel[]).map((c) => {
                    const meta = CHANNEL_META[c]
                    const Icon = meta.icon
                    return (
                      <div key={c}>
                        <div className="mb-0.5 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-700">
                            <Icon className="h-3.5 w-3.5 text-slate-500" />
                            {meta.label}
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums">{channels[c]}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${meta.bar} transition-[width] duration-500`}
                            style={{ width: `${(channels[c] / channelTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Live = open app connection or any action in the last {data?.live_minutes} minutes.
                </p>
              </div>
            </div>

            {/* Brokers table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  {/* All / Live tabs */}
                  <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5">
                    {[
                      { key: false, label: 'All brokers' },
                      { key: true, label: 'Live only' },
                    ].map((t) => (
                      <button
                        key={String(t.key)}
                        onClick={() => { setLiveOnly(t.key); setPage(1) }}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          liveOnly === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full md:w-72">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                      placeholder="Search by name, username or ID..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span>{filtered.length} brokers</span>
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="px-2 py-1 border border-slate-300 rounded-md bg-white text-xs"
                  >
                    {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(Math.max(1, safePage - 1))}
                      disabled={safePage === 1}
                      className="px-2 py-1 border border-slate-300 rounded-md disabled:opacity-40"
                    >‹</button>
                    <span>{safePage} / {totalPages}</span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                      disabled={safePage === totalPages}
                      className="px-2 py-1 border border-slate-300 rounded-md disabled:opacity-40"
                    >›</button>
                  </div>
                </div>
              </div>

              <div className="overflow-auto no-scrollbar max-h-[calc(100vh-220px)]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Broker</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                      <th className="px-3 py-2.5 text-center">Last Active</th>
                      <th className="px-3 py-2.5 text-center">Channel</th>
                      <th className="px-3 py-2.5 text-center">Connections</th>
                      <th className="px-3 py-2.5 text-center">Active Days</th>
                      <th className="px-3 py-2.5 text-center">Today (App / Telegram / AI)</th>
                      <th className="px-3 py-2.5 text-center">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-12 text-center text-sm text-slate-500">
                          {liveOnly ? 'No brokers are live right now.' : 'No brokers match your search.'}
                        </td>
                      </tr>
                    ) : (
                      rows.map((b) => {
                        const idle = idleOf(b)
                        const neverUsed = !b.last_active_at
                        const ch = b.last_active_channel ? CHANNEL_META[b.last_active_channel] : null
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2.5">
                              <p className="font-semibold text-slate-900">{b.full_name || b.username}</p>
                              <p className="text-xs text-slate-500">@{b.username} · ID {b.id}</p>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {b.live ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                  <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                                  </span>
                                  Live
                                </span>
                              ) : neverUsed ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Never used</span>
                              ) : (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Idle</span>
                              )}
                              {!b.is_active && (
                                <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">Disabled</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {neverUsed ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <>
                                  <p className="font-medium text-slate-800">{relative(idle)}</p>
                                  <p className="text-[11px] text-slate-500">{fmtDateTime(b.last_active_at)}</p>
                                </>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {ch ? (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ch.chip}`}>
                                  <ch.icon className="h-3.5 w-3.5" />
                                  {ch.label}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{b.connections}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{b.active_days}</td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="inline-flex items-center gap-1.5 text-xs tabular-nums">
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700" title="App requests">{b.today.app_requests}</span>
                                <span className="rounded bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-700" title="Telegram actions">{b.today.telegram_actions}</span>
                                <span className="rounded bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700" title="AI requests">{b.today.ai_requests}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                                {fmtDateTime(b.last_login_at)}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default BrokerActivity
