'use client';

import React, { useState, useMemo } from 'react';
import { ViewManager, ViewConfig, Column } from '@/shared/components/views';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  Checkbox,
  Button
} from '@/shared/components';
import { Building2, Globe, Lock, Calendar, User, Clock, Trash2 } from 'lucide-react';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/modules/projects/hooks/useProjects';
import { formatDistanceToNow } from 'date-fns';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@/shared/types';
import { Badge } from '@/shared/components/ui/badge';
import type { SortOption, GroupOption } from '@/shared/components/ui';

export default function ProjectsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeView, setActiveView] = useState('projects-list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Project[]>([]);
  
  const { data: projectsData, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    is_public: false,
    settings: {},
    start_date: '',
    end_date: ''
  });

  // Define columns for the ViewManager
  const columns: Column<Project>[] = useMemo(() => [
    {
      id: 'name',
      key: 'name',
      label: 'Project Name',
      sortable: true,
      searchable: true,
      render: (value, project) => (
        <div className="flex items-center space-x-3">
          <Building2 className="h-4 w-4 text-blue-600" />
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-sm text-muted-foreground">
              {project.description || 'No description'}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'visibility',
      key: 'is_public',
      label: 'Visibility',
      sortable: true,
      filterable: true,
      type: 'select',
      filterOptions: [
        { label: 'Public', value: true },
        { label: 'Private', value: false }
      ],
      render: (value) => (
        <div className="flex items-center space-x-2">
          {value ? (
            <>
              <Globe className="h-4 w-4 text-blue-500" />
              <Badge variant="secondary">Public</Badge>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-gray-500" />
              <Badge variant="outline">Private</Badge>
            </>
          )}
        </div>
      )
    },
    {
      id: 'start_date',
      key: 'start_date',
      label: 'Start Date',
      sortable: true,
      filterable: true,
      type: 'date',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-green-500" />
          <span className="text-sm">
            {value ? new Date(value as string).toLocaleDateString() : 'Not set'}
          </span>
        </div>
      )
    },
    {
      id: 'end_date',
      key: 'end_date',
      label: 'End Date',
      sortable: true,
      filterable: true,
      type: 'date',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-red-500" />
          <span className="text-sm">
            {value ? new Date(value as string).toLocaleDateString() : 'Not set'}
          </span>
        </div>
      )
    },
    {
      id: 'created_at',
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
          </span>
        </div>
      )
    },
    {
      id: 'status',
      key: 'id',
      label: 'Status',
      sortable: false,
      render: () => (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Active
        </Badge>
      )
    }
  ], []);

  // Define sort options
  const sortOptions: SortOption[] = useMemo(() => [
    {
      key: 'name',
      label: 'Project Name',
      defaultOrder: 'asc'
    },
    {
      key: 'start_date',
      label: 'Start Date',
      defaultOrder: 'asc'
    },
    {
      key: 'end_date',
      label: 'End Date',
      defaultOrder: 'asc'
    },
    {
      key: 'created_at',
      label: 'Created Date',
      defaultOrder: 'desc'
    },
    {
      key: 'updated_at',
      label: 'Last Modified',
      defaultOrder: 'desc'
    },
    {
      key: 'is_public',
      label: 'Visibility',
      defaultOrder: 'desc'
    }
  ], []);

  // Define group options
  const groupOptions: GroupOption[] = useMemo(() => [
    {
      key: 'is_public',
      label: 'Visibility',
      icon: <Globe className="h-4 w-4" />
    },
    {
      key: 'owner',
      label: 'Owner',
      icon: <User className="h-4 w-4" />
    },
    {
      key: 'created_month',
      label: 'Created Month',
      icon: <Calendar className="h-4 w-4" />
    },
    {
      key: 'status',
      label: 'Status',
      icon: <Clock className="h-4 w-4" />
    }
  ], []);

  // Define available views
  const views: ViewConfig[] = useMemo(() => [
    {
      id: 'projects-card',
      name: 'Card View',
      type: 'card',
      columns,
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'desc'
    },
    {
      id: 'projects-list',
      name: 'List View',
      type: 'list',
      columns,
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'desc'
    },
    {
      id: 'projects-kanban',
      name: 'Kanban Board',
      type: 'kanban',
      columns,
      filters: {},
      groupBy: 'status'
    },
    {
      id: 'projects-gantt',
      name: 'Timeline View',
      type: 'gantt',
      columns,
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'asc'
    },
    {
      id: 'projects-calendar',
      name: 'Calendar View',
      type: 'calendar',
      columns,
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'asc'
    }
  ], [columns]);

  const projects = projectsData?.items || [];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Clean up empty date strings to avoid backend issues
      const cleanedData = {
        ...formData,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined
      };
      await createProject.mutateAsync(cleanedData);
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', is_public: false, settings: {}, start_date: '', end_date: '' });
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
        settings: formData.settings,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined
      };
      await updateProject.mutateAsync({ id: selectedProject.id, data: updateData });
      setEditDialogOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
      try {
        await deleteProject.mutateAsync(project.id);
        // Remove deleted project from selection if it was selected
        setSelectedItems(prev => prev.filter(item => item.id !== project.id));
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      is_public: project.is_public,
      settings: project.settings,
      start_date: project.start_date || '',
      end_date: project.end_date || ''
    });
    setEditDialogOpen(true);
  };

  const handleViewProject = (project: Project) => {
    // Navigate to project detail page or open view dialog
    console.log('View project:', project);
  };

  const handleExport = (format: 'csv' | 'json' | 'excel') => {
    console.log('Export projects as:', format);
    // Implement export functionality
  };

  const handleImport = (file: File) => {
    console.log('Import projects from file:', file.name);
    // Implement import functionality
  };

  const handleDateChange = (itemId: string | number, newDate: Date) => {
    // In a real implementation, this would update the project's created date or relevant date field
    console.log('Date change requested for project:', itemId, 'to:', newDate);
    // For now, we'll just log it since projects typically don't change their creation date
  };

  const handleCalendarQuickAdd = (date: Date, title: string) => {
    const newProject: CreateProjectRequest = {
      name: title,
      description: `Project created on ${date.toLocaleDateString()}`,
      is_public: false,
      settings: {}
    };
    
    createProject.mutate(newProject);
  };

  const bulkActions = [
    {
      label: 'Delete Selected',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      action: (selectedProjects: Project[]) => {
        if (confirm(`Delete ${selectedProjects.length} selected projects?`)) {
          selectedProjects.forEach(project => {
            deleteProject.mutate(project.id);
          });
          // Clear selection after deletion
          setSelectedItems([]);
        }
      }
    }
  ];

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
      <ViewManager
        title="Projects"
        subtitle="Manage your projects and applications"
        data={projects}
        columns={columns}
        views={views}
        activeView={activeView}
        onViewChange={setActiveView}
        loading={isLoading}
        error={error ? (error as any)?.message || String(error) : null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        sortOptions={sortOptions}
        groupBy={groupBy}
        onGroupChange={setGroupBy}
        groupOptions={groupOptions}
        onExport={handleExport}
        onImport={handleImport}
        onCreateClick={() => setCreateDialogOpen(true)}
        onEditClick={handleEditProject}
        onDeleteClick={handleDeleteProject}
        onViewClick={handleViewProject}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        bulkActions={bulkActions}
        showToolbar={true}
        showSearch={true}
        showFilters={true}
        showExport={true}
        showImport={true}
        showColumnSelector={true}
        showViewSelector={true}
        calendarIdField="id"
        calendarTitleField="name"
        calendarDateField="created_at"
        calendarDescriptionField="description"
        onDateChange={handleDateChange}
        calendarEnableQuickAdd={true}
        onCalendarQuickAdd={handleCalendarQuickAdd}
        calendarView="month"
        calendarShowToday={true}
        ganttIdField="id"
        ganttTitleField="name"
        ganttStartDateField="start_date"
        ganttEndDateField="end_date"
        ganttStatusField="status"
        ganttProgressField="progress"
      />

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start_date">Start Date</Label>
                <Input
                  id="edit-start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end_date">End Date</Label>
                <Input
                  id="edit-end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
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
  );
}