/**
 * GraphQL Tester Component
 * Tests the GraphQL backend integration from the frontend
 */
'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Code,
  Zap,
  AlertTriangle
} from 'lucide-react';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

export function GraphQLTester() {
  const [customQuery, setCustomQuery] = useState('');
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  const predefinedQueries = {
    'Test Connection': `query { __typename }`,
    'Get Users': `query { users { edges { id username email } totalCount } }`,
    'Get Projects': `query { projects { edges { id name description } totalCount } }`,
    'Get Current User': `query { me { id username email fullName } }`,
    'Get Roles': `query { roles { id name description } }`,
    'Create Project': `mutation { createProject(input: { name: "Test Project", description: "Created from frontend" }) { success message } }`
  };

  const testGraphQLQuery = async (query: string, testName: string) => {
    const startTime = Date.now();

    try {
      const response = await fetch('/api/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const duration = Date.now() - startTime;
      const result = await response.json();

      if (response.ok) {
        setTestResults(prev => ({
          ...prev,
          [testName]: {
            success: true,
            data: result,
            duration
          }
        }));

        if (testName === 'Test Connection') {
          setConnectionStatus('connected');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      setTestResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        }
      }));

      if (testName === 'Test Connection') {
        setConnectionStatus('error');
      }
    }
  };

  const runCustomQuery = async () => {
    if (!customQuery.trim()) return;

    setIsLoading(true);
    await testGraphQLQuery(customQuery, 'Custom Query');
    setIsLoading(false);
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults({});

    for (const [testName, query] of Object.entries(predefinedQueries)) {
      await testGraphQLQuery(query, testName);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsLoading(false);
  };

  const getStatusIcon = (result?: TestResult) => {
    if (!result) return <Clock className="h-4 w-4 text-muted-foreground" />;
    return result.success
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (result?: TestResult) => {
    if (!result) return <Badge variant="secondary">Pending</Badge>;
    return result.success
      ? <Badge variant="default">Pass</Badge>
      : <Badge variant="destructive">Fail</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold mb-2">GraphQL Backend Integration Tester</h1>
        <p className="text-muted-foreground">
          Test GraphQL queries and mutations against the FastNext backend
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {connectionStatus === 'connected' && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-600">Connected to GraphQL Backend</span>
                <Badge variant="default">Active</Badge>
              </div>
            )}
            {connectionStatus === 'error' && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-600">Connection Failed</span>
                <Badge variant="destructive">Error</Badge>
              </div>
            )}
            {connectionStatus === 'unknown' && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-sm text-yellow-600">Unknown Status</span>
                <Badge variant="secondary">Unknown</Badge>
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button
              onClick={() => testGraphQLQuery(predefinedQueries['Test Connection'], 'Test Connection')}
              variant="outline"
              size="sm"
            >
              <Zap className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="predefined">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="predefined">Predefined Tests</TabsTrigger>
          <TabsTrigger value="custom">Custom Query</TabsTrigger>
        </TabsList>

        <TabsContent value="predefined" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Predefined GraphQL Tests</h3>
            <Button onClick={runAllTests} disabled={isLoading}>
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? 'Running Tests...' : 'Run All Tests'}
            </Button>
          </div>

          <div className="grid gap-4">
            {Object.entries(predefinedQueries).map(([testName, query]) => {
              const result = testResults[testName];

              return (
                <Card key={testName}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result)}
                        <CardTitle className="text-base">{testName}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result)}
                        {result?.duration && (
                          <span className="text-xs text-muted-foreground">
                            {result.duration}ms
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Query:</h4>
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                        {query}
                      </pre>
                    </div>

                    {result && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          {result.success ? 'Response:' : 'Error:'}
                        </h4>
                        <pre className={`p-3 rounded text-xs overflow-x-auto ${
                          result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}>
                          {result.success
                            ? JSON.stringify(result.data, null, 2)
                            : result.error
                          }
                        </pre>
                      </div>
                    )}

                    <Button
                      onClick={() => testGraphQLQuery(query, testName)}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Test
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Custom GraphQL Query</h3>
              <Textarea
                placeholder="Enter your GraphQL query here..."
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button onClick={runCustomQuery} disabled={isLoading || !customQuery.trim()}>
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? 'Running...' : 'Run Query'}
            </Button>

            {testResults['Custom Query'] && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(testResults['Custom Query'])}
                    Custom Query Result
                    {getStatusBadge(testResults['Custom Query'])}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className={`p-4 rounded text-sm overflow-x-auto ${
                    testResults['Custom Query'].success
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {testResults['Custom Query'].success
                      ? JSON.stringify(testResults['Custom Query'].data, null, 2)
                      : testResults['Custom Query'].error
                    }
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            GraphQL Usage Examples
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Query with Variables:</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`query GetUser($id: Int!) {
  user(id: $id) {
    id
    username
    email
    fullName
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Mutation Example:</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`mutation CreateProject($input: ProjectInput!) {
  createProject(input: $input) {
    success
    message
    project {
      id
      name
      description
    }
  }
}`}
            </pre>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The GraphQL endpoint is available at <code>/api/v1/graphql</code>.
              Some operations may require authentication via JWT token.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
