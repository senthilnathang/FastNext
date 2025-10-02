import {
  Home,
  Settings,
  Users,
  Shield,
  Key,
  Building2,
  Book,
  Workflow,
  Sparkles,
  Package,
  Cog,
  Database,
  Activity
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
    title: 'Workflows',
    href: '/workflows',
    icon: Workflow,
    module: 'workflows',
  },
  {
    title: 'API Documentation',
    href: '/api-docs',
    icon: Book,
    module: 'api-docs',
  },
  {
    title: 'Products',
    href: '/products',
    icon: Package,
    module: 'inventory',
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
      }
    ],
  },
  {
    title: 'Administration',
    icon: Shield,
    module: 'administration',
    children: [
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
        title: 'Enhanced Roles',
        href: '/admin/roles-enhanced',
        icon: Sparkles,
        requiredPermission: 'admin.roles',
      },
      {
        title: 'Enhanced Permissions',
        href: '/admin/permissions-enhanced',
        icon: Sparkles,
        requiredPermission: 'admin.permissions',
      },
      {
        title: 'Event Logs',
        href: '/admin/events',
        icon: Activity,
        requiredPermission: 'admin.events',
      },
    ],
  },
];