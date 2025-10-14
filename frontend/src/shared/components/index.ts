// ============================================================================
// Component Index - Organized by Category
// ============================================================================

// Authentication Components
export {
  AuthGuard,
  RouteProtection,
  useAuthGuard,
  withAuthGuard,
} from "./auth";
export {
  AnalyticsDashboard,
  type KpiData,
} from "./data-visualization/analytics-dashboard";
export { default as CompactTable } from "./data-visualization/CompactTable";
export {
  QuickActionsWidget,
  RecentStatsWidget,
  SystemStatusWidget,
} from "./data-visualization/DashboardWidgets";
export { EnhancedListView } from "./data-visualization/EnhancedListView";
// Data Visualization Components
export {
  EnhancedDataTable,
  EnhancedDataTableBulkActions,
  EnhancedDataTableColumnHeader,
  EnhancedDataTableColumnOptionsHeader,
  EnhancedDataTableFilter,
  EnhancedDataTablePagination,
  EnhancedDataTableToolbar,
} from "./data-visualization/enhanced-data-table";
export {
  KanbanBoard,
  type KanbanColumn,
} from "./data-visualization/kanban-board";
export {
  type ListAction,
  type ListColumn,
  type ListItem,
  ListView,
} from "./data-visualization/list-view";
export { default as MobileTable } from "./data-visualization/MobileTable";
export { default as ResponsiveDashboard } from "./data-visualization/ResponsiveDashboard";
export { default as VirtualizedTable } from "./data-visualization/VirtualizedTable";
export {
  ConfirmationDialog,
  useConfirmationDialog,
} from "./feedback/ConfirmationDialog";
// Feedback Components
export { ErrorBoundary } from "./feedback/ErrorBoundary";
export {
  EmptyData,
  EmptyError,
  EmptyLoading,
  EmptySearch,
  EnhancedEmptyState,
} from "./feedback/enhanced-empty-state";
// Form Fields
export * from "./form-fields";
// Layout Components
export { default as AppLayout } from "./layout/AppLayout";
export { default as CompactPageLayout } from "./layout/CompactPageLayout";
export { default as ConditionalAppLayout } from "./layout/ConditionalAppLayout";
export { default as DashboardLayout } from "./layout/DashboardLayout";
export { default as EnhancedDashboardLayout } from "./layout/EnhancedDashboardLayout";
export { default as Header } from "./layout/Header";
// Media Components
export { default as OptimizedImage } from "./media/OptimizedImage";
export {
  default as AdvancedSearch,
  type SearchFilter,
  type SearchState,
} from "./navigation/AdvancedSearch";
export {
  default as BottomNavigation,
  useBottomNavigation,
} from "./navigation/BottomNavigation";
export { default as Breadcrumb } from "./navigation/Breadcrumb";
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
} from "./navigation/enhanced-sidebar";
export { default as MobileSearch } from "./navigation/MobileSearch";
export { default as MobileSidebar } from "./navigation/MobileSidebar";
// Navigation utilities
export * from "./navigation/menuConfig";
export * from "./navigation/menuUtils";
// Navigation Components
export { default as Sidebar } from "./navigation/Sidebar";
export { default as SidebarToggle } from "./navigation/SidebarToggle";
export { UserMenu } from "./navigation/UserMenu";
export { NuqsProvider } from "./providers/NuqsProvider";
// Provider Components
export { default as QueryProvider } from "./providers/QueryProvider";
// UI Utility Components
export { default as ActivityFeed } from "./ui/ActivityFeed";
// UI Components
export { Alert, AlertDescription, AlertTitle } from "./ui/alert";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
export { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
export { Badge, badgeVariants } from "./ui/badge";
export { Button, buttonVariants } from "./ui/button";
export { default as CompactCard } from "./ui/CompactCard";
export { default as CompactGrid } from "./ui/CompactGrid";
export { Calendar } from "./ui/calendar";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
export { Checkbox } from "./ui/checkbox";
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./ui/command";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
export {
  CompactThemeToggle,
  EnhancedThemeToggle,
  ThemeIndicator,
} from "./ui/EnhancedThemeToggle";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
export { default as InfiniteScrollList } from "./ui/InfiniteScrollList";
export { Input } from "./ui/input";
export { Label } from "./ui/label";
export { MultiSelect } from "./ui/multi-select";
export { default as PWAInstallPrompt } from "./ui/PWAInstallPrompt";
export { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
export { default as QuickActionButton } from "./ui/QuickActionButton";
export { default as QuickActionsMenu } from "./ui/QuickActionsMenu";
export { ResourceManagementExamples } from "./ui/ResourceExamples";
export { ScrollArea, ScrollBar } from "./ui/scroll-area";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
export { Separator } from "./ui/separator";
export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
export { Skeleton } from "./ui/skeleton";
export { Spinner } from "./ui/spinner";
export { Switch } from "./ui/switch";
export { default as ThemeCustomizer } from "./ui/ThemeCustomizer";
// Theme Components
export { ThemeSwitcher } from "./ui/ThemeSwitcher";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
export { Textarea } from "./ui/textarea";
export { ThemeDemo } from "./ui/theme-demo";
export { SimpleThemeToggle, ThemeToggle } from "./ui/theme-toggle";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
export { default as WindowControls } from "./ui/window-controls";
// Views
export { GenericFormView } from "./views/GenericFormView";
export { GenericKanbanView } from "./views/GenericKanbanView";
export { GenericListView } from "./views/GenericListView";
