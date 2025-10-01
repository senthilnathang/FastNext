# ViewManager Component Documentation

## Overview

The ViewManager is a powerful, universal data visualization component that provides multiple switchable view types with advanced data management capabilities. It's designed to handle complex datasets with features like filtering, sorting, grouping, selection, and bulk operations.

## Features

### 🎯 **Multi-View Support**
- **Card View**: Grid-based card layout for visual data presentation
- **List View**: Traditional table layout with sortable columns
- **Kanban Board**: Board-style organization (coming soon)
- **Gantt Chart**: Timeline visualization (coming soon)
- **Cohort Analysis**: Data cohort visualization (coming soon)

### 🔧 **Data Management**
- **Search**: Real-time search across searchable columns
- **Filtering**: Advanced column-specific filters with custom options
- **Sorting**: Multi-column sorting with visual indicators
- **Grouping**: Organize data by specified fields
- **Selection**: Individual and bulk item selection
- **Pagination**: Built-in pagination support

### 📊 **Advanced Controls**
- **Column Management**: Drag-and-drop reordering, show/hide columns
- **Export/Import**: Multiple format support (CSV, JSON, Excel)
- **Bulk Actions**: Custom bulk operations on selected items
- **View Configuration**: Save and manage custom view configurations

## Installation

The ViewManager component is part of the shared components library:

```typescript
import { ViewManager } from '@/shared/components/views';
```

## Basic Usage

```typescript
import React, { useState, useMemo } from 'react';
import { ViewManager, ViewConfig, Column } from '@/shared/components/views';
import type { SortOption, GroupOption } from '@/shared/components/ui';

function MyDataPage() {
  const [activeView, setActiveView] = useState('data-list');
  const [selectedItems, setSelectedItems] = useState<DataItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<string>('');

  // Define columns
  const columns: Column<DataItem>[] = useMemo(() => [
    {
      id: 'name',
      key: 'name',
      label: 'Name',
      sortable: true,
      searchable: true,
      render: (value, item) => <strong>{value}</strong>
    },
    {
      id: 'status',
      key: 'status',
      label: 'Status',
      filterable: true,
      type: 'select',
      filterOptions: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' }
      ]
    }
  ], []);

  // Define views
  const views: ViewConfig[] = useMemo(() => [
    {
      id: 'data-list',
      name: 'List View',
      type: 'list',
      columns,
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'desc'
    },
    {
      id: 'data-cards',
      name: 'Card View',
      type: 'card',
      columns,
      filters: {}
    }
  ], [columns]);

  // Define sort options
  const sortOptions: SortOption[] = [
    { key: 'name', label: 'Name', defaultOrder: 'asc' },
    { key: 'created_at', label: 'Created Date', defaultOrder: 'desc' }
  ];

  // Define group options
  const groupOptions: GroupOption[] = [
    { key: 'status', label: 'Status', icon: <StatusIcon /> },
    { key: 'category', label: 'Category', icon: <CategoryIcon /> }
  ];

  return (
    <ViewManager
      title="My Data"
      subtitle="Manage your data efficiently"
      data={data}
      columns={columns}
      views={views}
      activeView={activeView}
      onViewChange={setActiveView}
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
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
      selectable={true}
      onCreateClick={() => console.log('Create new item')}
      onEditClick={(item) => console.log('Edit item:', item)}
      onDeleteClick={(item) => console.log('Delete item:', item)}
    />
  );
}
```

## Props API

### Core Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `T[]` | ✅ | Array of data items to display |
| `columns` | `Column<T>[]` | ✅ | Column configuration array |
| `views` | `ViewConfig[]` | ✅ | Available view configurations |
| `activeView` | `string` | ✅ | Currently active view ID |
| `onViewChange` | `(viewId: string) => void` | ✅ | View change handler |

### Data Management

| Prop | Type | Description |
|------|------|-------------|
| `loading` | `boolean` | Loading state indicator |
| `error` | `string \| null` | Error message to display |
| `searchQuery` | `string` | Current search query |
| `onSearchChange` | `(query: string) => void` | Search change handler |
| `filters` | `Record<string, any>` | Current filter values |
| `onFiltersChange` | `(filters: Record<string, any>) => void` | Filter change handler |

### Sorting & Grouping

| Prop | Type | Description |
|------|------|-------------|
| `sortBy` | `string` | Current sort field |
| `sortOrder` | `'asc' \| 'desc'` | Current sort order |
| `onSortChange` | `(field: string, order: 'asc' \| 'desc') => void` | Sort change handler |
| `sortOptions` | `SortOption[]` | Available sort options |
| `groupBy` | `string` | Current group field |
| `onGroupChange` | `(field: string) => void` | Group change handler |
| `groupOptions` | `GroupOption[]` | Available group options |

### Selection & Actions

| Prop | Type | Description |
|------|------|-------------|
| `selectable` | `boolean` | Enable item selection |
| `selectedItems` | `T[]` | Currently selected items |
| `onSelectionChange` | `(items: T[]) => void` | Selection change handler |
| `bulkActions` | `BulkAction[]` | Available bulk actions |
| `onCreateClick` | `() => void` | Create button handler |
| `onEditClick` | `(item: T) => void` | Edit button handler |
| `onDeleteClick` | `(item: T) => void` | Delete button handler |
| `onViewClick` | `(item: T) => void` | View button handler |

### Export/Import

| Prop | Type | Description |
|------|------|-------------|
| `onExport` | `(format: 'csv' \| 'json' \| 'excel') => void` | Export handler |
| `onImport` | `(file: File) => void` | Import handler |

### UI Customization

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Page/section title |
| `subtitle` | `string` | - | Page/section subtitle |
| `showToolbar` | `boolean` | `true` | Show/hide toolbar |
| `showSearch` | `boolean` | `true` | Show/hide search |
| `showFilters` | `boolean` | `true` | Show/hide filters |
| `showExport` | `boolean` | `true` | Show/hide export |
| `showImport` | `boolean` | `true` | Show/hide import |
| `showColumnSelector` | `boolean` | `true` | Show/hide column manager |
| `showViewSelector` | `boolean` | `true` | Show/hide view selector |

## Column Configuration

```typescript
interface Column<T> {
  id: string;                    // Unique column identifier
  key: keyof T | string;         // Data property key
  label: string;                 // Display label
  render?: (value: unknown, row: T) => React.ReactNode; // Custom renderer
  sortable?: boolean;            // Enable sorting (default: true)
  filterable?: boolean;          // Enable filtering (default: true)
  searchable?: boolean;          // Include in search (default: true)
  width?: string;                // Column width
  visible?: boolean;             // Initial visibility (default: true)
  pinned?: boolean;              // Pin column position
  type?: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'custom';
  filterOptions?: Array<{ label: string; value: any }>; // Select filter options
}
```

### Column Types

- **`text`**: Standard text column with string filtering
- **`number`**: Numeric column with range filtering  
- **`date`**: Date column with date range filtering
- **`boolean`**: Boolean column with true/false filtering
- **`select`**: Dropdown selection with predefined options
- **`custom`**: Custom column with custom filtering logic

## View Configuration

```typescript
interface ViewConfig {
  id: string;                    // Unique view identifier
  name: string;                  // Display name
  type: ViewType;                // View type
  columns: Column[];             // Column configuration
  filters: Record<string, any>;  // Default filters
  sortBy?: string;               // Default sort field
  sortOrder?: 'asc' | 'desc';    // Default sort order
  groupBy?: string;              // Default group field
  pageSize?: number;             // Items per page
}
```

### View Types

- **`list`**: Traditional table layout
- **`card`**: Grid of cards layout
- **`kanban`**: Board-style columns (coming soon)
- **`gantt`**: Timeline visualization (coming soon)
- **`cohort`**: Cohort analysis view (coming soon)

## Sort & Group Options

### Sort Options
```typescript
interface SortOption {
  key: string;                   // Field to sort by
  label: string;                 // Display label
  defaultOrder?: 'asc' | 'desc'; // Default sort direction
}
```

### Group Options
```typescript
interface GroupOption {
  key: string;                   // Field to group by
  label: string;                 // Display label
  icon?: React.ReactNode;        // Optional icon
}
```

## Bulk Actions

```typescript
interface BulkAction {
  label: string;                           // Action label
  icon?: React.ReactNode;                  // Optional icon
  action: (items: T[]) => void;           // Action handler
}
```

## Advanced Features

### Custom Renderers

```typescript
const columns: Column<User>[] = [
  {
    id: 'avatar',
    key: 'avatar',
    label: 'Avatar',
    render: (value, user) => (
      <img 
        src={user.avatarUrl} 
        alt={user.name}
        className="w-8 h-8 rounded-full"
      />
    )
  },
  {
    id: 'status',
    key: 'isActive',
    label: 'Status',
    render: (value) => (
      <Badge variant={value ? 'success' : 'secondary'}>
        {value ? 'Active' : 'Inactive'}
      </Badge>
    )
  }
];
```

### Dynamic Filtering

```typescript
const handleAdvancedFilter = (filters: Record<string, any>) => {
  // Custom filter logic
  const filtered = data.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      
      switch (key) {
        case 'dateRange':
          return isWithinDateRange(item.createdAt, value);
        case 'tags':
          return item.tags.some(tag => value.includes(tag));
        default:
          return item[key] === value;
      }
    });
  });
  
  setFilteredData(filtered);
};
```

### Export Functionality

```typescript
const handleExport = async (format: 'csv' | 'json' | 'excel') => {
  const exportData = selectedItems.length > 0 ? selectedItems : data;
  
  switch (format) {
    case 'csv':
      await exportToCSV(exportData, 'data-export.csv');
      break;
    case 'json':
      await exportToJSON(exportData, 'data-export.json');
      break;
    case 'excel':
      await exportToExcel(exportData, 'data-export.xlsx');
      break;
  }
};
```

## Styling & Theming

The ViewManager uses Tailwind CSS classes and follows the shadcn/ui design system. You can customize the appearance using CSS variables:

```css
:root {
  --view-manager-border: theme('colors.border');
  --view-manager-bg: theme('colors.background');
  --view-manager-text: theme('colors.foreground');
}
```

## Performance Considerations

### Data Virtualization
For large datasets (>1000 items), consider implementing virtualization:

```typescript
const virtualizedData = useMemo(() => {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return processedData.slice(startIndex, endIndex);
}, [processedData, currentPage, pageSize]);
```

### Memoization
Use React.memo and useMemo for expensive operations:

```typescript
const MemoizedViewManager = React.memo(ViewManager);

const processedColumns = useMemo(() => {
  return columns.map(col => ({
    ...col,
    render: col.render || defaultRenderer
  }));
}, [columns]);
```

## Best Practices

### 1. Column Configuration
- Always provide unique `id` values for columns
- Use descriptive `label` values for better UX
- Implement custom `render` functions for complex data types
- Set appropriate `type` values for proper filtering

### 2. Performance
- Limit the number of visible columns (max 10-12)
- Use pagination for large datasets
- Implement debounced search functionality
- Memoize expensive computations

### 3. User Experience
- Provide meaningful loading and error states
- Use consistent icons and terminology
- Implement proper confirmation dialogs for destructive actions
- Maintain selection state across view changes

### 4. Accessibility
- Ensure proper ARIA labels for interactive elements
- Support keyboard navigation
- Use semantic HTML elements
- Provide screen reader friendly content

## Integration Examples

### With React Query
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['users', { page, filters, sortBy, sortOrder }],
  queryFn: () => fetchUsers({ page, filters, sortBy, sortOrder })
});

<ViewManager
  data={data?.items || []}
  loading={isLoading}
  error={error?.message}
  // ... other props
/>
```

### With Form Libraries
```typescript
const form = useForm<FilterFormData>();

const handleFilterSubmit = (data: FilterFormData) => {
  setFilters(data);
};

<ViewManager
  filters={form.watch()}
  onFiltersChange={(filters) => form.reset(filters)}
  // ... other props
/>
```

## Troubleshooting

### Common Issues

1. **Selection not working**: Ensure `selectedItems` and `onSelectionChange` are properly connected
2. **Sorting not working**: Check that `sortBy`, `sortOrder`, and `onSortChange` are implemented
3. **Filters not applying**: Verify filter logic in data processing pipeline
4. **Performance issues**: Implement pagination and virtualization for large datasets
5. **TypeScript errors**: Ensure proper typing for generic data types

### Debug Mode
Enable debug logging by setting the environment variable:
```bash
DEBUG=view-manager npm run dev
```

## Migration Guide

### From v1.x to v2.x
- Update import paths from `@/components/DataTable` to `@/shared/components/views/ViewManager`
- Replace `columns` prop structure with new `Column<T>` interface
- Update event handlers to use new callback signatures
- Add required `views` and `activeView` props

## Contributing

When contributing to the ViewManager component:

1. Follow the existing code style and patterns
2. Add comprehensive TypeScript types
3. Include proper documentation for new features
4. Write unit tests for new functionality
5. Update this documentation for any API changes

## Support

For questions or issues with the ViewManager component:
- Check the troubleshooting section above
- Review the example implementations
- Open an issue in the project repository
- Consult the team documentation

---

*Last updated: October 2025*
*Component version: 2.0.0*