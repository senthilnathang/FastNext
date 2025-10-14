"use client"

import * as React from "react"
import { User, LogOut, ChevronUp, UserCircle, Bell, HelpCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { cn } from "@/shared/utils"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Badge } from "../ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { ThemeSwitcher } from "../ui/ThemeSwitcher"
import { NotificationCenter } from "../notifications"

import { useAuth } from "@/modules/auth"
import type { User as UserType } from "@/shared/services/api/users"

interface UserMenuProps {
  isCollapsed?: boolean
  className?: string
}


function UserAvatar({ user, size = "default" }: { user: UserType; size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "w-6 h-6",
    default: "w-8 h-8", 
    lg: "w-10 h-10"
  }
  
  const iconSizes = {
    sm: "h-3 w-3",
    default: "h-4 w-4",
    lg: "h-5 w-5"
  }

  return (
    <div className="relative flex-shrink-0">
      <div className={cn(
        "bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center",
        sizeClasses[size]
      )}>
        {user.avatar_url ? (
          <Image 
            src={user.avatar_url} 
            alt={user.full_name || user.username}
            width={size === "sm" ? 24 : size === "default" ? 32 : 40}
            height={size === "sm" ? 24 : size === "default" ? 32 : 40}
            className={cn("rounded-full object-cover", sizeClasses[size])}
          />
        ) : (
          <User className={cn("text-white", iconSizes[size])} />
        )}
      </div>
      {/* Online status indicator */}
      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
    </div>
  )
}

function CompactUserMenu({
  user,
  onLogout,
  setShowNotifications
}: {
  user: UserType;
  onLogout: () => void;
  setShowNotifications: (show: boolean) => void;
}) {
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-auto p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <UserAvatar user={user} size="default" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent side="right" align="end" className="w-64 p-2" sideOffset={8}>
        {/* User Info Header */}
        <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <UserAvatar user={user} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {user.full_name || user.username}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              {user.is_verified && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  Verified
                </Badge>
              )}
              {user.is_superuser && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  Admin
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Profile */}
        <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
          <UserCircle className="h-4 w-4 mr-3" />
          <span>Profile & Settings</span>
        </DropdownMenuItem>

        {/* Notifications */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setShowNotifications(true)}
        >
          <Bell className="h-4 w-4 mr-3" />
          <span>Notifications</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            2
          </Badge>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme & Color Selection */}
        <div className="px-2 py-1">
          <ThemeSwitcher variant="dropdown" showColorSchemes={true} className="w-full" />
        </div>

        {/* Help */}
        <DropdownMenuItem className="cursor-pointer">
          <HelpCircle className="h-4 w-4 mr-3" />
          <span>Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem 
          onClick={onLogout}
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ExpandedUserMenu({
  user,
  onLogout,
  setShowNotifications
}: {
  user: UserType;
  onLogout: () => void;
  setShowNotifications: (show: boolean) => void;
}) {
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full h-auto p-3 justify-between hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <UserAvatar user={user} size="default" />
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                {user.full_name || user.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <ChevronUp className="h-4 w-4 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent side="top" align="start" className="w-72 p-2" sideOffset={8}>
        {/* User Info Header */}
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <UserAvatar user={user} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {user.full_name || user.username}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              {user.is_verified && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  Verified
                </Badge>
              )}
              {user.is_superuser && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  Admin
                </Badge>
              )}
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-green-600 dark:text-green-400">
                Online
              </Badge>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-1">
          <DropdownMenuItem 
            onClick={() => router.push('/settings')} 
            className="cursor-pointer p-3 h-auto flex-col items-start"
          >
            <UserCircle className="h-5 w-5 mb-1 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">Profile</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Settings & preferences</span>
          </DropdownMenuItem>
          
           <DropdownMenuItem
             className="cursor-pointer p-3 h-auto flex-col items-start"
             onClick={() => setShowNotifications(true)}
           >
             <Bell className="h-5 w-5 mb-1 text-orange-600 dark:text-orange-400" />
             <span className="font-medium">Notifications</span>
             <span className="text-xs text-gray-500 dark:text-gray-400">2 new messages</span>
           </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        {/* Enhanced Theme & Color Selection */}
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2">
          Appearance & Colors
        </DropdownMenuLabel>
        
        <div className="p-2">
          <ThemeSwitcher variant="inline" showColorSchemes={true} />
        </div>

        <DropdownMenuSeparator />

        {/* Help */}
        <DropdownMenuItem className="cursor-pointer">
          <HelpCircle className="h-4 w-4 mr-3" />
          <span>Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem 
          onClick={onLogout}
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function UserMenu({ isCollapsed = false, className }: UserMenuProps) {
  const { user, logout } = useAuth()
  const [showNotifications, setShowNotifications] = React.useState(false)

  if (!user) {
    return null
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (isCollapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex justify-center", className)}>
              <CompactUserMenu
                user={user}
                onLogout={handleLogout}
                setShowNotifications={setShowNotifications}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <div className="text-center">
              <p className="font-medium">{user.full_name || user.username}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Notification Center */}
        <NotificationCenter
          open={showNotifications}
          onOpenChange={setShowNotifications}
        />
      </>
    )
  }

  return (
    <>
      <div className={className}>
        <ExpandedUserMenu
          user={user}
          onLogout={handleLogout}
          setShowNotifications={setShowNotifications}
        />
      </div>

      {/* Notification Center */}
      <NotificationCenter
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />
    </>
  )
}