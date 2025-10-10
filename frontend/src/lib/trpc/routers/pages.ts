import { z } from 'zod'
import { router, protectedProcedure } from '../server'
import { pageOperations } from '../graphql-client'
import type { Page } from '@/lib/graphql/types'

const pageSchema = z.object({
  id: z.number(),
  title: z.string(),
  path: z.string(),
  content: z.record(z.string(), z.unknown()).optional(),
  projectId: z.number(),
  isPublic: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

const createPageSchema = z.object({
  title: z.string().min(1),
  path: z.string().min(1),
  content: z.record(z.string(), z.unknown()).optional(),
  projectId: z.number(),
  isPublic: z.boolean().default(false),
})

const updatePageSchema = z.object({
  title: z.string().optional(),
  path: z.string().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  isPublic: z.boolean().optional(),
})

export const pagesRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        projectId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        // Convert pagination to GraphQL format
        const first = input.limit
        const after = input.page > 1 ? btoa(`cursor:${(input.page - 1) * input.limit}`) : undefined
        
        const result = await pageOperations.getAll({
          first,
          after,
          projectId: input.projectId,
        })
        
        // Convert GraphQL response to TRPC format for backward compatibility
        return {
          data: result.pages.edges,
          total: result.pages.totalCount,
          page: input.page,
          limit: input.limit,
          hasNext: result.pages.pageInfo.hasNextPage,
          hasPrevious: result.pages.pageInfo.hasPreviousPage,
        }
      } catch (error) {
        throw new Error(`Failed to fetch pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getById: protectedProcedure
    .input(z.number())
    .query(async ({ input: id }) => {
      try {
        const result = await pageOperations.getById(id)
        return result.page
      } catch (error) {
        throw new Error(`Failed to fetch page: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  create: protectedProcedure
    .input(createPageSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await pageOperations.create(input)
        if (!result.createPage.success) {
          throw new Error(result.createPage.message || 'Failed to create page')
        }
        return result.createPage.page
      } catch (error) {
        throw new Error(`Failed to create page: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updatePageSchema,
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await pageOperations.update(input.id, input.data)
        if (!result.updatePage.success) {
          throw new Error(result.updatePage.message || 'Failed to update page')
        }
        return result.updatePage.page
      } catch (error) {
        throw new Error(`Failed to update page: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: id }) => {
      try {
        const result = await pageOperations.delete(id)
        if (!result.deletePage.success) {
          throw new Error(result.deletePage.message || 'Failed to delete page')
        }
        return { success: true, message: result.deletePage.message }
      } catch (error) {
        throw new Error(`Failed to delete page: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Additional utility procedures
  getByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const first = input.limit
        const after = input.page > 1 ? btoa(`cursor:${(input.page - 1) * input.limit}`) : undefined
        
        const result = await pageOperations.getAll({
          first,
          after,
          projectId: input.projectId,
        })
        
        return {
          data: result.pages.edges,
          total: result.pages.totalCount,
          page: input.page,
          limit: input.limit,
          hasNext: result.pages.pageInfo.hasNextPage,
          hasPrevious: result.pages.pageInfo.hasPreviousPage,
        }
      } catch (error) {
        throw new Error(`Failed to fetch project pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getByPath: protectedProcedure
    .input(
      z.object({
        path: z.string(),
        projectId: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        // This would require a specific GraphQL query for path-based lookup
        // For now, we'll fetch all pages and filter client-side
        const result = await pageOperations.getAll({
          projectId: input.projectId,
        })
        
        const page = result.pages.edges.find((page: Page) => page.path === input.path)
        if (!page) {
          throw new Error('Page not found')
        }
        
        return page
      } catch (error) {
        throw new Error(`Failed to fetch page by path: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
})