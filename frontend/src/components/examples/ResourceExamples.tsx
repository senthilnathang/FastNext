'use client'

import React, { useState, useEffect } from 'react'
import { UserFactory, ProjectFactory, TaskFactory } from '@/lib/resource-factory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Example 1: Users Management
export function UsersExample() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const userApi = UserFactory.getApi()

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await userApi.getList()
      setUsers(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreateUser = async (userData: any) => {
    try {
      await userApi.create(userData)
      setShowForm(false)
      loadUsers()
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to create user')
    }
  }

  const handleEditUser = async (userData: any) => {
    try {
      await userApi.update(editingUser.id, userData)
      setEditingUser(null)
      loadUsers()
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to update user')
    }
  }

  const handleDeleteUser = async (user: any) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await userApi.delete(user.id)
        loadUsers()
      } catch (err: any) {
        alert('Failed to delete user: ' + err.message)
      }
    }
  }

  if (showForm) {
    return UserFactory.createFormView({
      mode: 'create',
      onSubmit: handleCreateUser,
      onCancel: () => setShowForm(false)
    })
  }

  if (editingUser) {
    return UserFactory.createFormView({
      mode: 'edit',
      initialData: editingUser,
      resourceId: editingUser.id,
      onSubmit: handleEditUser,
      onCancel: () => setEditingUser(null)
    })
  }

  return UserFactory.createListView({
    data: users,
    loading,
    error,
    onCreateClick: () => setShowForm(true),
    onEditClick: (user) => setEditingUser(user),
    onDeleteClick: handleDeleteUser,
    onRefresh: loadUsers
  })
}

// Example 2: Projects Management
export function ProjectsExample() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  const projectApi = ProjectFactory.getApi()

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await projectApi.getList()
      setProjects(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleCreateProject = async (projectData: any) => {
    try {
      await projectApi.create(projectData)
      setShowForm(false)
      loadProjects()
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to create project')
    }
  }

  const handleEditProject = async (projectData: any) => {
    try {
      await projectApi.update(editingProject.id, projectData)
      setEditingProject(null)
      loadProjects()
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to update project')
    }
  }

  const handleDeleteProject = async (project: any) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await projectApi.delete(project.id)
        loadProjects()
      } catch (err: any) {
        alert('Failed to delete project: ' + err.message)
      }
    }
  }

  if (showForm) {
    return ProjectFactory.createFormView({
      mode: 'create',
      onSubmit: handleCreateProject,
      onCancel: () => setShowForm(false)
    })
  }

  if (editingProject) {
    return ProjectFactory.createFormView({
      mode: 'edit',
      initialData: editingProject,
      resourceId: editingProject.id,
      onSubmit: handleEditProject,
      onCancel: () => setEditingProject(null)
    })
  }

  return ProjectFactory.createListView({
    data: projects,
    loading,
    error,
    onCreateClick: () => setShowForm(true),
    onEditClick: (project) => setEditingProject(project),
    onDeleteClick: handleDeleteProject,
    onRefresh: loadProjects
  })
}

// Example 3: Tasks with Kanban View
export function TasksExample({ projectId = 1 }: { projectId?: number }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [createForColumn, setCreateForColumn] = useState<string | null>(null)

  const taskApi = TaskFactory.getApi()

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await taskApi.getList({ project_id: projectId })
      setTasks(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [projectId])

  const handleCreateTask = async (taskData: any) => {
    try {
      const data = {
        ...taskData,
        project_id: projectId,
        status: createForColumn || taskData.status || 'todo'
      }
      await taskApi.create(data)
      setShowForm(false)
      setCreateForColumn(null)
      loadTasks()
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to create task')
    }
  }

  const handleEditTask = async (taskData: any) => {
    try {
      await taskApi.update(editingTask.id, taskData)
      setEditingTask(null)
      loadTasks()
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to update task')
    }
  }

  const handleDeleteTask = async (task: any) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await taskApi.delete(task.id)
        loadTasks()
      } catch (err: any) {
        alert('Failed to delete task: ' + err.message)
      }
    }
  }

  const handleMoveTask = async (taskId: number, newStatus: string) => {
    try {
      await taskApi.update(taskId, { status: newStatus })
      loadTasks()
    } catch (err: any) {
      alert('Failed to move task: ' + err.message)
    }
  }

  // Convert tasks to kanban items
  const kanbanItems = tasks.map(task => ({
    id: task.id,
    status: task.status,
    title: task.title,
    description: task.description,
    data: task
  }))

  if (showForm) {
    return TaskFactory.createFormView({
      mode: 'create',
      initialData: createForColumn ? { status: createForColumn } : {},
      projectId,
      onSubmit: handleCreateTask,
      onCancel: () => {
        setShowForm(false)
        setCreateForColumn(null)
      }
    })
  }

  if (editingTask) {
    return TaskFactory.createFormView({
      mode: 'edit',
      initialData: editingTask,
      resourceId: editingTask.id,
      projectId,
      onSubmit: handleEditTask,
      onCancel: () => setEditingTask(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'kanban')}>
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="kanban">Kanban View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {viewMode === 'list' ? (
        TaskFactory.createListView({
          data: tasks,
          loading,
          error,
          projectId,
          onCreateClick: () => setShowForm(true),
          onEditClick: (task) => setEditingTask(task),
          onDeleteClick: handleDeleteTask,
          onRefresh: loadTasks
        })
      ) : (
        TaskFactory.createKanbanView({
          items: kanbanItems,
          loading,
          error,
          projectId,
          onCreateClick: (columnId) => {
            setCreateForColumn(columnId)
            setShowForm(true)
          },
          onEditClick: (item) => setEditingTask(item.data),
          onDeleteClick: (item) => handleDeleteTask(item.data),
          onRefresh: loadTasks,
          onMoveItem: handleMoveTask
        })
      )}
    </div>
  )
}

// Main example component showing all three
export function ResourceManagementExamples() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Resource Management Examples</h1>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersExample />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Management</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectsExample />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Management</CardTitle>
            </CardHeader>
            <CardContent>
              <TasksExample />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}