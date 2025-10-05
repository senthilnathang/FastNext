import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/services/api/client'

export interface RLSPolicy {
  id: number
  name: string
  description?: string
  entity_type: string
  table_name: string
  policy_type: string
  action: string
  condition_column?: string
  condition_value_source?: string
  custom_condition?: string
  required_roles?: string[]
  required_permissions?: string[]
  is_active: boolean
  priority: number
  organization_id?: number
  created_by: number
  created_at: string
  updated_at?: string
}

export interface CreateRLSPolicyRequest {
  name: string
  description?: string
  entity_type: string
  table_name: string
  policy_type: string
  action: string
  condition_column?: string
  condition_value_source?: string
  custom_condition?: string
  required_roles?: string[]
  required_permissions?: string[]
  priority?: number
  organization_id?: number
}

export interface UpdateRLSPolicyRequest extends Partial<CreateRLSPolicyRequest> {
  is_active?: boolean
}

const RLS_POLICIES_QUERY_KEY = 'rls-policies'

export function useRLSPolicies() {
  return useQuery({
    queryKey: [RLS_POLICIES_QUERY_KEY],
    queryFn: async (): Promise<RLSPolicy[]> => {
      const response = await apiClient.get('/api/v1/rls/policies')
      return response.data
    },
  })
}

export function useRLSPolicy(id: number) {
  return useQuery({
    queryKey: [RLS_POLICIES_QUERY_KEY, id],
    queryFn: async (): Promise<RLSPolicy> => {
      const response = await apiClient.get(`/api/v1/rls/policies/${id}`)
      return response.data
    },
    enabled: !!id
  })
}

export function useCreateRLSPolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateRLSPolicyRequest): Promise<RLSPolicy> => {
      const response = await apiClient.post('/api/v1/rls/policies', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RLS_POLICIES_QUERY_KEY] })
    },
  })
}

export function useUpdateRLSPolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateRLSPolicyRequest }): Promise<RLSPolicy> => {
      const response = await apiClient.put(`/api/v1/rls/policies/${id}`, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [RLS_POLICIES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [RLS_POLICIES_QUERY_KEY, id] })
    },
  })
}

export function useDeleteRLSPolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/v1/rls/policies/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RLS_POLICIES_QUERY_KEY] })
    },
  })
}