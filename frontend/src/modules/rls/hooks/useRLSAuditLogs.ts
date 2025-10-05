import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/services/api/client'

export interface RLSAuditLog {
  id: number
  request_id?: string
  session_id?: string
  user_id?: number
  policy_id?: number
  entity_type: string
  entity_id?: number
  action: string
  access_granted: boolean
  denial_reason?: string
  table_name?: string
  sql_query?: string
  applied_conditions?: Record<string, any>
  ip_address?: string
  user_agent?: string
  request_method?: string
  request_path?: string
  created_at: string
  // Relations
  user?: {
    id: number
    email: string
    name: string
  }
  policy?: {
    id: number
    name: string
    policy_type: string
  }
}

export interface RLSAuditStats {
  period_days: number
  total_attempts: number
  granted_count: number
  denied_count: number
  success_rate: number
  top_denied_reasons: Array<{
    reason: string
    count: number
  }>
  entity_type_stats: Array<{
    entity_type: string
    count: number
  }>
}

const RLS_AUDIT_LOGS_QUERY_KEY = 'rls-audit-logs'
const RLS_AUDIT_STATS_QUERY_KEY = 'rls-audit-stats'

export function useRLSAuditLogs(params?: {
  user_id?: number
  entity_type?: string
  action?: string
  access_granted?: boolean
  from_date?: string
  to_date?: string
  skip?: number
  limit?: number
}) {
  return useQuery({
    queryKey: [RLS_AUDIT_LOGS_QUERY_KEY, params],
    queryFn: async (): Promise<RLSAuditLog[]> => {
      const searchParams = new URLSearchParams()
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value))
          }
        })
      }
      
      const response = await apiClient.get(`/api/v1/rls/audit-logs?${searchParams.toString()}`)
      return response.data
    },
  })
}

export function useRLSAuditLog(id: number) {
  return useQuery({
    queryKey: [RLS_AUDIT_LOGS_QUERY_KEY, id],
    queryFn: async (): Promise<RLSAuditLog> => {
      const response = await apiClient.get(`/api/v1/rls/audit-logs/${id}`)
      return response.data
    },
    enabled: !!id
  })
}

export function useRLSAuditStats(days: number = 7) {
  return useQuery({
    queryKey: [RLS_AUDIT_STATS_QUERY_KEY, days],
    queryFn: async (): Promise<RLSAuditStats> => {
      const response = await apiClient.get(`/api/v1/rls/audit-logs/stats?days=${days}`)
      return response.data
    },
  })
}