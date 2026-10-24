import React from 'react'
import Loader from './ui/Loader'
import { motion } from 'framer-motion'
import { AuditLog } from '../types'
import { format } from 'date-fns'


interface AuditLogTableProps {
  logs: AuditLog[]
  isLoading?: boolean
  onSort?: (field: string) => void
  currentSort?: { field: string; order: 'asc' | 'desc' }
  topContent?: React.ReactNode
}

const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs, isLoading, onSort, currentSort, topContent }) => {
  const getActionChipClass = (action: string): string => {
    if (action.includes('CREATE') || action.includes('LOGIN')) return 'bg-green-50 text-green-700 border-green-100'
    if (action.includes('UPDATE')) return 'bg-blue-50 text-blue-700 border-blue-100'
    if (action.includes('DELETE')) return 'bg-red-50 text-red-700 border-red-100'
    if (action.includes('LOGOUT')) return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss')
    } catch {
      return dateString
    }
  }

  const formatValues = (values?: Record<string, any>) => {
    if (!values) return 'N/A'
    return Object.entries(values)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ')
  }

  if (isLoading) {
    return (
      <div className={`backdrop-blur-xl rounded-xl border shadow-lg p-8 transition-colors ${
        false 
          ? 'bg-blue-800/80 border-blue-700/60' 
          : 'bg-white/80 border-white/60'
      }`}>
        {topContent && <div className="p-3 mb-3 border-b border-slate-300">{topContent}</div>}
        <Loader label="Loading audit logs..." />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className={`backdrop-blur-xl rounded-xl border shadow-lg p-12 text-center transition-colors ${
        false 
          ? 'bg-blue-800/80 border-blue-700/60' 
          : 'bg-white/80 border-white/60'
      }`}>
        {topContent && <div className="p-3 mb-3 border-b border-slate-300 text-left">{topContent}</div>}
        <p className={'text-slate-500'}>No audit logs found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
      {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[60px]" />
            <col className="w-[170px]" />
            <col className="w-[190px]" />
            <col className="w-[130px]" />
            <col className="w-[90px]" />
            <col className="w-[130px]" />
            <col className="w-[170px]" />
            <col />
          </colgroup>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th
                onClick={() => onSort?.('id')}
                className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>ID</span>
                  {currentSort?.field === 'id' && (
                    <span className="text-slate-600">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => onSort?.('username')}
                className="px-3 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center space-x-1">
                  <span>User</span>
                  {currentSort?.field === 'username' && (
                    <span className="text-slate-600">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => onSort?.('action')}
                className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Action</span>
                  {currentSort?.field === 'action' && (
                    <span className="text-slate-600">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => onSort?.('table_name')}
                className="px-3 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center space-x-1">
                  <span>Table</span>
                  {currentSort?.field === 'table_name' && (
                    <span className="text-slate-600">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => onSort?.('record_id')}
                className="px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center justify-center space-x-1 whitespace-nowrap">
                  <span>Record ID</span>
                  {currentSort?.field === 'record_id' && (
                    <span className="text-slate-600">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => onSort?.('ip_address')}
                className="px-3 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center space-x-1">
                  <span>IP Address</span>
                  {currentSort?.field === 'ip_address' && (
                    <span className="text-slate-600">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => onSort?.('created_at')}
                className="px-3 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                title="Click to sort"
              >
                <div className="flex items-center space-x-1">
                  <span>Timestamp</span>
                  {currentSort?.field === 'created_at' && (
                    <span className="text-slate-600">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                Changes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log, index) => (
              <motion.tr
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-slate-50 transition-colors duration-150"
              >
                <td className="px-3 py-3 align-middle text-center">
                  <p className="text-xs font-semibold text-slate-900 tabular-nums">{log.id}</p>
                </td>
                <td className="px-3 py-3 align-middle">
                  <p className="text-xs font-semibold text-slate-900 truncate" title={log.username}>{log.username}</p>
                  {log.user_email && (
                    <p className="text-[11px] text-slate-500 truncate" title={log.user_email}>{log.user_email}</p>
                  )}
                </td>
                <td className="px-3 py-3 align-middle text-center">
                  <span className={`inline-flex items-center justify-center w-44 px-2 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${getActionChipClass(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle">
                  <p className="text-xs text-slate-700 truncate" title={log.table_name}>{log.table_name}</p>
                </td>
                <td className="px-3 py-3 align-middle text-center">
                  <p className="text-xs text-slate-700 tabular-nums">{log.record_id}</p>
                </td>
                <td className="px-3 py-3 align-middle">
                  <p className="text-xs text-slate-700 tabular-nums truncate" title={log.ip_address}>{log.ip_address}</p>
                </td>
                <td className="px-3 py-3 align-middle">
                  <p className="text-xs text-slate-700 whitespace-nowrap">{formatDate(log.created_at)}</p>
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="space-y-0.5">
                    {log.new_values && (
                      <div className="text-xs leading-snug">
                        <span className="font-semibold text-emerald-600">New: </span>
                        <span className="text-slate-600 line-clamp-2 break-words" title={formatValues(log.new_values)}>{formatValues(log.new_values)}</span>
                      </div>
                    )}
                    {log.old_values && (
                      <div className="text-xs leading-snug">
                        <span className="font-semibold text-red-600">Old: </span>
                        <span className="text-slate-600 line-clamp-2 break-words" title={formatValues(log.old_values)}>{formatValues(log.old_values)}</span>
                      </div>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AuditLogTable

