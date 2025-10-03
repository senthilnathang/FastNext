# Project Timeline Features

This document describes the new timeline features added to the project management system, including start and end date fields for projects and enhanced timeline, Gantt, and calendar views.

## Overview

The project management system has been enhanced with comprehensive timeline capabilities:

- **Start Date & End Date**: Projects now have optional start and end date fields
- **Timeline View**: Gantt chart visualization showing project durations and progress
- **Enhanced List View**: Date columns with sorting and filtering capabilities
- **Calendar Integration**: Projects displayed on calendar based on their timeline
- **Progress Tracking**: Automatic progress calculation based on timeline

## Database Changes

### New Fields Added

```sql
-- Add start_date and end_date columns to projects table
ALTER TABLE projects 
ADD COLUMN start_date TIMESTAMP NULL,
ADD COLUMN end_date TIMESTAMP NULL;

-- Add indexes for better query performance
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_end_date ON projects(end_date);
CREATE INDEX idx_projects_date_range ON projects(start_date, end_date);
```

### Data Constraints

- Both start_date and end_date are optional (nullable)
- When both dates are set, end_date must be >= start_date
- Dates are stored as TIMESTAMP for timezone support

## Frontend Implementation

### Updated Interfaces

```typescript
export interface Project {
  id: number
  name: string
  description?: string
  user_id: number
  is_public: boolean
  settings: Record<string, unknown>
  start_date?: string      // New field
  end_date?: string        // New field
  created_at: string
  updated_at?: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
  is_public?: boolean
  settings?: Record<string, unknown>
  start_date?: string      // New field
  end_date?: string        // New field
}
```

### Enhanced Views

#### 1. List View

- **New Columns**: Start Date and End Date columns added
- **Sorting**: Projects can be sorted by start date, end date, or creation date
- **Filtering**: Date-based filtering (filterable: true, type: 'date')
- **Visual Indicators**: Color-coded calendar icons (green for start, red for end)

#### 2. Timeline/Gantt View

- **Project Duration**: Visual representation of project timelines
- **Progress Tracking**: Progress bars showing completion percentage
- **Interactive**: Drag and drop to modify project dates
- **Status Colors**: Different colors for project status (not started, in progress, completed, overdue)

```typescript
// Gantt view configuration
ganttIdField="id"
ganttTitleField="name"
ganttStartDateField="start_date"
ganttEndDateField="end_date"
ganttStatusField="status"
ganttProgressField="progress"
```

#### 3. Calendar View

- **Project Mapping**: Projects displayed on calendar based on start/end dates
- **Date Range**: Long-running projects span multiple days
- **Quick Add**: Create new projects directly from calendar dates

#### 4. Enhanced Forms

- **Date Inputs**: HTML5 date inputs for start and end dates
- **Validation**: Client-side validation to ensure end date is after start date
- **Grid Layout**: Side-by-side date inputs for better UX

```tsx
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
```

## Helper Functions

### Progress Calculation

```typescript
export function calculateProjectProgress(project: Project): number {
  if (!project.start_date || !project.end_date) return 0;
  
  const startDate = new Date(project.start_date);
  const endDate = new Date(project.end_date);
  const currentDate = new Date();
  
  if (currentDate < startDate) return 0;
  if (currentDate > endDate) return 100;
  
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = currentDate.getTime() - startDate.getTime();
  
  return Math.round((elapsed / totalDuration) * 100);
}
```

### Status Determination

```typescript
export function getProjectStatus(project: Project): 'not_started' | 'in_progress' | 'completed' | 'overdue' {
  if (!project.start_date || !project.end_date) return 'in_progress';
  
  const startDate = new Date(project.start_date);
  const endDate = new Date(project.end_date);
  const currentDate = new Date();
  
  if (currentDate < startDate) return 'not_started';
  if (currentDate > endDate) return 'overdue';
  
  const progress = calculateProjectProgress(project);
  return progress >= 100 ? 'completed' : 'in_progress';
}
```

## Usage Examples

### Creating a Project with Timeline

```typescript
const newProject: CreateProjectRequest = {
  name: "E-commerce Platform",
  description: "Building a modern e-commerce platform",
  is_public: true,
  start_date: "2024-01-15",
  end_date: "2024-06-30",
  settings: {}
};
```

### Filtering Projects by Date

```typescript
// Filter projects starting in 2024
const projects2024 = projects.filter(p => 
  p.start_date && p.start_date.startsWith('2024')
);

// Find projects ending this month
const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
const endingThisMonth = projects.filter(p => 
  p.end_date && p.end_date.startsWith(thisMonth)
);
```

### Sorting Projects by Timeline

```typescript
// Sort by start date (earliest first)
const sortedByStart = projects.sort((a, b) => {
  if (!a.start_date) return 1;
  if (!b.start_date) return -1;
  return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
});

// Sort by end date (soonest deadline first)
const sortedByEnd = projects.sort((a, b) => {
  if (!a.end_date) return 1;
  if (!b.end_date) return -1;
  return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
});
```

## ViewManager Configuration

The ViewManager component supports all the new timeline features through comprehensive props:

```typescript
<ViewManager
  // ... other props
  
  // Gantt view configuration
  ganttIdField="id"
  ganttTitleField="name"
  ganttStartDateField="start_date"
  ganttEndDateField="end_date"
  ganttStatusField="status"
  ganttProgressField="progress"
  
  // Calendar view configuration
  calendarIdField="id"
  calendarTitleField="name"
  calendarDateField="created_at"
  calendarDescriptionField="description"
  
  // Enhanced sorting options
  sortOptions={[
    { key: 'name', label: 'Project Name', defaultOrder: 'asc' },
    { key: 'start_date', label: 'Start Date', defaultOrder: 'asc' },
    { key: 'end_date', label: 'End Date', defaultOrder: 'asc' },
    { key: 'created_at', label: 'Created Date', defaultOrder: 'desc' }
  ]}
/>
```

## Benefits

1. **Better Project Planning**: Visual timeline helps with project planning and resource allocation
2. **Progress Tracking**: Automatic progress calculation based on timeline
3. **Deadline Management**: Clear visibility of project deadlines and overdue projects
4. **Resource Planning**: Gantt view helps identify resource conflicts and dependencies
5. **Historical Analysis**: Track project durations and improve future estimates
6. **Client Communication**: Timeline views provide clear project status for stakeholders

## Migration Guide

### For Existing Projects

1. **Database Migration**: Run the SQL migration to add the new columns
2. **Optional Data Population**: Existing projects can have dates added manually or through bulk update
3. **Backward Compatibility**: All new fields are optional, so existing functionality continues to work
4. **Progressive Enhancement**: New timeline features are available when date fields are populated

### For API Updates

1. **Request/Response**: Update API endpoints to handle the new start_date and end_date fields
2. **Validation**: Add server-side validation for date constraints
3. **Indexes**: Ensure database indexes are created for performance
4. **Documentation**: Update API documentation to reflect new fields

## Future Enhancements

- **Dependencies**: Add project dependency management
- **Milestones**: Add milestone tracking within projects
- **Resource Allocation**: Team member assignment and workload tracking
- **Time Tracking**: Actual time spent vs. estimated time
- **Reporting**: Advanced timeline and progress reports
- **Notifications**: Automated deadline and milestone reminders