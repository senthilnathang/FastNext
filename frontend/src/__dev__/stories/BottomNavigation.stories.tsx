import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'
import {
  Home,
  Users,
  Settings,
  Bell,
  Search,
  Heart,
  MessageCircle,
  ShoppingCart,
  BookOpen,
  Calendar,
  FileText,
  Camera
} from 'lucide-react'
import { BottomNavigation, useBottomNavigation } from '@/shared/components'

const meta: Meta<typeof BottomNavigation> = {
  title: 'Mobile/BottomNavigation',
  component: BottomNavigation,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A modern bottom navigation component for mobile devices with badge support and overflow handling.'
      }
    }
  },
  argTypes: {
    showLabels: {
      control: 'boolean',
      description: 'Show text labels below icons'
    },
    maxVisibleItems: {
      control: { type: 'number', min: 3, max: 6 },
      description: 'Maximum number of visible items before overflow'
    },
    hideOnScroll: {
      control: 'boolean',
      description: 'Hide navigation when scrolling down'
    }
  }
}

export default meta
type Story = StoryObj<typeof BottomNavigation>

const basicItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'notifications', label: 'Notifications', icon: Bell, badge: 3 },
  { id: 'settings', label: 'Settings', icon: Settings }
]

const extendedItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'users', label: 'Users', icon: Users, badge: 12 },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'notifications', label: 'Notifications', icon: Bell, badge: 99 },
  { id: 'favorites', label: 'Favorites', icon: Heart, badge: 5 },
  { id: 'messages', label: 'Messages', icon: MessageCircle, badge: 2 },
  { id: 'settings', label: 'Settings', icon: Settings }
]

const shoppingItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: 3 },
  { id: 'favorites', label: 'Favorites', icon: Heart, badge: '♥' },
  { id: 'profile', label: 'Profile', icon: Users }
]

const NavigationStory = ({ items, ...props }: any) => {
  const { activeItem, handleItemClick } = useBottomNavigation(items)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Bottom Navigation Demo
        </h1>
        <div className="text-gray-600 dark:text-gray-400 space-y-2">
          <p>Active item: <strong>{activeItem}</strong></p>
          <p>This demo shows the bottom navigation component.</p>
          <p>Try tapping different navigation items to see the active state change.</p>
          {items.length > 5 && (
            <p className="text-blue-600 dark:text-blue-400">
              This example has overflow items - tap &quot;More&quot; to see additional options.
            </p>
          )}
        </div>

        {/* Dummy content to demonstrate scroll behavior */}
        <div className="mt-8 space-y-4">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Content Item {i + 1}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This is some dummy content to demonstrate scrolling behavior.
                When hideOnScroll is enabled, the bottom navigation will hide when scrolling down.
              </p>
            </div>
          ))}
        </div>
      </div>

      <BottomNavigation
        {...props}
        items={items}
        activeItem={activeItem}
        onItemClick={handleItemClick}
      />
    </div>
  )
}

export const Default: Story = {
  render: (args) => <NavigationStory {...args} items={basicItems} />,
  args: {
    showLabels: true,
    maxVisibleItems: 5,
    hideOnScroll: true
  }
}

export const WithBadges: Story = {
  render: (args) => <NavigationStory {...args} items={shoppingItems} />,
  args: {
    showLabels: true,
    maxVisibleItems: 5,
    hideOnScroll: false
  }
}

export const WithOverflow: Story = {
  render: (args) => <NavigationStory {...args} items={extendedItems} />,
  args: {
    showLabels: true,
    maxVisibleItems: 4,
    hideOnScroll: true
  }
}

export const NoLabels: Story = {
  render: (args) => <NavigationStory {...args} items={basicItems} />,
  args: {
    showLabels: false,
    maxVisibleItems: 5,
    hideOnScroll: false
  }
}

export const CompactOverflow: Story = {
  render: (args) => <NavigationStory {...args} items={extendedItems} />,
  args: {
    showLabels: true,
    maxVisibleItems: 3,
    hideOnScroll: false
  }
}

export const ManyItems: Story = {
  render: (args) => {
    const manyItems = [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'users', label: 'Users', icon: Users, badge: 15 },
      { id: 'search', label: 'Search', icon: Search },
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: 99 },
      { id: 'favorites', label: 'Favorites', icon: Heart, badge: 7 },
      { id: 'messages', label: 'Messages', icon: MessageCircle, badge: 'new' },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'docs', label: 'Documents', icon: FileText, badge: 3 },
      { id: 'books', label: 'Library', icon: BookOpen },
      { id: 'camera', label: 'Camera', icon: Camera },
      { id: 'settings', label: 'Settings', icon: Settings }
    ]

    return <NavigationStory {...args} items={manyItems} />
  },
  args: {
    showLabels: true,
    maxVisibleItems: 4,
    hideOnScroll: true
  }
}

export const Interactive: Story = {
  render: () => {
    const [items, setItems] = useState(basicItems)
    const [showLabels, setShowLabels] = useState(true)
    const [maxVisible, setMaxVisible] = useState(4)
    const { activeItem, handleItemClick } = useBottomNavigation(items)

    const addBadge = (itemId: string) => {
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, badge: (item.badge || 0) + 1 }
          : item
      ))
    }

    const clearBadge = (itemId: string) => {
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, badge: undefined }
          : item
      ))
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Interactive Bottom Navigation
          </h1>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Controls</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                >
                  {showLabels ? 'Hide' : 'Show'} Labels
                </button>
                <button
                  onClick={() => setMaxVisible(Math.max(3, maxVisible - 1))}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                >
                  Fewer Items ({maxVisible - 1})
                </button>
                <button
                  onClick={() => setMaxVisible(Math.min(6, maxVisible + 1))}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                >
                  More Items ({maxVisible + 1})
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Badge Controls</h3>
              <div className="flex flex-wrap gap-2">
                {items.map(item => (
                  <div key={item.id} className="flex gap-1">
                    <button
                      onClick={() => addBadge(item.id)}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                    >
                      +{item.label}
                    </button>
                    <button
                      onClick={() => clearBadge(item.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                    >
                      Clear
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-gray-600 dark:text-gray-400">
              <p>Active: <strong>{activeItem}</strong></p>
              <p>Visible items: <strong>{maxVisible}</strong></p>
              <p>Show labels: <strong>{showLabels ? 'Yes' : 'No'}</strong></p>
            </div>
          </div>
        </div>

        <BottomNavigation
          items={items}
          activeItem={activeItem}
          onItemClick={handleItemClick}
          showLabels={showLabels}
          maxVisibleItems={maxVisible}
        />
      </div>
    )
  }
}
