'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/card';
import { Button } from '@/shared/components/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/dialog';
import { Input } from '@/shared/components/input';
import { Label } from '@/shared/components/label';
import { Textarea } from '@/shared/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/select';
import { GitBranch, Plus, Edit, Eye, Settings, Workflow } from 'lucide-react';
import { useWorkflowTypes, useWorkflowTemplates, useCreateWorkflowType, useCreateWorkflowTemplate } from '@/modules/workflow/hooks/useWorkflow';
import { WorkflowBuilder } from '@/modules/workflow';
import { formatDistanceToNow } from 'date-fns';

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'types' | 'templates'>('types');
  const [createTypeDialogOpen, setCreateTypeDialogOpen] = useState(false);
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false);
  const [builderDialogOpen, setBuilderDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  const [newType, setNewType] = useState({
    name: '',
    description: '',
    icon: 'GitBranch',
    color: '#3B82F6'
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    workflow_type_id: 0
  });

  const { data: typesData, isLoading: typesLoading } = useWorkflowTypes();
  const { data: templatesData, isLoading: templatesLoading } = useWorkflowTemplates();
  const createTypeMutation = useCreateWorkflowType();
  const createTemplateMutation = useCreateWorkflowTemplate();

  const workflowTypes = typesData?.items || [];
  const workflowTemplates = templatesData?.items || [];

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTypeMutation.mutateAsync(newType);
      setCreateTypeDialogOpen(false);
      setNewType({ name: '', description: '', icon: 'GitBranch', color: '#3B82F6' });
    } catch (error) {
      console.error('Failed to create workflow type:', error);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTemplateMutation.mutateAsync(newTemplate);
      setCreateTemplateDialogOpen(false);
      setNewTemplate({ name: '', description: '', workflow_type_id: 0 });
    } catch (error) {
      console.error('Failed to create workflow template:', error);
    }
  };

  const openBuilder = (templateId?: number) => {
    setSelectedTemplate(templateId || null);
    setBuilderDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Workflow className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow Management</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create and manage workflow types and templates
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('types')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'types'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Workflow Types
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Workflow Templates
            </button>
          </nav>
        </div>

        {/* Workflow Types Tab */}
        {activeTab === 'types' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Workflow Types</h2>
              <Dialog open={createTypeDialogOpen} onOpenChange={setCreateTypeDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Type
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Workflow Type</DialogTitle>
                    <DialogDescription>
                      Create a new workflow type for your business processes.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateType} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="type-name">Name</Label>
                      <Input
                        id="type-name"
                        placeholder="e.g., Sales, Purchase, Invoice"
                        value={newType.name}
                        onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type-description">Description</Label>
                      <Textarea
                        id="type-description"
                        placeholder="Describe this workflow type"
                        value={newType.description}
                        onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type-color">Color</Label>
                      <Input
                        id="type-color"
                        type="color"
                        value={newType.color}
                        onChange={(e) => setNewType({ ...newType, color: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setCreateTypeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTypeMutation.isPending}>
                        {createTypeMutation.isPending ? 'Creating...' : 'Create Type'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {typesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflowTypes.map((type) => (
                  <Card key={type.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                          <CardTitle className="text-lg">{type.name}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription>
                        {type.description || 'No description provided'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workflow Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Workflow Templates</h2>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => openBuilder()}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  New Template
                </Button>
                <Dialog open={createTemplateDialogOpen} onOpenChange={setCreateTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Workflow Template</DialogTitle>
                      <DialogDescription>
                        Create a new workflow template based on a workflow type.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTemplate} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Name</Label>
                        <Input
                          id="template-name"
                          placeholder="e.g., Standard Sales Process"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-description">Description</Label>
                        <Textarea
                          id="template-description"
                          placeholder="Describe this workflow template"
                          value={newTemplate.description}
                          onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-type">Workflow Type</Label>
                        <Select
                          value={newTemplate.workflow_type_id.toString()}
                          onValueChange={(value) => setNewTemplate({ ...newTemplate, workflow_type_id: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a workflow type" />
                          </SelectTrigger>
                          <SelectContent>
                            {workflowTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setCreateTemplateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createTemplateMutation.isPending}>
                          {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {templatesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflowTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => openBuilder(template.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {template.description || 'No description provided'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type:</span>
                          <span>{template.workflow_type?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">States:</span>
                          <span>{template.nodes?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created:</span>
                          <span>
                            {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workflow Builder Dialog */}
        <Dialog open={builderDialogOpen} onOpenChange={setBuilderDialogOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? `Edit Template #${selectedTemplate}` : 'Create New Workflow Template'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 h-[80vh]">
              <WorkflowBuilder
                templateId={selectedTemplate || undefined}
                readOnly={false}
                onSave={(nodes, edges) => {
                  console.log('Saving workflow:', { nodes, edges });
                  // Handle save logic here
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}