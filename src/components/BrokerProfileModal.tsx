import React, { useState, useEffect } from 'react'
import SavingOverlay from './ui/SavingOverlay'
import { useQuery } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { brokerProfileService, BrokerProfile, CreateBrokerProfileData, UpdateBrokerProfileData, Right, Group } from '../services/brokerProfileService'
import toast from 'react-hot-toast'

interface BrokerProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateBrokerProfileData | UpdateBrokerProfileData) => Promise<void>
  profile: BrokerProfile | null
  isLoading: boolean
}

type TabType = 'basic' | 'rights' | 'groups'

const BrokerProfileModal: React.FC<BrokerProfileModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  profile,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedRights: [] as number[],
    selectedGroups: [] as number[]
  })
  const [groupSearchTerm, setGroupSearchTerm] = useState('')
  const [groupsPerPage, setGroupsPerPage] = useState(10)
  const [currentGroupPage, setCurrentGroupPage] = useState(1)

  // Fetch all rights
  const { data: allRights, isLoading: loadingRights } = useQuery(
    ['broker-rights-all'],
    () => brokerProfileService.getAllRights(),
    {
      onSuccess: (data) => {
        console.log('All Rights fetched:', data)
        console.log('Sample right structure:', data?.[0])
        const ids = data?.map(r => r.id) || []
        console.log('All Right IDs:', JSON.stringify(ids))
        console.log('First 3 IDs:', ids.slice(0, 3))
        console.log('Type of first ID:', typeof data?.[0]?.id)
      }
    }
  )

  // Fetch all groups
  const { data: allGroups, isLoading: loadingGroups } = useQuery(
    ['broker-groups-all'],
    () => brokerProfileService.getAllGroups()
  )

  // Fetch profile details when editing
  const { data: profileDetails } = useQuery(
    ['broker-profile', profile?.id],
    () => brokerProfileService.getProfileById(profile!.id),
    {
      enabled: !!profile?.id
    }
  )

  // Initialize form data
  useEffect(() => {
    if (profile && profileDetails) {
      console.log('Profile Details:', profileDetails)
      console.log('Rights from profile:', profileDetails.rights)
      const rightIds = profileDetails.rights.map(r => r.rightId)
      console.log('Selected Right IDs (rightId from profile):', JSON.stringify(rightIds))
      console.log('First 3 IDs:', rightIds.slice(0, 3))
      console.log('Type of first ID:', typeof rightIds[0])
      
      setFormData({
        name: profile.name,
        description: profile.description,
        selectedRights: rightIds,
        selectedGroups: profileDetails.groups.map(g => g.groupId)
      })
    } else {
      setFormData({
        name: '',
        description: '',
        selectedRights: [],
        selectedGroups: []
      })
    }
  }, [profile, profileDetails])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      toast.error('Profile name is required')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Profile description is required')
      return
    }

    try {
      const submitData: CreateBrokerProfileData = {
        name: formData.name,
        description: formData.description,
        rights: formData.selectedRights,
        groups: formData.selectedGroups
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Submit error:', error)
    }
  }

  const handleRightToggle = (rightId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedRights: prev.selectedRights.includes(rightId)
        ? prev.selectedRights.filter(id => id !== rightId)
        : [...prev.selectedRights, rightId]
    }))
  }

  const handleGroupToggle = (groupId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupId)
        ? prev.selectedGroups.filter(id => id !== groupId)
        : [...prev.selectedGroups, groupId]
    }))
  }

  const selectAllRights = () => {
    setFormData(prev => ({
      ...prev,
      selectedRights: allRights?.map(r => r.id) || []
    }))
  }

  const deselectAllRights = () => {
    setFormData(prev => ({
      ...prev,
      selectedRights: []
    }))
  }

  const selectAllGroups = () => {
    setFormData(prev => ({
      ...prev,
      selectedGroups: allGroups?.map(g => g.id) || []
    }))
  }

  const deselectAllGroups = () => {
    setFormData(prev => ({
      ...prev,
      selectedGroups: []
    }))
  }

  // Filter and paginate groups
  const filteredGroups = allGroups?.filter((group: Group) => 
    group.broker_view_group.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
    group.mt5_group.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(groupSearchTerm.toLowerCase())
  ) || []

  const totalGroupPages = Math.ceil(filteredGroups.length / groupsPerPage)
  const paginatedGroups = filteredGroups.slice(
    (currentGroupPage - 1) * groupsPerPage,
    currentGroupPage * groupsPerPage
  )

  // Generate dynamic pagination options based on total groups
  const groupPaginationOptions = React.useMemo(() => {
    const total = filteredGroups.length
    const options: number[] = []
    let current = 10
    
    while (current < total) {
      options.push(current)
      current += 10
    }
    
    // Add "All" option if total is reasonable
    if (total > 0 && total <= 100) {
      options.push(total)
    }
    
    return options.length > 0 ? options : [10, 20, 30, 40, 50]
  }, [filteredGroups.length])

  const handleGroupSearchChange = (value: string) => {
    setGroupSearchTerm(value)
    setCurrentGroupPage(1)
  }

  const handleGroupsPerPageChange = (value: number) => {
    setGroupsPerPage(value)
    setCurrentGroupPage(1)
  }

  if (!isOpen) return null

  return (
    <>
    <SavingOverlay show={!!(isLoading)} />
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-300">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {profile ? 'Edit Profile' : 'Create New Profile'}
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {profile ? 'Update profile details and rights settings' : 'Manage profile details and rights settings'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-300">
              <nav className="flex px-4 pt-3 gap-1">
              <button
                onClick={() => setActiveTab('basic')}
                className={`min-w-[140px] text-center rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'basic'
                    ? 'text-slate-900 border-blue-700'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-white'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('rights')}
                className={`min-w-[140px] text-center rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'rights'
                    ? 'text-slate-900 border-blue-700'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-white'
                }`}
              >
                Rights ({formData.selectedRights.length})
              </button>
              </nav>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              {/* Tab Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Profile Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all"
                        placeholder="Enter profile name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all"
                        placeholder="Enter profile description"
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Rights Tab */}
                {activeTab === 'rights' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-900">Select Rights</h3>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={selectAllRights}
                          className="px-2 py-1 text-xs text-slate-700 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllRights}
                          className="px-2 py-1 text-xs text-slate-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {loadingRights ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-300"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {allRights?.map((right: Right) => (
                          <label
                            key={right.id}
                            className="flex items-start p-2.5 border border-slate-300 rounded-lg hover:bg-white cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedRights.includes(right.id)}
                              onChange={() => handleRightToggle(right.id)}
                              className="mt-0.5 w-3.5 h-3.5 text-slate-600 border-slate-300 rounded focus:ring-slate-400"
                            />
                            <div className="ml-2">
                              <div className="text-xs font-medium text-slate-900">{right.name}</div>
                              <div className="text-[10px] text-slate-500 leading-tight">{right.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Groups Tab removed */}
                {false && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-900">Select Groups</h3>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={selectAllGroups}
                          className="px-2 py-1 text-xs text-slate-700 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllGroups}
                          className="px-2 py-1 text-xs text-slate-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {/* Search Box */}
                    <div className="relative">
                      <input
                        type="text"
                        value={groupSearchTerm}
                        onChange={(e) => handleGroupSearchChange(e.target.value)}
                        placeholder="Search groups..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                      />
                      <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {loadingGroups ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-300"></div>
                      </div>
                    ) : (
                      <>
                        {/* Pagination Controls */}
                        {filteredGroups.length > 0 && (
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-600">Show:</span>
                              <select
                                value={groupsPerPage}
                                onChange={(e) => handleGroupsPerPageChange(Number(e.target.value))}
                                className="px-2 py-0.5 text-[10px] border border-slate-300 rounded focus:ring-1 focus:ring-slate-400 focus:border-transparent bg-white"
                              >
                                {groupPaginationOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option === filteredGroups.length ? `All (${option})` : option}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="text-[10px] text-slate-700">
                              Showing {((currentGroupPage - 1) * groupsPerPage) + 1} to {Math.min(currentGroupPage * groupsPerPage, filteredGroups.length)} of {filteredGroups.length}
                            </div>

                            {totalGroupPages > 1 && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setCurrentGroupPage(prev => Math.max(1, prev - 1))}
                                  disabled={currentGroupPage === 1}
                                  className="px-1.5 py-0.5 border border-slate-300 rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                <span className="text-[10px] text-slate-700">
                                  Page {currentGroupPage} of {totalGroupPages}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCurrentGroupPage(prev => Math.min(totalGroupPages, prev + 1))}
                                  disabled={currentGroupPage === totalGroupPages}
                                  className="px-1.5 py-0.5 border border-slate-300 rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Groups List */}
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                          {paginatedGroups.length > 0 ? (
                            paginatedGroups.map((group: Group) => (
                              <label
                                key={group.id}
                                className="flex items-start p-2.5 border border-slate-300 rounded-lg hover:bg-white cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.selectedGroups.includes(group.id)}
                                  onChange={() => handleGroupToggle(group.id)}
                                  className="mt-0.5 w-3.5 h-3.5 text-slate-600 border-slate-300 rounded focus:ring-slate-400"
                                />
                                <div className="ml-2 flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs font-medium text-slate-900">{group.broker_view_group}</div>
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                                      group.is_active ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-slate-800'
                                    }`}>
                                      {group.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">MT5: {group.mt5_group}</div>
                                  {group.description && (
                                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{group.description}</div>
                                  )}
                                </div>
                              </label>
                            ))
                          ) : (
                            <div className="text-center py-8 text-xs text-slate-500">
                              {groupSearchTerm ? 'No groups found matching your search' : 'No groups available'}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-2.5 px-6 py-3 border-t border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-sm font-medium border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-all duration-200"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-1.5 text-sm font-medium bg-white border border-slate-300 text-slate-700 rounded-lg shadow-sm hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
    </>
  )
}

export default BrokerProfileModal

