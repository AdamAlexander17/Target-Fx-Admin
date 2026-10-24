import React, { useState } from 'react'
import SavingOverlay from './ui/SavingOverlay'
import { XMarkIcon, PlusIcon, TrashIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { brokerRightsService } from '../services/brokerRightsService'
import { Broker, BrokerRight } from '../types'
import toast from 'react-hot-toast'

interface BrokerRightsModalProps {
  broker: Broker
  allRights: BrokerRight[]
  isOpen: boolean
  onClose: () => void
}

const BrokerRightsModal: React.FC<BrokerRightsModalProps> = ({
  broker,
  allRights,
  isOpen,
  onClose
}) => {

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const queryClient = useQueryClient()

  // Fetch broker's current rights
  const { data: brokerRights, isLoading: rightsLoading } = useQuery(
    ['broker-rights', broker.id],
    () => brokerRightsService.getBrokerRights(broker.id),
    {
      enabled: !!broker.id
    }
  )

  // Assign right mutation
  const assignRightMutation = useMutation(
    ({ brokerId, rightId }: { brokerId: number; rightId: number }) =>
      brokerRightsService.assignRightToBroker(brokerId, rightId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['broker-rights', broker.id])

        toast.success('Right assigned successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to assign right')
      }
    }
  )

  // Revoke right mutation
  const revokeRightMutation = useMutation(
    ({ brokerId, rightId }: { brokerId: number; rightId: number }) =>
      brokerRightsService.revokeRightFromBroker(brokerId, rightId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['broker-rights', broker.id])
        toast.success('Right revoked successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to revoke right')
      }
    }
  )

  // Sync rights mutation
  const syncRightsMutation = useMutation(
    ({ brokerId, rightIds }: { brokerId: number; rightIds: number[] }) =>
      brokerRightsService.syncBrokerRights(brokerId, rightIds),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['broker-rights', broker.id])
        toast.success('Rights synchronized successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to sync rights')
      }
    }
  )



  const handleRevokeRight = (rightId: number) => {
    if (broker.id && window.confirm('Are you sure you want to revoke this right?')) {
      revokeRightMutation.mutate({ brokerId: broker.id, rightId })
    }
  }

  const handleSyncAllRights = () => {
    if (broker.id && window.confirm('This will assign ALL available rights to this broker. Continue?')) {
      const allRightIds = allRights.map(right => right.id)
      syncRightsMutation.mutate({ brokerId: broker.id, rightIds: allRightIds })
    }
  }

  const handleClearAllRights = () => {
    if (broker.id && window.confirm('This will remove ALL rights from this broker. Continue?')) {
      syncRightsMutation.mutate({ brokerId: broker.id, rightIds: [] })
    }
  }

  // Get available rights (not already assigned)
  const assignedRightIds = brokerRights?.map(right => right.id) || []
  const availableRights = allRights.filter(right => !assignedRightIds.includes(right.id))

  // Filter available rights
  const filteredAvailableRights = availableRights.filter(right => {
    const matchesSearch = right.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         right.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || right.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = [...new Set(allRights.map(r => r.category))].sort()

  // Group current rights by category
  const groupedCurrentRights = (brokerRights || []).reduce((acc, right) => {
    const category = right.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(right)
    return acc
  }, {} as Record<string, BrokerRight[]>)

  // Navigation functions
  const nextCategory = () => {
    setCurrentCategoryIndex((prev) => (prev + 1) % categories.length)
  }

  const prevCategory = () => {
    setCurrentCategoryIndex((prev) => (prev - 1 + categories.length) % categories.length)
  }

  const goToCategory = (index: number) => {
    setCurrentCategoryIndex(index)
  }

  // Get current category data
  const currentCategory = categories[currentCategoryIndex]
  const currentAvailableRights = filteredAvailableRights.filter(right => right.category === currentCategory)
  const currentAssignedRights = groupedCurrentRights[currentCategory] || []

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <SavingOverlay show={!!(syncRightsMutation.isLoading || assignRightMutation.isLoading || revokeRightMutation.isLoading)} />
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-white0 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-slate-900">
                  Manage Rights for {broker.full_name}
                </h3>
                <p className="text-sm text-slate-500">{broker.email}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Header Controls */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-300">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search rights..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm w-64"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category?.charAt(0)?.toUpperCase() + category?.slice(1)?.replace('_', ' ') || category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSyncAllRights}
                  disabled={syncRightsMutation.isLoading}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <CheckIcon className="h-4 w-4 inline mr-1" />
                  Sync All Rights
                </button>
                <button
                  onClick={handleClearAllRights}
                  disabled={syncRightsMutation.isLoading}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Category Navigation */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-slate-900">Permission Categories</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-500">
                    {currentCategoryIndex + 1} of {categories.length}
                  </span>
                  <button
                    onClick={prevCategory}
                    disabled={categories.length <= 1}
                    className="p-2 rounded-md border border-slate-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={nextCategory}
                    disabled={categories.length <= 1}
                    className="p-2 rounded-md border border-slate-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Category Dots Navigation */}
              <div className="flex justify-center space-x-2 mb-6">
                {categories.map((category, index) => (
                  <button
                    key={category}
                    onClick={() => goToCategory(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentCategoryIndex
                        ? 'bg-blue-700'
                        : 'bg-blue-300 hover:bg-blue-400'
                    }`}
                    title={category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}
                  />
                ))}
              </div>
            </div>

            {/* Current Category Display */}
            {categories.length > 0 && currentCategory && (
              <div className="space-y-6">
                {/* Category Header */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-900 capitalize mb-2">
                    {currentCategory.replace('_', ' ')}
                  </h3>
                  <p className="text-slate-600">
                    Manage {currentCategory.replace('_', ' ').toLowerCase()} permissions for this broker
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Available Rights */}
                  <div className="bg-white rounded-lg p-6 border border-slate-300">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-slate-900">Available Rights</h4>
                      <span className="bg-blue-100 text-slate-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {currentAvailableRights.length}
                      </span>
                    </div>
                    
                    {currentAvailableRights.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {currentAvailableRights.map(right => (
                          <div key={right.id} className="bg-white p-4 rounded-md border border-slate-300 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 mb-1">{right.name}</div>
                                <div className="text-xs text-slate-600">{right.description}</div>
                              </div>
                              <button
                                onClick={() => assignRightMutation.mutate({ brokerId: broker.id, rightId: right.id })}
                                disabled={assignRightMutation.isLoading}
                                className="ml-3 p-2 text-green-600 hover:text-white hover:bg-green-600 rounded-md transition-colors flex-shrink-0"
                                title="Assign Right"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-600">
                        <p>No available rights in this category</p>
                      </div>
                    )}
                  </div>

                  {/* Current Rights */}
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-green-900">Assigned Rights</h4>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {currentAssignedRights.length}
                      </span>
                    </div>
                    
                    {rightsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 bg-green-100 rounded-md animate-pulse"></div>
                        ))}
                      </div>
                    ) : currentAssignedRights.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {currentAssignedRights.map(right => (
                          <div key={right.id} className="bg-white p-4 rounded-md border border-green-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 mb-1">{right.name}</div>
                                <div className="text-xs text-slate-600">{right.description}</div>
                              </div>
                              <button
                                onClick={() => handleRevokeRight(right.id)}
                                disabled={revokeRightMutation.isLoading}
                                className="ml-3 p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-md transition-colors flex-shrink-0"
                                title="Revoke Right"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-green-600">
                        <p>No rights assigned in this category</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrokerRightsModal

