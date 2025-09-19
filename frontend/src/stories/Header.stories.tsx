import type { Meta, StoryObj } from '@storybook/react'
import Header from '../components/layout/Header'
import { fn } from '@storybook/test'

// Mock next/navigation
const mockRouter = {
  push: fn(),
  replace: fn(),
  prefetch: fn(),
  back: fn(),
  forward: fn(),
  refresh: fn()
}

const meta: Meta<typeof Header> = {
  title: 'Layout/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      navigation: {
        pathname: '/dashboard/projects',
        query: {},
      },
      router: mockRouter
    }
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '200px' }}>
        <Story />
      </div>
    )
  ]
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default header with search bar, action buttons, user profile, and breadcrumbs.'
      }
    }
  }
}

export const DarkMode: Story = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1f2937' }
      ]
    },
    docs: {
      description: {
        story: 'Header in dark mode theme.'
      }
    }
  },
  decorators: [
    (Story) => (
      <div className="dark" style={{ minHeight: '200px' }}>
        <Story />
      </div>
    )
  ]
}

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Header on mobile viewport (responsive design).'
      }
    }
  }
}

export const TabletView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    },
    docs: {
      description: {
        story: 'Header on tablet viewport.'
      }
    }
  }
}
