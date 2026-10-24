import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import NavigationLoader from './NavigationLoader'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const location = useLocation()

  // Reset content scroll on navigation so the header (and the loader offset
  // below it) line up at the top of the page.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-white lg:gap-4 lg:pr-4">
      {/* Sidebar */}
         <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
         <div className="relative min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Navigation loader — covers the content below the header on route change */}
        <NavigationLoader />
        {/* Page content */}
        <motion.main
          ref={mainRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-x-hidden overflow-y-auto"
        >
          <div className="">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  )
}

export default Layout
