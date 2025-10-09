import {
  Home,
  Settings,
  Users,
  Shield,
  Key,
  Building2,
  Book,
  Workflow,
  Package,
  Cog,
  Database,
  Activity,
  Upload,
  Download,
  Monitor,
  FileText,
  Lock
} from 'lucide-react';

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
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: Building2,
    module: 'projects',
  },
  {
    title: 'Products',
    href: '/products',
    icon: Package,
    module: 'inventory',
  },
  {
    title: 'Workflows',
    href: '/workflows',
    icon: Workflow,
    module: 'workflows',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
   },
  {
    title: 'Configuration',
    icon: Cog,
    module: 'configuration',
    children: [
      {
        title: 'Data Import/Export Config',
        href: '/configuration/data-import-export',
        icon: Database,
        requiredPermission: 'admin.data_config',
      },
      {
        title: 'Permissions Config',
        href: '/configuration/permissions',
        icon: Shield,
        requiredPermission: 'admin.permissions',
      },
      {
    	title: 'API Documentation',
        href: '/api-docs',
    	icon: Book,
    	module: 'api-docs',
      }
    ],
  },
  {
    title: 'Administration',
    icon: Shield,
    module: 'administration',
    children: [
      {
        title: 'System Monitoring',
        href: '/admin/system-monitoring',
        icon: Monitor,
        requiredPermission: 'admin.monitoring',
      },
      {
        title: 'Users',
        href: '/admin/users',
        icon: Users,
        requiredPermission: 'admin.users',
      },
      {
        title: 'Roles',
        href: '/admin/roles',
        icon: Shield,
        requiredPermission: 'admin.roles',
      },
      {
        title: 'Permissions',
        href: '/admin/permissions',
        icon: Key,
        requiredPermission: 'admin.permissions',
      },
      {
        title: 'Row Level Security',
        href: '/admin/rls',
        icon: Lock,
        requiredPermission: 'admin.rls',
      },
      {
        title: 'Event Logs',
        href: '/admin/events',
        icon: Activity,
        requiredPermission: 'admin.events',
      },
      {
        title: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: FileText,
        requiredPermission: 'admin.audit',
      },
      {
        title: 'Configuration',
        href: '/admin/configuration',
        icon: Cog,
        requiredPermission: 'admin.config',
      },
      {
        title: 'Data Import',
        href: '/admin/data-import',
        icon: Upload,
        requiredPermission: 'admin.users',
      },
      {
        title: 'Data Export',
        href: '/admin/data-export',
        icon: Download,
        requiredPermission: 'admin.users',
      },
    ],
  },
];