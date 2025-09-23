"use client"

import React, { useState } from 'react'
import { SwaggerUI } from '@/modules/api-docs'
import { 
  Card,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge
} from '@/shared/components'
import { 
  Book, 
  Code, 
  Database, 
  Shield, 
  Server, 
  TestTube, 
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '@/modules/auth'
import { cn } from '@/shared/utils'

export default function APIDocumentationPage() {
  const { user } = useAuth()
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)
  
  // Get API base URL from environment
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const apiEndpoints = [
    {
      category: 'Authentication',
      icon: Shield,
      endpoints: [
        { method: 'POST', path: '/auth/login/access-token', description: 'User login and get access token' },
        { method: 'POST', path: '/auth/test-token', description: 'Test and validate JWT token' },
        { method: 'POST', path: '/auth/refresh-token', description: 'Refresh access token' },
        { method: 'POST', path: '/auth/logout', description: 'User logout' },
      ]
    },
    {
      category: 'Users & Profile',
      icon: Database,
      endpoints: [
        { method: 'GET', path: '/users/', description: 'List all users (admin only)' },
        { method: 'POST', path: '/users/', description: 'Create new user' },
        { method: 'GET', path: '/users/me', description: 'Get current user info' },
        { method: 'PUT', path: '/users/me', description: 'Update current user' },
        { method: 'GET', path: '/profile/me', description: 'Get user profile' },
        { method: 'PUT', path: '/profile/me', description: 'Update user profile' },
        { method: 'PUT', path: '/profile/me/password', description: 'Change password' },
      ]
    },
    {
      category: 'Projects',
      icon: Server,
      endpoints: [
        { method: 'GET', path: '/projects/', description: 'List user projects' },
        { method: 'POST', path: '/projects/', description: 'Create new project' },
        { method: 'GET', path: '/projects/{id}', description: 'Get project details' },
        { method: 'PUT', path: '/projects/{id}', description: 'Update project' },
        { method: 'DELETE', path: '/projects/{id}', description: 'Delete project' },
      ]
    },
    {
      category: 'Security & Activity',
      icon: Shield,
      endpoints: [
        { method: 'GET', path: '/security/settings', description: 'Get security settings' },
        { method: 'PUT', path: '/security/settings', description: 'Update security settings' },
        { method: 'GET', path: '/activity-logs/', description: 'Get activity logs' },
        { method: 'GET', path: '/activity-logs/me', description: 'Get user activity logs' },
        { method: 'GET', path: '/audit-trails/', description: 'Get audit trails (admin only)' },
      ]
    },
    {
      category: 'Workflows',
      icon: Code,
      endpoints: [
        { method: 'GET', path: '/workflow-types/', description: 'List workflow types' },
        { method: 'POST', path: '/workflow-types/', description: 'Create workflow type' },
        { method: 'GET', path: '/workflow-templates/', description: 'List workflow templates' },
        { method: 'POST', path: '/workflow-templates/', description: 'Create workflow template' },
        { method: 'GET', path: '/workflow-instances/', description: 'List workflow instances' },
        { method: 'POST', path: '/workflow-instances/', description: 'Create workflow instance' },
      ]
    }
  ]

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedEndpoint(text)
      setTimeout(() => setCopiedEndpoint(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-500'
      case 'POST': return 'bg-green-500'
      case 'PUT': return 'bg-yellow-500'
      case 'DELETE': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">FastNext API Documentation</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Interactive API documentation for the FastNext Framework. Test endpoints, 
          view schemas, and explore all available operations.
        </p>
        {user && (
          <Badge variant="secondary" className="text-sm">
            <Shield className="w-3 h-3 mr-1" />
            Authenticated as {user.username}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="interactive" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="interactive" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Interactive API
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="flex items-center gap-2">
            <Book className="w-4 h-4" />
            Endpoints Overview
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Testing Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interactive" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Interactive API Explorer</h2>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`${apiBaseUrl}/docs`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open FastAPI Docs
                  </a>
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground mb-6">
              Use the interactive interface below to test API endpoints directly. 
              Authentication is automatically handled when logged in.
            </p>
          </Card>
          
          <SwaggerUI />
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Available Endpoints</h2>
            <p className="text-muted-foreground mb-6">
              Overview of all available API endpoints organized by category. 
              Click any endpoint to copy the full URL.
            </p>
            
            <div className="grid gap-6">
              {apiEndpoints.map((category) => {
                const IconComponent = category.icon
                return (
                  <Card key={category.category} className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <IconComponent className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">{category.category}</h3>
                      <Badge variant="outline">{category.endpoints.length} endpoints</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {category.endpoints.map((endpoint, index) => {
                        const fullPath = `${apiBaseUrl}/api/v1${endpoint.path}`
                        const isCopied = copiedEndpoint === fullPath
                        
                        return (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => copyToClipboard(fullPath)}
                          >
                            <div className="flex items-center gap-3">
                              <Badge 
                                className={cn(
                                  'text-white font-mono text-xs w-16 justify-center',
                                  getMethodColor(endpoint.method)
                                )}
                              >
                                {endpoint.method}
                              </Badge>
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {endpoint.path}
                              </code>
                              <span className="text-sm text-muted-foreground">
                                {endpoint.description}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isCopied ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Testing Guide</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Authentication</h3>
                <p className="text-muted-foreground mb-4">
                  Most endpoints require authentication. You can test in two ways:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">1</Badge>
                    <p>
                      <strong>Automatic:</strong> Log in through the frontend application. 
                      Your token will be automatically included in API requests.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">2</Badge>
                    <p>
                      <strong>Manual:</strong> Use the &ldquo;Authorize&rdquo; button in Swagger UI 
                      and enter your bearer token manually.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">CRUD Operations Testing</h3>
                <p className="text-muted-foreground mb-4">
                  Test the complete CRUD (Create, Read, Update, Delete) lifecycle:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2 text-green-600">Create (POST)</h4>
                    <p className="text-sm text-muted-foreground">
                      Use POST endpoints to create new resources. 
                      Provide required fields in the request body.
                    </p>
                  </Card>
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2 text-blue-600">Read (GET)</h4>
                    <p className="text-sm text-muted-foreground">
                      Use GET endpoints to retrieve resources. 
                      Test both list and individual resource endpoints.
                    </p>
                  </Card>
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2 text-yellow-600">Update (PUT)</h4>
                    <p className="text-sm text-muted-foreground">
                      Use PUT endpoints to modify existing resources. 
                      Include the resource ID in the URL path.
                    </p>
                  </Card>
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2 text-red-600">Delete (DELETE)</h4>
                    <p className="text-sm text-muted-foreground">
                      Use DELETE endpoints to remove resources. 
                      Be careful - this operation is usually irreversible.
                    </p>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Common HTTP Status Codes</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500 w-12 justify-center">200</Badge>
                    <span>Success - Request completed successfully</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500 w-12 justify-center">201</Badge>
                    <span>Created - Resource created successfully</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-red-500 w-12 justify-center">400</Badge>
                    <span>Bad Request - Invalid request data</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-orange-500 w-12 justify-center">401</Badge>
                    <span>Unauthorized - Authentication required</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-purple-500 w-12 justify-center">404</Badge>
                    <span>Not Found - Resource not found</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}