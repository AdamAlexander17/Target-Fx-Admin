import { User, Permission } from '../types'
import { authService } from '../services/authService'

// Permission name constants - MUST match backend permission names exactly
export const PERMISSIONS = {
 // User permissions
 USERS_VIEW: 'users.view',
 USERS_CREATE: 'users.create',
 USERS_EDIT: 'users.edit',
 USERS_DELETE: 'users.delete',
 USERS_ASSIGN_ROLES: 'users.assign_roles',
 USERS_CHANGE_PASSWORD: 'users.change_password',
 
 // Broker Account permissions (brokers.*)
 BROKERS_VIEW: 'brokers.view',
 BROKERS_CREATE: 'brokers.create',
 BROKERS_EDIT: 'brokers.edit',
 BROKERS_DELETE: 'brokers.delete',
 BROKERS_ASSIGN_RIGHTS: 'brokers.assign_rights',
 
 // Broker Profile permissions (broker.profile.*)
 BROKER_PROFILE_VIEW: 'broker.profile.view',
 BROKER_PROFILE_CREATE: 'broker.profile.create',
 BROKER_PROFILE_UPDATE: 'broker.profile.update',
 BROKER_PROFILE_DELETE: 'broker.profile.delete',
 
 // Role permissions
 ROLES_VIEW: 'roles.view',
 ROLES_CREATE: 'roles.create',
 ROLES_EDIT: 'roles.edit',
 ROLES_DELETE: 'roles.delete',
 ROLES_ASSIGN_PERMISSIONS: 'roles.assign_permissions',
 
 // Group/Client permissions
 GROUPS_VIEW: 'client.view',
 GROUPS_CREATE: 'client.create',
 GROUPS_EDIT: 'client.edit',
 GROUPS_DELETE: 'client.delete',
 
 // Trade permissions
 TRADE_VIEW: 'trade.view',
 TRADE_CREATE: 'trade.create',
 TRADE_EDIT: 'trade.edit',
 TRADE_DELETE: 'trade.delete',
 
 // Portfolio permissions
 PROFILE_VIEW: 'portfolio.view',
 PROFILE_EDIT: 'portfolio.edit',
 
 // Market permissions
 MARKET_VIEW: 'market.view',
 
 // Analytics/Dashboard permissions
 DASHBOARD_VIEW: 'analytics.view',
 
 // Reports permissions
 REPORTS_GENERATE: 'reports.generate',
 
 // System permissions
 SYSTEM_ADMIN: 'system.admin',
 TELEGRAM_BROADCAST: 'telegram.broadcast',
 API_ACCESS: 'api.access',
 AUDIT_READ: 'audit.read',
 
 // MT5 permissions
 MT5_CONNECTION_MANAGE: 'mt5.connection.manage',
 MT5_CONNECTION_VIEW: 'mt5.connection.view',
 MT5_USER_VIEW: 'mt5.user.view',
 MT5_ACCOUNT_VIEW: 'mt5.account.view',
 MT5_DEALS_VIEW: 'mt5.deals.view',
 MT5_DEALS_MANAGE: 'mt5.deals.manage',
 MT5_BALANCE_DEPOSIT: 'mt5.balance.deposit',
 MT5_BALANCE_WITHDRAW: 'mt5.balance.withdraw',
 MT5_BALANCE_MANAGE: 'mt5.balance.manage',
 MT5_USERS_BATCH: 'mt5.users.batch',
 
 // Rule Definition permissions — backend uses 'manage_rules' for all rule operations
 RULES: 'rules', // Generic legacy shortcut
 MANAGE_RULES: 'manage_rules', // Actual backend permission (covers view/create/edit/delete)
 RULES_VIEW: 'manage_rules',
 RULES_CREATE: 'manage_rules',
 RULES_EDIT: 'manage_rules',
 RULES_DELETE: 'manage_rules',

 // Logs
 LOGS_VIEW: 'logs.view',
 AUDIT_LOGS_VIEW: 'audit.read',
} as const

// Module constants
export const MODULES = {
 DASHBOARD: 'dashboard',
 USERS: 'users',
 BROKERS: 'brokers', // Broker Accounts (brokers.*)
 BROKER_PROFILES: 'broker_profiles', // Broker Profiles (broker.profile.*)
 ROLES: 'roles',
 GROUPS: 'groups', // Clients
 TRADES: 'trades',
 RULES: 'rules', // Rule Definitions
 AUDIT_LOGS: 'audit_logs',
 LOGS: 'logs', // System/MT5 logs (requires system.admin)
 PROFILE: 'profile', // Portfolio/Settings
 SETTLEMENT_WEEKS: 'settlement_weeks', // Settlement-week CRUD
 TUTORIALS: 'tutorials', // Tutorial videos CRUD
 BROKER_ACTIVITY: 'broker_activity', // Live broker usage (needs brokers.view)
 TELEGRAM_BROADCASTS: 'telegram_broadcasts', // Telegram broadcasts (needs telegram.broadcast)
} as const

// Default mapping (fallback when backend doesn't send permissions)
// This is used when roles come as strings instead of objects with permissions
let ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
 // Admin roles - full access
 'admin': Object.values(PERMISSIONS),
 'administrator': Object.values(PERMISSIONS),
 'super admin': Object.values(PERMISSIONS),
 'superadmin': Object.values(PERMISSIONS),
 
 // Broker role - can manage brokers and view users
 'broker': [
 PERMISSIONS.DASHBOARD_VIEW,
 PERMISSIONS.BROKERS_VIEW,
 PERMISSIONS.BROKERS_CREATE,
 PERMISSIONS.BROKERS_EDIT,
 PERMISSIONS.USERS_VIEW,
 PERMISSIONS.PROFILE_VIEW,
 PERMISSIONS.PROFILE_EDIT,
 ],
 
 // Viewer role - read-only access
 'viewer': [
 PERMISSIONS.DASHBOARD_VIEW,
 PERMISSIONS.USERS_VIEW,
 PERMISSIONS.BROKERS_VIEW,
 PERMISSIONS.BROKER_PROFILE_VIEW,
 PERMISSIONS.ROLES_VIEW,
 PERMISSIONS.GROUPS_VIEW,
 PERMISSIONS.AUDIT_READ,
 PERMISSIONS.PROFILE_VIEW,
 ],
 
 // Analyst role - can view and analyze data
 'analyst': [
 PERMISSIONS.DASHBOARD_VIEW,
 PERMISSIONS.USERS_VIEW,
 PERMISSIONS.BROKERS_VIEW,
 PERMISSIONS.BROKER_PROFILE_VIEW,
 PERMISSIONS.AUDIT_READ,
 PERMISSIONS.REPORTS_GENERATE,
 PERMISSIONS.PROFILE_VIEW,
 ],
 
 // Client role - limited access
 'client': [
 PERMISSIONS.DASHBOARD_VIEW,
 PERMISSIONS.PROFILE_VIEW,
 PERMISSIONS.PROFILE_EDIT,
 ],
 
 // Moderator roles
 'moderator': [
 PERMISSIONS.DASHBOARD_VIEW,
 PERMISSIONS.USERS_VIEW,
 PERMISSIONS.BROKERS_VIEW,
 PERMISSIONS.BROKERS_EDIT,
 PERMISSIONS.BROKER_PROFILE_VIEW,
 PERMISSIONS.BROKER_PROFILE_UPDATE,
 PERMISSIONS.GROUPS_VIEW,
 PERMISSIONS.GROUPS_EDIT,
 PERMISSIONS.AUDIT_READ,
 PERMISSIONS.PROFILE_VIEW,
 PERMISSIONS.PROFILE_EDIT,
 ],
}

// Function to update role permissions map dynamically from backend
export const setRolePermissionsMap = (roles: any[]) => {
 roles.forEach(role => {
 if (role && role.name && role.permissions && Array.isArray(role.permissions)) {
 const roleName = role.name.toLowerCase().trim()
 const permissions = role.permissions.map((p: any) => p.name).filter(Boolean)
 ROLE_PERMISSIONS_MAP[roleName] = permissions
 }
 })
}

// Get current user from localStorage
export const getCurrentUser = (): User | null => {
 return authService.getCurrentUser()
}

// Extract all permissions from user's roles
export const getUserPermissions = (user: User | null): string[] => {
 if (!user) {
 return []
 }

 // Prefer explicit permissions from /api/auth/me when present.
 // This ensures live permission updates take effect immediately without logout,
 // even for roles like "admin" that previously relied on fallback role maps.
 if (Array.isArray((user as any).permissions) && (user as any).permissions.length > 0) {
 const directPermissions = (user as any).permissions
  .map((permission: any) => typeof permission === 'string' ? permission : permission?.name)
  .filter(Boolean)

 console.log('🎯 getUserPermissions - Using explicit auth/me permissions:', directPermissions)
 return Array.from(new Set(directPermissions))
 }

 if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
 return []
 }

 console.log('🔍 getUserPermissions - Processing roles:', user.roles)
 const permissions = new Set<string>()
 
 user.roles.forEach((role: any, index: number) => {
 console.log(`🔍 getUserPermissions - Role ${index}:`, role, 'Type:', typeof role)
 
 // Case 1: Role is a string (backend sends role names only)
 if (typeof role === 'string') {
 const roleName = role.toLowerCase().trim()
 console.log(`📝 Role is string: "${roleName}"`)
 const rolePermissions = ROLE_PERMISSIONS_MAP[roleName]
 
 if (rolePermissions) {
 console.log(`✅ Found exact match for "${roleName}":`, rolePermissions.length, 'permissions')
 rolePermissions.forEach(perm => permissions.add(perm))
 } else {
 console.log(`⚠️ No exact match for "${roleName}", checking partial matches...`)
 // Check for partial matches (e.g., 'moderator4' matches 'moderator')
 let foundPartial = false
 for (const [key, perms] of Object.entries(ROLE_PERMISSIONS_MAP)) {
 if (roleName.includes(key.toLowerCase())) {
 console.log(`✅ Found partial match: "${roleName}" contains "${key}"`)
 perms.forEach(perm => permissions.add(perm))
 foundPartial = true
 break
 }
 }
 if (!foundPartial) {
 console.log(`❌ No match found for role: "${roleName}"`)
 }
 }
 }
 // Case 2: Role is an object with permissions array (proper backend response)
 else if (role && typeof role === 'object' && role.permissions && Array.isArray(role.permissions)) {
 console.log(`📦 Role is object with permissions array:`, role.permissions.length, 'permissions')
 role.permissions.forEach((permission: any) => {
 if (permission && permission.name) {
 permissions.add(permission.name)
 }
 })
 }
 // Case 3: Role is an object with name (try to map by name)
 else if (role && typeof role === 'object' && role.name) {
 const roleName = role.name.toLowerCase().trim()
 console.log(`📛 Role is object with name: "${roleName}"`)
 const rolePermissions = ROLE_PERMISSIONS_MAP[roleName]
 
 if (rolePermissions) {
 console.log(`✅ Found exact match for "${roleName}":`, rolePermissions.length, 'permissions')
 rolePermissions.forEach(perm => permissions.add(perm))
 } else {
 console.log(`⚠️ No exact match for "${roleName}", checking partial matches...`)
 // Check for partial matches
 let foundPartial = false
 for (const [key, perms] of Object.entries(ROLE_PERMISSIONS_MAP)) {
 if (roleName.includes(key.toLowerCase())) {
 console.log(`✅ Found partial match: "${roleName}" contains "${key}"`)
 perms.forEach(perm => permissions.add(perm))
 foundPartial = true
 break
 }
 }
 if (!foundPartial) {
 console.log(`❌ No match found for role: "${roleName}"`)
 }
 }
 } else {
 console.log(`❓ Unknown role format:`, role)
 }
 })

 const permArray = Array.from(permissions)
 console.log('🎯 getUserPermissions - Final permissions:', permArray)
 return permArray
}

// Check if user has a specific permission
export const hasPermission = (permissionName: string, user?: User | null): boolean => {
 const currentUser = user || getCurrentUser()
 if (!currentUser) return false

 const userPermissions = getUserPermissions(currentUser)
 return userPermissions.includes(permissionName)
}

// Check if user has any of the specified permissions
export const hasAnyPermission = (permissionNames: string[], user?: User | null): boolean => {
 const currentUser = user || getCurrentUser()
 if (!currentUser) return false

 const userPermissions = getUserPermissions(currentUser)
 return permissionNames.some(permission => userPermissions.includes(permission))
}

// Check if user has all of the specified permissions
export const hasAllPermissions = (permissionNames: string[], user?: User | null): boolean => {
 const currentUser = user || getCurrentUser()
 if (!currentUser) return false

 const userPermissions = getUserPermissions(currentUser)
 return permissionNames.every(permission => userPermissions.includes(permission))
}

export const canViewModule = (module: string, user?: User | null): boolean => {
 // Modules with no explicit permission in the 26-permission set are accessible to all authenticated users
 const viewPermissionMap: { [key: string]: string } = {
 [MODULES.USERS]: PERMISSIONS.USERS_VIEW,
 [MODULES.BROKERS]: PERMISSIONS.BROKERS_VIEW,
 [MODULES.BROKER_ACTIVITY]: PERMISSIONS.BROKERS_VIEW,
 [MODULES.TELEGRAM_BROADCASTS]: PERMISSIONS.TELEGRAM_BROADCAST,
 [MODULES.BROKER_PROFILES]: PERMISSIONS.BROKER_PROFILE_VIEW,
 [MODULES.ROLES]: PERMISSIONS.ROLES_VIEW,
 [MODULES.RULES]: PERMISSIONS.MANAGE_RULES, // backend uses 'manage_rules'
 [MODULES.AUDIT_LOGS]: PERMISSIONS.AUDIT_READ,
 [MODULES.LOGS]: PERMISSIONS.LOGS_VIEW, // backend uses 'logs.view'
 }

 // Dashboard, Groups, Profile, Trades: no matching permission in the 26 — allow all authenticated users
 if (!(module in viewPermissionMap)) {
 return true
 }

 const requiredPermission = viewPermissionMap[module]
 return hasPermission(requiredPermission, user)
}

// Check if user can create in a module
export const canCreate = (module: string, user?: User | null): boolean => {
 const createPermissionMap: { [key: string]: string } = {
 [MODULES.USERS]: PERMISSIONS.USERS_CREATE,
 [MODULES.BROKERS]: PERMISSIONS.BROKERS_CREATE,
 [MODULES.BROKER_PROFILES]: PERMISSIONS.BROKER_PROFILE_CREATE,
 [MODULES.ROLES]: PERMISSIONS.ROLES_CREATE,
 [MODULES.RULES]: PERMISSIONS.MANAGE_RULES, // 'manage_rules' covers all rule operations
 }

 // Groups/Trades: no explicit create permission in the 26 — allow if authenticated
 if (!(module in createPermissionMap)) {
 return !!user
 }

 const requiredPermission = createPermissionMap[module]
 return hasPermission(requiredPermission, user)
}

// Check if user can edit in a module
export const canEdit = (module: string, user?: User | null): boolean => {
 const editPermissionMap: { [key: string]: string } = {
 [MODULES.USERS]: PERMISSIONS.USERS_EDIT,
 [MODULES.BROKERS]: PERMISSIONS.BROKERS_EDIT,
 [MODULES.BROKER_PROFILES]: PERMISSIONS.BROKER_PROFILE_UPDATE,
 [MODULES.ROLES]: PERMISSIONS.ROLES_EDIT,
 [MODULES.RULES]: PERMISSIONS.MANAGE_RULES, // 'manage_rules' covers all rule operations
 }

 // Groups/Trades/Profile: no explicit edit permission in the 26 — allow if authenticated
 if (!(module in editPermissionMap)) {
 return !!user
 }

 const requiredPermission = editPermissionMap[module]
 return hasPermission(requiredPermission, user)
}

// Check if user can delete in a module
export const canDelete = (module: string, user?: User | null): boolean => {
 const deletePermissionMap: { [key: string]: string } = {
 [MODULES.USERS]: PERMISSIONS.USERS_DELETE,
 [MODULES.BROKERS]: PERMISSIONS.BROKERS_DELETE,
 [MODULES.BROKER_PROFILES]: PERMISSIONS.BROKER_PROFILE_DELETE,
 [MODULES.ROLES]: PERMISSIONS.ROLES_DELETE,
 [MODULES.RULES]: PERMISSIONS.MANAGE_RULES, // 'manage_rules' covers all rule operations
 }

 // Groups/Trades: no explicit delete permission in the 26 — allow if authenticated
 if (!(module in deletePermissionMap)) {
 return !!user
 }

 const requiredPermission = deletePermissionMap[module]
 return hasPermission(requiredPermission, user)
}

// Get accessible modules for current user
export const getAccessibleModules = (user?: User | null): string[] => {
 return Object.values(MODULES).filter(module => canViewModule(module, user))
}

// Check if user is admin (has all permissions)
export const isAdmin = (user?: User | null): boolean => {
 const currentUser = user || getCurrentUser()
 if (!currentUser || !currentUser.roles || !Array.isArray(currentUser.roles)) return false

 // Handle both array of strings and array of role objects
 // The API sometimes returns role names as strings instead of role objects
 const hasAdminRole = currentUser.roles.some((role: any) => {
 // If role is a string (e.g., 'admin', 'super admin')
 if (typeof role === 'string') {
 const roleName = role.toLowerCase()
 return roleName.includes('admin') || 
 roleName.includes('super') || 
 roleName === 'administrator' ||
 roleName === 'superuser'
 }
 
 // If role is an object with name property
 if (role && typeof role === 'object' && role.name) {
 const roleName = String(role.name).toLowerCase()
 return roleName.includes('admin') || 
 roleName.includes('super') || 
 roleName === 'administrator' ||
 roleName === 'superuser'
 }
 
 return false
 })

 // Also check if user has role with common admin IDs (1, 2) - only for role objects
 const hasAdminRoleId = currentUser.roles.some((role: any) => 
 role && typeof role === 'object' && role.id && (role.id === 1 || role.id === 2)
 )

 return hasAdminRole || hasAdminRoleId
}

// Debug function to log user permissions
export const debugPermissions = () => {
 const user = getCurrentUser()
 if (!user) {
 console.log('No user logged in')
 return
 }

 console.group('🔐 User Permissions Debug')
 console.log('User:', user.username)
 console.log('Roles:', user.roles?.map(r => r?.name || 'Unknown').join(', ') || 'No roles')
 console.log('Permissions:', getUserPermissions(user))
 console.log('Accessible Modules:', getAccessibleModules())
 console.log('Is Admin:', isAdmin(user))
 console.groupEnd()
}

