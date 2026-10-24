import React from 'react'
import Loader from './ui/Loader'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import { Permission } from '../types'

interface PermissionTableProps {
  groupedPermissions: Record<string, Permission[]>
  isLoading: boolean
  onManageRoles: (permission: Permission) => void
}

const PermissionTable: React.FC<PermissionTableProps> = ({
  groupedPermissions,
  isLoading,
  onManageRoles
}) => {
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <Loader label="Loading permissions..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedPermissions).map(([category, permissions]) => (
        <div key={category} className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
          {/* Category Header */}
          <div className="bg-white px-6 py-3 border-b border-slate-300">
            <h3 className="text-lg font-medium text-slate-900 capitalize">
              {category.replace('_', ' ')} ({permissions.length})
            </h3>
          </div>

          {/* Mobile view */}
          <div className="block sm:hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                {permissions.map((permission) => (
                  <div key={permission.id} className="border border-slate-300 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-slate-900">{permission.name}</h4>
                        <p className="text-sm text-slate-500 mt-1">{permission.description}</p>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-slate-800">
                            ID: {permission.id}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => onManageRoles(permission)}
                          className="p-1 text-slate-500 hover:text-slate-600"
                          title="Manage roles"
                        >
                          <UserGroupIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Permission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {permissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-white">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-white0 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {permission.name?.charAt(0)?.toUpperCase() || 'P'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{permission.name}</div>
                          <div className="text-sm text-slate-500">
                            {category.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 max-w-xs">
                        {permission.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-slate-800">
                        {permission.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onManageRoles(permission)}
                        className="text-slate-700 hover:text-slate-900 p-1"
                        title="Manage roles for this permission"
                      >
                        <UserGroupIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {Object.keys(groupedPermissions).length === 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <p className="text-slate-500">No permissions found matching your criteria.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PermissionTable

