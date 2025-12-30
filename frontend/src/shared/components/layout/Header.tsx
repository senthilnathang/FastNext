"use client";

import { LogOut, Search, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth";
import Breadcrumb from "../navigation/Breadcrumb";
import SidebarToggle from "../navigation/SidebarToggle";
import { NotificationBell } from "../notifications/NotificationBell";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { EnhancedThemeToggle } from "../ui/EnhancedThemeToggle";
import QuickActionButton from "../ui/QuickActionButton";

interface HeaderProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({
  sidebarCollapsed,
  onToggleSidebar,
}: HeaderProps = {}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="bg-background border-b border-border">
      <header className="h-12 flex items-center justify-between px-3">
        <div className="flex items-center space-x-3">
          {/* Sidebar toggle for desktop */}
          {onToggleSidebar && (
            <div className="hidden lg:block">
              <SidebarToggle
                isCollapsed={sidebarCollapsed || false}
                onToggle={onToggleSidebar}
                variant="minimal"
                size="sm"
              />
            </div>
          )}

          <div className="relative hidden sm:block">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 w-48 lg:w-64 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-md focus:ring-1 focus:ring-ring focus:border-transparent transition-colors"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="sm:hidden p-1.5"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <div className="hidden sm:block">
            <QuickActionButton />
          </div>

          <NotificationBell
            onViewAll={() => router.push("/notifications")}
            onSettingsClick={() => router.push("/settings?tab=notifications")}
            notificationCenterUrl="/notifications"
          />

          <EnhancedThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 px-2 py-1.5 h-8"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium text-foreground">
                    {user?.full_name || user?.username || "User"}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {user?.full_name || user?.username || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user?.email || "user@example.com"}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sm">
                <User className="mr-2 h-3.5 w-3.5" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm">
                <Settings className="mr-2 h-3.5 w-3.5" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive text-sm"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="px-3 py-1.5 bg-muted/30 border-t border-border">
        <Breadcrumb />
      </div>
    </div>
  );
}
