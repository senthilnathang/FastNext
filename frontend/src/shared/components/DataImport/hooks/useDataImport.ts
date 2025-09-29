'use client';

import { useState, useCallback, useRef } from 'react';
import { parseFile, createPreview } from '../utils/parseUtils';
import { validateImportData, createFieldMappings } from '../utils/validationUtils';
import type {
  ImportOptions,
  ImportJob,
  ImportPreview,
  ImportFieldMapping,
  ImportColumn,
  ImportValidationResult,
  ParsedData
} from '../types';

interface UseDataImportProps {
  tableName?: string;
  columns: ImportColumn[];
  onImport?: (data: Record<string, any>[], options: ImportOptions) => Promise<any>;
  onValidate?: (data: Record<string, any>[], mappings: ImportFieldMapping[]) => Promise<ImportValidationResult>;
  maxFileSize?: number;
  maxRows?: number;
  allowedFormats?: string[];
}

interface UseDataImportReturn {
  // File handling
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  
  // Parsing state
  isParsing: boolean;
  parsedData: ParsedData | null;
  parseError: string | null;
  
  // Preview state
  preview: ImportPreview | null;
  isGeneratingPreview: boolean;
  
  // Mapping state
  fieldMappings: ImportFieldMapping[];
  setFieldMappings: (mappings: ImportFieldMapping[]) => void;
  
  // Validation state
  isValidating: boolean;
  validationResults: ImportValidationResult | null;
  validationError: string | null;
  
  // Import state
  isImporting: boolean;
  importJobs: ImportJob[];
  currentJob: ImportJob | null;
  importProgress: number;
  importError: string | null;
  
  // Actions
  parseFile: (file: File, options?: Partial<ImportOptions>) => Promise<void>;
  generatePreview: (options?: Partial<ImportOptions>) => Promise<void>;
  validateData: (mappings?: ImportFieldMapping[]) => Promise<void>;
  startImport: (options: ImportOptions) => Promise<void>;
  cancelImport: (jobId: string) => Promise<void>;
  clearState: () => void;
  retryImport: (jobId: string) => Promise<void>;
  clearCompletedJobs: () => void;
}

export function useDataImport({
  tableName,
  columns,
  onImport,
  onValidate,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxRows = 10000,
  allowedFormats = ['csv', 'json', 'excel', 'xml']
}: UseDataImportProps): UseDataImportReturn {
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Parsing state
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Preview state
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  // Mapping state
  const [fieldMappings, setFieldMappings] = useState<ImportFieldMapping[]>([]);
  
  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ImportValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeJobIds = useRef<Set<string>>(new Set());

  const parseFileAction = useCallback(async (file: File, options: Partial<ImportOptions> = {}) => {
    if (!file) return;
    
    setIsParsing(true);
    setParseError(null);
    setParsedData(null);
    setPreview(null);
    setValidationResults(null);
    
    try {
      // Validate file size
      if (file.size > maxFileSize) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${(maxFileSize / 1024 / 1024).toFixed(1)}MB)`);
      }
      
      // Validate file format
      const extension = file.name.toLowerCase().split('.').pop();
      if (!allowedFormats.includes(extension || '')) {
        throw new Error(`File format .${extension} is not supported. Allowed formats: ${allowedFormats.join(', ')}`);
      }
      
      // Parse the file
      const parsed = await parseFile(file, {
        ...options,
        maxRows
      });
      
      setParsedData(parsed);
      
      // Generate automatic field mappings
      const autoMappings = createFieldMappings(parsed.headers, columns);
      setFieldMappings(autoMappings);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
      setParseError(errorMessage);
      console.error('File parsing failed:', error);
    } finally {
      setIsParsing(false);
    }
  }, [maxFileSize, maxRows, allowedFormats, columns]);

  const generatePreviewAction = useCallback(async (options: Partial<ImportOptions> = {}) => {
    if (!selectedFile || !parsedData) return;
    
    setIsGeneratingPreview(true);
    
    try {
      const previewData = createPreview(selectedFile, parsedData, options);
      setPreview(previewData);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [selectedFile, parsedData]);

  const validateDataAction = useCallback(async (mappings: ImportFieldMapping[] = fieldMappings) => {
    if (!parsedData || mappings.length === 0) return;
    
    setIsValidating(true);
    setValidationError(null);
    
    try {
      let results: ImportValidationResult;
      
      if (onValidate) {
        // Use custom validation if provided
        results = await onValidate(parsedData.rows, mappings);
      } else {
        // Use built-in validation
        results = validateImportData(parsedData.rows, columns, mappings);
      }
      
      setValidationResults(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setValidationError(errorMessage);
      console.error('Data validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  }, [parsedData, fieldMappings, columns, onValidate]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate polling
      const response = await fetch(`/api/v1/import/status/${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch job status');
      
      const job: ImportJob = await response.json();
      
      setImportJobs(prev => 
        prev.map(j => j.id === jobId ? job : j)
      );
      
      if (currentJob?.id === jobId) {
        setCurrentJob(job);
        setImportProgress(job.progress);
      }
      
      // Stop polling if job is completed, failed, or cancelled
      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        activeJobIds.current.delete(jobId);
        
        if (currentJob?.id === jobId) {
          setIsImporting(false);
          if (job.status === 'failed') {
            setImportError(job.errors?.[0]?.message || 'Import failed');
          } else if (job.status === 'completed') {
            setImportError(null);
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to poll job status:', error);
      activeJobIds.current.delete(jobId);
      
      if (currentJob?.id === jobId) {
        setIsImporting(false);
        setImportError('Failed to track import progress');
      }
    }
  }, [currentJob]);

  const startPolling = useCallback((jobId: string) => {
    activeJobIds.current.add(jobId);
    
    const poll = async () => {
      if (activeJobIds.current.has(jobId)) {
        await pollJobStatus(jobId);
        
        if (activeJobIds.current.has(jobId)) {
          pollingIntervalRef.current = setTimeout(poll, 2000);
        }
      }
    };
    
    poll();
  }, [pollJobStatus]);

  const startImportAction = useCallback(async (options: ImportOptions) => {
    if (!parsedData || !onImport) {
      throw new Error('No data to import or import handler not provided');
    }
    
    setIsImporting(true);
    setImportError(null);
    setImportProgress(0);
    
    try {
      // Apply field mappings to transform data
      const mappedData = parsedData.rows.map(row => {
        const mappedRow: Record<string, any> = {};
        fieldMappings.forEach(mapping => {
          if (mapping.targetColumn && mapping.targetColumn !== mapping.sourceColumn) {
            mappedRow[mapping.targetColumn] = row[mapping.sourceColumn];
          }
        });
        return mappedRow;
      });
      
      const response = await onImport(mappedData, options);
      
      if (response.jobId) {
        // Background job - start polling
        const newJob: ImportJob = {
          id: response.jobId,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          fileName: selectedFile?.name,
          fileSize: selectedFile?.size,
          totalRows: parsedData.totalRows
        };
        
        setImportJobs(prev => [newJob, ...prev]);
        setCurrentJob(newJob);
        startPolling(response.jobId);
      } else {
        // Direct import completed
        setIsImporting(false);
        setImportProgress(100);
        
        // Create a completed job entry
        const completedJob: ImportJob = {
          id: Date.now().toString(),
          status: 'completed',
          progress: 100,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          fileName: selectedFile?.name,
          fileSize: selectedFile?.size,
          totalRows: parsedData.totalRows,
          validRows: response.importedRows || parsedData.totalRows,
          errorRows: 0
        };
        
        setImportJobs(prev => [completedJob, ...prev]);
      }
      
    } catch (error) {
      setIsImporting(false);
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      setImportError(errorMessage);
      console.error('Import failed:', error);
      throw error;
    }
  }, [parsedData, fieldMappings, onImport, selectedFile, startPolling]);

  const cancelImportAction = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/v1/import/cancel/${jobId}`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to cancel import');
      
      activeJobIds.current.delete(jobId);
      
      setImportJobs(prev =>
        prev.map(job =>
          job.id === jobId
            ? { ...job, status: 'cancelled' as const }
            : job
        )
      );
      
      if (currentJob?.id === jobId) {
        setCurrentJob(null);
        setIsImporting(false);
        setImportProgress(0);
      }
      
    } catch (error) {
      console.error('Failed to cancel import:', error);
      throw error;
    }
  }, [currentJob]);

  const retryImportAction = useCallback(async (jobId: string) => {
    const job = importJobs.find(j => j.id === jobId);
    if (!job || !parsedData || !onImport) return;
    
    // Remove the failed job and start a new one
    setImportJobs(prev => prev.filter(j => j.id !== jobId));
    
    // Start a new import with the same data
    const options: ImportOptions = {
      format: 'csv', // This should be stored from the original import
      hasHeaders: true,
      columns: fieldMappings.map(m => m.targetColumn),
      filters: [],
      includeHeaders: true,
      skipEmptyRows: true,
      onDuplicate: 'skip'
    };
    
    await startImportAction(options);
  }, [importJobs, parsedData, onImport, fieldMappings, startImportAction]);

  const clearCompletedJobsAction = useCallback(() => {
    setImportJobs(prev => 
      prev.filter(job => !['completed', 'failed', 'cancelled'].includes(job.status))
    );
  }, []);

  const clearState = useCallback(() => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    setPreview(null);
    setFieldMappings([]);
    setValidationResults(null);
    setValidationError(null);
    setImportError(null);
    setImportProgress(0);
    
    // Cancel any active polling
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
    }
    activeJobIds.current.clear();
  }, []);

  return {
    // File handling
    selectedFile,
    setSelectedFile,
    
    // Parsing state
    isParsing,
    parsedData,
    parseError,
    
    // Preview state
    preview,
    isGeneratingPreview,
    
    // Mapping state
    fieldMappings,
    setFieldMappings,
    
    // Validation state
    isValidating,
    validationResults,
    validationError,
    
    // Import state
    isImporting,
    importJobs,
    currentJob,
    importProgress,
    importError,
    
    // Actions
    parseFile: parseFileAction,
    generatePreview: generatePreviewAction,
    validateData: validateDataAction,
    startImport: startImportAction,
    cancelImport: cancelImportAction,
    clearState,
    retryImport: retryImportAction,
    clearCompletedJobs: clearCompletedJobsAction
  };
}