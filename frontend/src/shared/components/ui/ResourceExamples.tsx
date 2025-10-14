"use client";

// Temporarily commented out until resource factory components are implemented
// import { UserFactory, ProjectFactory, TaskFactory } from '@/shared/utils/resource-factory'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../";

// Example 1: Users Management
export function UsersExample() {
  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Users Example</h3>
      <p className="text-gray-600">
        Resource factory components are not yet implemented.
      </p>
    </div>
  );
}

// Commented out until resource factory is implemented
/*
export function UsersExampleOld() {
  const [users, setUsers] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<unknown>(null)

  const userApi = UserFactory.getApi()

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await userApi.getList()
      setUsers(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [userApi])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleCreateUser = async (userData: unknown) => {
    try {
      await userApi.create(userData as any)
      setShowForm(false)
      loadUsers()
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'detail' in err.response.data ? String(err.response.data.detail) : 'Failed to create user'
      throw new Error(errorMessage)
    }
  }

  const handleEditUser = async (userData: unknown) => {
    try {
      await userApi.update((editingUser as { id: number }).id, userData as any)
      setEditingUser(null)
      loadUsers()
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'detail' in err.response.data ? String(err.response.data.detail) : 'Failed to update user'
      throw new Error(errorMessage)
    }
  }

  const handleDeleteUser = async (user: { id: number }) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await userApi.delete(user.id)
        loadUsers()
      } catch (err: unknown) {
        alert('Failed to delete user: ' + (err instanceof Error ? err.message : 'Unknown error'))
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
      resourceId: (editingUser as { id: number }).id,
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
  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Projects Example</h3>
      <p className="text-gray-600">Resource factory components are not yet implemented.</p>
    </div>
  )
}

/*
export function ProjectsExampleOld() {
  const [projects, setProjects] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<unknown>(null)

  const projectApi = ProjectFactory.getApi()

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const data = await projectApi.getList()
      setProjects(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [projectApi])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreateProject = async (projectData: unknown) => {
    try {
      await projectApi.create(projectData as any)
      setShowForm(false)
      loadProjects()
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'detail' in err.response.data ? String(err.response.data.detail) : 'Failed to create project'
      throw new Error(errorMessage)
    }
  }

  const handleEditProject = async (projectData: unknown) => {
    try {
      await projectApi.update((editingProject as { id: number }).id, projectData as any)
      setEditingProject(null)
      loadProjects()
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'detail' in err.response.data ? String(err.response.data.detail) : 'Failed to update project'
      throw new Error(errorMessage)
    }
  }

  const handleDeleteProject = async (project: { id: number }) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await projectApi.delete(project.id)
        loadProjects()
      } catch (err: unknown) {
        alert('Failed to delete project: ' + (err instanceof Error ? err.message : 'Unknown error'))
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
      resourceId: (editingProject as { id: number }).id,
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
  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Tasks Example</h3>
      <p className="text-gray-600">Resource factory components are not yet implemented.</p>
      <p className="text-sm text-gray-500">Project ID: {projectId}</p>
    </div>
  )
}

/*
export function TasksExampleOld({ projectId = 1 }: { projectId?: number }) {
  const [tasks, setTasks] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<unknown>(null)
  const [createForColumn, setCreateForColumn] = useState<string | null>(null)

  const taskApi = TaskFactory.getApi()

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await taskApi.getList({ project_id: projectId })
      setTasks(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [taskApi, projectId])

  useEffect(() => {
    loadTasks()
  }, [projectId, loadTasks])

  const handleCreateTask = async (taskData: { status?: string }) => {
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
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'detail' in err.response.data ? String(err.response.data.detail) : 'Failed to create task'
      throw new Error(errorMessage)
    }
  }

  const handleEditTask = async (taskData: unknown) => {
    try {
      await taskApi.update((editingTask as { id: number }).id, taskData as any)
      setEditingTask(null)
      loadTasks()
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'detail' in err.response.data ? String(err.response.data.detail) : 'Failed to update task'
      throw new Error(errorMessage)
    }
  }

  const handleDeleteTask = async (task: { id: number }) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await taskApi.delete(task.id)
        loadTasks()
      } catch (err: unknown) {
        alert('Failed to delete task: ' + (err instanceof Error ? err.message : 'Unknown error'))
      }
    }
  }

  const handleMoveTask = async (taskId: number, newStatus: string) => {
    try {
      await taskApi.update(taskId, { status: newStatus })
      loadTasks()
    } catch (err: unknown) {
      alert('Failed to move task: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Convert tasks to kanban items
  const kanbanItems = (tasks as any[]).map((task: { id: number; status: string; title: string; description?: string }) => ({
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
      resourceId: (editingTask as { id: number }).id,
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

*/

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
              <div className="p-4 border rounded">
                <h3 className="text-lg font-semibold mb-2">Projects Example</h3>
                <p className="text-gray-600">
                  Resource factory components are not yet implemented.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded">
                <h3 className="text-lg font-semibold mb-2">Tasks Example</h3>
                <p className="text-gray-600">
                  Resource factory components are not yet implemented.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
