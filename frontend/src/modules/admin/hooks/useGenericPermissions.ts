import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/modules/auth'
import { apiClient } from '@/shared/services/api/client'

export interface Permission {
  id: number
  name: string
  description: string
  category: string
  action: string
  resource?: string
  is_system_permission: boolean
}

export interface PermissionCheck {
  action: string
  resource: string
  resourceId?: number
  projectId?: number
}

export interface UseGenericPermissionsResult {
  permissions: Permission[]
  allowedActions: string[]
  hasPermission: (check: PermissionCheck) => boolean
  checkCreate: (resource: string, projectId?: number) => boolean
  checkRead: (resource: string, resourceId?: number, projectId?: number) => boolean
  checkUpdate: (resource: string, resourceId?: number, projectId?: number) => boolean
  checkDelete: (resource: string, resourceId?: number, projectId?: number) => boolean
  checkManage: (resource: string, projectId?: number) => boolean
  loading: boolean
  error: string | null
  refetch: () => void
}

export const useGenericPermissions = (
  resource?: string,
  projectId?: number
): UseGenericPermissionsResult => {
  const { user, isAuthenticated } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [allowedActions, setAllowedActions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPermissions([])
      setAllowedActions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get user's permissions
      const permissionsResponse = await apiClient.get('/api/v1/auth/me/permissions')
      setPermissions(permissionsResponse.data)

      // Get allowed actions for specific resource if provided
      if (resource) {
        const queryParams = new URLSearchParams({
          resource_type: resource,
          ...(projectId && { project_id: projectId.toString() })
        })
        const actionsResponse = await apiClient.get(`/auth/me/allowed-actions?${queryParams}`)
        setAllowedActions(actionsResponse.data)
      }
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'detail' in err.response.data ? String(err.response.data.detail) : 'Failed to fetch permissions'
      setError(errorMessage)
      setPermissions([])
      setAllowedActions([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user, resource, projectId])

  const hasPermission = (check: PermissionCheck): boolean => {
    if (!isAuthenticated || !user) return false
    
    // Superusers have all permissions
    if (user.is_superuser) return true

    // Check exact permission match
    const hasExactPermission = permissions.some(permission => 
      permission.action === check.action && 
      permission.category === check.resource
    )

    if (hasExactPermission) return true

    // Check for manage permission (implies all actions)
    const hasManagePermission = permissions.some(permission => 
      permission.action === 'manage' && 
      permission.category === check.resource
    )

    if (hasManagePermission) return true

    // Check for system-wide permissions
    const hasSystemPermission = permissions.some(permission => 
      permission.action === check.action && 
      permission.category === 'system'
    )

    return hasSystemPermission
  }

  const checkCreate = (resource: string, projectId?: number): boolean => {
    return hasPermission({ action: 'create', resource, projectId })
  }

  const checkRead = (resource: string, resourceId?: number, projectId?: number): boolean => {
    return hasPermission({ action: 'read', resource, resourceId, projectId })
  }

  const checkUpdate = (resource: string, resourceId?: number, projectId?: number): boolean => {
    return hasPermission({ action: 'update', resource, resourceId, projectId })
  }

  const checkDelete = (resource: string, resourceId?: number, projectId?: number): boolean => {
    return hasPermission({ action: 'delete', resource, resourceId, projectId })
  }

  const checkManage = (resource: string, projectId?: number): boolean => {
    return hasPermission({ action: 'manage', resource, projectId })
  }

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  return {
    permissions,
    allowedActions,
    hasPermission,
    checkCreate,
    checkRead,
    checkUpdate,
    checkDelete,
    checkManage,
    loading,
    error,
    refetch: fetchPermissions
  }
}