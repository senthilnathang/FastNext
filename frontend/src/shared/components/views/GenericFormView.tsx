'use client'

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Badge
} from '../'
import { useGenericPermissions } from '@/modules/admin/hooks/useGenericPermissions'
import { Save, X, AlertCircle } from 'lucide-react'

export type FieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'textarea' 
  | 'select' 
  | 'checkbox' 
  | 'date' 
  | 'datetime' 
  | 'file'
  | 'custom'

export interface FormField<T = any> {
  name: keyof T | string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  description?: string
  defaultValue?: unknown
  
  // Validation
  validation?: z.ZodType<unknown>
  
  // For select fields
  options?: Array<{ value: string | number; label: string }>
  multiple?: boolean
  
  // For number fields
  min?: number
  max?: number
  step?: number
  
  // For text fields
  maxLength?: number
  minLength?: number
  
  // For file fields
  accept?: string
  maxSize?: number
  
  // Custom rendering
  render?: (field: FormField<T>, form: any) => React.ReactNode
  
  // Conditional display
  condition?: (formData: T) => boolean
  
  // Field styling
  className?: string
  disabled?: boolean
  readOnly?: boolean
}

export interface FormSection<T = any> {
  title: string
  description?: string
  fields: FormField<T>[]
  collapsible?: boolean
  defaultExpanded?: boolean
}

export interface GenericFormViewProps<T = any> {
  // Form configuration
  fields?: FormField<T>[]
  sections?: FormSection<T>[]
  initialData?: Partial<T>
  
  // Permissions
  resourceName: string
  resourceId?: number
  projectId?: number
  mode: 'create' | 'edit' | 'view'
  
  // Form handling
  onSubmit: (data: T) => Promise<void> | void
  onCancel?: () => void
  onFieldChange?: (name: string, value: unknown, formData: T) => void
  
  // Validation
  validationSchema?: z.ZodSchema<T>
  
  // UI customization
  title?: string
  subtitle?: string
  submitButtonText?: string
  cancelButtonText?: string
  
  // Layout
  columns?: 1 | 2 | 3
  spacing?: 'compact' | 'normal' | 'relaxed'
  
  // State
  loading?: boolean
  error?: string | null
  
  // Advanced features
  autosave?: boolean
  autosaveDelay?: number
  showUnsavedChanges?: boolean
  
  // Custom actions
  customActions?: Array<{
    label: string
    icon?: React.ReactNode
    action: (formData: T) => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    position?: 'header' | 'footer'
  }>
}

export function GenericFormView<T = any>({
  fields = [],
  sections = [],
  initialData = {},
  resourceName,
  resourceId,
  projectId,
  mode,
  onSubmit,
  onCancel,
  onFieldChange,
  validationSchema,
  title,
  subtitle,
  submitButtonText,
  cancelButtonText = 'Cancel',
  columns = 1,
  spacing = 'normal',
  loading = false,
  error = null,
  autosave = false,
  autosaveDelay = 2000,
  showUnsavedChanges = true,
  customActions = []
}: GenericFormViewProps<T>) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [autosaveTimeout, setAutosaveTimeout] = useState<NodeJS.Timeout | null>(null)

  const permissions = useGenericPermissions(resourceName, projectId)

  // Determine form permissions
  const canEdit = mode === 'create' 
    ? permissions.checkCreate(resourceName, projectId)
    : permissions.checkUpdate(resourceName, resourceId, projectId)
  
  const isReadOnly = mode === 'view' || !canEdit

  // Default submit button text
  const defaultSubmitText = mode === 'create' ? 'Create' : mode === 'edit' ? 'Save' : 'Update'
  const finalSubmitText = submitButtonText || defaultSubmitText

  // Create default validation schema if none provided
  const defaultSchema = z.object({}) as any
  const schema = validationSchema || defaultSchema

  const form = useForm<any>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData as any,
    mode: 'onChange'
  })

  const { handleSubmit, control, watch, formState: { errors, isDirty, isSubmitting } } = form

  // Watch for form changes
  const watchedData = watch()

  useEffect(() => {
    if (showUnsavedChanges) {
      setHasUnsavedChanges(isDirty)
    }
  }, [isDirty, showUnsavedChanges])

  // Handle autosave
  useEffect(() => {
    if (autosave && isDirty && mode === 'edit' && canEdit) {
      if (autosaveTimeout) {
        clearTimeout(autosaveTimeout)
      }
      
      const timeout = setTimeout(() => {
        handleSubmit(onSubmit as any)()
      }, autosaveDelay)
      
      setAutosaveTimeout(timeout)
    }
    
    return () => {
      if (autosaveTimeout) {
        clearTimeout(autosaveTimeout)
      }
    }
  }, [watchedData, autosave, isDirty, mode, canEdit, autosaveDelay, autosaveTimeout, handleSubmit, onSubmit])

  // Handle field changes
  useEffect(() => {
    if (onFieldChange) {
      const subscription = watch((value, { name }) => {
        if (name) {
          onFieldChange(name, value[name], value as T)
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [watch, onFieldChange])

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle)
    } else {
      newExpanded.add(sectionTitle)
    }
    setExpandedSections(newExpanded)
  }

  const renderField = (field: FormField<T>) => {
    // Check field condition
    if (field.condition && !field.condition(watchedData)) {
      return null
    }

    const fieldProps = {
      disabled: isReadOnly || field.disabled || loading,
      readOnly: field.readOnly,
      className: field.className
    }

    const renderFieldInput = () => {
      if (field.render) {
        return field.render(field, form)
      }

      switch (field.type) {
        case 'text':
        case 'email':
        case 'password':
          return (
            <Controller
              name={field.name as any}
              control={control}
              render={({ field: formField }) => (
                <Input
                  {...formField}
                  {...fieldProps}
                  type={field.type}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                />
              )}
            />
          )

        case 'number':
          return (
            <Controller
              name={field.name as any}
              control={control}
              render={({ field: formField }) => (
                <Input
                  {...formField}
                  {...fieldProps}
                  type="number"
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  onChange={(e) => formField.onChange(Number(e.target.value))}
                />
              )}
            />
          )

        case 'textarea':
          return (
            <Controller
              name={field.name as any}
              control={control}
              render={({ field: formField }) => (
                <Textarea
                  {...formField}
                  {...fieldProps}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  rows={4}
                />
              )}
            />
          )

        case 'select':
          return (
            <Controller
              name={field.name as any}
              control={control}
              render={({ field: formField }) => (
                <Select
                  value={formField.value}
                  onValueChange={formField.onChange}
                  disabled={fieldProps.disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )

        case 'checkbox':
          return (
            <Controller
              name={field.name as any}
              control={control}
              render={({ field: formField }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={String(field.name)}
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                    disabled={fieldProps.disabled}
                  />
                  <Label htmlFor={String(field.name)}>{field.label}</Label>
                </div>
              )}
            />
          )

        case 'date':
          return (
            <Controller
              name={field.name as any}
              control={control}
              render={({ field: formField }) => (
                <Input
                  {...formField}
                  {...fieldProps}
                  type="date"
                  value={formField.value ? new Date(formField.value).toISOString().split('T')[0] : ''}
                  onChange={(e) => formField.onChange(e.target.value ? new Date(e.target.value) : null)}
                />
              )}
            />
          )

        case 'datetime':
          return (
            <Controller
              name={field.name as any}
              control={control}
              render={({ field: formField }) => (
                <Input
                  {...formField}
                  {...fieldProps}
                  type="datetime-local"
                  value={formField.value ? new Date(formField.value).toISOString().slice(0, 16) : ''}
                  onChange={(e) => formField.onChange(e.target.value ? new Date(e.target.value) : null)}
                />
              )}
            />
          )

        case 'file':
          return (
            <Controller
              name={field.name as any}
              control={control}
              render={({ field: formField }) => (
                <Input
                  type="file"
                  accept={field.accept}
                  onChange={(e) => formField.onChange(e.target.files?.[0])}
                  disabled={fieldProps.disabled}
                />
              )}
            />
          )

        default:
          return (
            <Input
              {...fieldProps}
              placeholder={field.placeholder}
            />
          )
      }
    }

    const fieldError = errors[field.name as string]

    return (
      <div key={String(field.name)} className={`space-y-2 ${field.className || ''}`}>
        {field.type !== 'checkbox' && (
          <Label htmlFor={String(field.name)} className="flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
        )}
        
        {renderFieldInput()}
        
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
        
        {fieldError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {fieldError.message as string}
          </p>
        )}
      </div>
    )
  }

  const renderFieldsGrid = (fieldsToRender: FormField<T>[]) => {
    const gridCols = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    }

    const spacingClass = {
      compact: 'gap-3',
      normal: 'gap-4',
      relaxed: 'gap-6'
    }

    return (
      <div className={`grid ${gridCols[columns]} ${spacingClass[spacing]}`}>
        {fieldsToRender.map(renderField)}
      </div>
    )
  }

  const headerActions = customActions.filter(action => action.position === 'header' || !action.position)
  const footerActions = customActions.filter(action => action.position === 'footer')

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          {hasUnsavedChanges && showUnsavedChanges && (
            <Badge variant="outline" className="mt-1">
              Unsaved changes
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {headerActions.map((action, index) => (
            <Button
              key={index}
              type="button"
              variant={action.variant || 'outline'}
              onClick={() => action.action(watchedData)}
              disabled={loading}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Content */}
      {sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map((section) => {
            const isExpanded = section.collapsible ? 
              expandedSections.has(section.title) : 
              section.defaultExpanded !== false

            return (
              <Card key={section.title}>
                <CardHeader
                  className={section.collapsible ? 'cursor-pointer' : ''}
                  onClick={section.collapsible ? () => toggleSection(section.title) : undefined}
                >
                  <CardTitle className="flex items-center justify-between">
                    {section.title}
                    {section.collapsible && (
                      <span>{isExpanded ? '−' : '+'}</span>
                    )}
                  </CardTitle>
                  {section.description && (
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  )}
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    {renderFieldsGrid(section.fields)}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {renderFieldsGrid(fields)}
          </CardContent>
        </Card>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          {footerActions.map((action, index) => (
            <Button
              key={index}
              type="button"
              variant={action.variant || 'outline'}
              onClick={() => action.action(watchedData)}
              disabled={loading}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              {cancelButtonText}
            </Button>
          )}
          
          {canEdit && (
            <Button
              type="submit"
              disabled={loading || isSubmitting || (!isDirty && mode === 'edit')}
            >
              {loading || isSubmitting ? (
                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {finalSubmitText}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}