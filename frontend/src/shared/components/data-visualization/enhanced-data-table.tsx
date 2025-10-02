'use client';

import {
  type Column,
  flexRender,
  type Table as ReactTable,
  type Row,
} from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  EyeOffIcon,
  PlusCircleIcon,
  Settings2Icon,
  X,
} from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/shared/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  type TableProps,
  TableRow,
} from '../ui/table';

export type DataTableProps<TData> = TableProps & {
  table: ReactTable<TData>;
  fixedHeader?: boolean;
  onRowClicked?: (row: Row<TData>) => void;
  showRowSelectionCount?: boolean;
  globalFilterValue?: string;
  onGlobalFilterChange?: (value: string) => void;
  globalFilterPlaceholder?: string;
};

function EnhancedDataTable<TData>({
  table,
  fixedHeader,
  onRowClicked,
  showRowSelectionCount = false,
  globalFilterValue,
  onGlobalFilterChange,
  globalFilterPlaceholder = "Search...",
  ...other
}: DataTableProps<TData>): React.JSX.Element {
  if (!table) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Table not initialized
      </div>
    );
  }

  const visibleColumns = table
    .getAllColumns()
    .filter((c) => c.getIsVisible()).length;
  const helperColumns = table
    .getAllColumns()
    .filter(
      (c) => (c.id === 'select' || c.id === 'actions') && c.getIsVisible()
    ).length;

  const flexColumns = visibleColumns - helperColumns;
  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          {/* Global Search */}
          {onGlobalFilterChange && (
            <Input
              placeholder={globalFilterPlaceholder}
              value={globalFilterValue ?? ""}
              onChange={(event) => onGlobalFilterChange(event.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
            />
          )}
          
          {/* Selection count */}
          {showRowSelectionCount && hasSelection && (
            <div className="flex items-center space-x-2">
              <div className="text-sm text-muted-foreground">
                {selectedRows.length} of {table.getFilteredRowModel().rows.length} row(s) selected
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.toggleAllPageRowsSelected(false)}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Column visibility toggle */}
        <EnhancedDataTableColumnOptionsHeader table={table} />
      </div>

      {/* Table Container */}
      <div className="rounded-md border">
        <Table {...other}>
          <TableHeader className={cn(fixedHeader && 'sticky top-0 z-20 bg-background shadow-sm')}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width:
                        header.column.getSize() !== 0
                          ? header.column.getSize()
                          : `${100 / flexColumns}%`,
                      minWidth:
                        header.column.getSize() !== 0
                          ? header.column.getSize()
                          : `${100 / flexColumns}%`,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    onRowClicked && 'cursor-pointer hover:bg-muted/50',
                    row.getIsSelected() && 'bg-muted/50'
                  )}
                  onClick={() => {
                    onRowClicked?.(row);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                    <div className="text-lg">No results found</div>
                    <div className="text-sm">Try adjusting your search or filters</div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <EnhancedDataTablePagination table={table} />
    </div>
  );
}

export type DataTableColumnHeaderProps<TData, TValue> =
  React.HTMLAttributes<HTMLDivElement> & {
    column: Column<TData, TValue>;
    title: string;
  };

function EnhancedDataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-sm data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDownIcon className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {column.getCanSort() && (
            <>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => column.toggleSorting(false)}
              >
                <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Sort ascending
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => column.toggleSorting(true)}
              >
                <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Sort descending
              </DropdownMenuItem>
            </>
          )}
          {column.getCanSort() && column.getCanHide() && (
            <DropdownMenuSeparator />
          )}
          {column.getCanHide() && (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => column.toggleVisibility(false)}
            >
              <EyeOffIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Hide column
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export type DataTableColumnOptionsHeaderProps<TData> = {
  table: ReactTable<TData>;
};

function EnhancedDataTableColumnOptionsHeader<TData>({
  table,
}: DataTableColumnOptionsHeaderProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto h-8 flex"
        >
          <Settings2Icon className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== 'undefined' && column.getCanHide()
          )
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {(
                column.columnDef.meta as typeof column.columnDef.meta & {
                  title?: string;
                }
              )?.title ?? column.columnDef.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type DataTablePaginationProps<TData> = {
  table: ReactTable<TData>;
  pageSizeOptions?: number[];
  showRowsPerPage?: boolean;
  showPageInfo?: boolean;
};

function EnhancedDataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  showRowsPerPage = true,
  showPageInfo = true,
}: DataTablePaginationProps<TData>): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        {showRowsPerPage && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {showPageInfo && (
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export type DataTableBulkActionsProps<TData> = React.PropsWithChildren<{
  table: ReactTable<TData>;
  className?: string;
}>;

function EnhancedDataTableBulkActions<TData>({
  table,
  children,
  className,
}: DataTableBulkActionsProps<TData>): React.JSX.Element {
  const selectedRows = table.getSelectedRowModel().rows;
  
  if (selectedRows.length === 0) {
    return <></>;
  }

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 z-50 flex h-16 max-w-md -translate-x-1/2 items-center justify-between rounded-lg border bg-background px-6 py-3 shadow-lg animate-in slide-in-from-bottom-2",
      className
    )}>
      <div className="flex items-center space-x-2">
        <p className="text-sm font-semibold">
          {selectedRows.length} selected
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.toggleAllPageRowsSelected(false)}
          className="h-8 px-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        {children}
      </div>
    </div>
  );
}

export type DataTableFilterProps = {
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
};

function EnhancedDataTableFilter({
  title,
  options,
  selected,
  onChange,
  className,
}: DataTableFilterProps) {
  const selectedValues = new Set(selected);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 border-dashed", className)}
        >
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} className="h-9" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      onChange(filterValues.length ? filterValues : []);
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type DataTableToolbarProps<TData> = {
  table: ReactTable<TData>;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

function EnhancedDataTableToolbar<TData>({
  table,
  globalFilter,
  onGlobalFilterChange,
  filters,
  actions,
  className,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex flex-1 items-center space-x-2">
        {onGlobalFilterChange && (
          <Input
            placeholder="Search..."
            value={globalFilter ?? ""}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {filters}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {actions}
        <EnhancedDataTableColumnOptionsHeader table={table} />
      </div>
    </div>
  );
}

export {
  EnhancedDataTable,
  EnhancedDataTableBulkActions,
  EnhancedDataTableColumnHeader,
  EnhancedDataTableColumnOptionsHeader,
  EnhancedDataTableFilter,
  EnhancedDataTablePagination,
  EnhancedDataTableToolbar,
};