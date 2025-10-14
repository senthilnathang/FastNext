import type { Meta, StoryObj } from '@storybook/nextjs'
import { Input } from './input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'file'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    required: {
      control: { type: 'boolean' },
    },
    readOnly: {
      control: { type: 'boolean' },
    },
    error: {
      control: { type: 'boolean' },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithValue: Story = {
  args: {
    defaultValue: 'Default value',
    placeholder: 'Enter text...',
  },
}

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email...',
  },
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter your password...',
  },
}

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter a number...',
  },
}

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
}

export const ReadOnly: Story = {
  args: {
    value: 'Read only value',
    readOnly: true,
  },
}

export const Required: Story = {
  args: {
    placeholder: 'Required field',
    required: true,
  },
}

export const WithError: Story = {
  args: {
    placeholder: 'Input with error',
    error: true,
    className: 'border-red-500 focus-visible:ring-red-500',
  },
}

export const File: Story = {
  args: {
    type: 'file',
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="w-full max-w-sm space-y-2">
      <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Email
      </label>
      <Input type="email" id="email" placeholder="Enter your email" />
    </div>
  ),
}

export const FormExample: Story = {
  render: () => (
    <div className="w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Full Name
        </label>
        <Input id="name" placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input id="email" type="email" placeholder="john@example.com" />
      </div>
      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone
        </label>
        <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input id="password" type="password" placeholder="Enter password" />
      </div>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Small (custom)</label>
        <Input placeholder="Small input" className="h-8 px-2 text-xs" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Default</label>
        <Input placeholder="Default input" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Large (custom)</label>
        <Input placeholder="Large input" className="h-12 px-4 text-base" />
      </div>
    </div>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <div className="w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Search with icon</label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input placeholder="Search..." className="pl-10" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Email with icon</label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
          <Input type="email" placeholder="Enter email" className="pl-10" />
        </div>
      </div>
    </div>
  ),
}

export const ValidationStates: Story = {
  render: () => (
    <div className="w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Valid Input</label>
        <Input placeholder="Valid input" className="border-green-500 focus-visible:ring-green-500" />
        <p className="text-xs text-green-600">✓ Looks good!</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Invalid Input</label>
        <Input placeholder="Invalid input" className="border-red-500 focus-visible:ring-red-500" />
        <p className="text-xs text-red-600">✗ This field is required</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Warning Input</label>
        <Input placeholder="Warning input" className="border-yellow-500 focus-visible:ring-yellow-500" />
        <p className="text-xs text-yellow-600">⚠ Please check this field</p>
      </div>
    </div>
  ),
}
