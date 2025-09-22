"use client"

import * as React from "react"
import { AlertTriangle, Trash2, Shield, UserX } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/alert-dialog"

export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  icon?: 'delete' | 'warning' | 'shield' | 'user'
  onConfirm: () => void
  isLoading?: boolean
}

const icons = {
  delete: Trash2,
  warning: AlertTriangle,
  shield: Shield,
  user: UserX,
}

const variantStyles = {
  default: "bg-blue-600 hover:bg-blue-700",
  destructive: "bg-red-600 hover:bg-red-700",
  warning: "bg-orange-600 hover:bg-orange-700",
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = 'default',
  icon = 'warning',
  onConfirm,
  isLoading = false,
}: ConfirmationDialogProps) {
  const Icon = icons[icon]

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              variant === 'destructive' ? 'bg-red-100 text-red-600' :
              variant === 'warning' ? 'bg-orange-100 text-orange-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="ml-11">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variantStyles[variant]}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Predefined confirmation dialogs for common actions
export const useConfirmationDialog = () => {
  const [dialog, setDialog] = React.useState<{
    open: boolean
    props: Omit<ConfirmationDialogProps, 'open' | 'onOpenChange'>
  }>({
    open: false,
    props: {
      title: "",
      description: "",
      onConfirm: () => {},
    }
  })

  const showDialog = (props: Omit<ConfirmationDialogProps, 'open' | 'onOpenChange'>) => {
    setDialog({ open: true, props })
  }

  const hideDialog = () => {
    setDialog(prev => ({ ...prev, open: false }))
  }

  const confirmDelete = (itemName: string, onConfirm: () => void) => {
    showDialog({
      title: "Delete Item",
      description: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
      icon: "delete",
      onConfirm,
    })
  }

  const confirmUserDelete = (username: string, onConfirm: () => void) => {
    showDialog({
      title: "Delete User",
      description: `Are you sure you want to delete user "${username}"? This will deactivate their account and revoke all access.`,
      confirmText: "Delete User",
      variant: "destructive",
      icon: "user",
      onConfirm,
    })
  }

  const confirmStatusToggle = (username: string, isActive: boolean, onConfirm: () => void) => {
    showDialog({
      title: `${isActive ? 'Deactivate' : 'Activate'} User`,
      description: `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} user "${username}"? This will ${isActive ? 'revoke' : 'restore'} their access to the system.`,
      confirmText: isActive ? 'Deactivate' : 'Activate',
      variant: isActive ? 'warning' : 'default',
      icon: "shield",
      onConfirm,
    })
  }

  const confirmRoleDelete = (roleName: string, userCount: number, onConfirm: () => void) => {
    showDialog({
      title: "Delete Role",
      description: `Are you sure you want to delete role "${roleName}"? ${userCount > 0 ? `This role is assigned to ${userCount} user(s). They will lose these permissions.` : 'This action cannot be undone.'}`,
      confirmText: "Delete Role",
      variant: "destructive",
      icon: "delete",
      onConfirm,
    })
  }

  const ConfirmationDialogComponent = () => (
    <ConfirmationDialog
      open={dialog.open}
      onOpenChange={hideDialog}
      {...dialog.props}
    />
  )

  return {
    showDialog,
    hideDialog,
    confirmDelete,
    confirmUserDelete,
    confirmStatusToggle,
    confirmRoleDelete,
    ConfirmationDialog: ConfirmationDialogComponent,
  }
}