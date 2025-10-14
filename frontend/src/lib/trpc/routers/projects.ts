import { z } from 'zod'
import { router, protectedProcedure } from '../server'
import { projectOperations, pageOperations, componentOperations, projectMemberOperations } from '../graphql-client'


const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  settings: z.record(z.string(), z.unknown()).optional(),
})

const updateProjectSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export const projectsRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        userId: z.number().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        // Convert pagination to GraphQL format
        const first = input.limit
        const after = input.page > 1 ? btoa(`cursor:${(input.page - 1) * input.limit}`) : undefined

        const result = await projectOperations.getAll({
          first,
          after,
          userId: input.userId,
          isPublic: input.isPublic,
        })

        // Convert GraphQL response to TRPC format for backward compatibility
        return {
          data: result.projects.edges,
          total: result.projects.totalCount,
          page: input.page,
          limit: input.limit,
          hasNext: result.projects.pageInfo.hasNextPage,
          hasPrevious: result.projects.pageInfo.hasPreviousPage,
        }
      } catch (error) {
        throw new Error(`Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getById: protectedProcedure
    .input(z.number())
    .query(async ({ input: id }) => {
      try {
        const result = await projectOperations.getById(id)
        return result.project
      } catch (error) {
        throw new Error(`Failed to fetch project: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await projectOperations.create(input)
        if (!result.createProject.success) {
          throw new Error(result.createProject.message || 'Failed to create project')
        }
        return result.createProject.project
      } catch (error) {
        throw new Error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateProjectSchema,
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await projectOperations.update(input.id, input.data)
        if (!result.updateProject.success) {
          throw new Error(result.updateProject.message || 'Failed to update project')
        }
        return result.updateProject.project
      } catch (error) {
        throw new Error(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: id }) => {
      try {
        const result = await projectOperations.delete(id)
        if (!result.deleteProject.success) {
          throw new Error(result.deleteProject.message || 'Failed to delete project')
        }
        return { success: true, message: result.deleteProject.message }
      } catch (error) {
        throw new Error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Enhanced project-specific procedures
  getPages: protectedProcedure
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

  getComponents: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
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
          components: result.components,
        }
      } catch (error) {
        throw new Error(`Failed to fetch project components: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getMembers: protectedProcedure
    .input(z.number())
    .query(async ({ input: projectId }) => {
      try {
        const result = await projectMemberOperations.getAll(projectId)
        return {
          members: result.projectMembers,
        }
      } catch (error) {
        throw new Error(`Failed to fetch project members: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        userId: z.number(),
        role: z.string(),
        permissions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Convert permissions array to JSON format expected by GraphQL
        const memberInput: import('@/lib/graphql/types').ProjectMemberInput = {
          projectId: input.projectId,
          userId: input.userId,
          role: input.role,
          permissions: input.permissions ? (input.permissions as any) : null,
        }
        const result = await projectMemberOperations.add(memberInput)
        if (!result.addProjectMember.success) {
          throw new Error(result.addProjectMember.message || 'Failed to add project member')
        }
        return { success: true, message: result.addProjectMember.message }
      } catch (error) {
        throw new Error(`Failed to add project member: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await projectMemberOperations.remove(input.projectId, input.userId)
        if (!result.removeProjectMember.success) {
          throw new Error(result.removeProjectMember.message || 'Failed to remove project member')
        }
        return { success: true, message: result.removeProjectMember.message }
      } catch (error) {
        throw new Error(`Failed to remove project member: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
})
