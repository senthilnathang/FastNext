"use client"

import * as React from "react"
import { Menu, ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/shared/utils"
import { Button } from "@/shared/components/button"
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture"

interface MobileSidebarProps {
  children: React.ReactNode
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  width?: string | number
  className?: string
  overlayClassName?: string
  side?: 'left' | 'right'
  enableSwipe?: boolean
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
  triggerButton?: React.ReactNode
}

const sidebarVariants = {
  closed: {
    x: '-100%',
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 200
    }
  },
  open: {
    x: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 200
    }
  }
}

const rightSidebarVariants = {
  closed: {
    x: '100%',
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 200
    }
  },
  open: {
    x: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 200
    }
  }
}

const overlayVariants = {
  closed: {
    opacity: 0,
    transition: {
      duration: 0.2
    }
  },
  open: {
    opacity: 1,
    transition: {
      duration: 0.2
    }
  }
}

export function MobileSidebar({
  children,
  isOpen,
  onOpenChange,
  width = 280,
  className,
  overlayClassName,
  side = 'left',
  enableSwipe = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  triggerButton
}: MobileSidebarProps) {
  const sidebarRef = React.useRef<HTMLDivElement>(null)
  const overlayRef = React.useRef<HTMLDivElement>(null)

  // Close sidebar
  const closeSidebar = React.useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Open sidebar
  const openSidebar = React.useCallback(() => {
    onOpenChange(true)
  }, [onOpenChange])

  // Swipe gesture handlers
  const { addSwipeListeners } = useSwipeGesture({
    onSwipeLeft: side === 'left' ? closeSidebar : undefined,
    onSwipeRight: side === 'right' ? closeSidebar : openSidebar,
    threshold: 50
  })

  // Global swipe to open from edge
  const { addSwipeListeners: addGlobalSwipeListeners } = useSwipeGesture({
    onSwipeRight: side === 'left' ? openSidebar : undefined,
    onSwipeLeft: side === 'right' ? openSidebar : undefined,
    threshold: 30
  })

  React.useEffect(() => {
    if (!enableSwipe) return

    // Add swipe listeners to sidebar
    if (sidebarRef.current) {
      const cleanup = addSwipeListeners(sidebarRef.current)
      return cleanup
    }
  }, [addSwipeListeners, enableSwipe])

  // Global edge swipe detection
  React.useEffect(() => {
    if (!enableSwipe || isOpen) return

    const cleanup = addGlobalSwipeListeners(document.body)
    return cleanup
  }, [addGlobalSwipeListeners, enableSwipe, isOpen])

  // Prevent body scroll when sidebar is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSidebar()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeSidebar])

  const sidebarWidth = typeof width === 'number' ? `${width}px` : width

  return (
    <>
      {/* Trigger Button */}
      {triggerButton || (
        <Button
          variant="ghost"
          size="sm"
          onClick={openSidebar}
          className="md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar Portal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Overlay */}
            <motion.div
              ref={overlayRef}
              variants={overlayVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className={cn(
                "fixed inset-0 bg-black/50 backdrop-blur-sm",
                overlayClassName
              )}
              onClick={closeOnOverlayClick ? closeSidebar : undefined}
            />

            {/* Sidebar */}
            <motion.div
              ref={sidebarRef}
              variants={side === 'left' ? sidebarVariants : rightSidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className={cn(
                "fixed top-0 bottom-0 bg-white dark:bg-gray-900 shadow-xl border-r dark:border-gray-800 overflow-hidden flex flex-col",
                side === 'left' ? "left-0" : "right-0 border-l border-r-0",
                className
              )}
              style={{ width: sidebarWidth }}
            >
              {/* Header with close button */}
              {showCloseButton && (
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">F</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">FastNext</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeSidebar}
                    className="h-8 w-8 p-0"
                    aria-label="Close sidebar"
                  >
                    {side === 'left' ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>

              {/* Swipe indicator */}
              {enableSwipe && (
                <div className="absolute top-1/2 -translate-y-1/2 w-1 h-16 bg-gray-300 dark:bg-gray-600 rounded-full opacity-20" 
                     style={{ 
                       [side === 'left' ? 'right' : 'left']: '-2px' 
                     }} 
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

// Hook for managing sidebar state
export function useMobileSidebar(initialOpen = false) {
  const [isOpen, setIsOpen] = React.useState(initialOpen)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  }
}

export default MobileSidebar