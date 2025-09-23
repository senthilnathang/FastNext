"use client"

import * as React from "react"
import { Download, X, Smartphone, Monitor } from "lucide-react"

import { cn } from "@/shared/utils"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallPromptProps {
  className?: string
  hideAfterInstall?: boolean
  showBadge?: boolean
  compact?: boolean
}

export function PWAInstallPrompt({
  className,
  hideAfterInstall = true,
  showBadge = true,
  compact = false
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = React.useState(false)
  const [isInstalled, setIsInstalled] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(false)
  const [platform, setPlatform] = React.useState<'desktop' | 'mobile' | 'unknown'>('unknown')

  // Detect platform
  React.useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)) {
      setPlatform('mobile')
    } else {
      setPlatform('desktop')
    }
  }, [])

  // Listen for beforeinstallprompt event
  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(installEvent)
      setIsInstallable(true)
      
      // Show prompt after a delay if not dismissed
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (!dismissed) {
          setIsVisible(true)
        }
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  // Listen for app installed event
  React.useEffect(() => {
    const handler = () => {
      setIsInstalled(true)
      setIsVisible(false)
      setDeferredPrompt(null)
      console.log('PWA was installed')
    }

    window.addEventListener('appinstalled', handler)

    return () => {
      window.removeEventListener('appinstalled', handler)
    }
  }, [])

  // Check if already installed
  React.useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return
      }

      // Check if running as PWA on mobile
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true)
        return
      }

      // Check for related applications
      if ('getInstalledRelatedApps' in navigator) {
        (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
          if (apps.length > 0) {
            setIsInstalled(true)
          }
        })
      }
    }

    checkInstalled()
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
        setIsVisible(false)
      } else {
        console.log('User dismissed the install prompt')
        handleDismiss()
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Error showing install prompt:', error)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
    
    // Clear dismissal after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed')
    }, 7 * 24 * 60 * 60 * 1000)
  }

  // Don't show if not installable, already installed, or explicitly hidden
  if (!isInstallable || (isInstalled && hideAfterInstall) || !isVisible) {
    return null
  }

  const PlatformIcon = platform === 'mobile' ? Smartphone : Monitor

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleInstall}
          className="h-8"
        >
          <Download className="h-3 w-3 mr-1" />
          Install App
        </Button>
        {showBadge && (
          <Badge variant="secondary" className="text-xs">
            PWA
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Install FastNext</CardTitle>
              <CardDescription>
                Get quick access from your {platform === 'mobile' ? 'home screen' : 'desktop'}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <PlatformIcon className="h-4 w-4" />
            <span className="capitalize">{platform}</span>
          </div>
          {showBadge && (
            <Badge variant="outline" className="text-xs">
              Progressive Web App
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <h4 className="font-medium">Benefits:</h4>
          <ul className="space-y-1 text-gray-600 dark:text-gray-400">
            <li className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Works offline</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Fast loading</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Native app experience</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Push notifications</span>
            </li>
          </ul>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button onClick={handleInstall} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Install Now
          </Button>
          <Button variant="outline" onClick={handleDismiss}>
            Later
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for PWA installation state
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = React.useState(false)
  const [isInstalled, setIsInstalled] = React.useState(false)
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(installEvent)
      setIsInstallable(true)
    }

    const installedHandler = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const install = React.useCallback(async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return choiceResult.outcome === 'accepted'
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }, [deferredPrompt])

  return {
    isInstallable,
    isInstalled,
    install
  }
}

export default PWAInstallPrompt