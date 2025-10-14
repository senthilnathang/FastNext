'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ViewManager, ViewManagerProps, ViewConfig, Column } from './ViewManager'
import { GenericFormView, FormField, FormSection, GenericFormViewProps } from './GenericFormView'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import { z } from 'zod'

export type FormViewMode = 'list' | 'create' | 'edit' | 'view'

export interface FormViewConfig<T = any> {
  // Resource configuration
  resourceName: string
  baseUrl: string // e.g., '/admin/rls/policies'
  apiEndpoint: string // e.g., '/api/v1/rls/policies'

  // Form configuration
  formFields: FormField<T>[]
  formSections?: FormSection<T>[]
  validationSchema?: z.ZodSchema<T>

  // Table configuration
  columns: Column<T>[]
  views: ViewConfig[]
  defaultView: string

  // UI customization
  title: string
  subtitle?: string
  createButtonText?: string
  editButtonText?: string
  viewButtonText?: string
  deleteButtonText?: string

  // Permissions
  canCreate?: boolean
  canEdit?: boolean
  canView?: boolean
  canDelete?: boolean

  // API configuration
  onFetch?: () => Promise<T[]>
  onCreate?: (data: T) => Promise<T>
  onUpdate?: (id: string | number, data: T) => Promise<T>
  onDelete?: (id: string | number) => Promise<void>
}

export interface CommonFormViewManagerProps<T = any> extends Omit<ViewManagerProps<T>, 'onCreateClick' | 'onEditClick' | 'onViewClick' | 'onDeleteClick' | 'columns' | 'views' | 'title' | 'subtitle'> {
  config: FormViewConfig<T>
  mode?: FormViewMode
  itemId?: string | number
  onModeChange?: (mode: FormViewMode, itemId?: string | number) => void
}

export function CommonFormViewManager<T extends { id?: string | number }>({
  config,
  mode = 'list',
  itemId,
  onModeChange,
  data,
  loading = false,
  error = null,
  ...viewManagerProps
}: CommonFormViewManagerProps<T>) {
  const router = useRouter()
  const [currentItem, setCurrentItem] = useState<T | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<string>(
    viewManagerProps.activeView || config.defaultView
  )

  // Sync activeView with prop changes
  useEffect(() => {
    if (viewManagerProps.activeView) {
      setActiveView(viewManagerProps.activeView)
    }
  }, [viewManagerProps.activeView])

  // Find current item when in edit/view mode
  const selectedItem = useMemo(() => {
    if (itemId && data) {
      const found = data.find(item => String(item.id) === String(itemId))
      if (found && !currentItem) {
        setCurrentItem(found)
      }
      return found || null
    }
    return currentItem
  }, [itemId, data, currentItem])

  const handleModeChange = useCallback((newMode: FormViewMode, newItemId?: string | number) => {
    if (onModeChange) {
      onModeChange(newMode, newItemId)
    } else {
      // Default behavior: update URL with query parameters
      const params = new URLSearchParams()
      if (newMode !== 'list') {
        params.set('mode', newMode)
        if (newItemId) {
          params.set('id', String(newItemId))
        }
      }
      const queryString = params.toString()
      const url = queryString ? `${config.baseUrl}?${queryString}` : config.baseUrl
      router.push(url)
    }
  }, [onModeChange, router, config.baseUrl])

  const handleCreate = useCallback(() => {
    handleModeChange('create')
  }, [handleModeChange])

  const handleEdit = useCallback((item: T) => {
    setCurrentItem(item)
    if (item.id) {
      handleModeChange('edit', item.id)
    }
  }, [handleModeChange])

  const handleView = useCallback((item: T) => {
    setCurrentItem(item)
    if (item.id) {
      handleModeChange('view', item.id)
    }
  }, [handleModeChange])

  const handleDelete = useCallback(async (item: T) => {
    if (!config.onDelete || !item.id) return

    try {
      setFormLoading(true)
      await config.onDelete(item.id)
      handleModeChange('list')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setFormLoading(false)
    }
  }, [config, handleModeChange])

  const handleFormSubmit = useCallback(async (formData: T) => {
    try {
      setFormLoading(true)
      setFormError(null)

      if (mode === 'create' && config.onCreate) {
        await config.onCreate(formData)
      } else if (mode === 'edit' && config.onUpdate && selectedItem && selectedItem.id) {
        await config.onUpdate(selectedItem.id, formData)
      }

      handleModeChange('list')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Operation failed')
    } finally {
      setFormLoading(false)
    }
  }, [mode, config, selectedItem, handleModeChange])

  const handleFormCancel = useCallback(() => {
    handleModeChange('list')
  }, [handleModeChange])

  const handleViewChange = useCallback((viewId: string) => {
    setActiveView(viewId)
    if (viewManagerProps.onViewChange) {
      viewManagerProps.onViewChange(viewId)
    }
  }, [viewManagerProps])

  // Enhanced ViewManager props
  const enhancedViewManagerProps = {
    ...viewManagerProps,
    data,
    loading,
    error,
    columns: config.columns,
    views: config.views,
    activeView: activeView,
    onViewChange: handleViewChange,
    title: config.title,
    subtitle: config.subtitle,
    onCreateClick: config.canCreate ? handleCreate : undefined,
    onEditClick: config.canEdit ? handleEdit : undefined,
    onViewClick: config.canView ? handleView : undefined,
    onDeleteClick: config.canDelete ? handleDelete : undefined,
  } as ViewManagerProps<T>

  const renderBreadcrumb = () => {
    const breadcrumbs = [
      { label: config.title, href: config.baseUrl, current: mode === 'list' }
    ]

    if (mode === 'create') {
      breadcrumbs.push({ label: 'Create New', href: '', current: true })
    } else if (mode === 'edit' && selectedItem) {
      breadcrumbs.push({ label: `Edit ${selectedItem.id}`, href: '', current: true })
    } else if (mode === 'view' && selectedItem) {
      breadcrumbs.push({ label: `View ${selectedItem.id}`, href: '', current: true })
    }

    return (
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span>/</span>}
            {crumb.current ? (
              <span className="text-foreground font-medium">{crumb.label}</span>
            ) : (
              <button
                onClick={() => handleModeChange('list')}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>
    )
  }

  const renderFormView = () => {
    const formProps: GenericFormViewProps<T> = {
      fields: config.formFields,
      sections: config.formSections,
      initialData: selectedItem || {},
      resourceName: config.resourceName,
      resourceId: selectedItem?.id as number,
      mode: mode as 'create' | 'edit' | 'view',
      onSubmit: handleFormSubmit,
      onCancel: handleFormCancel,
      validationSchema: config.validationSchema,
      title: mode === 'create'
        ? `Create ${config.title.slice(0, -1)}`
        : mode === 'edit'
        ? `Edit ${config.title.slice(0, -1)}`
        : `View ${config.title.slice(0, -1)}`,
      submitButtonText: mode === 'create' ? config.createButtonText : config.editButtonText,
      loading: formLoading,
      error: formError,
    }

    return (
      <div className="space-y-6">
        {renderBreadcrumb()}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => handleModeChange('list')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {config.title}
          </Button>

          {mode === 'view' && config.canEdit && selectedItem && (
            <Button
              variant="outline"
              onClick={() => handleEdit(selectedItem)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {config.editButtonText || 'Edit'}
            </Button>
          )}
        </div>

        {/* Show loading state while fetching item data for edit/view */}
        {(mode === 'edit' || mode === 'view') && itemId && !selectedItem && loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading {config.title.slice(0, -1).toLowerCase()}...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <GenericFormView {...formProps} />
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderListView = () => {
    return (
      <div className="space-y-6">
        {renderBreadcrumb()}
        <ViewManager {...(enhancedViewManagerProps as any)} />
      </div>
    )
  }

  // Render based on current mode
  if (mode === 'list') {
    return renderListView()
  } else {
    return renderFormView()
  }
}

// Helper function to create a standardized configuration
export function createFormViewConfig<T>(config: Partial<FormViewConfig<T>> & {
  resourceName: string
  baseUrl: string
  apiEndpoint: string
  title: string
  formFields: FormField<T>[]
  columns: Column<T>[]
}): FormViewConfig<T> {
  return {
    views: [
      {
        id: 'list',
        name: 'List View',
        type: 'list',
        columns: config.columns,
        filters: {},
      },
      {
        id: 'card',
        name: 'Card View',
        type: 'card',
        columns: config.columns,
        filters: {},
      }
    ],
    defaultView: 'list',
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    ...config,
  }
}
