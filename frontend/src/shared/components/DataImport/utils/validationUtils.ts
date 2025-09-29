'use client';

import type {
  ImportColumn,
  ImportValidationRule,
  ImportFieldMapping,
  ImportValidationResult,
  ImportError,
  ImportWarning,
  DuplicateInfo
} from '../types';

export function validateImportData(
  data: Record<string, any>[],
  columns: ImportColumn[],
  mappings: ImportFieldMapping[]
): ImportValidationResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  const duplicates: DuplicateInfo[] = [];
  
  // Create mapping lookup
  const mappingLookup = new Map<string, ImportFieldMapping>();
  mappings.forEach(mapping => {
    mappingLookup.set(mapping.sourceColumn, mapping);
  });
  
  // Create column lookup
  const columnLookup = new Map<string, ImportColumn>();
  columns.forEach(column => {
    columnLookup.set(column.key, column);
  });
  
  // Track unique field values for duplicate detection
  const uniqueTracking = new Map<string, Map<any, number[]>>();
  
  // Initialize unique tracking for columns marked as unique
  columns.forEach(column => {
    if (column.unique) {
      uniqueTracking.set(column.key, new Map());
    }
  });
  
  // Validate each row
  data.forEach((row, rowIndex) => {
    const processedRow: Record<string, any> = {};
    
    // Process mapped fields
    mappings.forEach(mapping => {
      const sourceValue = row[mapping.sourceColumn];
      const targetColumn = columnLookup.get(mapping.targetColumn);
      
      if (!targetColumn) {
        warnings.push({
          row: rowIndex + 1,
          field: mapping.targetColumn,
          message: `Target column "${mapping.targetColumn}" not found in schema`
        });
        return;
      }
      
      // Skip empty values if specified
      if (mapping.skipEmpty && (sourceValue === null || sourceValue === undefined || sourceValue === '')) {
        processedRow[mapping.targetColumn] = targetColumn.defaultValue || null;
        return;
      }
      
      // Apply transformation if specified
      let processedValue = sourceValue;
      if (mapping.transform) {
        try {
          processedValue = applyTransform(sourceValue, mapping.transform);
        } catch (error) {
          errors.push({
            row: rowIndex + 1,
            column: mapping.sourceColumn,
            field: mapping.targetColumn,
            message: `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            value: sourceValue
          });
          return;
        }
      }
      
      processedRow[mapping.targetColumn] = processedValue;
    });
    
    // Validate each mapped field
    Object.entries(processedRow).forEach(([fieldKey, value]) => {
      const column = columnLookup.get(fieldKey);
      if (!column) return;
      
      // Type validation and conversion
      const validationResult = validateFieldValue(value, column, rowIndex + 1);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);
      
      if (validationResult.convertedValue !== undefined) {
        processedRow[fieldKey] = validationResult.convertedValue;
      }
      
      // Track unique values
      if (column.unique && value !== null && value !== undefined && value !== '') {
        const uniqueMap = uniqueTracking.get(fieldKey);
        if (uniqueMap) {
          const existingRows = uniqueMap.get(value) || [];
          existingRows.push(rowIndex + 1);
          uniqueMap.set(value, existingRows);
        }
      }
    });
    
    // Check for required fields
    columns.forEach(column => {
      if (column.required && (processedRow[column.key] === null || processedRow[column.key] === undefined || processedRow[column.key] === '')) {
        errors.push({
          row: rowIndex + 1,
          field: column.key,
          message: `Required field "${column.label}" is missing or empty`,
          severity: 'error'
        });
      }
    });
  });
  
  // Check for duplicates
  uniqueTracking.forEach((valueMap, fieldKey) => {
    valueMap.forEach((rows, value) => {
      if (rows.length > 1) {
        duplicates.push({
          rows,
          field: fieldKey,
          value,
          action: 'skip' // Default action
        });
      }
    });
  });
  
  const totalRows = data.length;
  const errorRows = new Set(errors.map(e => e.row)).size;
  const validRows = totalRows - errorRows;
  
  return {
    isValid: errors.length === 0,
    totalRows,
    validRows,
    errorRows,
    errors,
    warnings,
    duplicates
  };
}

interface FieldValidationResult {
  errors: ImportError[];
  warnings: ImportWarning[];
  convertedValue?: any;
}

function validateFieldValue(
  value: any,
  column: ImportColumn,
  rowNumber: number
): FieldValidationResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  let convertedValue = value;
  
  // Skip validation for null/empty values (handled by required check)
  if (value === null || value === undefined || value === '') {
    return { errors, warnings, convertedValue: null };
  }
  
  // Type-specific validation and conversion
  switch (column.type) {
    case 'string':
      convertedValue = String(value);
      break;
      
    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: `"${value}" is not a valid number`,
          severity: 'error',
          value
        });
      } else {
        convertedValue = numValue;
      }
      break;
      
    case 'date':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: `"${value}" is not a valid date`,
          severity: 'error',
          value
        });
      } else {
        convertedValue = dateValue.toISOString();
      }
      break;
      
    case 'boolean':
      const stringValue = String(value).toLowerCase().trim();
      if (['true', 'yes', '1', 'on'].includes(stringValue)) {
        convertedValue = true;
      } else if (['false', 'no', '0', 'off'].includes(stringValue)) {
        convertedValue = false;
      } else {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: `"${value}" is not a valid boolean value (use true/false, yes/no, 1/0)`,
          severity: 'error',
          value
        });
      }
      break;
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: `"${value}" is not a valid email address`,
          severity: 'error',
          value
        });
      }
      break;
      
    case 'url':
      try {
        new URL(String(value));
        convertedValue = String(value);
      } catch {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: `"${value}" is not a valid URL`,
          severity: 'error',
          value
        });
      }
      break;
      
    case 'object':
      if (typeof value === 'string') {
        try {
          convertedValue = JSON.parse(value);
        } catch {
          warnings.push({
            row: rowNumber,
            field: column.key,
            message: `Could not parse "${value}" as JSON object, keeping as string`,
            value
          });
          convertedValue = value;
        }
      }
      break;
  }
  
  // Apply custom validation rules
  if (column.validation) {
    column.validation.forEach(rule => {
      const ruleResult = validateRule(convertedValue, rule, rowNumber, column);
      errors.push(...ruleResult.errors);
      warnings.push(...ruleResult.warnings);
    });
  }
  
  // Apply transform function if provided
  if (column.transform && convertedValue !== null && convertedValue !== undefined) {
    try {
      convertedValue = column.transform(convertedValue);
    } catch (error) {
      errors.push({
        row: rowNumber,
        field: column.key,
        message: `Transform function failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        value: convertedValue
      });
    }
  }
  
  return { errors, warnings, convertedValue };
}

function validateRule(
  value: any,
  rule: ImportValidationRule,
  rowNumber: number,
  column: ImportColumn
): { errors: ImportError[]; warnings: ImportWarning[] } {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  
  switch (rule.type) {
    case 'required':
      if (value === null || value === undefined || value === '') {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: rule.message,
          severity: 'error',
          value
        });
      }
      break;
      
    case 'min':
      if (typeof value === 'number' && value < rule.value) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: rule.message,
          severity: 'error',
          value
        });
      } else if (typeof value === 'string' && value.length < rule.value) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: rule.message,
          severity: 'error',
          value
        });
      }
      break;
      
    case 'max':
      if (typeof value === 'number' && value > rule.value) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: rule.message,
          severity: 'error',
          value
        });
      } else if (typeof value === 'string' && value.length > rule.value) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: rule.message,
          severity: 'error',
          value
        });
      }
      break;
      
    case 'pattern':
      const regex = new RegExp(rule.value);
      if (!regex.test(String(value))) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: rule.message,
          severity: 'error',
          value
        });
      }
      break;
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: rule.message,
          severity: 'error',
          value
        });
      }
      break;
      
    case 'url':
      try {
        new URL(String(value));
      } catch {
        errors.push({
          row: rowNumber,
          field: column.key,
          message: rule.message,
          severity: 'error',
          value
        });
      }
      break;
      
    case 'custom':
      if (rule.validator) {
        try {
          const result = rule.validator(value, {});
          if (result === false) {
            errors.push({
              row: rowNumber,
              field: column.key,
              message: rule.message,
              severity: 'error',
              value
            });
          } else if (typeof result === 'string') {
            errors.push({
              row: rowNumber,
              field: column.key,
              message: result,
              severity: 'error',
              value
            });
          }
        } catch (error) {
          errors.push({
            row: rowNumber,
            field: column.key,
            message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            value
          });
        }
      }
      break;
  }
  
  return { errors, warnings };
}

function applyTransform(value: any, transform: string): any {
  switch (transform) {
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'trim':
      return String(value).trim();
    case 'number':
      return Number(value);
    case 'boolean':
      const str = String(value).toLowerCase().trim();
      return ['true', 'yes', '1', 'on'].includes(str);
    case 'date':
      return new Date(value).toISOString();
    default:
      // For custom transforms, this would need to be more sophisticated
      return value;
  }
}

export function createFieldMappings(
  sourceHeaders: string[],
  targetColumns: ImportColumn[]
): ImportFieldMapping[] {
  const mappings: ImportFieldMapping[] = [];
  
  sourceHeaders.forEach(sourceHeader => {
    // Try to find exact match first
    let targetColumn = targetColumns.find(col => 
      col.key === sourceHeader || col.label === sourceHeader
    );
    
    // If no exact match, try case-insensitive match
    if (!targetColumn) {
      targetColumn = targetColumns.find(col => 
        col.key.toLowerCase() === sourceHeader.toLowerCase() ||
        col.label.toLowerCase() === sourceHeader.toLowerCase()
      );
    }
    
    // If still no match, try fuzzy matching
    if (!targetColumn) {
      const normalizedSource = normalizeFieldName(sourceHeader);
      targetColumn = targetColumns.find(col => {
        const normalizedKey = normalizeFieldName(col.key);
        const normalizedLabel = normalizeFieldName(col.label);
        return normalizedKey === normalizedSource || normalizedLabel === normalizedSource;
      });
    }
    
    mappings.push({
      sourceColumn: sourceHeader,
      targetColumn: targetColumn ? targetColumn.key : sourceHeader,
      skipEmpty: true
    });
  });
  
  return mappings;
}

function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function estimateImportTime(totalRows: number, batchSize: number = 100): number {
  // Rough estimate: 1 second per 1000 rows
  const baseTime = Math.ceil(totalRows / 1000);
  const batchTime = Math.ceil(totalRows / batchSize) * 0.1; // Additional time for batching
  return Math.max(baseTime + batchTime, 1);
}

export function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

export function validateFileFormat(file: File, allowedFormats: string[]): boolean {
  const extension = file.name.toLowerCase().split('.').pop();
  return allowedFormats.includes(extension || '');
}