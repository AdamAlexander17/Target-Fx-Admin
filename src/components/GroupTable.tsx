import React, { useState, useMemo } from 'react'
import Loader from './ui/Loader'
import { motion } from 'framer-motion'
import { 
  PowerIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ServerIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { Group } from '../types'

import { PermissionGate } from './PermissionGate'
import { MODULES } from '../utils/permissions'
import { usePermissions } from '../contexts/PermissionContext'

interface GroupTableProps {
  groups: Group[]
  isLoading: boolean
  onEdit: (group: Group) => void
  onDelete: (id: number) => void
  onToggleStatus: (id: number) => void
  pagination?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  currentPage: number
  onPageChange: (page: number) => void
  viewMode: 'table' | 'grid'
  topContent?: React.ReactNode
}

const GroupTable: React.FC<GroupTableProps> = ({
  groups,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  pagination,
  currentPage,
  onPageChange,
  viewMode,
  topContent
}) => {
  const { canEdit, canDelete } = usePermissions()
  const showActions = canEdit(MODULES.GROUPS) || canDelete(MODULES.GROUPS)
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

  const sortedGroups = useMemo(() => {
    if (!sortField) return groups

    return [...groups].sort((a, b) => {
      let aValue: any = a[sortField as keyof Group]
      let bValue: any = b[sortField as keyof Group]

      // Handle boolean for is_active
      if (sortField === 'is_active') {
        aValue = aValue ? 1 : 0
        bValue = bValue ? 1 : 0
      }

      if (aValue < bValue) return sortOrder === 'ASC' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'ASC' ? 1 : -1
      return 0
    })
  }, [groups, sortField, sortOrder])
  if (isLoading) {
    return (
      <div className={`backdrop-blur-xl rounded-xl border shadow-lg transition-colors ${
        false 
          ? 'bg-blue-800/80 border-blue-700/60' 
          : 'bg-white/80 border-white/60'
      }`}>
        {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
        <Loader label="Loading groups..." />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className={`backdrop-blur-xl rounded-xl border shadow-lg transition-colors ${
        false 
          ? 'bg-blue-800/80 border-blue-700/60' 
          : 'bg-white/80 border-white/60'
      }`}>
        {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
        <div className="p-8 text-center">
        <ServerIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <h3 className="text-base font-medium mb-1 text-slate-900">No groups found</h3>
        <p className="text-sm text-slate-500">Create your first trading group to get started.</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getGroupTypeColor = (mt5Group: string) => {
    if (mt5Group.toLowerCase().includes('demo')) {
      return 'bg-blue-100 text-slate-800'
    } else if (mt5Group.toLowerCase().includes('real')) {
      return 'bg-green-100 text-green-800'
    } else if (mt5Group.toLowerCase().includes('vip') || mt5Group.toLowerCase().includes('premium')) {
      return 'bg-purple-100 text-purple-800'
    }
    return 'bg-blue-100 text-slate-800'
  }

  if (viewMode === 'grid') {
    return (
      <div className="space-y-4">
        {/* Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-lg shadow-sm border border-slate-300 hover:shadow-md transition-all duration-200"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm truncate">
                      {group.broker_view_group}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    group.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {group.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* MT5 Group */}
                <div className="mb-3">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getGroupTypeColor(group.mt5_group)}">
                    {group.mt5_group}
                  </span>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {group.description}
                  </p>
                </div>

                {/* Created Date */}
                <div className="flex items-center space-x-2 mb-4 text-sm text-slate-500">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Created {formatDate(group.created_at)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-300">
                  <div className="flex items-center space-x-1">
                    <PermissionGate module={MODULES.GROUPS} action="edit">
                      <button
                        onClick={() => onEdit(group)}
                        className="group relative p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
                        title="Edit"
                      >
                        <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </PermissionGate>
                    <PermissionGate module={MODULES.GROUPS} action="edit">
                      <button
                        onClick={() => onToggleStatus(group.id)}
                        className={`group relative p-2.5 text-slate-400 hover:text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                          group.is_active 
                            ? 'hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600' 
                            : 'hover:bg-gradient-to-r hover:from-green-500 hover:to-green-600'
                        }`}
                        title={group.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <PowerIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                      </button>
                    </PermissionGate>
                    <PermissionGate module={MODULES.GROUPS} action="delete">
                      <button
                        onClick={() => onDelete(group.id)}
                        className="group relative p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:shadow-lg hover:scale-105"
                        title="Delete"
                      >
                        <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination for Grid */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-300">
            <div className="text-sm text-slate-700">
              Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      currentPage === pageNum
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= pagination.total_pages}
                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Table View
  return (
    <div className={`backdrop-blur-xl rounded-xl border shadow-lg overflow-hidden transition-colors ${
      false 
        ? 'bg-blue-800/80 border-blue-700/60' 
        : 'bg-white/80 border-white/60'
    }`}>
      {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
      {/* Mobile view */}
      <div className="block lg:hidden">
        <div className="divide-y divide-slate-200">
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2">
                    <h3 className="font-medium text-slate-900 text-sm">{group.broker_view_group}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGroupTypeColor(group.mt5_group)}">
                        {group.mt5_group}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        group.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {group.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600">{group.description}</p>
                    <p className="text-xs text-slate-500">Created {formatDate(group.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 ml-4">
                  <PermissionGate module={MODULES.GROUPS} action="edit">
                    <button
                      onClick={() => onEdit(group)}
                      className="group relative p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
                    >
                      <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </PermissionGate>
                  <PermissionGate module={MODULES.GROUPS} action="edit">
                    <button
                      onClick={() => onToggleStatus(group.id)}
                      className={`group relative p-2.5 text-slate-400 hover:text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                        group.is_active 
                          ? 'hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600' 
                          : 'hover:bg-gradient-to-r hover:from-green-500 hover:to-green-600'
                      }`}
                    >
                      <PowerIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    </button>
                  </PermissionGate>
                  <PermissionGate module={MODULES.GROUPS} action="delete">
                    <button
                      onClick={() => onDelete(group.id)}
                      className="group relative p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:shadow-lg hover:scale-105"
                    >
                      <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-auto no-scrollbar max-h-[calc(100vh-220px)]">
        <table className="w-full">
          <thead className={`sticky top-0 z-10 bg-white border-b transition-colors ${
            false 
              ? 'bg-blue-700/50 border-blue-600' 
              : 'bg-white border-slate-300'
          }`}>
            <tr>
              <th 
                onClick={() => handleSort('broker_view_group')}
                className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                  false 
                    ? 'text-slate-300 hover:bg-blue-600/50' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Click to sort"
              >
                <div className="flex items-center space-x-1">
                  <span>Group</span>
                  {sortField === 'broker_view_group' && (
                    <span className="text-slate-600">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('mt5_group')}
                className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center space-x-1">
                  <span>MT5 Group</span>
                  {sortField === 'mt5_group' && (
                    <span className="text-slate-600">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Description</th>
              <th 
                onClick={() => handleSort('is_active')}
                className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortField === 'is_active' && (
                    <span className="text-slate-600">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('created_at')}
                className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center space-x-1">
                  <span>Created</span>
                  {sortField === 'created_at' && (
                    <span className="text-slate-600">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              {showActions && (
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedGroups.map((group, index) => (
              <motion.tr
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-white transition-colors duration-150"
              >
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-900 text-xs">{group.broker_view_group}</p>
                </td>
                
                <td className="px-3 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getGroupTypeColor(group.mt5_group)}">
                    {group.mt5_group}
                  </span>
                </td>
                
                <td className="px-3 py-2">
                  <p className="text-xs text-slate-700 max-w-xs truncate" title={group.description}>
                    {group.description}
                  </p>
                </td>
                
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    group.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {group.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                
                <td className="px-3 py-2 text-[10px] text-slate-500">
                  {formatDate(group.created_at)}
                </td>
                
                {showActions && (
                  <td className="px-3 py-2">
                    <div className="flex items-center space-x-0.5">
                      <PermissionGate module={MODULES.GROUPS} action="edit">
                        <button
                          onClick={() => onEdit(group)}
                          className="group relative p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:scale-105"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </PermissionGate>
                      <PermissionGate module={MODULES.GROUPS} action="edit">
                        <button
                          onClick={() => onToggleStatus(group.id)}
                          className={`group relative p-1.5 text-slate-400 hover:text-white rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105 ${
                            group.is_active 
                              ? 'hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600' 
                              : 'hover:bg-gradient-to-r hover:from-green-500 hover:to-green-600'
                          }`}
                          title={group.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <PowerIcon className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                        </button>
                      </PermissionGate>
                      <PermissionGate module={MODULES.GROUPS} action="delete">
                        <button
                          onClick={() => onDelete(group.id)}
                          className="group relative p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:shadow-md hover:scale-105"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

export default GroupTable

