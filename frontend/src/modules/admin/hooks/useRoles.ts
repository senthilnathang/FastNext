import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rolesApi, type CreateRoleRequest, type UpdateRoleRequest, type RoleListParams } from '@/shared/services/api/roles'

// Query keys for roles
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (params?: RoleListParams) => [...roleKeys.lists(), params] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: number) => [...roleKeys.details(), id] as const,
  permissions: (id: number) => [...roleKeys.detail(id), 'permissions'] as const,
}

// Query hooks
export const useRoles = (params?: RoleListParams) => {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => rolesApi.getRoles(params),
    placeholderData: (previousData) => previousData,
  })
}

export const useRole = (id: number) => {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => rolesApi.getRole(id),
    enabled: !!id && id > 0,
  })
}

export const useRolePermissions = (id: number) => {
  return useQuery({
    queryKey: roleKeys.permissions(id),
    queryFn: () => rolesApi.getRolePermissions(id),
    enabled: !!id && id > 0,
  })
}

// Mutation hooks
export const useCreateRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRoleRequest) => rolesApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create role:', error)
    },
  })
}

export const useUpdateRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleRequest }) =>
      rolesApi.updateRole(id, data),
    onSuccess: (updatedRole, { id }) => {
      queryClient.setQueryData(roleKeys.detail(id), updatedRole)
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to update role:', error)
    },
  })
}

export const useDeleteRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => rolesApi.deleteRole(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: roleKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to delete role:', error)
    },
  })
}

export const useToggleRoleStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => rolesApi.toggleRoleStatus(id),
    onSuccess: (updatedRole, id) => {
      queryClient.setQueryData(roleKeys.detail(id), updatedRole)
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to toggle role status:', error)
    },
  })
}

export const useAssignRolePermissions = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      rolesApi.assignRolePermissions(id, permissionIds),
    onSuccess: (updatedRole, { id }) => {
      queryClient.setQueryData(roleKeys.detail(id), updatedRole)
      queryClient.invalidateQueries({ queryKey: roleKeys.permissions(id) })
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to assign role permissions:', error)
    },
  })
}

export const useRemoveRolePermissions = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      rolesApi.removeRolePermissions(id, permissionIds),
    onSuccess: (updatedRole, { id }) => {
      queryClient.setQueryData(roleKeys.detail(id), updatedRole)
      queryClient.invalidateQueries({ queryKey: roleKeys.permissions(id) })
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to remove role permissions:', error)
    },
  })
}
