// User API types and interfaces
export interface User {
  id?: number;
  email: string;
  username: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
  is_verified?: boolean;
  is_superuser?: boolean;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
  roles?: string[];
  permissions?: string[];
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  is_active?: boolean;
  roles?: string[];
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  full_name?: string;
  is_active?: boolean;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  roles?: string[];
}

export interface UserListParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  role?: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  skip: number;
  limit: number;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  is_active?: boolean;
  is_verified?: boolean;
  is_superuser?: boolean;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  role_id?: number;
  send_invitation?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  full_name?: string;
  is_active?: boolean;
  is_verified?: boolean;
  is_superuser?: boolean;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
}

import { apiClient } from "./client";
import { API_CONFIG } from "./config";

// Users API
export const usersApi = {
  // Get list of users with pagination and filters
  getUsers: async (params?: UserListParams): Promise<UserListResponse> => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS, {
      params,
    });
    return response.data;
  },

  // Get single user by ID
  getUser: async (id: number): Promise<User> => {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.USERS}/${id}`);
    return response.data;
  },

  // Create new user
  createUser: async (data: CreateUserRequest): Promise<User> => {
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.USERS, data);
    return response.data;
  },

  // Update user
  updateUser: async (id: number, data: UpdateUserRequest): Promise<User> => {
    const response = await apiClient.put(
      `${API_CONFIG.ENDPOINTS.USERS}/${id}`,
      data,
    );
    return response.data;
  },

  // Delete user
  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_CONFIG.ENDPOINTS.USERS}/${id}`);
  },

  // Toggle user active status
  toggleUserStatus: async (id: number): Promise<User> => {
    const response = await apiClient.patch(
      `${API_CONFIG.ENDPOINTS.USERS}/${id}/toggle-status`,
    );
    return response.data;
  },

  // Get current authenticated user
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.AUTH.ME);
    return response.data;
  },

  // Get user roles
  getUserRoles: async (id: number): Promise<string[]> => {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.USERS}/${id}/roles`,
    );
    return response.data;
  },

  // Reset user password
  resetUserPassword: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.USERS}/${id}/reset-password`,
    );
    return response.data;
  },

  // Assign roles to user
  assignUserRoles: async (id: number, roles: string[]): Promise<User> => {
    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.USERS}/${id}/roles`,
      { roles },
    );
    return response.data;
  },
};
