"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Settings,
  Users,
  Shield,
  Key,
  ChevronDown,
  ChevronRight,
  Palette,
  BarChart3,
  FileText
} from 'lucide-react'

interface MenuItem {
  title: string
  href?: string
  icon: React.ComponentType<any>
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: Home
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: Palette
  },
  {
    title: 'Builder',
    href: '/builder',
    icon: Settings
  },
  {
    title: 'Administration',
    icon: Shield,
    children: [
      {
        title: 'Users',
        href: '/admin/users',
        icon: Users
      },
      {
        title: 'Roles',
        href: '/admin/roles',
        icon: Shield
      },
      {
        title: 'Permissions',
        href: '/admin/permissions',
        icon: Key
      }
    ]
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3
  },
  {
    title: 'Documentation',
    href: '/docs',
    icon: FileText
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
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    {
      'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300': isActive || hasActiveChild,
      'text-gray-700 dark:text-gray-300': !isActive && !hasActiveChild,
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
  return (
    <div className={cn('w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800', className)}>
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FN</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FastNext</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">App Builder</p>
          </div>
        </div>
      </div>

      <nav className="px-4 pb-4">
        <div className="space-y-1">
          {menuItems.map((item, index) => (
            <SidebarItem key={index} item={item} />
          ))}
        </div>
      </nav>
    </div>
  )
}