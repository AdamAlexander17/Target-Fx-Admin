import React, { useState, useMemo } from 'react'
import Loader from './ui/Loader'
import { UserGroupIcon, ShieldCheckIcon, ChartBarIcon, UserCircleIcon, EyeIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { Role } from '../types'
import { PermissionGate } from './PermissionGate'
import { MODULES } from '../utils/permissions'
import { usePermissions } from '../contexts/PermissionContext'

interface RoleTableProps {
  roles: Role[]
  isLoading: boolean
  onEdit: (role: Role) => void
  onDelete: (id: number) => void
  topContent?: React.ReactNode
}

const RoleTable: React.FC<RoleTableProps> = ({
  roles,
  isLoading,
  onEdit,
  onDelete,
  topContent
}) => {
  const { canEdit, canDelete } = usePermissions()
  const showActions = canEdit(MODULES.ROLES) || canDelete(MODULES.ROLES)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(field)
      setSortOrder('ASC')
    }
  }

  const sortedRoles = useMemo(() => {
    if (!sortField) return roles

    return [...roles].sort((a, b) => {
      let aValue: any = a[sortField as keyof Role]
      let bValue: any = b[sortField as keyof Role]

      // Special handling for permissions count
      if (sortField === 'permissions') {
        aValue = a.permissions?.length || 0
        bValue = b.permissions?.length || 0
      }

      if (aValue < bValue) return sortOrder === 'ASC' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'ASC' ? 1 : -1
      return 0
    })
  }, [roles, sortField, sortOrder])
  const getRoleIcon = (roleName: string) => {
    const name = roleName.toLowerCase()
    let Icon = UserCircleIcon
    if (name.includes('admin')) Icon = ShieldCheckIcon
    else if (name.includes('analyst')) Icon = ChartBarIcon
    else if (name.includes('broker')) Icon = UserGroupIcon
    else if (name.includes('viewer')) Icon = EyeIcon
    else if (name.includes('moderator')) Icon = WrenchScrewdriverIcon
    return (
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center border border-slate-200">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`rounded-xl shadow-sm overflow-hidden ${
        'bg-white'
      }`}>
        {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
        <Loader label="Loading roles..." />
      </div>
    )
  }

  if (roles.length === 0) {
    return (
      <div className={`rounded-xl shadow-sm overflow-hidden ${
        'bg-white'
      }`}>
        {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
        <div className="p-16 text-center">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
            'bg-blue-50'
          }`}>
            <UserGroupIcon className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-slate-900">No roles found</h3>
          <p className="font-medium text-slate-600">Get started by creating your first role.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
      {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`border-b ${
            false 
              ? 'bg-blue-700/50 border-blue-600' 
              : 'bg-white border-slate-300'
          }`}>
            <tr>
              <th 
                onClick={() => handleSort('name')}
                className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                  false 
                    ? 'text-slate-300 hover:bg-blue-600/50' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                title="Click to sort"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Role</span>
                  {sortField === 'name' && (
                    <span className="text-slate-700">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('description')}
                className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                  false 
                    ? 'text-slate-300 hover:bg-blue-600/50' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                title="Click to sort"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Description</span>
                  {sortField === 'description' && (
                    <span className="text-slate-700">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('permissions')}
                className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                  false 
                    ? 'text-slate-300 hover:bg-blue-600/50' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                title="Click to sort"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Permissions</span>
                  {sortField === 'permissions' && (
                    <span className="text-slate-700">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                'text-slate-700'
              }`}>Status</th>
              {showActions && (
                <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                  'text-slate-700'
                }`}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedRoles.map((role) => (
              <tr key={role.id} className={`transition-colors duration-150 ${
                false ? 'hover:bg-blue-700/50' : 'hover:bg-white'
              }`}>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center space-x-3">
                    {getRoleIcon(role.name)}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{role.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <p className="text-sm text-slate-700">{role.description || 'No description provided'}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {role.permissions?.length || 0} permissions
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-slate-200">
                    Active
                  </span>
                </td>
                {showActions && (
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <PermissionGate module={MODULES.ROLES} action="edit">
                        <button 
                          onClick={() => onEdit(role)}
                          className="group/btn relative p-1.5 text-blue-600 hover:text-white rounded-lg bg-blue-50 hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/50 hover:scale-110"
                          title="Edit role"
                        >
                          <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </PermissionGate>
                      <PermissionGate module={MODULES.ROLES} action="delete">
                        <button 
                          onClick={() => onDelete(role.id)}
                          className="group/btn relative p-1.5 text-red-500 hover:text-white rounded-lg bg-blue-50 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:shadow-md hover:shadow-red-500/50 hover:scale-110"
                          title="Delete role"
                        >
                          <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RoleTable

