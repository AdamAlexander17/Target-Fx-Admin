import React from 'react'
import Loader from './ui/Loader'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import { Broker } from '../types'

interface BrokerRightsTableProps {
  brokers: Broker[]
  isLoading: boolean
  onManageRights: (broker: Broker) => void
}

const BrokerRightsTable: React.FC<BrokerRightsTableProps> = ({
  brokers,
  isLoading,
  onManageRights
}) => {
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <Loader label="Loading rights..." />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
      {/* Mobile view */}
      <div className="block sm:hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {brokers.map((broker) => (
              <div key={broker.id} className="border border-slate-300 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-slate-900">{broker.full_name || 'Unnamed Broker'}</h3>
                    <p className="text-sm text-slate-500">{broker.email || 'No email'}</p>
                    <p className="text-sm text-slate-500">@{broker.username}</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        broker.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {broker.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onManageRights(broker)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-full"
                      title="Manage rights"
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
      <div className="hidden sm:block overflow-auto no-scrollbar max-h-[calc(100vh-220px)]">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Broker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {brokers.map((broker) => (
              <tr key={broker.id} className="hover:bg-white">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {broker.full_name?.charAt(0)?.toUpperCase() || 'B'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">{broker.full_name || 'Unnamed Broker'}</div>
                      <div className="text-sm text-slate-500">ID: {broker.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">{broker.email || 'No email'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">@{broker.username}</div>
                  <div className="text-xs text-slate-500">Range: {broker.account_range_from}-{broker.account_range_to}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    broker.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {broker.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {new Date(broker.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onManageRights(broker)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    Manage Rights
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {brokers.length === 0 && (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">No brokers found</h3>
          <p className="mt-1 text-sm text-slate-500">
            No active brokers match your search criteria.
          </p>
        </div>
      )}
    </div>
  )
}

export default BrokerRightsTable

