
import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { PermissionGate } from './components/PermissionGate'
import { PermissionProvider } from './contexts/PermissionContext'
import { usePermissions } from './contexts/PermissionContext'
import Login from './pages/Login'
import Users from './pages/Users'
import Roles from './pages/Roles'
import Brokers from './pages/Brokers'
import BrokerProfiles from './pages/BrokerProfiles'
import Groups from './pages/Groups'
import Rules from './pages/Rules'
import Settings from './pages/Settings'
import AuditLogs from './pages/AuditLogs'
import Logs from './pages/Logs'
import ApiMetrics from './pages/ApiMetrics'

import ModalTest from './components/ModalTest'
import Dashboard from './pages/Dashboard'
import CreateBroker from './pages/CreateBroker'
import BrokerBills from './pages/BrokerBills'
import BrokerExchange from './pages/BrokerExchange'
import SettlementWeeks from './pages/SettlementWeeks'
import { MODULES, PERMISSIONS } from './utils/permissions'


const AccessDenied = ({ title }: { title: string }) => {
    useEffect(() => {
        toast.error(`You do not have permission to access ${title}.`, { id: `access-denied-${title}` })
    }, [title])

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-300 bg-white p-8 text-center shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">You do not have permission</h2>
                <p className="mt-2 text-sm text-slate-500">You do not have permission to access the {title} page.</p>
            </div>
        </div>
    )
}

const ModuleRoute = ({ module, title, children }: { module: string; title: string; children: React.ReactNode }) => {
    const { isLoading, user } = usePermissions()
    // Only show the full-page spinner on the very first permissions load.
    // After we have a user, subsequent background refetches keep the page
    // (including its header) mounted so navigation feels seamless.
    if (isLoading && !user) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        )
    }
    return (
        <PermissionGate module={module} action="view" fallback={<AccessDenied title={title} />}>
            {children}
        </PermissionGate>
    )
}



function App() {
    return (
        <PermissionProvider>
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/*" element={
                        <ProtectedRoute>
                            <Layout>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="min-h-full"
                                >
                                    <Routes>
                                        <Route path="/" element={<ModuleRoute module={MODULES.DASHBOARD} title="Dashboard"><Dashboard /></ModuleRoute>} />
                                        <Route path="/users" element={<ModuleRoute module={MODULES.USERS} title="Users"><Users /></ModuleRoute>} />
                                        <Route path="/roles" element={<ModuleRoute module={MODULES.ROLES} title="Roles"><Roles /></ModuleRoute>} />
                                        <Route path="/brokers" element={<ModuleRoute module={MODULES.BROKERS} title="Brokers"><Brokers /></ModuleRoute>} />
                                        <Route path="/broker-profiles" element={<ModuleRoute module={MODULES.BROKER_PROFILES} title="Broker Profiles"><BrokerProfiles /></ModuleRoute>} />
                                        <Route path="/groups" element={<ModuleRoute module={MODULES.GROUPS} title="Groups"><Groups /></ModuleRoute>} />
                                        <Route path="/rules" element={<ModuleRoute module={MODULES.RULES} title="Rules"><Rules /></ModuleRoute>} />
                                        <Route path="/audit-logs" element={<ModuleRoute module={MODULES.AUDIT_LOGS} title="Audit Logs"><AuditLogs /></ModuleRoute>} />
                                        <Route path="/logs" element={<ModuleRoute module={MODULES.LOGS} title="Logs"><Logs /></ModuleRoute>} />
                                        <Route path="/api-metrics" element={<ApiMetrics />} />

                                        <Route path="/settings" element={<ModuleRoute module={MODULES.PROFILE} title="Settings"><Settings /></ModuleRoute>} />
                                        <Route path="/modal-test" element={<ModalTest />} />
                                        <Route path="/create-broker" element={<PermissionGate permission={PERMISSIONS.BROKERS_CREATE} fallback={<AccessDenied title="Create Broker" />}><CreateBroker /></PermissionGate>} />
                                        <Route path="/brokers/:brokerId/bills" element={<ModuleRoute module={MODULES.BROKERS} title="Bills"><BrokerBills /></ModuleRoute>} />
                                        <Route path="/brokers/:brokerId/exchange-data" element={<ModuleRoute module={MODULES.BROKERS} title="Exchange Data"><BrokerExchange /></ModuleRoute>} />
                                        <Route path="/settlement-weeks" element={<ModuleRoute module={MODULES.SETTLEMENT_WEEKS} title="Settlement Weeks"><SettlementWeeks /></ModuleRoute>} />
                                    </Routes>
                                </motion.div>
                            </Layout>
                        </ProtectedRoute>
                    } />
                </Routes>
            </AnimatePresence>

            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#ffffff',
                        color: '#0f172a',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                        fontSize: '14px',
                        fontWeight: '500',
                    },
                    success: {
                        iconTheme: {
                            primary: '#1d4ed8',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />
        </PermissionProvider>
    )
}

export default App

