"use client"

import React from 'react'
import { Bell, Search, User, Settings, LogOut, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle, SimpleThemeToggle } from '@/components/ui/theme-toggle'
import Breadcrumb from './Breadcrumb'
import QuickActionButton from '../quick-actions/QuickActionButton'
import { useAuth } from '../../contexts/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()
  
  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="bg-background border-b border-border">
      <header className="h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects, components..."
              className="pl-10 pr-4 py-2 w-64 lg:w-80 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
            />
          </div>
          <Button variant="ghost" size="icon" className="sm:hidden" title="Search">
            <Search className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden sm:block">
            <QuickActionButton />
          </div>
          <Button variant="ghost" size="icon" title="Help" className="hidden md:flex">
            <HelpCircle className="w-5 h-5" />
          </Button>
          
          <Button variant="ghost" size="icon" title="Notifications">
            <Bell className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-1">
            <div className="border border-border rounded-md">
              <ThemeToggle />
            </div>
            <SimpleThemeToggle />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-2 sm:px-3">
                <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium text-foreground">
                    {user?.full_name || user?.username || 'User'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user?.roles?.join(', ') || 'User'}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{user?.full_name || user?.username || 'User'}</div>
                    <div className="text-sm text-muted-foreground">{user?.email || 'user@example.com'}</div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile & Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help & Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <div className="px-4 sm:px-6 py-3 bg-muted/50 border-t border-border">
        <Breadcrumb />
      </div>
    </div>
  )
}