import { ScaffoldGenerator, type ModelDefinition } from '../src/shared/utils/scaffold-generator';

// Define a sample Product model for testing
const productModel: ModelDefinition = {
  name: 'Product',
  pluralName: 'Products',
  description: 'Manage products in your inventory system',
  tableName: 'products',
  icon: 'Package',
  module: 'inventory',
  hasTimestamps: true,
  hasStatus: true,
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
    {
      name: 'description',
      type: 'text',
      required: false,
      label: 'Description',
      placeholder: 'Enter product description...',
      displayInList: false,
      searchable: true
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      label: 'Price ($)',
      validation: {
        min: 0
      },
      displayInList: true,
      sortable: true,
      filterType: 'text'
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      label: 'Category',
      options: ['Electronics', 'Clothing', 'Books', 'Sports', 'Home & Garden'],
      displayInList: true,
      filterType: 'select'
    },
    {
      name: 'tags',
      type: 'multiselect',
      required: false,
      label: 'Tags',
      options: ['New', 'Sale', 'Popular', 'Limited', 'Featured'],
      displayInList: true
    },
    {
      name: 'is_featured',
      type: 'boolean',
      required: false,
      label: 'Featured Product',
      displayInList: true,
      filterType: 'boolean'
    },
    {
      name: 'website_url',
      type: 'url',
      required: false,
      label: 'Product Website',
      displayInList: false
    },
    {
      name: 'release_date',
      type: 'date',
      required: false,
      label: 'Release Date',
      displayInList: true,
      sortable: true,
      filterType: 'date'
    }
  ]
};

// Test the scaffold generator
console.log('🚀 Testing frontend scaffolding system...');

try {
  const generator = new ScaffoldGenerator(productModel);
  generator.generateAll();
  console.log('✅ Frontend scaffolding test completed successfully!');
} catch (error) {
  console.error('❌ Frontend scaffolding test failed:', error);
  console.error(error.stack);
}