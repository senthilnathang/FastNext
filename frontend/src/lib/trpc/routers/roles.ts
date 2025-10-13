import { z } from 'zod'
import { router, protectedProcedure } from '../server'
import { roleOperations } from '../graphql-client'
import type { Role } from '@/lib/graphql/types'



const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
})

const updateRoleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
})

export const rolesRouter = router({
  getAll: protectedProcedure
    .query(async () => {
      try {
        const result = await roleOperations.getAll()
        return {
          data: result.roles,
          total: result.roles.length,
        }
      } catch (error) {
        throw new Error(`Failed to fetch roles: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getById: protectedProcedure
    .input(z.number())
    .query(async ({ input: id }) => {
      try {
        // For individual role fetching, we'll need to find from the list
        // or add a getById operation to roleOperations
        const result = await roleOperations.getAll()
        const role = result.roles.find((role: Role) => role.id === id)
        if (!role) {
          throw new Error('Role not found')
        }
        return role
      } catch (error) {
        throw new Error(`Failed to fetch role: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Note: Create, update, delete operations would need corresponding GraphQL mutations
  // For now, keeping basic structure for TypeScript compatibility
  create: protectedProcedure
    .input(createRoleSchema)
    .mutation(async ({ input: _input }) => {
      try {
        // This would need a createRole mutation in GraphQL
        throw new Error('Create role mutation not implemented in GraphQL')
      } catch (error) {
        throw new Error(`Failed to create role: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateRoleSchema,
      })
    )
    .mutation(async ({ input: _input }) => {
      try {
        // This would need an updateRole mutation in GraphQL
        throw new Error('Update role mutation not implemented in GraphQL')
      } catch (error) {
        throw new Error(`Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: _id }) => {
      try {
        // This would need a deleteRole mutation in GraphQL
        throw new Error('Delete role mutation not implemented in GraphQL')
      } catch (error) {
        throw new Error(`Failed to delete role: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Additional utility procedures
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await roleOperations.getAll()
        const filteredRoles = result.roles.filter((role: Role) =>
          role.name.toLowerCase().includes(input.query.toLowerCase()) ||
          (role.description && role.description.toLowerCase().includes(input.query.toLowerCase()))
        )
        return {
          roles: filteredRoles,
          totalCount: filteredRoles.length,
        }
      } catch (error) {
        throw new Error(`Failed to search roles: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
})