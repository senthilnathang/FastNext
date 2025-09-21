import { z } from 'zod'
import { router, protectedProcedure } from '../server'
import { apiClient } from '@/shared/services/api/client'

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

const createUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

export const usersRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const response = await apiClient.get('/users', {
          params: {
            page: input.page,
            limit: input.limit,
            search: input.search,
          },
        })
        return response.data
      } catch {
        throw new Error('Failed to fetch users')
      }
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input: id }) => {
      try {
        const response = await apiClient.get(`/users/${id}`)
        return response.data
      } catch {
        throw new Error('Failed to fetch user')
      }
    }),

  create: protectedProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      try {
        const response = await apiClient.post('/users', input)
        return response.data
      } catch {
        throw new Error('Failed to create user')
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: userSchema.partial().omit({ id: true }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await apiClient.put(`/users/${input.id}`, input.data)
        return response.data
      } catch {
        throw new Error('Failed to update user')
      }
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ input: id }) => {
      try {
        await apiClient.delete(`/users/${id}`)
        return { success: true }
      } catch {
        throw new Error('Failed to delete user')
      }
    }),
})