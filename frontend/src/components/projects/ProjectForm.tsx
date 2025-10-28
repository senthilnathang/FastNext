import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save,
  X,
  FileText,
  CheckCircle,
  Activity,
  User,
  Calendar,
  Tag,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Import mixin components
import {
  ActivityLog,
  AuditTrail,
  TimestampDisplay,
  AuditInfo
} from '@/components/common/mixins';

// Mock data for demonstration
const mockActivityData = [
  {
    id: 1,
    user_id: 1,
    action: 'CREATE' as const,
    entity_type: 'Project',
    entity_id: 1,
    entity_name: 'FastNext Framework',
    description: 'Created new project: FastNext Framework',
    level: 'INFO' as const,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    user: {
      id: 1,
      username: 'john_doe',
      full_name: 'John Doe'
    }
  },
  {
    id: 2,
    user_id: 2,
    action: 'UPDATE' as const,
    entity_type: 'Project',
    entity_id: 1,
    entity_name: 'FastNext Framework',
    description: 'Updated project description and added team members',
    level: 'INFO' as const,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    user: {
      id: 2,
      username: 'jane_smith',
      full_name: 'Jane Smith'
    }
  }
];

const mockAuditData = [
  {
    id: 1,
    user_id: 1,
    entity_type: 'Project',
    entity_id: 1,
    entity_name: 'FastNext Framework',
    operation: 'UPDATE' as const,
    old_values: { status: 'draft' },
    new_values: { status: 'active' },
    changed_fields: ['status'],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    user: {
      id: 1,
      username: 'john_doe',
      full_name: 'John Doe'
    }
  }
];

const mockTimestampData = {
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  created_by_user: {
    id: 2,
    username: 'jane_smith',
    full_name: 'Jane Smith'
  },
  updated_by_user: {
    id: 1,
    username: 'john_doe',
    full_name: 'John Doe'
  }
};

const mockAuditInfo = {
  created_by: 2,
  updated_by: 1,
  created_by_user: {
    id: 2,
    username: 'jane_smith',
    full_name: 'Jane Smith',
    email: 'jane.smith@example.com'
  },
  updated_by_user: {
    id: 1,
    username: 'john_doe',
    full_name: 'John Doe',
    email: 'john.doe@example.com'
  },
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
};

// Form validation schemas
const basicSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
});

const detailsSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().min(0, 'Budget must be positive').optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  repository_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  documentation_url: z.string().url('Invalid URL').optional().or(z.literal(''))
});

const approvalsSchema = z.object({
  requires_approval: z.boolean(),
  approval_workflow: z.enum(['none', 'single', 'multi-step']).optional(),
  approvers: z.array(z.object({
    id: z.number(),
    name: z.string(),
    email: z.string()
  })).optional(),
  approval_deadline: z.string().optional()
});

type BasicFormData = z.infer<typeof basicSchema>;
type DetailsFormData = z.infer<typeof detailsSchema>;
type ApprovalsFormData = z.infer<typeof approvalsSchema>;

interface ProjectFormProps {
  project?: any; // Project data for editing
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'approvals' | 'activity'>('details');

  // Basic form (always visible)
  const basicForm = useForm<BasicFormData>({
    resolver: zodResolver(basicSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      status: project?.status || 'draft',
      priority: project?.priority || 'medium'
    }
  });

  // Details form
  const detailsForm = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      start_date: project?.start_date || '',
      end_date: project?.end_date || '',
      budget: project?.budget || undefined,
      tags: project?.tags || [],
      category: project?.category || '',
      repository_url: project?.repository_url || '',
      documentation_url: project?.documentation_url || ''
    }
  });

  // Approvals form
  const approvalsForm = useForm<ApprovalsFormData>({
    resolver: zodResolver(approvalsSchema),
    defaultValues: {
      requires_approval: project?.requires_approval || false,
      approval_workflow: project?.approval_workflow || 'none',
      approvers: project?.approvers || [],
      approval_deadline: project?.approval_deadline || ''
    }
  });

  const handleSubmit = async () => {
    const isBasicValid = await basicForm.trigger();
    if (!isBasicValid) {
      setActiveTab('details'); // Switch to first tab if basic validation fails
      return;
    }

    const basicData = basicForm.getValues();
    const detailsData = detailsForm.getValues();
    const approvalsData = approvalsForm.getValues();

    const formData = {
      ...basicData,
      ...detailsData,
      ...approvalsData
    };

    onSubmit(formData);
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            {project ? 'Edit Project' : 'Create New Project'}
          </h1>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Basic Fields - Always Visible */}
        <div className="space-y-6 mb-8">
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  {...basicForm.register('name')}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    basicForm.formState.errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter project name"
                />
                {basicForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {basicForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  {...basicForm.register('status')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  {...basicForm.register('priority')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...basicForm.register('description')}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    basicForm.formState.errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter project description"
                />
                {basicForm.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {basicForm.formState.errors.description.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Project Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    {...detailsForm.register('start_date')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    {...detailsForm.register('end_date')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget ($)
                  </label>
                  <input
                    {...detailsForm.register('budget', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    {...detailsForm.register('category')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Web Development, Mobile App"
                  />
                </div>

                {/* Repository URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repository URL
                  </label>
                  <input
                    {...detailsForm.register('repository_url')}
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://github.com/username/repo"
                  />
                </div>

                {/* Documentation URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documentation URL
                  </label>
                  <input
                    {...detailsForm.register('documentation_url')}
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://docs.example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Approvals Tab */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Approval Settings</h3>

              <div className="space-y-6">
                {/* Requires Approval */}
                <div className="flex items-center">
                  <input
                    {...approvalsForm.register('requires_approval')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    This project requires approval before activation
                  </label>
                </div>

                {/* Approval Workflow */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Workflow
                  </label>
                  <select
                    {...approvalsForm.register('approval_workflow')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="none">No approval required</option>
                    <option value="single">Single approver</option>
                    <option value="multi-step">Multi-step approval</option>
                  </select>
                </div>

                {/* Approval Deadline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Deadline
                  </label>
                  <input
                    {...approvalsForm.register('approval_deadline')}
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Approvers Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approvers
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600">
                      Approver selection will be implemented in the next phase.
                      This will allow selecting users who need to approve this project.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Project Activity</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Log */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Recent Activity</h4>
                  <ActivityLog
                    activities={mockActivityData}
                    showUser={true}
                    showEntity={false}
                    maxItems={5}
                  />
                </div>

                {/* Audit Trail */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Audit Trail</h4>
                  <AuditTrail
                    auditEntries={mockAuditData}
                    showUser={true}
                    showChanges={true}
                    maxItems={3}
                  />
                </div>
              </div>

              {/* Timestamp Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Timeline</h4>
                <TimestampDisplay
                  timestamps={mockTimestampData}
                  showRelative={true}
                  showAbsolute={true}
                  showUser={true}
                  compact={false}
                />
              </div>

              {/* Audit Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Audit Information</h4>
                <AuditInfo
                  audit={mockAuditInfo}
                  showTimestamps={true}
                  showUsers={true}
                  showActions={true}
                  compact={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Saving...' : 'Save Project'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectForm;