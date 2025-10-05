/**
 * ProjectsGrid Component
 * Example GraphQL implementation with projects query and mutations
 */
'use client';

import React, { useState } from 'react';
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  usePagination,
} from '@/lib/graphql';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Spinner } from '@/shared/components/ui/spinner';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Plus,
  FolderOpen,
  Calendar,
  Users,
  Globe,
  Lock,
  MoreVertical,
  Edit,
  Trash,
} from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ProjectForm {
  name: string;
  description: string;
  isPublic: boolean;
}

export function ProjectsGrid() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { variables, loadMore } = usePagination();
  
  const { data, loading, error, refetch } = useProjects(variables);
  const { createProject, loading: createLoading } = useCreateProject();
  const { deleteProject, loading: deleteLoading } = useDeleteProject();

  const form = useForm<ProjectForm>({
    defaultValues: {
      name: '',
      description: '',
      isPublic: false,
    },
  });

  const handleCreateProject = async (formData: ProjectForm) => {
    try {
      const result = await createProject({
        name: formData.name,
        description: formData.description || null,
        isPublic: formData.isPublic,
      });

      if (result?.success) {
        setIsCreateDialogOpen(false);
        form.reset();
        refetch();
      } else {
        console.error('Failed to create project:', result?.errors);
      }
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const result = await deleteProject(projectId);
      if (result?.success) {
        refetch();
      } else {
        console.error('Failed to delete project:', result?.errors);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  const handleLoadMore = () => {
    if (data?.projects.pageInfo.hasNextPage && data.projects.pageInfo.endCursor) {
      loadMore(data.projects.pageInfo.endCursor);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading projects: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">
            {data?.projects.totalCount || 0} projects total
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleCreateProject)} className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  {...form.register('name', { required: true })}
                  placeholder="Enter project name"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Enter project description (optional)"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  {...form.register('isPublic')}
                />
                <Label htmlFor="isPublic">Make project public</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
          <span className="ml-2">Loading projects...</span>
        </div>
      )}

      {data?.projects.edges && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.projects.edges.map((project) => (
              <Card key={project.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={deleteLoading}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {project.isPublic ? (
                      <Badge variant="secondary">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {project.owner && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{project.owner.username}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button variant="outline" className="w-full" size="sm">
                    View Project
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.projects.pageInfo.hasNextPage && (
            <div className="flex justify-center">
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load More Projects'
                )}
              </Button>
            </div>
          )}

          {data.projects.edges.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}