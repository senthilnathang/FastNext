import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type CreateUserRequest, type UpdateUserRequest, type UserListParams, type User } from '@/shared/services/api/users'

// Query keys for users
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
  current: () => [...userKeys.all, 'current'] as const,
  roles: (id: number) => [...userKeys.detail(id), 'roles'] as const,
}

// Query hooks
export const useUsers = (params?: UserListParams) => {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.getUsers(params),
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  })
}

export const useUser = (id: number) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getUser(id),
    enabled: !!id && id > 0, // Only fetch if valid ID
  })
}

export const useCurrentUser = () => {
  return useQuery({
    queryKey: userKeys.current(),
    queryFn: usersApi.getCurrentUser,
    staleTime: 10 * 60 * 1000, // 10 minutes - user data doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

export const useUserRoles = (id: number) => {
  return useQuery({
    queryKey: userKeys.roles(id),
    queryFn: () => usersApi.getUserRoles(id),
    enabled: !!id && id > 0,
  })
}

// Mutation hooks
export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.createUser(data),
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create user:', error)
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      usersApi.updateUser(id, data),
    onSuccess: (updatedUser, { id }) => {
      // Update the user in cache
      queryClient.setQueryData(userKeys.detail(id), updatedUser)

      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })

      // Update current user if it's the same user
      const currentUserData = queryClient.getQueryData(userKeys.current()) as User | undefined
      if (currentUserData && currentUserData.id === id) {
        queryClient.setQueryData(userKeys.current(), updatedUser)
      }
    },
    onError: (error) => {
      console.error('Failed to update user:', error)
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: (_, id) => {
      // Remove user from cache
      queryClient.removeQueries({ queryKey: userKeys.detail(id) })

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to delete user:', error)
    },
  })
}

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => usersApi.toggleUserStatus(id),
    onSuccess: (updatedUser, id) => {
      // Update the user in cache
      queryClient.setQueryData(userKeys.detail(id), updatedUser)

      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to toggle user status:', error)
    },
  })
}

export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: (id: number) => usersApi.resetUserPassword(id),
    onError: (error) => {
      console.error('Failed to reset user password:', error)
    },
  })
}

export const useAssignUserRoles = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: string[] }) =>
      usersApi.assignUserRoles(id, roles),
    onSuccess: (updatedUser, { id }) => {
      // Update the user in cache
      queryClient.setQueryData(userKeys.detail(id), updatedUser)

      // Invalidate role-specific cache
      queryClient.invalidateQueries({ queryKey: userKeys.roles(id) })

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to assign user roles:', error)
    },
  })
}

// Utility hook for optimistic updates
export const useOptimisticUserUpdate = () => {
  const queryClient = useQueryClient()

  return {
    updateUserOptimistically: (id: number, updates: Partial<User>) => {
      queryClient.setQueryData(userKeys.detail(id), (old: User | undefined) =>
        old ? { ...old, ...updates } : old
      )
    },

    revertUserUpdate: (id: number) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
    }
  }
}
