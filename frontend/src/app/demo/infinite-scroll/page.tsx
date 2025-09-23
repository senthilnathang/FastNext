"use client"

import * as React from "react"
import { User, Mail, Calendar, MapPin } from "lucide-react"

import { InfiniteScrollList } from "@/shared/components/InfiniteScrollList"
import { Card, CardContent } from "@/shared/components/card"
import { Badge } from "@/shared/components/badge"

interface UserItem {
  id: number
  name: string
  email: string
  avatar: string
  role: string
  location: string
  joinDate: string
  isOnline: boolean
}

// Mock API function to simulate fetching data
async function fetchUsers(page: number, pageSize: number): Promise<{ data: UserItem[]; hasMore: boolean; total: number }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const startId = (page - 1) * pageSize + 1
  const users: UserItem[] = []
  
  const roles = ['Admin', 'Editor', 'Viewer', 'Moderator', 'Contributor']
  const locations = ['New York', 'London', 'Tokyo', 'Sydney', 'Berlin', 'Paris', 'Toronto', 'São Paulo']
  
  for (let i = 0; i < pageSize; i++) {
    const id = startId + i
    if (id > 500) break // Limit total to 500 users
    
    users.push({
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      role: roles[Math.floor(Math.random() * roles.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      isOnline: Math.random() > 0.3
    })
  }
  
  return {
    data: users,
    hasMore: startId + pageSize <= 500,
    total: 500
  }
}

function UserCard({ user }: { user: UserItem }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-12 h-12 rounded-full bg-gray-200"
            />
            {user.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          
          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {user.name}
              </h3>
              <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'} className="text-xs">
                {user.role}
              </Badge>
              {user.isOnline && (
                <Badge variant="outline" className="text-xs text-green-600">
                  Online
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Mail className="w-3 h-3" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{user.location}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>Joined {new Date(user.joinDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No users found
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        Start by adding some users to see them here.
      </p>
    </div>
  )
}

function ErrorState(error: string, retry: () => void) {
  return (
    <div className="text-center py-12">
      <div className="text-red-600 dark:text-red-400 mb-4">
        <svg className="mx-auto h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Failed to load users
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        {error}
      </p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}

export default function InfiniteScrollDemo() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Infinite Scroll Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Demonstrating infinite scroll with 500 users. New users load automatically as you scroll.
          </p>
        </div>

        {/* Performance Info */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 3l3.293 3.293-7 7-3.293-3.293z"/>
                  <path d="M12 2l1.4 1.4L11.8 5 12 2z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Performance Optimized
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Infinite scroll with automatic loading, error handling, and retry logic
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Infinite Scroll List */}
        <InfiniteScrollList<UserItem>
          fetchFn={fetchUsers}
          renderItem={(user, index) => <UserCard key={user.id} user={user} />}
          renderEmpty={EmptyState}
          renderError={ErrorState}
          pageSize={20}
          showStats={true}
          itemClassName="mb-4"
        />
      </div>
    </div>
  )
}