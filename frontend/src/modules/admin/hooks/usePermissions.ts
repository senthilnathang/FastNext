import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  permissionsApi,
  type CreatePermissionRequest,
  type UpdatePermissionRequest,
  type PermissionListParams
} from '@/shared/services/api/permissions'

// Query keys for permissions
export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: (params?: PermissionListParams) => [...permissionKeys.lists(), params] as const,
  details: () => [...permissionKeys.all, 'detail'] as const,
  detail: (id: number) => [...permissionKeys.details(), id] as const,
  categories: () => [...permissionKeys.all, 'categories'] as const,
  categoriesList: () => [...permissionKeys.all, 'categories-list'] as const,
  actions: () => [...permissionKeys.all, 'actions'] as const,
}

// Query hooks
export const usePermissions = (params?: PermissionListParams) => {
  return useQuery({
    queryKey: permissionKeys.list(params),
    queryFn: () => permissionsApi.getPermissions(params),
    placeholderData: (previousData) => previousData,
  })
}

export const usePermissionsByCategory = () => {
  return useQuery({
    queryKey: permissionKeys.categories(),
    queryFn: permissionsApi.getPermissionsByCategory,
    staleTime: 10 * 60 * 1000, // 10 minutes - permissions don't change often
  })
}

export const usePermission = (id: number) => {
  return useQuery({
    queryKey: permissionKeys.detail(id),
    queryFn: () => permissionsApi.getPermission(id),
    enabled: !!id && id > 0,
  })
}

export const usePermissionCategories = () => {
  return useQuery({
    queryKey: permissionKeys.categoriesList(),
    queryFn: permissionsApi.getPermissionCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes - categories rarely change
  })
}

export const usePermissionActions = () => {
  return useQuery({
    queryKey: permissionKeys.actions(),
    queryFn: permissionsApi.getPermissionActions,
    staleTime: 30 * 60 * 1000, // 30 minutes - actions rarely change
  })
}

// Mutation hooks
export const useCreatePermission = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePermissionRequest) => permissionsApi.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: permissionKeys.categories() })
    },
    onError: (error) => {
      console.error('Failed to create permission:', error)
    },
  })
}

export const useUpdatePermission = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePermissionRequest }) =>
      permissionsApi.updatePermission(id, data),
    onSuccess: (updatedPermission, { id }) => {
      queryClient.setQueryData(permissionKeys.detail(id), updatedPermission)
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: permissionKeys.categories() })
    },
    onError: (error) => {
      console.error('Failed to update permission:', error)
    },
  })
}

export const useDeletePermission = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => permissionsApi.deletePermission(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: permissionKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: permissionKeys.categories() })
    },
    onError: (error) => {
      console.error('Failed to delete permission:', error)
    },
  })
}
