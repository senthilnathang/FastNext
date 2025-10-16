import { toast } from 'sonner'

export interface CrudNotificationOptions {
  resourceName: string
  onCreateSuccess?: (data: any) => void
  onUpdateSuccess?: (data: any) => void
  onDeleteSuccess?: (data: any) => void
  onError?: (error: any) => void
}

export function useCrudNotifications(options: CrudNotificationOptions) {
  const { resourceName, onCreateSuccess, onUpdateSuccess, onDeleteSuccess, onError } = options

  const notifyCreateSuccess = (data: any) => {
    toast.success(`${resourceName} created successfully`)
    onCreateSuccess?.(data)
  }

  const notifyUpdateSuccess = (data: any) => {
    toast.success(`${resourceName} updated successfully`)
    onUpdateSuccess?.(data)
  }

  const notifyDeleteSuccess = (data: any) => {
    toast.success(`${resourceName} deleted successfully`)
    onDeleteSuccess?.(data)
  }

  const notifyError = (error: any, operation: string) => {
    const message = error?.message || `Failed to ${operation} ${resourceName}`
    toast.error(message)
    onError?.(error)
  }

  return {
    notifyCreateSuccess,
    notifyUpdateSuccess,
    notifyDeleteSuccess,
    notifyError,
  }
}