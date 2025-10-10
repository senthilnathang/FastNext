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
  Checkbox
} from "@/shared/components"

import { useCreateRole } from "@/modules/admin/hooks/useRoles"
import { usePermissions } from "@/modules/admin/hooks/usePermissions"
import type { Permission } from "@/shared/services/api/permissions"

const roleCreateSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  permissions: z.array(z.number()),
})

type RoleCreateFormData = z.infer<typeof roleCreateSchema>

interface RoleCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RoleCreateDialog({ open, onOpenChange }: RoleCreateDialogProps) {
  const createRoleMutation = useCreateRole()
  const { data: permissionsData, isLoading: permissionsLoading } = usePermissions()

  const form = useForm<RoleCreateFormData>({
    resolver: zodResolver(roleCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
    },
  })

  React.useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  const onSubmit = async (data: RoleCreateFormData) => {
    try {
      await createRoleMutation.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        permissions: data.permissions,
      })
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the mutation
      console.error("Failed to create role:", error)
    }
  }

  const permissions = permissionsData?.items || []
  const isSubmitting = createRoleMutation.isPending

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Create a new role and assign permissions to define what users with this role can do.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Moderator, Editor, Viewer"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormDescription>
                    Optional description to help identify the role purpose
                  </FormDescription>
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
                                  id={`permission-${permission.id}`}
                                  checked={field.value.includes(permission.id!)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(permission.id!, checked as boolean)
                                  }
                                  disabled={isSubmitting}
                                />
                                <div className="grid gap-1.5 leading-none">
                                  <label
                                    htmlFor={`permission-${permission.id}`}
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
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}