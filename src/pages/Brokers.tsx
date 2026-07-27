import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, FunnelIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { BuildingOfficeIcon } from '@heroicons/react/24/solid'
import { brokerService } from '../services/brokerService'
import { brokerRightsService } from '../services/brokerRightsService'
import BrokerTable from '../components/BrokerTable'
import BrokerModal from '../components/BrokerModal'
import GlobalRightsSyncModal from '../components/GlobalRightsSyncModal'
import ConfirmationDialog from '../components/ui/ConfirmationDialog'
import { Broker, CreateBrokerData, UpdateBrokerData, BrokerFilters } from '../types'
import toast from 'react-hot-toast'
import { PermissionGate } from '../components/PermissionGate'
import { MODULES } from '../utils/permissions'
import PageHeaderShell from '../components/layout/PageHeaderShell'

const Brokers: React.FC = () => {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGlobalSyncModalOpen, setIsGlobalSyncModalOpen] = useState(false)
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    brokerId: number | null
    brokerName: string
  }>({
    isOpen: false,
    brokerId: null,
    brokerName: ''
  })
  const [isSyncingGlobalRights, setIsSyncingGlobalRights] = useState(false)
  
  // Client-side sorting state for count fields
  const [clientSideSort, setClientSideSort] = useState<{
    field: string | null
    order: 'ASC' | 'DESC'
  }>({
    field: null,
    order: 'ASC'
  })

  const [filters, setFilters] = useState<BrokerFilters>({
    sort_by: 'created_at',
    sort_order: 'DESC'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pageSize, setPageSize] = useState(50)
  const queryClient = useQueryClient()

  // Debounce search input to avoid API calls on every keypress
  React.useEffect(() => {
    if (searchTerm === '') {
      setDebouncedSearchTerm('')
      return
    }

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchTerm])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm])

  // Fetch brokers
  const { data: brokersData, isLoading, error, refetch } = useQuery(
    ['brokers', currentPage, pageSize, filters, debouncedSearchTerm],
    () => {
      // For "All" option or large numbers, fetch a large batch
      const fetchSize = pageSize > 100 ? 1000 : pageSize
      return brokerService.getBrokers(currentPage, fetchSize, { ...filters, search: debouncedSearchTerm })
    },
    {
      keepPreviousData: true,
      retry: false, // Don't retry on permission errors
      onError: (err: any) => {
        // Silently handle 403 errors - we'll show UI message instead
        if (err?.response?.status === 403) {
          console.warn('Access denied to brokers module')
        } else if (err?.response?.status === 401) {
          toast.error('Session expired. Please log in again.')
        }
      }
    }
  )

  // Create broker mutation
  const createBrokerMutation = useMutation(
    (brokerData: CreateBrokerData) => brokerService.createBroker(brokerData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['brokers'])
        setIsModalOpen(false)
        toast.success('Broker created successfully!')
      },
      onError: (error: any) => {
        console.error('Create broker error:', error)
        if (error.response?.status === 403) {
          toast.error('Access denied: You do not have permission to create brokers. Please contact your administrator.')
        } else if (error.response?.status === 401) {
          toast.error('Authentication required: Please log in again.')
        } else {
          toast.error(error.response?.data?.message || 'Failed to create broker')
        }
      }
    }
  )

  // Update broker mutation
  const updateBrokerMutation = useMutation(
    ({ id, brokerData }: { id: number; brokerData: UpdateBrokerData }) =>
      brokerService.updateBroker(id, brokerData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['brokers'])
        setIsModalOpen(false)
        setEditingBroker(null)
        toast.success('Broker updated successfully!')
      },
      onError: (error: any) => {
        console.error('Update broker error:', error)
        if (error.response?.status === 403) {
          toast.error('Access denied: You do not have permission to update brokers. Please contact your administrator.')
        } else if (error.response?.status === 401) {
          toast.error('Authentication required: Please log in again.')
        } else {
          toast.error(error.response?.data?.message || 'Failed to update broker')
        }
      }
    }
  )

  // Delete broker mutation
  const deleteBrokerMutation = useMutation(
    (id: number) => brokerService.deleteBroker(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['brokers'])
        toast.success('Broker deleted successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete broker')
      }
    }
  )

  // Toggle broker status mutation
  const toggleStatusMutation = useMutation(
    (id: number) => brokerService.toggleBrokerStatus(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['brokers'])
        toast.success('Broker status updated successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update broker status')
      }
    }
  )

  // Unlock broker mutation
  const unlockBrokerMutation = useMutation(
    (id: number) => brokerService.unlockBroker(id),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['brokers'])
        toast.success(`Broker "${data.username}" unlocked successfully!`)
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to unlock broker')
      }
    }
  )

  const handleCreateBroker = () => {
    setEditingBroker(null)
    setIsModalOpen(true)
  }

  const handleRefresh = async () => {
    await refetch()
    toast.success('Brokers list refreshed!')
  }

  const handleEditBroker = (broker: Broker) => {
    setEditingBroker(broker)
    setIsModalOpen(true)
  }

  const handleDeleteBroker = (id: number) => {
    const broker = brokersData?.brokers?.find((b: Broker) => b.id === id)
    setDeleteConfirmation({
      isOpen: true,
      brokerId: id,
      brokerName: broker?.full_name || 'Unknown Broker'
    })
  }

  const confirmDelete = () => {
    if (deleteConfirmation.brokerId) {
      deleteBrokerMutation.mutate(deleteConfirmation.brokerId)
      setDeleteConfirmation({ isOpen: false, brokerId: null, brokerName: '' })
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, brokerId: null, brokerName: '' })
  }

  const handleToggleStatus = (id: number) => {
    toggleStatusMutation.mutate(id)
  }

  const handleUnlockBroker = (broker: Broker) => {
    unlockBrokerMutation.mutate(broker.id)
  }

  const handleSubmit = async (data: CreateBrokerData | UpdateBrokerData) => {
    if (editingBroker) {
      return await updateBrokerMutation.mutateAsync({ id: editingBroker.id, brokerData: data as UpdateBrokerData })
    } else {
      return await createBrokerMutation.mutateAsync(data as CreateBrokerData)
    }
  }

  const handleFilterChange = (newFilters: Partial<BrokerFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleSort = (sortBy: string) => {
    // Client-side sorting for count fields (backend doesn't support these)
    const clientSortFields = ['clients_count', 'group_mappings_count', 'rights_count']
    
    if (clientSortFields.includes(sortBy)) {
      const newSortOrder = clientSideSort.field === sortBy && clientSideSort.order === 'ASC' ? 'DESC' : 'ASC'
      setClientSideSort({ field: sortBy, order: newSortOrder })
      // Clear server-side sort
      setFilters(prev => ({ ...prev, sort_by: undefined, sort_order: undefined }))
    } else {
      // Server-side sorting for other fields
      const newSortOrder = filters.sort_by === sortBy && filters.sort_order === 'ASC' ? 'DESC' : 'ASC'
      handleFilterChange({ sort_by: sortBy, sort_order: newSortOrder })
      // Clear client-side sort
      setClientSideSort({ field: null, order: 'ASC' })
    }
  }

  // Reset to page 1 when pageSize changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [pageSize])

  const handleGlobalRightsSync = async (rightIds: number[]) => {
    if (!brokersData?.brokers || brokersData.brokers.length === 0) {
      toast.error('No brokers available to sync')
      return
    }

    setIsSyncingGlobalRights(true)
    const totalBrokers = brokersData.brokers.length
    let successCount = 0
    let errorCount = 0
    let addedRightsCount = 0

    try {
      const syncPromises = brokersData.brokers.map(async (broker: Broker) => {
        try {
          // First, get the broker's existing rights
          const existingRights = await brokerRightsService.getBrokerRights(broker.id)
          const existingRightIds = existingRights.map(r => r.id)
          
          // Find rights that need to be added (not already assigned)
          const rightsToAdd = rightIds.filter(rightId => !existingRightIds.includes(rightId))
          
          if (rightsToAdd.length > 0) {
            // Add each new right individually
            await Promise.all(
              rightsToAdd.map(rightId => 
                brokerRightsService.assignRightToBroker(broker.id, rightId)
              )
            )
            addedRightsCount += rightsToAdd.length
          }
          
          successCount++
          return { success: true, brokerId: broker.id, added: rightsToAdd.length }
        } catch (error) {
          errorCount++
          console.error(`Failed to sync rights for broker ${broker.id}:`, error)
          return { success: false, brokerId: broker.id, added: 0 }
        }
      })

      await Promise.all(syncPromises)

      // Refresh broker data to show updated rights
      queryClient.invalidateQueries(['brokers'])

      if (successCount === totalBrokers) {
        toast.success(`✅ Successfully added ${addedRightsCount} new rights to ${totalBrokers} brokers!`)
      } else if (successCount > 0) {
        toast.success(`Added ${addedRightsCount} new rights to ${successCount}/${totalBrokers} brokers. ${errorCount} failed.`, {
          duration: 5000
        })
      } else {
        toast.error(`Failed to sync rights to all brokers. Please try again.`)
      }
    } catch (error) {
      console.error('Global rights sync error:', error)
      toast.error('An unexpected error occurred during sync')
    } finally {
      setIsSyncingGlobalRights(false)
    }
  }

  // Generate dynamic pagination options based on total items
  const totalItems = brokersData?.pagination?.total || 0
  const paginationOptions = useMemo(() => {
    return [10, 25, 50]
  }, [])

  // Apply client-side sorting for count fields
  const sortedBrokers = useMemo(() => {
    if (!brokersData?.brokers) return []
    
    const brokers = [...brokersData.brokers]
    
    // Only apply client-side sort if a count field is selected
    if (clientSideSort.field) {
      brokers.sort((a: Broker, b: Broker) => {
        let aValue = 0
        let bValue = 0
        
        switch (clientSideSort.field) {
          case 'clients_count':
            aValue = a.clients_count || 0
            bValue = b.clients_count || 0
            break
          case 'group_mappings_count':
            aValue = a.group_mappings_count || 0
            bValue = b.group_mappings_count || 0
            break
          case 'rights_count':
            aValue = a.rights_count || 0
            bValue = b.rights_count || 0
            break
        }
        
        if (clientSideSort.order === 'ASC') {
          return aValue - bValue
        } else {
          return bValue - aValue
        }
      })
    }
    
    return brokers
  }, [brokersData?.brokers, clientSideSort])

  // Check if error is 403 (permission denied)
  if (error) {
    const is403 = (error as any)?.response?.status === 403
    
    if (is403) {
      return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          false 
            ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900' 
            : 'bg-gradient-to-br from-white via-blue-50/30 to-white'
        }`}>
          <div className={`max-w-md w-full mx-4 p-8 rounded-xl border shadow-xl text-center ${
            false 
              ? 'bg-blue-800/80 border-blue-700' 
              : 'bg-white border-slate-300'
          }`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2 text-slate-900">
              Access Denied
            </h2>
            <p className="mb-6 text-slate-600">
              You don't have permission to view brokers. Please contact your administrator for access.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg transition-colors hover:bg-white"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading brokers. Please try again.</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      false 
        ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900' 
        : 'bg-gradient-to-br from-white via-blue-50/30 to-white'
    }`}>
      {/* Compact Header with Glass Effect */}
      <PageHeaderShell>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center">
                    <BuildingOfficeIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className={`text-lg font-bold transition-colors duration-300 ${
                    false 
                      ? 'bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent' 
                      : 'bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent'
                  }`}>
                    Broker Management
                  </h1>
                  <p className={`text-xs font-medium transition-colors duration-300 ${
                    'text-slate-500'
                  }`}>
                    Manage brokers and their permissions
                  </p>
                </div>
              </div>

              {/* Header controls: filters + refresh + add */}
              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg transition-all duration-200 flex items-center gap-2 whitespace-nowrap text-sm shadow-sm hover:bg-slate-50"
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span>Filters</span>
                </button>
                <button
                  onClick={handleRefresh}
                  className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shadow-sm text-sm group hover:bg-slate-50"
                  title="Refresh brokers list"
                >
                  <ArrowPathIcon className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                  <span>Refresh</span>
                </button>
                <PermissionGate module={MODULES.BROKERS} action="create">
                  <button
                    onClick={handleCreateBroker}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shadow-sm font-semibold text-sm group"
                  >
                    <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    <span>Add Broker</span>
                  </button>
                </PermissionGate>
              </div>
            </div>
      </PageHeaderShell>

      {/* Filter Modal Overlay */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showFilters && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                style={{ zIndex: 10000 }}
                onClick={() => setShowFilters(false)}
              />

              {/* Filter Panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
                style={{ zIndex: 10001 }}
              >
                <div
                  className={`w-[min(450px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border shadow-2xl p-6 pointer-events-auto ${
                    false
                      ? 'bg-blue-800 border-blue-700'
                      : 'bg-white border-slate-300'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`font-semibold ${
                            'text-slate-900'
                          }`}>Filters</h3>
                          <button
                            onClick={() => setShowFilters(false)}
                            className={`hover:text-slate-600 ${
                              'text-slate-400'
                            }`}
                          >
                            ×
                          </button>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${
                            'text-slate-700'
                          }`}>Status</label>
                          <select
                            value={filters.is_active?.toString() || 'all'}
                            onChange={(e) => handleFilterChange({ 
                              is_active: e.target.value === 'all' ? undefined : e.target.value === 'true' 
                            })}
                            className={`w-full px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors ${
                              false 
                                ? 'bg-blue-700/50 border-blue-600 text-slate-200' 
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            <option value="all">All Status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>

                        {/* Rights Filter */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${
                            'text-slate-700'
                          }`}>Rights</label>
                          <select
                            value={filters.has_rights?.toString() || 'all'}
                            onChange={(e) => handleFilterChange({ 
                              has_rights: e.target.value === 'all' ? undefined : e.target.value === 'true' 
                            })}
                            className={`w-full px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors ${
                              false 
                                ? 'bg-blue-700/50 border-blue-600 text-slate-200' 
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            <option value="all">All Rights</option>
                            <option value="true">Has Rights</option>
                            <option value="false">No Rights</option>
                          </select>
                        </div>

                        {/* Account Range From */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${
                            'text-slate-700'
                          }`}>Account Range From</label>
                          <input
                            type="number"
                            min={0}
                            placeholder="e.g. 1000"
                            value={filters.account_range_from || ''}
                            onChange={(e) => handleFilterChange({ 
                              account_range_from: e.target.value ? Math.max(0, Number(e.target.value)) : undefined 
                            })}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                e.preventDefault()
                              }
                            }}
                            className={`w-full px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors ${
                              false 
                                ? 'bg-blue-700/50 border-blue-600 text-slate-200 placeholder-slate-400' 
                                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>

                        {/* Account Range To */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${
                            'text-slate-700'
                          }`}>Account Range To</label>
                          <input
                            type="number"
                            min={0}
                            placeholder="e.g. 5000"
                            value={filters.account_range_to || ''}
                            onChange={(e) => handleFilterChange({ 
                              account_range_to: e.target.value ? Math.max(0, Number(e.target.value)) : undefined 
                            })}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                e.preventDefault()
                              }
                            }}
                            className={`w-full px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors ${
                              false 
                                ? 'bg-blue-700/50 border-blue-600 text-slate-200 placeholder-slate-400' 
                                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>

                        {/* Created Date From */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${
                            'text-slate-700'
                          }`}>Created From</label>
                          <input
                            type="date"
                            value={filters.created_from || ''}
                            onChange={(e) => handleFilterChange({ 
                              created_from: e.target.value || undefined 
                            })}
                            className={`w-full px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors ${
                              false 
                                ? 'bg-blue-700/50 border-blue-600 text-slate-200' 
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Created Date To */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${
                            'text-slate-700'
                          }`}>Created To</label>
                          <input
                            type="date"
                            value={filters.created_to || ''}
                            onChange={(e) => handleFilterChange({ 
                              created_to: e.target.value || undefined 
                            })}
                            className={`w-full px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors ${
                              false 
                                ? 'bg-blue-700/50 border-blue-600 text-slate-200' 
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Actions */}
                        <div className={`flex items-center justify-between pt-3 border-t transition-colors ${
                          'border-slate-300'
                        }`}>
                          <button
                            onClick={() => {
                              setFilters({ sort_by: 'created_at', sort_order: 'DESC' })
                              setSearchTerm('')
                            }}
                            className={`text-xs hover:text-slate-800 transition-colors ${
                              'text-slate-600'
                            }`}
                          >
                            Clear All
                          </button>
                          <button
                            onClick={() => setShowFilters(false)}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs rounded-md hover:bg-white shadow-sm"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                </div>
                    </motion.div>
                  </>
                )}
        </AnimatePresence>,
        document.body
      )}

      {/* Main Content */}
      <main className="px-2 pt-3 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <BrokerTable
            brokers={sortedBrokers}
            isLoading={isLoading}
            onEdit={handleEditBroker}
            onDelete={handleDeleteBroker}
            onToggleStatus={handleToggleStatus}
            onUnlock={handleUnlockBroker}
            onViewBills={(broker) => navigate(`/brokers/${broker.id}/bills`)}
            onSort={handleSort}
            currentSort={{
              field: clientSideSort.field || filters.sort_by || 'created_at',
              order: clientSideSort.field ? clientSideSort.order : (filters.sort_order || 'DESC')
            }}
            pagination={brokersData?.pagination}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            topContent={
              <div className="flex flex-col gap-3">
                {/* Row: search (left) + show entries + pagination (right) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Search by name, email, username..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-sm bg-white text-slate-900 placeholder-slate-400"
                    />
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    {searchTerm && (
                      <button
                        onClick={() => handleSearch('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-600">Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 text-xs bg-white text-slate-900"
                    >
                      {paginationOptions.map(option => (
                        <option key={option} value={option}>
                          {option === totalItems ? `All (${option})` : option}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-600">entries</span>
                  </div>
                  {brokersData?.pagination && brokersData.pagination.pages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 border border-slate-300 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-xs text-slate-700">Page {currentPage} of {brokersData.pagination.pages}</span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(brokersData.pagination.pages, prev + 1))}
                        disabled={currentPage === brokersData.pagination.pages}
                        className="px-2 py-1 border border-slate-300 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            }
          />
        </motion.div>
      </main>

      {/* Broker Modal */}
      {isModalOpen && (
        <BrokerModal
          broker={editingBroker}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingBroker(null)
          }}
          onSubmit={handleSubmit}
          isLoading={createBrokerMutation.isLoading || updateBrokerMutation.isLoading}
        />
      )}

      {/* Global Rights Sync Modal */}
      <GlobalRightsSyncModal
        isOpen={isGlobalSyncModalOpen}
        onClose={() => setIsGlobalSyncModalOpen(false)}
        onSync={handleGlobalRightsSync}
        isLoading={isSyncingGlobalRights}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Broker"
        message={`Are you sure you want to delete the broker "${deleteConfirmation.brokerName}"? This action cannot be undone and will permanently remove all broker data, account mappings, and associated records.`}
        confirmText="Delete Broker"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteBrokerMutation.isLoading}
      />
    </div>
  )
}

export default Brokers

