import {
  Home,
  Settings,
  Users,
  Shield,
  Key,
  Activity,
  Building2,
  Layers,
  BarChart3,
  FileText,
  Brain,
  CheckCircle,
  Database,
  Clock,
  FileCheck,
  Globe,
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
    title: 'Builder',
    href: '/builder',
    icon: Layers,
    module: 'builder',
  },
  {
    title: 'Compliance',
    icon: CheckCircle,
    module: 'compliance',
    children: [
      {
        title: 'AI Trust Center',
        href: '/compliance/ai-trust',
        icon: Brain,
        requiredPermission: 'compliance.ai-trust',
      },
      {
        title: 'Policy Dashboard',
        href: '/compliance/policies',
        icon: FileCheck,
        requiredPermission: 'compliance.policies',
      },
      {
        title: 'Framework',
        href: '/compliance/framework',
        icon: Globe,
        requiredPermission: 'compliance.framework',
      },
    ],
  },
  {
    title: 'AI Management',
    icon: Brain,
    module: 'ai-management',
    children: [
      {
        title: 'Model Inventory',
        href: '/ai/models',
        icon: Database,
        requiredPermission: 'ai.models',
      },
      {
        title: 'Fairness Dashboard',
        href: '/ai/fairness',
        icon: Activity,
        requiredPermission: 'ai.fairness',
      },
      {
        title: 'Performance Metrics',
        href: '/ai/metrics',
        icon: BarChart3,
        requiredPermission: 'ai.metrics',
      },
    ],
  },
  {
    title: 'Operations',
    icon: Settings,
    module: 'operations',
    children: [
      {
        title: 'Tasks',
        href: '/operations/tasks',
        icon: Clock,
        requiredPermission: 'operations.tasks',
      },
      {
        title: 'Reporting',
        href: '/operations/reports',
        icon: FileText,
        requiredPermission: 'operations.reports',
      },
      {
        title: 'File Manager',
        href: '/operations/files',
        icon: FileText,
        requiredPermission: 'operations.files',
      },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    children: [
      {
        title: 'Profile',
        href: '/settings',
       icon: Users,
      },
      {
       title: 'Security',
       href: '/settings?tab=security',
        icon: Shield,
      },
      {
       title: 'Password',
        href: '/settings?tab=password',
        icon: Key,
      },
      {
        title: 'Activity',
        href: '/settings?tab=activity',
        icon: Activity,
      },
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
    ],
  },
];