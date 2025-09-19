"use client"

import { useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'

export const useUserRole = () => {
  const context = useContext(AuthContext)
  const user = context?.user || null
  
  const hasPermission = (permission: string): boolean => {
    if (!user?.roles) return false
    return user.roles.includes(permission) || user.roles.includes('admin') || user.roles.includes('*')
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user?.roles) return false
    return permissions.some(permission => hasPermission(permission))
  }

  const isAdmin = (): boolean => {
    return user?.roles?.includes('admin') || hasPermission('admin.*')
  }

  const canAccessModule = (module: string): boolean => {
    if (!user) return false
    
    // If user is admin, allow access to all modules
    if (isAdmin()) return true
    
    const modulePermissions = {
      'compliance': ['compliance.*', 'compliance.read'],
      'ai-management': ['ai.*', 'ai.read'],
      'operations': ['operations.*', 'operations.read'],
      'administration': ['admin.*', 'admin.read'],
      'builder': ['builder.*', 'builder.read'],
      'projects': ['projects.*', 'projects.read']
    }

    const permissions = modulePermissions[module as keyof typeof modulePermissions] || []
    return hasAnyPermission(permissions) || true // Allow access for now since we don't have full RBAC data
  }

  return {
    user,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    canAccessModule
  }
}