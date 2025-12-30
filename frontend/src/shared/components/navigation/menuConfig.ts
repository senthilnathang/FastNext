import {
  Activity,
  AlertTriangle,
  Bell,
  Book,
  Building2,
  Cog,
  Database,
  Download,
  FileText,
  GitBranch,
  Home,
  Key,
  Lock,
  Monitor,
  Package,
  Settings,
  Shield,
  Upload,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";

export interface MenuItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: MenuItem[];
  requiredPermission?: string;
  module?: string;
}

export const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: Building2,
    module: "projects",
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
    module: "inventory",
  },
  {
    title: "Workflow Types",
    href: "/workflows",
    icon: Cog,
    module: "workflows",
  },
  {
    title: "Workflows",
    href: "/workflows/templates",
    icon: GitBranch,
    module: "workflows",
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    module: "notifications",
  },
  {
    title: "Settings",
    icon: Settings,
    children: [
      {
        title: "Profile",
        href: "/settings",
        icon: Users,
      },
      {
        title: "Notification Preferences",
        href: "/settings?tab=notifications",
        icon: Bell,
      },
      {
        title: "Security",
        href: "/settings?tab=security",
        icon: Shield,
      },
    ],
  },
  {
    title: "Error Pages",
    icon: AlertTriangle,
    children: [
      {
        title: "400 Bad Request",
        href: "/error/400",
        icon: AlertTriangle,
      },
      {
        title: "401 Unauthorized",
        href: "/error/401",
        icon: AlertTriangle,
      },
      {
        title: "403 Forbidden",
        href: "/error/403",
        icon: AlertTriangle,
      },
      {
        title: "404 Not Found",
        href: "/error/404",
        icon: AlertTriangle,
      },
      {
        title: "500 Internal Server Error",
        href: "/error/500",
        icon: AlertTriangle,
      },
      {
        title: "501 Not Implemented",
        href: "/error/501",
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: "Configuration",
    icon: Cog,
    module: "configuration",
    children: [
      {
        title: "Data Import/Export Config",
        href: "/configuration/data-import-export",
        icon: Database,
        requiredPermission: "admin.data_config",
      },
      {
        title: "Permissions Config",
        href: "/configuration/permissions",
        icon: Shield,
        requiredPermission: "admin.permissions",
      },
      {
        title: "API Documentation",
        href: "/api-docs",
        icon: Book,
        module: "api-docs",
      },
    ],
  },
  {
    title: "Administration",
    icon: Shield,
    module: "administration",
    children: [
      {
        title: "System Monitoring",
        href: "/admin/system-monitoring",
        icon: Monitor,
        requiredPermission: "admin.monitoring",
      },
      {
        title: "Companies",
        href: "/admin/companies",
        icon: Building2,
        requiredPermission: "admin.companies",
      },
      {
        title: "Groups",
        href: "/admin/groups",
        icon: UsersRound,
        requiredPermission: "admin.groups",
      },
      {
        title: "Users",
        href: "/admin/users",
        icon: Users,
        requiredPermission: "admin.users",
      },
      {
        title: "Roles",
        href: "/admin/roles",
        icon: Shield,
        requiredPermission: "admin.roles",
      },
      {
        title: "Permissions",
        href: "/admin/permissions",
        icon: Key,
        requiredPermission: "admin.permissions",
      },
      {
        title: "Row Level Security",
        href: "/admin/rls",
        icon: Lock,
        requiredPermission: "admin.rls",
      },
      {
        title: "Event Logs",
        href: "/admin/events",
        icon: Activity,
        requiredPermission: "admin.events",
      },
      {
        title: "Audit Logs",
        href: "/admin/audit-logs",
        icon: FileText,
        requiredPermission: "admin.audit",
      },
      {
        title: "Configuration",
        href: "/admin/configuration",
        icon: Cog,
        requiredPermission: "admin.config",
      },
      {
        title: "Data Import",
        href: "/admin/data-import",
        icon: Upload,
        requiredPermission: "admin.users",
      },
      {
        title: "Data Export",
        href: "/admin/data-export",
        icon: Download,
        requiredPermission: "admin.users",
      },
    ],
  },
];
