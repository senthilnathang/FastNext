"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Home, 
  Users, 
  Settings, 
  Menu, 
  X, 
  Database,
  Workflow,
  BarChart3,
  FileText,
  Bell,
  Search
} from 'lucide-react'

import { cn } from '@/shared/utils'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/shared/components/ui/sheet'
import { Separator } from '@/shared/components/ui/separator'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  description?: string
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview and analytics'
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management'
  },
  {
    name: 'Data Import',
    href: '/admin/data-import',
    icon: Database,
    description: 'Import and export data'
  },
  {
    name: 'Workflows',
    href: '/workflows',
    icon: Workflow,
    description: 'Workflow management'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Reports and insights'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'App configuration'
  }
]

interface MobileNavigationProps {
  className?: string
  notificationCount?: number
}

export function MobileNavigation({ className, notificationCount = 0 }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close navigation when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <div className={cn("lg:hidden", className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Menu className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">FastNext</h2>
                  <p className="text-sm text-muted-foreground">Admin Dashboard</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="truncate">{item.name}</span>
                            {item.badge && item.badge > 0 && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <Separator />

            {/* Footer Actions */}
            <div className="p-4 space-y-2">
              <Link
                href="/notifications"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
                {notificationCount > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </Link>
              
              <Link
                href="/help"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>Help & Support</span>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Bottom tab navigation for mobile
interface BottomTab {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const bottomTabs: BottomTab[] = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Data', href: '/admin/data-import', icon: Database },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Settings', href: '/settings', icon: Settings }
]

interface MobileBottomNavigationProps {
  className?: string
}

export function MobileBottomNavigation({ className }: MobileBottomNavigationProps) {
  const pathname = usePathname()

  return (
    <div className={cn(
      "lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t",
      className
    )}>
      <nav className="flex justify-around items-center h-16 px-2">
        {bottomTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 px-2 py-1 rounded-lg min-w-0 flex-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {tab.badge && tab.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium truncate w-full text-center">
                {tab.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default MobileNavigation