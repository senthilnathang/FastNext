// DataImport Components

export { FieldMapper } from "./components/FieldMapper";

// Sub-components
export { FileUpload } from "./components/FileUpload";
export {
  ImportProgress,
  ImportProgressIndicator,
} from "./components/ImportProgress";
export { PermissionManager } from "./components/PermissionManager";
export { DataImport } from "./DataImport";

// Hooks
export { useDataImport } from "./hooks/useDataImport";
// Types
export type {
  DuplicateInfo,
  ImportColumn,
  ImportComponentProps,
  ImportError,
  ImportFieldMapping,
  ImportFormat,
  ImportJob,
  ImportOptions,
  ImportPermission,
  ImportPreview,
  ImportResponse,
  ImportValidationResult,
  ImportValidationRule,
  ImportWarning,
  ParsedData,
  UserImportPermissions,
} from "./types";
// Utilities
export {
  createPreview,
  detectFileFormat,
  parseCSV,
  parseExcel,
  parseFile,
  parseJSON,
  parseXML,
} from "./utils/parseUtils";
export {
  createFieldMappings,
  estimateImportTime,
  validateFileFormat,
  validateFileSize,
  validateImportData,
} from "./utils/validationUtils";
