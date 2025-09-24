export interface DataTableAction<TData = any> {
  label: string
  icon?: React.ComponentType<any>
  onClick: (row: TData) => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  disabled?: (row: TData) => boolean
}

export interface DataTableColumn<TData = any> {
  id: string
  label: string
  accessor?: keyof TData | string
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  render?: (value: any, row: TData) => React.ReactNode
  width?: string | number
  minWidth?: string | number
  maxWidth?: string | number
  align?: 'left' | 'center' | 'right'
  canHide?: boolean
  sticky?: boolean
}

export interface DataTableFilter {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'search'
  options?: Array<{ label: string; value: string; icon?: React.ComponentType<any> }>
  placeholder?: string
  defaultValue?: any
}

export interface DataTableConfig<TData = any> {
  columns: DataTableColumn<TData>[]
  actions?: DataTableAction<TData>[]
  filters?: DataTableFilter[]
  searchableColumns?: string[]
  defaultPageSize?: number
  pageSizeOptions?: number[]
  enableSelection?: boolean
  enableSorting?: boolean
  enableFiltering?: boolean
  enableColumnVisibility?: boolean
  enableExport?: boolean
  exportFileName?: string
  exportFormats?: Array<'csv' | 'excel' | 'json'>
  emptyMessage?: string
  loadingMessage?: string
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json'
  filename?: string
  selectedOnly?: boolean
  visibleColumnsOnly?: boolean
}