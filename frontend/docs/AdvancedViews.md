# Advanced Views Documentation

## Overview

The FastNext frontend includes three advanced view components that extend the ViewManager's capabilities beyond traditional list and card layouts. These views are specifically designed for different data visualization and management scenarios:

- **KanbanView** - Project management style boards
- **GanttView** - Timeline visualization for project scheduling  
- **CalendarView** - Calendar-based data management

All advanced views integrate seamlessly with the ViewManager component and share the same API patterns for consistency.

## KanbanView Component

### Purpose
The KanbanView provides a project management style board layout with columns representing different states or categories. Items can be moved between columns via drag & drop.

### Key Features
- ✅ **Drag & Drop**: Move cards between columns
- ✅ **Quick Add**: Add new items directly to columns
- ✅ **Custom Column Colors**: Visual differentiation
- ✅ **Flexible Field Mapping**: Use any data structure
- ✅ **Auto-generated Columns**: Create columns from data
- ✅ **Card Customization**: Custom card rendering

### Basic Usage

```typescript
import { KanbanView } from '@/shared/components/views'

function TaskBoard() {
  const columns = [
    { id: 'todo', title: 'To Do', color: '#94a3b8' },
    { id: 'in_progress', title: 'In Progress', color: '#3b82f6' },
    { id: 'done', title: 'Done', color: '#10b981' }
  ]

  return (
    <KanbanView
      data={tasks}
      columns={columns}
      groupByField="status"
      cardTitleField="title"
      cardDescriptionField="description"
      onMoveCard={(cardId, sourceCol, targetCol) => {
        updateTaskStatus(cardId, targetCol)
      }}
      enableQuickAdd={true}
      onQuickAdd={(columnId, title) => {
        createTask({ title, status: columnId })
      }}
    />
  )
}
```

### Props API

| Prop | Type | Description |
|------|------|-------------|
| `data` | `T[]` | Array of data items |
| `columns` | `KanbanColumn[]` | Column definitions |
| `groupByField` | `keyof T \| string` | Field to group items by |
| `cardTitleField` | `keyof T \| string` | Field for card title |
| `cardDescriptionField` | `keyof T \| string` | Field for card description |
| `onMoveCard` | `(cardId, sourceCol, targetCol) => void` | Drag & drop handler |
| `enableQuickAdd` | `boolean` | Enable quick add functionality |
| `onQuickAdd` | `(columnId, title) => void` | Quick add handler |

### Integration with ViewManager

```typescript
<ViewManager
  // ... other props
  kanbanColumns={kanbanColumns}
  kanbanGroupByField="status"
  kanbanCardTitleField="title"
  kanbanCardDescriptionField="description"
  onMoveCard={handleMoveCard}
  enableQuickAdd={true}
  onQuickAdd={handleQuickAdd}
/>
```

## GanttView Component

### Purpose
The GanttView provides timeline visualization for project scheduling, task management, and any data with start/end dates.

### Key Features
- ✅ **Multi-scale Timeline**: Days, weeks, months view modes
- ✅ **Interactive Gantt Bars**: Drag to resize and move
- ✅ **Progress Indicators**: Visual progress bars
- ✅ **Dual-pane Layout**: Sidebar + timeline
- ✅ **Flexible Date Mapping**: Use any date fields
- ✅ **Custom Rendering**: Custom gantt bar rendering

### Basic Usage

```typescript
import { GanttView } from '@/shared/components/views'

function ProjectTimeline() {
  return (
    <GanttView
      data={projects}
      idField="id"
      titleField="name"
      startDateField="start_date"
      endDateField="end_date"
      progressField="progress"
      statusField="status"
      viewMode="weeks"
      showProgress={true}
      showWeekends={false}
      allowResize={true}
      allowMove={true}
      onUpdateDates={(itemId, startDate, endDate) => {
        updateProjectDates(itemId, { startDate, endDate })
      }}
      onUpdateProgress={(itemId, progress) => {
        updateProjectProgress(itemId, progress)
      }}
    />
  )
}
```

### Props API

| Prop | Type | Description |
|------|------|-------------|
| `data` | `T[]` | Array of data items |
| `idField` | `keyof T \| string` | Unique identifier field |
| `titleField` | `keyof T \| string` | Title field |
| `startDateField` | `keyof T \| string` | Start date field |
| `endDateField` | `keyof T \| string` | End date field |
| `progressField` | `keyof T \| string` | Progress percentage field |
| `viewMode` | `'days' \| 'weeks' \| 'months'` | Timeline scale |
| `showProgress` | `boolean` | Show progress bars |
| `allowResize` | `boolean` | Allow resizing gantt bars |
| `allowMove` | `boolean` | Allow moving gantt bars |
| `onUpdateDates` | `(id, start, end) => void` | Date update handler |

### Integration with ViewManager

```typescript
<ViewManager
  // ... other props
  ganttIdField="id"
  ganttTitleField="name"
  ganttStartDateField="start_date"
  ganttEndDateField="end_date"
  ganttProgressField="progress"
  ganttViewMode="weeks"
  showProgress={true}
  allowResize={true}
  allowMove={true}
  onUpdateDates={handleUpdateDates}
/>
```

## CalendarView Component

### Purpose
The CalendarView provides calendar-based data management with month/week views, perfect for events, deadlines, and date-based planning.

### Key Features
- ✅ **Month/Week Views**: Switch between view modes
- ✅ **Drag & Drop**: Move items between dates
- ✅ **Quick Add**: Add items to specific dates
- ✅ **Today Highlighting**: Visual today indicator
- ✅ **Weekend Control**: Show/hide weekends
- ✅ **Flexible Date Mapping**: Use any date field

### Basic Usage

```typescript
import { CalendarView } from '@/shared/components/views'

function EventCalendar() {
  return (
    <CalendarView
      data={events}
      idField="id"
      titleField="title"
      dateField="event_date"
      descriptionField="description"
      statusField="status"
      view="month"
      showToday={true}
      showWeekends={true}
      allowDragDrop={true}
      enableQuickAdd={true}
      onDateChange={(itemId, newDate) => {
        updateEventDate(itemId, newDate)
      }}
      onQuickAdd={(date, title) => {
        createEvent({ title, date })
      }}
    />
  )
}
```

### Props API

| Prop | Type | Description |
|------|------|-------------|
| `data` | `T[]` | Array of data items |
| `idField` | `keyof T \| string` | Unique identifier field |
| `titleField` | `keyof T \| string` | Title field |
| `dateField` | `keyof T \| string` | Date field |
| `descriptionField` | `keyof T \| string` | Description field |
| `view` | `'month' \| 'week'` | Calendar view mode |
| `showToday` | `boolean` | Highlight today |
| `showWeekends` | `boolean` | Show weekend days |
| `allowDragDrop` | `boolean` | Enable drag & drop |
| `enableQuickAdd` | `boolean` | Enable quick add |
| `onDateChange` | `(id, newDate) => void` | Date change handler |
| `onQuickAdd` | `(date, title) => void` | Quick add handler |

### Integration with ViewManager

```typescript
<ViewManager
  // ... other props
  calendarIdField="id"
  calendarTitleField="title"
  calendarDateField="event_date"
  calendarDescriptionField="description"
  calendarView="month"
  calendarShowToday={true}
  calendarEnableQuickAdd={true}
  onDateChange={handleDateChange}
  onCalendarQuickAdd={handleCalendarQuickAdd}
/>
```

## Design Principles

### Consistency
All advanced views follow the same design patterns:
- Similar prop naming conventions
- Consistent event handler signatures
- Shared UI components and styling
- Common accessibility features

### Flexibility
Field mapping allows any data structure:
```typescript
// Works with any field names
ganttStartDateField="project_start"
ganttEndDateField="project_deadline"
calendarDateField="due_date"
kanbanGroupByField="workflow_stage"
```

### Performance
Optimized for large datasets:
- Efficient rendering with React.memo
- Virtualization-ready architecture
- Minimal re-renders on data changes
- Smart memoization of calculations

### Accessibility
Full accessibility support:
- ARIA labels and roles
- Keyboard navigation
- Screen reader compatibility
- Focus management

## Implementation Examples

### Project Management Dashboard

```typescript
function ProjectDashboard() {
  const [activeView, setActiveView] = useState('kanban')
  
  const views = [
    { id: 'kanban', name: 'Board', type: 'kanban' },
    { id: 'gantt', name: 'Timeline', type: 'gantt' },
    { id: 'calendar', name: 'Calendar', type: 'calendar' }
  ]
  
  return (
    <ViewManager
      title="Project Dashboard"
      data={projects}
      columns={columns}
      views={views}
      activeView={activeView}
      onViewChange={setActiveView}
      
      // Kanban config
      kanbanColumns={statusColumns}
      kanbanGroupByField="status"
      
      // Gantt config
      ganttStartDateField="start_date"
      ganttEndDateField="end_date"
      ganttViewMode="weeks"
      
      // Calendar config
      calendarDateField="deadline"
      calendarView="month"
    />
  )
}
```

### Event Management

```typescript
function EventManager() {
  return (
    <ViewManager
      title="Events"
      data={events}
      columns={eventColumns}
      views={eventViews}
      activeView="calendar"
      
      // Calendar optimized for events
      calendarDateField="event_date"
      calendarDescriptionField="description"
      calendarStatusField="status"
      calendarShowWeekends={true}
      calendarEnableQuickAdd={true}
      onCalendarQuickAdd={createQuickEvent}
    />
  )
}
```

### Task Management

```typescript
function TaskManager() {
  return (
    <ViewManager
      title="Tasks"
      data={tasks}
      columns={taskColumns}
      views={taskViews}
      
      // Kanban for workflow
      kanbanColumns={workflowColumns}
      kanbanGroupByField="stage"
      enableQuickAdd={true}
      
      // Gantt for planning
      ganttStartDateField="planned_start"
      ganttEndDateField="planned_end"
      ganttProgressField="completion"
      showProgress={true}
    />
  )
}
```

## Styling and Theming

### CSS Variables
Customize appearance using CSS variables:

```css
:root {
  /* Kanban */
  --kanban-column-bg: theme('colors.muted.50');
  --kanban-card-bg: theme('colors.background');
  --kanban-card-border: theme('colors.border');
  
  /* Gantt */
  --gantt-timeline-bg: theme('colors.background');
  --gantt-bar-bg: theme('colors.primary.500');
  --gantt-progress-bg: theme('colors.primary.700');
  
  /* Calendar */
  --calendar-cell-bg: theme('colors.background');
  --calendar-today-bg: theme('colors.primary.50');
  --calendar-item-bg: theme('colors.primary.100');
}
```

### Dark Mode Support
All views automatically support dark mode through CSS variables and Tailwind's dark mode classes.

### Responsive Design
- Mobile-optimized layouts
- Touch-friendly interactions
- Responsive spacing and sizing
- Adaptive navigation controls

## Performance Best Practices

### Data Optimization
```typescript
// Memoize processed data
const processedData = useMemo(() => {
  return data.map(item => ({
    ...item,
    // Pre-process expensive calculations
    formattedDate: formatDate(item.date),
    statusColor: getStatusColor(item.status)
  }))
}, [data])
```

### Event Handler Optimization
```typescript
// Memoize event handlers
const handleMoveCard = useCallback((cardId, sourceCol, targetCol) => {
  updateItemStatus(cardId, targetCol)
}, [updateItemStatus])
```

### Large Dataset Handling
```typescript
// Implement pagination for large datasets
const paginatedData = useMemo(() => {
  const start = (currentPage - 1) * pageSize
  return processedData.slice(start, start + pageSize)
}, [processedData, currentPage, pageSize])
```

## Troubleshooting

### Common Issues

1. **Drag & Drop Not Working**
   - Ensure drag handlers are properly bound
   - Check browser support for drag events
   - Verify data structure includes required ID field

2. **Date Parsing Errors**
   - Ensure date fields contain valid date strings
   - Check timezone handling
   - Use consistent date formats

3. **Performance Issues**
   - Implement data pagination
   - Memoize expensive calculations
   - Use React.memo for component optimization

4. **Styling Issues**
   - Check CSS variable definitions
   - Verify Tailwind class conflicts
   - Ensure proper z-index stacking

### Debug Mode
Enable debug logging:
```typescript
// Set environment variable
DEBUG=advanced-views npm run dev

// Or in component
const DEBUG = process.env.NODE_ENV === 'development'
```

## Migration Guide

### From Legacy Components
1. Replace existing kanban/gantt components with new advanced views
2. Update prop names to match new API
3. Migrate event handlers to new signatures
4. Update CSS classes to new design system

### Version Compatibility
- ViewManager 2.0+ required
- React 18+ recommended
- TypeScript 4.5+ for full type support

## Support and Contributing

### Getting Help
- Check this documentation first
- Review example implementations
- Open issues for bugs or questions

### Contributing
- Follow existing code patterns
- Add TypeScript types for new features
- Update documentation for changes
- Include tests for new functionality

---

*Last updated: October 2025*
*Component versions: KanbanView 1.0.0, GanttView 1.0.0, CalendarView 1.0.0*