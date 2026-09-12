import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  BanknotesIcon,
  ScaleIcon,
  ChartBarIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import {
  exchangeService,
  ExchangePagination,
  ExchangeReportRow,
  ExchangeReportTotals,
} from '../../services/exchangeService'

export const formatNumber = (val: number, decimals = 2) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val ?? 0)

// Color class for signed numeric values.
const signColor = (val: number, opts: { colorZero?: boolean } = {}) => {
  if (val > 0) return 'text-emerald-600'
  if (val < 0) return 'text-red-600'
  return opts.colorZero ? 'text-slate-400' : 'text-slate-700'
}

const SignedValue: React.FC<{
  value: number
  decimals?: number
  bold?: boolean
  showSign?: boolean
}> = ({ value, decimals = 2, bold, showSign }) => (
  <span className={`${signColor(value)} ${bold ? 'font-semibold' : 'font-medium'}`}>
    {showSign && value > 0 ? '+' : ''}
    {formatNumber(value, decimals)}
  </span>
)

const rowTotals = (row: ExchangeReportRow) =>
  row.Exchanges.reduce(
    (acc, e) => ({
      commission: acc.commission + e.Commission,
      lots: acc.lots + e.Lots,
      volume: acc.volume + e.Volume,
    }),
    { commission: 0, lots: 0, volume: 0 }
  )

type SortKey =
  | 'login'
  | 'name'
  | 'agentCommission'
  | 'commission'
  | 'lots'
  | 'volume'

interface ExchangeReportViewProps {
  brokerId: number | null
  weekId: number | null
  isLoading: boolean
  isFetching: boolean
  report: ExchangeReportRow[]
  exchangeCodes: string[]
  totals?: ExchangeReportTotals
  pagination?: ExchangePagination
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

const ExchangeReportView: React.FC<ExchangeReportViewProps> = ({
  brokerId,
  weekId,
  isLoading,
  report,
  exchangeCodes,
  totals,
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('login')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedLogin, setSelectedLogin] = useState<number | string | null>(null)

  // Per-login detail
  const { data: detailData, isLoading: detailLoading } = useQuery(
    ['exchange-data-detail', brokerId, weekId, selectedLogin],
    () =>
      exchangeService.getExchangeDataForLogins(
        brokerId as number,
        weekId as number,
        [selectedLogin as any]
      ),
    {
      enabled:
        selectedLogin !== null &&
        Number.isFinite(brokerId) &&
        !!weekId,
      retry: false,
      onError: () => toast.error('Failed to load login exchange detail'),
    }
  )
  const detailRow = detailData?.report?.[0]

  const enriched = useMemo(
    () => report.map((r) => ({ row: r, totals: rowTotals(r) })),
    [report]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return enriched
    return enriched.filter(
      ({ row }) =>
        String(row.Login).toLowerCase().includes(q) ||
        (row.Name ?? '').toLowerCase().includes(q)
    )
  }, [enriched, search])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let av: number | string
      let bv: number | string
      switch (sortBy) {
        case 'login':
          av = Number(a.row.Login); bv = Number(b.row.Login); break
        case 'name':
          av = (a.row.Name ?? '').toLowerCase(); bv = (b.row.Name ?? '').toLowerCase(); break
        case 'agentCommission':
          av = a.row.AgentCommission; bv = b.row.AgentCommission; break
        case 'commission':
          av = a.totals.commission; bv = b.totals.commission; break
        case 'lots':
          av = a.totals.lots; bv = b.totals.lots; break
        case 'volume':
          av = a.totals.volume; bv = b.totals.volume; break
        default:
          av = 0; bv = 0
      }
      if (av < bv) return sortOrder === 'asc' ? -1 : 1
      if (av > bv) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortBy, sortOrder])

  // The API owns pagination. This view only filters/sorts the rows returned for the current page.
  const totalPages = Math.max(1, pagination?.total_pages ?? 1)
  const safePage = Math.min(page, totalPages)
  const totalRows = pagination?.total ?? sorted.length
  const startIdx = totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIdx = Math.min(safePage * pageSize, totalRows)

  useEffect(() => {
    if (page !== 1) onPageChange(1)
  }, [search, sortBy, sortOrder])

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const kpis = useMemo(() => {
    return {
      logins: pagination?.total ?? enriched.length,
      agentCommission: totals?.AgentCommission ?? 0,
    }
  }, [enriched.length, pagination?.total, totals?.AgentCommission])

  const exchangeTotals = useMemo(
    () =>
      exchangeCodes.reduce<Record<string, { commission: number; lots: number; volume: number }>>(
        (acc, code) => {
          const exchange = totals?.Exchanges.find((item) => item.Exchange === code)
          acc[code] = {
            commission: exchange?.Commission ?? 0,
            lots: exchange?.Lots ?? 0,
            volume: exchange?.Volume ?? 0,
          }
          return acc
        },
        {}
      ),
    [exchangeCodes, totals]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col px-2 pt-3 pb-6">
        <div className="flex min-h-0 flex-1 flex-col bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-3 py-3 border-b border-slate-200">
            <div className="relative w-full md:w-80">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Login or Name"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="text-xs text-slate-500 hidden sm:inline">
                {totalRows} login{totalRows === 1 ? '' : 's'} found
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Show</span>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="appearance-none pr-7 pl-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="text-xs text-slate-500">entries</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={safePage <= 1}
                  onClick={() => onPageChange(Math.max(1, safePage - 1))}
                  className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
                  title="Previous page"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <span className="px-2 py-1 border border-slate-300 rounded-md text-xs">
                  {safePage}/{totalPages}
                </span>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
                  className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
                  title="Next page"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto border-t border-slate-200">
            <table className="w-max min-w-full border-separate border-spacing-0">
              <thead className="bg-[#09246B] text-white">
                <tr>
                  <SortableHeader label="Login" active={sortBy === 'login'} order={sortOrder} onClick={() => handleSort('login')} sticky rowSpan={2} />
                  <SortableHeader label="Name" active={sortBy === 'name'} order={sortOrder} onClick={() => handleSort('name')} rowSpan={2} />
                  <SortableHeader label="Agent Commission" active={sortBy === 'agentCommission'} order={sortOrder} onClick={() => handleSort('agentCommission')} rowSpan={2} />
                  {exchangeCodes.map((code) => (
                    <th key={code} colSpan={3} className="sticky top-0 z-50 h-11 border-b border-l-2 border-b-[#245BC5] border-l-[#8FB0E8] bg-[#2F6FE4] px-3 py-2 text-center text-xs font-extrabold uppercase tracking-[0.12em] text-white">
                      <span className="inline-flex min-w-[72px] items-center justify-center rounded-md bg-[#2F6FE4] px-3 py-1">
                        {code}
                      </span>
                    </th>
                  ))}
                </tr>
                <tr>
                  {exchangeCodes.flatMap((code) => [
                    <th key={`${code}-commission`} className="sticky top-11 z-50 h-9 border-b border-l-2 border-b-[#B7CBE8] border-l-[#B8CBEA] bg-[#EAF3FF] px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#09246B]">Commission</th>,
                    <th key={`${code}-lots`} className="sticky top-11 z-50 h-9 border-b border-b-[#B7CBE8] bg-[#EAF3FF] px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#09246B]">Lots</th>,
                    <th key={`${code}-volume`} className="sticky top-11 z-50 h-9 border-b border-b-[#B7CBE8] bg-[#EAF3FF] px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#09246B]">Volume</th>,
                  ])}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={3 + exchangeCodes.length * 3} className="px-3 py-8 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={3 + exchangeCodes.length * 3} className="px-3 py-8 text-center text-sm text-slate-500">
                      {brokerId && weekId
                        ? 'No exchange data found for this selection.'
                        : 'Select a broker and settlement week to view exchange data.'}
                    </td>
                  </tr>
                ) : (
                  sorted.map(({ row }) => {
                    return (
                      <tr key={String(row.Login)} className="group hover:bg-slate-50">
                        <td
                          style={{ position: 'sticky', left: 0 }}
                          className="sticky left-0 z-40 w-[84px] min-w-[84px] border-r border-slate-300 bg-white px-3 py-2.5 text-sm shadow-[3px_0_6px_rgba(15,23,42,0.08)] group-hover:bg-slate-50"
                        >
                          <button
                            onClick={() => setSelectedLogin(row.Login)}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {row.Login}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-slate-700">{row.Name}</td>
                        <td className="px-3 py-2.5 text-sm">
                          <SignedValue value={row.AgentCommission} bold />
                        </td>
                        {exchangeCodes.flatMap((code) => {
                          const exchange = row.Exchanges.find((item) => item.Exchange === code)
                          return [
                            <td key={`${code}-commission`} className="border-l-2 border-[#D5E3F5] px-3 py-2.5 text-right text-sm"><SignedValue value={exchange?.Commission ?? 0} /></td>,
                            <td key={`${code}-lots`} className="px-3 py-2.5 text-right text-sm"><SignedValue value={exchange?.Lots ?? 0} /></td>,
                            <td key={`${code}-volume`} className="px-3 py-2.5 text-right text-sm"><SignedValue value={exchange?.Volume ?? 0} /></td>,
                          ]
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="sticky bottom-0 z-50 border-t-2 border-slate-300 bg-slate-100 shadow-[0_-3px_8px_rgba(15,23,42,0.10)]">
                  <td
                    style={{ position: 'sticky', left: 0 }}
                    className="sticky bottom-0 left-0 z-[60] w-[84px] min-w-[84px] border-r border-slate-300 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-800 shadow-[3px_0_6px_rgba(15,23,42,0.08)]"
                  >
                    TOTALS
                  </td>
                  <td className="sticky bottom-0 z-50 bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700">
                    {kpis.logins} login{kpis.logins === 1 ? '' : 's'}
                  </td>
                  <td className="sticky bottom-0 z-50 bg-slate-100 px-3 py-3 text-sm"><SignedValue value={kpis.agentCommission} bold /></td>
                  {exchangeCodes.flatMap((code) => [
                    <td key={`${code}-commission-total`} className="sticky bottom-0 z-50 border-l-2 border-[#B8CBEA] bg-slate-100 px-3 py-3 text-right text-sm"><SignedValue value={exchangeTotals[code]?.commission ?? 0} bold /></td>,
                    <td key={`${code}-lots-total`} className="sticky bottom-0 z-50 bg-slate-100 px-3 py-3 text-right text-sm"><SignedValue value={exchangeTotals[code]?.lots ?? 0} bold /></td>,
                    <td key={`${code}-volume-total`} className="sticky bottom-0 z-50 bg-slate-100 px-3 py-3 text-right text-sm"><SignedValue value={exchangeTotals[code]?.volume ?? 0} bold /></td>,
                  ])}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-200 text-xs text-slate-500">
            <span>
              Showing {startIdx}-{endIdx} of {totalRows}
            </span>
            <span>
              Page {safePage} of {totalPages}
            </span>
          </div>
        </div>
      </div>

      <ExchangeDetailModal
        isOpen={selectedLogin !== null}
        onClose={() => setSelectedLogin(null)}
        login={selectedLogin}
        row={detailRow}
        loading={detailLoading}
      />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────
const SortableHeader: React.FC<{
  label: string
  active: boolean
  order: 'asc' | 'desc'
  onClick: () => void
  sticky?: boolean
  rowSpan?: number
}> = ({ label, active, order, onClick, sticky = false, rowSpan }) => (
  <th
    onClick={onClick}
    style={sticky ? { position: 'sticky', top: 0, left: 0 } : { position: 'sticky', top: 0 }}
    rowSpan={rowSpan}
    className={`${sticky ? 'sticky left-0 z-[70] w-[84px] min-w-[84px] border-r border-[#8FB0E8] shadow-[3px_0_6px_rgba(15,23,42,0.14)]' : 'sticky top-0 z-50'} h-11 border-b border-[#245BC5] bg-[#2F6FE4] px-3 py-2.5 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-white cursor-pointer select-none hover:bg-[#2563D4] ${
      sticky ? '' : 'relative'
    }`}
  >
    <div className="flex items-center gap-1.5">
      <span>{label}</span>
      {active ? (
        <span className="text-[10px]">{order === 'asc' ? '↑' : '↓'}</span>
      ) : (
        <ChevronUpDownIcon className="w-3.5 h-3.5 opacity-70" />
      )}
    </div>
  </th>
)

const ExchangeDetailModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  login: number | string | null
  row?: ExchangeReportRow
  loading: boolean
}> = ({ isOpen, onClose, login, row, loading }) => {
  const totals = row
    ? row.Exchanges.reduce(
        (acc, e) => ({
          commission: acc.commission + e.Commission,
          lots: acc.lots + e.Lots,
          volume: acc.volume + e.Volume,
        }),
        { commission: 0, lots: 0, volume: 0 }
      )
    : { commission: 0, lots: 0, volume: 0 }

  const activeCount = row
    ? row.Exchanges.filter(
        (e) => e.Commission !== 0 || e.Lots !== 0 || e.Volume !== 0
      ).length
    : 0

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative z-[101] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Gradient Header */}
            <div className="relative flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                  <BanknotesIcon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-tight truncate">
                    Login {login} — Exchange Breakdown
                  </h2>
                  <p className="text-xs text-blue-100 mt-0.5 truncate">
                    {row?.Name ? row.Name : 'Detailed exchange-wise data'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/15 transition-all"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[540px] bg-slate-50">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : !row ? (
                <div className="px-6 py-16 text-center text-sm text-slate-500">
                  No exchange detail found for this login.
                </div>
              ) : (
                <>
                  {/* Summary strip */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 py-4 bg-white border-b border-slate-200">
                    <SummaryStat
                      label="AGENT COMMISSION"
                      value={row.AgentCommission}
                      icon={<BanknotesIcon className="w-4 h-4" />}
                    />
                    <SummaryStat
                      label="COMMISSION"
                      value={totals.commission}
                      icon={<BanknotesIcon className="w-4 h-4" />}
                    />
                    <SummaryStat
                      label="LOTS"
                      value={totals.lots}
                      icon={<ScaleIcon className="w-4 h-4" />}
                    />
                    <SummaryStat
                      label="VOLUME"
                      value={totals.volume}
                      icon={<ChartBarIcon className="w-4 h-4" />}
                    />
                  </div>

                  {/* Exchange count */}
                  <div className="px-5 py-2.5 flex items-center justify-between border-b border-slate-200 bg-white">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Exchange Breakdown
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {activeCount} active of {row.Exchanges.length} exchange
                      {row.Exchanges.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Exchange
                          </th>
                          <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Commission
                          </th>
                          <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Lots
                          </th>
                          <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Volume
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {row.Exchanges.map((e) => {
                          const isActive =
                            e.Commission !== 0 || e.Lots !== 0 || e.Volume !== 0
                          return (
                            <tr
                              key={e.Exchange}
                              className={`transition-colors ${
                                isActive ? 'hover:bg-blue-50/40' : 'opacity-60'
                              }`}
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${
                                      isActive ? 'bg-emerald-500' : 'bg-slate-300'
                                    }`}
                                  />
                                  <span className="text-sm font-semibold text-slate-800">
                                    {e.Exchange}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right text-sm tabular-nums">
                                <SignedValue value={e.Commission} bold />
                              </td>
                              <td className="px-5 py-3 text-right text-sm tabular-nums">
                                <SignedValue value={e.Lots} />
                              </td>
                              <td className="px-5 py-3 text-right text-sm tabular-nums">
                                <SignedValue value={e.Volume} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-700">
                            Total
                          </td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums">
                            <SignedValue value={totals.commission} bold />
                          </td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums">
                            <SignedValue value={totals.lots} bold />
                          </td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums">
                            <SignedValue value={totals.volume} bold />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-5 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const SummaryStat: React.FC<{
  label: string
  value: number
  icon: React.ReactNode
}> = ({ label, value, icon }) => {
  const isPositive = value > 0
  const isNegative = value < 0
  const trendIcon = isPositive ? (
    <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-600" />
  ) : isNegative ? (
    <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-600" />
  ) : null

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="text-slate-400">{icon}</span>
          <span className="text-[10px] font-bold tracking-wider uppercase">
            {label}
          </span>
        </div>
        {trendIcon}
      </div>
      <div className={`mt-1 text-sm font-bold tabular-nums ${signColor(value)}`}>
        {formatNumber(value)}
      </div>
    </div>
  )
}

export default ExchangeReportView
