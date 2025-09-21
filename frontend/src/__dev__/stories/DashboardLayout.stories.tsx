import type { Meta, StoryObj } from '@storybook/nextjs'
import DashboardLayout from '@/shared/components/DashboardLayout'
import { AuthContext } from '@/modules/auth/services/AuthContext'
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
  login: async () => {},
  logout: () => {},
  refreshToken: async () => {},
  updateUser: () => {}
}

const meta: Meta<typeof DashboardLayout> = {
  title: 'Layout/DashboardLayout',
  component: DashboardLayout,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      navigation: {
        pathname: '/dashboard',
        query: {},
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: false,
      description: 'Content to be rendered in the main area'
    }
  },
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthContextValue}>
        <div style={{ height: '100vh' }}>
          <Story />
        </div>
      </AuthContext.Provider>
    )
  ]
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            This is the main content area where dashboard content would be displayed.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Card {i}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Sample content for card {i}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete dashboard layout with sidebar, header, breadcrumbs, and main content area.'
      }
    }
  }
}

export const WithComplexContent: Story = {
  args: {
    children: (
      <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Project Analytics
            </h1>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">142</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Total Projects</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">89%</div>
                <div className="text-sm text-green-600 dark:text-green-400">Success Rate</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">24</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">In Progress</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">1.2k</div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Components</div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
              <div className="text-gray-500 dark:text-gray-400">
                Chart placeholder - Real charts would go here
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                'Project "E-commerce App" deployed successfully',
                'New component "UserProfile" added to library',
                'Permission updated for user john.doe@company.com',
                'Backup completed for all projects'
              ].map((activity, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 dark:text-gray-300">{activity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard layout with complex content including analytics cards, charts, and activity feed.'
      }
    }
  }
}

export const DarkMode: Story = {
  args: {
    children: (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Dark Mode Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            The dashboard layout properly supports dark mode theming across all components.
          </p>
        </div>
      </div>
    )
  },
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#111827' }
      ]
    },
    docs: {
      description: {
        story: 'Dashboard layout in dark mode showing proper theme support.'
      }
    }
  },
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthContextValue}>
        <div className="dark" style={{ height: '100vh' }}>
          <Story />
        </div>
      </AuthContext.Provider>
    )
  ]
}