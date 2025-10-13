import { z } from 'zod'
import { router, protectedProcedure } from '../server'
import { componentOperations } from '../graphql-client'
import type { Component } from '@/lib/graphql/types'



const createComponentSchema = z.object({
  name: z.string().min(1),
  componentType: z.string().min(1),
  schema: z.record(z.string(), z.unknown()).optional(),
  projectId: z.number(),
})

const updateComponentSchema = z.object({
  name: z.string().optional(),
  componentType: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
})

export const componentsRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        componentType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await componentOperations.getAll({
          projectId: input.projectId,
          componentType: input.componentType,
        })
        
        return {
          data: result.components,
          total: result.components.length,
        }
      } catch (error) {
        throw new Error(`Failed to fetch components: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getById: protectedProcedure
    .input(z.number())
    .query(async ({ input: id }) => {
      try {
        const result = await componentOperations.getById(id)
        return result.component
      } catch (error) {
        throw new Error(`Failed to fetch component: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  create: protectedProcedure
    .input(createComponentSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await componentOperations.create(input)
        if (!result.createComponent.success) {
          throw new Error(result.createComponent.message || 'Failed to create component')
        }
        return result.createComponent.component
      } catch (error) {
        throw new Error(`Failed to create component: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateComponentSchema,
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await componentOperations.update(input.id, input.data)
        if (!result.updateComponent.success) {
          throw new Error(result.updateComponent.message || 'Failed to update component')
        }
        return result.updateComponent.component
      } catch (error) {
        throw new Error(`Failed to update component: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: id }) => {
      try {
        const result = await componentOperations.delete(id)
        if (!result.deleteComponent.success) {
          throw new Error(result.deleteComponent.message || 'Failed to delete component')
        }
        return { success: true, message: result.deleteComponent.message }
      } catch (error) {
        throw new Error(`Failed to delete component: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Additional utility procedures
  getByProject: protectedProcedure
    .input(z.number())
    .query(async ({ input: projectId }) => {
      try {
        const result = await componentOperations.getAll({
          projectId,
        })
        
        return {
          components: result.components,
          totalCount: result.components.length,
        }
      } catch (error) {
        throw new Error(`Failed to fetch project components: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getByType: protectedProcedure
    .input(
      z.object({
        componentType: z.string(),
        projectId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await componentOperations.getAll({
          projectId: input.projectId,
          componentType: input.componentType,
        })
        
        return {
          components: result.components,
          totalCount: result.components.length,
        }
      } catch (error) {
        throw new Error(`Failed to fetch components by type: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getTypes: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await componentOperations.getAll({
          projectId: input.projectId,
        })
        
        // Extract unique component types
        const types = [...new Set(result.components.map((component: Component) => component.componentType))]
        
        return {
          types,
          totalCount: types.length,
        }
      } catch (error) {
        throw new Error(`Failed to fetch component types: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        projectId: z.number().optional(),
        componentType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await componentOperations.getAll({
          projectId: input.projectId,
          componentType: input.componentType,
        })
        
        const searchTerm = input.query.toLowerCase()
        const filteredComponents = result.components.filter((component: Component) =>
          component.name.toLowerCase().includes(searchTerm) ||
          component.componentType.toLowerCase().includes(searchTerm)
        )
        
        return {
          components: filteredComponents,
          totalCount: filteredComponents.length,
        }
      } catch (error) {
        throw new Error(`Failed to search components: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
})