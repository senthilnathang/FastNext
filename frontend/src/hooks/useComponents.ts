import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { componentsApi } from '@/lib/api/components'
import type { 
  CreateComponentRequest, 
  CreateComponentInstanceRequest,
  UpdateComponentInstanceRequest 
} from '@/types'

export const useComponents = (params?: { project_id?: number; is_global?: boolean }) => {
  return useQuery({
    queryKey: ['components', params],
    queryFn: () => componentsApi.getComponents(params),
  })
}

export const useComponent = (id: number) => {
  return useQuery({
    queryKey: ['components', id],
    queryFn: () => componentsApi.getComponent(id),
    enabled: !!id,
  })
}

export const usePageComponents = (pageId: number) => {
  return useQuery({
    queryKey: ['page-components', pageId],
    queryFn: () => componentsApi.getPageComponents(pageId),
    enabled: !!pageId,
  })
}

export const useCreateComponent = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateComponentRequest) => componentsApi.createComponent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['components'] })
    },
  })
}

export const useCreateComponentInstance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateComponentInstanceRequest) => 
      componentsApi.createComponentInstance(data),
    onSuccess: (_, { page_id }) => {
      queryClient.invalidateQueries({ queryKey: ['page-components', page_id] })
    },
  })
}

export const useUpdateComponentInstance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateComponentInstanceRequest }) =>
      componentsApi.updateComponentInstance(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['page-components', data.page_id] })
    },
  })
}

export const useDeleteComponentInstance = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => componentsApi.deleteComponentInstance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-components'] })
    },
  })
}