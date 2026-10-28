import React from 'react'

export const fmtDateTime = (s: string | null | undefined) => {
  if (!s) return '—'
  const d = new Date(s.replace(' ', 'T'))
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const StatusBadge: React.FC<{ status: string; unsent?: boolean }> = ({ status, unsent }) => {
  if (unsent) {
    return <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">Unsent</span>
  }
  if (status === 'sending') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
        <span className="h-3 w-3 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
        Sending
      </span>
    )
  }
  if (status === 'done') return <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">Done</span>
  if (status === 'cancelled') return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Cancelled</span>
  return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600">{status || '—'}</span>
}

export const AudienceBadge: React.FC<{ audience: string; isTest?: boolean }> = ({ audience, isTest }) => {
  if (isTest || audience === 'test') {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Test</span>
  }
  const label = audience === 'active' ? 'Active brokers' : audience === 'all' ? 'All brokers' : audience === 'selected' ? 'Selected' : audience
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{label || '—'}</span>
}

/** Stacked bar: sent (green) · failed (red) · the rest pending (grey). */
export const ProgressBar: React.FC<{ sent: number; failed: number; total: number; compact?: boolean }> = ({ sent, failed, total, compact }) => {
  const t = Math.max(1, total)
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-slate-100 ${compact ? 'h-1.5' : 'h-2.5'}`}>
      <div className="h-full bg-green-500 transition-[width] duration-500" style={{ width: `${(sent / t) * 100}%` }} />
      <div className="h-full bg-red-500 transition-[width] duration-500" style={{ width: `${(failed / t) * 100}%` }} />
    </div>
  )
}
