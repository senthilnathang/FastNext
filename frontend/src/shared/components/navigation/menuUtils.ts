import { MenuItem } from './menuConfig';

export interface MenuFilterOptions {
  canAccessModule: (module: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const filterMenuItems = (
  items: MenuItem[],
  options: MenuFilterOptions
): MenuItem[] => {
  return items.filter(item => {
    if (item.module && !options.canAccessModule(item.module)) {
      return false;
    }

    if (item.requiredPermission && !options.hasPermission(item.requiredPermission)) {
      return false;
    }

    if (item.children) {
      item.children = filterMenuItems(item.children, options);
      return item.children.length > 0;
    }

    return true;
  });
};

export const getPageTitle = (pathname: string): string => {
  const titleMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/projects': 'Projects',
    '/builder': 'Builder',
    '/settings': 'Settings',
    '/admin/users': 'User Management',
    '/admin/roles': 'Role Management',
    '/admin/permissions': 'Permission Management',
    '/admin/data-import': 'Data Import',
    '/admin/data-export': 'Data Export',
    '/admin/events': 'Event Logs',
    '/compliance/ai-trust': 'AI Trust Center',
    '/compliance/policies': 'Policy Dashboard',
    '/compliance/framework': 'Compliance Framework',
    '/ai/models': 'Model Inventory',
    '/ai/fairness': 'Fairness Dashboard',
    '/ai/metrics': 'Performance Metrics',
    '/operations/tasks': 'Tasks',
    '/operations/reports': 'Reporting',
    '/operations/files': 'File Manager',
  };

  return titleMap[pathname] || 'FastNext Platform';
};
