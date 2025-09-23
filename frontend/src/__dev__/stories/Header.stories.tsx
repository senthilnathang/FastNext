import type { Meta, StoryObj } from '@storybook/nextjs'
import Header from '@/shared/components/layout/Header'
// Mock function helper
const fn = () => () => {}

// Define the component props interface explicitly
interface HeaderProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

// Mock next/navigation
const mockRouter = {
  push: fn(),
  replace: fn(),
  prefetch: fn(),
  back: fn(),
  forward: fn(),
  refresh: fn()
}

const meta: Meta<HeaderProps> = {
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
  argTypes: {
    sidebarCollapsed: {
      control: 'boolean',
      description: 'Whether the sidebar is collapsed'
    },
    onToggleSidebar: {
      action: 'toggle-sidebar',
      description: 'Callback to toggle sidebar'
    }
  },
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
  args: {
    sidebarCollapsed: undefined,
    onToggleSidebar: undefined
  },
  parameters: {
    docs: {
      description: {
        story: 'Default header with search bar, action buttons, user profile, and breadcrumbs.'
      }
    }
  }
}

export const DarkMode: Story = {
  args: {
    sidebarCollapsed: undefined,
    onToggleSidebar: undefined
  },
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
  args: {
    sidebarCollapsed: undefined,
    onToggleSidebar: undefined
  },
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
  args: {
    sidebarCollapsed: undefined,
    onToggleSidebar: undefined
  },
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

export const WithSidebarToggle: Story = {
  args: {
    sidebarCollapsed: false,
    onToggleSidebar: fn()
  },
  parameters: {
    docs: {
      description: {
        story: 'Header with sidebar toggle functionality enabled.'
      }
    }
  }
}
