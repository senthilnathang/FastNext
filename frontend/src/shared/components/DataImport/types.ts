'use client';

export interface ImportColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'email' | 'url';
  required?: boolean;
  unique?: boolean;
  validation?: ImportValidationRule[];
  transform?: (value: any) => any;
  defaultValue?: any;
  description?: string;
}

export interface ImportValidationRule {
  type: 'required' | 'email' | 'url' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any, row: Record<string, any>) => boolean | string;
}

export interface ImportFieldMapping {
  sourceColumn: string;
  targetColumn: string;
  transform?: string;
  skipEmpty?: boolean;
}

export interface ImportOptions {
  format: ImportFormat;
  hasHeaders: boolean;
  delimiter?: string;
  encoding?: string;
  dateFormat?: string;
  skipEmptyRows?: boolean;
  skipFirstRows?: number;
  maxRows?: number;
  onDuplicate?: 'skip' | 'update' | 'error';
  validateOnly?: boolean;
  batchSize?: number;
}

export type ImportFormat = 'csv' | 'json' | 'excel' | 'xml';

export interface ImportJob {
  id: string;
  status: 'pending' | 'parsing' | 'validating' | 'importing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalRows?: number;
  processedRows?: number;
  validRows?: number;
  errorRows?: number;
  errors?: ImportError[];
  warnings?: ImportWarning[];
  createdAt: string;
  completedAt?: string;
  fileName?: string;
  fileSize?: number;
  importedData?: Record<string, any>[];
  validationResults?: ImportValidationResult;
}

export interface ImportError {
  row: number;
  column?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
}

export interface ImportWarning {
  row: number;
  column?: string;
  field?: string;
  message: string;
  value?: any;
}

export interface ImportValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warnings: ImportWarning[];
  errors: ImportError[];
  duplicates?: DuplicateInfo[];
}

export interface DuplicateInfo {
  rows: number[];
  field: string;
  value: any;
  action: 'skip' | 'update' | 'import';
}

export interface ImportPreview {
  headers: string[];
  sampleData: Record<string, any>[];
  totalRows: number;
  detectedFormat?: ImportFormat;
  suggestedMappings?: ImportFieldMapping[];
  columns: ImportColumn[];
}

export interface ImportPermission {
  canImport: boolean;
  canValidate: boolean;
  canPreview: boolean;
  maxFileSize?: number;
  maxRows?: number;
  allowedFormats?: ImportFormat[];
  allowedTables?: string[];
  requireApproval?: boolean;
  approvers?: string[];
}

export interface UserImportPermissions {
  userId: string;
  username: string;
  email: string;
  role: string;
  permissions: ImportPermission;
  lastImport?: string;
  importCount?: number;
}

export interface ImportResponse {
  jobId?: string;
  status: string;
  message?: string;
  validationResults?: ImportValidationResult;
  importedRows?: number;
  errors?: ImportError[];
}

export interface ImportComponentProps {
  tableName?: string;
  columns: ImportColumn[];
  onImport?: (data: Record<string, any>[], options: ImportOptions) => Promise<ImportResponse>;
  onValidate?: (data: Record<string, any>[], mappings: ImportFieldMapping[]) => Promise<ImportValidationResult>;
  onPreview?: (file: File, options: Partial<ImportOptions>) => Promise<ImportPreview>;
  maxFileSize?: number;
  maxRows?: number;
  allowedFormats?: ImportFormat[];
  defaultFormat?: ImportFormat;
  showPreview?: boolean;
  requireValidation?: boolean;
  permissions?: ImportPermission;
  embedded?: boolean;
  className?: string;
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}