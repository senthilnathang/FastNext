"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/utils'
import { MobileNavigation, MobileBottomNavigation } from '../mobile/MobileNavigation'
import { PWAInstallPrompt } from '../ui/PWAInstallPrompt'
import { useServiceWorker, useOfflineQueue } from '@/shared/hooks/useServiceWorker'
import { Alert, AlertDescription } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { WifiOff, RefreshCw } from 'lucide-react'

interface ResponsiveLayoutProps {
  children: React.ReactNode
  className?: string
  showBottomNav?: boolean
  showPWAPrompt?: boolean
}

export function ResponsiveLayout({ 
  children, 
  className, 
  showBottomNav = true,
  showPWAPrompt = true 
}: ResponsiveLayoutProps) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  
  const { isOnline, queuedRequests, isUpdateAvailable, skipWaiting } = useServiceWorker()
  const { queuedRequests: offlineRequests, forceSync, isProcessing } = useOfflineQueue()

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Simulate notification count (in real app, get from context/API)
  useEffect(() => {
    setNotificationCount(Math.floor(Math.random() * 5))
  }, [pathname])

  // Don't show bottom nav on certain pages
  const hideBottomNav = ['/login', '/register', '/offline'].some(route => 
    pathname.startsWith(route)
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Service Worker Update Banner */}
      {isUpdateAvailable && (
        <div className="bg-blue-600 text-white px-4 py-2 text-center">
          <div className="flex items-center justify-center space-x-4">
            <span className="text-sm">A new version is available!</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={skipWaiting}
              className="text-blue-600"
            >
              Update Now
            </Button>
          </div>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <Alert className="rounded-none border-x-0 border-t-0 border-yellow-200 bg-yellow-50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>You're currently offline. Some features may be limited.</span>
            {offlineRequests > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{offlineRequests} queued</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceSync}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    'Sync'
                  )}
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <header className="sticky top-0 z-40 bg-background border-b lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <MobileNavigation notificationCount={notificationCount} />
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold truncate">FastNext</h1>
            </div>
            <div className="w-10"> {/* Spacer for symmetry */}</div>
          </div>
        </header>
      )}

      {/* PWA Install Prompt */}
      {showPWAPrompt && isMobile && (
        <div className="sticky top-0 z-30 p-3 lg:hidden">
          <PWAInstallPrompt compact />
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1",
        // Add bottom padding on mobile when bottom nav is shown
        isMobile && showBottomNav && !hideBottomNav && "pb-20",
        className
      )}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && showBottomNav && !hideBottomNav && (
        <MobileBottomNavigation />
      )}

      {/* Desktop PWA Prompt */}
      {showPWAPrompt && !isMobile && (
        <div className="fixed bottom-4 right-4 z-50 hidden lg:block">
          <PWAInstallPrompt />
        </div>
      )}
    </div>
  )
}

// Hook to check if we're in mobile layout
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Hook for responsive breakpoints
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg')

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width < 640) setBreakpoint('sm')
      else if (width < 768) setBreakpoint('md')
      else if (width < 1024) setBreakpoint('lg')
      else if (width < 1280) setBreakpoint('xl')
      else setBreakpoint('2xl')
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return breakpoint
}

export default ResponsiveLayout