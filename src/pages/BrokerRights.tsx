import React, { useState } from 'react'
import Loader from '../components/ui/Loader'
import { useQuery } from 'react-query'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { brokerService } from '../services/brokerService'
import { brokerRightsService } from '../services/brokerRightsService'
import BrokerRightsTable from '../components/BrokerRightsTable'
import BrokerRightsModal from '../components/BrokerRightsModal'
import { Broker, BrokerRight } from '../types'

const BrokerRights: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null)
  const [isRightsModalOpen, setIsRightsModalOpen] = useState(false)

  // Fetch all brokers
  const { data: brokersData, isLoading: brokersLoading } = useQuery(
    'brokers-for-rights',
    () => brokerService.getBrokers(1, 100, { is_active: true })
  )

  // Fetch all available rights
  const { data: allRights, isLoading: rightsLoading } = useQuery(
    'all-broker-rights',
    brokerRightsService.getAllRights
  )

  const handleManageRights = (broker: Broker) => {
    setSelectedBroker(broker)
    setIsRightsModalOpen(true)
  }

  // Get unique categories
  const categories = [...new Set(allRights?.map(r => r.category) || [])].sort()

  // Filter brokers based on search
  const filteredBrokers = brokersData?.brokers?.filter(broker => {
    const matchesSearch = broker.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         broker.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         broker.username?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  }) || []

  // Filter rights based on category
  const filteredRights = allRights?.filter(right => {
    return selectedCategory === 'all' || right.category === selectedCategory
  }) || []

  // Group rights by category
  const groupedRights = filteredRights.reduce((acc, right) => {
    const category = right.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(right)
    return acc
  }, {} as Record<string, BrokerRight[]>)

  if (brokersLoading || rightsLoading) {
    return <Loader fullScreen label="Loading..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Broker Rights Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage broker rights and permissions for trading operations
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-700 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {filteredBrokers.length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Active Brokers
                  </dt>
                  <dd className="text-lg font-medium text-slate-900">
                    {filteredBrokers.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {allRights?.length || 0}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Available Rights
                  </dt>
                  <dd className="text-lg font-medium text-slate-900">
                    {allRights?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {categories.length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Categories
                  </dt>
                  <dd className="text-lg font-medium text-slate-900">
                    {categories.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {filteredRights.length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">
                    Filtered Rights
                  </dt>
                  <dd className="text-lg font-medium text-slate-900">
                    {filteredRights.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search brokers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-blue-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FunnelIcon className="h-5 w-5 text-slate-400" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category?.charAt(0)?.toUpperCase() + category?.slice(1)?.replace('_', ' ') || category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rights Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Available Rights by Category</h3>
        <div className="space-y-4">
          {Object.entries(groupedRights).map(([category, rights]) => (
            <div key={category} className="border border-slate-300 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-900 mb-2 capitalize">
                {category.replace('_', ' ')} ({rights.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {rights.map(right => (
                  <div key={right.id} className="bg-white p-2 rounded text-sm">
                    <div className="font-medium text-slate-900">{right.name}</div>
                    <div className="text-slate-500 text-xs">{right.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brokers Table */}
      <BrokerRightsTable
        brokers={filteredBrokers}
        isLoading={brokersLoading}
        onManageRights={handleManageRights}
      />

      {/* Broker Rights Modal */}
      {isRightsModalOpen && selectedBroker && (
        <BrokerRightsModal
          broker={selectedBroker}
          allRights={allRights || []}
          isOpen={isRightsModalOpen}
          onClose={() => {
            setIsRightsModalOpen(false)
            setSelectedBroker(null)
          }}
        />
      )}
    </div>
  )
}

export default BrokerRights

