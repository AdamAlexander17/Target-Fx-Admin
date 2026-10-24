import React, { useState, useEffect } from 'react'
import SavingOverlay from './ui/SavingOverlay'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Rule, CreateRuleData, UpdateRuleData } from '../types'

interface RuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateRuleData | UpdateRuleData) => void
  rule?: Rule | null
  isLoading?: boolean
  apiError?: string | null
}

const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  rule,
  isLoading = false,
  apiError = null,
}) => {
  const [formData, setFormData] = useState<CreateRuleData>({
    rule_code: '',
    rule_name: '',
    description: '',
    mt5_field: '',
    mt5_value_template: '',
    requires_time_parameter: false,
    is_active: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (rule) {
      setFormData({
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        description: rule.description,
        mt5_field: rule.mt5_field,
        mt5_value_template: rule.mt5_value_template,
        requires_time_parameter: rule.requires_time_parameter,
        is_active: rule.is_active,
      })
    } else {
      setFormData({
        rule_code: '',
        rule_name: '',
        description: '',
        mt5_field: '',
        mt5_value_template: '',
        requires_time_parameter: false,
        is_active: true,
      })
    }
    setErrors({})
  }, [rule, isOpen])

  // Set API error to the appropriate field
  useEffect(() => {
    if (apiError) {
      if (apiError.toLowerCase().includes('code already exists') || apiError.toLowerCase().includes('duplicate')) {
        setErrors(prev => ({ ...prev, rule_code: apiError }))
      } else {
        setErrors(prev => ({ ...prev, general: apiError }))
      }
    }
  }, [apiError])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.rule_code.trim()) {
      newErrors.rule_code = 'Rule code is required'
    }
    if (!formData.rule_name.trim()) {
      newErrors.rule_name = 'Rule name is required'
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    if (!formData.mt5_field.trim()) {
      newErrors.mt5_field = 'MT5 field is required'
    }
    if (!formData.mt5_value_template.trim()) {
      newErrors.mt5_value_template = 'MT5 value template is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  if (!isOpen) return null

  return (
    <>
    <SavingOverlay show={!!(isLoading)} />
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-white border-b border-slate-300 px-6 py-3.5">
              <h2 className="text-lg font-bold text-slate-900">
                {rule ? 'Edit Rule' : 'Create New Rule'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-100 hover:text-slate-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {/* General Error Alert */}
              {errors.general && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{errors.general}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Rule Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Rule Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="rule_code"
                    value={formData.rule_code}
                    onChange={handleChange}
                    disabled={!!rule}
                    className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                      errors.rule_code ? 'border-red-300 bg-red-50/50' : rule ? 'border-slate-300 bg-slate-100 cursor-not-allowed text-slate-500' : 'border-slate-300 bg-white text-slate-900'
                    }`}
                    placeholder="e.g., CLOSE_ONLY"
                  />
                  {errors.rule_code && (
                    <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.rule_code}</p>
                  )}
                </div>

                {/* Rule Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Rule Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="rule_name"
                    value={formData.rule_name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                      errors.rule_name ? 'border-red-300 bg-red-50/50' : 'border-slate-300 bg-white text-slate-900'
                    }`}
                    placeholder="e.g., Close Only"
                  />
                  {errors.rule_name && (
                    <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.rule_name}</p>
                  )}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* MT5 Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    MT5 Field <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="mt5_field"
                    value={formData.mt5_field}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-sm border-2 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                      errors.mt5_field ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Select MT5 Field</option>
                    <option value="Group">Group</option>
                    <option value="Name">Name</option>
                    <option value="Last Name">Last Name</option>
                    <option value="Middle Name">Middle Name</option>
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Company">Company</option>
                    <option value="Status">Status</option>
                    <option value="Lead Campaign">Lead Campaign</option>
                    <option value="Lead Source">Lead Source</option>
                    <option value="Country">Country</option>
                    <option value="State">State</option>
                    <option value="City">City</option>
                    <option value="Zip Code">Zip Code</option>
                    <option value="Address">Address</option>
                    <option value="Comment">Comment</option>
                  </select>
                  {errors.mt5_field && (
                    <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.mt5_field}</p>
                  )}
                </div>

                {/* MT5 Value Template */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    MT5 Value Template <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="mt5_value_template"
                    value={formData.mt5_value_template}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                      errors.mt5_value_template ? 'border-red-300 bg-red-50/50' : 'border-slate-300 bg-white text-slate-900'
                    }`}
                    placeholder="e.g., Close Only, Reject {time}"
                  />
                  {errors.mt5_value_template && (
                    <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.mt5_value_template}</p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-500">
                    Use {'{time}'} placeholder if the rule requires a time parameter
                  </p>
                </div>
                </div>

                {/* Description */}
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                      errors.description ? 'border-red-300 bg-red-50/50' : 'border-slate-300 bg-white text-slate-900'
                    }`}
                    placeholder="Describe what this rule does..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-300 pt-2">
                {/* Requires Time Parameter */}
                <div className="flex items-center rounded-lg border border-slate-300 px-3 py-2 hover:border-slate-300 hover:bg-white/40 transition-colors">
                  <input
                    type="checkbox"
                    id="requires_time_parameter"
                    name="requires_time_parameter"
                    checked={formData.requires_time_parameter}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-2 focus:ring-slate-400/20"
                  />
                  <label
                    htmlFor="requires_time_parameter"
                    className="ml-2 text-sm font-medium text-slate-700"
                  >
                    Requires Time Parameter
                  </label>
                </div>

                {/* Is Active */}
                <div className="flex items-center rounded-lg border border-slate-300 px-3 py-2 hover:border-slate-300 hover:bg-white/40 transition-colors">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-2 focus:ring-slate-400/20"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 text-sm font-medium text-slate-700"
                  >
                    Active
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end items-center space-x-2.5 pt-2 border-t border-slate-300">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-1.5 text-sm font-medium border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-1.5 text-sm font-medium bg-white border border-slate-300 text-slate-700 rounded-lg shadow-sm hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {rule ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    <span>{rule ? 'Update Rule' : 'Create Rule'}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
    </>
  )
}

export default RuleModal

