import React, { useState } from 'react'
import SavingOverlay from './ui/SavingOverlay'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useMutation, useQueryClient } from 'react-query'
import { permissionService } from '../services/permissionService'
import { Permission, Role } from '../types'
import toast from 'react-hot-toast'

interface PermissionRoleModalProps {
  permission: Permission
  roles: Role[]
  isOpen: boolean
  onClose: () => void
}

const PermissionRoleModal: React.FC<PermissionRoleModalProps> = ({
  permission,
  roles,
  isOpen,
  onClose
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('')
  const queryClient = useQueryClient()

  // Get roles that have this permission by checking which roles include this permission
  const rolesWithPermission = roles.filter(role => 
    role.permissions?.some(p => (p.permission_id || p.id) === permission.id)
  )

  // Get available roles (not already having this permission)
  const availableRoles = roles.filter(role => 
    !role.permissions?.some(p => (p.permission_id || p.id) === permission.id)
  )

  // Add permission to role mutation
  const addPermissionMutation = useMutation(
    ({ roleId, permissionId }: { roleId: number; permissionId: number }) =>
      permissionService.addPermissionToRole(roleId, permissionId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['roles'])
        queryClient.invalidateQueries(['permissions'])
        setSelectedRoleId('')
        toast.success('Permission added to role successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to add permission to role')
      }
    }
  )

  // Remove permission from role mutation
  const removePermissionMutation = useMutation(
    ({ roleId, permissionId }: { roleId: number; permissionId: number }) =>
      permissionService.removePermissionFromRole(roleId, permissionId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['roles'])
        queryClient.invalidateQueries(['permissions'])
        toast.success('Permission removed from role successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to remove permission from role')
      }
    }
  )

  const handleAddPermission = () => {
    if (selectedRoleId && permission.id) {
      addPermissionMutation.mutate({ roleId: Number(selectedRoleId), permissionId: permission.id })
    }
  }

  const handleRemovePermission = (roleId: number) => {
    if (permission.id && window.confirm('Are you sure you want to remove this permission from the role?')) {
      removePermissionMutation.mutate({ roleId, permissionId: permission.id })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <SavingOverlay show={!!(addPermissionMutation.isLoading || removePermissionMutation.isLoading)} />
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-white0 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-slate-900">
                  Manage Roles for Permission
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-medium">{permission.name}</span> - {permission.description}
                </p>
                <p className="text-xs text-slate-400">
                  Category: {permission.category.replace('_', ' ')} | ID: {permission.id}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Add Permission to Role */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-900 mb-3">Add to Role</h4>
              <div className="flex space-x-3">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="flex-1 border-slate-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  disabled={availableRoles.length === 0}
                >
                  <option value="">
                    {availableRoles.length === 0 ? 'All roles already have this permission' : 'Select a role...'}
                  </option>
                  {availableRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddPermission}
                  disabled={!selectedRoleId || addPermissionMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {addPermissionMutation.isLoading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {/* Current Roles */}
            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-3">
                Roles with this Permission ({rolesWithPermission.length})
              </h4>
              
              {rolesWithPermission.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {rolesWithPermission.map(role => (
                    <div key={role.id} className="flex items-center justify-between p-4 border border-slate-300 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                              <span className="text-xs font-medium text-white">
                                {role.name?.charAt(0)?.toUpperCase() || 'R'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-slate-900">{role.name}</p>
                            <p className="text-sm text-slate-500">{role.description}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePermission(role.id)}
                        disabled={removePermissionMutation.isLoading}
                        className="ml-4 inline-flex items-center p-2 border border-transparent rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Remove permission from role"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No roles currently have this permission</p>
                </div>
              )}
            </div>
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

export default PermissionRoleModal

