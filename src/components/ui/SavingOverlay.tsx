import React from 'react'

interface SavingOverlayProps {
  show: boolean
  label?: string
}

/**
 * Full-screen overlay shown while a create/update request is in flight.
 * Sits above any modal (z-[70]) and blocks clicks so the form can't be
 * submitted twice. Uses the same spinner as the app-wide Loader.
 */
const SavingOverlay: React.FC<SavingOverlayProps> = ({ show, label = 'Saving...' }) => {
  if (!show) return null
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/20 backdrop-blur-[1px]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-2xl ring-1 ring-slate-200">
        <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
    </div>
  )
}

export default SavingOverlay
