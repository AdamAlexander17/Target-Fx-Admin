import { useState, useEffect } from 'react'
import Loader from '../components/ui/Loader'
import { metricsService } from '../services/metricsService'
import type { ApiMetric } from '../types/metrics'
import toast from 'react-hot-toast'
import { ArrowUpIcon, ArrowDownIcon, ClockIcon, ServerIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, ChartBarIcon, BoltIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import PageHeaderShell from '../components/layout/PageHeaderShell'

type SortField = keyof ApiMetric
type SortOrder = 'asc' | 'desc'

export default function ApiMetrics() {
  const [metrics, setMetrics] = useState<ApiMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('total_calls')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const data = await metricsService.getMetrics()
      setMetrics(data.metrics)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
      toast.error('Failed to load API metrics')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedMetrics = Array.isArray(metrics) ? [...metrics].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    return sortOrder === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number)
  }) : []

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatTime = (ms: number) => {
    if (ms < 1) return `${ms.toFixed(2)} ms`
    if (ms < 1000) return `${ms.toFixed(2)} ms`
    return `${(ms / 1000).toFixed(2)} s`
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ArrowUpIcon className="w-4 h-4 inline ml-1" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 inline ml-1" />
    )
  }

  const getTotalStats = () => {
    if (!metrics || metrics.length === 0) {
      return { totalCalls: 0, totalSent: 0, totalReceived: 0, avgResponseTime: 0 }
    }
    
    const totalCalls = metrics.reduce((sum, m) => sum + m.total_calls, 0)
    const totalSent = metrics.reduce((sum, m) => sum + m.total_sent_bytes, 0)
    const totalReceived = metrics.reduce((sum, m) => sum + m.total_received_bytes, 0)
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.avg_time_ms, 0) / metrics.length

    return { totalCalls, totalSent, totalReceived, avgResponseTime }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-white to-white">
        <PageHeaderShell>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700">
                <ChartBarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">API Metrics</h1>
                <p className="text-xs font-medium text-slate-500">
                  Real-time API endpoint performance monitoring
                </p>
              </div>
            </div>
            <div />
          </div>
        </PageHeaderShell>
        <Loader label="Loading metrics..." />
      </div>
    )
  }

  const stats = getTotalStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-white">
      <PageHeaderShell>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700">
                <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                API Metrics
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Real-time API endpoint performance monitoring
              </p>
            </div>
          </div>
          <div />
        </div>
      </PageHeaderShell>

      <main className="px-2 pt-3 pb-4">
      <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="group rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">API Calls</div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {stats.totalCalls.toLocaleString()}
              </div>
              <p className="mt-3 text-xs text-slate-500">Total requests processed</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Total</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-105">
                <BoltIcon className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="group rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Response Time</div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {formatTime(stats.avgResponseTime)}
              </div>
              <p className="mt-3 text-xs text-slate-500">Average across all endpoints</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Avg</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform duration-300 group-hover:scale-105">
                <ClockIcon className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="group rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Data Sent</div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {formatBytes(stats.totalSent)}
              </div>
              <p className="mt-3 text-xs text-slate-500">Total outbound traffic</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Sent</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-105">
                <ArrowUpTrayIcon className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="group rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Data Received</div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {formatBytes(stats.totalReceived)}
              </div>
              <p className="mt-3 text-xs text-slate-500">Total inbound traffic</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Received</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition-transform duration-300 group-hover:scale-105">
                <ArrowDownTrayIcon className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Metrics Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-slate-300 bg-white/80 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Endpoint Performance</h2>
            <p className="mt-1 text-sm text-slate-500">Detailed metrics for each API endpoint</p>
          </div>
          <button
            onClick={fetchMetrics}
            className="group flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-white"
            title="Refresh API metrics"
          >
            <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
        <div className="w-full overflow-auto no-scrollbar max-h-[calc(100vh-220px)]">
          <table className="w-full table-fixed divide-y divide-slate-200">
            <colgroup>
              <col style={{ width: '34%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead className="bg-white">
              <tr>
                <th
                  onClick={() => handleSort('path')}
                  className="group cursor-pointer px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-150 hover:bg-slate-50"
                >
                  <div className="flex items-center space-x-2">
                    <span>API Path</span>
                    <SortIcon field="path" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_calls')}
                  className="group cursor-pointer px-2 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-150 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Calls</span>
                    <SortIcon field="total_calls" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('avg_time_ms')}
                  className="group cursor-pointer px-2 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-150 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Avg Time</span>
                    <SortIcon field="avg_time_ms" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('min_time_ms')}
                  className="group cursor-pointer px-2 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-150 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Min Time</span>
                    <SortIcon field="min_time_ms" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('max_time_ms')}
                  className="group cursor-pointer px-2 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-150 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Max Time</span>
                    <SortIcon field="max_time_ms" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_sent_bytes')}
                  className="group cursor-pointer px-2 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-150 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Data Sent</span>
                    <SortIcon field="total_sent_bytes" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_received_bytes')}
                  className="group cursor-pointer px-3 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-150 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Data Received</span>
                    <SortIcon field="total_received_bytes" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sortedMetrics.map((metric, index) => (
                <tr key={index} className="group transition-colors duration-150 hover:bg-white/80">
                  <td className="px-3 py-3">
                    <code className="block w-full max-w-[260px] truncate rounded-full bg-blue-50 px-3 py-1 text-left font-mono text-xs text-blue-700 border border-blue-200" title={metric.path}>
                      {metric.path}
                    </code>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-semibold text-slate-700">
                    {metric.total_calls.toLocaleString()}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-semibold text-slate-700">
                    {formatTime(metric.avg_time_ms)}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-semibold text-amber-600">
                    {formatTime(metric.min_time_ms)}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-semibold text-rose-600">
                    {formatTime(metric.max_time_ms)}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-semibold text-slate-700">
                    {formatBytes(metric.total_sent_bytes)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-semibold text-slate-700">
                    {formatBytes(metric.total_received_bytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {metrics.length === 0 && (
          <div className="text-center py-16">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <ChartBarIcon className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-500">No metrics data available</p>
            <p className="mt-1 text-sm text-slate-400">Data will appear here once API calls are made</p>
          </div>
        )}
      </motion.div>
      </div>
      </main>
    </div>
  )
}
