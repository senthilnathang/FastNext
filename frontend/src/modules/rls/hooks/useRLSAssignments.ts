import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/services/api/client'

export interface RLSRuleAssignment {
  id?: number
  policy_id: number
  entity_type: string
  entity_id?: number
  user_id?: number
  role_id?: number
  is_active: boolean
  conditions?: Record<string, any>
  created_by?: number
  created_at?: string
  // Relations
  policy?: {
    id: number
    name: string
    policy_type: string
  }
  user?: {
    id: number
    email: string
    name: string
  }
  role?: {
    id: number
    name: string
  }
}

export interface CreateRLSAssignmentRequest {
  policy_id: number
  entity_type: string
  entity_id?: number
  user_id?: number
  role_id?: number
  conditions?: Record<string, any>
}

export interface UpdateRLSAssignmentRequest extends Partial<CreateRLSAssignmentRequest> {
  is_active?: boolean
}

const RLS_ASSIGNMENTS_QUERY_KEY = 'rls-assignments'

export function useRLSAssignments() {
  return useQuery({
    queryKey: [RLS_ASSIGNMENTS_QUERY_KEY],
    queryFn: async (): Promise<RLSRuleAssignment[]> => {
      const response = await apiClient.get('/api/v1/rls/rule-assignments')
      return response.data
    },
  })
}

export function useRLSAssignment(id: number) {
  return useQuery({
    queryKey: [RLS_ASSIGNMENTS_QUERY_KEY, id],
    queryFn: async (): Promise<RLSRuleAssignment> => {
      const response = await apiClient.get(`/api/v1/rls/rule-assignments/${id}`)
      return response.data
    },
    enabled: !!id
  })
}

export function useCreateRLSAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateRLSAssignmentRequest): Promise<RLSRuleAssignment> => {
      const response = await apiClient.post('/api/v1/rls/rule-assignments', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RLS_ASSIGNMENTS_QUERY_KEY] })
    },
  })
}

export function useUpdateRLSAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateRLSAssignmentRequest }): Promise<RLSRuleAssignment> => {
      const response = await apiClient.put(`/api/v1/rls/rule-assignments/${id}`, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [RLS_ASSIGNMENTS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [RLS_ASSIGNMENTS_QUERY_KEY, id] })
    },
  })
}

export function useDeleteRLSAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/v1/rls/rule-assignments/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RLS_ASSIGNMENTS_QUERY_KEY] })
    },
  })
}
