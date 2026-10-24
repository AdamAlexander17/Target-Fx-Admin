import React from 'react'
import { XMarkIcon, UsersIcon, ClockIcon, ArrowDownLeftIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline'
import { Broker } from '../types'

interface Props {
  broker: Broker
  onClose: () => void
}

const isNum = (v: any) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))

// Indian grouping, 2 decimals; null → "—"
const fmt = (v: any) =>
  isNum(v) ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

// Green when positive, red when negative, neutral for zero / missing
const tone = (v: any) => {
  if (!isNum(v) || Number(v) === 0) return 'text-slate-700'
  return Number(v) > 0 ? 'text-green-600' : 'text-red-600'
}

/** Small SVG donut: `part` of `total`. */
const Donut: React.FC<{ part: number; total: number; color: string }> = ({ part, total, color }) => {
  const r = 34
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, Math.max(0, part / total)) : 0
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        className="transition-[stroke-dasharray] duration-700"
      />
    </svg>
  )
}

const BrokerOverviewModal: React.FC<Props> = ({ broker, onClose }) => {
  const b: any = broker
  const cu: any = b.credit_usage || {}

  const used = cu.used_credit
  const available = cu.available_credit ?? b.available_credit
  const limit = cu.credit_limit ?? b.credit_limit
  const maxCredit = b.max_credit_per_account ?? cu.max_credit_per_account
  const clients = Number(b.clients_count ?? cu.accounts ?? 0)
  const withCredit = Number(cu.accounts_with_credit ?? 0)

  const tempIn = Number(cu.pending_temp_credit_in ?? 0)
  const tempOut = Number(cu.pending_temp_credit_out ?? 0)
  const tempMax = Math.max(Math.abs(tempIn), Math.abs(tempOut), 1)

  // Credit utilisation only makes sense when a positive limit exists
  const hasLimit = isNum(limit) && Number(limit) > 0
  const utilisation = hasLimit && isNum(used) ? (Number(used) / Number(limit)) * 100 : null

  const StatCard = ({ label, value }: { label: string; value: any }) => (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${tone(value)}`}>{fmt(value)}</p>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-slate-50 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">{b.full_name || b.username}</h2>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <span>@{b.username}</span>
              <span>·</span>
              <span>ID {b.id}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  b.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {b.is_active ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3">
          {/* Credit figures */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <StatCard label="Used Credit" value={used} />
            <StatCard label="Available Credit" value={available} />
            <StatCard label="Credit Limit" value={limit} />
            <StatCard label="Max Credit" value={maxCredit} />
          </div>

          {/* Utilisation bar (only when a credit limit is set) */}
          {utilisation !== null && (
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Credit Utilisation</span>
                <span className={`font-bold ${utilisation > 90 ? 'text-red-600' : 'text-slate-700'}`}>
                  {utilisation.toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${
                    utilisation > 90 ? 'bg-red-500' : utilisation > 70 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, utilisation))}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Clients donut */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">Clients</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Donut part={withCredit} total={clients} color="#2563eb" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-900">{clients}</span>
                    <span className="text-[10px] text-slate-500">total</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="text-slate-600">With credit</span>
                    <span className="ml-auto font-semibold text-slate-900">{withCredit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                    <span className="text-slate-600">Without credit</span>
                    <span className="ml-auto font-semibold text-slate-900">{Math.max(0, clients - withCredit)}</span>
                  </div>
                  <div className="pt-1 text-xs text-slate-500">
                    Reserved credit:{' '}
                    <span className={`font-semibold ${tone(cu.reserved_credit)}`}>{fmt(cu.reserved_credit)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending temp credits */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Pending Temp Credits</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {cu.pending_temp_credits ?? 0}
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Credit In', value: tempIn, icon: ArrowDownLeftIcon },
                  { label: 'Credit Out', value: tempOut, icon: ArrowUpRightIcon },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </span>
                      <span className={`font-semibold tabular-nums ${tone(value)}`}>{fmt(value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${value < 0 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${(Math.abs(value) / tempMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs text-blue-800">
                <ClockIcon className="h-4 w-4 flex-shrink-0" />
                <span>
                  Next temp credit revert:{' '}
                  <span className="font-semibold">{cu.temp_credit_revert?.next_at_text || '—'}</span>
                  {cu.temp_credit_revert?.timezone && (
                    <span className="text-blue-600"> ({cu.temp_credit_revert.timezone})</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrokerOverviewModal
