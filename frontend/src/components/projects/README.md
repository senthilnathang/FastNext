# Project Components

Components for managing projects in the FastNext application.

## Components

### ProjectForm
A comprehensive project form with tabbed interface for creating and editing projects.

```tsx
import { ProjectForm } from '@/components/projects';

<ProjectForm
  project={existingProject} // Optional: for editing
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  loading={isSubmitting}
/>
```

**Features:**
- **Basic Fields (Always Visible):** Name, description, status, priority
- **Details Tab:** Dates, budget, category, URLs, tags
- **Approvals Tab:** Approval workflow, approvers, deadlines
- **Activity Tab:** Activity logs, audit trails, timestamps, audit info

**Props:**
- `project?`: Project data for editing mode
- `onSubmit`: Callback when form is submitted
- `onCancel`: Callback when form is cancelled
- `loading?`: Loading state for submit button

### ProjectFormDemo
Demonstration component showing the ProjectForm in action with mock data.

```tsx
import { ProjectFormDemo } from '@/components/projects';

<ProjectFormDemo />
```

## Form Structure

### Basic Information (Always Visible)
- **Project Name** (required): String, 1-100 characters
- **Description**: Optional text, max 500 characters
- **Status**: Enum (draft, active, completed, archived)
- **Priority**: Enum (low, medium, high, critical)

### Details Tab
- **Start Date**: Optional date
- **End Date**: Optional date
- **Budget**: Optional number (USD)
- **Category**: Optional string
- **Tags**: Optional array of strings
- **Repository URL**: Optional valid URL
- **Documentation URL**: Optional valid URL

### Approvals Tab
- **Requires Approval**: Boolean toggle
- **Approval Workflow**: Enum (none, single, multi-step)
- **Approvers**: Array of user objects (future implementation)
- **Approval Deadline**: Optional datetime

### Activity Tab
Displays read-only information using mixin components:
- **Activity Log**: Recent project activities
- **Audit Trail**: Detailed change history
- **Timestamps**: Creation and update information
- **Audit Info**: User and audit details

## Validation

The form uses Zod schemas for validation:
- **Basic Schema**: Required fields validation
- **Details Schema**: URL and number validation
- **Approvals Schema**: Workflow logic validation

Form validation prevents submission if basic fields are invalid and automatically focuses the first tab with errors.

## Integration

### Backend Integration
The form is designed to work with the enhanced base model system:
- Projects inherit from `AuditableActivityModel`
- Automatic activity logging on create/update
- Audit trails for all changes
- Message notifications for approvals

### API Integration
```typescript
// Create project
const response = await api.post('/projects', formData);

// Update project
const response = await api.put(`/projects/${projectId}`, formData);
```

## Styling

- **Tailwind CSS**: Responsive design with consistent styling
- **Form Controls**: Accessible inputs with focus states
- **Tab Navigation**: Clean tab interface with icons
- **Loading States**: Spinner animations during submission
- **Error States**: Red borders and error messages

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Color contrast compliance

## Future Enhancements

- **Approver Selection**: User picker for approval workflows
- **Tag Management**: Dynamic tag creation and management
- **File Attachments**: Document upload functionality
- **Project Templates**: Pre-filled forms from templates
- **Collaborator Management**: Team member assignment
- **Progress Tracking**: Project milestone management</content>
</xai:function_call