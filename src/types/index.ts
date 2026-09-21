export interface User {
 id: number
 username: string
 email: string
 is_active: boolean
 created_at: string
 updated_at: string
 failed_login_attempts: number
 last_failed_login: string | null
 locked_until: string | null
 two_factor_enabled: boolean
 two_factor_secret: string | null
 two_factor_verified_at: string | null
 two_factor_backup_codes: string | null
 permissions?: Array<string | Permission>
 roles: Role[]
}

export interface Role {
 id: number
 name: string
 description: string
 created_at: string
 updated_at: string
 user_count?: number
 permissions?: Permission[]
 users?: User[]
}

export interface Permission {
 id?: number
 permission_id?: number
 name: string
 description: string
 category: string
 rp_id?: number
}

export interface CreateRoleData {
 name: string
 description: string
 permission_ids: number[]
}

export interface UpdateRoleData {
 name?: string
 description?: string
 permission_ids?: number[]
}

export interface CreateUserData {
 username: string
 email: string
 password: string
 is_active: boolean
 role_ids: number[]
}

export interface UpdateUserData {
 username?: string
 email?: string
 is_active?: boolean
 role_ids?: number[]
}

export interface ApiResponse<T> {
 status: string
 message: string
 data: T
}

export interface PaginatedResponse<T> {
 pagination: {
 page: number
 limit: number
 total: number
 pages: number
 }
 users?: T[]
}

export interface UsersResponse {
 pagination: {
 page: number
 limit: number
 total: number
 pages: number
 }
 users: User[]
}

export interface Broker {
 id: number
 username: string
 full_name: string
 email: string
 phone: string
 account_range_from: number
 account_range_to: number
 is_active: boolean
 credit_limit?: number
 default_percentage?: number
 telegram_id?: number
 match_all_condition?: boolean
 clients_count?: number
 account_mappings_count?: number
 group_mappings_count?: number
 rights_count?: number
 last_login_at?: string | null
 created_at: string
 updated_at: string
}

export interface CreateBrokerData {
 username: string
 password?: string
 full_name: string
 email: string
 phone: string
 account_range_from: number
 account_range_to: number
 is_active: boolean
 credit_limit?: number
 default_percentage?: number
 telegram_id?: number
 match_all_condition?: boolean
 right_ids?: number[]
}

export interface UpdateBrokerData {
 username?: string
 password?: string
 full_name?: string
 email?: string
 phone?: string
 account_range_from?: number
 account_range_to?: number
 is_active?: boolean
 credit_limit?: number
 default_percentage?: number
 telegram_id?: number
 match_all_condition?: boolean
 right_ids?: number[]
}

export interface BrokersResponse {
 pagination: {
 page: number
 limit: number
 total: number
 pages: number
 }
 brokers: Broker[]
}

export interface BrokerFilters {
 is_active?: boolean
 has_rights?: boolean
 account_range_from?: number
 account_range_to?: number
 created_from?: string
 created_to?: string
 sort_by?: string
 sort_order?: 'ASC' | 'DESC'
 search?: string
 [key: string]: string | number | boolean | undefined
}

export interface BrokerRight {
 id: number
 name: string
 description: string
 category: string
 assignment_id?: number
}

export interface BrokerRightsResponse {
 rights: BrokerRight[]
 total?: number
}

export interface AssignRightRequest {
 right_id: number
}

export interface SyncRightsRequest {
 right_ids: number[]
}

export interface SyncRightsResponse {
 assigned_rights: number
 broker_id: number
}

export interface AssignRightResponse {
 assignment_id: number
 broker_id: number
 right_id: number
 right_name: string
}

export interface AccountMapping {
 id: number
 field_name: string
 field_value: string
 operator_type: string
 created_at: string
 broker_id?: number
}

export interface CreateAccountMappingData {
 field_name: string
 operator_type: string
 field_value: string
}

export interface UpdateAccountMappingData {
 field_name?: string
 operator_type?: string
 field_value?: string
}

export interface GroupMapping {
 id: number
 group_id: number
 created_at: string
 broker_id?: number
}

export interface CreateGroupMappingData {
 group_id: number
}

export interface AccountMappingsResponse {
 account_mappings: AccountMapping[]
}

export interface GroupMappingsResponse {
 group_mappings: GroupMapping[]
}

// Group interfaces
export interface Group {
 id: number
 mt5_group: string
 broker_view_group: string
 description: string
 is_active: boolean
 created_at: string
 updated_at: string
}

export interface CreateGroupData {
 mt5_group: string
 broker_view_group: string
 description: string
 is_active: boolean
}

export interface UpdateGroupData {
 mt5_group?: string
 broker_view_group?: string
 description?: string
 is_active?: boolean
}

export interface GroupsResponse {
 pagination: {
 page: number
 limit: number
 total: number
 total_pages: number
 }
 groups: Group[]
}

export interface GroupFilters {
 is_active?: boolean
 search?: string
 page?: number
 limit?: number
}

// Audit Log interfaces
export interface AuditLog {
 id: number
 user_id: number | null
 username: string
 action: string
 table_name: string
 record_id: number
 ip_address: string
 user_agent: string
 created_at: string
 old_values?: Record<string, any>
 new_values?: Record<string, any>
 user_email?: string
}

export interface AuditLogsResponse {
 success: boolean
 logs: AuditLog[]
 pagination: {
 current_page: number
 per_page: number
 total_items: number
 total_pages: number
 }
}

export interface AuditLogFilters {
 page?: number
 limit?: number
 action?: string
 user_id?: number
 table_name?: string
 start_date?: string
 end_date?: string
 search?: string
 sort?: string
 order?: 'asc' | 'desc'
}

export interface ExportAuditLogsParams {
 format: 'csv' | 'json'
 action?: string
 user_id?: number
 table_name?: string
 start_date?: string
 end_date?: string
 search?: string
}

// Rule Definition types
export interface Rule {
 id: number
 rule_code: string
 rule_name: string
 description: string
 mt5_field: string
 mt5_value_template: string
 requires_time_parameter: boolean
 is_active: boolean
 created_at: string
 updated_at: string
}

export interface CreateRuleData {
 rule_code: string
 rule_name: string
 description: string
 mt5_field: string
 mt5_value_template: string
 requires_time_parameter: boolean
 is_active: boolean
}

export interface UpdateRuleData {
 rule_code?: string
 rule_name?: string
 description?: string
 mt5_field?: string
 mt5_value_template?: string
 requires_time_parameter?: boolean
 is_active?: boolean
}

