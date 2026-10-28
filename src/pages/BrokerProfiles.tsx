import React, { useState, useMemo } from 'react'
import Loader from '../components/ui/Loader'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion } from 'framer-motion'
import { PlusIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { IdentificationIcon } from '@heroicons/react/24/solid'
import { brokerProfileService, BrokerProfile, CreateBrokerProfileData, UpdateBrokerProfileData } from '../services/brokerProfileService'
import BrokerProfileModal from '../components/BrokerProfileModal'
import ConfirmationDialog from '../components/ui/ConfirmationDialog'
import PageHeaderShell from '../components/layout/PageHeaderShell'
import toast from 'react-hot-toast'
import { PermissionGate, usePermissionCheck } from '../components/PermissionGate'
import { MODULES } from '../utils/permissions'

const BrokerProfiles: React.FC = () => {
  const { canCreate, canEdit, canDelete } = usePermissionCheck()
  const showActions = canEdit(MODULES.BROKER_PROFILES) || canDelete(MODULES.BROKER_PROFILES)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<BrokerProfile | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    profileId: number | null
    profileName: string
  }>({
    isOpen: false,
    profileId: null,
    profileName: ''
  })

  const queryClient = useQueryClient()

  // Fetch profiles
  const { data: profilesData, isLoading, error, refetch } = useQuery(
    ['broker-profiles'],
    () => brokerProfileService.getAllProfiles(),
    {
      keepPreviousData: true,
    }
  )

  // Create profile mutation
  const createProfileMutation = useMutation(
    (data: CreateBrokerProfileData) => brokerProfileService.createProfile(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['broker-profiles'])
        setIsModalOpen(false)
        toast.success('Profile created successfully!')
      },
      onError: (error: any) => {
        console.error('Create profile error:', error)
        toast.error(error.response?.data?.message || 'Failed to create profile')
      }
    }
  )

  // Update profile mutation
  const updateProfileMutation = useMutation(
    ({ id, data }: { id: number; data: UpdateBrokerProfileData }) =>
      brokerProfileService.updateProfile(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['broker-profiles'])
        setIsModalOpen(false)
        setEditingProfile(null)
        toast.success('Profile updated successfully!')
      },
      onError: (error: any) => {
        console.error('Update profile error:', error)
        toast.error(error.response?.data?.message || 'Failed to update profile')
      }
    }
  )

  // Delete profile mutation
  const deleteProfileMutation = useMutation(
    (id: number) => brokerProfileService.deleteProfile(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['broker-profiles'])
        toast.success('Profile deleted successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete profile')
      }
    }
  )

  const handleCreateProfile = () => {
    setEditingProfile(null)
    setIsModalOpen(true)
  }

  const handleRefresh = async () => {
    await refetch()
    toast.success('Profiles list refreshed!')
  }

  const handleEditProfile = (profile: BrokerProfile) => {
    setEditingProfile(profile)
    setIsModalOpen(true)
  }

  const handleDeleteProfile = (id: number) => {
    const profile = profilesData?.profiles?.find((p: BrokerProfile) => p.id === id)
    setDeleteConfirmation({
      isOpen: true,
      profileId: id,
      profileName: profile?.name || 'Unknown Profile'
    })
  }

  const confirmDelete = () => {
    if (deleteConfirmation.profileId) {
      deleteProfileMutation.mutate(deleteConfirmation.profileId)
      setDeleteConfirmation({ isOpen: false, profileId: null, profileName: '' })
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, profileId: null, profileName: '' })
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(field)
      setSortOrder('ASC')
    }
  }

  const filteredProfiles = profilesData?.profiles?.filter((profile: BrokerProfile) =>
    profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const sortedProfiles = useMemo(() => {
    if (!sortField) return filteredProfiles

    return [...filteredProfiles].sort((a: BrokerProfile, b: BrokerProfile) => {
      let aValue: any = a[sortField as keyof BrokerProfile]
      let bValue: any = b[sortField as keyof BrokerProfile]

      if (aValue < bValue) return sortOrder === 'ASC' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'ASC' ? 1 : -1
      return 0
    })
  }, [filteredProfiles, sortField, sortOrder])

  // Pagination calculations
  const totalItems = sortedProfiles.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProfiles = sortedProfiles.slice(startIndex, endIndex)

  // Use fixed pagination options: 10, 25, 50
  const paginationOptions = useMemo(() => [10, 25, 50], [])

  // Reset to page 1 when search or itemsPerPage changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, itemsPerPage])

  const handleSubmit = async (data: CreateBrokerProfileData | UpdateBrokerProfileData): Promise<void> => {
    if (editingProfile) {
      await updateProfileMutation.mutateAsync({ id: editingProfile.id, data: data as UpdateBrokerProfileData })
    } else {
      await createProfileMutation.mutateAsync(data as CreateBrokerProfileData)
    }
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading profiles. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="bg-white font-sans">
      {/* Header */}
      <PageHeaderShell sticky>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center">
                  <IdentificationIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Broker Profiles</h1>
                  <p className="text-xs font-medium text-slate-500">Manage broker permission profiles</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                <button
                  onClick={handleRefresh}
                  className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shadow-sm text-sm group hover:bg-slate-50"
                  title="Refresh profiles list"
                >
                  <ArrowPathIcon className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                  <span>Refresh</span>
                </button>
                <PermissionGate module={MODULES.BROKER_PROFILES} action="create">
                  <button
                    onClick={handleCreateProfile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shadow-sm font-semibold text-sm group"
                  >
                    <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    <span>Create Profile</span>
                  </button>
                </PermissionGate>
              </div>
            </div>
      </PageHeaderShell>

      {/* Main Content */}
      <main className="px-2 pt-3 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
            {/* Top controls */}
            <div className="p-3 border-b border-slate-300">
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search profiles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-sm bg-white text-slate-900 placeholder-slate-400"
                  />
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-600">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white text-xs text-slate-900"
                    >
                      {paginationOptions.map(option => (
                        <option key={option} value={option}>
                          {option === totalItems ? `All (${option})` : option}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-600">entries</span>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 border border-slate-300 rounded-md hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-xs text-slate-700">Page {currentPage} of {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 border border-slate-300 rounded-md hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              {isLoading ? (
                <Loader label="Loading broker profiles..." />
              ) : (
                <div className="overflow-auto no-scrollbar max-h-[calc(100vh-220px)]">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-white border-b border-slate-300">
                      <tr>
                        <th 
                          onClick={() => handleSort('name')}
                          className="pl-8 pr-3 py-2 text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                          title="Click to sort"
                        >
                          <div className="flex items-center space-x-1">
                            <span>Profile Name</span>
                            {sortField === 'name' && (
                              <span className="text-slate-600">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th 
                          onClick={() => handleSort('rightsCount')}
                          className="px-3 py-2 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                          title="Click to sort"
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Rights</span>
                            {sortField === 'rightsCount' && (
                              <span className="text-slate-600">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('createdAt')}
                          className="px-3 py-2 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                          title="Click to sort"
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>Created At</span>
                            {sortField === 'createdAt' && (
                              <span className="text-slate-600">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        {showActions && (
                          <th className="px-3 py-2 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedProfiles?.length === 0 ? (
                        <tr>
                          <td colSpan={showActions ? 5 : 4} className="px-4 py-12 text-center text-slate-500">
                            {searchTerm ? 'No profiles found matching your search.' : 'No profiles found. Create your first profile to get started.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedProfiles?.map((profile: BrokerProfile) => (
                          <motion.tr
                            key={profile.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-white transition-colors duration-150"
                          >
                            <td className="pl-8 pr-3 py-2 text-left">
                              <div className="text-sm font-medium text-slate-900">{profile.name}</div>
                            </td>
                            <td className="px-3 py-2 text-left">
                              <div className="text-xs text-slate-700">{profile.description || 'No description'}</div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium">
                                {profile.rightsCount}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="text-xs text-slate-700">
                                {new Date(profile.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            {showActions && (
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {canEdit(MODULES.BROKER_PROFILES) && (
                                    <button
                                      onClick={() => handleEditProfile(profile)}
                                      className="group/btn relative p-1.5 text-blue-600 hover:text-white rounded-lg bg-blue-50 hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/50 hover:scale-110"
                                      title="Edit Profile"
                                    >
                                      <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  )}
                                  {canDelete(MODULES.BROKER_PROFILES) && (
                                    <button
                                      onClick={() => handleDeleteProfile(profile.id)}
                                      className="group/btn relative p-1.5 text-red-500 hover:text-white rounded-lg bg-blue-50 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:shadow-md hover:shadow-red-500/50 hover:scale-110"
                                      title="Delete Profile"
                                    >
                                      <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </motion.div>
      </main>

      {/* Profile Modal */}
      {isModalOpen && (
        <BrokerProfileModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingProfile(null)
          }}
          onSubmit={handleSubmit}
          profile={editingProfile}
          isLoading={createProfileMutation.isLoading || updateProfileMutation.isLoading}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title="Delete Profile"
        message={`Are you sure you want to delete "${deleteConfirmation.profileName}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  )
}

export default BrokerProfiles

