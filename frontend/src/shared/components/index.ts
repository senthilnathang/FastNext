// ============================================================================
// Component Index - Organized by Category
// ============================================================================

// UI Components
export { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from './ui/alert-dialog';
export { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
export { Badge, badgeVariants } from './ui/badge';
export { Button, buttonVariants } from './ui/button';
export { Calendar } from './ui/calendar';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
export { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
export { Checkbox } from './ui/checkbox';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from './ui/command';
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './ui/dropdown-menu';
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
export { Input } from './ui/input';
export { Label } from './ui/label';
export { MultiSelect } from './ui/multi-select';
export { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
export { Separator } from './ui/separator';
export { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
export { Skeleton } from './ui/skeleton';
export { Spinner } from './ui/spinner';
export { Switch } from './ui/switch';
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './ui/table';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
export { Textarea } from './ui/textarea';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// Theme Components
export { ThemeSwitcher } from './ui/ThemeSwitcher';
export { default as ThemeCustomizer } from './ui/ThemeCustomizer';
export { EnhancedThemeToggle, CompactThemeToggle, ThemeIndicator } from './ui/EnhancedThemeToggle';
export { ThemeToggle, SimpleThemeToggle } from './ui/theme-toggle';
export { ThemeDemo } from './ui/theme-demo';

// UI Utility Components
export { default as ActivityFeed } from './ui/ActivityFeed';
export { default as InfiniteScrollList } from './ui/InfiniteScrollList';
export { default as CompactCard } from './ui/CompactCard';
export { default as CompactGrid } from './ui/CompactGrid';
export { default as QuickActionButton } from './ui/QuickActionButton';
export { default as QuickActionsMenu } from './ui/QuickActionsMenu';
export { default as PWAInstallPrompt } from './ui/PWAInstallPrompt';
export { ResourceManagementExamples } from './ui/ResourceExamples';
export { default as WindowControls } from './ui/window-controls';

// Layout Components
export { default as AppLayout } from './layout/AppLayout';
export { default as ConditionalAppLayout } from './layout/ConditionalAppLayout';
export { default as DashboardLayout } from './layout/DashboardLayout';
export { default as EnhancedDashboardLayout } from './layout/EnhancedDashboardLayout';
export { default as CompactPageLayout } from './layout/CompactPageLayout';
export { default as Header } from './layout/Header';

// Navigation Components
export { default as Sidebar } from './navigation/Sidebar';
export {
  EnhancedSidebar,
  EnhancedSidebarContent,
  EnhancedSidebarFooter,
  EnhancedSidebarGroup,
  EnhancedSidebarGroupAction,
  EnhancedSidebarGroupContent,
  EnhancedSidebarGroupLabel,
  EnhancedSidebarHeader,
  EnhancedSidebarInput,
  EnhancedSidebarInset,
  EnhancedSidebarMenu,
  EnhancedSidebarMenuButton,
  EnhancedSidebarMenuItem,
  EnhancedSidebarMenuSkeleton,
  EnhancedSidebarProvider,
  EnhancedSidebarRail,
  EnhancedSidebarSeparator,
  EnhancedSidebarTrigger,
  useEnhancedSidebar,
} from './navigation/enhanced-sidebar';
export { default as MobileSidebar } from './navigation/MobileSidebar';
export { default as SidebarToggle } from './navigation/SidebarToggle';
export { default as BottomNavigation, useBottomNavigation } from './navigation/BottomNavigation';
export { default as Breadcrumb } from './navigation/Breadcrumb';
export { UserMenu } from './navigation/UserMenu';
export { default as AdvancedSearch, type SearchState, type SearchFilter } from './navigation/AdvancedSearch';
export { default as MobileSearch } from './navigation/MobileSearch';

// Data Visualization Components
export { DataTable, ActionColumn } from './data-visualization/data-table';
export {
  EnhancedDataTable,
  EnhancedDataTableBulkActions,
  EnhancedDataTableColumnHeader,
  EnhancedDataTableColumnOptionsHeader,
  EnhancedDataTableFilter,
  EnhancedDataTablePagination,
  EnhancedDataTableToolbar,
} from './data-visualization/enhanced-data-table';
export { default as VirtualizedTable } from './data-visualization/VirtualizedTable';
export { default as CompactTable } from './data-visualization/CompactTable';
export { default as MobileTable } from './data-visualization/MobileTable';
export { KanbanBoard, type KanbanColumn } from './data-visualization/kanban-board';
export { ListView, type ListColumn, type ListItem, type ListAction } from './data-visualization/list-view';
export { EnhancedListView } from './data-visualization/EnhancedListView';
export { AnalyticsDashboard, type KpiData } from './data-visualization/analytics-dashboard';
export { QuickActionsWidget, SystemStatusWidget, RecentStatsWidget } from './data-visualization/DashboardWidgets';
export { default as ResponsiveDashboard } from './data-visualization/ResponsiveDashboard';

// Feedback Components
export { ErrorBoundary } from './feedback/ErrorBoundary';
export { ConfirmationDialog, useConfirmationDialog } from './feedback/ConfirmationDialog';
export {
  EnhancedEmptyState,
  EmptySearch,
  EmptyData,
  EmptyError,
  EmptyLoading,
} from './feedback/enhanced-empty-state';

// Media Components
export { default as OptimizedImage } from './media/OptimizedImage';

// Provider Components
export { default as QueryProvider } from './providers/QueryProvider';
export { NuqsProvider } from './providers/NuqsProvider';

// Form Fields
export * from './form-fields';

// Views
export { GenericFormView } from './views/GenericFormView';
export { GenericKanbanView } from './views/GenericKanbanView';
export { GenericListView } from './views/GenericListView';

// Authentication Components
export { AuthGuard, RouteProtection, withAuthGuard, useAuthGuard } from './auth';

// Navigation utilities
export * from './navigation/menuConfig';
export * from './navigation/menuUtils';