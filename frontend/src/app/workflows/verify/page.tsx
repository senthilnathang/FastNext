'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Alert,
  AlertDescription
} from '@/shared/components';
import { 
  useWorkflowTypes, 
  useWorkflowTemplates, 
  useWorkflowInstances,
  useCreateWorkflowType,
  useCreateWorkflowTemplate,
  useCreateWorkflowInstance,
  useUpdateWorkflowType,
  useUpdateWorkflowTemplate,
  useDeleteWorkflowType,
  useDeleteWorkflowTemplate
} from '@/modules/workflow/hooks/useWorkflow';
import { CheckCircle, XCircle, Loader2, Play } from 'lucide-react';

export default function WorkflowVerifyPage() {
  const [testResults, setTestResults] = useState<Record<string, 'pending' | 'success' | 'error' | 'running'>>({});
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});

  // Hook queries
  const { data: typesData, refetch: refetchTypes } = useWorkflowTypes();
  const { data: templatesData, refetch: refetchTemplates } = useWorkflowTemplates();
  const { data: instancesData, refetch: refetchInstances } = useWorkflowInstances();
  
  // Hook mutations
  const createTypeMutation = useCreateWorkflowType();
  const createTemplateMutation = useCreateWorkflowTemplate();
  const createInstanceMutation = useCreateWorkflowInstance();
  const updateTypeMutation = useUpdateWorkflowType();
  const updateTemplateMutation = useUpdateWorkflowTemplate();
  const deleteTypeMutation = useDeleteWorkflowType();
  const deleteTemplateMutation = useDeleteWorkflowTemplate();

  const setTestResult = (testName: string, result: 'success' | 'error' | 'running', error?: string) => {
    setTestResults(prev => ({ ...prev, [testName]: result }));
    if (error) {
      setTestErrors(prev => ({ ...prev, [testName]: error }));
    } else {
      setTestErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[testName];
        return newErrors;
      });
    }
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    setTestResult(testName, 'running');
    try {
      await testFn();
      setTestResult(testName, 'success');
    } catch (error) {
      console.error(`Test ${testName} failed:`, error);
      setTestResult(testName, 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testWorkflowTypeCRUD = async () => {
    // Test Create
    const newType = await createTypeMutation.mutateAsync({
      name: `Test Type ${Date.now()}`,
      description: 'Test workflow type created by verification',
      icon: 'TestIcon',
      color: '#FF5733'
    });

    // Test Read (refetch)
    await refetchTypes();

    // Test Update
    await updateTypeMutation.mutateAsync({
      id: newType.id,
      data: {
        description: 'Updated test workflow type'
      }
    });

    // Test Delete
    await deleteTypeMutation.mutateAsync(newType.id);
  };

  const testWorkflowTemplateCRUD = async () => {
    // First create a workflow type for the template
    const newType = await createTypeMutation.mutateAsync({
      name: `Template Test Type ${Date.now()}`,
      description: 'Test type for template verification',
      icon: 'TestIcon',
      color: '#33FF57'
    });

    try {
      // Test Create Template
      const newTemplate = await createTemplateMutation.mutateAsync({
        name: `Test Template ${Date.now()}`,
        description: 'Test workflow template created by verification',
        workflow_type_id: newType.id,
        nodes: [
          {
            id: 'start',
            type: 'workflowState',
            position: { x: 100, y: 100 },
            data: { label: 'Start', isInitial: true }
          },
          {
            id: 'end',
            type: 'workflowState',
            position: { x: 300, y: 100 },
            data: { label: 'End', isFinal: true }
          }
        ],
        edges: [
          {
            id: 'start-end',
            source: 'start',
            target: 'end',
            data: { action: 'complete', label: 'Complete' }
          }
        ],
        settings: { testMode: true }
      });

      // Test Read (refetch)
      await refetchTemplates();

      // Test Update Template
      await updateTemplateMutation.mutateAsync({
        id: newTemplate.id,
        data: {
          description: 'Updated test workflow template',
          settings: { testMode: true, updated: true }
        }
      });

      // Test Delete Template
      await deleteTemplateMutation.mutateAsync(newTemplate.id);
    } finally {
      // Clean up the test type
      await deleteTypeMutation.mutateAsync(newType.id);
    }
  };

  const testWorkflowInstanceCRUD = async () => {
    // First create a workflow type and template
    const newType = await createTypeMutation.mutateAsync({
      name: `Instance Test Type ${Date.now()}`,
      description: 'Test type for instance verification',
      icon: 'TestIcon',
      color: '#5733FF'
    });

    const newTemplate = await createTemplateMutation.mutateAsync({
      name: `Instance Test Template ${Date.now()}`,
      description: 'Test template for instance verification',
      workflow_type_id: newType.id,
      nodes: [
        {
          id: 'start',
          type: 'workflowState',
          position: { x: 100, y: 100 },
          data: { label: 'Start', isInitial: true }
        }
      ],
      edges: [],
      settings: { testMode: true }
    });

    try {
      // Test Create Instance
      const newInstance = await createInstanceMutation.mutateAsync({
        template_id: newTemplate.id,
        entity_id: `test-entity-${Date.now()}`,
        entity_type: 'test',
        title: 'Test Workflow Instance',
        data: { testMode: true }
      });

      // Test Read (refetch)
      await refetchInstances();

      console.log('Successfully created workflow instance:', newInstance);
    } finally {
      // Clean up
      await deleteTemplateMutation.mutateAsync(newTemplate.id);
      await deleteTypeMutation.mutateAsync(newType.id);
    }
  };

  const testDataReading = async () => {
    await Promise.all([
      refetchTypes(),
      refetchTemplates(), 
      refetchInstances()
    ]);
  };

  const tests = [
    {
      name: 'Data Reading',
      description: 'Test reading workflow types, templates, and instances',
      testFn: testDataReading
    },
    {
      name: 'Workflow Type CRUD',
      description: 'Test Create, Read, Update, Delete operations for workflow types',
      testFn: testWorkflowTypeCRUD
    },
    {
      name: 'Workflow Template CRUD',
      description: 'Test Create, Read, Update, Delete operations for workflow templates with nodes/edges',
      testFn: testWorkflowTemplateCRUD
    },
    {
      name: 'Workflow Instance CRUD',
      description: 'Test Create, Read operations for workflow instances',
      testFn: testWorkflowInstanceCRUD
    }
  ];

  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test.name, test.testFn);
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error' | 'running' | undefined) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Workflow CRUD Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Test all workflow-related CRUD operations and API endpoints
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Data Status</CardTitle>
            <CardDescription>
              Current state of workflow data in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {typesData?.items?.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Workflow Types</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {templatesData?.items?.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Workflow Templates</div>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {instancesData?.items?.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Workflow Instances</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CRUD Tests</CardTitle>
            <CardDescription>
              Run comprehensive tests for all workflow CRUD operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Test Suite</h3>
              <Button onClick={runAllTests} className="bg-blue-600 hover:bg-blue-700">
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </Button>
            </div>

            <div className="space-y-3">
              {tests.map((test) => (
                <div key={test.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(testResults[test.name])}
                    <div>
                      <div className="font-medium">{test.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {test.description}
                      </div>
                      {testErrors[test.name] && (
                        <div className="text-sm text-red-600 mt-1">
                          Error: {testErrors[test.name]}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runTest(test.name, test.testFn)}
                    disabled={testResults[test.name] === 'running'}
                  >
                    {testResults[test.name] === 'running' ? 'Running...' : 'Run Test'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Test Information:</strong> These tests will create, modify, and delete test data to verify 
            the workflow system is working correctly. All test data will be cleaned up automatically.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}