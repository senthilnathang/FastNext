"use client";

/**
 * Enhanced Quick Actions Widget
 * Extended with company and notification actions
 */

import {
  BarChart3,
  Bell,
  BellRing,
  Building2,
  Download,
  Key,
  MessageCircle,
  Plus,
  Settings,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { cn } from "@/shared/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  disabled?: boolean;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  category?: "admin" | "company" | "notifications" | "messages" | "general";
}

interface EnhancedQuickActionsWidgetProps {
  actions?: QuickAction[];
  className?: string;
  showCategories?: boolean;
  columns?: 2 | 3 | 4;
  compact?: boolean;
  unreadNotifications?: number;
  unreadMessages?: number;
  companiesCount?: number;
}

const defaultQuickActions: QuickAction[] = [
  // Admin actions
  {
    id: "create-user",
    title: "Create User",
    description: "Add a new user to the system",
    icon: Users,
    action: () => (window.location.href = "/admin/users"),
    variant: "default",
    category: "admin",
  },
  {
    id: "create-role",
    title: "Create Role",
    description: "Define a new user role",
    icon: Shield,
    action: () => (window.location.href = "/admin/roles"),
    variant: "secondary",
    category: "admin",
  },
  {
    id: "manage-permissions",
    title: "Permissions",
    description: "Configure system permissions",
    icon: Key,
    action: () => (window.location.href = "/admin/permissions"),
    variant: "secondary",
    category: "admin",
  },
  // Company actions
  {
    id: "add-company",
    title: "Add Company",
    description: "Create a new company",
    icon: Building2,
    action: () => (window.location.href = "/companies/new"),
    variant: "secondary",
    category: "company",
  },
  {
    id: "switch-company",
    title: "Switch Company",
    description: "Change active company",
    icon: Building2,
    action: () => (window.location.href = "/companies"),
    variant: "secondary",
    category: "company",
  },
  // Notification actions
  {
    id: "view-notifications",
    title: "Notifications",
    description: "View all notifications",
    icon: Bell,
    action: () => (window.location.href = "/notifications"),
    variant: "secondary",
    category: "notifications",
  },
  {
    id: "notification-settings",
    title: "Alert Settings",
    description: "Configure notification preferences",
    icon: BellRing,
    action: () => (window.location.href = "/settings?tab=notifications"),
    variant: "secondary",
    category: "notifications",
  },
  // Messages actions
  {
    id: "compose-message",
    title: "New Message",
    description: "Compose a new message",
    icon: MessageCircle,
    action: () => (window.location.href = "/messages/compose"),
    variant: "secondary",
    category: "messages",
  },
  // General actions
  {
    id: "export-data",
    title: "Export Data",
    description: "Download system reports",
    icon: Download,
    action: () => (window.location.href = "/admin/export"),
    variant: "secondary",
    category: "general",
  },
  {
    id: "system-settings",
    title: "Settings",
    description: "Configure system settings",
    icon: Settings,
    action: () => (window.location.href = "/settings"),
    variant: "secondary",
    category: "general",
  },
  {
    id: "view-analytics",
    title: "Analytics",
    description: "Check system analytics",
    icon: BarChart3,
    action: () => (window.location.href = "/analytics"),
    variant: "secondary",
    category: "general",
  },
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  admin: { label: "Administration", color: "text-purple-600" },
  company: { label: "Company", color: "text-blue-600" },
  notifications: { label: "Notifications", color: "text-orange-600" },
  messages: { label: "Messages", color: "text-green-600" },
  general: { label: "General", color: "text-gray-600" },
};

function QuickActionButton({
  action,
  compact,
}: {
  action: QuickAction;
  compact: boolean;
}) {
  const Icon = action.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={action.variant || "secondary"}
              className={cn(
                "h-12 w-12 p-0 relative",
                action.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={action.action}
              disabled={action.disabled}
            >
              <Icon className="h-5 w-5" />
              {action.badge !== undefined && action.badge !== 0 && (
                <Badge
                  variant={action.badgeVariant || "destructive"}
                  className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                >
                  {typeof action.badge === "number" && action.badge > 99
                    ? "99+"
                    : action.badge}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">{action.title}</p>
            <p className="text-xs text-gray-500">{action.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant={action.variant || "secondary"}
      className={cn(
        "h-auto p-4 flex flex-col items-center space-y-2 relative",
        action.disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={action.action}
      disabled={action.disabled}
    >
      <div className="relative">
        <Icon className="h-5 w-5" />
        {action.badge !== undefined && action.badge !== 0 && (
          <Badge
            variant={action.badgeVariant || "destructive"}
            className="absolute -top-2 -right-3 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
          >
            {typeof action.badge === "number" && action.badge > 99
              ? "99+"
              : action.badge}
          </Badge>
        )}
      </div>
      <div className="text-center">
        <div className="font-medium text-sm">{action.title}</div>
        <div className="text-xs opacity-70 hidden sm:block">{action.description}</div>
      </div>
    </Button>
  );
}

export function EnhancedQuickActionsWidget({
  actions,
  className,
  showCategories = false,
  columns = 2,
  compact = false,
  unreadNotifications = 0,
  unreadMessages = 0,
  companiesCount,
}: EnhancedQuickActionsWidgetProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Prepare actions with badges
  const preparedActions = (actions || defaultQuickActions).map((action) => {
    if (action.id === "view-notifications" && unreadNotifications > 0) {
      return { ...action, badge: unreadNotifications };
    }
    if (action.id === "compose-message" && unreadMessages > 0) {
      return { ...action, badge: unreadMessages, badgeVariant: "secondary" as const };
    }
    if (action.id === "switch-company" && companiesCount !== undefined) {
      return { ...action, badge: companiesCount, badgeVariant: "secondary" as const };
    }
    return action;
  });

  // Group actions by category if needed
  const groupedActions = preparedActions.reduce((acc, action) => {
    const category = action.category || "general";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  // Filter actions by selected category
  const filteredActions = selectedCategory
    ? preparedActions.filter((a) => a.category === selectedCategory)
    : preparedActions;

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Zap className="h-5 w-5 mr-2" />
            Quick Actions
          </CardTitle>
          {showCategories && (
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant={selectedCategory === null ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="h-7 text-xs"
              >
                All
              </Button>
              {Object.keys(groupedActions).map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "h-7 text-xs",
                    selectedCategory === category && categoryLabels[category]?.color
                  )}
                >
                  {categoryLabels[category]?.label || category}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showCategories && !selectedCategory ? (
          // Show grouped actions
          <div className="space-y-6">
            {Object.entries(groupedActions).map(([category, categoryActions]) => (
              <div key={category}>
                <h4
                  className={cn(
                    "text-sm font-medium mb-3 flex items-center",
                    categoryLabels[category]?.color || "text-gray-600"
                  )}
                >
                  {categoryLabels[category]?.label || category}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {categoryActions.length}
                  </Badge>
                </h4>
                <div className={cn("grid gap-3", compact ? "grid-cols-4 sm:grid-cols-6" : gridCols[columns])}>
                  {categoryActions.map((action) => (
                    <QuickActionButton key={action.id} action={action} compact={compact} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Show flat list (filtered or all)
          <div className={cn("grid gap-3", compact ? "grid-cols-4 sm:grid-cols-6" : gridCols[columns])}>
            {filteredActions.map((action) => (
              <QuickActionButton key={action.id} action={action} compact={compact} />
            ))}
          </div>
        )}

        {/* Add Custom Action Button */}
        {!compact && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => (window.location.href = "/settings/quick-actions")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Customize Quick Actions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnhancedQuickActionsWidget;
