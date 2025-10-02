'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components';
import { GitBranch, Plus, Edit, Eye, Settings } from 'lucide-react';
import { useWorkflowTypes, useWorkflowTemplates, useCreateWorkflowType, useCreateWorkflowTemplate, useUpdateWorkflowTemplate } from '@/modules/workflow/hooks/useWorkflow';
import { WorkflowBuilder } from '@/modules/workflow';
import AdvancedWorkflowBuilder from '@/modules/workflow/components/AdvancedWorkflowBuilder';
import { formatDistanceToNow } from 'date-fns';

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'types' | 'templates'>('types');
  const [createTypeDialogOpen, setCreateTypeDialogOpen] = useState(false);
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false);
  const [builderDialogOpen, setBuilderDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [useAdvancedBuilder, setUseAdvancedBuilder] = useState(true);

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
  const updateTemplateMutation = useUpdateWorkflowTemplate();

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

  const handleSaveWorkflowTemplate = async (nodes: any[], edges: any[]) => {
    try {
      if (selectedTemplate) {
        // Update existing template with nodes and edges
        await updateTemplateMutation.mutateAsync({
          id: selectedTemplate,
          data: {
            nodes,
            edges,
            settings: {
              lastModified: new Date().toISOString(),
              nodeCount: nodes.length,
              edgeCount: edges.length
            }
          }
        });
        console.log('Workflow template updated successfully');
      } else {
        // Create new template with default values
        const defaultWorkflowType = workflowTypes[0];
        if (!defaultWorkflowType) {
          throw new Error('No workflow types available. Please create a workflow type first.');
        }

        const newTemplate = await createTemplateMutation.mutateAsync({
          name: 'New Workflow Template',
          description: 'Created from workflow builder',
          workflow_type_id: defaultWorkflowType.id,
          nodes,
          edges,
          settings: {
            created: new Date().toISOString(),
            nodeCount: nodes.length,
            edgeCount: edges.length
          }
        });
        setSelectedTemplate(newTemplate.id);
        console.log('New workflow template created successfully');
      }
      
      // Optionally close the dialog
      // setBuilderDialogOpen(false);
    } catch (error) {
      console.error('Failed to save workflow template:', error);
      alert(`Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse" variant="flat">
                    <CardHeader compact>
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {workflowTypes.map((type) => (
                  <Card key={type.id} className="hover:shadow-md transition-shadow" variant="default">
                    <CardHeader compact className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: type.color }}
                          />
                          <CardTitle size="sm" className="truncate">{type.name}</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon-sm" className="shrink-0">
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                      <CardDescription className="mt-1 line-clamp-2 text-xs">
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
                  {useAdvancedBuilder ? 'Advanced Builder' : 'New Template'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setUseAdvancedBuilder(!useAdvancedBuilder)}
                  className="text-xs"
                >
                  {useAdvancedBuilder ? 'Basic' : 'Advanced'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse" variant="flat">
                    <CardHeader compact>
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </CardHeader>
                    <CardContent compact>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {workflowTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow" variant="default">
                    <CardHeader compact className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle size="sm" className="truncate">{template.name}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2 text-xs">
                            {template.description || 'No description provided'}
                          </CardDescription>
                        </div>
                        <div className="flex space-x-1 shrink-0">
                          <Button variant="ghost" size="icon-sm" onClick={() => openBuilder(template.id)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon-sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent compact>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type:</span>
                          <span className="truncate ml-2">{template.workflow_type?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">States:</span>
                          <span>{template.nodes?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created:</span>
                          <span className="truncate ml-2">
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
            {useAdvancedBuilder ? (
              <AdvancedWorkflowBuilder
                templateId={selectedTemplate || undefined}
                readOnly={false}
                enableAdvancedFeatures={true}
                onSave={handleSaveWorkflowTemplate}
              />
            ) : (
              <WorkflowBuilder
                templateId={selectedTemplate || undefined}
                readOnly={false}
                onSave={handleSaveWorkflowTemplate}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}