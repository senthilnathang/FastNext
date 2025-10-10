/**
 * GraphQL Demo Component
 * Showcases GraphQL implementation with live queries and mutations
 */
'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useMe } from '@/lib/graphql';
import { UsersList } from './UsersList';
import { ProjectsGrid } from './ProjectsGrid';
import { GraphQLTester } from './GraphQLTester';
import {
  Database,
  Users,
  FolderOpen,
  Activity,
  Code,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

export function GraphQLDemo() {
  const { data: currentUser, loading: userLoading, error: userError } = useMe();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold mb-2">GraphQL Implementation Demo</h1>
        <p className="text-muted-foreground">
          Real-time demonstration of GraphQL queries, mutations, and subscriptions
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            GraphQL Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {userLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-sm">Connecting to GraphQL...</span>
              </div>
            ) : userError ? (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-600">GraphQL Connection Failed</span>
                <Badge variant="destructive">Error</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-600">GraphQL Connected</span>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            )}
          </div>

          {currentUser?.me && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Authenticated as:</strong> {currentUser.me.fullName || currentUser.me.username}
                {currentUser.me.isSuperuser && (
                  <Badge variant="outline" className="ml-2">
                    Admin
                  </Badge>
                )}
              </p>
            </div>
          )}

          {userError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                GraphQL Error: {userError.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Demo Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tester" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Tester
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users Query
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Projects CRUD
          </TabsTrigger>
          <TabsTrigger value="code" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Code Examples
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  GraphQL Schema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✅ User management</li>
                  <li>✅ Project operations</li>
                  <li>✅ Page management</li>
                  <li>✅ Component system</li>
                  <li>✅ Activity logging</li>
                  <li>✅ Authentication</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>🔍 Real-time queries</li>
                  <li>⚡ Optimized with DataLoaders</li>
                  <li>🔒 Authentication & Authorization</li>
                  <li>📄 Pagination support</li>
                  <li>🎯 Type-safe operations</li>
                  <li>🔄 Optimistic updates</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Tech Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>🍓 Strawberry GraphQL</li>
                  <li>⚡ FastAPI backend</li>
                  <li>🚀 Apollo Client</li>
                  <li>📝 TypeScript types</li>
                  <li>🎨 React components</li>
                  <li>🔧 Code generation</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This demo showcases a full GraphQL implementation with real backend connectivity.
              Use the tabs above to explore different features and see live data operations.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="tester">
          <GraphQLTester />
        </TabsContent>

        <TabsContent value="users">
          <UsersList />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectsGrid />
        </TabsContent>

        <TabsContent value="code" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>GraphQL Implementation Code Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">1. Query Hook Usage</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { useUsers } from '@/lib/graphql';

function UsersList() {
  const { data, loading, error } = useUsers({
    first: 10,
    search: 'john'
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {data?.users.edges.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}`}
                </pre>
              </div>

              <div>
                <h3 className="font-medium mb-2">2. Mutation Hook Usage</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { useCreateProject } from '@/lib/graphql';

function CreateProjectForm() {
  const { createProject, loading } = useCreateProject();

  const handleSubmit = async (data) => {
    const result = await createProject({
      name: data.name,
      description: data.description,
      isPublic: data.isPublic
    });

    if (result?.success) {
      // Handle success
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}`}
                </pre>
              </div>

              <div>
                <h3 className="font-medium mb-2">3. GraphQL Query Definition</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`export const GET_USERS = gql\`
  query GetUsers($first: Int, $after: String, $search: String) {
    users(first: $first, after: $after, search: $search) {
      edges {
        ...UserFragment
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  \${USER_FRAGMENT}
\`;`}
                </pre>
              </div>

              <div>
                <h3 className="font-medium mb-2">4. Backend GraphQL Resolver</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`@strawberry.field
async def users(
    self, 
    info: strawberry.Info[GraphQLContext],
    first: Optional[int] = 10,
    after: Optional[str] = None,
    search: Optional[str] = None
) -> UserConnection:
    db = info.context.db
    
    query = select(User)
    
    if search:
        query = query.where(
            User.username.ilike(f"%{search}%") |
            User.email.ilike(f"%{search}%")
        )
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return UserConnection(
        edges=[convert_user_to_graphql(user) for user in users],
        page_info=PageInfo(...),
        total_count=len(users)
    )`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}