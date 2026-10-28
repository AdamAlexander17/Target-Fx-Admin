import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import {
  ChartBarIcon,
  UserGroupIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import {
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  IdentificationIcon,
  AdjustmentsHorizontalIcon,
  CommandLineIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/solid'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../contexts/PermissionContext'
import { MODULES } from '../utils/permissions'
import toast from 'react-hot-toast'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavigationItem {
  name: string
  href: string
  icon: any
  module?: string  // Module name for permission checking
}

const allNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Squares2X2Icon, module: MODULES.DASHBOARD },
  { name: 'Users', href: '/users', icon: UserGroupIcon, module: MODULES.USERS },
  { name: 'Roles', href: '/roles', icon: ShieldCheckIcon, module: MODULES.ROLES },
  { name: 'Brokers', href: '/brokers', icon: BuildingOfficeIcon, module: MODULES.BROKERS },
  { name: 'Brokers Activity', href: '/broker-activity', icon: SignalIcon, module: MODULES.BROKER_ACTIVITY },
  { name: 'Broker Profiles', href: '/broker-profiles', icon: IdentificationIcon, module: MODULES.BROKER_PROFILES },
  { name: 'Settlements', href: '/settlement-weeks', icon: CalendarDaysIcon, module: MODULES.SETTLEMENT_WEEKS },
  // { name: 'Groups', href: '/groups', icon: Layers, module: MODULES.GROUPS },
  { name: 'Rules', href: '/rules', icon: AdjustmentsHorizontalIcon, module: MODULES.RULES },
  { name: 'Tutorials', href: '/tutorials', icon: AcademicCapIcon, module: MODULES.TUTORIALS },
  { name: 'Audit Logs', href: '/audit-logs', icon: ClipboardDocumentListIcon, module: MODULES.AUDIT_LOGS },
  { name: 'Logs', href: '/logs', icon: CommandLineIcon, module: MODULES.LOGS },
  { name: 'API Metrics', href: '/api-metrics', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, module: MODULES.PROFILE },
]

// ── BrokerEye logo icon – matches the actual logo: eye lens, 3D base, bars, arrow ──
const BrokerEyeIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Outer eye stroke: sky-blue → deep navy */}
      <linearGradient id="be-lens-t" x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1E90FF" />
        <stop offset="50%" stopColor="#0A5EDC" />
        <stop offset="100%" stopColor="#09246B" />
      </linearGradient>
      {/* Lower eye arc: solid navy */}
      <linearGradient id="be-lens-b" x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#09246B" />
        <stop offset="100%" stopColor="#0A3DAA" />
      </linearGradient>
      {/* 3D base left face */}
      <linearGradient id="be-base-l" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
        <stop offset="0%" stopColor="#071A55" />
        <stop offset="100%" stopColor="#0E3A90" />
      </linearGradient>
      {/* 3D base right face */}
      <linearGradient id="be-base-r" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
        <stop offset="0%" stopColor="#1251B8" />
        <stop offset="100%" stopColor="#2A7AE8" />
      </linearGradient>
      {/* Bars: bright azure top → medium blue bottom */}
      <linearGradient id="be-bar" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%" stopColor="#58C8FF" />
        <stop offset="100%" stopColor="#1060D8" />
      </linearGradient>
      {/* Arrow */}
      <linearGradient id="be-arrow" x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox">
        <stop offset="0%" stopColor="#0A3DAA" />
        <stop offset="100%" stopColor="#58C8FF" />
      </linearGradient>
    </defs>

    {/* ── Eye / lens outline ── */}
    {/* Top arc: bright blue gradient */}
    <path d="M10,60 C25,28 95,28 110,60" fill="none" stroke="url(#be-lens-t)" strokeWidth="7" strokeLinecap="round"/>
    {/* Bottom arc: dark navy */}
    <path d="M10,60 C25,92 95,92 110,60" fill="none" stroke="url(#be-lens-b)" strokeWidth="7" strokeLinecap="round"/>

    {/* ── 3D angular base (bottom-left diamond / shield) ── */}
    {/* Top face (lighter) */}
    <polygon points="18,75 38,63 60,75 38,87" fill="#1251B8" opacity="0.95"/>
    {/* Left face (dark) */}
    <polygon points="18,75 38,87 38,100 18,88" fill="url(#be-base-l)"/>
    {/* Right face (medium) */}
    <polygon points="38,87 60,75 60,88 38,100" fill="url(#be-base-r)"/>

    {/* ── 4 ascending bar chart columns ── */}
    <rect x="45" y="58" width="9" height="20" rx="1.5" fill="url(#be-bar)"/>
    <rect x="57" y="50" width="9" height="28" rx="1.5" fill="url(#be-bar)"/>
    <rect x="69" y="41" width="9" height="37" rx="1.5" fill="url(#be-bar)"/>
    <rect x="81" y="32" width="9" height="46" rx="1.5" fill="url(#be-bar)"/>

    {/* ── Sweeping arrow: bottom-left curving up to top-right ── */}
    <path d="M26,82 C40,62 62,42 96,26" fill="none" stroke="url(#be-arrow)" strokeWidth="5.5" strokeLinecap="round"/>
    {/* Arrowhead */}
    <polygon points="96,26 80,25 88,38" fill="url(#be-arrow)"/>
  </svg>
)

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { canViewModule } = usePermissions()

  // Show only modules the user can view
  const navigation = allNavigation.filter((item) => {
    if (item.href === '/') return true
    if (!item.module) return true
    return canViewModule(item.module)
  })

  const handleNavClick = () => {
    onClose()
  }

  const { logout } = useAuth()
  const handleLogout = async () => {
    // Clear local auth immediately and rely on client-side redirect.
    logout()
    toast.success('Logged out successfully')
    const base = (import.meta as any).env?.VITE_ADMIN_BASE_URL || `${window.location.protocol}//${window.location.host}/brk-eye-adm`
    const normalized = (typeof base === 'string' && base.endsWith('/')) ? base : `${base}/`
    const loginUrl = `${normalized}login`
    // Hard redirect to prevent history back to protected pages
    window.location.replace(loginUrl)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className="hidden lg:flex lg:flex-shrink-0 relative z-0 transition-[width] duration-300 ease-in-out"
        style={{ width: isCollapsed ? '4.5rem' : '13.5rem' }}
      >
        <div className="relative z-0 flex h-screen flex-col border-r border-slate-200 bg-white shadow-xl w-full overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-white0"></div>
          {/* Header */}
          <div className={cn(
            "border-b border-slate-200 bg-white flex-shrink-0 h-[88px]",
            isCollapsed ? "flex items-center justify-center px-3" : "px-3 flex items-center"
          )}>
            {isCollapsed ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 overflow-hidden">
                <BrokerEyeIcon size={44} />
              </div>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-shrink-0">
                  <BrokerEyeIcon size={36} />
                </div>
                <div className="min-w-0 leading-tight">
                  <h1 className="text-base font-bold text-slate-900 whitespace-nowrap tracking-tight">
                    Broker Eye Admin
                  </h1>
                  <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Management Pro</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden no-scrollbar",
            isCollapsed ? "px-2 pt-8 pb-6" : "px-4 py-6"
          )}>
            <nav className={cn(isCollapsed ? "space-y-2" : "space-y-1")}>
              {navigation.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href + '/'))
                
                return (
                  <div key={item.name}>
                    <Link
                      to={item.href}
                      title={isCollapsed ? item.name : undefined}
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center rounded-lg transition-all duration-200 group relative",
                        isCollapsed ? "justify-center h-11 w-11 mx-auto" : "space-x-3 p-3",
                        isActive
                          ? isCollapsed
                            ? "bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                            : "bg-blue-100 text-slate-900 border-l-4 border-blue-700"
                          : isCollapsed
                            ? "text-slate-500 hover:bg-white hover:text-slate-900"
                            : "text-slate-600 hover:bg-white hover:text-slate-900"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 transition-all duration-200 flex-shrink-0",
                        "group-hover:scale-105",
                        isActive
                          ? isCollapsed
                            ? "text-white"
                            : "text-blue-700"
                          : "text-slate-600 group-hover:text-slate-900"
                      )} />
                      
                      {!isCollapsed && (
                        <span className="font-medium whitespace-nowrap">{item.name}</span>
                      )}
                    </Link>
                  </div>
                )
              })}
            </nav>
          </div>
          
          {/* Logout Button */}
          <div className={cn(
            "border-t border-slate-200 bg-white flex-shrink-0",
            isCollapsed ? "p-2" : "p-4"
          )}>
            <button
              onClick={handleLogout}
              title={isCollapsed ? 'Sign Out' : undefined}
              className={cn(
                "flex items-center rounded-lg transition-all duration-200 group text-red-600 hover:bg-red-50 hover:text-red-700",
                isCollapsed ? "justify-center h-11 w-11 mx-auto" : "w-full space-x-3 p-3"
              )}
            >
              <LogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105" />
              {!isCollapsed && (
                <span className="font-medium whitespace-nowrap">Sign Out</span>
              )}
            </button>
          </div>
        </div>

        {/* Edge collapse button (outside inner overflow container) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute z-20 right-0 top-12 translate-x-1/2 rounded-full bg-blue-700 border border-blue-600 shadow-md hover:shadow-lg hover:bg-blue-800 transition-all duration-200 text-white flex items-center justify-center w-8 h-8"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight className={cn(
            "w-4 h-4 transition-transform duration-300",
            isCollapsed ? "rotate-0" : "rotate-180"
          )} />
        </button>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={onClose}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
                  <div className="flex items-center space-x-3">
                    <BrokerEyeIcon size={40} />
                    <div>
                      <h1 className="text-xl font-bold text-slate-900">
                        Broker Eye Admin
                      </h1>
                      <p className="text-xs text-slate-500 font-medium">Management Pro</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-blue-100 transition-all duration-200 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 px-4 py-6 overflow-y-auto no-scrollbar">
                  <nav className="space-y-1">
                    {navigation.map((item, index) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href + '/'))
                      
                      return (
                        <div key={item.name}>
                          <Link
                            to={item.href}
                            onClick={handleNavClick}
                            className={cn(
                              "flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group relative",
                              isActive
                                ? "bg-blue-100 text-slate-900 border-l-4 border-blue-700"
                                : "text-slate-600 hover:bg-white hover:text-slate-900"
                            )}
                          >
                            <Icon className={cn(
                              "w-5 h-5 transition-transform duration-200",
                              "group-hover:scale-105",
                              isActive ? "text-slate-700" : "text-slate-400 group-hover:text-slate-600"
                            )} />
                            
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        </div>
                      )
                    })}
                  </nav>
                </div>
                
                {/* Mobile Logout Button */}
                <div className="p-4 border-t border-slate-200 bg-white">
                  <button
                    onClick={() => {
                      onClose()
                      handleLogout()
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar

