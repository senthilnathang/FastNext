'use client'

import { api } from '@/lib/trpc/provider'
import { useState } from 'react'

export function TRPCUsageExample() {
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  })

  // Query examples
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = api.users.getAll.useQuery({
    page: 1,
    limit: 10,
  })

  const { data: projects, isLoading: projectsLoading } = api.projects.getAll.useQuery({
    page: 1,
    limit: 10,
  })

  const { data: roles, isLoading: rolesLoading } = api.roles.getAll.useQuery({
    page: 1,
    limit: 10,
  })

  // Mutation examples
  const createUserMutation = api.users.create.useMutation({
    onSuccess: () => {
      refetchUsers()
      setNewUserData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
      })
    },
  })

  const deleteUserMutation = api.users.delete.useMutation({
    onSuccess: () => {
      refetchUsers()
    },
  })

  const handleCreateUser = () => {
    createUserMutation.mutate(newUserData)
  }

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId)
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">tRPC Usage Examples</h1>
      
      {/* Create User Form */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Create New User</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Username"
            value={newUserData.username}
            onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
            className="border p-2 rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUserData.email}
            onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
            className="border p-2 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={newUserData.password}
            onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="First Name"
            value={newUserData.first_name}
            onChange={(e) => setNewUserData(prev => ({ ...prev, first_name: e.target.value }))}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={newUserData.last_name}
            onChange={(e) => setNewUserData(prev => ({ ...prev, last_name: e.target.value }))}
            className="border p-2 rounded"
          />
        </div>
        <button
          onClick={handleCreateUser}
          disabled={createUserMutation.isPending}
          className="mt-3 bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {createUserMutation.isPending ? 'Creating...' : 'Create User'}
        </button>
      </div>

      {/* Users List */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Users</h2>
        {usersLoading ? (
          <p>Loading users...</p>
        ) : (
          <div className="space-y-2">
            {users?.items?.map((user: any) => (
              <div key={user.id} className="flex justify-between items-center bg-white p-2 rounded">
                <div>
                  <span className="font-medium">{user.username}</span>
                  <span className="text-gray-500 ml-2">({user.email})</span>
                </div>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  disabled={deleteUserMutation.isPending}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects List */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Projects</h2>
        {projectsLoading ? (
          <p>Loading projects...</p>
        ) : (
          <div className="space-y-2">
            {projects?.items?.map((project: any) => (
              <div key={project.id} className="bg-white p-2 rounded">
                <span className="font-medium">{project.name}</span>
                {project.description && (
                  <p className="text-gray-600 text-sm">{project.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roles List */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Roles</h2>
        {rolesLoading ? (
          <p>Loading roles...</p>
        ) : (
          <div className="space-y-2">
            {roles?.items?.map((role: any) => (
              <div key={role.id} className="bg-white p-2 rounded">
                <span className="font-medium">{role.name}</span>
                {role.description && (
                  <p className="text-gray-600 text-sm">{role.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}