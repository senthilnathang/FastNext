import { api } from './provider'

// Custom hooks for common patterns
export const useUsers = (params?: { page?: number; limit?: number; search?: string }) => {
  return api.users.getAll.useQuery({
    page: 1,
    limit: 10,
    ...params,
  })
}

export const useUser = (id: string) => {
  return api.users.getById.useQuery(id, {
    enabled: !!id,
  })
}

export const useCreateUser = () => {
  const utils = api.useUtils()
  
  return api.users.create.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate()
    },
  })
}

export const useUpdateUser = () => {
  const utils = api.useUtils()
  
  return api.users.update.useMutation({
    onSuccess: (data, variables) => {
      utils.users.getAll.invalidate()
      utils.users.getById.invalidate(variables.id)
    },
  })
}

export const useDeleteUser = () => {
  const utils = api.useUtils()
  
  return api.users.delete.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate()
    },
  })
}

export const useProjects = (params?: { page?: number; limit?: number; search?: string }) => {
  return api.projects.getAll.useQuery({
    page: 1,
    limit: 10,
    ...params,
  })
}

export const useProject = (id: string) => {
  return api.projects.getById.useQuery(id, {
    enabled: !!id,
  })
}

export const useCreateProject = () => {
  const utils = api.useUtils()
  
  return api.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.getAll.invalidate()
    },
  })
}

export const useRoles = (params?: { page?: number; limit?: number; search?: string }) => {
  return api.roles.getAll.useQuery({
    page: 1,
    limit: 10,
    ...params,
  })
}

export const usePermissions = (params?: { 
  page?: number
  limit?: number
  search?: string
  resource?: string 
}) => {
  return api.permissions.getAll.useQuery({
    page: 1,
    limit: 10,
    ...params,
  })
}