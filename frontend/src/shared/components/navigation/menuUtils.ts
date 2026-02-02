import type { MenuItem } from "./menuConfig";
import type { ModuleMenuItem } from "@/lib/api/modules";
import * as LucideIcons from "lucide-react";

export interface MenuFilterOptions {
  canAccessModule: (module: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const filterMenuItems = (
  items: MenuItem[],
  options: MenuFilterOptions,
): MenuItem[] => {
  return items.filter((item) => {
    if (item.module && !options.canAccessModule(item.module)) {
      return false;
    }

    if (
      item.requiredPermission &&
      !options.hasPermission(item.requiredPermission)
    ) {
      return false;
    }

    if (item.children) {
      item.children = filterMenuItems(item.children, options);
      return item.children.length > 0;
    }

    return true;
  });
};

export const getPageTitle = (pathname: string, search?: string): string => {
  const titleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/projects": "Projects",
    "/workflows": "Workflow Types",
    "/workflows/templates": "Workflow Templates",
    "/workflows/templates/create": "Create Workflow Template",
    "/builder": "Builder",
    "/settings": "Settings",
    "/error/400": "400 Bad Request",
    "/error/401": "401 Unauthorized",
    "/error/403": "403 Forbidden",
    "/error/404": "404 Not Found",
    "/error/500": "500 Internal Server Error",
    "/error/501": "501 Not Implemented",
    "/admin/users": "User Management",
    "/admin/roles": "Role Management",
    "/admin/permissions": "Permission Management",
    "/admin/data-import": "Data Import",
    "/admin/data-export": "Data Export",
    "/admin/events": "Event Logs",
    "/admin/audit-logs": "Audit Logs",
    "/admin/system-monitoring": "System Monitoring",
    "/admin/configuration": "Configuration",
    "/admin/modules": "Modules",
    "/admin/companies": "Companies",
    "/admin/groups": "Groups",
    "/admin/rls": "Row Level Security",
    "/admin/scheduled-actions": "Scheduled Actions",
    "/admin/automation": "Automation",
    "/admin/workflows": "Workflows",
    "/admin/templates": "Templates",
    "/admin/translations": "Translations",
    "/admin/webhooks": "Webhooks",
    "/admin/record-rules": "Record Rules",
    "/admin/schema": "Schema Management",
    "/admin/exports": "Exports & Imports",
    "/compliance/ai-trust": "AI Trust Center",
    "/compliance/policies": "Policy Dashboard",
    "/compliance/framework": "Compliance Framework",
    "/ai/models": "Model Inventory",
    "/ai/fairness": "Fairness Dashboard",
    "/ai/metrics": "Performance Metrics",
    "/operations/tasks": "Tasks",
    "/operations/reports": "Reporting",
    "/operations/files": "File Manager",
    // Module page titles are loaded dynamically from installed modules
  };

  // Handle dynamic routes
  if (pathname.startsWith("/workflows/templates/") && pathname.includes("/builder")) {
    return "Workflow Builder";
  }

  return titleMap[pathname] || "FastNext Platform";
};

/**
 * Convert an icon name string to a Lucide icon component
 */
export const getIconComponent = (iconName?: string): React.ComponentType<{ className?: string }> => {
  if (!iconName) {
    return LucideIcons.Box;
  }

  // Convert icon name formats (e.g., "package", "Package", "PackageIcon") to PascalCase
  const normalizedName = iconName
    .replace(/Icon$/, '')
    .replace(/-./g, (x) => x[1].toUpperCase())
    .replace(/^./, (x) => x.toUpperCase());

  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const icon = icons[normalizedName];
  return icon || LucideIcons.Box;
};

/**
 * Merge module menu items with base menu items
 * Module menus can specify a parent to be added as children
 */
export const mergeModuleMenus = (
  baseItems: MenuItem[],
  moduleMenus: ModuleMenuItem[]
): MenuItem[] => {
  // Deep clone base items to avoid mutation
  const result = JSON.parse(JSON.stringify(baseItems)) as MenuItem[];

  // Restore icon functions (JSON.parse loses them)
  const restoreIcons = (items: MenuItem[], originals: MenuItem[]) => {
    items.forEach((item, index) => {
      item.icon = originals[index].icon;
      if (item.children && originals[index].children) {
        restoreIcons(item.children, originals[index].children!);
      }
    });
  };
  restoreIcons(result, baseItems);

  // Group module menus by parent
  const topLevelMenus: ModuleMenuItem[] = [];
  const childMenus: Record<string, ModuleMenuItem[]> = {};

  moduleMenus.forEach((menu) => {
    if (menu.parent) {
      if (!childMenus[menu.parent]) {
        childMenus[menu.parent] = [];
      }
      childMenus[menu.parent].push(menu);
    } else {
      topLevelMenus.push(menu);
    }
  });

  // Helper to find and add children to a menu item
  const addChildrenToParent = (items: MenuItem[], parentTitle: string, children: ModuleMenuItem[]) => {
    for (const item of items) {
      if (item.title === parentTitle) {
        if (!item.children) {
          item.children = [];
        }
        children
          .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
          .forEach((child) => {
            item.children!.push({
              title: child.title,
              href: child.href,
              icon: getIconComponent(child.icon),
              requiredPermission: child.permission,
              module: child.module,
            });
          });
        return true;
      }
      if (item.children && addChildrenToParent(item.children, parentTitle, children)) {
        return true;
      }
    }
    return false;
  };

  // First, add child menus to existing base items
  Object.entries(childMenus).forEach(([parent, children]) => {
    addChildrenToParent(result, parent, children);
  });

  // Add top-level menus (with their children if any)
  topLevelMenus
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
    .forEach((menu) => {
      const menuItem: MenuItem = {
        title: menu.title,
        href: menu.href,
        icon: getIconComponent(menu.icon),
        requiredPermission: menu.permission,
        module: menu.module,
      };

      // Check if this menu has children waiting
      const menuChildren = childMenus[menu.title];
      if (menuChildren && menuChildren.length > 0) {
        menuItem.children = menuChildren
          .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
          .map((child) => ({
            title: child.title,
            href: child.href,
            icon: getIconComponent(child.icon),
            requiredPermission: child.permission,
            module: child.module,
          }));
      }

      result.push(menuItem);
    });

  return result;
};
