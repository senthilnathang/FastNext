import {
  Home,
  Settings,
  Users,
  Shield,
  Key,
  Activity,
  Building2,
  BarChart3,
  FileText,
  Brain,
  CheckCircle,
  Database,
  Clock,
  FileCheck,
  Globe,
  Book,
  Workflow,
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
    title: 'Settings',
    href: '/settings',
    icon: Settings,
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
    ],
  },
];