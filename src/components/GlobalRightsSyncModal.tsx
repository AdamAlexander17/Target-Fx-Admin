import React, { useState } from 'react'
import SavingOverlay from './ui/SavingOverlay'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useQuery } from 'react-query'
import { brokerRightsService } from '../services/brokerRightsService'
import toast from 'react-hot-toast'

interface GlobalRightsSyncModalProps {
  isOpen: boolean
  onClose: () => void
  onSync: (rightIds: number[]) => Promise<void>
  isLoading: boolean
}

const GlobalRightsSyncModal: React.FC<GlobalRightsSyncModalProps> = ({
  isOpen,
  onClose,
  onSync,
  isLoading
}) => {
  const [selectedRights, setSelectedRights] = useState<number[]>([])

  // Fetch all available rights
  const { data: allRights, isLoading: rightsLoading } = useQuery(
    ['all-broker-rights'],
    () => brokerRightsService.getAllRights(),
    {
      enabled: isOpen
    }
  )

  const handleRightToggle = (rightId: number) => {
    setSelectedRights(prev =>
      prev.includes(rightId)
        ? prev.filter(id => id !== rightId)
        : [...prev, rightId]
    )
  }

  const handleSelectAll = () => {
    if (allRights) {
      setSelectedRights(allRights.map(right => right.id))
      toast.success(`Selected all ${allRights.length} rights`)
    }
  }

  const handleDeselectAll = () => {
    setSelectedRights([])
    toast.success('Deselected all rights')
  }

  const handleSync = async () => {
    if (selectedRights.length === 0) {
      toast.error('Please select at least one right to sync')
      return
    }

    await onSync(selectedRights)
    setSelectedRights([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
    <SavingOverlay show={!!(isLoading)} />
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-300">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Sync Rights to All Brokers
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Select rights to assign to all existing brokers in the system
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Action Buttons */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-slate-700">
                  {selectedRights.length} rights selected
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={!allRights || allRights.length === 0}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    disabled={selectedRights.length === 0}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-white hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear All
                  </button>
                </div>
              </div>

              {/* Rights List */}
              {rightsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div>
                </div>
              ) : allRights && allRights.length > 0 ? (
                <div className="bg-white rounded-lg border border-slate-300 p-3">
                  <div className="space-y-2">
                    {/* Group rights by category */}
                    {Object.entries(
                      allRights.reduce((acc, right) => {
                        const category = right.category || 'Other'
                        if (!acc[category]) acc[category] = []
                        acc[category].push(right)
                        return acc
                      }, {} as Record<string, typeof allRights>)
                    ).map(([category, categoryRights]) => (
                      <div key={category} className="bg-white rounded-md p-2.5 border border-slate-300">
                        <h5 className="font-semibold text-xs text-slate-800 mb-2 uppercase tracking-wide">
                          {category}
                        </h5>
                        <div className="space-y-1">
                          {categoryRights.map((right) => (
                            <label
                              key={right.id}
                              className={`flex items-center cursor-pointer px-2 py-1.5 rounded-md transition-all ${
                                selectedRights.includes(right.id)
                                  ? 'bg-blue-100 border border-slate-300'
                                  : 'bg-white border border-transparent hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedRights.includes(right.id)}
                                onChange={() => handleRightToggle(right.id)}
                                className="w-3.5 h-3.5 text-slate-600 border-slate-300 rounded focus:ring-slate-400"
                              />
                              <span className={`ml-2.5 text-xs ${
                                selectedRights.includes(right.id) ? 'text-slate-900 font-medium' : 'text-slate-700'
                              }`}>
                                {right.description || right.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-300">
                  <p className="text-sm text-slate-500">No rights available.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-300 bg-white">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={isLoading || selectedRights.length === 0}
                className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync to All Brokers ({selectedRights.length})
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
    </>
  )
}

export default GlobalRightsSyncModal

