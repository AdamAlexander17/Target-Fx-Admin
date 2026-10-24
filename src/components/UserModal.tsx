import React, { useEffect, useState } from 'react'
import SavingOverlay from './ui/SavingOverlay'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { User, Role, CreateUserData, UpdateUserData } from '../services/userService'

interface UserModalProps {
  user?: User | null
  roles: Role[]
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateUserData | UpdateUserData) => void
  isLoading: boolean
  false?: boolean
}

const UserModal: React.FC<UserModalProps> = ({
  user,
  roles,
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    email: '',
    password: '',
    is_active: true,
    role_ids: [],
    force_two_factor: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    console.log('📝 UserModal - useEffect triggered')
    console.log('📝 UserModal - User data:', user)
    console.log('📝 UserModal - Is open:', isOpen)
    
    if (user) {
      const roleIds = user.roles.map(role => role.id)
      console.log('📝 UserModal - Extracted role IDs:', roleIds)
      console.log('📝 UserModal - User roles:', user.roles)
      
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        is_active: user.is_active,
        role_ids: roleIds,
        force_two_factor: user.force_two_factor || false
      })
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        is_active: true,
        role_ids: [],
        force_two_factor: false
      })
    }
    setErrors({})
  }, [user, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleRoleChange = (roleId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      role_ids: checked 
        ? [...prev.role_ids, roleId]
        : prev.role_ids.filter(id => id !== roleId)
    }))
    
    if (errors.role_ids) {
      setErrors(prev => ({ ...prev, role_ids: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = 'Password is required'
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.role_ids.length === 0) {
      newErrors.role_ids = 'At least one role must be selected'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData = user
      ? {
          username: formData.username,
          email: formData.email,
          is_active: formData.is_active,
          role_ids: formData.role_ids,  // Backend expects "role_ids"
          force_two_factor: formData.force_two_factor,
          ...(formData.password && { password: formData.password })
        }
      : {
          ...formData,
          role_ids: formData.role_ids  // Backend expects "role_ids"
        }

    console.log('🔧 UserModal - Submitting data:', submitData)
    console.log('🔧 UserModal - Role IDs:', formData.role_ids)
    console.log('🔧 UserModal - Is editing:', !!user)
    
    onSubmit(submitData)
  }

  if (!isOpen) return null

  return (
    <>
    <SavingOverlay show={!!(isLoading)} />
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl bg-white"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-300">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {user ? 'Edit User' : 'Create New User'}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {user ? 'Update user details and assign roles' : 'Add user details and assign roles'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-blue-100 transition-all"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[480px] bg-white">
              <form id="user-form" onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="px-6 py-4">
                  <div className="flex items-center mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Username */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                          errors.username
                            ? 'border-red-300 bg-red-50/50'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                        placeholder="Enter username"
                      />
                      {errors.username && (
                        <p className="mt-1 text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                          <span>⚠️</span> {errors.username}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                          errors.email
                            ? 'border-red-300 bg-red-50/50'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                        placeholder="Enter email address"
                      />
                      {errors.email && (
                        <p className="mt-1 text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                          <span>⚠️</span> {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="mt-4">
                    <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                      Password{' '}
                      {user
                        ? <span className="font-normal text-slate-500">(leave blank to keep current)</span>
                        : <span className="text-red-500">*</span>
                      }
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 pr-10 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                          errors.password
                            ? 'border-red-300 bg-red-50/50'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                        placeholder={user ? 'Leave blank to keep current' : 'Enter password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                        <span>⚠️</span> {errors.password}
                      </p>
                    )}
                  </div>
                </div>

                {/* Roles Section */}
                <div className="px-6 py-3 border-t border-slate-200">
                  <div className="flex items-center mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Roles</h3>
                    <span className="ml-1.5 text-red-500 text-sm">*</span>
                  </div>
                  <div className={`flex flex-wrap gap-2 ${errors.role_ids ? 'p-2 rounded-lg border border-red-300 bg-red-50/50' : ''}`}>
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={`flex items-center cursor-pointer px-3 py-1.5 border-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                          formData.role_ids.includes(role.id)
                            ? 'border-blue-600 bg-blue-600 shadow-sm'
                            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.role_ids.includes(role.id)}
                          onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-slate-400 focus:ring-2 flex-shrink-0"
                        />
                        <span className={`ml-2 text-sm font-medium capitalize whitespace-nowrap ${
                          formData.role_ids.includes(role.id) ? 'text-white' : 'text-slate-700'
                        }`}>{role.name}</span>
                      </label>
                    ))}
                  </div>
                  {errors.role_ids && (
                    <p className="mt-1.5 text-[10px] text-red-600 font-semibold flex items-center gap-1">
                      <span>⚠️</span> {errors.role_ids}
                    </p>
                  )}
                </div>

                {/* Status Section */}
                <div className="px-6 py-3 border-t border-slate-200 space-y-2.5">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400 focus:ring-2"
                    />
                    <span className="ml-2 text-sm font-medium text-slate-700">User is active</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="force_two_factor"
                      checked={formData.force_two_factor}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400 focus:ring-2"
                    />
                    <span className="ml-2 text-sm font-medium text-slate-700">Force 2FA</span>
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-300 bg-white flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-sm border-2 rounded-lg transition-all duration-200 font-medium border-slate-300 text-slate-700 hover:bg-white"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="user-form"
                disabled={isLoading}
                className="px-5 py-1.5 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                {isLoading ? (
                  <div className="flex items-center gap-1.5">
                    <svg className="animate-spin h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{user ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <span>{user ? 'Update User' : 'Create User'}</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  )
}

export default UserModal

