import { z } from 'zod'
import { router, protectedProcedure } from '../server'
import { apiClient } from '@/shared/services/api/client'

const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export const rolesRouter = router({
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
        const response = await apiClient.get('/roles', {
          params: {
            page: input.page,
            limit: input.limit,
            search: input.search,
          },
        })
        return response.data
      } catch {
        throw new Error('Failed to fetch roles')
      }
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input: id }) => {
      try {
        const response = await apiClient.get(`/roles/${id}`)
        return response.data
      } catch {
        throw new Error('Failed to fetch role')
      }
    }),

  create: protectedProcedure
    .input(createRoleSchema)
    .mutation(async ({ input }) => {
      try {
        const response = await apiClient.post('/roles', input)
        return response.data
      } catch {
        throw new Error('Failed to create role')
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: roleSchema.partial().omit({ id: true }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await apiClient.put(`/roles/${input.id}`, input.data)
        return response.data
      } catch {
        throw new Error('Failed to update role')
      }
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ input: id }) => {
      try {
        await apiClient.delete(`/roles/${id}`)
        return { success: true }
      } catch {
        throw new Error('Failed to delete role')
      }
    }),
})