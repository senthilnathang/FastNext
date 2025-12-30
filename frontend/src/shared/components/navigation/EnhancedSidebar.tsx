"use client";

import {
  ChevronDown,
  ChevronRight,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Settings,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useUserRole } from "@/modules/admin/hooks/useUserRole";
import { useAuth } from "@/modules/auth";
import { cn } from "@/shared/utils";
import { CompanySwitcher, type Company } from "../company/CompanySwitcher";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { type MenuItem, menuItems } from "./menuConfig";
import { filterMenuItems } from "./menuUtils";

// Mock companies for demonstration - in a real app, this would come from an API
const mockCompanies: Company[] = [
  {
    id: "1",
    name: "Acme Corporation",
    slug: "acme-corp",
    description: "Technology Company",
    isDefault: true,
  },
  {
    id: "2",
    name: "Globex Inc",
    slug: "globex-inc",
    description: "Finance Company",
  },
  {
    id: "3",
    name: "Initech",
    slug: "initech",
    description: "Consulting Services",
  },
];

interface SidebarItemProps {
  item: MenuItem;
  level?: number;
  expandedItems: string[];
  onToggleExpanded: (title: string) => void;
  isCollapsed?: boolean;
  isHovered?: boolean;
}

function SidebarItem({
  item,
  level = 0,
  expandedItems,
  onToggleExpanded,
  isCollapsed = false,
  isHovered = false,
}: SidebarItemProps) {
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.includes(item.title);
  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href)
    : false;
  const hasActiveChild =
    hasChildren &&
    item.children?.some(
      (child) =>
        child.href &&
        (pathname === child.href || pathname.startsWith(child.href)),
    );

  const handleToggle = () => {
    if (hasChildren) {
      onToggleExpanded(item.title);
    }
  };

  const showText = !isCollapsed || isHovered;

  const ItemContent = () => (
    <>
      <item.icon className="w-5 h-5 flex-shrink-0" />
      {showText && (
        <>
          <span className="flex-1 text-left ml-3 transition-opacity duration-200">
            {item.title}
          </span>
          {hasChildren && (
            <div className="flex-shrink-0 transition-transform duration-200">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          )}
        </>
      )}
    </>
  );

  const itemClasses = cn(
    "flex items-center w-full text-sm font-medium rounded-lg transition-all duration-200",
    "hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:scale-[1.02]",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
    {
      "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shadow-sm":
        isActive || hasActiveChild,
      "text-gray-700 dark:text-gray-300": !isActive && !hasActiveChild,
      "px-3 py-2.5": showText,
      "px-2 py-2 justify-center": !showText,
      "pl-6": level > 0 && showText,
    },
  );

  const renderItem = () => {
    const content = hasChildren ? (
      <button onClick={handleToggle} className={itemClasses}>
        <ItemContent />
      </button>
    ) : (
      <Link href={item.href || "#"} className={itemClasses}>
        <ItemContent />
      </Link>
    );

    if (isCollapsed && !isHovered) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="font-medium">
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <div>
      {renderItem()}

      {hasChildren && isExpanded && showText && (
        <div className="ml-3 mt-1 space-y-1 overflow-hidden transition-all duration-300">
          {item.children?.map((child) => (
            <SidebarItem
              key={child.title}
              item={child}
              level={level + 1}
              expandedItems={expandedItems}
              onToggleExpanded={onToggleExpanded}
              isCollapsed={isCollapsed}
              isHovered={isHovered}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface EnhancedSidebarProps {
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function EnhancedSidebar({
  className,
  onClose,
  showCloseButton = false,
  isCollapsed = false,
  onToggleCollapse,
}: EnhancedSidebarProps) {
  const { canAccessModule, hasPermission } = useUserRole();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Settings",
    "Administration",
  ]);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);

  const handleCompanyChange = useCallback((company: Company) => {
    // Handle company change - could trigger data refresh, update context, etc.
    console.log("Company changed to:", company.name);
  }, []);

  const handleAddCompany = useCallback(() => {
    router.push("/admin/companies/new");
  }, [router]);

  // Load expanded items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-expanded-items");
    if (saved) {
      try {
        setExpandedItems(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading sidebar state:", error);
      }
    }
  }, []);

  // Save expanded items to localStorage
  useEffect(() => {
    localStorage.setItem(
      "sidebar-expanded-items",
      JSON.stringify(expandedItems),
    );
  }, [expandedItems]);

  const handleToggleExpanded = useCallback((itemTitle: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemTitle)
        ? prev.filter((item) => item !== itemTitle)
        : [...prev, itemTitle],
    );
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (isCollapsed) {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }
      const timer = setTimeout(() => {
        setIsHovered(true);
      }, 150); // Small delay for better UX
      setHoverTimer(timer);
    }
  }, [isCollapsed, hoverTimer]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    setIsHovered(false);
  }, [hoverTimer]);

  const filteredMenuItems = filterMenuItems(menuItems, {
    canAccessModule,
    hasPermission,
  });

  const sidebarWidth = isCollapsed ? (isHovered ? "w-64" : "w-16") : "w-64";

  return (
    <TooltipProvider>
      <div
        className={cn(
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full",
          "transition-all duration-300 ease-in-out transform",
          "hover:shadow-lg dark:hover:shadow-gray-900/20",
          sidebarWidth,
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Logo Section */}
        <div
          className={cn(
            "border-b border-gray-200 dark:border-gray-800 flex items-center justify-between transition-all duration-300",
            isCollapsed && !isHovered ? "p-3" : "p-6",
          )}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-bold text-lg">FN</span>
            </div>
            {(!isCollapsed || isHovered) && (
              <div className="min-w-0 flex-1 transition-opacity duration-200">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  FastNext
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Enterprise Platform
                </p>
              </div>
            )}
          </div>

          {/* Toggle button - only show when not hovered */}
          {onToggleCollapse && (!isCollapsed || !isHovered) && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200",
                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
              )}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Mobile close button */}
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Company Switcher */}
        {(!isCollapsed || isHovered) && mockCompanies.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <CompanySwitcher
              companies={mockCompanies}
              onCompanyChange={handleCompanyChange}
              onAddCompany={handleAddCompany}
              showAddButton={hasPermission("admin.companies")}
              size="sm"
              className="w-full"
            />
          </div>
        )}

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600",
            isCollapsed && !isHovered ? "p-2" : "p-4",
          )}
        >
          <div className="space-y-1">
            {filteredMenuItems.map((item) => (
              <SidebarItem
                key={item.title}
                item={item}
                expandedItems={expandedItems}
                onToggleExpanded={handleToggleExpanded}
                isCollapsed={isCollapsed}
                isHovered={isHovered}
              />
            ))}
          </div>

          {/* Quick Settings - only when collapsed */}
          {isCollapsed && !isHovered && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/settings"
                    className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <p>Quick Settings</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </nav>

        {/* User Section */}
        {user && (
          <div
            className={cn(
              "border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300",
              isCollapsed && !isHovered ? "p-2" : "p-4",
            )}
          >
            <div
              className={cn(
                "flex items-center mb-3 transition-all duration-200",
                isCollapsed && !isHovered ? "justify-center" : "space-x-3",
              )}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 dark:bg-gradient-to-br dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              {(!isCollapsed || isHovered) && (
                <div className="flex-1 min-w-0 transition-opacity duration-200">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed || isHovered ? (
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="w-full justify-start transition-all duration-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="w-full justify-center px-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
