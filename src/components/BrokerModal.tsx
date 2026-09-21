import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useQuery, useMutation, useQueryClient } from 'react-query'

import { brokerRightsService } from '../services/brokerRightsService'
import { brokerService } from '../services/brokerService'
import { accountMappingService } from '../services/accountMappingService'
import { brokerProfileService } from '../services/brokerProfileService'
import { brokerGroupMappingService } from '../services/brokerGroupMappingService'
import { groupService } from '../services/groupService'
import { mt5SuggestionsService } from '../services/mt5SuggestionsService'
import { Broker, CreateBrokerData, UpdateBrokerData, AccountMapping } from '../types'
import toast from 'react-hot-toast'

const ACCOUNT_MAPPING_FIELDS = [
  { label: 'Numeric Fields', options: [{ value: 'Account', label: 'Account' }] },
  {
    label: 'Text Fields',
    options: [
      { value: 'Group', label: 'Group' },
      { value: 'Name', label: 'Name' },
      { value: 'LastName', label: 'Last Name' },
      { value: 'MiddleName', label: 'Middle Name' },
      { value: 'Email', label: 'Email' },
      { value: 'Phone', label: 'Phone' },
      { value: 'Company', label: 'Company' },
      { value: 'Status', label: 'Status' },
      { value: 'LeadCampaign', label: 'Lead Campaign' },
      { value: 'LeadSource', label: 'Lead Source' },
      { value: 'Country', label: 'Country' },
      { value: 'State', label: 'State' },
      { value: 'City', label: 'City' },
      { value: 'ZipCode', label: 'Zip Code' },
      { value: 'Address', label: 'Address' },
      { value: 'Comment', label: 'Comment' }
    ]
  }
]

interface BrokerModalProps {
  broker: Broker | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateBrokerData | UpdateBrokerData) => Promise<Broker | void>
  isLoading: boolean
}

const BrokerModal: React.FC<BrokerModalProps> = ({
  broker,
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
    const [activeTab, setActiveTab] = useState<'basic' | 'permissions' | 'profiles' | 'rights' | 'groups' | 'account-mapping'>('basic')
  const [selectedProfile, setSelectedProfile] = useState<number | null>(null)
  const [editableRolePermissions, setEditableRolePermissions] = useState<number[]>([])
  const [editableProfileGroups, setEditableProfileGroups] = useState<number[]>([])
  const [groupsPage, setGroupsPage] = useState(1)
  const [groupsPerPage, setGroupsPerPage] = useState(5)
  const [formData, setFormData] = useState<CreateBrokerData>({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    account_range_from: 1000,
    account_range_to: 2000,
    is_active: true,
    credit_limit: undefined,
    default_percentage: undefined,
    telegram_id: undefined,
    match_all_condition: undefined
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Custom field dropdown (always opens downward, scrolls internally)
  const [fieldMenu, setFieldMenu] = useState<{ top: number; left: number; width: number } | null>(null)
  const fieldMenuRef = useRef<HTMLDivElement>(null)
  const closeFieldMenu = () => setFieldMenu(null)
  useEffect(() => {
    if (!fieldMenu) return
    const close = () => setFieldMenu(null)
    // Ignore scrolling of the menu itself; close only when something else scrolls
    const closeOnOuterScroll = (e: Event) => {
      if (fieldMenuRef.current && e.target instanceof Node && fieldMenuRef.current.contains(e.target)) return
      setFieldMenu(null)
    }
    window.addEventListener('resize', close)
    window.addEventListener('scroll', closeOnOuterScroll, true)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', closeOnOuterScroll, true)
    }
  }, [fieldMenu])
  const [selectedRights, setSelectedRights] = useState<number[]>([])
  const [selectedGroups, setSelectedGroups] = useState<number[]>([])
  
  // Account mapping form state
  const [accountMappingData, setAccountMappingData] = useState({
    field_name: '',
    operator_type: '=',
    field_value: ''
  })
  const [accountMappings, setAccountMappings] = useState<AccountMapping[]>([])
  const [pendingMappings, setPendingMappings] = useState<Array<{
    id: string
    field_name: string
    field_value: string
    operator_type: string
  }>>([])
  const [accountMappingErrors, setAccountMappingErrors] = useState<Record<string, string>>({})
  const [mt5Suggestions, setMt5Suggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [profileSearchQuery, setProfileSearchQuery] = useState('')
  const queryClient = useQueryClient()

  // Fetch existing account mappings when editing a broker
  const { isLoading: accountMappingsLoading } = useQuery(
    ['account-mappings', broker?.id],
    () => accountMappingService.getBrokerAccountMappings(broker!.id),
    {
      enabled: !!broker?.id && isOpen,
      onSuccess: (data) => {
        setAccountMappings(data || [])
      },
      onError: (error) => {
        console.error('Failed to fetch account mappings:', error)
        setAccountMappings([])
      }
    }
  )

  // Fetch all broker profiles
  const { data: brokerProfiles, isLoading: profilesLoading } = useQuery(
    ['broker-profiles'],
    () => brokerProfileService.getAllProfiles(),
    {
      enabled: isOpen
    }
  )

  // Fetch all groups
  const { data: groupsData, isLoading: groupsLoading } = useQuery(
    ['groups-all'],
    () => groupService.getGroups(1, 1000),
    {
      enabled: isOpen && (activeTab === 'groups' || activeTab === 'profiles')
    }
  )

  // Fetch all available broker rights
  const { data: allBrokerRights, isLoading: allRightsLoading } = useQuery(
    ['all-broker-rights'],
    () => brokerRightsService.getAllRights(),
    {
      enabled: isOpen && (activeTab === 'rights' || activeTab === 'profiles')
    }
  )

  // Fetch MT5 suggestions based on selected field
  const fetchMT5Suggestions = async (fieldName: string, query?: string) => {
    if (!fieldName) return
    
    // setLoadingSuggestions(true)
    try {
      // Map field names to MT5 API field names
      const fieldMapping: Record<string, string> = {
        'Account': 'login',
        'Group': 'group',
        'Name': 'name',
        'LastName': 'name',
        'MiddleName': 'name',
        'Email': 'email',
        'Phone': 'phone',
        'Company': 'company',
        'Status': 'status',
        'LeadCampaign': 'leadCampaign',
        'LeadSource': 'leadSource',
        'Country': 'country',
        'State': 'state',
        'City': 'city',
        'ZipCode': 'zipCode',
        'Address': 'address',
        'Comment': 'comment'
      }

      const mt5Field = fieldMapping[fieldName]
      if (mt5Field) {
        const suggestions = await mt5SuggestionsService.getSuggestions(mt5Field, query)
        setMt5Suggestions(suggestions)
      }
    } catch (error) {
      // Silently fail - user can still type manually
      setMt5Suggestions([])
    } finally {
      // setLoadingSuggestions(false)
    }
  }

  // Fetch suggestions when field name changes
  useEffect(() => {
    if (accountMappingData.field_name) {
      fetchMT5Suggestions(accountMappingData.field_name)
    } else {
      setMt5Suggestions([])
    }
  }, [accountMappingData.field_name])



  // Bulk sync mutation
  const bulkSyncMutation = useMutation(
    async (rightIds: number[]) => {
      // setIsSyncingToAll(true)
      
      // First fetch all brokers
      const brokersResponse = await brokerService.getBrokers(1, 1000)
      const allBrokers = brokersResponse.brokers
      
      let successCount = 0
      let errorCount = 0
      
      // Sync rights to each broker
      for (const broker of allBrokers) {
        try {
          await brokerRightsService.syncBrokerRights(broker.id, rightIds)
          successCount++
        } catch (error) {
          errorCount++
          console.error(`Failed to sync rights to broker ${broker.id}:`, error)
        }
      }
      
      return { successCount, errorCount }
    },
    {
      onSuccess: ({ successCount, errorCount }) => {
        queryClient.invalidateQueries(['broker-rights'])
        queryClient.invalidateQueries(['brokers']) // Ensure broker list updates
        if (errorCount === 0) {
          toast.success(`Successfully synced rights to all ${successCount} brokers!`)
        } else {
          toast.success(`Synced rights to ${successCount} brokers. ${errorCount} failed.`)
        }
      },
      onError: (error: any) => {
        toast.error(`Failed to sync rights: ${error.response?.data?.message || error.message}`)
      },
      onSettled: () => {
        // setIsSyncingToAll(false)
      }
    }
  )

  // Create account mapping mutation
  const createAccountMappingMutation = useMutation(
    async (mappingData: { field_name: string; operator_type: string; field_value: string }) => {
      const newMapping = await accountMappingService.createAccountMapping(broker!.id, mappingData)
      // Fetch the updated broker object after mapping change
      try {
        const updatedBroker = await brokerService.getBrokerById(broker!.id)
        return { newMapping, updatedBroker }
      } catch {
        return { newMapping, updatedBroker: null }
      }
    },
    {
      onSuccess: (data, variables, context) => {
        setAccountMappings(prev => [...prev, data.newMapping])
        queryClient.invalidateQueries(['account-mappings', broker!.id])
        // Update all broker list queries in cache
        if (data.updatedBroker && data.updatedBroker.id) {
          queryClient.getQueryCache().findAll(["brokers"]).forEach((query: any) => {
            queryClient.setQueryData(query.queryKey, (oldData: any) => {
              if (!oldData || !oldData.brokers) return oldData;
              return {
                ...oldData,
                brokers: oldData.brokers.map((b: any) =>
                  b.id === data.updatedBroker.id ? data.updatedBroker : b
                )
              };
            });
          });
        } else {
          queryClient.invalidateQueries(['brokers']);
        }
        setAccountMappingData({ field_name: '', operator_type: '=', field_value: '' })
        setAccountMappingErrors({})
        toast.success('Account mapping added successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to add account mapping')
      }
    }
  )

  // Delete account mapping mutation
  const deleteAccountMappingMutation = useMutation(
    async (mappingId: number) => {
      await accountMappingService.deleteAccountMapping(broker!.id, mappingId)
      try {
        const updatedBroker = await brokerService.getBrokerById(broker!.id)
        return { updatedBroker }
      } catch {
        return { updatedBroker: null }
      }
    },
    {
      onSuccess: (data, mappingId) => {
        setAccountMappings(prev => prev.filter(mapping => mapping.id !== mappingId))
        queryClient.invalidateQueries(['account-mappings', broker!.id])
        if (data.updatedBroker && data.updatedBroker.id) {
          queryClient.getQueryCache().findAll(["brokers"]).forEach((query: any) => {
            queryClient.setQueryData(query.queryKey, (oldData: any) => {
              if (!oldData || !oldData.brokers) return oldData;
              return {
                ...oldData,
                brokers: oldData.brokers.map((b: any) =>
                  b.id === data.updatedBroker.id ? data.updatedBroker : b
                )
              };
            });
          });
        } else {
          queryClient.invalidateQueries(['brokers']);
        }
        toast.success('Account mapping deleted successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete account mapping')
      }
    }
  )

  // Fetch broker's current rights if editing
  const { data: brokerRights, isLoading: rightsLoading } = useQuery(
    ['broker-rights', broker?.id],
    () => brokerRightsService.getBrokerRights(broker!.id),
    {
      enabled: !!broker?.id && isOpen,
      retry: 2,
      onError: (error) => {
        console.error('Failed to fetch broker rights:', error)
      }
    }
  )

  // Fetch broker's current groups if editing
  const { data: brokerGroups, isLoading: groupsMappingLoading } = useQuery(
    ['broker-groups', broker?.id],
    () => brokerGroupMappingService.getBrokerGroupMappings(broker!.id),
    {
      enabled: !!broker?.id && isOpen,
      retry: 2,
      onError: (error) => {
        console.error('Failed to fetch broker groups:', error)
      }
    }
  )

  // Sync rights mutation
  const syncRightsMutation = useMutation(
    ({ brokerId, rightIds }: { brokerId: number; rightIds: number[] }) =>
      brokerRightsService.syncBrokerRights(brokerId, rightIds),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['broker-rights'])
        queryClient.invalidateQueries(['brokers']) // Ensure broker list updates
        toast.success('Broker permissions updated successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update permissions')
      }
    }
  )

  // Sync groups mutation
  const syncGroupsMutation = useMutation(
    ({ brokerId, groupIds }: { brokerId: number; groupIds: number[] }) =>
      brokerGroupMappingService.syncBrokerGroups(brokerId, groupIds),
    {
      onSuccess: async (result) => {
        // Force invalidate and refetch to get updated data
        await queryClient.invalidateQueries(['broker-groups'])
        await queryClient.invalidateQueries(['brokers'])
        // Small delay to let backend DB sync, then refetch
        setTimeout(() => {
          queryClient.refetchQueries(['broker-groups'])
          queryClient.refetchQueries(['brokers'])
        }, 500)
        
        if (result.hasConflicts) {
          toast.success(`Groups updated (${result.added} added, ${result.removed} removed, ${result.skipped} already existed)`, {
            duration: 4000
          })
        } else {
          toast.success('Broker groups updated successfully!')
        }
      },
      onError: (error: any) => {
        // Only show error if it's not a 409 (conflict is handled gracefully in service)
        if (error.response?.status !== 409) {
          toast.error(error.response?.data?.message || 'Failed to update groups')
        }
      }
    }
  )

  useEffect(() => {
    if (broker) {
      setFormData({
        username: broker.username || '',
        password: '',
        full_name: broker.full_name || '',
        email: broker.email || '',
        phone: broker.phone || '',
        account_range_from: broker.account_range_from || 1000,
        account_range_to: broker.account_range_to || 2000,
        is_active: broker.is_active ?? true,
        credit_limit: broker.credit_limit,
        default_percentage: broker.default_percentage,
        telegram_id: broker.telegram_id,
        match_all_condition: broker.match_all_condition
      })
    } else {
      setFormData({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
        account_range_from: 1000,
        account_range_to: 2000,
        is_active: true,
        credit_limit: undefined,
        default_percentage: undefined,
        telegram_id: undefined,
        match_all_condition: undefined
      })
      setSelectedRights([])
      setSelectedGroups([])
      setAccountMappings([])
      setPendingMappings([]) // Clear pending mappings for new broker
    }
    setErrors({})
    // Set active tab based on mode: 'rights' for edit to show rights directly, 'basic' for new broker
    setActiveTab(broker ? 'rights' : 'basic')
    // Reset account mapping form
    setAccountMappingData({ field_name: '', operator_type: '=', field_value: '' })
    setAccountMappingErrors({})
  }, [broker, isOpen])
  
  // Separate effect to handle brokerRights and brokerGroups data
  useEffect(() => {
    if (broker && brokerRights) {
      // Set selected rights for existing broker
      setSelectedRights(brokerRights.map(right => right.id))
    }
  }, [broker, brokerRights])

  useEffect(() => {
    if (broker && brokerGroups) {
      // Set selected groups for existing broker
      const groupIds = brokerGroups.map(group => group.group_id)
      setSelectedGroups(groupIds)
    }
  }, [broker, brokerGroups])

  // Automatically sync Assign Profile tab selections to main state when leaving the tab (for create broker)
  useEffect(() => {
    if (!broker && activeTab !== 'profiles') {
      setSelectedRights(editableRolePermissions)
      setSelectedGroups(editableProfileGroups)
    }
  }, [activeTab, broker, editableRolePermissions, editableProfileGroups])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name || !formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }

    if (!formData.username || !formData.username.trim()) {
      newErrors.username = 'Username is required'
    }

    if (formData.telegram_id !== undefined && (!Number.isInteger(formData.telegram_id) || formData.telegram_id <= 0)) {
      newErrors.telegram_id = 'Telegram ID must be a positive whole number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!validateForm()) {
      setActiveTab('basic')
      return
    }

    try {
      // Check if there's a pending account mapping that needs to be saved
      const hasPendingMapping = accountMappingData.field_name.trim() && accountMappingData.field_value.trim()
      
      if (hasPendingMapping && broker?.id) {
        // Validate the pending mapping
        if (validateAccountMapping()) {
          // Save the pending account mapping first
          await createAccountMappingMutation.mutateAsync(accountMappingData)
        } else {
          // If validation fails, switch to account mapping tab to show errors
          setActiveTab('account-mapping')
          toast.error('Please complete or fix the account mapping before updating the broker')
          return
        }
      }

      // For create broker, use Assign Profile selections (editableRolePermissions/editableProfileGroups)
      // For edit broker, use selectedRights/selectedGroups
      const rightsToSync = !broker ? editableRolePermissions : selectedRights
      const groupsToSync = !broker ? editableProfileGroups : selectedGroups

      // Clean up data for API submission
      const cleanedData: Record<string, any> = {
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        account_range_from: formData.account_range_from,
        account_range_to: formData.account_range_to,
        is_active: formData.is_active,
        credit_limit: formData.credit_limit,
        default_percentage: formData.default_percentage,
        telegram_id: formData.telegram_id,
        match_all_condition: formData.match_all_condition,
        right_ids: rightsToSync // Use selected permissions
      }

      // Only include password if user actually typed one
      if (formData.password && formData.password.trim().length > 0) {
        cleanedData.password = formData.password
        console.log('🔑 Password included in update payload')
      }

      console.log('📤 Submitting broker data:', { ...cleanedData, password: cleanedData.password ? '***' : undefined })

      // Create/update the broker
      const result = await onSubmit(cleanedData as CreateBrokerData | UpdateBrokerData)
      
      // If this was a new broker creation and we have pending mappings, save them
      if (!broker && pendingMappings.length > 0 && result?.id) {
        try {
          for (const mapping of pendingMappings) {
            await accountMappingService.createAccountMapping(result.id, {
              field_name: mapping.field_name,
              field_value: mapping.field_value,
              operator_type: mapping.operator_type
            })
          }
          setPendingMappings([]) // Clear pending mappings after successful save
          toast.success('Broker and account mappings created successfully!')
        } catch (error) {
          console.error('Failed to save account mappings:', error)
          toast.error('Broker created but some account mappings failed to save')
        }
      }
      
      // Then sync permissions and groups if broker exists or was just created
      const brokerId = broker?.id || result?.id
      if (brokerId) {
        // Sync rights
        await syncRightsMutation.mutateAsync({ 
          brokerId: brokerId, 
          rightIds: rightsToSync 
        })
        
        // Sync groups (always sync, even if empty to handle removal)
        await syncGroupsMutation.mutateAsync({
          brokerId: brokerId,
          groupIds: groupsToSync
        })
      }
    } catch (error) {
      // Error handling is done in the parent component and mutations
      console.error('Error in handleSubmit:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              type === 'number' ? (value === '' ? undefined : parseFloat(value)) :
              value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Toggle right in selected rights (for edit mode)
  const handleRightToggle = (rightId: number) => {
    setSelectedRights(prev => 
      prev.includes(rightId)
        ? prev.filter(id => id !== rightId)
        : [...prev, rightId]
    )
  }

  // Select all available rights
  const handleSelectAllRights = () => {
    if (allBrokerRights) {
      setSelectedRights(allBrokerRights.map(right => right.id))
      toast.success(`Selected all ${allBrokerRights.length} rights`)
    }
  }

  // Deselect all rights
  const handleDeselectAllRights = () => {
    setSelectedRights([])
    toast.success('Deselected all rights')
  }

  // Toggle group in selected groups (for edit mode)
  const handleGroupToggle = (groupId: number) => {
    setSelectedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  // Mock permissions data organized by categories
  const permissionCategories = [
    {
      name: 'Account Management',
      permissions: [
        { id: 1, name: 'Account Open', description: 'Allow broker to create new accounts' },
        { id: 2, name: 'Account Edit', description: 'Allow broker to edit account details' },
        { id: 3, name: 'Account Close', description: 'Allow broker to close accounts' }
      ]
    },
    {
      name: 'Financial Operations',
      permissions: [
        { id: 4, name: 'Credit In', description: 'Allow broker to add credit to accounts' },
        { id: 5, name: 'Credit Out', description: 'Allow broker to withdraw credit from accounts' },
        { id: 6, name: 'Transfer Funds', description: 'Allow broker to transfer funds between accounts' }
      ]
    },
    {
      name: 'Trading Operations',
      permissions: [
        { id: 7, name: 'Set Percentage', description: 'Allow broker to set percentage/commission' },
        { id: 8, name: 'Place Orders', description: 'Allow broker to place orders on behalf of clients' },
        { id: 9, name: 'Cancel Orders', description: 'Allow broker to cancel orders' },
        { id: 10, name: 'Modify Limits', description: 'Allow broker to modify trading limits' },
        { id: 11, name: 'View Positions', description: 'Allow broker to view client positions' }
      ]
    },
    {
      name: 'Reports & Analytics',
      permissions: [
        { id: 12, name: 'View Reports', description: 'Allow broker to view reports' },
        { id: 13, name: 'View Ledger', description: 'Allow broker to view account ledgers' }
      ]
    },
    {
      name: 'Group Management',
      permissions: [
        { id: 14, name: 'Manage Groups', description: 'Allow broker to manage client groups' }
      ]
    }
  ]



  // Account mapping validation
  const validateAccountMapping = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!accountMappingData.field_name.trim()) {
      newErrors.field_name = 'Field name is required'
    }

    if (!accountMappingData.field_value.trim()) {
      newErrors.field_value = 'Field value is required'
    }

    setAccountMappingErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle account mapping form submission
  const handleAccountMappingSubmit = () => {
    if (!validateAccountMapping()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!broker?.id) {
      toast.error('Please save the broker first before adding account mappings')
      return
    }

    createAccountMappingMutation.mutate(accountMappingData)
  }

  // Handle adding pending mapping for new brokers
  const handleAddPendingMapping = () => {
    if (!validateAccountMapping()) {
      toast.error('Please fill in all required fields')
      return
    }

    const newPendingMapping = {
      id: Date.now().toString(), // Temporary ID
      field_name: accountMappingData.field_name,
      field_value: accountMappingData.field_value,
      operator_type: accountMappingData.operator_type
    }

    setPendingMappings(prev => [...prev, newPendingMapping])
    
    // Reset form
    setAccountMappingData({
      field_name: '',
      operator_type: '',
      field_value: ''
    })
    
    toast.success('Account mapping added! It will be saved when you create the broker.')
  }

  // Remove pending mapping
  const handleRemovePendingMapping = (id: string) => {
    setPendingMappings(prev => prev.filter(mapping => mapping.id !== id))
    toast.success('Pending mapping removed')
  }

  // Handle match all condition toggle
  const handleMatchAllConditionToggle = async () => {
    const newValue = formData.match_all_condition !== true
    
    // Update local state immediately for instant UI feedback
    setFormData(prev => ({ ...prev, match_all_condition: newValue }))
    
    // If broker exists, update it on the server immediately
    if (broker?.id) {
      try {
        await brokerService.updateMatchAllCondition(broker.id, newValue)
        toast.success(`Match All Condition ${newValue ? 'enabled' : 'disabled'}`)
      } catch (error: any) {
        // Revert local state if API call fails
        setFormData(prev => ({ ...prev, match_all_condition: !newValue }))
        toast.error(error.response?.data?.message || 'Failed to update match all condition')
      }
    } else {
      // For new brokers, just show feedback that it will be saved with the broker
      toast.success(`Match All Condition will be ${newValue ? 'enabled' : 'disabled'} when broker is created`)
    }
  }

  // Remove account mapping
  const handleRemoveMapping = (mappingId: number) => {
    if (window.confirm('Are you sure you want to delete this account mapping?')) {
      deleteAccountMappingMutation.mutate(mappingId)
    }
  }

  // Handle sync selected rights to all brokers
  const _handleSyncToAllBrokers = () => {
    if (selectedRights.length === 0) {
      toast.error('Please select at least one permission to sync')
      return
    }

    const selectedPermissionNames = permissionCategories
      .flatMap(cat => cat.permissions)
      .filter(perm => selectedRights.includes(perm.id))
      .map(perm => perm.name)

    if (window.confirm(
      `This will sync the following ${selectedRights.length} permissions to ALL brokers in the system:\n\n` +
      `${selectedPermissionNames.join(', ')}\n\n` +
      `This action will overwrite existing permissions for all brokers. Continue?`
    )) {
      bulkSyncMutation.mutate(selectedRights)
    }
  }

  // Handle profile selection - applies all rights and groups from the profile
  const _handleProfileSelect = async (profileId: number) => {
    setSelectedProfile(profileId)
    
    try {
      // Fetch the profile details to get its rights and groups
      const profileDetails = await brokerProfileService.getProfileById(profileId)
      
      // Update selected rights with profile's rights
      const profileRightIds = profileDetails.rights.map(r => r.rightId)
      setSelectedRights(profileRightIds)
      
      // Update selected groups with profile's groups
      const profileGroupIds = profileDetails.groups.map(g => g.groupId)
      setSelectedGroups(profileGroupIds)
      
      toast.success(`Profile applied! ${profileRightIds.length} rights and ${profileGroupIds.length} groups assigned.`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load profile details')
    }
  }

  // Handle profile selection for ROLES tab - applies only rights from the profile
  const _handleProfileSelectRoles = async (profileId: number) => {
    setSelectedProfile(profileId)
    
    try {
      // Fetch the profile details to get its rights
      const profileDetails = await brokerProfileService.getProfileById(profileId)
      
      // Update selected rights with profile's rights only
      const profileRightIds = profileDetails.rights.map(r => r.rightId)
      setSelectedRights(profileRightIds)
      
      toast.success(`Profile rights applied! ${profileRightIds.length} rights assigned.`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load profile details')
    }
  }

  // Handle profile selection for GROUPS tab - applies only groups from the profile
  const _handleProfileSelectGroups = async (profileId: number) => {
    setSelectedProfile(profileId)
    
    try {
      // Fetch the profile details to get its groups
      const profileDetails = await brokerProfileService.getProfileById(profileId)
      
      // Update selected groups with profile's groups only
      const profileGroupIds = profileDetails.groups.map(g => g.groupId)
      setSelectedGroups(profileGroupIds)
      
      toast.success(`Profile groups applied! ${profileGroupIds.length} groups assigned.`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load profile details')
    }
  }

  // Handle profile selection for role editing - loads profile rights for editing
  const handleProfileSelectForRoleEditing = async (profileId: number | null) => {
    setSelectedProfile(profileId)
    
    if (!profileId) {
      // setRolePermissions([])
      setEditableRolePermissions([])
      return
    }
    
    try {
      const profileDetails = await brokerProfileService.getProfileById(profileId)
      const profileRightIds = profileDetails.rights.map(r => r.rightId)
      // setRolePermissions(profileRightIds)
      setEditableRolePermissions([...profileRightIds])
      toast.success(`Profile loaded! You can now edit the ${profileRightIds.length} rights before assigning.`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load profile details')
    }
  }

  // Handle profile selection for group editing - loads profile groups for editing
  const handleProfileSelectForGroupEditing = async (profileId: number | null) => {
    setSelectedProfile(profileId)
    
    if (!profileId) {
      // setProfileGroups([])
      setEditableProfileGroups([])
      return
    }
    
    try {
      const profileDetails = await brokerProfileService.getProfileById(profileId)
      const profileGroupIds = profileDetails.groups.map(g => g.groupId)
      // setProfileGroups(profileGroupIds)
      setEditableProfileGroups([...profileGroupIds])
      toast.success(`Profile loaded! You can now edit the ${profileGroupIds.length} groups before assigning.`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load profile details')
    }
  }

  // Toggle permission in editable role permissions
  const handleRolePermissionToggle = (permissionId: number) => {
    setEditableRolePermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId)
      } else {
        return [...prev, permissionId]
      }
    })
  }

  // Apply edited role permissions to broker
  const _handleApplyRolePermissions = () => {
    setSelectedRights(editableRolePermissions)
    toast.success(`${editableRolePermissions.length} permissions from role applied to broker!`)
  }

  // Toggle group in editable profile groups
  const handleProfileGroupToggle = (groupId: number) => {
    setEditableProfileGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId)
      } else {
        return [...prev, groupId]
      }
    })
  }

  // Apply edited profile groups to broker
  const _handleApplyProfileGroups = () => {
    setSelectedGroups(editableProfileGroups)
    toast.success(`${editableProfileGroups.length} groups from profile applied to broker!`)
  }





  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <style>{`.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}.hide-scrollbar::-webkit-scrollbar{display:none;}`}</style>
          <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-3xl mx-4 transform overflow-hidden rounded-xl bg-white shadow-xl"
            >
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="flex items-center justify-between bg-white border-b border-slate-300 px-6 py-3.5">
                  <h2 className="text-lg font-bold text-slate-900">{broker ? 'Edit Broker' : 'Create New Broker'}</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-100 hover:text-slate-700"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-300">
                  <nav className="flex px-4 pt-3 gap-1" aria-label="Tabs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('basic')}
                      className={`min-w-[140px] text-center rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === 'basic'
                          ? 'border-blue-700 text-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white'
                      }`}
                    >
                      Basic Information
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('account-mapping')}
                      className={`min-w-[140px] text-center rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === 'account-mapping'
                          ? 'border-blue-700 text-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white'
                      }`}
                    >
                      Add Account Mapping
                    </button>
                    
                    {/* Show Rights tab only for EDIT (not for create) */}
                    {broker && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('rights')}
                        className={`min-w-[140px] text-center rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                          activeTab === 'rights'
                            ? 'border-blue-700 text-slate-900'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white'
                        }`}
                      >
                        Rights
                      </button>
                    )}
                    
                    {/* Show Assign Profile tab only when CREATING */}
                    {!broker && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('profiles')}
                        className={`min-w-[140px] text-center rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                          activeTab === 'profiles'
                            ? 'border-blue-700 text-slate-900'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white'
                        }`}
                      >
                        Assign Profile
                      </button>
                    )}
                  </nav>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Tab Content */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'basic' && (
                      <motion.div
                        key="basic"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                          <div>
                            <label className="block text-xs font-semibold mb-1.5 text-slate-700">Full Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              name="full_name"
                              value={formData.full_name}
                              onChange={handleInputChange}
                              className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                                errors.full_name ? 'border-red-300 bg-red-50/50' : 'border-slate-300 bg-white text-slate-900'
                              }`}
                              placeholder="Enter full name"
                            />
                            {errors.full_name && <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.full_name}</p>}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1.5 text-slate-700">Username <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              name="username"
                              value={formData.username}
                              onChange={handleInputChange}
                              className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                                errors.username ? 'border-red-300 bg-red-50/50' : 'border-slate-300 bg-white text-slate-900'
                              }`}
                              placeholder="Enter username"
                            />
                            {errors.username && <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.username}</p>}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                              Password{' '}
                              {broker
                                ? <span className="font-normal text-slate-500">(leave blank to keep current)</span>
                                : <span className="text-red-500">*</span>
                              }
                            </label>
                            <input
                              type="password"
                              name="password"
                              value={formData.password}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all"
                              placeholder={broker ? 'Enter new password to change' : 'Enter password'}
                            />
                            {errors.password && <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.password}</p>}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1.5 text-slate-700">Credit Limit</label>
                            <input
                              type="number"
                              step="0.01"
                              name="credit_limit"
                              value={formData.credit_limit || ''}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all"
                              placeholder="Enter credit limit"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1.5 text-slate-700">Default Percentage (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              name="default_percentage"
                              value={formData.default_percentage || ''}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1.5 text-slate-700">Status</label>
                            <select
                              name="is_active"
                              value={formData.is_active ? 'active' : 'inactive'}
                              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                              className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1.5 text-slate-700">Telegram ID</label>
                            <input
                              type="number"
                              name="telegram_id"
                              min={1}
                              step={1}
                              inputMode="numeric"
                              onKeyDown={(e) => {
                                if (['-', '+', '.', ',', 'e', 'E'].includes(e.key)) e.preventDefault()
                              }}
                              value={formData.telegram_id ?? ''}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '')
                                setFormData(prev => ({ ...prev, telegram_id: digits === '' ? undefined : parseInt(digits, 10) }))
                                if (errors.telegram_id) setErrors(prev => ({ ...prev, telegram_id: '' }))
                              }}
                              className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all"
                              placeholder="Enter telegram ID"
                            />
                            {errors.telegram_id && <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.telegram_id}</p>}
                          </div>

                        </div>
                      </motion.div>
                    )}

                    {/* Assign Profile Tab - Only for CREATE and EDIT */}
                    {activeTab === 'profiles' && !broker && (
                      <motion.div
                        key="profiles"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Scrollable container for Assign Profile tab (CREATE only) */}
                        <div className="max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                          <div className="mb-4">
                          <div className="mb-3">
                            <h3 className="text-base font-semibold text-slate-900 mb-1">Assign Profile</h3>
                            <p className="text-xs text-slate-600">
                              Select a profile and customize its rights before assigning to this broker.
                            </p>
                          </div>
                          
                          {/* Profile Search and Dropdown in Same Line */}
                          <div className="flex gap-2">
                            {/* Profile Search Box */}
                            <div className="flex-1">
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search rights..."
                                  value={profileSearchQuery}
                                  onChange={(e) => setProfileSearchQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 pl-8 text-xs border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-400 focus:border-slate-300 bg-white"
                                  disabled={profilesLoading}
                                />
                                <svg
                                  className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                  />
                                </svg>
                                {profileSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setProfileSearchQuery('')}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Profile Dropdown */}
                            <div className="flex-1">
                              <select
                                value={selectedProfile || ''}
                                onChange={(e) => {
                                  const profileId = e.target.value ? Number(e.target.value) : null
                                  if (profileId) {
                                    handleProfileSelectForRoleEditing(profileId)
                                    handleProfileSelectForGroupEditing(profileId)
                                  } else {
                                    setSelectedProfile(null)
                                    setEditableRolePermissions([])
                                    setEditableProfileGroups([])
                                  }
                                }}
                                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-400 focus:border-slate-300 bg-white"
                                disabled={profilesLoading}
                              >
                                <option value="">-- Select Profile --</option>
                                {brokerProfiles?.profiles?.map((profile) => (
                                  <option key={profile.id} value={profile.id}>
                                    {profile.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Profile Loading State */}
                        {profilesLoading && (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div>
                          </div>
                        )}

                        {/* No Profiles Message */}
                        {!profilesLoading && brokerProfiles?.profiles?.length === 0 && (
                          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-300">
                            <svg className="w-12 h-12 mx-auto text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm text-slate-500">No profiles available. Create profiles in the Broker Profiles section first.</p>
                          </div>
                        )}

                        {/* Show content when profile is selected */}
                        {selectedProfile && !profilesLoading && (
                          <div>
                            {/* Rights */}
                            <div className="border-b border-slate-300 mb-4">
                              <nav className="flex space-x-6">
                                <div className="py-2 px-1 border-b-2 border-blue-700 font-medium text-sm text-slate-900">
                                  Rights ({editableRolePermissions.length})
                                </div>
                              </nav>
                            </div>

                            <div>
                              {allRightsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div>
                                </div>
                              ) : allBrokerRights && allBrokerRights.length > 0 ? (
                                (() => {
                                  // Filter rights based on search query
                                  const filteredRights = profileSearchQuery 
                                    ? allBrokerRights.filter(right => 
                                        (right.description || right.name).toLowerCase().includes(profileSearchQuery.toLowerCase()) ||
                                        (right.category || '').toLowerCase().includes(profileSearchQuery.toLowerCase())
                                      )
                                    : allBrokerRights

                                  return filteredRights.length > 0 ? (
                                    <div className="bg-white rounded-lg border border-slate-300 p-3">
                                      <div className="mb-2 pb-2 border-b border-slate-300">
                                        <h4 className="text-sm font-semibold text-slate-900">
                                          Rights ({editableRolePermissions.length} selected)
                                          {profileSearchQuery && ` - ${filteredRights.length} match${filteredRights.length !== 1 ? 'es' : ''}`}
                                        </h4>
                                      </div>
                                      <div className="space-y-2 pr-2">
                                        {Object.entries(
                                          filteredRights.reduce((acc, right) => {
                                            const category = right.category || 'Other'
                                            if (!acc[category]) acc[category] = []
                                            acc[category].push(right)
                                            return acc
                                          }, {} as Record<string, typeof allBrokerRights>)
                                        ).map(([category, categoryRights]) => (
                                          <div key={category} className="bg-white rounded-md p-2.5 border border-slate-300">
                                            <h5 className="font-semibold text-xs text-slate-800 mb-2 uppercase tracking-wide">{category}</h5>
                                            <div className="space-y-1">
                                              {categoryRights.map((right) => (
                                                <label 
                                                  key={right.id} 
                                                  className={`flex items-center cursor-pointer px-2 py-1.5 rounded-md transition-all ${
                                                    editableRolePermissions.includes(right.id) 
                                                      ? 'bg-blue-100 border border-slate-300' 
                                                      : 'bg-white border border-transparent hover:border-slate-300'
                                                  }`}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={editableRolePermissions.includes(right.id)}
                                                    onChange={() => handleRolePermissionToggle(right.id)}
                                                    className="w-3.5 h-3.5 text-slate-600 border-slate-300 rounded focus:ring-slate-400"
                                                  />
                                                  <span className={`ml-2.5 text-xs ${
                                                    editableRolePermissions.includes(right.id) ? 'text-slate-900 font-medium' : 'text-slate-700'
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
                                      <p className="text-sm text-slate-500">No rights found matching "{profileSearchQuery}"</p>
                                    </div>
                                  )
                                })()
                              ) : (
                                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-300">
                                  <p className="text-sm text-slate-500">No rights available.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Show message when no profile selected */}
                        {!selectedProfile && !profilesLoading && brokerProfiles?.profiles && brokerProfiles.profiles.length > 0 && (
                          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-slate-300">
                            <svg className="w-16 h-16 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm text-slate-600 font-medium mb-1">No Profile Selected</p>
                            <p className="text-xs text-slate-500">Select a profile from the dropdown above to view and edit its rights.</p>
                          </div>
                        )}
                          {/* Close scrollable container for Assign Profile tab */}
                        </div>
                      </motion.div>
                    )}

                    {/* Rights Tab - Only for EDIT (not for create) */}
                    {activeTab === 'rights' && broker && (
                      <motion.div
                        key="rights"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="text-base font-semibold text-slate-900 mb-1">Broker Rights</h3>
                              <p className="text-xs text-slate-600">Select the rights assigned to this broker.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSelectAllRights}
                                disabled={!allBrokerRights || allBrokerRights.length === 0}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Select All Rights
                              </button>
                              <button
                                type="button"
                                onClick={handleDeselectAllRights}
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
                        </div>

                        {allRightsLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div>
                          </div>
                        ) : allBrokerRights && allBrokerRights.length > 0 ? (
                          <div className="bg-white rounded-lg border border-slate-300 p-3 max-h-[340px] overflow-y-auto custom-scrollbar">
                            <div className="mb-2 pb-2 border-b border-slate-300">
                              <h4 className="text-sm font-semibold text-slate-900">
                                Rights ({selectedRights.length} selected)
                              </h4>
                            </div>
                            <div className="space-y-2 pr-2">
                              {/* Group rights by category */}
                              {Object.entries(
                                allBrokerRights.reduce((acc, right) => {
                                  const category = right.category || 'Other'
                                  if (!acc[category]) acc[category] = []
                                  acc[category].push(right)
                                  return acc
                                }, {} as Record<string, typeof allBrokerRights>)
                              ).map(([category, categoryRights]) => (
                                <div key={category} className="bg-white rounded-md p-2.5 border border-slate-300">
                                  <h5 className="font-semibold text-xs text-slate-800 mb-2 uppercase tracking-wide">{category}</h5>
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
                      </motion.div>
                    )}

                    {activeTab === 'account-mapping' && (
                      <motion.div
                        key="account-mapping"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className=""
                      >
                        {/* Scrollable container for Add Account Mapping section */}
                        <div className="max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 mb-1">Account Mappings</h3>
                            <p className="text-xs text-slate-600">Configure field mapping conditions for this broker.</p>
                          </div>
                          
                          {/* Match All Condition Toggle */}
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-slate-700">Match All Mappings</span>
                            <button
                              type="button"
                              onClick={() => handleMatchAllConditionToggle()}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1 ${
                                formData.match_all_condition === true ? 'bg-blue-700' : 'bg-blue-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  formData.match_all_condition === true ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">
                              {formData.match_all_condition === true ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </div>

                        {/* Loading state for account mappings */}
                        {accountMappingsLoading && broker?.id && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-medium text-slate-700">Loading Mappings...</h4>
                            </div>
                            <div className="space-y-2">
                              {[...Array(2)].map((_, i) => (
                                <div key={i} className="p-2.5 bg-blue-100 rounded-md animate-pulse">
                                  <div className="h-3 bg-blue-300 rounded w-3/4"></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Existing Mappings List */}
                        {!accountMappingsLoading && accountMappings && accountMappings.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-slate-700">Current Mappings <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-slate-700 rounded text-[10px]">{accountMappings.length}</span></h4>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {accountMappings.filter(mapping => mapping && mapping.field_name).map((mapping) => (
                                <div key={mapping.id} className="flex items-center justify-between p-2.5 bg-white rounded-md border border-slate-300 hover:border-slate-300 hover:shadow-sm transition-all">
                                  <div className="flex-1">
                                    <span className="text-xs text-slate-700">
                                      <strong className="text-slate-900">{mapping.field_name}</strong> 
                                      <span className="mx-1.5 px-1.5 py-0.5 bg-blue-100 text-slate-800 rounded text-[10px] font-semibold">{mapping.operator_type}</span> 
                                      <strong className="text-green-600">{mapping.field_value}</strong>
                                    </span>
                                    {mapping.created_at && (
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        {new Date(mapping.created_at).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMapping(mapping.id)}
                                    disabled={deleteAccountMappingMutation.isLoading}
                                    className="ml-2 p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                  >
                                    {deleteAccountMappingMutation.isLoading ? (
                                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-600"></div>
                                    ) : (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending Mappings List (for new brokers) */}
                        {!broker && pendingMappings.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-slate-700">Pending <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">{pendingMappings.length}</span></h4>
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Saved with broker</span>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {pendingMappings.map((mapping) => (
                                <div key={mapping.id} className="flex items-center justify-between p-2.5 bg-amber-50 rounded-md border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all">
                                  <div className="flex-1">
                                    <span className="text-xs text-slate-700">
                                      <strong className="text-slate-900">{mapping.field_name}</strong> 
                                      <span className="mx-1.5 px-1.5 py-0.5 bg-blue-100 text-slate-800 rounded text-[10px] font-semibold">{mapping.operator_type}</span> 
                                      <strong className="text-green-600">{mapping.field_value}</strong>
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePendingMapping(mapping.id)}
                                    className="ml-2 p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add New Mapping Form */}
                        <div className="border border-slate-300 rounded-lg p-3.5 bg-gradient-to-br from-white to-white shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-slate-800">Add New Mapping</h4>
                            <button
                              type="button"
                              onClick={broker?.id ? handleAccountMappingSubmit : handleAddPendingMapping}
                              disabled={createAccountMappingMutation.isLoading}
                              className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-md text-slate-700 bg-white hover:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              {createAccountMappingMutation.isLoading ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  {broker?.id ? 'Add Mapping' : 'Add'}
                                </>
                              )}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Field *
                              </label>
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (fieldMenu) return closeFieldMenu()
                                  const r = e.currentTarget.getBoundingClientRect()
                                  setFieldMenu({ top: r.bottom + 4, left: r.left, width: r.width })
                                }}
                                className={`w-full px-2.5 py-2 text-xs border rounded-md text-left bg-white flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-300 ${
                                  accountMappingErrors.field_name ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                }`}
                              >
                                <span className={accountMappingData.field_name ? 'text-slate-900' : 'text-slate-500'}>
                                  {ACCOUNT_MAPPING_FIELDS.flatMap(g => g.options).find(o => o.value === accountMappingData.field_name)?.label || '-- Select Field --'}
                                </span>
                                <svg className="w-3 h-3 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                              </button>
                              {fieldMenu && (
                                <>
                                  <div className="fixed inset-0 z-[60]" onClick={closeFieldMenu} />
                                  <div
                                    ref={fieldMenuRef}
                                    className="fixed z-[61] bg-white border border-slate-300 rounded-md shadow-lg overflow-y-auto py-1"
                                    style={{
                                      top: fieldMenu.top,
                                      left: fieldMenu.left,
                                      width: fieldMenu.width,
                                      maxHeight: Math.max(120, Math.min(260, window.innerHeight - fieldMenu.top - 12))
                                    }}
                                  >
                                    {ACCOUNT_MAPPING_FIELDS.map(group => (
                                      <div key={group.label}>
                                        <div className="px-2.5 py-1 text-[11px] font-bold text-slate-800">{group.label}</div>
                                        {group.options.map(opt => (
                                          <button
                                            type="button"
                                            key={opt.value}
                                            onClick={() => {
                                              setAccountMappingData(prev => ({
                                                ...prev,
                                                field_name: opt.value,
                                                // Auto-set appropriate operator based on field type
                                                operator_type: opt.value === 'Account' ? '=' : 'LIKE'
                                              }))
                                              if (accountMappingErrors.field_name) {
                                                setAccountMappingErrors(prev => ({ ...prev, field_name: '' }))
                                              }
                                              closeFieldMenu()
                                            }}
                                            className={`w-full text-left pl-5 pr-2.5 py-1.5 text-xs hover:bg-slate-100 ${
                                              accountMappingData.field_name === opt.value ? 'bg-slate-100 font-semibold' : ''
                                            }`}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                              {accountMappingErrors.field_name && (
                                <p className="mt-1 text-[10px] text-red-600">{accountMappingErrors.field_name}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Type
                              </label>
                              <select
                                name="operator_type"
                                value={accountMappingData.operator_type}
                                onChange={(e) => setAccountMappingData(prev => ({ ...prev, operator_type: e.target.value }))}
                                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-300"
                                disabled={!accountMappingData.field_name}
                              >
                                {/* Account field operators */}
                                {accountMappingData.field_name === 'Account' && (
                                  <>
                                    <option value="=">=</option>
                                    <option value="IN">IN</option>
                                    <option value="Range">Range</option>
                                    <option value=">">&gt;</option>
                                    <option value="<">&lt;</option>
                                    <option value=">=">&gt;=</option>
                                    <option value="<=">&lt;=</option>
                                  </>
                                )}
                                {/* Text field operators (including Group) */}
                                {accountMappingData.field_name && accountMappingData.field_name !== 'Account' && (
                                  <>
                                    <option value="=">=</option>
                                    <option value="LIKE">LIKE</option>
                                    <option value="STARTS_WITH">STARTS_WITH</option>
                                    <option value="CONTAINS">CONTAINS</option>
                                    <option value="ENDS_WITH">ENDS_WITH</option>
                                    <option value="NOT_CONTAINS">NOT_CONTAINS</option>
                                  </>
                                )}
                                {/* Default when no field selected */}
                                {!accountMappingData.field_name && (
                                  <option value="">Select field first</option>
                                )}
                              </select>
                            </div>

                            <div className="relative">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Value *
                              </label>
                              <input
                                type="text"
                                name="field_value"
                                value={accountMappingData.field_value}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setAccountMappingData(prev => ({ ...prev, field_value: value }))
                                  if (accountMappingErrors.field_value) {
                                    setAccountMappingErrors(prev => ({ ...prev, field_value: '' }))
                                  }
                                  // Fetch suggestions for searchable fields
                                  if (['Name', 'LastName', 'MiddleName', 'Email', 'Account'].includes(accountMappingData.field_name)) {
                                    if (value.length > 0) {
                                      fetchMT5Suggestions(accountMappingData.field_name, value)
                                    }
                                  }
                                  setShowSuggestions(true)
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                className={`w-full px-2.5 py-2 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-300 ${
                                  accountMappingErrors.field_value ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                }`}
                                placeholder={accountMappingData.field_name ? `Select or type ${accountMappingData.field_name.toLowerCase()}` : "Select field first"}
                                disabled={!accountMappingData.field_name}
                                autoComplete="off"
                              />
                              {accountMappingErrors.field_value && (
                                <p className="mt-1 text-[10px] text-red-600">{accountMappingErrors.field_value}</p>
                              )}
                              
                              {/* Suggestions Dropdown */}
                              {showSuggestions && mt5Suggestions.length > 0 && accountMappingData.field_name && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                  {mt5Suggestions.map((suggestion, index) => (
                                    <div
                                      key={index}
                                      onClick={() => {
                                        setAccountMappingData(prev => ({ ...prev, field_value: suggestion }))
                                        setShowSuggestions(false)
                                      }}
                                      className="px-3 py-2 text-xs cursor-pointer hover:bg-white border-b border-slate-300 last:border-b-0 transition-colors"
                                    >
                                      <span className="text-slate-700">{suggestion}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Field Reference Table */}
                          <div className="bg-white rounded-md border border-slate-300 overflow-hidden">
                            <div className="bg-white px-2 py-1.5 border-b border-slate-300">
                              <h5 className="text-[10px] font-semibold text-slate-800 uppercase tracking-wide">Available Fields & Operators</h5>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[10px]">
                                <thead className="bg-white">
                                  <tr>
                                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700 border-b border-slate-300">Field</th>
                                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700 border-b border-slate-300">Operators</th>
                                    <th className="px-2 py-1.5 text-left font-semibold text-slate-700 border-b border-slate-300">Example Values</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  <tr className="hover:bg-white transition-colors">
                                    <td className="px-2 py-1.5 text-slate-700 font-medium">Account</td>
                                    <td className="px-2 py-1.5 text-slate-600">=, &lt;, &gt;, &gt;=, &lt;=, IN, Range</td>
                                    <td className="px-2 py-1.5 text-slate-600">1234, 1234-2000, 1234,4343,2144</td>
                                  </tr>
                                  <tr className="hover:bg-white transition-colors">
                                    <td className="px-2 py-1.5 text-slate-700 font-medium">Group</td>
                                    <td className="px-2 py-1.5 text-slate-600">=</td>
                                    <td className="px-2 py-1.5 text-slate-600">Aamir</td>
                                  </tr>
                                  <tr className="hover:bg-white transition-colors">
                                    <td className="px-2 py-1.5 text-slate-700 font-medium">Name, Email, Phone, etc.</td>
                                    <td className="px-2 py-1.5 text-slate-600">LIKE, STARTS_WITH, CONTAINS, ENDS_WITH, NOT_CONTAINS</td>
                                    <td className="px-2 py-1.5 text-slate-600">Aam%, Aam, ami, mir, am</td>
                                  </tr>
                                  <tr className="hover:bg-white transition-colors">
                                    <td className="px-2 py-1.5 text-slate-700 font-medium" colSpan={3}>
                                      <div className="flex flex-wrap gap-1">
                                        <span className="text-slate-500">Text Fields:</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">LastName</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">MiddleName</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">Company</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">Status</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">LeadCampaign</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">LeadSource</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">Country</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">State</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">City</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">ZipCode</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">Address</span>
                                        <span className="px-1 py-0.5 bg-blue-100 text-slate-700 rounded text-[9px]">Comment</span>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                            {/* End scrollable container */}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-2.5 border-t border-slate-300 bg-white px-6 py-3">
                  <div className="flex space-x-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-1.5 text-sm border-2 rounded-lg transition-all duration-200 font-medium border-slate-300 text-slate-700 hover:bg-white"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    {activeTab === 'account-mapping' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className="px-4 py-1.5 text-sm border-2 rounded-lg transition-all duration-200 font-medium border-slate-300 text-slate-700 hover:bg-white"
                        disabled={isLoading}
                      >
                        ← Back
                      </button>
                    )}
                  </div>
                  
                  <div className="flex space-x-2.5">
                    {activeTab === 'basic' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (validateForm()) {
                            setActiveTab('account-mapping')
                          }
                        }}
                        className="px-5 py-1.5 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-all duration-200 font-medium shadow-sm flex items-center gap-1.5"
                      >
                        Next: Account Mapping
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : activeTab === 'account-mapping' ? (
                      <div className="flex space-x-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab(broker ? 'rights' : 'profiles')}
                          className="px-5 py-1.5 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-all duration-200 font-medium shadow-sm flex items-center gap-1.5"
                        >
                          Next: {broker ? 'Rights' : 'Assign Profile'}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-1.5 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                          disabled={isLoading || syncRightsMutation.isLoading}
                        >
                          {isLoading || syncRightsMutation.isLoading ? (
                            <div className="flex items-center gap-1.5">
                              <svg className="animate-spin h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {broker ? 'Updating...' : 'Creating...'}
                            </div>
                          ) : (
                            <span>{broker ? 'Update Broker' : 'Create Broker'}</span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        className="px-5 py-1.5 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                        disabled={isLoading || syncRightsMutation.isLoading}
                      >
                        {isLoading || syncRightsMutation.isLoading ? (
                          <div className="flex items-center gap-1.5">
                            <svg className="animate-spin h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {broker ? 'Updating...' : 'Creating...'}
                          </div>
                        ) : (
                          <span>{broker ? 'Update Broker' : 'Create Broker'}</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default BrokerModal

