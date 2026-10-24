import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Shows a single centered spinner on every route change. It covers the content
 * area BELOW the page header (top offset), so the header stays visible while a
 * loader is always shown on navigation. If the page is still fetching after
 * this hides, the page's own (identical) loader takes over seamlessly.
 */
const NavigationLoader: React.FC = () => {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setVisible(true)
    const t = window.setTimeout(() => setVisible(false), 550)
    return () => clearTimeout(t)
  }, [location.pathname])

  if (!visible) return null

  return (
    <div className="absolute inset-x-0 bottom-0 top-[96px] z-40 flex items-start justify-center bg-white pt-24">
      <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
  )
}

export default NavigationLoader
