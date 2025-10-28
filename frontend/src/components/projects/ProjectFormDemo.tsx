import React, { useState } from 'react';
import ProjectForm from './ProjectForm';

const ProjectFormDemo: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowForm(true);
  };

  const handleEditProject = () => {
    // Mock project data for editing
    setEditingProject({
      id: 1,
      name: 'FastNext Framework',
      description: 'A comprehensive full-stack framework for rapid application development',
      status: 'active',
      priority: 'high',
      start_date: '2024-01-15',
      end_date: '2024-06-30',
      budget: 50000,
      tags: ['web-development', 'framework', 'full-stack'],
      category: 'Software Development',
      repository_url: 'https://github.com/fastnext/framework',
      documentation_url: 'https://docs.fastnext.com',
      requires_approval: true,
      approval_workflow: 'multi-step',
      approval_deadline: '2024-01-20T17:00'
    });
    setShowForm(true);
  };

  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
    setSubmittedData(data);
    setShowForm(false);
    // In a real app, you would make an API call here
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <ProjectForm
          project={editingProject}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Project Form Demo
        </h1>
        <p className="text-gray-600">
          Demonstration of the ProjectForm component with tabs for Details, Approvals, and Activity
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleCreateProject}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Create New Project
        </button>
        <button
          onClick={handleEditProject}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          Edit Existing Project
        </button>
      </div>

      {/* Features Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Features</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Fields (Always Visible)</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Project Name (required)</li>
              <li>• Description</li>
              <li>• Status (Draft/Active/Completed/Archived)</li>
              <li>• Priority (Low/Medium/High/Critical)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Details Tab</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Start and End dates</li>
              <li>• Budget allocation</li>
              <li>• Category and tags</li>
              <li>• Repository and documentation URLs</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Approvals Tab</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Approval requirements toggle</li>
              <li>• Approval workflow selection</li>
              <li>• Approver assignment</li>
              <li>• Approval deadlines</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Activity Tab</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Activity log display</li>
              <li>• Audit trail with changes</li>
              <li>• Timestamp information</li>
              <li>• Audit user information</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submitted Data Display */}
      {submittedData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Last Submitted Data</h2>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </div>
      )}

      {/* Technical Details */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Technical Implementation</h2>

        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Form Validation</h3>
            <p>Uses react-hook-form with Zod schema validation for type-safe form handling.</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Tab Navigation</h3>
            <p>Basic fields are always visible, with three tabs for additional sections.</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Mixin Components Integration</h3>
            <p>The Activity tab integrates ActivityLog, AuditTrail, TimestampDisplay, and AuditInfo components.</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Responsive Design</h3>
            <p>Fully responsive layout that works on desktop, tablet, and mobile devices.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectFormDemo;