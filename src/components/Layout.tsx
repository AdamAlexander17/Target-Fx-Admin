import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-white lg:gap-4 lg:pr-4">
      {/* Sidebar */}
         <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
         <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Page content */}
        <motion.main 
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

