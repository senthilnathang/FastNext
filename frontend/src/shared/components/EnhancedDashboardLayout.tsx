"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Menu, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/shared/components/button'
import EnhancedSidebar from './EnhancedSidebar'
import Header from './Header'
import { EnhancedThemeToggle, ThemeIndicator } from './EnhancedThemeToggle'
import { cn } from '@/shared/utils'

interface EnhancedDashboardLayoutProps {
  children: React.ReactNode
}

export default function EnhancedDashboardLayout({ children }: EnhancedDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed))
    }
  }, [])

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed)
  }, [sidebarCollapsed])

  const handleMobileSidebarToggle = useCallback(() => {
    setSidebarOpen(!sidebarOpen)
  }, [sidebarOpen])

  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(err => {
        console.log('Error attempting to enable fullscreen:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch(err => {
        console.log('Error attempting to exit fullscreen:', err)
      })
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault()
        setSidebarCollapsed(!sidebarCollapsed)
      }
      
      // F11 for fullscreen
      if (event.key === 'F11') {
        event.preventDefault()
        handleFullscreenToggle()
      }

      // Escape to close mobile sidebar
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarCollapsed, sidebarOpen, handleFullscreenToggle])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-out",
        "lg:relative lg:translate-x-0 lg:z-auto",
        "shadow-xl lg:shadow-none",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <EnhancedSidebar 
          className="h-full" 
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleSidebarToggle}
          showCloseButton={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMobileSidebarToggle}
                className="hover:bg-muted"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow">
                  <span className="text-white font-bold text-sm">FN</span>
                </div>
                <h1 className="text-lg font-semibold text-foreground">FastNext</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <EnhancedThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreenToggle}
                title={isFullscreen ? 'Exit fullscreen (F11)' : 'Enter fullscreen (F11)'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Desktop header */}
        <div className="hidden lg:block">
          <Header />
        </div>
        
        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-background">
          <div className={cn(
            "container transition-all duration-300",
            sidebarCollapsed ? "py-6 space-y-6" : "py-6 space-y-6"
          )}>
            {children}
          </div>
        </main>

        {/* Status bar */}
        <div className="hidden lg:flex items-center justify-between px-6 py-2 bg-muted/50 border-t border-border text-xs">
          <div className="flex items-center space-x-4">
            <ThemeIndicator />
            <span className="text-gray-500 dark:text-gray-400">
              Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">Ctrl+B</kbd> to toggle sidebar
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 dark:text-gray-400">
              {sidebarCollapsed ? 'Sidebar collapsed' : 'Sidebar expanded'}
            </span>
            {isFullscreen && (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Fullscreen mode
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}