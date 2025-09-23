"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

import { useUpdateUser } from "@/modules/admin/hooks/useUsers"
import { useRoles } from "@/modules/admin/hooks/useRoles"
import type { User } from "@/shared/services/api/users"

// Validation schema
const userEditSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  full_name: z.string().optional(),
  is_active: z.boolean(),
  is_verified: z.boolean(),
  is_superuser: z.boolean(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  role_id: z.number().optional(),
})

type UserEditFormData = z.infer<typeof userEditSchema>

interface UserEditDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserEditDialog({ user, open, onOpenChange }: UserEditDialogProps) {
  const { data: rolesData, isLoading: rolesLoading } = useRoles({ active_only: true })
  const updateUserMutation = useUpdateUser()

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      email: "",
      username: "",
      full_name: "",
      is_active: true,
      is_verified: false,
      is_superuser: false,
      bio: "",
      location: "",
      website: "",
      role_id: undefined,
    },
  })

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      form.reset({
        email: user.email,
        username: user.username,
        full_name: user.full_name || "",
        is_active: user.is_active,
        is_verified: user.is_verified,
        is_superuser: user.is_superuser,
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        role_id: user.roles?.[0] ? parseInt(user.roles[0]) : undefined,
      })
    }
  }, [user, form])

  const onSubmit = async (data: UserEditFormData) => {
    if (!user) return

    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: {
          ...data,
          website: data.website || undefined,
        }
      })
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the mutation
      console.error("Failed to update user:", error)
    }
  }

  const roles = rolesData?.items || []
  const isSubmitting = updateUserMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions. Changes will be applied immediately.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    disabled={isSubmitting || rolesLoading}
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No role</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., San Francisco, CA" disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com" disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brief description..." disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium">Account Status</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">Active</FormLabel>
                        <FormDescription className="text-sm">
                          User can log in
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_verified"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">Verified</FormLabel>
                        <FormDescription className="text-sm">
                          Email verified
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_superuser"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">Superuser</FormLabel>
                        <FormDescription className="text-sm">
                          Full access
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}