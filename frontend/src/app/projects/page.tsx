'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/card';
import { Building2, Plus, Edit, Trash2, Calendar, Globe, Lock, MoreVertical } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/dialog';
import { Input } from '@/shared/components/input';
import { Label } from '@/shared/components/label';
import { Textarea } from '@/shared/components/textarea';
import { Checkbox } from '@/shared/components/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/dropdown-menu';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/modules/projects/hooks/useProjects';
import { formatDistanceToNow } from 'date-fns';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@/shared/types';

export default function ProjectsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const { data: projectsData, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    is_public: false,
    settings: {}
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject.mutateAsync(formData);
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', is_public: false, settings: {} });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    try {
      const updateData: UpdateProjectRequest = {
        name: formData.name,
        description: formData.description,
        is_public: formData.is_public,
        settings: formData.settings
      };
      await updateProject.mutateAsync({ id: selectedProject.id, data: updateData });
      setEditDialogOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject.mutateAsync(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      is_public: project.is_public,
      settings: project.settings
    });
    setEditDialogOpen(true);
  };

  const projects = projectsData?.items || [];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load projects
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || 'An error occurred while loading projects'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your projects and applications
              </p>
            </div>
          </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to start building your application.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter project description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: !!checked })}
                />
                <Label htmlFor="is_public">Make this project public</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
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
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow" variant="default">
                <CardHeader compact className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle size="sm" className="truncate">{project.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2 text-xs">
                        {project.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="shrink-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(project)}>
                          <Edit className="h-3 w-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent compact>
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span className="truncate">
                        {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {project.is_public ? (
                          <div title="Public project">
                            <Globe className="h-3 w-3 text-blue-500" />
                          </div>
                        ) : (
                          <div title="Private project">
                            <Lock className="h-3 w-3 text-gray-500" />
                          </div>
                        )}
                        <span className="text-xs text-gray-500">
                          {project.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                  </div>
                </CardContent>
            </Card>
          ))}
          
          {/* Create new project card */}
          <Card 
            className="border-dashed border-2 hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => setCreateDialogOpen(true)}
            variant="outlined"
          >
            <CardContent compact className="flex flex-col items-center justify-center py-8">
              <Plus className="h-8 w-8 text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Create New Project
              </h3>
              <p className="text-xs text-gray-500 text-center">
                Start building something amazing
              </p>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Edit Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter project description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: !!checked })}
              />
              <Label htmlFor="edit-is_public">Make this project public</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending ? 'Updating...' : 'Update Project'}
              </Button>
            </div>
          </form>
        </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}