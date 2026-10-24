import React from 'react'
import Loader from './ui/Loader'
import { 
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { User, PaginationInfo } from '../services/userService'
import { PermissionGate } from './PermissionGate'
import { MODULES } from '../utils/permissions'
import { usePermissions } from '../contexts/PermissionContext'

interface UserTableProps {
  users: User[]
  isLoading: boolean
  topContent?: React.ReactNode
  onEdit: (user: User) => void
  onDelete: (id: number) => void
  onToggleStatus: (id: number) => void
  onSort?: (field: string) => void
  currentSort?: { field: string; order: 'ASC' | 'DESC' }
  pagination?: PaginationInfo
  currentPage: number
  onPageChange: (page: number) => void
  false?: boolean
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  topContent,
  onEdit,
  onDelete,
  onToggleStatus,
  onSort,
  currentSort,
  pagination,
  currentPage,
  onPageChange
}) => {
  const { canEdit, canDelete } = usePermissions()
  const showActions = canEdit(MODULES.USERS) || canDelete(MODULES.USERS)

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        {topContent && (
          <div className="p-3 border-b border-slate-300">
            {topContent}
          </div>
        )}
        <Loader label="Loading users..." />
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        {topContent && (
          <div className="p-3 border-b border-slate-300">
            {topContent}
          </div>
        )}
        <div className="p-16 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
            false 
              ? 'bg-blue-7900/30 to-purple-900/30 border-slate-300' 
              : 'bg-blue-750 to-purple-50 border-slate-300'
          }`}>
            <UserGroupIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-bold mb-2 text-slate-900">No users found</h3>
          <p className="text-sm font-medium text-slate-500">Get started by creating your first user or adjust your filters.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Compact Table with Glass Effect */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        {topContent && (
          <div className="p-3 border-b border-slate-300 bg-white/60">
            {topContent}
          </div>
        )}
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${
              false 
                ? 'bg-gradient-to-r from-blue-900/50 to-blue-900/20 border-blue-700' 
                : 'bg-transparent border-slate-300'
            }`}>
              <th 
                onClick={() => onSort?.('username')}
                className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                  'text-slate-700'
                } ${onSort ? 'cursor-pointer hover:bg-opacity-50 transition-colors' : ''}`}
                title={onSort ? 'Click to sort' : ''}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>User</span>
                  {currentSort?.field === 'username' && (
                    <span className="text-xs text-slate-700">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => onSort?.('email')}
                className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                  'text-slate-700'
                } ${onSort ? 'cursor-pointer hover:bg-opacity-50 transition-colors' : ''}`}
                title={onSort ? 'Click to sort' : ''}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Email</span>
                  {currentSort?.field === 'email' && (
                    <span className="text-xs text-slate-700">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                'text-slate-700'
              }`}>Roles</th>
              <th 
                onClick={() => onSort?.('is_active')}
                className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                  'text-slate-700'
                } ${onSort ? 'cursor-pointer hover:bg-opacity-50 transition-colors' : ''}`}
                title={onSort ? 'Click to sort' : ''}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  {currentSort?.field === 'is_active' && (
                    <span className="text-xs text-slate-700">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => onSort?.('created_at')}
                className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                  'text-slate-700'
                } ${onSort ? 'cursor-pointer hover:bg-opacity-50 transition-colors' : ''}`}
                title={onSort ? 'Click to sort' : ''}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Created</span>
                  {currentSort?.field === 'created_at' && (
                    <span className="text-xs text-slate-700">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              {showActions && (
                <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                  'text-slate-700'
                }`}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y ${
            false 
              ? 'bg-blue-800/50 divide-blue-700/50' 
              : 'bg-white divide-slate-200'
          }`}>
            {users.map((user) => (
              <tr key={user.id} className="group">
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center">
                    <div className="text-sm font-medium text-slate-900">{user.username}</div>
                    <div className="text-xs text-slate-500">@{user.username.toLowerCase().replace(/\s+/g, '')}</div>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <div className="text-xs font-medium text-slate-700">{user.email}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <div className="flex gap-1 flex-wrap max-w-xs justify-center">
                    {user.roles.slice(0, 2).map((role) => (
                      <span
                        key={role.id}
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          role.name.toLowerCase() === 'admin' 
                            ? 'bg-blue-700 text-white'
                            : role.name.toLowerCase() === 'editor'
                            ? 'bg-amber-100 text-amber-800'
                            : role.name.toLowerCase() === 'viewer'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {role.name}
                      </span>
                    ))}
                    {user.roles.length > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 shadow-sm">
                        +{user.roles.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <PermissionGate 
                    module={MODULES.USERS} 
                    action="edit"
                    fallback={
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    }
                  >
                    <label className="relative inline-flex items-center cursor-pointer group/toggle">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={user.is_active}
                        onChange={() => onToggleStatus(user.id)}
                      />
                      <div className="w-9 h-5 bg-blue-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-blue-700"></div>
                    </label>
                  </PermissionGate>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate-600 font-medium">{formatDate(user.created_at)}</span>
                  </div>
                </td>
                {showActions && (
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <PermissionGate module={MODULES.USERS} action="edit">
                        <button 
                          onClick={() => onEdit(user)}
                          className="group/btn relative p-1.5 text-blue-600 hover:text-white rounded-lg bg-blue-50 hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/50 hover:scale-110"
                          title="Edit user"
                        >
                          <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </PermissionGate>
                      <PermissionGate module={MODULES.USERS} action="delete">
                        <button 
                          onClick={() => onDelete(user.id)}
                          className="group/btn relative p-1.5 text-red-500 hover:text-white rounded-lg bg-blue-50 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:shadow-md hover:shadow-red-500/50 hover:scale-110"
                          title="Delete user"
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

    </>
  )
}

export default UserTable

