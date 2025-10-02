'use client'

import React, { useState } from 'react'
import { ViewManager, KanbanColumn } from '@/shared/components/views'
import type { ViewConfig, Column } from '@/shared/components/views'

// Sample data for demo
interface Task {
  id: number
  title: string
  description: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee: string
  dueDate: string
  tags: string[]
  createdAt: string
}

const sampleTasks: Task[] = [
  {
    id: 1,
    title: 'Design user interface mockups',
    description: 'Create wireframes and mockups for the new dashboard',
    status: 'todo',
    priority: 'high',
    assignee: 'John Doe',
    dueDate: '2024-12-15',
    tags: ['design', 'ui'],
    createdAt: '2024-12-01'
  },
  {
    id: 2,
    title: 'Implement user authentication',
    description: 'Set up JWT-based authentication system',
    status: 'in_progress',
    priority: 'urgent',
    assignee: 'Jane Smith',
    dueDate: '2024-12-10',
    tags: ['backend', 'security'],
    createdAt: '2024-11-28'
  },
  {
    id: 3,
    title: 'Write API documentation',
    description: 'Document all REST endpoints with examples',
    status: 'todo',
    priority: 'medium',
    assignee: 'Bob Johnson',
    dueDate: '2024-12-20',
    tags: ['documentation', 'api'],
    createdAt: '2024-12-02'
  },
  {
    id: 4,
    title: 'Setup CI/CD pipeline',
    description: 'Configure automated testing and deployment',
    status: 'done',
    priority: 'high',
    assignee: 'Alice Brown',
    dueDate: '2024-12-05',
    tags: ['devops', 'automation'],
    createdAt: '2024-11-25'
  },
  {
    id: 5,
    title: 'Database optimization',
    description: 'Optimize slow queries and add indexes',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'Charlie Wilson',
    dueDate: '2024-12-18',
    tags: ['database', 'performance'],
    createdAt: '2024-12-03'
  },
  {
    id: 6,
    title: 'Mobile responsive design',
    description: 'Ensure all pages work well on mobile devices',
    status: 'review',
    priority: 'high',
    assignee: 'Diana Davis',
    dueDate: '2024-12-12',
    tags: ['frontend', 'mobile'],
    createdAt: '2024-11-30'
  }
]

const kanbanColumns: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: '#94a3b8', limit: 5 },
  { id: 'in_progress', title: 'In Progress', color: '#3b82f6', limit: 3 },
  { id: 'review', title: 'Review', color: '#f59e0b', limit: 2 },
  { id: 'done', title: 'Done', color: '#10b981' }
]

const tableColumns: Column<Task>[] = [
  { id: 'title', key: 'title', label: 'Title', sortable: true },
  { id: 'status', key: 'status', label: 'Status', sortable: true, filterable: true },
  { id: 'priority', key: 'priority', label: 'Priority', sortable: true, filterable: true },
  { id: 'assignee', key: 'assignee', label: 'Assignee', sortable: true },
  { id: 'dueDate', key: 'dueDate', label: 'Due Date', sortable: true },
]

const views: ViewConfig[] = [
  {
    id: 'list',
    name: 'List View',
    type: 'list',
    columns: tableColumns,
    filters: {},
    sortBy: 'createdAt',
    sortOrder: 'desc'
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
  }
]

export default function KanbanDemoPage() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks)
  const [activeView, setActiveView] = useState('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})

  const handleCreateTask = (columnId?: string) => {
    const newTask: Task = {
      id: Date.now(),
      title: `New Task ${tasks.length + 1}`,
      description: 'Task description',
      status: columnId || 'todo',
      priority: 'medium',
      assignee: 'Unassigned',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tags: [],
      createdAt: new Date().toISOString()
    }
    setTasks(prev => [...prev, newTask])
  }

  const handleEditTask = (task: Task) => {
    console.log('Edit task:', task)
    // Implement edit logic here
  }

  const handleDeleteTask = (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const handleViewTask = (task: Task) => {
    console.log('View task:', task)
    // Implement view logic here
  }

  const handleMoveCard = (cardId: string | number, sourceColumnId: string, targetColumnId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === Number(cardId) 
        ? { ...task, status: targetColumnId }
        : task
    ))
  }

  const handleQuickAdd = (columnId: string, title: string) => {
    const newTask: Task = {
      id: Date.now(),
      title,
      description: '',
      status: columnId,
      priority: 'medium',
      assignee: 'Unassigned',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tags: [],
      createdAt: new Date().toISOString()
    }
    setTasks(prev => [...prev, newTask])
  }

  const kanbanCardFields = [
    {
      key: 'priority',
      label: 'Priority',
      type: 'priority' as const
    },
    {
      key: 'assignee',
      label: 'Assignee',
      type: 'text' as const
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      type: 'date' as const
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'badge' as const,
      render: (value: unknown) => {
        const tags = value as string[]
        return tags?.join(', ') || 'No tags'
      }
    }
  ]

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Kanban Demo</h1>
          <p className="text-muted-foreground mt-2">
            Demonstration of the integrated kanban view in ViewManager
          </p>
        </div>

        <ViewManager
          data={tasks}
          columns={tableColumns}
          views={views}
          activeView={activeView}
          onViewChange={setActiveView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          onCreateClick={handleCreateTask}
          onEditClick={handleEditTask}
          onDeleteClick={handleDeleteTask}
          onViewClick={handleViewTask}
          title="Project Tasks"
          subtitle="Manage your project tasks with different views"
          
          // Kanban-specific props
          kanbanColumns={kanbanColumns}
          onMoveCard={handleMoveCard}
          enableQuickAdd={true}
          onQuickAdd={handleQuickAdd}
          kanbanGroupByField="status"
          kanbanCardTitleField="title"
          kanbanCardDescriptionField="description"
          kanbanCardFields={kanbanCardFields}
        />
      </div>
    </div>
  )
}