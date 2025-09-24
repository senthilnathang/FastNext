# Frontend Scaffolding System Usage Guide

The Frontend Scaffolding System is a comprehensive code generation tool that automatically creates complete CRUD interfaces for new models, including TypeScript interfaces, React components, API services, and routing.

## Quick Start

### Basic Usage

```typescript
import { ScaffoldGenerator, ModelDefinition } from '@/shared/utils/scaffold-generator';

// Define your model
const productModel: ModelDefinition = {
  name: 'Product',
  pluralName: 'Products', // Optional, defaults to name + 's'
  description: 'Manage products in your inventory system',
  tableName: 'products', // Optional, auto-generated from pluralName
  icon: 'Package', // Lucide React icon name
  module: 'inventory', // Optional, for grouping and permissions
  hasTimestamps: true, // Adds created_at/updated_at fields
  hasStatus: true, // Adds is_active boolean field
  fields: [
    {
      name: 'name',
      type: 'string',
      required: true,
      label: 'Product Name',
      placeholder: 'Enter product name...',
      validation: {
        min: 2,
        message: 'Product name must be at least 2 characters'
      },
      displayInList: true,
      searchable: true,
      sortable: true
    },
    // ... more fields
  ]
};

// Generate all scaffolding
const generator = new ScaffoldGenerator(productModel);
generator.generateAll();
```

## Field Types

The scaffolding system supports multiple field types with different rendering and validation:

### String Fields
```typescript
{
  name: 'name',
  type: 'string',
  required: true,
  label: 'Product Name',
  placeholder: 'Enter product name...',
  validation: {
    min: 2,
    max: 100,
    pattern: '^[A-Za-z\\s]+$',
    message: 'Only letters and spaces allowed'
  },
  displayInList: true,
  searchable: true,
  sortable: true
}
```

### Number Fields
```typescript
{
  name: 'price',
  type: 'number',
  required: true,
  label: 'Price ($)',
  validation: {
    min: 0,
    max: 99999
  },
  displayInList: true,
  sortable: true,
  filterType: 'text'
}
```

### Boolean Fields
```typescript
{
  name: 'is_featured',
  type: 'boolean',
  required: false,
  label: 'Featured Product',
  displayInList: true,
  filterType: 'boolean'
}
```

### Text Fields (Multi-line)
```typescript
{
  name: 'description',
  type: 'text',
  required: false,
  label: 'Description',
  placeholder: 'Enter detailed description...',
  displayInList: false,
  searchable: true
}
```

### Date Fields
```typescript
{
  name: 'release_date',
  type: 'date',
  required: false,
  label: 'Release Date',
  displayInList: true,
  sortable: true,
  filterType: 'date'
}
```

### Email Fields
```typescript
{
  name: 'contact_email',
  type: 'email',
  required: false,
  label: 'Contact Email',
  displayInList: false
}
```

### URL Fields
```typescript
{
  name: 'website_url',
  type: 'url',
  required: false,
  label: 'Product Website',
  displayInList: false
}
```

### Select Fields (Dropdown)
```typescript
{
  name: 'category',
  type: 'select',
  required: true,
  label: 'Category',
  options: ['Electronics', 'Clothing', 'Books', 'Sports', 'Home & Garden'],
  displayInList: true,
  filterType: 'select'
}
```

### Multi-Select Fields (Checkboxes)
```typescript
{
  name: 'tags',
  type: 'multiselect',
  required: false,
  label: 'Tags',
  options: ['New', 'Sale', 'Popular', 'Limited', 'Featured'],
  displayInList: true
}
```

## Field Options

### Display Options
- `displayInList`: Show field in DataTable (default: true)
- `searchable`: Allow searching by this field (default: false)
- `sortable`: Allow sorting by this field (default: true for most types)
- `filterType`: Enable filtering - options: 'text', 'select', 'date', 'boolean'

### Validation Options
- `required`: Field is required (default: false)
- `validation.min`: Minimum value/length
- `validation.max`: Maximum value/length
- `validation.pattern`: Regex pattern for validation
- `validation.message`: Custom validation error message

### UI Options
- `label`: Display label (default: capitalized field name)
- `placeholder`: Input placeholder text
- `options`: Array of options for select/multiselect fields

## Generated Files

The scaffolding system generates the following files:

### 1. API Types and Services
**Location**: `src/shared/services/api/{model}.ts`
- TypeScript interfaces for the model
- CRUD API functions with proper typing
- Request/Response type definitions
- Query parameter interfaces

### 2. React Query Hooks
**Location**: `src/modules/{model}/hooks/use{Models}.ts`
- Query hooks for fetching data
- Mutation hooks for CRUD operations
- Proper cache invalidation
- Loading and error states

### 3. DataTable Component
**Location**: `src/shared/components/data-table/examples/{Models}DataTable.tsx`
- Advanced data table with sorting, filtering, pagination
- Custom column renderers based on field types
- Bulk operations support
- Export functionality

### 4. Form Components
**Location**: `src/modules/{model}/components/{Model}Form.tsx`
- Main form component with validation
- Create and Edit dialog components
- Field-specific input components
- Form state management with react-hook-form

### 5. Page Components
**Location**: `src/app/{models}/`
- List page: `page.tsx` - Main listing with search and filters
- Create page: `create/page.tsx` - New item creation
- Edit page: `[id]/edit/page.tsx` - Edit existing items
- View page: `[id]/page.tsx` - Read-only detail view

### 6. Navigation Menu
**Location**: `src/shared/components/navigation/menuConfig.ts`
- Automatically adds menu item for the new model
- Handles icon imports
- Supports module-based permissions

## Advanced Configuration

### Module-based Organization
```typescript
const model: ModelDefinition = {
  name: 'Product',
  module: 'inventory', // Groups under inventory module
  // ... rest of config
};
```

### Custom Table Names
```typescript
const model: ModelDefinition = {
  name: 'Product',
  tableName: 'inventory_products', // Custom database table name
  // ... rest of config
};
```

### Relationships (Future Enhancement)
```typescript
const model: ModelDefinition = {
  name: 'Product',
  relationships: {
    belongsTo: ['Category', 'Supplier'],
    hasMany: ['OrderItem', 'Review']
  },
  // ... rest of config
};
```

## Best Practices

### 1. Field Naming
- Use descriptive, clear field names
- Follow camelCase convention
- Avoid reserved keywords

### 2. Display Configuration
- Set `displayInList: false` for large text fields
- Enable `searchable: true` for commonly searched fields
- Use appropriate `filterType` for better UX

### 3. Validation
- Always validate required fields
- Set appropriate min/max constraints
- Provide clear validation messages

### 4. Icons
- Use appropriate Lucide React icons
- Ensure icons are imported in menuConfig.ts
- Choose icons that represent your model clearly

## Example: Complete Blog Post Model

```typescript
const blogPostModel: ModelDefinition = {
  name: 'BlogPost',
  pluralName: 'BlogPosts',
  description: 'Manage blog posts and articles',
  tableName: 'blog_posts',
  icon: 'FileText',
  module: 'content',
  hasTimestamps: true,
  hasStatus: true,
  fields: [
    {
      name: 'title',
      type: 'string',
      required: true,
      label: 'Post Title',
      validation: { min: 5, max: 200 },
      displayInList: true,
      searchable: true,
      sortable: true
    },
    {
      name: 'slug',
      type: 'string',
      required: true,
      label: 'URL Slug',
      validation: { 
        pattern: '^[a-z0-9-]+$',
        message: 'Only lowercase letters, numbers, and hyphens'
      },
      displayInList: false
    },
    {
      name: 'excerpt',
      type: 'text',
      required: false,
      label: 'Excerpt',
      displayInList: true,
      searchable: true
    },
    {
      name: 'content',
      type: 'text',
      required: true,
      label: 'Content',
      displayInList: false
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      label: 'Status',
      options: ['draft', 'published', 'archived'],
      displayInList: true,
      filterType: 'select'
    },
    {
      name: 'tags',
      type: 'multiselect',
      required: false,
      label: 'Tags',
      options: ['Technology', 'Design', 'Business', 'Tutorial', 'News'],
      displayInList: true
    },
    {
      name: 'is_featured',
      type: 'boolean',
      required: false,
      label: 'Featured Post',
      displayInList: true,
      filterType: 'boolean'
    },
    {
      name: 'publish_date',
      type: 'date',
      required: false,
      label: 'Publish Date',
      displayInList: true,
      sortable: true,
      filterType: 'date'
    }
  ]
};
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all generated files have correct import paths
2. **Type Errors**: Verify field types match expected data structure
3. **Icon Not Found**: Check if the icon is imported in menuConfig.ts
4. **Build Errors**: Run `npm run build` to check for TypeScript errors

### Manual Adjustments

After generation, you may need to:
- Adjust import paths if they don't match your project structure
- Modify API endpoints to match your backend
- Customize styling and layout
- Add additional validation logic
- Implement actual backend integration

## Next Steps

1. Generate your model scaffolding
2. Update API endpoints to match your backend
3. Test all CRUD operations
4. Customize styling as needed
5. Add any additional business logic
6. Deploy and monitor performance

The scaffolding system provides a solid foundation, but you'll likely want to customize the generated code to fit your specific requirements.