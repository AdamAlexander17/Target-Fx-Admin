import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  DocumentTextIcon,
  Bars3BottomLeftIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import JSZip from 'jszip'
import PageHeaderShell from '../components/layout/PageHeaderShell'
import {
  billsService,
  BillRow,
  BillsRequestPayload,
  SettlementWeek,
} from '../services/billsService'
import { brokerService } from '../services/brokerService'

// ─── Helpers ──────────────────────────────────────────────────────────
const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val ?? 0)

const formatWeekLabel = (w: SettlementWeek): string => {
  const start = w.start_date ? w.start_date.slice(0, 10) : ''
  const end = w.end_date ? w.end_date.slice(0, 10) : ''
  const range = start && end ? ` (${start} → ${end})` : ''
  if (w.name) return `${w.name}${range}`
  const num = w.week_number ?? w.id
  const year = start ? new Date(start).getFullYear() : ''
  return `Week ${num}${year ? ` - ${year}` : ''}${range}`
}

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

type SortKey = 'login' | 'name' | 'brokerage' | 'gross' | 'net'

// ─── Component ────────────────────────────────────────────────────────
const BrokerBills: React.FC = () => {
  const { brokerId: brokerIdParam } = useParams<{ brokerId: string }>()
  const brokerId = Number(brokerIdParam)
  const navigate = useNavigate()

  const [weekId, setWeekId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(100)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('net')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [downloadMenu, setDownloadMenu] = useState<null | 'selected' | 'all'>(null)
  const [downloading, setDownloading] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  // Close download menu on outside click
  useEffect(() => {
    if (!downloadMenu) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-download-menu]')) setDownloadMenu(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [downloadMenu])

  // ─── Queries ────────────────────────────────────────────────────────
  const { data: broker } = useQuery(
    ['broker', brokerId],
    () => brokerService.getBrokerById(brokerId),
    { enabled: Number.isFinite(brokerId), retry: false }
  )

  const { data: weeks = [], isLoading: weeksLoading } = useQuery(
    ['settlement-weeks'],
    () => billsService.getSettlementWeeks(),
    {
      retry: false,
      onSuccess: (list) => {
        if (weekId == null && list.length > 0) {
          const current = list.find((w) => w.is_current) ?? list[0]
          setWeekId(current.id)
        }
      },
      onError: () => toast.error('Failed to load settlement weeks'),
    }
  )

  const payload: BillsRequestPayload | null = useMemo(() => {
    if (!weekId) return null
    return {
      week_id: weekId,
      page,
      limit,
      search: debouncedSearch,
      mt5Accounts: [],
      sortBy,
      sortOrder,
    }
  }, [weekId, page, limit, debouncedSearch, sortBy, sortOrder])

  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery(
    ['bills-summary', brokerId, payload],
    () => billsService.getSummary(brokerId, payload!),
    {
      enabled: !!payload && Number.isFinite(brokerId),
      keepPreviousData: true,
      retry: false,
      onError: () => toast.error('Failed to load bills'),
    }
  )

  const summary = summaryData?.totals
  const rows: BillRow[] = summaryData?.items ?? []
  const total = summaryData?.pagination.total ?? 0
  const pages = summaryData?.pagination.total_pages ?? 1
  const billsLoading = summaryLoading

  // ─── Selection helpers ─────────────────────────────────────────────
  const downloadableRows = useMemo(
    () => rows.filter((r) => Number(r.total_net) !== 0),
    [rows]
  )

  const allDownloadableSelected =
    downloadableRows.length > 0 &&
    downloadableRows.every((r) => selected.has(String(r.login)))

  const toggleAll = () => {
    if (allDownloadableSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(downloadableRows.map((r) => String(r.login))))
    }
  }

  const toggleRow = (login: string | number) => {
    const key = String(login)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
  }

  // ─── Download handlers ─────────────────────────────────────────────
  const pdfMeta = useMemo(
    () => {
      const sw = summaryData?.settlement_week
      return {
        brokerName: broker?.full_name ?? broker?.username,
        weekName: sw?.name,
        weekStart: sw?.start_date,
        weekEnd: sw?.end_date,
      }
    },
    [broker, summaryData]
  )

  const fetchBillsForLogins = async (
    logins: Array<string | number>
  ): Promise<Array<{ login: string | number; blob: Blob }>> => {
    const out: Array<{ login: string | number; blob: Blob }> = []
    for (const login of logins) {
      try {
        const blob = await billsService.downloadBillPdf(brokerId, weekId!, login, pdfMeta)
        out.push({ login, blob })
      } catch (err) {
        console.error(`Failed to download bill for ${login}`, err)
        toast.error(`Failed to download bill for ${login}`)
      }
    }
    return out
  }

  const handleDownloadIndividual = async (loginList: Array<string | number>) => {
    if (!weekId) return
    setDownloading(true)
    try {
      const files = await fetchBillsForLogins(loginList)
      files.forEach(({ login, blob }) => {
        triggerBlobDownload(blob, `bill-${login}-week-${weekId}.pdf`)
      })
      if (files.length > 0) toast.success(`Downloaded ${files.length} bill(s)`)
    } finally {
      setDownloading(false)
      setDownloadMenu(null)
    }
  }

  const handleDownloadZip = async (loginList: Array<string | number>) => {
    if (!weekId) return
    setDownloading(true)
    try {
      const files = await fetchBillsForLogins(loginList)
      if (files.length === 0) return
      const zip = new JSZip()
      files.forEach(({ login, blob }) => {
        zip.file(`bill-${login}-week-${weekId}.pdf`, blob)
      })
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      triggerBlobDownload(zipBlob, `bills-week-${weekId}.zip`)
      toast.success(`Downloaded ${files.length} bill(s) as ZIP`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to create ZIP')
    } finally {
      setDownloading(false)
      setDownloadMenu(null)
    }
  }

  const handleRowDownload = async (login: string | number) => {
    if (!weekId) return
    setDownloading(true)
    try {
      const blob = await billsService.downloadBillPdf(brokerId, weekId, login, pdfMeta)
      triggerBlobDownload(blob, `bill-${login}-week-${weekId}.pdf`)
    } catch (err) {
      console.error(err)
      toast.error(`Failed to download bill for ${login}`)
    } finally {
      setDownloading(false)
    }
  }

  // Logins for "Download Selected"
  const selectedLogins = useMemo(
    () =>
      rows
        .filter(
          (r) => selected.has(String(r.login)) && Number(r.total_net) !== 0
        )
        .map((r) => r.login),
    [rows, selected]
  )

  // Logins for "Download All" (current filtered set, excludes net=0)
  const allDownloadableLogins = useMemo(
    () => downloadableRows.map((r) => r.login),
    [downloadableRows]
  )

  const startIdx = (page - 1) * limit
  const showingFrom = total === 0 ? 0 : startIdx + 1
  const showingTo = Math.min(startIdx + rows.length, total)

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-white">
      <PageHeaderShell>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/brokers')}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 flex-shrink-0"
              title="Back to brokers"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center flex-shrink-0">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                Bills
              </h1>
              <p className="text-xs font-medium text-slate-500 truncate">
                Settlement week brokerage &amp; P/L bills
                {broker?.full_name ? ` — ${broker.full_name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:flex-nowrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Settlement Week
              </span>
              <div className="relative">
                <select
                  disabled={weeksLoading}
                  value={weekId ?? ''}
                  onChange={(e) => {
                    setWeekId(Number(e.target.value))
                    setPage(1)
                    setSelected(new Set())
                  }}
                  className="appearance-none pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 w-full sm:min-w-[260px] focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {weeks.length === 0 && <option>Loading…</option>}
                  {weeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      {formatWeekLabel(w)}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Download Selected */}
            <div className="relative" data-download-menu>
              <button
                disabled={selectedLogins.length === 0 || downloading}
                onClick={() =>
                  setDownloadMenu((m) => (m === 'selected' ? null : 'selected'))
                }
                className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm shadow-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Download Selected ({selectedLogins.length})</span>
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {downloadMenu === 'selected' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => handleDownloadIndividual(selectedLogins)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 text-blue-600" />
                      Download individual PDFs
                    </button>
                    <button
                      onClick={() => handleDownloadZip(selectedLogins)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 text-blue-600" />
                      Download as ZIP
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Export All */}
            <div className="relative" data-download-menu>
              <button
                disabled={allDownloadableLogins.length === 0 || downloading}
                onClick={() =>
                  setDownloadMenu((m) => (m === 'all' ? null : 'all'))
                }
                className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg flex items-center gap-2 text-sm shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Export All</span>
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {downloadMenu === 'all' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        handleDownloadIndividual(allDownloadableLogins)
                      }
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 text-blue-600" />
                      Download individual PDFs
                    </button>
                    <button
                      onClick={() => handleDownloadZip(allDownloadableLogins)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 text-blue-600" />
                      Download as ZIP
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </PageHeaderShell>

      {/* KPI Cards */}
      <div className="px-2 pt-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            label="TOTAL BROKERAGE"
            value={summary?.total_brokerage ?? 0}
            loading={summaryLoading}
            icon={<BanknotesIcon className="w-5 h-5 text-blue-600" />}
          />
          <KpiCard
            label="TOTAL GROSS"
            value={summary?.total_gross ?? 0}
            loading={summaryLoading}
            icon={<DocumentTextIcon className="w-5 h-5 text-blue-600" />}
            colorize
          />
          <KpiCard
            label="TOTAL NET"
            value={summary?.total_net ?? 0}
            loading={summaryLoading}
            icon={<Bars3BottomLeftIcon className="w-5 h-5 text-blue-600" />}
            colorize
          />
        </div>
      </div>

      {/* Table card */}
      <div className="px-2 pt-3 pb-6">
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-3 py-3 border-b border-slate-200">
            <div className="relative w-full md:w-80">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Login or Name"
                className="w-full pl-9 pr-12 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="button"
                onClick={() => refetchSummary()}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-md"
                title="Search"
              >
                <MagnifyingGlassIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>Rows</span>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  className="appearance-none pr-7 pl-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <span className="px-2 py-1 border border-slate-300 rounded-md text-xs">
                  {page}/{pages || 1}
                </span>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto no-scrollbar max-h-[calc(100vh-220px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-blue-600 text-white">
                <tr>
                  <th className="px-3 py-2.5 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allDownloadableSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded cursor-pointer accent-blue-700"
                    />
                  </th>
                  <SortableHeader
                    label="Login"
                    active={sortBy === 'login'}
                    order={sortOrder}
                    onClick={() => handleSort('login')}
                  />
                  <SortableHeader
                    label="Name"
                    active={sortBy === 'name'}
                    order={sortOrder}
                    onClick={() => handleSort('name')}
                  />
                  <SortableHeader
                    label="Total Brokerage"
                    active={sortBy === 'brokerage'}
                    order={sortOrder}
                    onClick={() => handleSort('brokerage')}
                  />
                  <SortableHeader
                    label="Total Gross"
                    active={sortBy === 'gross'}
                    order={sortOrder}
                    onClick={() => handleSort('gross')}
                  />
                  <SortableHeader
                    label="Total Net"
                    active={sortBy === 'net'}
                    order={sortOrder}
                    onClick={() => handleSort('net')}
                  />
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {billsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-sm text-slate-500"
                    >
                      No bills found for this week.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const key = String(r.login)
                    const net = Number(r.total_net)
                    const gross = Number(r.total_gross)
                    const isNegNet = net < 0
                    const isNegGross = gross < 0
                    const isZeroNet = net === 0
                    return (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            disabled={isZeroNet}
                            checked={selected.has(key)}
                            onChange={() => toggleRow(r.login)}
                            className="w-4 h-4 rounded cursor-pointer accent-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-sm font-medium text-slate-800">
                          {r.login}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-slate-700">
                          {r.name}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-slate-800">
                          {formatINR(Number(r.total_brokerage))}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-sm font-medium ${
                            isNegGross ? 'text-red-600' : 'text-slate-800'
                          }`}
                        >
                          {formatINR(gross)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-sm font-medium ${
                            isNegNet ? 'text-red-600' : 'text-slate-800'
                          }`}
                        >
                          {formatINR(net)}
                        </td>
                        <td className="px-3 py-2.5">
                          {!isZeroNet ? (
                            <button
                              onClick={() => handleRowDownload(r.login)}
                              disabled={downloading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                              Download
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-200 text-xs text-slate-500">
            <span>
              Showing {showingFrom}-{showingTo} of {total} total
            </span>
            <span className="text-blue-600 font-medium">
              {selectedLogins.length} selected
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string
  value: number
  loading?: boolean
  icon: React.ReactNode
  colorize?: boolean
}> = ({ label, value, loading, icon, colorize }) => {
  const isNegative = colorize && value < 0
  return (
    <div className="bg-white border border-slate-300 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-6 w-32 bg-slate-100 animate-pulse rounded" />
          ) : (
            <p
              className={`mt-1 text-xl font-bold ${
                isNegative ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {formatINR(value)}
            </p>
          )}
        </div>
        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  )
}

const SortableHeader: React.FC<{
  label: string
  active: boolean
  order: 'asc' | 'desc'
  onClick: () => void
}> = ({ label, active, order, onClick }) => (
  <th
    onClick={onClick}
    className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide cursor-pointer select-none hover:bg-blue-700"
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

export default BrokerBills
