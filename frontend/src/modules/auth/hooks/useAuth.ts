"use client"

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/shared/services/api/client'
import { API_CONFIG, getApiUrl } from '@/shared/services/api/config'
import { userKeys, useCurrentUser } from '@/modules/admin/hooks/useUsers'

// Auth API functions
const authApi = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Login failed')
    }

    return response.json()
  },

  logout: async () => {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT)
    } catch (error) {
      console.warn('Logout request failed:', error)
    }
  },

  refreshToken: async (refreshToken: string) => {
    const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.REFRESH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    return response.json()
  },
}

// Login mutation hook
export const useLogin = () => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      
      // Invalidate current user query to refetch user data
      queryClient.invalidateQueries({ queryKey: userKeys.current() })
      
      // Redirect to stored path or dashboard
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/dashboard'
      sessionStorage.removeItem('redirectAfterLogin')
      router.push(redirectPath)
    },
    onError: (error) => {
      console.error('Login failed:', error)
    },
  })
}

// Logout mutation hook
export const useLogout = () => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear all auth data
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('redirectAfterLogin')
      
      // Clear all query cache
      queryClient.clear()
      
      // Redirect to login
      router.push('/login')
    },
    onError: (error) => {
      console.warn('Logout request failed:', error)
      // Still clear local data even if request fails
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      queryClient.clear()
      router.push('/login')
    },
  })
}

// Token refresh mutation hook
export const useRefreshToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (refreshToken: string) => authApi.refreshToken(refreshToken),
    onSuccess: (data) => {
      // Update tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
    },
    onError: (error) => {
      console.error('Token refresh failed:', error)
      // Clear auth data and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      queryClient.clear()
      window.location.href = '/login'
    },
  })
}

// Hook to check if user is authenticated  
export const useIsAuthenticated = () => {
  const { data: user, isLoading } = useCurrentUser()
  
  return {
    isAuthenticated: !!user && !!localStorage.getItem('access_token'),
    isLoading,
    user,
  }
}