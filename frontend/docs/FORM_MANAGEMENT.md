# Form Management System Documentation

## Overview

FastNext includes a powerful form management system built around two core components: `CommonFormViewManager` and `GenericFormView`. This system provides a unified approach to data management with URL-based navigation, comprehensive validation, and seamless integration with the backend API.

## Core Components

### 1. **CommonFormViewManager**

The `CommonFormViewManager` is the main component that orchestrates form-based data management with multiple views and navigation.

#### Features
- **URL-based Navigation**: Uses query parameters for state management (`?mode=edit&id=123`)
- **Multiple Views**: Integrates with ViewManager for list, card, kanban, gantt, and calendar views
- **Form Management**: Handles create, edit, and view operations
- **Statistics Dashboard**: Optional statistics display in list mode
- **Breadcrumb Navigation**: Automatic breadcrumb generation
- **Loading States**: Comprehensive loading state management

#### Usage Example

```typescript
import { CommonFormViewManager } from '@/shared/components/views'

const ProjectsPage = () => {
  return (
    <CommonFormViewManager<Project>
      resourceName="projects"
      baseUrl="/projects"
      apiEndpoint="/api/v1/projects"
      formFields={projectFormFields}
      columns={projectColumns}
      validationSchema={projectSchema}
      showStatistics={true}
      enableSearch={true}
      enableFilters={true}
      statisticsConfig={{
        totalProjects: { label: 'Total Projects', color: 'blue' },
        activeProjects: { label: 'Active', color: 'green' },
        completedProjects: { label: 'Completed', color: 'purple' }
      }}
    />
  )
}
```

#### Configuration Interface

```typescript
interface FormViewConfig<T = any> {
  resourceName: string              // Display name for the resource
  baseUrl: string                   // Base URL for navigation
  apiEndpoint: string              // API endpoint for data operations
  formFields: FormField<T>[]       // Form field definitions
  columns: Column<T>[]             // Table column definitions
  validationSchema?: z.ZodSchema<T> // Zod validation schema
  showStatistics?: boolean         // Enable statistics dashboard
  enableSearch?: boolean           // Enable search functionality
  enableFilters?: boolean          // Enable filtering
  statisticsConfig?: StatisticsConfig // Statistics configuration
  customActions?: Action[]         // Custom action buttons
  permissions?: PermissionConfig   // Permission settings
}
```

### 2. **GenericFormView**

The `GenericFormView` component handles the actual form rendering and submission logic.

#### Features
- **Dynamic Form Generation**: Creates forms based on field definitions
- **React Hook Form Integration**: Uses RHF for form state management
- **Zod Validation**: Type-safe validation with Zod schemas
- **Auto-population**: Automatically populates form in edit mode
- **Date Handling**: Robust date field handling and formatting
- **Error Management**: Comprehensive error handling and display

#### Usage Example

```typescript
import { GenericFormView } from '@/shared/components/views'

const ProjectForm = () => {
  return (
    <GenericFormView<Project>
      mode="edit"
      initialData={projectData}
      formFields={projectFormFields}
      validationSchema={projectSchema}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isSubmitting}
    />
  )
}
```

## Form Field Definitions

### Field Types

```typescript
interface FormField<T> {
  name: keyof T                    // Field name (type-safe)
  label: string                    // Display label
  type: FieldType                  // Field type
  placeholder?: string             // Placeholder text
  required?: boolean              // Required validation
  options?: SelectOption[]        // Options for select fields
  validation?: ValidationRule[]   // Custom validation rules
  defaultValue?: any             // Default value
  disabled?: boolean             // Disabled state
  helperText?: string            // Help text
  className?: string             // Custom CSS classes
  dependency?: FieldDependency   // Field dependencies
}

type FieldType = 
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'date'
  | 'datetime'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'file'
  | 'hidden'
```

### Example Field Definitions

```typescript
const projectFormFields: FormField<Project>[] = [
  {
    name: 'name',
    label: 'Project Name',
    type: 'text',
    placeholder: 'Enter project name',
    required: true
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Enter project description'
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'planning', label: 'Planning' },
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' },
      { value: 'archived', label: 'Archived' }
    ]
  },
  {
    name: 'start_date',
    label: 'Start Date',
    type: 'date',
    required: true
  },
  {
    name: 'end_date',
    label: 'End Date',
    type: 'date',
    dependency: {
      field: 'start_date',
      condition: (value) => !!value
    }
  },
  {
    name: 'is_public',
    label: 'Public Project',
    type: 'switch',
    defaultValue: false
  }
]
```

## Validation Schemas

### Zod Integration

```typescript
import { z } from 'zod'

const projectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  status: z.enum(['planning', 'active', 'completed', 'archived']),
  
  start_date: z.union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined
      if (val instanceof Date) return val.toISOString().split('T')[0]
      return val
    }),
  
  end_date: z.union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined
      if (val instanceof Date) return val.toISOString().split('T')[0]
      return val
    }),
  
  budget: z.number()
    .min(0, 'Budget must be positive')
    .optional(),
  
  is_public: z.boolean()
    .default(false)
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date)
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["end_date"]
})
```

## URL-based Navigation

### Query Parameter Structure

The system uses query parameters for navigation:

- `?mode=list` - List view (default)
- `?mode=create` - Create form
- `?mode=edit&id=123` - Edit form for item with ID 123
- `?mode=view&id=123` - View details for item with ID 123

### Navigation Hooks

```typescript
import { useRouter, useSearchParams } from 'next/navigation'

const useFormNavigation = (baseUrl: string) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const mode = searchParams.get('mode') || 'list'
  const id = searchParams.get('id')
  
  const navigateToList = () => {
    router.push(baseUrl)
  }
  
  const navigateToCreate = () => {
    router.push(`${baseUrl}?mode=create`)
  }
  
  const navigateToEdit = (itemId: string | number) => {
    router.push(`${baseUrl}?mode=edit&id=${itemId}`)
  }
  
  const navigateToView = (itemId: string | number) => {
    router.push(`${baseUrl}?mode=view&id=${itemId}`)
  }
  
  return {
    mode,
    id,
    navigateToList,
    navigateToCreate,
    navigateToEdit,
    navigateToView
  }
}
```

## Data Operations

### API Integration

```typescript
// API service for projects
class ProjectsApiService {
  private baseUrl = '/api/v1/projects'
  
  async getAll(params?: QueryParams): Promise<Project[]> {
    const response = await fetch(`${this.baseUrl}?${new URLSearchParams(params)}`)
    return response.json()
  }
  
  async getById(id: string | number): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`)
    return response.json()
  }
  
  async create(data: CreateProjectRequest): Promise<Project> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  }
  
  async update(id: string | number, data: UpdateProjectRequest): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  }
  
  async delete(id: string | number): Promise<void> {
    await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    })
  }
}
```

### React Query Integration

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const useProjects = () => {
  const queryClient = useQueryClient()
  const apiService = new ProjectsApiService()
  
  const {
    data: projects,
    isLoading,
    error
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getAll()
  })
  
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) => apiService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: UpdateProjectRequest }) =>
      apiService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
  
  return {
    projects,
    isLoading,
    error,
    createProject: createMutation.mutateAsync,
    updateProject: updateMutation.mutateAsync,
    deleteProject: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}
```

## Statistics Dashboard

### Configuration

```typescript
interface StatisticsConfig {
  [key: string]: {
    label: string
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray'
    icon?: React.ComponentType
    formatter?: (value: number) => string
  }
}

const projectStatisticsConfig: StatisticsConfig = {
  totalProjects: {
    label: 'Total Projects',
    color: 'blue',
    icon: FolderIcon
  },
  activeProjects: {
    label: 'Active Projects',
    color: 'green',
    icon: PlayIcon
  },
  completedProjects: {
    label: 'Completed Projects',
    color: 'purple',
    icon: CheckCircleIcon
  },
  overbudgetProjects: {
    label: 'Over Budget',
    color: 'red',
    icon: ExclamationTriangleIcon,
    formatter: (value) => `${value} projects`
  }
}
```

### Statistics Hook

```typescript
const useProjectStatistics = () => {
  const { data: projects } = useProjects()
  
  const statistics = useMemo(() => {
    if (!projects) return {}
    
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      overbudgetProjects: projects.filter(p => 
        p.budget && p.actual_cost && p.actual_cost > p.budget
      ).length
    }
  }, [projects])
  
  return statistics
}
```

## Advanced Features

### 1. **Field Dependencies**

```typescript
interface FieldDependency {
  field: string                    // Dependent field name
  condition: (value: any) => boolean // Condition function
  action?: 'show' | 'hide' | 'enable' | 'disable' // Action to perform
}

// Example: Show end date only when start date is selected
{
  name: 'end_date',
  label: 'End Date',
  type: 'date',
  dependency: {
    field: 'start_date',
    condition: (value) => !!value,
    action: 'show'
  }
}
```

### 2. **Custom Validation Rules**

```typescript
interface ValidationRule {
  rule: (value: any, formData: any) => boolean
  message: string
}

{
  name: 'email',
  label: 'Email',
  type: 'email',
  validation: [
    {
      rule: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Please enter a valid email address'
    }
  ]
}
```

### 3. **Conditional Rendering**

```typescript
{
  name: 'advanced_settings',
  label: 'Advanced Settings',
  type: 'checkbox',
  defaultValue: false
},
{
  name: 'cache_duration',
  label: 'Cache Duration (minutes)',
  type: 'number',
  dependency: {
    field: 'advanced_settings',
    condition: (value) => value === true
  }
}
```

## Date Handling

### Date Formatting Utilities

```typescript
// Date formatting for forms
const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    return dateObj.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

// Date conversion for API
const convertDateForApi = (date: Date | string | null | undefined): string | null => {
  if (!date) return null
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return null
    
    return dateObj.toISOString().split('T')[0]
  } catch {
    return null
  }
}
```

## Error Handling

### Error Display Component

```typescript
interface ErrorDisplayProps {
  errors: FieldErrors
  fieldName: string
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors, fieldName }) => {
  const error = errors[fieldName]
  
  if (!error) return null
  
  return (
    <div className="text-sm text-red-600 mt-1">
      {error.message}
    </div>
  )
}
```

### Form Error Handling

```typescript
const handleFormSubmit = async (data: FormData) => {
  try {
    setIsSubmitting(true)
    await submitData(data)
    toast.success('Data saved successfully')
    router.push(baseUrl)
  } catch (error) {
    if (error instanceof ValidationError) {
      // Handle validation errors
      error.fields.forEach(field => {
        setError(field.name, { message: field.message })
      })
    } else {
      // Handle general errors
      toast.error('An error occurred while saving data')
    }
  } finally {
    setIsSubmitting(false)
  }
}
```

## Best Practices

### 1. **Form Structure**
- Keep forms focused and concise
- Group related fields logically
- Use progressive disclosure for advanced options
- Provide clear labels and help text

### 2. **Validation**
- Validate on both client and server
- Provide immediate feedback
- Use clear, actionable error messages
- Implement progressive validation

### 3. **Performance**
- Use React Hook Form for optimal performance
- Implement field-level validation
- Debounce API calls for search/autocomplete
- Use proper memoization for complex computations

### 4. **Accessibility**
- Use semantic HTML elements
- Provide proper ARIA labels
- Implement keyboard navigation
- Ensure proper color contrast

### 5. **User Experience**
- Show loading states during operations
- Provide confirmation for destructive actions
- Implement auto-save for long forms
- Use breadcrumbs for navigation context

This comprehensive form management system provides a robust foundation for building data-driven applications with excellent user experience and developer productivity.