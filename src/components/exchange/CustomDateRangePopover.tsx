import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline'

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

interface CustomDateRangePopoverProps {
  /** Currently applied range, or null when no custom range is active. */
  value: DateRange | null
  /** Called when the user applies a valid from/to range. */
  onApply: (range: DateRange) => void
  /** Called when the user clears the custom range. */
  onClear: () => void
  disabled?: boolean
}

const formatButtonLabel = (range: DateRange | null): string => {
  if (!range) return 'Custom Dates'
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-')
    if (!y || !m || !day) return d
    return `${day}-${m}-${y}`
  }
  return `${fmt(range.from)} → ${fmt(range.to)}`
}

const POPOVER_WIDTH = 320

const CustomDateRangePopover: React.FC<CustomDateRangePopoverProps> = ({
  value,
  onApply,
  onClear,
  disabled,
}) => {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(value?.from ?? '')
  const [to, setTo] = useState(value?.to ?? '')
  const [error, setError] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Keep local inputs in sync when the applied value changes externally.
  useEffect(() => {
    setFrom(value?.from ?? '')
    setTo(value?.to ?? '')
  }, [value])

  // Position the fixed popover under the button, right-aligned, kept on screen.
  const updatePosition = () => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    let left = rect.right - POPOVER_WIDTH
    // Keep within viewport with an 8px gutter.
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8))
    setCoords({ top: rect.bottom + 8, left })
  }

  useLayoutEffect(() => {
    if (open) updatePosition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Reposition on scroll / resize while open.
  useEffect(() => {
    if (!open) return
    const handler = () => updatePosition()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [open])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleApply = () => {
    if (!from || !to) {
      setError('Please select both a start and end date.')
      return
    }
    if (from > to) {
      setError('The start date must be before the end date.')
      return
    }
    setError(null)
    onApply({ from, to })
    setOpen(false)
  }

  const handleClear = () => {
    setFrom('')
    setTo('')
    setError(null)
    onClear()
    setOpen(false)
  }

  const isActive = !!value

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm shadow-sm border disabled:opacity-50 disabled:cursor-not-allowed ${
          isActive
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
        title="Filter by custom date range"
      >
        <CalendarDaysIcon className="w-4 h-4" />
        <span className="whitespace-nowrap">{formatButtonLabel(value)}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: POPOVER_WIDTH,
              zIndex: 9999,
            }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Custom date range</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Filter exchange data for the selected period.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  From
                </label>
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  To
                </label>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

            {error && (
              <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClear}
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Apply dates
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

export default CustomDateRangePopover
