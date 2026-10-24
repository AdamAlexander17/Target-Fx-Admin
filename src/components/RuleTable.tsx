import React from 'react'
import Loader from './ui/Loader'
import { motion } from 'framer-motion'
import { PowerIcon } from '@heroicons/react/24/outline'
import { Rule } from '../types'
import { PermissionGate } from './PermissionGate'
import { MODULES } from '../utils/permissions'
import { usePermissions } from '../contexts/PermissionContext'

interface RuleTableProps {
  rules: Rule[]
  isLoading: boolean
  onEdit: (rule: Rule) => void
  onDelete: (id: number) => void
  onToggleStatus: (rule: Rule) => void
  topContent?: React.ReactNode
}

const RuleTable: React.FC<RuleTableProps> = ({
  rules,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  topContent,
}) => {
  const { canEdit, canDelete } = usePermissions()
  const showActions = canEdit(MODULES.RULES) || canDelete(MODULES.RULES)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
        <Loader label="Loading rules..." />
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
        <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-slate-900">No rules found</h3>
        <p className="mt-1 text-sm text-slate-500">Get started by creating a new rule.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
      {topContent && <div className="p-3 border-b border-slate-300">{topContent}</div>}
      {/* Mobile view */}
      <div className="lg:hidden space-y-3">
        {rules.map((rule, index) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl border border-slate-300 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm">{rule.rule_name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{rule.rule_code}</p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  rule.is_active
                    ? 'bg-blue-50 text-blue-700 border-slate-300'
                    : 'bg-white text-slate-400 border-slate-300'
                }`}
              >
                {rule.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3">{rule.description}</p>

            <div className="space-y-2 mb-3">
              <div className="flex items-center text-xs">
                <span className="text-slate-500 w-24">MT5 Field:</span>
                <span className="text-slate-900 font-medium">{rule.mt5_field}</span>
              </div>
              <div className="flex items-center text-xs">
                <span className="text-slate-500 w-24">Value:</span>
                <span className="text-slate-900 font-mono text-[11px]">{rule.mt5_value_template}</span>
              </div>
              {rule.requires_time_parameter && (
                <div className="flex items-center text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white text-slate-700 font-medium">
                    Requires Time
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs text-slate-500">
                Created {formatDate(rule.created_at)}
              </span>
              <div className="flex items-center gap-1">
                <PermissionGate module={MODULES.RULES} action="edit">
                  <button
                    onClick={() => onEdit(rule)}
                    className="group relative p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
                    title="Edit"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </PermissionGate>
                <PermissionGate module={MODULES.RULES} action="edit">
                  <button
                    onClick={() => onToggleStatus(rule)}
                    className={`group relative p-2.5 text-slate-400 hover:text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                      rule.is_active
                        ? 'hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600'
                        : 'hover:bg-gradient-to-r hover:from-green-500 hover:to-green-600'
                    }`}
                    title={rule.is_active ? 'Deactivate' : 'Activate'}
                  >
                    <PowerIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                  </button>
                </PermissionGate>
                <PermissionGate module={MODULES.RULES} action="delete">
                  <button
                    onClick={() => onDelete(rule.id)}
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
          </motion.div>
        ))}
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                Rule Name
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                MT5 Field
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                Value Template
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                Status
              </th>
              {showActions && (
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rules.map((rule, index) => (
              <motion.tr
                key={rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="hover:bg-white transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{rule.rule_name}</div>
                  {rule.requires_time_parameter && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white text-slate-700 mt-1">
                      Requires Time
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded">
                    {rule.rule_code}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-600 max-w-xs truncate" title={rule.description}>
                    {rule.description}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className="text-sm text-slate-900">{rule.mt5_field}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className="text-xs font-mono text-slate-600 bg-white px-2 py-1 rounded">
                    {rule.mt5_value_template}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-slate-200">
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {showActions && (
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <PermissionGate module={MODULES.RULES} action="edit">
                        <button
                          onClick={() => onEdit(rule)}
                          className="group/btn relative p-1.5 text-blue-600 hover:text-white rounded-lg bg-blue-50 hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/50 hover:scale-110"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </PermissionGate>
                      <PermissionGate module={MODULES.RULES} action="edit">
                        <button
                          onClick={() => onToggleStatus(rule)}
                          className={`group/btn relative hover:text-white rounded-lg bg-blue-50 p-1.5 transition-all duration-200 hover:shadow-md hover:scale-110 ${
                            rule.is_active
                              ? 'text-orange-500 hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:shadow-orange-500/50'
                              : 'text-green-600 hover:bg-gradient-to-r hover:from-green-500 hover:to-green-600 hover:shadow-green-500/50'
                          }`}
                          title={rule.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <PowerIcon className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
                        </button>
                      </PermissionGate>
                      <PermissionGate module={MODULES.RULES} action="delete">
                        <button
                          onClick={() => onDelete(rule.id)}
                          className="group/btn relative p-1.5 text-red-500 hover:text-white rounded-lg bg-blue-50 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:shadow-md hover:shadow-red-500/50 hover:scale-110"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  )
}

export default RuleTable

