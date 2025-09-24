# DataTable Component

A comprehensive, feature-rich data table component built with React, TypeScript, and TanStack Table. Inspired by the Task-List-Demo repository patterns and optimized for FastNext Framework.

## Features

- ✅ **Pagination** - Flexible pagination with customizable page sizes
- ✅ **Sorting** - Multi-column sorting with visual indicators
- ✅ **Filtering** - Global search and advanced column filtering
- ✅ **Row Selection** - Single and multi-row selection with bulk actions
- ✅ **Column Visibility** - Show/hide columns dynamically
- ✅ **Export** - Export to CSV, Excel, and JSON formats
- ✅ **Actions** - Row-level and bulk actions (edit, delete, etc.)
- ✅ **Responsive Design** - Mobile-friendly with responsive controls
- ✅ **Loading States** - Skeleton loading and optimistic UI
- ✅ **Customizable** - Highly configurable with TypeScript support

## Installation

The component is already included in the FastNext Framework. Import it from:

```tsx
import { DataTable } from '@/shared/components/data-table'
```

## Basic Usage

```tsx
import { DataTable } from '@/shared/components/data-table'
import { ColumnDef } from '@tanstack/react-table'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
        {row.original.status}
      </Badge>
    ),
  },
]

export function UsersTable({ users }: { users: User[] }) {
  return (
    <DataTable
      columns={columns}
      data={users}
      enableRowSelection
      enableSorting
      enableFiltering
      onAdd={() => console.log('Add user')}
    />
  )
}
```

## Advanced Example

```tsx
import { DataTable } from '@/shared/components/data-table'
import { useDataTableExport } from '@/shared/components/data-table/hooks/useDataTableExport'

export function AdvancedUsersTable() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  const { exportData } = useDataTableExport({
    data: users,
    columns: [
      { id: 'name', label: 'Name', accessor: 'name' },
      { id: 'email', label: 'Email', accessor: 'email' },
    ],
    selectedRows: selectedUsers,
  })

  const handleDeleteSelected = async (users: User[]) => {
    // Perform delete operation
    await deleteUsers(users.map(u => u.id))
    // Refresh data
    fetchUsers()
  }

  const handleExport = () => {
    exportData({
      format: 'csv',
      filename: 'users-export.csv',
      selectedOnly: selectedUsers.length > 0,
    })
  }

  return (
    <DataTable
      columns={columns}
      data={users}
      searchableColumns={['name', 'email']}
      enableRowSelection={true}
      enableSorting={true}
      enableFiltering={true}
      enableColumnVisibility={true}
      onRowSelectionChange={setSelectedUsers}
      onDeleteSelected={handleDeleteSelected}
      onExport={handleExport}
      onAdd={() => setShowAddModal(true)}
      pageSize={20}
      emptyMessage="No users found."
      columnDefinitions={[
        { id: 'name', label: 'Name' },
        { id: 'email', label: 'Email' },
        { id: 'role', label: 'Role' },
        { id: 'status', label: 'Status' },
        { id: 'actions', label: 'Actions', canHide: false },
      ]}
    />
  )
}
```

## Props

### DataTable Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnDef<TData, TValue>[]` | - | Required. TanStack Table column definitions |
| `data` | `TData[]` | - | Required. Array of data objects |
| `searchableColumns` | `string[]` | `[]` | Columns that can be searched globally |
| `enableRowSelection` | `boolean` | `true` | Enable row selection checkboxes |
| `enableSorting` | `boolean` | `true` | Enable column sorting |
| `enableFiltering` | `boolean` | `true` | Enable filtering and search |
| `enableColumnVisibility` | `boolean` | `true` | Enable column show/hide controls |
| `onRowSelectionChange` | `(rows: TData[]) => void` | - | Callback when row selection changes |
| `onDeleteSelected` | `(rows: TData[]) => void` | - | Callback for bulk delete action |
| `onExport` | `(data: TData[]) => void` | - | Callback for export action |
| `onAdd` | `() => void` | - | Callback for add new item action |
| `pageSize` | `number` | `10` | Default page size |
| `isLoading` | `boolean` | `false` | Show loading state |
| `emptyMessage` | `string` | `"No results."` | Message when no data |
| `columnDefinitions` | `ColumnDefinition[]` | - | Column definitions for visibility control |

### Column Definition

```tsx
interface ColumnDefinition {
  id: string
  label: string
  canHide?: boolean
}
```

### Export Options

```tsx
interface ExportOptions {
  format: 'csv' | 'excel' | 'json'
  filename?: string
  selectedOnly?: boolean
  visibleColumnsOnly?: boolean
}
```

## Styling

The component uses Tailwind CSS classes and follows the shadcn/ui design system. You can customize the appearance by:

1. **Theme Variables** - Modify CSS custom properties for colors
2. **Class Overrides** - Pass custom `className` props
3. **Component Variants** - Use different button/badge variants

## Column Configuration

### Basic Column

```tsx
{
  accessorKey: 'name',
  header: 'Full Name',
}
```

### Sortable Column

```tsx
{
  accessorKey: 'createdAt',
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting()}
    >
      Created Date
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => {
    return new Date(row.getValue('createdAt')).toLocaleDateString()
  },
}
```

### Custom Cell Rendering

```tsx
{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => {
    const status = row.getValue('status') as string
    return (
      <Badge variant={status === 'active' ? 'default' : 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  },
}
```

### Actions Column

```tsx
{
  id: 'actions',
  enableHiding: false,
  cell: ({ row }) => {
    const item = row.original
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(item)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
}
```

## Export Functionality

The `useDataTableExport` hook provides export functionality:

```tsx
const { exportData, exportToCSV, exportToJSON, exportToExcel } = useDataTableExport({
  data: users,
  columns: exportColumns,
  selectedRows: selectedUsers,
})

// Export all data as CSV
exportData({
  format: 'csv',
  filename: 'users.csv'
})

// Export selected rows only
exportData({
  format: 'json',
  filename: 'selected-users.json',
  selectedOnly: true
})
```

## Best Practices

1. **Performance** - Use `useMemo` for expensive column calculations
2. **Accessibility** - Provide meaningful `aria-label` attributes
3. **Loading States** - Always handle loading and empty states
4. **Error Handling** - Implement proper error boundaries
5. **Responsive Design** - Test on mobile devices
6. **Type Safety** - Define proper TypeScript interfaces

## Examples

See the complete examples in:
- `/src/shared/components/data-table/examples/UserDataTable.tsx`
- `/src/app/(dashboard)/data-tables/page.tsx`

## Integration with Your Models

To use the DataTable with your existing models:

1. **Define your data interface**
2. **Create column definitions**
3. **Implement CRUD operations**
4. **Handle loading and error states**
5. **Add custom filters if needed**

The component is designed to work with any data structure and can be easily adapted to your specific needs.