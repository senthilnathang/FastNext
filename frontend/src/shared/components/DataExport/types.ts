export interface ExportColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object';
  required?: boolean;
  format?: string;
  description?: string;
}

export interface ExportFilter {
  column: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  label?: string;
}

export type ExportFormat = 'csv' | 'json' | 'excel' | 'xml' | 'yaml';

export interface ExportOptions {
  format: ExportFormat;
  columns: string[];
  filters: ExportFilter[];
  includeHeaders: boolean;
  fileName?: string;
  dateFormat?: string;
  delimiter?: string;
  encoding?: string;
  prettyPrint?: boolean;
  sheetName?: string;
  autoFitColumns?: boolean;
  freezeHeaders?: boolean;
  customDateFormat?: string;
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalRows?: number;
  processedRows?: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  estimatedSize?: number;
  actualSize?: number;
}

export interface ExportResponse {
  jobId?: string;
  downloadUrl?: string;
  status: string;
  estimatedRows?: number;
  message?: string;
}

export interface DataTableColumn {
  key: string;
  title: string;
  dataIndex: string;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'object';
  width?: number;
  fixed?: 'left' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  format?: (value: any) => string;
  render?: (value: any, record: any, index: number) => React.ReactNode;
}

export interface ExportPreview {
  columns: ExportColumn[];
  sampleData: Record<string, any>[];
  totalRows: number;
  estimatedSize: number;
}

export interface ExportComponentProps {
  tableName?: string;
  columns: ExportColumn[];
  data?: Record<string, any>[];
  totalRows?: number;
  filters?: ExportFilter[];
  onExport?: (options: ExportOptions) => Promise<ExportResponse>;
  onPreview?: (options: Partial<ExportOptions>) => Promise<ExportPreview>;
  maxRows?: number;
  allowedFormats?: ExportFormat[];
  defaultFormat?: ExportFormat;
  showPreview?: boolean;
  embedded?: boolean;
  className?: string;
}