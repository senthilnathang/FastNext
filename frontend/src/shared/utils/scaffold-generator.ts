/**
 * Model and Frontend Scaffolding Generator
 * 
 * This utility generates complete CRUD interfaces for new models including:
 * - TypeScript interfaces and types
 * - API service files
 * - React Query hooks  
 * - DataTable components
 * - Form components
 * - Navigation menu entries
 * - Page components with routing
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

export interface FieldDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'text' | 'select' | 'multiselect'
  required?: boolean
  label?: string
  placeholder?: string
  options?: string[] // For select/multiselect types
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  displayInList?: boolean // Show in DataTable
  searchable?: boolean // Allow searching by this field
  sortable?: boolean // Allow sorting by this field
  filterType?: 'text' | 'select' | 'date' | 'boolean' // Filter type in DataTable
}

export interface ModelDefinition {
  name: string // e.g., "Product", "Category", "Order"
  pluralName?: string // e.g., "Products", "Categories", "Orders" 
  description?: string
  tableName?: string // Database table name (snake_case)
  icon?: string // Lucide icon name
  module?: string // Which module permissions it needs
  fields: FieldDefinition[]
  hasTimestamps?: boolean // created_at, updated_at
  hasStatus?: boolean // is_active field
  relationships?: {
    belongsTo?: string[] // Foreign key relationships
    hasMany?: string[] // One-to-many relationships
  }
}

export class ScaffoldGenerator {
  private basePath: string
  private model: ModelDefinition

  constructor(model: ModelDefinition, basePath = '/home/sen/FastNext/frontend/src') {
    this.model = model
    this.basePath = basePath
    
    // Set defaults
    if (!this.model.pluralName) {
      this.model.pluralName = this.model.name + 's'
    }
    if (!this.model.tableName) {
      this.model.tableName = this.camelToSnake(this.model.pluralName.toLowerCase())
    }
    if (!this.model.icon) {
      this.model.icon = 'FileText'
    }
    if (this.model.hasTimestamps === undefined) {
      this.model.hasTimestamps = true
    }
    if (this.model.hasStatus === undefined) {
      this.model.hasStatus = true
    }
  }

  // Utility methods
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }

  private snakeToCamel(str: string): string {
    return str.replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    )
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private lowercaseFirst(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1)
  }

  // Generate TypeScript interfaces
  generateTypes(): string {
    const modelName = this.model.name
    const fields = this.model.fields
    
    const interfaceFields = fields.map(field => {
      const optional = field.required ? '' : '?'
      let type: string
      
      switch (field.type) {
        case 'number':
          type = 'number'
          break
        case 'boolean':
          type = 'boolean'
          break
        case 'date':
          type = 'string' // ISO string format
          break
        case 'select':
          type = field.options ? `'${field.options.join("' | '")}'` : 'string'
          break
        case 'multiselect':
          type = 'string[]'
          break
        default:
          type = 'string'
      }
      
      return `  ${field.name}${optional}: ${type}`
    }).join('\n')

    // Add standard fields
    let standardFields = '  id: number'
    if (this.model.hasTimestamps) {
      standardFields += '\n  created_at: string'
      standardFields += '\n  updated_at?: string'
    }
    if (this.model.hasStatus) {
      standardFields += '\n  is_active: boolean'
    }

    const template = `import { apiClient } from './client'
import { API_CONFIG } from './config'

// ${modelName} types
export interface ${modelName} {
${standardFields}
${interfaceFields}
}

export interface Create${modelName}Request {
${fields.filter(f => f.required).map(f => {
  let type: string
  switch (f.type) {
    case 'number': type = 'number'; break
    case 'boolean': type = 'boolean'; break
    case 'date': type = 'string'; break
    case 'multiselect': type = 'string[]'; break
    case 'select': type = f.options ? `'${f.options.join("' | '")}'` : 'string'; break
    default: type = 'string'
  }
  return `  ${f.name}: ${type}`
}).join('\n')}${fields.filter(f => !f.required).map(f => {
  let type: string
  switch (f.type) {
    case 'number': type = 'number'; break
    case 'boolean': type = 'boolean'; break
    case 'date': type = 'string'; break
    case 'multiselect': type = 'string[]'; break
    case 'select': type = f.options ? `'${f.options.join("' | '")}'` : 'string'; break
    default: type = 'string'
  }
  return `  ${f.name}?: ${type}`
}).join('\n')}${this.model.hasStatus ? '\n  is_active?: boolean' : ''}
}

export interface Update${modelName}Request {
${fields.map(f => {
  let type: string
  switch (f.type) {
    case 'number': type = 'number'; break
    case 'boolean': type = 'boolean'; break
    case 'date': type = 'string'; break
    case 'multiselect': type = 'string[]'; break
    case 'select': type = f.options ? `'${f.options.join("' | '")}'` : 'string'; break
    default: type = 'string'
  }
  return `  ${f.name}?: ${type}`
}).join('\n')}${this.model.hasStatus ? '\n  is_active?: boolean' : ''}
}

export interface ${modelName}ListParams {
  skip?: number
  limit?: number
  search?: string${this.model.hasStatus ? '\n  is_active?: boolean' : ''}${fields.filter(f => f.filterType).map(f => `\n  ${f.name}?: ${f.type === 'boolean' ? 'boolean' : 'string'}`).join('')}
}

export interface ${modelName}ListResponse {
  items: ${modelName}[]
  total: number
  skip: number
  limit: number
}

// API functions
export const ${this.lowercaseFirst(this.model.pluralName!)}Api = {
  // Get paginated list
  get${this.model.pluralName}: async (params?: ${modelName}ListParams): Promise<${modelName}ListResponse> => {
    const searchParams = new URLSearchParams()
    
    if (params?.skip !== undefined) searchParams.set('skip', params.skip.toString())
    if (params?.limit !== undefined) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)${this.model.hasStatus ? `
    if (params?.is_active !== undefined) searchParams.set('is_active', params.is_active.toString())` : ''}${fields.filter(f => f.filterType).map(f => `
    if (params?.${f.name}) searchParams.set('${f.name}', params.${f.name}.toString())`).join('')}
    
    const url = \`\${API_CONFIG.BASE_URL}/${this.model.tableName}\${searchParams.toString() ? '?' + searchParams.toString() : ''}\`
    return apiClient.get<${modelName}ListResponse>(url)
  },

  // Get single item
  get${modelName}: async (id: number): Promise<${modelName}> => {
    return apiClient.get<${modelName}>(\`\${API_CONFIG.BASE_URL}/${this.model.tableName}/\${id}\`)
  },

  // Create new item
  create${modelName}: async (data: Create${modelName}Request): Promise<${modelName}> => {
    return apiClient.post<${modelName}>(\`\${API_CONFIG.BASE_URL}/${this.model.tableName}\`, data)
  },

  // Update existing item
  update${modelName}: async (id: number, data: Update${modelName}Request): Promise<${modelName}> => {
    return apiClient.patch<${modelName}>(\`\${API_CONFIG.BASE_URL}/${this.model.tableName}/\${id}\`, data)
  },

  // Delete item
  delete${modelName}: async (id: number): Promise<void> => {
    return apiClient.delete(\`\${API_CONFIG.BASE_URL}/${this.model.tableName}/\${id}\`)
  },${this.model.hasStatus ? `

  // Toggle active status
  toggle${modelName}Status: async (id: number): Promise<${modelName}> => {
    return apiClient.patch<${modelName}>(\`\${API_CONFIG.BASE_URL}/${this.model.tableName}/\${id}/toggle-status\`)
  },` : ''}
}
`

    return template
  }

  // Generate all scaffolded files
  generateAll(): void {
    console.log(`🚀 Generating scaffolding for ${this.model.name}...`)
    
    try {
      // 1. Generate API types
      this.generateAPIFile()
      
      // 2. Generate hooks
      this.generateHooksFile()
      
      // 3. Generate DataTable component  
      this.generateDataTableComponent()
      
      // 4. Generate form components
      this.generateFormComponents()
      
      // 5. Generate page components
      this.generatePageComponents()
      
      // 6. Update navigation menu
      this.updateNavigationMenu()
      
      console.log(`✅ Successfully generated scaffolding for ${this.model.name}!`)
      console.log('\nGenerated files:')
      console.log(`📁 API: src/shared/services/api/${this.model.name.toLowerCase()}.ts`)
      console.log(`📁 Hooks: src/modules/${this.model.name.toLowerCase()}/hooks/use${this.model.pluralName}.ts`)
      console.log(`📁 DataTable: src/shared/components/data-table/${this.model.pluralName}DataTable.tsx`)
      console.log(`📁 Form: src/modules/${this.model.name.toLowerCase()}/components/${this.model.name}Form.tsx`)
      console.log(`📁 Pages: src/app/${this.model.name.toLowerCase()}/(list|create|edit)/page.tsx`)
      console.log(`📁 Navigation: Updated menuConfig.ts`)
      
    } catch (error) {
      console.error(`❌ Error generating scaffolding:`, error)
      throw error
    }
  }

  private generateAPIFile(): void {
    const content = this.generateTypes()
    const dir = join(this.basePath, 'shared/services/api')
    const filePath = join(dir, `${this.model.name.toLowerCase()}.ts`)
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(filePath, content)
  }

  private generateHooksFile(): void {
    const modelName = this.model.name
    const pluralName = this.model.pluralName!
    const lowercasePlural = pluralName.toLowerCase()
    const lowercaseModel = modelName.toLowerCase()
    
    const content = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ${lowercasePlural}Api, 
  type Create${modelName}Request, 
  type Update${modelName}Request, 
  type ${modelName}ListParams, 
  type ${modelName} 
} from '@/shared/services/api/${lowercaseModel}'

// Query keys for ${lowercasePlural}
export const ${lowercaseModel}Keys = {
  all: ['${lowercasePlural}'] as const,
  lists: () => [...${lowercaseModel}Keys.all, 'list'] as const,
  list: (params?: ${modelName}ListParams) => [...${lowercaseModel}Keys.lists(), params] as const,
  details: () => [...${lowercaseModel}Keys.all, 'detail'] as const,
  detail: (id: number) => [...${lowercaseModel}Keys.details(), id] as const,
}

// Query hooks
export const use${pluralName} = (params?: ${modelName}ListParams) => {
  return useQuery({
    queryKey: ${lowercaseModel}Keys.list(params),
    queryFn: () => ${lowercasePlural}Api.get${pluralName}(params),
    placeholderData: (previousData) => previousData,
  })
}

export const use${modelName} = (id: number) => {
  return useQuery({
    queryKey: ${lowercaseModel}Keys.detail(id),
    queryFn: () => ${lowercasePlural}Api.get${modelName}(id),
    enabled: !!id && id > 0,
  })
}

// Mutation hooks
export const useCreate${modelName} = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ${lowercasePlural}Api.create${modelName},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${lowercaseModel}Keys.lists() })
    },
  })
}

export const useUpdate${modelName} = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Update${modelName}Request }) =>
      ${lowercasePlural}Api.update${modelName}(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ${lowercaseModel}Keys.lists() })
      queryClient.invalidateQueries({ queryKey: ${lowercaseModel}Keys.detail(data.id) })
    },
  })
}

export const useDelete${modelName} = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ${lowercasePlural}Api.delete${modelName},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${lowercaseModel}Keys.lists() })
    },
  })
}${this.model.hasStatus ? `

export const useToggle${modelName}Status = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ${lowercasePlural}Api.toggle${modelName}Status,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ${lowercaseModel}Keys.lists() })
      queryClient.invalidateQueries({ queryKey: ${lowercaseModel}Keys.detail(data.id) })
    },
  })
}` : ''}
`

    const dir = join(this.basePath, `modules/${lowercaseModel}/hooks`)
    const filePath = join(dir, `use${pluralName}.ts`)
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(filePath, content)
  }

  private generateDataTableComponent(): void {
    const modelName = this.model.name
    const pluralName = this.model.pluralName!
    const lowercaseModel = modelName.toLowerCase()
    
    // Generate column definitions based on fields
    const visibleFields = this.model.fields.filter(f => f.displayInList !== false)
    const columns = visibleFields.map(field => this.generateColumnDefinition(field)).join(',\n    ')
    
    const content = `'use client'

import * as React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2, Eye, ${this.model.icon} } from 'lucide-react'
import { DataTable } from '../DataTable'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Badge } from '@/shared/components/ui/badge'
import { useDataTableExport } from '../hooks/useDataTableExport'
import { useConfirmationDialog } from '@/shared/components/feedback/ConfirmationDialog'
import type { ExportOptions } from '../types'

// Define the ${modelName} type for DataTable
export interface ${modelName} {
  id: number${this.model.fields.map(f => `\n  ${f.name}: ${this.getTypeScriptType(f)}`).join('')}${this.model.hasTimestamps ? '\n  created_at: string\n  updated_at?: string' : ''}${this.model.hasStatus ? '\n  is_active: boolean' : ''}
}

interface ${pluralName}DataTableProps {
  ${lowercaseModel}s?: ${modelName}[]
  onEdit${modelName}?: (${lowercaseModel}: ${modelName}) => void
  onDelete${modelName}?: (${lowercaseModel}: ${modelName}) => void
  onView${modelName}?: (${lowercaseModel}: ${modelName}) => void
  onAdd${modelName}?: () => void${this.model.hasStatus ? `\n  onToggleStatus?: (${lowercaseModel}: ${modelName}) => void` : ''}
  isLoading?: boolean
}

export function ${pluralName}DataTable({
  ${lowercaseModel}s = [],
  onEdit${modelName},
  onDelete${modelName},
  onView${modelName},
  onAdd${modelName},${this.model.hasStatus ? `\n  onToggleStatus,` : ''}
  isLoading = false,
}: ${pluralName}DataTableProps) {
  const [selected${pluralName}, setSelected${pluralName}] = React.useState<${modelName}[]>([])
  const { confirmBulkDelete, confirmBulkAction, ConfirmationDialog } = useConfirmationDialog()

  // Define columns
  const columns: ColumnDef<${modelName}>[] = [
    ${columns}${this.model.hasTimestamps ? ',\n    ' + this.generateTimestampColumns() : ''}${this.model.hasStatus ? ',\n    ' + this.generateStatusColumn() : ''},
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const ${lowercaseModel} = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(${lowercaseModel}.id.toString())}
              >
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onView${modelName} && (
                <DropdownMenuItem onClick={() => onView${modelName}(${lowercaseModel})}>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {onEdit${modelName} && (
                <DropdownMenuItem onClick={() => onEdit${modelName}(${lowercaseModel})}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit ${lowercaseModel}
                </DropdownMenuItem>
              )}${this.model.hasStatus ? `
              {onToggleStatus && (
                <DropdownMenuItem onClick={() => onToggleStatus(${lowercaseModel})}>
                  <${this.model.icon} className="mr-2 h-4 w-4" />
                  {${lowercaseModel}.is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
              )}` : ''}
              {onDelete${modelName} && (
                <DropdownMenuItem
                  onClick={() => onDelete${modelName}(${lowercaseModel})}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ${lowercaseModel}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Column definitions for column selector
  const columnDefinitions = [
    { id: 'id', label: 'ID' },${visibleFields.map(f => `\n    { id: '${f.name}', label: '${f.label || this.capitalize(f.name)}' },`).join('')}${this.model.hasTimestamps ? '\n    { id: \'created_at\', label: \'Created\' },\n    { id: \'updated_at\', label: \'Last Modified\' },' : ''}${this.model.hasStatus ? '\n    { id: \'is_active\', label: \'Status\' },' : ''}
    { id: 'actions', label: 'Actions', canHide: false },
  ]

  // Export functionality
  const exportColumns = [
    { id: 'id', label: 'ID', accessor: 'id' },${this.model.fields.map(f => `\n    { id: '${f.name}', label: '${f.label || this.capitalize(f.name)}', accessor: '${f.name}' },`).join('')}${this.model.hasTimestamps ? '\n    { id: \'created_at\', label: \'Created Date\', accessor: \'created_at\' },\n    { id: \'updated_at\', label: \'Last Modified\', accessor: \'updated_at\' },' : ''}${this.model.hasStatus ? '\n    { id: \'is_active\', label: \'Active\', accessor: \'is_active\' },' : ''}
  ]

  const { exportData } = useDataTableExport({
    data: ${lowercaseModel}s,
    columns: exportColumns,
    selectedRows: selected${pluralName},
  })

  const handleDeleteSelected = async (selected${pluralName}: ${modelName}[]) => {
    if (!onDelete${modelName}) return

    confirmBulkDelete('${lowercaseModel}', selected${pluralName}.length, async () => {
      for (const ${lowercaseModel} of selected${pluralName}) {
        await onDelete${modelName}(${lowercaseModel})
      }
    })
  }

  const handleExport = () => {
    const options: ExportOptions = {
      format: 'csv',
      filename: \`${lowercaseModel}s-\${new Date().toISOString().split('T')[0]}.csv\`,
      selectedOnly: selected${pluralName}.length > 0,
    }
    exportData(options)
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={${lowercaseModel}s}
        searchableColumns={[${this.model.fields.filter(f => f.searchable).map(f => `'${f.name}'`).join(', ')}]}
        enableRowSelection={true}
        enableSorting={true}
        enableFiltering={true}
        enableColumnVisibility={true}
        onRowSelectionChange={setSelected${pluralName}}
        onDeleteSelected={onDelete${modelName} ? handleDeleteSelected : undefined}
        onExport={handleExport}
        onAdd={onAdd${modelName}}
        pageSize={10}
        isLoading={isLoading}
        emptyMessage="No ${lowercaseModel}s found."
        columnDefinitions={columnDefinitions}
      />
      <ConfirmationDialog />
    </div>
  )
}

// Example usage component
export function ${pluralName}DataTableExample() {
  const handleEdit${modelName} = (${lowercaseModel}: ${modelName}) => {
    console.log('Edit ${lowercaseModel}:', ${lowercaseModel})
    // TODO: Implement edit functionality
  }

  const handleDelete${modelName} = (${lowercaseModel}: ${modelName}) => {
    console.log('Delete ${lowercaseModel}:', ${lowercaseModel})
    // TODO: Implement delete functionality
  }

  const handleView${modelName} = (${lowercaseModel}: ${modelName}) => {
    console.log('View ${lowercaseModel}:', ${lowercaseModel})
    // TODO: Implement view functionality
  }

  const handleAdd${modelName} = () => {
    console.log('Add new ${lowercaseModel}')
    // TODO: Implement add functionality
  }${this.model.hasStatus ? `

  const handleToggleStatus = (${lowercaseModel}: ${modelName}) => {
    console.log('Toggle ${lowercaseModel} status:', ${lowercaseModel})
    // TODO: Implement status toggle
  }` : ''}

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">${pluralName} Management</h2>
          <p className="text-muted-foreground">
            ${this.model.description || `Manage ${lowercaseModel}s with advanced table features.`}
          </p>
        </div>
      </div>
      
      <${pluralName}DataTable
        onEdit${modelName}={handleEdit${modelName}}
        onDelete${modelName}={handleDelete${modelName}}
        onView${modelName}={handleView${modelName}}
        onAdd${modelName}={handleAdd${modelName}}${this.model.hasStatus ? `\n        onToggleStatus={handleToggleStatus}` : ''}
      />
    </div>
  )
}
`

    const dir = join(this.basePath, 'shared/components/data-table')
    const filePath = join(dir, `${pluralName}DataTable.tsx`)
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(filePath, content)
  }

  private generateFormComponents(): void {
    const modelName = this.model.name
    const lowercaseModel = modelName.toLowerCase()
    // Generate form content based on model fields
    
    const content = `'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ${this.model.icon} } from 'lucide-react'
import { cn } from '@/shared/utils'

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
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components'

import { 
  useCreate${modelName}, 
  useUpdate${modelName}${this.model.hasStatus ? `, useToggle${modelName}Status` : ''} 
} from '@/modules/${lowercaseModel}/hooks/use${this.model.pluralName}'
import type { ${modelName} } from '@/shared/services/api/${lowercaseModel}'

// Zod schema for form validation
const ${lowercaseModel}Schema = z.object({${this.generateZodSchema()}
})

type ${modelName}FormData = z.infer<typeof ${lowercaseModel}Schema>

interface ${modelName}FormProps {
  ${lowercaseModel}?: ${modelName}
  onSuccess?: (${lowercaseModel}: ${modelName}) => void
  onCancel?: () => void
  className?: string
}

export function ${modelName}Form({ 
  ${lowercaseModel}, 
  onSuccess, 
  onCancel,
  className 
}: ${modelName}FormProps) {
  const isEditing = Boolean(${lowercaseModel})
  const createMutation = useCreate${modelName}()
  const updateMutation = useUpdate${modelName}()

  const form = useForm<${modelName}FormData>({
    resolver: zodResolver(${lowercaseModel}Schema),
    defaultValues: ${this.generateDefaultValues()},
  })

  React.useEffect(() => {
    if (${lowercaseModel}) {
      form.reset({${this.generateFormReset()}
      })
    }
  }, [${lowercaseModel}, form])

  const onSubmit = async (data: ${modelName}FormData) => {
    try {
      let result: ${modelName}
      
      if (isEditing && ${lowercaseModel}) {
        result = await updateMutation.mutateAsync({
          id: ${lowercaseModel}.id,
          data: data as any
        })
      } else {
        result = await createMutation.mutateAsync(data as any)
      }
      
      onSuccess?.(result)
      
      if (!isEditing) {
        form.reset()
      }
    } catch (error) {
      console.error(\`Failed to \${isEditing ? 'update' : 'create'} ${lowercaseModel}:\`, error)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <${this.model.icon} className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            {isEditing ? \`Edit \${${lowercaseModel}?.id ? \`${modelName} #\${${lowercaseModel}.id}\` : '${modelName}'}\` : 'Create New ${modelName}'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isEditing 
              ? 'Update the ${lowercaseModel} information below' 
              : '${this.model.description || `Fill in the information to create a new ${lowercaseModel}`}'
            }
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          ${this.generateFormFields()}

          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update ${modelName}' : 'Create ${modelName}')
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

interface ${modelName}CreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (${lowercaseModel}: ${modelName}) => void
}

export function ${modelName}CreateDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: ${modelName}CreateDialogProps) {
  const handleSuccess = (${lowercaseModel}: ${modelName}) => {
    onOpenChange(false)
    onSuccess?.(${lowercaseModel})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New ${modelName}</DialogTitle>
          <DialogDescription>
            ${this.model.description || `Add a new ${lowercaseModel} to the system.`}
          </DialogDescription>
        </DialogHeader>

        <${modelName}Form
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
          className="border-0"
        />
      </DialogContent>
    </Dialog>
  )
}

interface ${modelName}EditDialogProps {
  ${lowercaseModel}?: ${modelName}
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (${lowercaseModel}: ${modelName}) => void
}

export function ${modelName}EditDialog({ 
  ${lowercaseModel}, 
  open, 
  onOpenChange, 
  onSuccess 
}: ${modelName}EditDialogProps) {
  const handleSuccess = (updated${modelName}: ${modelName}) => {
    onOpenChange(false)
    onSuccess?.(updated${modelName})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit ${modelName}</DialogTitle>
          <DialogDescription>
            Update the ${lowercaseModel} information below.
          </DialogDescription>
        </DialogHeader>

        <${modelName}Form
          ${lowercaseModel}={${lowercaseModel}}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
          className="border-0"
        />
      </DialogContent>
    </Dialog>
  )
}
`

    const dir = join(this.basePath, `modules/${lowercaseModel}/components`)
    const filePath = join(dir, `${modelName}Form.tsx`)
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(filePath, content)
  }

  private generatePageComponents(): void {
    const modelName = this.model.name
    // Generate page components for the model
    
    // Generate list page
    this.generateListPage()
    
    // Generate create page
    this.generateCreatePage()
    
    // Generate edit page
    this.generateEditPage()
    
    // Generate view page (details)
    this.generateViewPage()
    
    console.log(`Generated page components for ${modelName}`)
  }

  private generateListPage(): void {
    const modelName = this.model.name
    const pluralName = this.model.pluralName!
    const lowercaseModel = modelName.toLowerCase()
    const lowercasePlural = pluralName.toLowerCase()
    
    const searchableFields = this.model.fields.filter(f => f.searchable)
    const filterableFields = this.model.fields.filter(f => f.filterType)
    
    const content = `'use client'

import * as React from 'react'
import { Plus, Loader2, ${this.model.icon} } from 'lucide-react'

import { 
  Button,
  Badge,
  AdvancedSearch,
  type SearchState,
  type SearchFilter
} from '@/shared/components'
import { useAdvancedSearch } from '@/shared/hooks/useAdvancedSearch'
// import { ${pluralName}DataTable } from '@/shared/components/data-table/${pluralName}DataTable'
// TODO: Update scaffold generator to use ViewManager instead of DataTable

import { 
  use${pluralName}, 
  useDelete${modelName}${this.model.hasStatus ? `, useToggle${modelName}Status` : ''} 
} from '@/modules/${lowercaseModel}/hooks/use${pluralName}'
import { apiUtils } from '@/shared/services/api/client'
import type { ${modelName} } from '@/shared/services/api/${lowercaseModel}'

import { ${modelName}CreateDialog } from '@/modules/${lowercaseModel}/components/${modelName}Form'
import { ${modelName}EditDialog } from '@/modules/${lowercaseModel}/components/${modelName}Form'

type ${pluralName}PageProps = Record<string, never>

const ${pluralName}Page: React.FC<${pluralName}PageProps> = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [editing${modelName}, setEditing${modelName}] = React.useState<${modelName} | null>(null)

  const { data: ${lowercasePlural}Data, isLoading: ${lowercasePlural}Loading, error: ${lowercasePlural}Error } = use${pluralName}()

  // Advanced search setup
  const availableFilters: Omit<SearchFilter, 'value'>[] = [${this.generateSearchFilters()}
  ]

  const availableSorts = [${this.generateSortOptions()}
  ]

  const {
    searchState,
    updateSearchState,
    hasActiveSearch
  } = useAdvancedSearch({
    initialPageSize: 20,
    onSearch: (state: SearchState) => {
      console.log('Search state changed:', state)
    }
  })

  const delete${modelName}Mutation = useDelete${modelName}()${this.model.hasStatus ? `\n  const toggleStatusMutation = useToggle${modelName}Status()` : ''}

  const handle${modelName}Edit = React.useCallback((${lowercaseModel}: ${modelName}) => {
    setEditing${modelName}(${lowercaseModel})
  }, [])

  const handle${modelName}Delete = React.useCallback(async (${lowercaseModel}: ${modelName}) => {
    try {
      await delete${modelName}Mutation.mutateAsync(${lowercaseModel}.id)
    } catch (error) {
      console.error('Failed to delete ${lowercaseModel}:', error)
    }
  }, [delete${modelName}Mutation])

  const handle${modelName}View = React.useCallback((${lowercaseModel}: ${modelName}) => {
    console.log('View ${lowercaseModel}:', ${lowercaseModel})
  }, [])

  const handleAdd${modelName} = React.useCallback(() => {
    setIsCreateDialogOpen(true)
  }, [])${this.model.hasStatus ? `

  const handleToggleStatus = React.useCallback(async (${lowercaseModel}: ${modelName}) => {
    try {
      await toggleStatusMutation.mutateAsync(${lowercaseModel}.id)
    } catch (error) {
      console.error('Failed to toggle ${lowercaseModel} status:', error)
    }
  }, [toggleStatusMutation])` : ''}

  const ${lowercasePlural} = React.useMemo(() => ${lowercasePlural}Data?.items || [], [${lowercasePlural}Data])
  
  const filtered${pluralName} = React.useMemo(() => {
    if (!hasActiveSearch()) return ${lowercasePlural}
    
    return ${lowercasePlural}.filter(${lowercaseModel} => {
      if (searchState.query) {
        const query = searchState.query.toLowerCase()
        const searchableFields = [${searchableFields.map(f => `${lowercaseModel}.${f.name}`).join(', ')}]
        if (!searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(query)
        )) {
          return false
        }
      }
      
      for (const filter of searchState.filters) {
        if (filter.value === undefined || filter.value === '') continue
        
        switch (filter.field) {${filterableFields.map(f => this.generateFilterCase(f)).join('')}${this.model.hasStatus ? `
          case 'is_active':
            if (${lowercaseModel}.is_active !== (filter.value === 'true')) return false
            break` : ''}
        }
      }
      
      return true
    })
  }, [${lowercasePlural}, searchState, hasActiveSearch])

  const sorted${pluralName} = React.useMemo(() => {
    if (!searchState.sort) return filtered${pluralName}
    
    return [...filtered${pluralName}].sort((a, b) => {
      const field = searchState.sort!.field
      const direction = searchState.sort!.direction
      
      let aValue: any = a[field as keyof ${modelName}]
      let bValue: any = b[field as keyof ${modelName}]
      
      if (field === 'created_at' || field === 'updated_at') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered${pluralName}, searchState.sort])

  if (${lowercasePlural}Error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Failed to load ${lowercasePlural}</h2>
          <p className="text-gray-600">{apiUtils.getErrorMessage(${lowercasePlural}Error)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <${this.model.icon} className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">${pluralName}</h1>
              <p className="text-sm text-muted-foreground">
                ${this.model.description || `Manage ${lowercasePlural} in your system`}. {${lowercasePlural}.length} total ${lowercasePlural}.
              </p>
            </div>
          </div>

          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={${lowercasePlural}Loading}>
            <Plus className="mr-2 h-4 w-4" />
            Add ${modelName}
          </Button>
        </div>

        <AdvancedSearch
          searchState={searchState}
          onSearchChange={updateSearchState}
          availableFilters={availableFilters}
          availableSorts={availableSorts}
          placeholder="Search ${lowercasePlural}..."
          resultCount={sorted${pluralName}.length}
          loading={${lowercasePlural}Loading}
        />

        {${lowercasePlural}Loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading ${lowercasePlural}...</span>
          </div>
        ) : (
          <${pluralName}DataTable
            ${lowercasePlural}={sorted${pluralName}}
            onEdit${modelName}={handle${modelName}Edit}
            onDelete${modelName}={handle${modelName}Delete}
            onView${modelName}={handle${modelName}View}
            onAdd${modelName}={handleAdd${modelName}}${this.model.hasStatus ? `\n            onToggleStatus={handleToggleStatus}` : ''}
            isLoading={${lowercasePlural}Loading}
          />
        )}
      </div>

      <${modelName}CreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      <${modelName}EditDialog
        ${lowercaseModel}={editing${modelName}}
        open={!!editing${modelName}}
        onOpenChange={(open) => !open && setEditing${modelName}(null)}
      />
    </div>
  )
}

export default ${pluralName}Page
`

    const dir = join(this.basePath, `app/${lowercasePlural}`)
    const filePath = join(dir, 'page.tsx')
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(filePath, content)
  }

  private generateCreatePage(): void {
    const modelName = this.model.name
    const lowercaseModel = modelName.toLowerCase()
    const lowercasePlural = this.model.pluralName!.toLowerCase()
    
    const content = `'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, ${this.model.icon} } from 'lucide-react'

import { Button } from '@/shared/components'
import { ${modelName}Form } from '@/modules/${lowercaseModel}/components/${modelName}Form'
import type { ${modelName} } from '@/shared/services/api/${lowercaseModel}'

export default function Create${modelName}Page() {
  const router = useRouter()

  const handleSuccess = (${lowercaseModel}: ${modelName}) => {
    router.push('/${lowercasePlural}')
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <${this.model.icon} className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create New ${modelName}</h1>
              <p className="text-sm text-muted-foreground">
                ${this.model.description || `Add a new ${lowercaseModel} to your system`}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <${modelName}Form
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  )
}
`

    const dir = join(this.basePath, `app/${lowercasePlural}/create`)
    const filePath = join(dir, 'page.tsx')
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(filePath, content)
  }

  private generateEditPage(): void {
    const modelName = this.model.name
    const lowercaseModel = modelName.toLowerCase()
    const lowercasePlural = this.model.pluralName!.toLowerCase()
    
    const content = `'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, ${this.model.icon}, Loader2 } from 'lucide-react'

import { Button } from '@/shared/components'
import { ${modelName}Form } from '@/modules/${lowercaseModel}/components/${modelName}Form'
import { use${modelName} } from '@/modules/${lowercaseModel}/hooks/use${this.model.pluralName}'
import type { ${modelName} } from '@/shared/services/api/${lowercaseModel}'

export default function Edit${modelName}Page() {
  const router = useRouter()
  const params = useParams()
  const ${lowercaseModel}Id = Number(params.id)

  const { data: ${lowercaseModel}, isLoading, error } = use${modelName}(${lowercaseModel}Id)

  const handleSuccess = (updated${modelName}: ${modelName}) => {
    router.push('/${lowercasePlural}')
  }

  const handleCancel = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading ${lowercaseModel}...</span>
        </div>
      </div>
    )
  }

  if (error || !${lowercaseModel}) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            {error ? 'Failed to load ${lowercaseModel}' : '${modelName} not found'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error ? 'Please try again later.' : 'The requested ${lowercaseModel} could not be found.'}
          </p>
          <Button onClick={() => router.push('/${lowercasePlural}')}>
            Back to ${this.model.pluralName}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <${this.model.icon} className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Edit ${modelName} #{${lowercaseModel}.id}
              </h1>
              <p className="text-sm text-muted-foreground">
                Update the ${lowercaseModel} information below
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <${modelName}Form
            ${lowercaseModel}={${lowercaseModel}}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  )
}
`

    const dir = join(this.basePath, `app/${lowercasePlural}/[id]/edit`)
    const filePath = join(dir, 'page.tsx')
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(filePath, content)
  }

  private generateViewPage(): void {
    const modelName = this.model.name
    const lowercaseModel = modelName.toLowerCase()
    const lowercasePlural = this.model.pluralName!.toLowerCase()
    
    const content = `'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, ${this.model.icon}, Pencil, Trash2, Loader2 } from 'lucide-react'

import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/components'
import { use${modelName}, useDelete${modelName} } from '@/modules/${lowercaseModel}/hooks/use${this.model.pluralName}'
import { useConfirmationDialog } from '@/shared/components/feedback/ConfirmationDialog'

export default function View${modelName}Page() {
  const router = useRouter()
  const params = useParams()
  const ${lowercaseModel}Id = Number(params.id)

  const { data: ${lowercaseModel}, isLoading, error } = use${modelName}(${lowercaseModel}Id)
  const delete${modelName}Mutation = useDelete${modelName}()
  const { confirmDelete, ConfirmationDialog } = useConfirmationDialog()

  const handleEdit = () => {
    router.push(\`/${lowercasePlural}/\${${lowercaseModel}Id}/edit\`)
  }

  const handleDelete = () => {
    if (!${lowercaseModel}) return
    
    confirmDelete('${lowercaseModel}', ${lowercaseModel}.id.toString(), async () => {
      try {
        await delete${modelName}Mutation.mutateAsync(${lowercaseModel}.id)
        router.push('/${lowercasePlural}')
      } catch (error) {
        console.error('Failed to delete ${lowercaseModel}:', error)
      }
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading ${lowercaseModel}...</span>
        </div>
      </div>
    )
  }

  if (error || !${lowercaseModel}) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            {error ? 'Failed to load ${lowercaseModel}' : '${modelName} not found'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error ? 'Please try again later.' : 'The requested ${lowercaseModel} could not be found.'}
          </p>
          <Button onClick={() => router.push('/${lowercasePlural}')}>
            Back to ${this.model.pluralName}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <${this.model.icon} className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  ${modelName} #{${lowercaseModel}.id}
                </h1>
                <p className="text-sm text-muted-foreground">
                  ${this.model.description || `View ${lowercaseModel} details and information`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={handleEdit} className="flex items-center space-x-2">
              <Pencil className="h-4 w-4" />
              <span>Edit</span>
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              ${this.generateViewFields()}${this.model.hasTimestamps ? `
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-sm">
                  {new Date(${lowercaseModel}.created_at).toLocaleString()}
                </p>
              </div>
              
              {${lowercaseModel}.updated_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">
                    {new Date(${lowercaseModel}.updated_at).toLocaleString()}
                  </p>
                </div>
              )}` : ''}${this.model.hasStatus ? `
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={${lowercaseModel}.is_active ? 'default' : 'secondary'}>
                    {${lowercaseModel}.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>` : ''}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <p className="text-sm font-mono">{${lowercaseModel}.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmationDialog />
    </div>
  )
}
`

    const dir = join(this.basePath, `app/${lowercasePlural}/[id]`)
    const filePath = join(dir, 'page.tsx')
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(filePath, content)
  }

  private generateSearchFilters(): string {
    let filters = this.model.fields
      .filter(f => f.filterType)
      .map(field => {
        let filterDef = `
    {
      id: '${field.name}',
      field: '${field.name}',
      label: '${field.label || this.capitalize(field.name)}',
      type: '${field.filterType}'`
        
        if (field.type === 'select' && field.options) {
          filterDef += `,
      options: [
        ${field.options.map(opt => `{ value: '${opt}', label: '${opt}' }`).join(',\n        ')}
      ]`
        }
        
        filterDef += '\n    },'
        return filterDef
      }).join('')
    
    if (this.model.hasStatus) {
      filters += `
    {
      id: 'status',
      field: 'is_active',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },`
    }
    
    if (this.model.hasTimestamps) {
      filters += `
    {
      id: 'created_date',
      field: 'created_at',
      label: 'Created Date',
      type: 'daterange'
    },`
    }
    
    return filters
  }

  private generateSortOptions(): string {
    const sortFields = this.model.fields
      .filter(f => f.sortable !== false)
      .map(field => `
    { field: '${field.name}', label: '${field.label || this.capitalize(field.name)}' },`)
      .join('')
    
    let additionalSorts = ''
    if (this.model.hasTimestamps) {
      additionalSorts += `
    { field: 'created_at', label: 'Created Date' },
    { field: 'updated_at', label: 'Last Modified' },`
    }
    
    return sortFields + additionalSorts
  }

  private generateFilterCase(field: FieldDefinition): string {
    switch (field.type) {
      case 'boolean':
        return `
          case '${field.name}':
            if (${this.lowercaseFirst(this.model.name)}.${field.name} !== filter.value) return false
            break`
      case 'select':
        return `
          case '${field.name}':
            if (${this.lowercaseFirst(this.model.name)}.${field.name} !== filter.value) return false
            break`
      case 'date':
        return `
          case '${field.name}':
            if (filter.value?.from) {
              const fieldDate = new Date(${this.lowercaseFirst(this.model.name)}.${field.name})
              const fromDate = new Date(filter.value.from)
              const toDate = filter.value.to ? new Date(filter.value.to) : new Date()
              if (fieldDate < fromDate || fieldDate > toDate) return false
            }
            break`
      default:
        return `
          case '${field.name}':
            if (!${this.lowercaseFirst(this.model.name)}.${field.name}.toString().toLowerCase().includes(filter.value.toLowerCase())) return false
            break`
    }
  }

  private generateViewFields(): string {
    return this.model.fields.map(field => {
      const label = field.label || this.capitalize(field.name)
      let valueDisplay = `{${this.lowercaseFirst(this.model.name)}.${field.name}}`
      
      switch (field.type) {
        case 'boolean':
          valueDisplay = `
                  <Badge variant={${this.lowercaseFirst(this.model.name)}.${field.name} ? 'default' : 'secondary'}>
                    {${this.lowercaseFirst(this.model.name)}.${field.name} ? 'Yes' : 'No'}
                  </Badge>`
          break
        case 'date':
          valueDisplay = `{new Date(${this.lowercaseFirst(this.model.name)}.${field.name}).toLocaleDateString()}`
          break
        case 'email':
          valueDisplay = `
                  <a 
                    href={\`mailto:\${${this.lowercaseFirst(this.model.name)}.${field.name}}\`}
                    className="text-blue-600 hover:underline"
                  >
                    {${this.lowercaseFirst(this.model.name)}.${field.name}}
                  </a>`
          break
        case 'url':
          valueDisplay = `
                  <a 
                    href={${this.lowercaseFirst(this.model.name)}.${field.name}}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {${this.lowercaseFirst(this.model.name)}.${field.name}}
                  </a>`
          break
        case 'multiselect':
          valueDisplay = `
                  <div className="flex flex-wrap gap-1">
                    {${this.lowercaseFirst(this.model.name)}.${field.name}.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>`
          break
        case 'select':
          valueDisplay = `
                  <Badge variant="outline">
                    {${this.lowercaseFirst(this.model.name)}.${field.name}}
                  </Badge>`
          break
      }
      
      return `
              <div>
                <label className="text-sm font-medium text-muted-foreground">${label}</label>
                <div className="mt-1">
                  ${valueDisplay}
                </div>
              </div>`
    }).join('')
  }

  private updateNavigationMenu(): void {
    const pluralName = this.model.pluralName!
    const lowercasePlural = pluralName.toLowerCase()
    
    // Read the current menu config
    const menuConfigPath = join(this.basePath, 'shared/components/navigation/menuConfig.ts')
    
    if (!existsSync(menuConfigPath)) {
      console.warn('menuConfig.ts not found, skipping navigation menu update')
      return
    }
    
    let content = readFileSync(menuConfigPath, 'utf-8')
    
    // Check if the icon is already imported
    const iconName = this.model.icon!
    const iconImportPattern = new RegExp(`\\b${iconName}\\b`)
    
    if (!iconImportPattern.test(content)) {
      // Add the icon import
      const importMatch = content.match(/(import\s*\{[^}]+\}\s*from\s*['"]lucide-react['"];?)/)
      if (importMatch) {
        const existingImports = importMatch[1]
        const updatedImports = existingImports.replace(
          /(\{[^}]+)(}\s*from\s*['"]lucide-react['"];?)/,
          `$1,\n  ${iconName}$2`
        )
        content = content.replace(importMatch[1], updatedImports)
      }
    }
    
    // Check if the menu item already exists
    const menuItemPattern = new RegExp(`title:\\s*['"]${pluralName}['"]`)
    if (menuItemPattern.test(content)) {
      console.log(`Menu item for ${pluralName} already exists, skipping navigation update`)
      return
    }
    
    // Find where to insert the new menu item
    // Look for the Administration section or add before Settings
    
    // Try to find Administration section first
    const adminSectionMatch = content.match(/(\s*){\s*title:\s*['"]Administration['"][\s\S]*?children:\s*\[[\s\S]*?\],?\s*},/)
    
    if (adminSectionMatch && this.model.module === 'administration') {
      // Add to Administration section
      const adminSection = adminSectionMatch[0]
      const childrenMatch = adminSection.match(/(children:\s*\[[\s\S]*?)(],?\s*})/)
      
      if (childrenMatch) {
        const newChild = `      {
        title: '${pluralName}',
        href: '/${this.model.module || 'admin'}/${lowercasePlural}',
        icon: ${iconName},
        requiredPermission: '${this.model.module || 'admin'}.${lowercasePlural}',
      },`
        
        const updatedChildren = childrenMatch[1] + '\n' + newChild + '\n    ' + childrenMatch[2]
        const updatedAdminSection = adminSection.replace(
          /children:\s*\[[\s\S]*?\],?\s*}/,
          updatedChildren
        )
        
        content = content.replace(adminSection, updatedAdminSection)
        writeFileSync(menuConfigPath, content)
        console.log(`Added ${pluralName} to Administration section in navigation menu`)
        return
      }
    }
    
    // If not adding to admin section, add as a top-level item
    const settingsItemMatch = content.match(/(\s*{\s*title:\s*['"]Settings['"][\s\S]*?},)/)
    if (settingsItemMatch) {
      const newMenuItem = `  {
    title: '${pluralName}',
    href: '/${lowercasePlural}',
    icon: ${iconName},${this.model.module ? `\n    module: '${this.model.module}',` : ''}
  },`
      
      content = content.replace(settingsItemMatch[1], newMenuItem + '\n' + settingsItemMatch[1])
      writeFileSync(menuConfigPath, content)
      console.log(`Added ${pluralName} as top-level menu item`)
      return
    }
    
    // Fallback: add before the last item
    const lastItemMatch = content.match(/(\s*},\s*];?\s*)$/)
    if (lastItemMatch) {
      const newMenuItem = `  {
    title: '${pluralName}',
    href: '/${lowercasePlural}',
    icon: ${iconName},${this.model.module ? `\n    module: '${this.model.module}',` : ''}
  },`
      
      content = content.replace(lastItemMatch[1], ',\n' + newMenuItem + '\n];')
      writeFileSync(menuConfigPath, content)
      console.log(`Added ${pluralName} to navigation menu`)
    } else {
      console.warn('Could not find insertion point in menuConfig.ts')
    }
  }

  // Helper methods for DataTable generation
  private getTypeScriptType(field: FieldDefinition): string {
    switch (field.type) {
      case 'number':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'date':
        return 'string'
      case 'select':
        return field.options ? `'${field.options.join("' | '")}'` : 'string'
      case 'multiselect':
        return 'string[]'
      default:
        return 'string'
    }
  }

  private generateColumnDefinition(field: FieldDefinition): string {
    const sortable = field.sortable !== false
    let cellRenderer = 'row.getValue(\'{{name}}\')'
    
    // Customize cell rendering based on field type
    switch (field.type) {
      case 'boolean':
        cellRenderer = `(
        <Badge variant={row.getValue('{{name}}') ? 'default' : 'secondary'}>
          {row.getValue('{{name}}') ? 'Yes' : 'No'}
        </Badge>
      )`
        break
      case 'date':
        cellRenderer = `(
        <div className="text-sm">
          {new Date(row.getValue('{{name}}')).toLocaleDateString()}
        </div>
      )`
        break
      case 'select':
        cellRenderer = `(
        <Badge variant="outline">
          {row.getValue('{{name}}')}
        </Badge>
      )`
        break
      case 'multiselect':
        cellRenderer = `(
        <div className="flex flex-wrap gap-1">
          {(row.getValue('{{name}}') as string[]).map((item, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {item}
            </Badge>
          ))}
        </div>
      )`
        break
      case 'email':
        cellRenderer = `(
        <a href={\`mailto:\${row.getValue('{{name}}')}\`} className="text-blue-600 hover:underline">
          {row.getValue('{{name}}')}
        </a>
      )`
        break
      case 'url':
        cellRenderer = `(
        <a href={row.getValue('{{name}}')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {row.getValue('{{name}}')}
        </a>
      )`
        break
      default:
        cellRenderer = `(
        <div className="font-medium">
          {row.getValue('{{name}}')}
        </div>
      )`
    }

    return `{
      accessorKey: '${field.name}',
      header: ${sortable ? `({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          ${field.label || this.capitalize(field.name)}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )` : `'${field.label || this.capitalize(field.name)}'`},
      cell: ({ row }) => ${cellRenderer.replace(/{{name}}/g, field.name)},
    }`
  }

  private generateTimestampColumns(): string {
    return `{
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'))
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Last Modified',
      cell: ({ row }) => {
        const date = row.original.updated_at ? new Date(row.original.updated_at) : null
        return (
          <div className="text-sm">
            {date ? (
              <>
                <div>{date.toLocaleDateString()}</div>
                <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
              </>
            ) : (
              <span className="text-muted-foreground">Never</span>
            )}
          </div>
        )
      },
    }`
  }

  private generateStatusColumn(): string {
    return `{
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active')
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    }`
  }

  private generateZodSchema(): string {
    let schemaFields = this.model.fields.map(field => {
      let zodType: string
      
      switch (field.type) {
        case 'number':
          zodType = `z.number()`
          if (field.validation?.min !== undefined) {
            zodType += `.min(${field.validation.min})`
          }
          if (field.validation?.max !== undefined) {
            zodType += `.max(${field.validation.max})`
          }
          break
        case 'boolean':
          zodType = `z.boolean()`
          break
        case 'date':
          zodType = `z.string()`
          break
        case 'email':
          zodType = `z.string().email('Invalid email address')`
          break
        case 'url':
          zodType = `z.string().url('Invalid URL')`
          break
        case 'select':
          zodType = field.options 
            ? `z.enum(['${field.options.join("', '")}'])` 
            : `z.string()`
          break
        case 'multiselect':
          zodType = `z.array(z.string())`
          break
        case 'text':
          zodType = `z.string()`
          if (field.validation?.min !== undefined) {
            zodType += `.min(${field.validation.min})`
          }
          if (field.validation?.max !== undefined) {
            zodType += `.max(${field.validation.max})`
          }
          break
        default:
          zodType = `z.string()`
          if (field.validation?.min !== undefined) {
            zodType += `.min(${field.validation.min}, '${field.validation.message || `${field.label || field.name} must be at least ${field.validation.min} characters`}')`
          }
          if (field.validation?.pattern) {
            zodType += `.regex(/${field.validation.pattern}/, '${field.validation.message || 'Invalid format'}')`
          }
      }
      
      if (!field.required) {
        zodType += `.optional()`
      }
      
      return `\n  ${field.name}: ${zodType},`
    }).join('')
    
    // Add status field if enabled
    if (this.model.hasStatus) {
      schemaFields += `\n  is_active: z.boolean().optional(),`
    }
    
    return schemaFields
  }

  private generateDefaultValues(): string {
    let defaults = this.model.fields.map(field => {
      let defaultValue: string
      
      switch (field.type) {
        case 'number':
          defaultValue = '0'
          break
        case 'boolean':
          defaultValue = 'false'
          break
        case 'multiselect':
          defaultValue = '[]'
          break
        default:
          defaultValue = "''"
      }
      
      return `\n      ${field.name}: ${defaultValue},`
    }).join('')
    
    if (this.model.hasStatus) {
      defaults += `\n      is_active: true,`
    }
    
    return `{${defaults}\n    }`
  }

  private generateFormReset(): string {
    let resetFields = this.model.fields.map(field => {
      return `\n        ${field.name}: ${field.name}?.${field.name} || ${this.getDefaultValueForField(field)},`
    }).join('')
    
    if (this.model.hasStatus) {
      resetFields += `\n        is_active: ${this.lowercaseFirst(this.model.name)}?.is_active ?? true,`
    }
    
    return resetFields
  }

  private getDefaultValueForField(field: FieldDefinition): string {
    switch (field.type) {
      case 'number':
        return '0'
      case 'boolean':
        return 'false'
      case 'multiselect':
        return '[]'
      default:
        return "''"
    }
  }

  private generateFormFields(): string {
    return this.model.fields.map(field => this.generateFormField(field)).join('\n\n          ')
  }

  private generateFormField(field: FieldDefinition): string {
    const label = field.label || this.capitalize(field.name)
    const placeholder = field.placeholder || `Enter ${label.toLowerCase()}...`
    const required = field.required ? ' *' : ''
    
    let fieldComponent: string
    
    switch (field.type) {
      case 'text':
        fieldComponent = `<FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="${placeholder}"
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </FormControl>`
        break
      case 'number':
        fieldComponent = `<FormControl>
                    <Input 
                      {...field} 
                      type="number"
                      placeholder="${placeholder}"
                      disabled={isSubmitting}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                    />
                  </FormControl>`
        break
      case 'boolean':
        fieldComponent = `<FormControl>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                      <span className="text-sm">{field.value ? 'Yes' : 'No'}</span>
                    </div>
                  </FormControl>`
        break
      case 'date':
        fieldComponent = `<FormControl>
                    <Input 
                      {...field} 
                      type="date"
                      disabled={isSubmitting}
                    />
                  </FormControl>`
        break
      case 'email':
        fieldComponent = `<FormControl>
                    <Input 
                      {...field} 
                      type="email"
                      placeholder="${placeholder}"
                      disabled={isSubmitting}
                    />
                  </FormControl>`
        break
      case 'url':
        fieldComponent = `<FormControl>
                    <Input 
                      {...field} 
                      type="url"
                      placeholder="${placeholder}"
                      disabled={isSubmitting}
                    />
                  </FormControl>`
        break
      case 'select':
        const options = field.options || ['Option 1', 'Option 2', 'Option 3']
        fieldComponent = `<Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ${label.toLowerCase()}..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      ${options.map(option => `<SelectItem value="${option}">${option}</SelectItem>`).join('\n                      ')}
                    </SelectContent>
                  </Select>`
        break
      case 'multiselect':
        const multiselectOptions = field.options || ['Option 1', 'Option 2', 'Option 3']
        fieldComponent = `<div className="space-y-2">
                    {[${multiselectOptions.map(option => `'${option}'`).join(', ')}].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={\`\${field.name}-\${option}\`}
                          checked={field.value?.includes(option) || false}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || []
                            if (checked) {
                              field.onChange([...currentValues, option])
                            } else {
                              field.onChange(currentValues.filter(v => v !== option))
                            }
                          }}
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor={\`\${field.name}-\${option}\`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {option}
                        </label>
                      </div>
                    ))}</div>`
        break
      default:
        fieldComponent = `<FormControl>
                    <Input 
                      {...field} 
                      placeholder="${placeholder}"
                      disabled={isSubmitting}
                    />
                  </FormControl>`
    }
    
    return `<FormField
            control={form.control}
            name="${field.name}"
            render={({ field }) => (
              <FormItem>
                <FormLabel>${label}${required}</FormLabel>
                ${fieldComponent}
                ${field.validation?.message ? `<FormDescription>
                  ${field.validation.message}
                </FormDescription>` : ''}
                <FormMessage />
              </FormItem>
            )}
          />`
  }
}

// Export for CLI usage
export function generateModel(model: ModelDefinition): void {
  const generator = new ScaffoldGenerator(model)
  generator.generateAll()
}