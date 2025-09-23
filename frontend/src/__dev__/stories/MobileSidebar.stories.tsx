import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'
import { Home, Users, Settings, Bell, Search, Menu } from 'lucide-react'
import { MobileSidebar, useMobileSidebar } from '@/shared/components/navigation/MobileSidebar'
import { Button } from '@/shared/components/ui/button'

const meta: Meta<typeof MobileSidebar> = {
  title: 'Mobile/MobileSidebar',
  component: MobileSidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A mobile-first sidebar component with gesture support and smooth animations.'
      }
    }
  },
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the sidebar is open'
    },
    width: {
      control: { type: 'range', min: 200, max: 400, step: 20 },
      description: 'Width of the sidebar in pixels'
    },
    side: {
      control: { type: 'select', options: ['left', 'right'] },
      description: 'Which side the sidebar appears from'
    },
    enableSwipe: {
      control: 'boolean',
      description: 'Enable swipe gestures to open/close'
    },
    closeOnOverlayClick: {
      control: 'boolean',
      description: 'Close sidebar when clicking overlay'
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Show close button in header'
    }
  }
}

export default meta
type Story = StoryObj<typeof MobileSidebar>

// Sample navigation content
const NavigationContent = () => (
  <nav className="p-4 space-y-2">
    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <Home className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      <span className="text-gray-900 dark:text-white">Dashboard</span>
    </div>
    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      <span className="text-gray-900 dark:text-white">Users</span>
    </div>
    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      <span className="text-gray-900 dark:text-white">Notifications</span>
    </div>
    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      <span className="text-gray-900 dark:text-white">Settings</span>
    </div>
  </nav>
)

// Wrapper component for stories
const SidebarStory = ({ children, ...props }: any) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4">
        <Button onClick={() => setIsOpen(true)} className="md:hidden">
          <Menu className="h-4 w-4 mr-2" />
          Open Sidebar
        </Button>
        <div className="mt-4 text-gray-600 dark:text-gray-400">
          <p>This story demonstrates the mobile sidebar component.</p>
          <p className="mt-2">On mobile: Click the button above or swipe from the edge to open.</p>
          <p>On desktop: Use browser dev tools to simulate mobile viewport.</p>
        </div>
      </div>
      
      <MobileSidebar
        {...props}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        {children}
      </MobileSidebar>
    </div>
  )
}

export const Default: Story = {
  render: (args) => (
    <SidebarStory {...args}>
      <NavigationContent />
    </SidebarStory>
  ),
  args: {
    width: 280,
    side: 'left',
    enableSwipe: true,
    closeOnOverlayClick: true,
    showCloseButton: true
  }
}

export const RightSide: Story = {
  render: (args) => (
    <SidebarStory {...args}>
      <NavigationContent />
    </SidebarStory>
  ),
  args: {
    width: 280,
    side: 'right',
    enableSwipe: true,
    closeOnOverlayClick: true,
    showCloseButton: true
  }
}

export const WideWidth: Story = {
  render: (args) => (
    <SidebarStory {...args}>
      <NavigationContent />
    </SidebarStory>
  ),
  args: {
    width: 350,
    side: 'left',
    enableSwipe: true,
    closeOnOverlayClick: true,
    showCloseButton: true
  }
}

export const NoSwipeGestures: Story = {
  render: (args) => (
    <SidebarStory {...args}>
      <NavigationContent />
    </SidebarStory>
  ),
  args: {
    width: 280,
    side: 'left',
    enableSwipe: false,
    closeOnOverlayClick: true,
    showCloseButton: true
  }
}

export const NoCloseButton: Story = {
  render: (args) => (
    <SidebarStory {...args}>
      <NavigationContent />
    </SidebarStory>
  ),
  args: {
    width: 280,
    side: 'left',
    enableSwipe: true,
    closeOnOverlayClick: true,
    showCloseButton: false
  }
}

export const CustomTrigger: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false)
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-4">
          <div className="text-gray-600 dark:text-gray-400">
            <p>Custom trigger button with search icon:</p>
          </div>
        </div>
        
        <MobileSidebar
          {...args}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          triggerButton={
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsOpen(true)}
              className="md:hidden"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          }
        >
          <NavigationContent />
        </MobileSidebar>
      </div>
    )
  },
  args: {
    width: 280,
    side: 'left',
    enableSwipe: true,
    closeOnOverlayClick: true,
    showCloseButton: true
  }
}

export const WithHook: Story = {
  render: () => {
    const { isOpen, toggle, close } = useMobileSidebar()
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-4">
          <div className="space-x-2">
            <Button onClick={toggle} className="md:hidden">
              <Menu className="h-4 w-4 mr-2" />
              Toggle Sidebar
            </Button>
            <Button onClick={close} variant="outline" className="md:hidden">
              Close
            </Button>
          </div>
          <div className="mt-4 text-gray-600 dark:text-gray-400">
            <p>Using the useMobileSidebar hook for state management.</p>
            <p>Status: {isOpen ? 'Open' : 'Closed'}</p>
          </div>
        </div>
        
        <MobileSidebar
          isOpen={isOpen}
          onOpenChange={close}
          enableSwipe={true}
        >
          <NavigationContent />
        </MobileSidebar>
      </div>
    )
  }
}