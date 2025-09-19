"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUserRole } from '@/hooks/useUserRole'
import {
  Home,
  Settings,
  Users,
  Shield,
  Key,
  ChevronDown,
  ChevronRight,
  BarChart3,
  FileText,
  Brain,
  CheckCircle,
  Database,
  Layers,
  Activity,
  Building2,
  Clock,
  FileCheck,
  Globe
} from 'lucide-react'

interface MenuItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: MenuItem[]
  requiredPermission?: string
  module?: string
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: Building2,
    module: 'projects'
  },
  {
    title: 'Builder',
    href: '/builder',
    icon: Layers,
    module: 'builder'
  },
  {
    title: 'Compliance',
    icon: CheckCircle,
    module: 'compliance',
    children: [
      {
        title: 'AI Trust Center',
        href: '/compliance/ai-trust',
        icon: Brain,
        requiredPermission: 'compliance.ai-trust'
      },
      {
        title: 'Policy Dashboard',
        href: '/compliance/policies',
        icon: FileCheck,
        requiredPermission: 'compliance.policies'
      },
      {
        title: 'Framework',
        href: '/compliance/framework',
        icon: Globe,
        requiredPermission: 'compliance.framework'
      }
    ]
  },
  {
    title: 'AI Management',
    icon: Brain,
    module: 'ai-management',
    children: [
      {
        title: 'Model Inventory',
        href: '/ai/models',
        icon: Database,
        requiredPermission: 'ai.models'
      },
      {
        title: 'Fairness Dashboard',
        href: '/ai/fairness',
        icon: Activity,
        requiredPermission: 'ai.fairness'
      },
      {
        title: 'Performance Metrics',
        href: '/ai/metrics',
        icon: BarChart3,
        requiredPermission: 'ai.metrics'
      }
    ]
  },
  {
    title: 'Operations',
    icon: Settings,
    module: 'operations',
    children: [
      {
        title: 'Tasks',
        href: '/operations/tasks',
        icon: Clock,
        requiredPermission: 'operations.tasks'
      },
      {
        title: 'Reporting',
        href: '/operations/reports',
        icon: FileText,
        requiredPermission: 'operations.reports'
      },
      {
        title: 'File Manager',
        href: '/operations/files',
        icon: FileText,
        requiredPermission: 'operations.files'
      }
    ]
  },
  {
    title: 'Administration',
    icon: Shield,
    module: 'administration',
    children: [
      {
        title: 'Users',
        href: '/admin/users',
        icon: Users,
        requiredPermission: 'admin.users'
      },
      {
        title: 'Roles',
        href: '/admin/roles',
        icon: Shield,
        requiredPermission: 'admin.roles'
      },
      {
        title: 'Permissions',
        href: '/admin/permissions',
        icon: Key,
        requiredPermission: 'admin.permissions'
      }
    ]
  }
]

interface SidebarItemProps {
  item: MenuItem
  level?: number
}

function SidebarItem({ item, level = 0 }: SidebarItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()
  const hasChildren = item.children && item.children.length > 0
  const isActive = item.href ? pathname === item.href : false
  const hasActiveChild = hasChildren && item.children?.some(child => pathname === child.href)

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const ItemContent = () => (
    <>
      <item.icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-left">{item.title}</span>
      {hasChildren && (
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      )}
    </>
  )

  const itemClasses = cn(
    'flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors',
    'hover:bg-accent hover:text-accent-foreground',
    {
      'bg-accent text-accent-foreground': isActive || hasActiveChild,
      'text-foreground': !isActive && !hasActiveChild,
      'pl-6': level > 0
    }
  )

  return (
    <div>
      {hasChildren ? (
        <button
          onClick={handleToggle}
          className={itemClasses}
        >
          <ItemContent />
        </button>
      ) : (
        <Link href={item.href || '#'} className={itemClasses}>
          <ItemContent />
        </Link>
      )}

      {hasChildren && isExpanded && (
        <div className="ml-4 mt-1 space-y-1">
          {item.children?.map((child, index) => (
            <SidebarItem key={index} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  className?: string
}

export default function Sidebar({ className }: SidebarProps) {
  const { canAccessModule, hasPermission } = useUserRole()

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (item.module && !canAccessModule(item.module)) {
        return false
      }
      
      if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
        return false
      }

      if (item.children) {
        item.children = filterMenuItems(item.children)
        return item.children.length > 0
      }

      return true
    })
  }

  const filteredMenuItems = filterMenuItems([...menuItems])

  return (
    <div className={cn('w-64 bg-background border-r border-border', className)}>
      <div className="p-4 sm:p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">FN</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground">FastNext</h1>
            <p className="text-xs text-muted-foreground">Enterprise App Builder</p>
          </div>
        </div>
      </div>

      <nav className="px-4 pb-4">
        <div className="space-y-1">
          {filteredMenuItems.map((item, index) => (
            <SidebarItem key={index} item={item} />
          ))}
        </div>
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          v2.1.0 - FastNext Platform
        </div>
      </div>
    </div>
  )
}