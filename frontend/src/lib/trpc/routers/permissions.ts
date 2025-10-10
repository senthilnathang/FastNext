import { z } from 'zod'
import { router, protectedProcedure } from '../server'
import { permissionOperations } from '../graphql-client'
import type { Permission } from '@/lib/graphql/types'

const permissionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  resource: z.string(),
  action: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

const createPermissionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  resource: z.string().min(1),
  action: z.string().min(1),
})

const updatePermissionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
})

export const permissionsRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        resource: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await permissionOperations.getAll()
        let filteredPermissions = result.permissions

        // Apply client-side filtering for resource and search
        if (input.resource) {
          filteredPermissions = filteredPermissions.filter((permission: Permission) =>
            permission.resource === input.resource
          )
        }

        if (input.search) {
          const searchTerm = input.search.toLowerCase()
          filteredPermissions = filteredPermissions.filter((permission: Permission) =>
            permission.name.toLowerCase().includes(searchTerm) ||
            (permission.description && permission.description.toLowerCase().includes(searchTerm)) ||
            (permission.resource && permission.resource.toLowerCase().includes(searchTerm)) ||
            (permission.action && permission.action.toLowerCase().includes(searchTerm))
          )
        }

        return {
          data: filteredPermissions,
          total: filteredPermissions.length,
        }
      } catch (error) {
        throw new Error(`Failed to fetch permissions: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getById: protectedProcedure
    .input(z.number())
    .query(async ({ input: id }) => {
      try {
        // For individual permission fetching, we'll need to find from the list
        const result = await permissionOperations.getAll()
        const permission = result.permissions.find((permission: Permission) => permission.id === id)
        if (!permission) {
          throw new Error('Permission not found')
        }
        return permission
      } catch (error) {
        throw new Error(`Failed to fetch permission: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Note: Create, update, delete operations would need corresponding GraphQL mutations
  create: protectedProcedure
    .input(createPermissionSchema)
    .mutation(async ({ input }) => {
      try {
        // This would need a createPermission mutation in GraphQL
        throw new Error('Create permission mutation not implemented in GraphQL')
      } catch (error) {
        throw new Error(`Failed to create permission: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updatePermissionSchema,
      })
    )
    .mutation(async ({ input }) => {
      try {
        // This would need an updatePermission mutation in GraphQL
        throw new Error('Update permission mutation not implemented in GraphQL')
      } catch (error) {
        throw new Error(`Failed to update permission: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: id }) => {
      try {
        // This would need a deletePermission mutation in GraphQL
        throw new Error('Delete permission mutation not implemented in GraphQL')
      } catch (error) {
        throw new Error(`Failed to delete permission: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Additional utility procedures
  getByResource: protectedProcedure
    .input(z.string())
    .query(async ({ input: resource }) => {
      try {
        const result = await permissionOperations.getAll()
        const resourcePermissions = result.permissions.filter((permission: Permission) =>
          permission.resource === resource
        )
        return {
          permissions: resourcePermissions,
          totalCount: resourcePermissions.length,
        }
      } catch (error) {
        throw new Error(`Failed to fetch permissions by resource: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  getResources: protectedProcedure
    .query(async () => {
      try {
        const result = await permissionOperations.getAll()
        const resources = [...new Set(result.permissions.map((permission: Permission) => permission.resource))]
        return {
          resources,
          totalCount: resources.length,
        }
      } catch (error) {
        throw new Error(`Failed to fetch permission resources: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
})