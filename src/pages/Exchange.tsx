import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import {
  ChevronDownIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import PageHeaderShell from '../components/layout/PageHeaderShell'
import { billsService, SettlementWeek } from '../services/billsService'
import { brokerService } from '../services/brokerService'
import { exchangeService } from '../services/exchangeService'
import ExchangeReportView from '../components/exchange/ExchangeReportView'
import CustomDateRangePopover, {
  DateRange,
} from '../components/exchange/CustomDateRangePopover'
import type { Broker } from '../types'

const formatWeekLabel = (w: SettlementWeek): string => {
  const start = w.start_date ? w.start_date.slice(0, 10) : ''
  const end = w.end_date ? w.end_date.slice(0, 10) : ''
  const range = start && end ? ` (${start} → ${end})` : ''
  if (w.name) return `${w.name}${range}`
  const num = w.week_number ?? w.id
  const year = start ? new Date(start).getFullYear() : ''
  return `Week ${num}${year ? ` - ${year}` : ''}${range}`
}

// Resilient extractor for varied broker response shapes.
const extractBrokerList = (payload: any): Broker[] => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Broker[]
  const candidates = [
    payload?.brokers,
    payload?.data?.brokers,
    payload?.data,
    payload?.items,
    payload?.results,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c as Broker[]
  }
  for (const k of Object.keys(payload)) {
    if (Array.isArray(payload[k])) return payload[k] as Broker[]
  }
  return []
}

const Exchange: React.FC = () => {
  const [brokerId, setBrokerId] = useState<number | null>(null)
  const [weekId, setWeekId] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const [exchangePage, setExchangePage] = useState(1)
  const [exchangePageSize, setExchangePageSize] = useState(10)

  // ─── Broker list ────────────────────────────────────────────────
  const { data: brokersData, isLoading: brokersLoading } = useQuery(
    ['brokers-for-exchange'],
    () =>
      brokerService.getBrokers(1, 100, {
        sort_by: 'created_at',
        sort_order: 'DESC',
      }),
    {
      retry: false,
      onSuccess: (res) => {
        // eslint-disable-next-line no-console
        console.log('[Exchange] brokers response:', res, 'count:', extractBrokerList(res).length)
      },
      onError: (err: any) => {
        // eslint-disable-next-line no-console
        console.error('[Exchange] brokers error:', err?.response?.status, err?.response?.data || err?.message)
        toast.error('Failed to load brokers')
      },
    }
  )
  const brokers: Broker[] = useMemo(
    () => extractBrokerList(brokersData),
    [brokersData]
  )

  // Auto-select first broker once list arrives.
  useEffect(() => {
    if (brokerId == null && brokers.length > 0) {
      setBrokerId(brokers[0].id)
    }
  }, [brokers, brokerId])

  // ─── Weeks ──────────────────────────────────────────────────────
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

  // ─── Exchange data ──────────────────────────────────────────────
  const {
    data: exchangeData,
    isLoading: exchangeLoading,
    isFetching: exchangeFetching,
    refetch: refetchExchange,
  } = useQuery(
    ['exchange-data', brokerId, weekId, dateRange, exchangePage, exchangePageSize],
    () => exchangeService.getExchangeData(
      brokerId as number,
      weekId,
      exchangePage,
      exchangePageSize,
      dateRange
    ),
    {
      enabled: !!brokerId && (!!weekId || !!dateRange),
      keepPreviousData: true,
      retry: false,
      onError: () => toast.error('Failed to load exchange data'),
    }
  )

  const selectedBroker = useMemo(
    () => brokers.find((b) => b.id === brokerId) ?? null,
    [brokers, brokerId]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-white">
      <PageHeaderShell>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center flex-shrink-0">
              <ArrowsRightLeftIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                Exchange
              </h1>
              <p className="text-xs font-medium text-slate-500 truncate">
                Per-login exchange volume, lots &amp; commission across brokers
                {selectedBroker?.full_name ? ` — ${selectedBroker.full_name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:flex-nowrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Broker
              </span>
              <div className="relative">
                <select
                  disabled={brokersLoading}
                  value={brokerId ?? ''}
                  onChange={(e) => {
                    setBrokerId(Number(e.target.value))
                    setExchangePage(1)
                  }}
                  className="appearance-none pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 w-full sm:min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {brokersLoading && <option value="">Loading…</option>}
                  {!brokersLoading && brokers.length === 0 && (
                    <option value="">No brokers available</option>
                  )}
                  {!brokersLoading && brokers.length > 0 && brokerId == null && (
                    <option value="">Select broker</option>
                  )}
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.full_name || b.username || `Broker #${b.id}`}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

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
                    setExchangePage(1)
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

            <CustomDateRangePopover
              value={dateRange}
              disabled={!brokerId}
              onApply={(range) => {
                setDateRange(range)
                setExchangePage(1)
              }}
              onClear={() => {
                setDateRange(null)
                setExchangePage(1)
              }}
            />

            <button
              onClick={() => refetchExchange()}
              disabled={!brokerId || (!weekId && !dateRange)}
              className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg flex items-center gap-1.5 text-sm shadow-sm hover:bg-slate-50 group disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh"
            >
              <ArrowPathIcon
                className={`w-4 h-4 transition-transform duration-300 ${
                  exchangeFetching ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </PageHeaderShell>

      <ExchangeReportView
        brokerId={brokerId}
        weekId={weekId}
        isLoading={exchangeLoading}
        isFetching={exchangeFetching}
        report={exchangeData?.report ?? []}
        exchangeCodes={exchangeData?.exchanges ?? []}
        totals={exchangeData?.totals}
        pagination={exchangeData?.pagination}
        page={exchangePage}
        pageSize={exchangePageSize}
        onPageChange={setExchangePage}
        onPageSizeChange={(size) => {
          setExchangePageSize(size)
          setExchangePage(1)
        }}
      />
    </div>
  )
}

export default Exchange
