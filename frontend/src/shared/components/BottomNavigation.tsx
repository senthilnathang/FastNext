"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { LucideIcon, Briefcase, Users, Shield, Settings } from "lucide-react"

import { cn } from "@/shared/utils"
import { Badge } from "@/shared/components/badge"

interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
  badge?: number | string
  disabled?: boolean
}

interface BottomNavigationProps {
  items: NavigationItem[]
  activeItem?: string
  onItemClick?: (item: NavigationItem) => void
  className?: string
  showLabels?: boolean
  maxVisibleItems?: number
  hideOnScroll?: boolean
}

const itemVariants = {
  inactive: {
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 300
    }
  },
  active: {
    scale: 1.1,
    y: -2,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 300
    }
  }
}

const badgeVariants = {
  hidden: {
    scale: 0,
    opacity: 0
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      damping: 15,
      stiffness: 400
    }
  }
}

export function BottomNavigation({
  items,
  activeItem,
  onItemClick,
  className,
  showLabels = true,
  maxVisibleItems = 5,
  hideOnScroll = true
}: BottomNavigationProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  const [lastScrollY, setLastScrollY] = React.useState(0)
  const [showOverflow, setShowOverflow] = React.useState(false)

  // Handle scroll visibility
  React.useEffect(() => {
    if (!hideOnScroll) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false)
      } else {
        // Scrolling up
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, hideOnScroll])

  // Split items for overflow menu
  const visibleItems = items.slice(0, maxVisibleItems - 1)
  const overflowItems = items.slice(maxVisibleItems - 1)
  const hasOverflow = items.length > maxVisibleItems

  const handleItemClick = (item: NavigationItem) => {
    if (item.disabled) return
    
    if (item.onClick) {
      item.onClick()
    }
    
    onItemClick?.(item)
  }

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = activeItem === item.id
    const IconComponent = item.icon

    return (
      <motion.button
        key={item.id}
        variants={itemVariants}
        animate={isActive ? "active" : "inactive"}
        onClick={() => handleItemClick(item)}
        disabled={item.disabled}
        className={cn(
          "relative flex flex-col items-center justify-center flex-1 py-2 px-1 min-h-[60px] transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isActive 
            ? "text-blue-600 dark:text-blue-400" 
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        )}
        aria-label={item.label}
        role="tab"
        aria-selected={isActive}
      >
        {/* Icon Container */}
        <div className="relative">
          <IconComponent className={cn(
            "w-6 h-6 transition-all duration-200",
            isActive ? "text-blue-600 dark:text-blue-400" : ""
          )} />
          
          {/* Badge */}
          <motion.div
            variants={badgeVariants}
            initial="hidden"
            animate={item.badge ? "visible" : "hidden"}
            className="absolute -top-1 -right-1"
          >
            {item.badge && (
              <Badge 
                variant="destructive" 
                className={cn(
                  "text-xs min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center",
                  typeof item.badge === 'number' && item.badge > 99 ? "px-1.5" : ""
                )}
              >
                {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
              </Badge>
            )}
          </motion.div>
        </div>

        {/* Label */}
        {showLabels && (
          <span className={cn(
            "text-xs mt-1 transition-all duration-200 line-clamp-1",
            isActive ? "font-medium" : "font-normal"
          )}>
            {item.label}
          </span>
        )}

        {/* Active indicator */}
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"
            layoutId="activeIndicator"
            transition={{
              type: "spring" as const,
              damping: 20,
              stiffness: 300
            }}
            style={{ x: "-50%" }}
          />
        )}
      </motion.button>
    )
  }

  return (
    <>
      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ 
          y: isVisible ? 0 : 100,
          transition: {
            type: "spring" as const,
            damping: 20,
            stiffness: 300
          }
        }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40",
          "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md",
          "border-t border-gray-200 dark:border-gray-800",
          "shadow-lg shadow-black/5 dark:shadow-black/20",
          "safe-area-pb", // For devices with notches
          "md:hidden", // Hide on desktop
          className
        )}
        role="tablist"
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-center px-2">
          {/* Visible Items */}
          {visibleItems.map((item) => renderNavigationItem(item))}
          
          {/* Overflow Menu Button */}
          {hasOverflow && (
            <motion.button
              variants={itemVariants}
              animate={showOverflow ? "active" : "inactive"}
              onClick={() => setShowOverflow(!showOverflow)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-2 px-1 min-h-[60px] transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
                showOverflow 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              aria-label="More options"
            >
              <div className="grid grid-cols-2 gap-0.5 w-6 h-6">
                {overflowItems.slice(0, 4).map((_, index) => (
                  <div key={index} className="w-2 h-2 bg-current rounded-full opacity-60" />
                ))}
              </div>
              
              {showLabels && (
                <span className={cn(
                  "text-xs mt-1 transition-all duration-200",
                  showOverflow ? "font-medium" : "font-normal"
                )}>
                  More
                </span>
              )}

              {/* Active indicator */}
              {showOverflow && (
                <motion.div
                  className="absolute bottom-0 left-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"
                  layoutId="moreActiveIndicator"
                  transition={{
                    type: "spring" as const,
                    damping: 20,
                    stiffness: 300
                  }}
                  style={{ x: "-50%" }}
                />
              )}
            </motion.button>
          )}
        </div>
      </motion.nav>

      {/* Overflow Menu */}
      {showOverflow && hasOverflow && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOverflow(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          />
          
          {/* Overflow Items */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{
              type: "spring" as const,
              damping: 20,
              stiffness: 300
            }}
            className={cn(
              "fixed bottom-20 left-4 right-4 z-40",
              "bg-white dark:bg-gray-900 rounded-xl",
              "border border-gray-200 dark:border-gray-800",
              "shadow-xl shadow-black/10 dark:shadow-black/30",
              "p-4 md:hidden"
            )}
          >
            <div className="grid grid-cols-2 gap-2">
              {overflowItems.map((item) => {
                const isActive = activeItem === item.id
                const IconComponent = item.icon
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleItemClick(item)
                      setShowOverflow(false)
                    }}
                    disabled={item.disabled}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-4 rounded-lg transition-colors duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isActive 
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                        : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <div className="relative">
                      <IconComponent className="w-6 h-6 mb-2" />
                      
                      {item.badge && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 text-xs min-w-[16px] h-4 px-1 rounded-full"
                        >
                          {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                    </div>
                    
                    <span className="text-sm font-medium text-center line-clamp-2">
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </>
  )
}

// Hook for managing bottom navigation state
export function useBottomNavigation(items: NavigationItem[], defaultActive?: string) {
  const [activeItem, setActiveItem] = React.useState(defaultActive || items[0]?.id)

  const handleItemClick = React.useCallback((item: NavigationItem) => {
    setActiveItem(item.id)
    
    // Handle navigation
    if (item.href && typeof window !== 'undefined') {
      window.location.href = item.href
    }
  }, [])

  return {
    activeItem,
    setActiveItem,
    handleItemClick
  }
}

// Pre-configured bottom navigation layouts
export function AdminBottomNavigation() {
  const adminItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Briefcase,
      href: '/admin'
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      href: '/admin/users'
    },
    {
      id: 'roles',
      label: 'Roles',
      icon: Shield,
      href: '/admin/roles'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/admin/settings'
    }
  ]

  const { activeItem, handleItemClick } = useBottomNavigation(adminItems)

  return (
    <BottomNavigation
      items={adminItems}
      activeItem={activeItem}
      onItemClick={handleItemClick}
    />
  )
}

export default BottomNavigation