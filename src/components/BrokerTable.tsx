import React, { useState, useEffect } from 'react'
import { 
  PencilIcon, 
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline'
import { Broker } from '../types'

import { PermissionGate } from './PermissionGate'
import { MODULES } from '../utils/permissions'
import { usePermissions } from '../contexts/PermissionContext'

interface BrokerTableProps {
  brokers: Broker[]
  isLoading: boolean
  onEdit: (broker: Broker) => void
  onDelete: (id: number) => void
  onToggleStatus: (id: number) => void
  onViewBills?: (broker: Broker) => void
  onUnlock?: (broker: Broker) => void
  onSort: (field: string) => void
  currentSort: { field: string; order: 'ASC' | 'DESC' }
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
  currentPage: number
  onPageChange: (page: number) => void
  topContent?: React.ReactNode
}

const BrokerTable: React.FC<BrokerTableProps> = ({
  brokers,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewBills,
  onUnlock,
  onSort,
  currentSort,
  pagination,
  currentPage,
  onPageChange,
  topContent
}) => {
  const { canEdit, canDelete } = usePermissions()
  const showActions = canEdit(MODULES.BROKERS) || canDelete(MODULES.BROKERS) || !!onViewBills

    // No need to fetch rights separately; use rights_count from brokers API response
    // Remove brokerRights and loadingRights state and effect

  const getRightsDisplay = (brokerId: number) => {
    const broker = brokers.find(b => b.id === brokerId)
    return broker?.rights_count ?? 0
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-blue-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
      {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
      {/* Mobile view */}
      <div className="block sm:hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {brokers.map((broker) => (
              <div key={broker.id} className="border border-slate-300 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-slate-900">{broker.username || 'No Username'}</h3>
                    <p className="text-sm text-slate-500">{broker.full_name || '-'}</p>
                    <p className="text-sm text-slate-500">Default %: {broker.default_percentage ?? 0}</p>
                    <p className="text-sm text-slate-500">Range: {broker.account_range_from} - {broker.account_range_to}</p>
                    <div className="mt-2 flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-slate-600">Status:</span>
                        <PermissionGate module={MODULES.BROKERS} action="edit">
                          <label className="relative inline-flex items-center cursor-pointer group/toggle">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={broker.is_active}
                              onChange={() => onToggleStatus(broker.id)}
                            />
                            <div className="w-9 h-5 bg-blue-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-blue-700"></div>
                          </label>
                        </PermissionGate>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        @{broker.username}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {onViewBills && (
                      <button
                        onClick={() => onViewBills(broker)}
                        className="p-1 text-blue-500 hover:text-blue-700"
                        title="View bills"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </button>
                    )}
                    {onUnlock && (
                      <button
                        onClick={() => onUnlock(broker)}
                        className="p-1 text-blue-500 hover:text-blue-700"
                        title="Clear Login"
                      >
                        <ArrowPathRoundedSquareIcon className="h-5 w-5" />
                      </button>
                    )}
                    <PermissionGate module={MODULES.BROKERS} action="edit">
                      <button
                        onClick={() => onEdit(broker)}
                        className="p-1 text-slate-400 hover:text-slate-500"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    </PermissionGate>
                    <PermissionGate module={MODULES.BROKERS} action="delete">
                      <button
                        onClick={() => onDelete(broker.id)}
                        className="p-1 text-red-400 hover:text-red-500"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b transition-colors ${
              false 
                ? 'bg-blue-700/50 border-blue-600' 
                : 'bg-white border-slate-300'
            }`}>
              <tr>
                <th 
                  onClick={() => onSort('username')}
                  className={`px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                    false 
                      ? 'text-slate-300 hover:bg-blue-600/50' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Click to sort"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Username</span>
                    {currentSort.field === 'username' && (
                      <span className="text-slate-600">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => onSort('full_name')}
                  className={`px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                    false 
                      ? 'text-slate-300 hover:bg-blue-600/50' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Click to sort"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Full Name</span>
                    {currentSort.field === 'full_name' && (
                      <span className="text-slate-600">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => onSort('default_percentage')}
                  className={`px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                    false 
                      ? 'text-slate-300 hover:bg-blue-600/50' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Click to sort"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Default %</span>
                    {currentSort.field === 'default_percentage' && (
                      <span className="text-slate-600">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => onSort('is_active')}
                  className={`px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                    false 
                      ? 'text-slate-300 hover:bg-blue-600/50' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Click to sort"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    {currentSort.field === 'is_active' && (
                      <span className="text-slate-600">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => onSort('clients_count')}
                  className={`px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                    false 
                      ? 'text-slate-300 hover:bg-blue-600/50' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Click to sort"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Clients</span>
                    {currentSort.field === 'clients_count' && (
                      <span className="text-slate-600">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => onSort('rights_count')}
                  className={`px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                    false 
                      ? 'text-slate-300 hover:bg-blue-600/50' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Click to sort"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Rights</span>
                    {currentSort.field === 'rights_count' && (
                      <span className="text-slate-600">{currentSort.order === 'ASC' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                {showActions && (
                  <th className={`px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wide ${
                    'text-slate-600'
                  }`}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {brokers.map((broker) => (
                <tr key={broker.id} className={`transition-colors duration-150 ${
                  false ? 'hover:bg-blue-700/50' : 'hover:bg-white'
                }`}>
                  <td className="px-2 py-2 text-center">
                    <p className="text-sm font-medium text-slate-900">
                      {broker.username || 'No Username'}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <p className="text-xs text-slate-700">{broker.full_name || '-'}</p>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <p className="text-xs text-slate-700">{broker.default_percentage ?? 0}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PermissionGate module={MODULES.BROKERS} action="edit">
                      <label className="relative inline-flex items-center cursor-pointer group/toggle">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={broker.is_active}
                          onChange={() => onToggleStatus(broker.id)}
                        />
                        <div className="w-9 h-5 bg-blue-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-blue-700"></div>
                      </label>
                    </PermissionGate>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="text-xs font-semibold text-slate-600">
                      {broker.clients_count || 0}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-slate-300">
                      {getRightsDisplay(broker.id)}
                    </span>
                  </td>
                  {showActions && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onViewBills && (
                          <button
                            onClick={() => onViewBills(broker)}
                            className="group/btn relative p-1.5 text-blue-600 hover:text-white rounded-lg bg-blue-50 hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/50 hover:scale-110"
                            title="View bills"
                          >
                            <DocumentTextIcon className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
                          </button>
                        )}
                        {onUnlock && (
                          <button
                            onClick={() => onUnlock(broker)}
                            className="group/btn relative p-1.5 text-blue-600 hover:text-white rounded-lg bg-blue-50 hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/50 hover:scale-110"
                            title="Clear Login"
                          >
                            <ArrowPathRoundedSquareIcon className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
                          </button>
                        )}
                        <PermissionGate module={MODULES.BROKERS} action="edit">
                          <button 
                            onClick={() => onEdit(broker)}
                            className="group/btn relative p-1.5 text-blue-600 hover:text-white rounded-lg bg-blue-50 hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/50 hover:scale-110"
                            title="Edit broker"
                          >
                            <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </PermissionGate>
                        <PermissionGate module={MODULES.BROKERS} action="delete">
                          <button 
                            onClick={() => onDelete(broker.id)}
                            className="group/btn relative p-1.5 text-red-500 hover:text-white rounded-lg bg-blue-50 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:shadow-md hover:shadow-red-500/50 hover:scale-110"
                            title="Delete broker"
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

export default BrokerTable

