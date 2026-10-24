import React from 'react'

interface LoaderProps {
  label?: string
  size?: number
  /** Center within a tall full-page area instead of the default padded block */
  fullScreen?: boolean
  className?: string
}

/**
 * The single, app-wide loading spinner. Use this everywhere data is loading
 * so every module shows the exact same professional loader.
 */
const Loader: React.FC<LoaderProps> = ({ label, size = 40, fullScreen = false, className = '' }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className="rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"
        style={{ width: size, height: size }}
      />
      {label && <p className="text-sm font-medium text-slate-500">{label}</p>}
    </div>
  )

  return (
    <div
      className={`flex w-full items-center justify-center ${fullScreen ? 'min-h-[60vh]' : 'py-16'} ${className}`}
    >
      {spinner}
    </div>
  )
}

export default Loader
