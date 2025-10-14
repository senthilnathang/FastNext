import { z } from 'zod'
import { router, protectedProcedure } from '../server'
import { userOperations } from '../graphql-client'

const createUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  lastLoginAt: z.string().optional(),
})

const updateUserSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  isActive: z.boolean().optional(),
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
        // Convert pagination to GraphQL format
        const first = input.limit
        const after = input.page > 1 ? btoa(`cursor:${(input.page - 1) * input.limit}`) : undefined
        
        const result = await userOperations.getAll({
          first,
          after,
          search: input.search,
        })
        
        // Convert GraphQL response to TRPC format for backward compatibility
        return {
          data: result.users.edges,
          total: result.users.totalCount,
          page: input.page,
          limit: input.limit,
          hasNext: result.users.pageInfo.hasNextPage,
          hasPrevious: result.users.pageInfo.hasPreviousPage,
        }
      } catch (error) {
        throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getById: protectedProcedure
    .input(z.number())
    .query(async ({ input: id }) => {
      try {
        const result = await userOperations.getById(id)
        return result.user
      } catch (error) {
        throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  create: protectedProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await userOperations.create(input)
        if (!result.createUser.success) {
          throw new Error(result.createUser.message || 'Failed to create user')
        }
        return result.createUser.user
      } catch (error) {
        throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateUserSchema,
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await userOperations.update(input.id, input.data)
        if (!result.updateUser.success) {
          throw new Error(result.updateUser.message || 'Failed to update user')
        }
        return result.updateUser.user
      } catch (error) {
        throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: id }) => {
      try {
        const result = await userOperations.delete(id)
        if (!result.deleteUser.success) {
          throw new Error(result.deleteUser.message || 'Failed to delete user')
        }
        return { success: true, message: result.deleteUser.message }
      } catch (error) {
        throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Additional utility procedures for enhanced TypeScript support
  me: protectedProcedure
    .query(async () => {
      try {
        // This could use the ME query from GraphQL or get current user from context
        // For now, we'll implement a basic version
        throw new Error('Not implemented - use auth context instead')
      } catch (error) {
        throw new Error(`Failed to get current user: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await userOperations.getAll({
          first: input.limit,
          search: input.query,
        })
        
        return {
          users: result.users.edges,
          hasMore: result.users.pageInfo.hasNextPage,
          totalCount: result.users.totalCount,
        }
      } catch (error) {
        throw new Error(`Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
})