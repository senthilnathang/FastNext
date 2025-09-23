import type { Meta, StoryObj } from '@storybook/nextjs'
import Sidebar from '@/shared/components/navigation/Sidebar'
import { AuthContext } from '@/modules/auth/services/AuthContext'
// Mock function helper
const fn = () => () => {}

const mockAuthContextValue = {
  user: {
    id: 1,
    email: 'admin@example.com',
    username: 'admin',
    full_name: 'Admin User',
    is_active: true,
    is_verified: true,
    created_at: '2023-01-01T00:00:00Z',
    roles: ['admin']
  },
  isLoading: false,
  isAuthenticated: true,
  login: fn(),
  logout: fn(),
  refreshToken: fn(),
  updateUser: fn()
}

const mockRegularUserContextValue = {
  user: {
    id: 2,
    email: 'user@example.com',
    username: 'user',
    full_name: 'Regular User',
    is_active: true,
    is_verified: true,
    created_at: '2023-01-01T00:00:00Z',
    roles: ['projects.read', 'builder.read']
  },
  isLoading: false,
  isAuthenticated: true,
  login: fn(),
  logout: fn(),
  refreshToken: fn(),
  updateUser: fn()
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

const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      navigation: {
        pathname: '/dashboard',
        query: {},
      },
      router: mockRouter
    }
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the sidebar'
    }
  },
  decorators: [
    (Story, context) => {
      const authValue = context.parameters.authContext || mockAuthContextValue
      return (
        <AuthContext.Provider value={authValue}>
          <div style={{ height: '100vh', display: 'flex' }}>
            <Story />
          </div>
        </AuthContext.Provider>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof meta>

export const AdminUser: Story = {
  args: {},
  parameters: {
    authContext: mockAuthContextValue,
    docs: {
      description: {
        story: 'Sidebar as seen by an admin user with full access to all modules.'
      }
    }
  }
}

export const RegularUser: Story = {
  args: {},
  parameters: {
    authContext: mockRegularUserContextValue,
    docs: {
      description: {
        story: 'Sidebar as seen by a regular user with limited module access.'
      }
    }
  }
}

export const CustomClassName: Story = {
  args: {
    className: 'border-2 border-red-500'
  },
  parameters: {
    docs: {
      description: {
        story: 'Sidebar with custom CSS classes applied.'
      }
    }
  }
}

export const CollapsedMenus: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default state with all nested menus collapsed.'
      }
    }
  },
  play: async () => {
    // The sidebar starts with all menus collapsed by default
    // This story shows the initial state
  }
}