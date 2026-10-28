import React from 'react'

interface PageHeaderShellProps {
  children: React.ReactNode
  /** Keep the header pinned to the top while the page scrolls (default: true) */
  sticky?: boolean
}

const PageHeaderShell: React.FC<PageHeaderShellProps> = ({ children, sticky = true }) => {
  return (
    // Sticky goes on this wrapper (not the inner header) so it can stick for the
    // whole page scroll. The white background hides content sliding underneath.
    <div className={`px-2 pt-4 ${sticky ? 'sticky top-0 z-30 bg-white pb-1' : ''}`}>
      <header className="bg-white border border-slate-300 rounded-xl">
        <div className="px-2 py-4">
          {children}
        </div>
      </header>
    </div>
  )
}

export default PageHeaderShell
