# Frontend Documentation

This directory contains comprehensive documentation for the FastNext Framework frontend components and architecture.

## 📚 Documentation Index

### 🎯 **Core Architecture**
- [Frontend Architecture](./scaffolding-usage.md) - Main architecture and scaffolding
- [Component System](./component-system.md) - Component organization and patterns

### 🧩 **Components**

#### **Advanced Components**
- [**ViewManager**](./ViewManager.md) - Universal data visualization with multiple view types
  - Multi-view support (List, Card, Kanban, Gantt, Cohort)
  - Advanced filtering, sorting, and grouping
  - Selection management and bulk operations
  - Export/Import functionality
  - Column management with drag-and-drop

#### **UI Components**
- [SortControl](./ViewManager.md#sort--group-options) - Advanced sorting interface
- [GroupControl](./ViewManager.md#sort--group-options) - Data grouping interface
- [DataExport](../src/shared/components/DataExport/README.md) - Data export utilities
- [DataImport](../src/shared/components/DataImport/README.md) - Data import utilities

### 🔧 **Development Guides**
- [Component Development](./component-development.md) - Creating new components
- [TypeScript Guidelines](./typescript-guidelines.md) - Type safety best practices
- [Testing Components](./testing-guidelines.md) - Testing strategies
- [Performance Optimization](./performance.md) - Performance best practices

### 🎨 **Design System**
- [Theming Guide](./theming.md) - Theme customization
- [Design Tokens](./design-tokens.md) - Design system tokens
- [Accessibility](./accessibility.md) - Accessibility guidelines

## 🚀 **Quick Start**

### ViewManager Component

The ViewManager is the most powerful component in the FastNext framework, providing enterprise-grade data visualization:

```typescript
import { ViewManager } from '@/shared/components/views';

<ViewManager
  title="My Data"
  data={items}
  columns={columns}
  views={availableViews}
  activeView={currentView}
  onViewChange={setCurrentView}
  // ... additional props
/>
```

**Key Features:**
- ✅ **5 View Types**: List, Card, Kanban, Gantt, Cohort
- ✅ **Advanced Filtering**: Column-specific filters with custom options
- ✅ **Smart Sorting**: Multi-column sorting with visual indicators
- ✅ **Data Grouping**: Organize data by any field
- ✅ **Selection Management**: Individual and bulk selection
- ✅ **Export/Import**: CSV, JSON, Excel support
- ✅ **Column Management**: Drag-and-drop reordering, show/hide
- ✅ **Responsive Design**: Mobile-friendly layouts
- ✅ **TypeScript**: Full type safety

### Component Architecture

```
src/shared/components/
├── views/
│   ├── ViewManager.tsx          # Main universal component
│   ├── GenericListView.tsx      # Legacy list component
│   ├── GenericKanbanView.tsx    # Legacy kanban component
│   └── index.ts                 # Exports
├── ui/
│   ├── sort-control.tsx         # Sorting interface
│   ├── group-control.tsx        # Grouping interface
│   └── ...                      # Other UI components
└── data-visualization/
    ├── enhanced-data-table.tsx  # Enhanced table
    ├── kanban-board.tsx         # Kanban implementation
    └── ...                      # Other visualizations
```

## 📋 **Implementation Examples**

### Projects Page Implementation

```typescript
// Complete implementation in: src/app/projects/page.tsx
<ViewManager
  title="Projects"
  subtitle="Manage your projects and applications"
  data={projects}
  columns={projectColumns}
  views={projectViews}
  activeView={activeView}
  onViewChange={setActiveView}
  sortOptions={projectSortOptions}
  groupOptions={projectGroupOptions}
  selectedItems={selectedItems}
  onSelectionChange={setSelectedItems}
  selectable={true}
  bulkActions={bulkActions}
  onCreateClick={() => setCreateDialogOpen(true)}
  onEditClick={handleEditProject}
  onDeleteClick={handleDeleteProject}
  onExport={handleExport}
  onImport={handleImport}
/>
```

### Custom Column Configuration

```typescript
const columns: Column<Project>[] = [
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
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">
            {project.description || 'No description'}
          </div>
        </div>
      </div>
    )
  },
  // ... more columns
];
```

## 🛠️ **Development Workflow**

### Adding New View Types

1. Define the view type in `ViewManager.tsx`
2. Implement the render function
3. Add view configuration options
4. Update TypeScript types
5. Add documentation

### Extending Components

1. Follow the established patterns
2. Use TypeScript for type safety
3. Implement proper error handling
4. Add comprehensive tests
5. Update documentation

## 📖 **Additional Resources**

- [API Reference](./api-reference.md) - Complete API documentation
- [Migration Guide](./migration-guide.md) - Upgrading between versions
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Contributing](./contributing.md) - How to contribute to components

## 🔗 **Related Documentation**

- [Backend API Documentation](../../backend/docs/)
- [Database Schema](../../backend/docs/DEVELOPMENT.md)
- [Security Guidelines](../../backend/docs/SECURITY.md)
- [Docker Setup](../../README.md#docker-deployment)

---

*This documentation is continuously updated as the framework evolves.*