"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Checkbox,
  Switch
} from "@/shared/components"

import { useUpdateRole } from "@/modules/admin/hooks/useRoles"
import { usePermissions } from "@/modules/admin/hooks/usePermissions"
import type { Role } from "@/shared/services/api/roles"
import type { Permission } from "@/shared/services/api/permissions"

const roleEditSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  is_active: z.boolean(),
  permissions: z.array(z.number()),
})

type RoleEditFormData = z.infer<typeof roleEditSchema>

interface RoleEditDialogProps {
  role: Role | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RoleEditDialog({ role, open, onOpenChange }: RoleEditDialogProps) {
  const updateRoleMutation = useUpdateRole()
  const { data: permissionsData, isLoading: permissionsLoading } = usePermissions()

  const form = useForm<RoleEditFormData>({
    resolver: zodResolver(roleEditSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
      permissions: [],
    },
  })

  // Update form when role changes
  React.useEffect(() => {
    if (role && open) {
      form.reset({
        name: role.name || "",
        description: role.description || "",
        is_active: role.is_active ?? true,
        permissions: role.permissions?.map(p => p.id) || [],
      })
    }
  }, [role, open, form])

  const onSubmit = async (data: RoleEditFormData) => {
    if (!role || !role.id) return

    try {
      await updateRoleMutation.mutateAsync({
        id: role.id,
        data: {
          name: data.name,
          description: data.description || undefined,
          is_active: data.is_active,
          permissions: data.permissions,
        }
      })
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the mutation
      console.error("Failed to update role:", error)
    }
  }

  const permissions = permissionsData?.items || []
  const isSubmitting = updateRoleMutation.isPending

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const category = permission.category || 'uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    const currentPermissions = form.getValues("permissions")
    if (checked) {
      form.setValue("permissions", [...currentPermissions, permissionId])
    } else {
      form.setValue("permissions", currentPermissions.filter(id => id !== permissionId))
    }
  }

  if (!role) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Update role information and permissions. Changes will be applied immediately.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={isSubmitting || role.is_system_role}
                      />
                    </FormControl>
                    {role.is_system_role && (
                      <FormDescription>
                        System roles cannot be renamed
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Inactive roles cannot be assigned to users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting || role.is_system_role}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Brief description of what this role does..."
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissions</FormLabel>
                  <FormDescription>
                    Select the permissions this role should have
                  </FormDescription>
                  {permissionsLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading permissions...</span>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-60 overflow-y-auto border rounded-md p-3">
                      {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-sm text-foreground capitalize">
                            {category}
                          </h4>
                          <div className="space-y-2 pl-4">
                            {categoryPermissions.filter(p => p.id !== undefined).map((permission) => (
                              <div key={permission.id} className="flex items-start space-x-2">
                                <Checkbox
                                  id={`edit-permission-${permission.id}`}
                                  checked={field.value.includes(permission.id!)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(permission.id!, checked as boolean)
                                  }
                                  disabled={isSubmitting || role.is_system_role}
                                />
                                <div className="grid gap-1.5 leading-none">
                                  <label
                                    htmlFor={`edit-permission-${permission.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {permission.name}
                                  </label>
                                  {permission.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {permissions.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No permissions available
                        </p>
                      )}
                    </div>
                  )}
                  {role.is_system_role && (
                    <FormDescription>
                      System role permissions cannot be modified
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || role.is_system_role}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}