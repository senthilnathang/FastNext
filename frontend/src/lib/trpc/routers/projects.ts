import { z } from 'zod'
import { router, protectedProcedure } from '../server'
import { apiClient } from '@/shared/services/api/client'
import { API_CONFIG } from '@/shared/services/api/config'

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export const projectsRouter = router({
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
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.PROJECTS, {
          params: {
            page: input.page,
            limit: input.limit,
            search: input.search,
          },
        })
        return response.data
      } catch {
        throw new Error('Failed to fetch projects')
      }
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input: id }) => {
      try {
        const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`)
        return response.data
      } catch {
        throw new Error('Failed to fetch project')
      }
    }),

  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ input }) => {
      try {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.PROJECTS, input)
        return response.data
      } catch {
        throw new Error('Failed to create project')
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: projectSchema.partial().omit({ id: true }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.PROJECTS}/${input.id}`, input.data)
        return response.data
      } catch {
        throw new Error('Failed to update project')
      }
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ input: id }) => {
      try {
        await apiClient.delete(`${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`)
        return { success: true }
      } catch {
        throw new Error('Failed to delete project')
      }
    }),
})