'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import {
  Upload,
  Settings,
  CheckCircle,
  AlertCircle,
  FileCheck,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

import { FileUpload } from './components/FileUpload';
import { FieldMapper } from './components/FieldMapper';
import { ImportProgress } from './components/ImportProgress';
import { useDataImport } from './hooks/useDataImport';

import type {
  ImportComponentProps,
  ImportOptions,
  ImportValidationResult
} from './types';

export function DataImport({
  tableName,
  columns,
  onImport,
  onValidate,
  onPreview,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxRows = 10000,
  allowedFormats = ['csv', 'json', 'excel', 'xml'],
  defaultFormat = 'csv',
  showPreview = true,
  requireValidation = true,
  permissions,
  embedded = false,
  className
}: ImportComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'map' | 'validate' | 'import'>('upload');

  const {
    selectedFile,
    setSelectedFile,
    isParsing,
    parsedData,
    parseError,
    fieldMappings,
    setFieldMappings,
    isValidating,
    validationResults,
    validationError,
    isImporting,
    importJobs,
    currentJob,
    importError,
    parseFile,
    validateData,
    startImport,
    cancelImport,
    clearState,
    retryImport,
    clearCompletedJobs
  } = useDataImport({
    tableName,
    columns,
    onImport,
    onValidate,
    maxFileSize,
    maxRows,
    allowedFormats
  });

  // Check permissions
  const canImport = permissions?.canImport ?? true;
  const canValidate = permissions?.canValidate ?? true;
  const canPreview = permissions?.canPreview ?? true;
  const needsApproval = permissions?.requireApproval ?? false;

  const stepStatus = useMemo(() => {
    return {
      upload: selectedFile && parsedData ? 'completed' : selectedFile ? 'active' : 'pending',
      map: fieldMappings.length > 0 && !validationResults ? 'completed' : parsedData ? 'active' : 'pending',
      validate: validationResults ? (validationResults.isValid ? 'completed' : 'error') : fieldMappings.length > 0 ? 'active' : 'pending',
      import: isImporting ? 'active' : validationResults?.isValid ? 'ready' : 'pending'
    };
  }, [selectedFile, parsedData, fieldMappings, validationResults, isImporting]);

  const handleFileSelect = useCallback(async (file: File | null) => {
    if (file) {
      setSelectedFile(file);
      await parseFile(file, { hasHeaders: true });
      setCurrentStep('map');
    } else {
      setSelectedFile(null);
      clearState();
      setCurrentStep('upload');
    }
  }, [setSelectedFile, parseFile, clearState]);

  const handleFieldMappingChange = useCallback(async (mappings: any[]) => {
    setFieldMappings(mappings);
    if (requireValidation && mappings.length > 0) {
      await validateData(mappings);
    }
  }, [setFieldMappings, requireValidation, validateData]);

  const handleValidate = useCallback(async () => {
    await validateData();
    setCurrentStep('validate');
  }, [validateData]);

  const handleImport = useCallback(async () => {
    if (!canImport) {
      alert('You do not have permission to import data');
      return;
    }

    if (needsApproval) {
      alert('Your import will require approval before processing');
    }

    const options: ImportOptions = {
      format: defaultFormat,
      hasHeaders: true,
      skipEmptyRows: true,
      onDuplicate: 'skip',
      maxRows,
      batchSize: 100
    };

    try {
      await startImport(options);
      setCurrentStep('import');
      if (!embedded) {
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  }, [canImport, needsApproval, startImport, defaultFormat, maxRows, embedded]);

  const handleRetry = useCallback(() => {
    clearState();
    setCurrentStep('upload');
  }, [clearState]);

  const getStepIcon = (step: string, status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'active':
        return <div className="h-5 w-5 rounded-full bg-blue-500 animate-pulse" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-300" />;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="space-y-6">
            <FileUpload
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              maxFileSize={permissions?.maxFileSize || maxFileSize}
              allowedFormats={permissions?.allowedFormats || allowedFormats}
              disabled={!canImport}
            />
            
            {parseError && (
              <div className="flex items-start space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <div className="font-medium">Parse Error</div>
                  <div className="mt-1">{parseError}</div>
                </div>
              </div>
            )}
            
            {isParsing && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  <span className="text-gray-600">Parsing file...</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'map':
        return (
          <div className="space-y-6">
            {parsedData && (
              <FieldMapper
                sourceHeaders={parsedData.headers}
                targetColumns={columns}
                mappings={fieldMappings}
                sampleData={parsedData.rows.slice(0, 3)}
                onMappingsChange={handleFieldMappingChange}
              />
            )}
            
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                Back to Upload
              </Button>
              <Button 
                onClick={handleValidate}
                disabled={fieldMappings.length === 0 || !canValidate}
              >
                Validate Mapping
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'validate':
        return (
          <div className="space-y-6">
            <ValidationSummary
              validationResults={validationResults}
              validationError={validationError}
              isValidating={isValidating}
            />
            
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('map')}>
                Back to Mapping
              </Button>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline"
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Re-validate
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!validationResults?.isValid || isImporting || !canImport}
                  className="min-w-[120px]"
                >
                  {needsApproval ? 'Request Import' : 'Start Import'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="space-y-6">
            <ImportProgress
              jobs={importJobs}
              currentJob={currentJob}
              isImporting={isImporting}
              onCancel={cancelImport}
              onRetry={retryImport}
              onClearCompleted={clearCompletedJobs}
            />
            
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleRetry}>
                Import Another File
              </Button>
              <Button 
                variant="outline" 
                onClick={() => embedded ? undefined : setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const importButton = (
    <Button
      onClick={embedded ? () => setCurrentStep('upload') : () => setIsOpen(true)}
      disabled={!canImport || isImporting}
      size={embedded ? "sm" : "default"}
      className={embedded ? "h-8" : ""}
    >
      <Upload className="h-4 w-4 mr-2" />
      {isImporting ? 'Importing...' : 'Import Data'}
    </Button>
  );

  // Embedded mode - simplified interface
  if (embedded) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {importButton}
            {needsApproval && (
              <Badge variant="outline" className="text-xs">
                Requires Approval
              </Badge>
            )}
          </div>
          
          {selectedFile && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedFile.name}
            </div>
          )}
        </div>

        {currentStep !== 'upload' && renderStepContent()}

        {importError && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">
              {importError}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full modal interface
  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {importButton}
        </DialogTrigger>
        
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Import Data</span>
              {tableName && (
                <Badge variant="outline">{tableName}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Import data from CSV, JSON, Excel, or XML files with field mapping and validation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {[
                { key: 'upload', label: 'Upload File', icon: Upload },
                { key: 'map', label: 'Map Fields', icon: Settings },
                { key: 'validate', label: 'Validate', icon: FileCheck },
                { key: 'import', label: 'Import', icon: CheckCircle }
              ].map(({ key, label, icon: Icon }, index) => (
                <div key={key} className="flex items-center">
                  <div className="flex items-center space-x-2">
                    {getStepIcon(key, stepStatus[key as keyof typeof stepStatus])}
                    <span className={`text-sm ${
                      currentStep === key ? 'font-medium' : 'text-gray-600'
                    }`}>
                      {label}
                    </span>
                  </div>
                  {index < 3 && (
                    <ArrowRight className="h-4 w-4 mx-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            {renderStepContent()}

            {/* Permission Notice */}
            {needsApproval && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <div className="font-medium">Approval Required</div>
                  <div className="mt-1">Your imports require approval before processing.</div>
                </div>
              </div>
            )}

            {/* Global Error Display */}
            {importError && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <div className="font-medium">Import Failed</div>
                  <div className="mt-1">{importError}</div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Validation Summary Component
interface ValidationSummaryProps {
  validationResults: ImportValidationResult | null;
  validationError: string | null;
  isValidating: boolean;
}

function ValidationSummary({
  validationResults,
  validationError,
  isValidating
}: ValidationSummaryProps) {
  if (isValidating) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="text-gray-600">Validating data...</span>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="flex items-start space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-red-700 dark:text-red-300">
          <div className="font-medium">Validation Error</div>
          <div className="mt-1">{validationError}</div>
        </div>
      </div>
    );
  }

  if (!validationResults) {
    return (
      <div className="text-center py-8 text-gray-500">
        Click &quot;Validate Mapping&quot; to check your data for errors
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {validationResults.isValid ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span>Validation Results</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{validationResults.totalRows}</div>
            <div className="text-sm text-gray-600">Total Rows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{validationResults.validRows}</div>
            <div className="text-sm text-gray-600">Valid Rows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{validationResults.errorRows}</div>
            <div className="text-sm text-gray-600">Error Rows</div>
          </div>
        </div>

        {validationResults.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-700">Errors Found:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {validationResults.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="text-sm text-red-600">
                  Row {error.row}: {error.message}
                </div>
              ))}
              {validationResults.errors.length > 5 && (
                <div className="text-sm text-red-500">
                  ... and {validationResults.errors.length - 5} more errors
                </div>
              )}
            </div>
          </div>
        )}

        {validationResults.warnings.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="font-medium text-yellow-700">Warnings:</h4>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {validationResults.warnings.slice(0, 3).map((warning, index) => (
                <div key={index} className="text-sm text-yellow-600">
                  Row {warning.row}: {warning.message}
                </div>
              ))}
              {validationResults.warnings.length > 3 && (
                <div className="text-sm text-yellow-500">
                  ... and {validationResults.warnings.length - 3} more warnings
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}