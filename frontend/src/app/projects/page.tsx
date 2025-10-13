'use client'

import React, { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CommonFormViewManager, createFormViewConfig } from '@/shared/components/views/CommonFormViewManager'
import { FormField } from '@/shared/components/views/GenericFormView'
import { Column, KanbanColumn } from '@/shared/components/views/ViewManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Building2, Globe, Lock, Calendar, User, Clock, Trash2, FolderOpen, GitBranch, Target } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { z } from 'zod'

import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/modules/projects/hooks/useProjects'
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@/shared/types'
import type { SortOption, GroupOption } from '@/shared/components/ui'

// Project validation schema
const projectSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().optional(),
  user_id: z.number().optional(),
  is_public: z.boolean().default(false),
  start_date: z.union([z.string(), z.date()]).optional().transform((val) => {
    if (!val) return undefined
    if (val instanceof Date) return val.toISOString().split('T')[0]
    return val
  }),
  end_date: z.union([z.string(), z.date()]).optional().transform((val) => {
    if (!val) return undefined
    if (val instanceof Date) return val.toISOString().split('T')[0]
    return val
  }),
  settings: z.record(z.string(), z.any()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Form fields configuration
const formFields: FormField<Project>[] = [
  {
    name: 'name',
    label: 'Project Name',
    type: 'text',
    required: true,
    placeholder: 'Enter project name',
    description: 'A unique name for your project'
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Describe your project purpose and goals',
    description: 'Optional description of the project'
  },
  {
    name: 'start_date',
    label: 'Start Date',
    type: 'date',
    description: 'When the project should begin'
  },
  {
    name: 'end_date',
    label: 'End Date',
    type: 'date',
    description: 'Expected project completion date'
  },
  {
    name: 'is_public',
    label: 'Public Project',
    type: 'checkbox',
    defaultValue: false,
    description: 'Allow public access to this project'
  }
]

// Helper function to convert date values to API format
const convertDateForApi = (date: any): string | undefined => {
  if (!date) return undefined
  if (date instanceof Date) {
    return date.toISOString().split('T')[0]
  }
  if (typeof date === 'string') {
    // Handle case where date is already a string
    if (date.includes('T')) {
      return date.split('T')[0]
    }
    return date
  }
  return undefined
}

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedItems, setSelectedItems] = useState<Project[]>([])

  const { data: projectsData, isLoading, error } = useProjects()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  // Determine current mode from URL
  const mode = searchParams.get('mode') || 'list'
  const itemId = searchParams.get('id') || undefined

  const handleModeChange = (newMode: string, newItemId?: string | number) => {
    const params = new URLSearchParams()
    if (newMode !== 'list') {
      params.set('mode', newMode)
      if (newItemId) {
        params.set('id', String(newItemId))
      }
    }
    router.push(`/projects?${params.toString()}`)
  }

  // Define columns for the ViewManager
  const columns: Column<Project>[] = useMemo(() => [
    {
      id: 'name',
      key: 'name',
      label: 'Project Name',
      sortable: true,
      searchable: true,
      render: (value, project) => (
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-sm text-muted-foreground">
              {project.description || 'No description'}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'visibility',
      key: 'is_public',
      label: 'Visibility',
      sortable: true,
      filterable: true,
      type: 'select',
      filterOptions: [
        { label: 'Public', value: true },
        { label: 'Private', value: false }
      ],
      render: (value) => (
        <div className="flex items-center space-x-2">
          {value ? (
            <>
              <Globe className="h-4 w-4 text-blue-500" />
              <Badge variant="secondary">Public</Badge>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-gray-500" />
              <Badge variant="outline">Private</Badge>
            </>
          )}
        </div>
      )
    },
    {
      id: 'start_date',
      key: 'start_date',
      label: 'Start Date',
      sortable: true,
      filterable: true,
      type: 'date',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-green-500" />
          <span className="text-sm">
            {value ? new Date(value as string).toLocaleDateString() : 'Not set'}
          </span>
        </div>
      )
    },
    {
      id: 'end_date',
      key: 'end_date',
      label: 'End Date',
      sortable: true,
      filterable: true,
      type: 'date',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-red-500" />
          <span className="text-sm">
            {value ? new Date(value as string).toLocaleDateString() : 'Not set'}
          </span>
        </div>
      )
    },
    {
      id: 'user_id',
      key: 'user_id',
      label: 'Owner',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">User {value ? String(value) : 'Unknown'}</span>
        </div>
      )
    },
    {
      id: 'created_at',
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
          </span>
        </div>
      )
    },
    {
      id: 'status',
      key: 'id',
      label: 'Status',
      sortable: false,
      render: (value, project) => {
        const now = new Date()
        const startDate = project.start_date ? new Date(project.start_date) : null
        const endDate = project.end_date ? new Date(project.end_date) : null
        
        let status = 'Active'
        let variant: 'default' | 'secondary' | 'destructive' = 'default'
        
        if (startDate && startDate > now) {
          status = 'Planned'
          variant = 'secondary'
        } else if (endDate && endDate < now) {
          status = 'Completed'
          variant = 'destructive'
        }
        
        return (
          <Badge variant={variant} className={variant === 'default' ? 'bg-green-100 text-green-800' : ''}>
            {status}
          </Badge>
        )
      }
    }
  ], [])

  // Calculate statistics
  const stats = useMemo(() => {
    const projects = projectsData?.items || []
    const totalProjects = projects.length
    const publicProjects = projects.filter(project => project.is_public).length
    const privateProjects = totalProjects - publicProjects
    const recentProjects = projects.filter(project => {
      if (!project.created_at) return false
      const created = new Date(project.created_at)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return created > thirtyDaysAgo
    }).length

    const now = new Date()
    const activeProjects = projects.filter(project => {
      const startDate = project.start_date ? new Date(project.start_date) : null
      const endDate = project.end_date ? new Date(project.end_date) : null
      
      return (!startDate || startDate <= now) && (!endDate || endDate >= now)
    }).length

    return {
      totalProjects,
      publicProjects,
      privateProjects,
      recentProjects,
      activeProjects
    }
  }, [projectsData?.items])

  // Define kanban columns for project status
  const kanbanColumns: KanbanColumn[] = useMemo(() => {
    const projects = projectsData?.items || []
    const now = new Date()
    const planned = projects.filter(p => p.start_date && new Date(p.start_date) > now).length
    const active = projects.filter(p => {
      const startDate = p.start_date ? new Date(p.start_date) : null
      const endDate = p.end_date ? new Date(p.end_date) : null
      return (!startDate || startDate <= now) && (!endDate || endDate >= now)
    }).length
    const completed = projects.filter(p => p.end_date && new Date(p.end_date) < now).length

    return [
      { id: 'planned', title: 'Planned', color: '#f59e0b', count: planned },
      { id: 'active', title: 'Active', color: '#10b981', count: active },
      { id: 'completed', title: 'Completed', color: '#6b7280', count: completed }
    ]
  }, [projectsData?.items])

  // Define kanban card fields
  const kanbanCardFields = useMemo(() => [
    {
      key: 'description',
      label: 'Description',
      type: 'text' as const
    },
    {
      key: 'is_public',
      label: 'Visibility',
      type: 'badge' as const,
      render: (value: unknown) => value ? 'Public' : 'Private'
    },
    {
      key: 'start_date',
      label: 'Start Date',
      type: 'date' as const,
      render: (value: unknown) => value ? new Date(String(value)).toLocaleDateString() : 'Not set'
    },
    {
      key: 'end_date',
      label: 'End Date',
      type: 'date' as const,
      render: (value: unknown) => value ? new Date(String(value)).toLocaleDateString() : 'Not set'
    }
  ], [])

  // Define sort options
  const sortOptions: SortOption[] = useMemo(() => [
    {
      key: 'name',
      label: 'Project Name',
      defaultOrder: 'asc'
    },
    {
      key: 'start_date',
      label: 'Start Date',
      defaultOrder: 'asc'
    },
    {
      key: 'end_date',
      label: 'End Date',
      defaultOrder: 'asc'
    },
    {
      key: 'created_at',
      label: 'Created Date',
      defaultOrder: 'desc'
    },
    {
      key: 'updated_at',
      label: 'Last Modified',
      defaultOrder: 'desc'
    },
    {
      key: 'is_public',
      label: 'Visibility',
      defaultOrder: 'desc'
    }
  ], [])

  // Define group options
  const groupOptions: GroupOption[] = useMemo(() => [
    {
      key: 'is_public',
      label: 'Visibility',
      icon: <Globe className="h-4 w-4" />
    },
    {
      key: 'user_id',
      label: 'Owner',
      icon: <User className="h-4 w-4" />
    },
    {
      key: 'status',
      label: 'Status',
      icon: <Clock className="h-4 w-4" />
    }
  ], [])

  // API functions
  const fetchProjects = async (): Promise<Project[]> => {
    return projects
  }

  const createProjectApi = async (data: Project): Promise<Project> => {
    // Clean up data for API
    const cleanedData: CreateProjectRequest = {
      name: data.name,
      description: data.description || undefined,
      is_public: data.is_public,
      start_date: convertDateForApi(data.start_date),
      end_date: convertDateForApi(data.end_date),
      settings: data.settings || {}
    }

    // Use mutateAsync to preserve built-in cache invalidation
    const result = await createProject.mutateAsync(cleanedData)
    return result as Project
  }

  const updateProjectApi = async (id: string | number, data: Project): Promise<Project> => {
    // Clean up data for API
    const updateData: UpdateProjectRequest = {
      name: data.name,
      description: data.description || undefined,
      is_public: data.is_public,
      start_date: convertDateForApi(data.start_date),
      end_date: convertDateForApi(data.end_date),
      settings: data.settings || {}
    }

    // Use mutateAsync to preserve built-in cache invalidation
    const result = await updateProject.mutateAsync({ id: Number(id), data: updateData })
    return result as Project
  }

  const deleteProjectApi = async (id: string | number): Promise<void> => {
    const project = projects.find(p => p.id === Number(id))
    if (project && confirm(`Are you sure you want to delete "${project.name}"?`)) {
      // Use mutateAsync to preserve built-in cache invalidation
      await deleteProject.mutateAsync(Number(id))
    } else {
      throw new Error('Deletion cancelled')
    }
  }

  const handleExport = (format: 'csv' | 'json' | 'excel') => {
    console.log('Export projects as:', format)
    // TODO: Implement export functionality
  }

  const handleImport = (file: File) => {
    console.log('Import projects from file:', file.name)
    // TODO: Implement import functionality
  }

  const handleMoveCard = (cardId: string | number, sourceColumnId: string, targetColumnId: string) => {
    // For projects, we could update dates based on status
    console.log('Move project card:', cardId, 'from', sourceColumnId, 'to', targetColumnId)
    // TODO: Implement project status updates
  }

  const handleQuickAdd = (columnId: string, title: string) => {
    const now = new Date()
    const newProject: CreateProjectRequest = {
      name: title,
      description: `Project created on ${now.toLocaleDateString()}`,
      is_public: false,
      settings: {}
    }
    
    // Set dates based on column
    if (columnId === 'planned') {
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      newProject.start_date = futureDate.toISOString().split('T')[0]
    } else if (columnId === 'active') {
      newProject.start_date = now.toISOString().split('T')[0]
    }
    
    createProject.mutate(newProject)
  }

  const bulkActions = [
    {
      label: 'Delete Selected',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      action: (items: Project[]) => {
        if (confirm(`Delete ${items.length} selected projects?`)) {
          items.forEach(project => {
            if (project.id) {
              deleteProject.mutate(project.id)
            }
          })
          setSelectedItems([])
        }
      },
      variant: 'destructive' as const
    },
    {
      label: 'Make Public',
      action: (items: Project[]) => {
        items.forEach(project => {
          if (!project.is_public && project.id) {
            updateProject.mutate({
              id: project.id,
              data: { ...project, is_public: true }
            })
          }
        })
      }
    },
    {
      label: 'Make Private',
      action: (items: Project[]) => {
        items.forEach(project => {
          if (project.is_public && project.id) {
            updateProject.mutate({
              id: project.id,
              data: { ...project, is_public: false }
            })
          }
        })
      }
    }
  ]

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load projects
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || 'An error occurred while loading projects'}
          </p>
        </div>
      </div>
    )
  }

  // Create form view configuration
  const config = createFormViewConfig<Project>({
    resourceName: 'project',
    baseUrl: '/projects',
    apiEndpoint: '/api/v1/projects',
    title: 'Projects',
    subtitle: 'Manage your projects and applications',
    formFields,
    columns,
    validationSchema: projectSchema,
    onFetch: fetchProjects,
    onCreate: createProjectApi,
    onUpdate: updateProjectApi,
    onDelete: deleteProjectApi,
    views: [
      {
        id: 'projects-card',
        name: 'Card View',
        type: 'card',
        columns,
        filters: {},
        sortBy: 'created_at',
        sortOrder: 'desc'
      },
      {
        id: 'projects-list',
        name: 'List View',
        type: 'list',
        columns,
        filters: {},
        sortBy: 'created_at',
        sortOrder: 'desc'
      },
      {
        id: 'projects-kanban',
        name: 'Kanban Board',
        type: 'kanban',
        columns,
        filters: {},
        groupBy: 'status'
      },
      {
        id: 'projects-gantt',
        name: 'Timeline View',
        type: 'gantt',
        columns,
        filters: {},
        sortBy: 'start_date',
        sortOrder: 'asc'
      },
      {
        id: 'projects-calendar',
        name: 'Calendar View',
        type: 'calendar',
        columns,
        filters: {},
        sortBy: 'created_at',
        sortOrder: 'asc'
      }
    ],
    defaultView: 'projects-list'
  })

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Statistics Cards - Only show in list mode */}
      {mode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.publicProjects} public, {stats.privateProjects} private
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Public Projects</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.publicProjects}</div>
              <p className="text-xs text-muted-foreground">
                Publicly accessible
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Projects</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentProjects}</div>
              <p className="text-xs text-muted-foreground">
                Created last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Development</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                Total projects built
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <CommonFormViewManager
        config={config}
        mode={mode as any}
        itemId={itemId}
        onModeChange={handleModeChange}
        data={projects}
        loading={isLoading}
        error={error ? (error as any)?.message || String(error) : null}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={bulkActions}
        onExport={handleExport}
        onImport={handleImport}
        sortOptions={sortOptions}
        groupOptions={groupOptions}
        
        // Kanban-specific props
        kanbanColumns={kanbanColumns}
        onMoveCard={handleMoveCard}
        enableQuickAdd={true}
        onQuickAdd={handleQuickAdd}
        kanbanGroupByField="status"
        kanbanCardTitleField="name"
        kanbanCardDescriptionField="description"
        kanbanCardFields={kanbanCardFields}
        
        // Calendar-specific props
        calendarIdField="id"
        calendarTitleField="name"
        calendarDateField="created_at"
        calendarDescriptionField="description"
        calendarEnableQuickAdd={true}
        onCalendarQuickAdd={(date: Date, title: string) => {
          const newProject: CreateProjectRequest = {
            name: title,
            description: `Project created on ${date.toLocaleDateString()}`,
            is_public: false,
            settings: {}
          }
          createProject.mutate(newProject)
        }}
        calendarView="month"
        calendarShowToday={true}
        
        // Gantt-specific props
        ganttIdField="id"
        ganttTitleField="name"
        ganttStartDateField="start_date"
        ganttEndDateField="end_date"
        ganttStatusField="status"
        ganttProgressField="progress"
      />
    </div>
  )
}