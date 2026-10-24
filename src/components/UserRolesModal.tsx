import React, { useState } from 'react'
import SavingOverlay from './ui/SavingOverlay'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { userRoleService } from '../services/userRoleService'
import { roleService } from '../services/roleService'
import { User } from '../types'
import toast from 'react-hot-toast'

interface UserRolesModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
}

const UserRolesModal: React.FC<UserRolesModalProps> = ({
  user,
  isOpen,
  onClose
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('')
  const queryClient = useQueryClient()

  // Fetch user's current roles
  const { data: userRoles = [], isLoading: userRolesLoading } = useQuery(
    ['user-roles', user?.id],
    () => userRoleService.getUserRoles(user!.id),
    {
      enabled: !!user?.id && isOpen
    }
  )

  // Fetch all available roles
  const { data: allRoles = [], isLoading: allRolesLoading } = useQuery(
    'all-roles',
    () => roleService.getPermissions().then(() => roleService.getRoles(true)),
    {
      enabled: isOpen
    }
  )

  // Assign role mutation
  const assignRoleMutation = useMutation(
    (roleId: number) => userRoleService.assignRole(user!.id, roleId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user-roles', user!.id])
        queryClient.invalidateQueries(['users']) // Refresh users list
        setSelectedRoleId('')
        toast.success('Role assigned successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to assign role')
      }
    }
  )

  // Revoke role mutation
  const revokeRoleMutation = useMutation(
    (roleId: number) => userRoleService.revokeRole(user!.id, roleId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user-roles', user!.id])
        queryClient.invalidateQueries(['users']) // Refresh users list
        toast.success('Role revoked successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to revoke role')
      }
    }
  )

  const handleAssignRole = () => {
    if (!selectedRoleId) {
      toast.error('Please select a role to assign')
      return
    }
    assignRoleMutation.mutate(selectedRoleId as number)
  }

  const handleRevokeRole = (roleId: number, roleName: string) => {
    if (window.confirm(`Are you sure you want to revoke the "${roleName}" role from ${user?.username}?`)) {
      revokeRoleMutation.mutate(roleId)
    }
  }

  // Get available roles (not already assigned)
  const availableRoles = allRoles.filter(role => 
    !userRoles.some(userRole => userRole.id === role.id)
  )

  if (!isOpen || !user) return null

  return (
    <>
    <SavingOverlay show={!!(assignRoleMutation.isLoading || revokeRoleMutation.isLoading)} />
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white0 bg-opacity-75 transition-opacity" 
            onClick={onClose}
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-300">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Manage Roles for {user.username}
                </h3>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-500 p-2 rounded-lg hover:bg-blue-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Current Roles */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  Current Roles ({userRoles.length})
                </h4>
                
                {userRolesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-blue-200 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : userRoles.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userRoles.map((role) => (
                      <div key={role.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-300">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-7500 to-indigo-600 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {role.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{role.name}</p>
                              <p className="text-xs text-slate-500">{role.description}</p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeRole(role.id, role.name)}
                          disabled={revokeRoleMutation.isLoading}
                          className="ml-3 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500">
                    <p className="text-sm">No roles assigned to this user</p>
                  </div>
                )}
              </div>

              {/* Assign New Role */}
              <div className="border-t border-slate-300 pt-6">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Assign New Role</h4>
                
                {allRolesLoading ? (
                  <div className="h-10 bg-blue-200 rounded-lg animate-pulse"></div>
                ) : availableRoles.length > 0 ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <select
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                      >
                        <option value="">Select a role to assign...</option>
                        {availableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name} - {role.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleAssignRole}
                      disabled={!selectedRoleId || assignRoleMutation.isLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-700 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {assignRoleMutation.isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Assigning...
                        </>
                      ) : (
                        <>
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Assign Role
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500">
                    <p className="text-sm">All available roles have been assigned to this user</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-300 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
    </>
  )
}

export default UserRolesModal

