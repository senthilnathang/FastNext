'use client'

import React, { useState } from 'react'
import { ViewManager } from '@/shared/components/views'
import type { ViewConfig, Column } from '@/shared/components/views'

// Sample data for demo
interface Project {
  id: number
  title: string
  description: string
  startDate: string
  endDate: string
  progress: number
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee: string
  estimatedHours: number
  actualHours: number
  createdAt: string
}

const sampleProjects: Project[] = [
  {
    id: 1,
    title: 'Website Redesign',
    description: 'Complete redesign of company website with modern UI/UX',
    startDate: '2024-12-01',
    endDate: '2024-12-20',
    progress: 75,
    status: 'in_progress',
    priority: 'high',
    assignee: 'John Doe',
    estimatedHours: 120,
    actualHours: 90,
    createdAt: '2024-11-15'
  },
  {
    id: 2,
    title: 'Mobile App Development',
    description: 'Develop iOS and Android mobile application',
    startDate: '2024-11-25',
    endDate: '2025-01-15',
    progress: 30,
    status: 'in_progress',
    priority: 'urgent',
    assignee: 'Jane Smith',
    estimatedHours: 200,
    actualHours: 60,
    createdAt: '2024-11-20'
  },
  {
    id: 3,
    title: 'Database Migration',
    description: 'Migrate from old database system to new cloud infrastructure',
    startDate: '2024-12-10',
    endDate: '2024-12-30',
    progress: 10,
    status: 'todo',
    priority: 'medium',
    assignee: 'Bob Johnson',
    estimatedHours: 80,
    actualHours: 8,
    createdAt: '2024-12-01'
  },
  {
    id: 4,
    title: 'Security Audit',
    description: 'Comprehensive security audit and penetration testing',
    startDate: '2024-12-05',
    endDate: '2024-12-15',
    progress: 100,
    status: 'done',
    priority: 'high',
    assignee: 'Alice Brown',
    estimatedHours: 40,
    actualHours: 42,
    createdAt: '2024-11-28'
  },
  {
    id: 5,
    title: 'API Documentation',
    description: 'Create comprehensive API documentation and developer guides',
    startDate: '2024-12-15',
    endDate: '2025-01-05',
    progress: 0,
    status: 'todo',
    priority: 'low',
    assignee: 'Charlie Wilson',
    estimatedHours: 30,
    actualHours: 0,
    createdAt: '2024-12-05'
  },
  {
    id: 6,
    title: 'Performance Optimization',
    description: 'Optimize application performance and reduce load times',
    startDate: '2024-12-20',
    endDate: '2025-01-10',
    progress: 0,
    status: 'todo',
    priority: 'medium',
    assignee: 'Diana Davis',
    estimatedHours: 60,
    actualHours: 0,
    createdAt: '2024-12-08'
  }
]

const tableColumns: Column<Project>[] = [
  { id: 'title', key: 'title', label: 'Project Title', sortable: true },
  { id: 'status', key: 'status', label: 'Status', sortable: true, filterable: true },
  { id: 'priority', key: 'priority', label: 'Priority', sortable: true, filterable: true },
  { id: 'assignee', key: 'assignee', label: 'Assignee', sortable: true },
  { id: 'progress', key: 'progress', label: 'Progress (%)', sortable: true },
  { id: 'startDate', key: 'startDate', label: 'Start Date', sortable: true },
  { id: 'endDate', key: 'endDate', label: 'End Date', sortable: true },
]

const views: ViewConfig[] = [
  {
    id: 'list',
    name: 'List View',
    type: 'list',
    columns: tableColumns,
    filters: {},
    sortBy: 'startDate',
    sortOrder: 'asc'
  },
  {
    id: 'card',
    name: 'Card View',
    type: 'card',
    columns: tableColumns,
    filters: {}
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    type: 'kanban',
    columns: tableColumns,
    filters: {},
    groupBy: 'status'
  },
  {
    id: 'gantt',
    name: 'Gantt Chart',
    type: 'gantt',
    columns: tableColumns,
    filters: {},
    sortBy: 'startDate',
    sortOrder: 'asc'
  }
]

export default function GanttDemoPage() {
  const [projects, setProjects] = useState<Project[]>(sampleProjects)
  const [activeView, setActiveView] = useState('gantt')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [ganttViewMode, setGanttViewMode] = useState<'days' | 'weeks' | 'months'>('weeks')

  const handleCreateProject = () => {
    const newProject: Project = {
      id: Date.now(),
      title: `New Project ${projects.length + 1}`,
      description: 'New project description',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      status: 'todo',
      priority: 'medium',
      assignee: 'Unassigned',
      estimatedHours: 40,
      actualHours: 0,
      createdAt: new Date().toISOString()
    }
    setProjects(prev => [...prev, newProject])
  }

  const handleEditProject = (project: Project) => {
    console.log('Edit project:', project)
    // Implement edit logic here
  }

  const handleDeleteProject = (project: Project) => {
    setProjects(prev => prev.filter(p => p.id !== project.id))
  }

  const handleViewProject = (project: Project) => {
    console.log('View project:', project)
    // Implement view logic here
  }

  const handleUpdateDates = (itemId: string | number, startDate: Date, endDate: Date) => {
    setProjects(prev => prev.map(project => 
      project.id === Number(itemId) 
        ? { 
            ...project, 
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          }
        : project
    ))
  }

  const handleUpdateProgress = (itemId: string | number, progress: number) => {
    setProjects(prev => prev.map(project => 
      project.id === Number(itemId) 
        ? { ...project, progress }
        : project
    ))
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gantt Chart Demo</h1>
          <p className="text-muted-foreground mt-2">
            Demonstration of the integrated Gantt chart view in ViewManager
          </p>
        </div>

        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Gantt View Mode:</span>
            <div className="flex items-center gap-1 border rounded-md">
              {(['days', 'weeks', 'months'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setGanttViewMode(mode)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    ganttViewMode === mode 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Switch between different time scales to see how the Gantt chart adapts
          </div>
        </div>

        <ViewManager
          data={projects}
          columns={tableColumns}
          views={views}
          activeView={activeView}
          onViewChange={setActiveView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          onCreateClick={handleCreateProject}
          onEditClick={handleEditProject}
          onDeleteClick={handleDeleteProject}
          onViewClick={handleViewProject}
          title="Project Timeline"
          subtitle="Manage your projects with different views including Gantt chart"
          
          // Gantt-specific props
          ganttIdField="id"
          ganttTitleField="title"
          ganttStartDateField="startDate"
          ganttEndDateField="endDate"
          ganttProgressField="progress"
          ganttStatusField="status"
          ganttPriorityField="priority"
          onUpdateDates={handleUpdateDates}
          onUpdateProgress={handleUpdateProgress}
          ganttViewMode={ganttViewMode}
          showWeekends={false}
          showProgress={true}
          showDependencies={false}
          allowResize={true}
          allowMove={true}
        />

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Gantt Chart Features</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Drag and drop to reschedule projects</li>
            <li>• Visual progress indicators</li>
            <li>• Multiple time scales (days, weeks, months)</li>
            <li>• Project details in sidebar</li>
            <li>• Status and priority color coding</li>
            <li>• Interactive timeline navigation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}