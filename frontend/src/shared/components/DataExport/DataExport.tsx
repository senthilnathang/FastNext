'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
import { Separator } from '@/shared/components/ui/separator';
import {
  Download,
  FileText,
  Settings,
  Eye,
  AlertCircle
} from 'lucide-react';

import { FieldSelector } from './components/FieldSelector';
import { FormatSelector } from './components/FormatSelector';
import { ExportProgress } from './components/ExportProgress';
import { useDataExport } from './hooks/useDataExport';
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToXML,
  exportToYAML,
  estimateFileSize
} from './utils/exportUtils';

import type {
  ExportComponentProps,
  ExportOptions,
  ExportFormat,
  ExportPreview
} from './types';

export function DataExport({
  tableName,
  columns,
  data = [],
  totalRows,
  filters = [],
  onExport,
  onPreview,
  maxRows = 100000,
  allowedFormats = ['csv', 'json', 'excel'],
  defaultFormat = 'csv',
  showPreview = true,
  embedded = false,
  className
}: ExportComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.filter(col => col.required !== false).map(col => col.key)
  );
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat);
  const [exportOptions, setExportOptions] = useState<Partial<ExportOptions>>({
    includeHeaders: true,
    dateFormat: 'iso',
    encoding: 'utf-8'
  });
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const {
    isExporting,
    exportJobs,
    currentJob,
    startExport,
    cancelExport,
    downloadExport,
    clearCompletedJobs,
    getExportPreview,
    exportError
  } = useDataExport({
    onExport,
    onPreview
  });

  const exportData = data.slice(0, maxRows);
  const actualRowCount = totalRows || exportData.length;
  const isLargeExport = actualRowCount > 10000;

  const estimatedSize = useMemo(() => {
    if (selectedColumns.length === 0 || exportData.length === 0) return 0;
    return estimateFileSize(exportData, columns, selectedColumns, selectedFormat);
  }, [exportData, columns, selectedColumns, selectedFormat]);

  const handleExport = useCallback(async () => {
    if (selectedColumns.length === 0) return;

    const options: ExportOptions = {
      format: selectedFormat,
      columns: selectedColumns,
      filters,
      includeHeaders: exportOptions.includeHeaders ?? true,
      fileName: exportOptions.fileName || `${tableName || 'export'}_${Date.now()}.${selectedFormat}`,
      dateFormat: exportOptions.dateFormat,
      delimiter: exportOptions.delimiter,
      encoding: exportOptions.encoding,
      ...exportOptions
    };

    try {
      if (onExport) {
        // Use custom export handler (for server-side exports)
        await startExport(options);
      } else {
        // Use client-side export utilities
        switch (selectedFormat) {
          case 'csv':
            exportToCSV(exportData, columns, selectedColumns, options);
            break;
          case 'json':
            exportToJSON(exportData, columns, selectedColumns, options);
            break;
          case 'excel':
            exportToExcel(exportData, columns, selectedColumns, options);
            break;
          case 'xml':
            exportToXML(exportData, columns, selectedColumns, options);
            break;
          case 'yaml':
            exportToYAML(exportData, columns, selectedColumns, options);
            break;
          default:
            throw new Error(`Unsupported export format: ${selectedFormat}`);
        }

        // Close dialog after successful export (for client-side exports)
        if (!embedded) {
          setIsOpen(false);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [
    selectedColumns,
    selectedFormat,
    exportOptions,
    filters,
    tableName,
    onExport,
    startExport,
    exportData,
    columns,
    embedded
  ]);

  const handlePreview = useCallback(async () => {
    if (!onPreview || selectedColumns.length === 0) return;

    setIsGeneratingPreview(true);
    try {
      const previewOptions: Partial<ExportOptions> = {
        format: selectedFormat,
        columns: selectedColumns,
        filters,
        includeHeaders: exportOptions.includeHeaders,
        dateFormat: exportOptions.dateFormat
      };

      const previewData = await getExportPreview(previewOptions);
      setPreview(previewData);
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [onPreview, selectedColumns, selectedFormat, exportOptions, filters, getExportPreview]);

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const renderExportSummary = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Rows:</span>
          <span className="ml-2 font-medium">{actualRowCount.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Columns:</span>
          <span className="ml-2 font-medium">{selectedColumns.length}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Format:</span>
          <span className="ml-2 font-medium uppercase">{selectedFormat}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Est. Size:</span>
          <span className="ml-2 font-medium">{formatFileSize(estimatedSize)}</span>
        </div>
      </div>

      {isLargeExport && (
        <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            <div className="font-medium">Large Export</div>
            <div className="mt-1">
              This export contains {actualRowCount.toLocaleString()} rows.
              Large exports may take longer to process and download.
            </div>
          </div>
        </div>
      )}

      {maxRows < actualRowCount && (
        <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <div className="font-medium">Row Limit Applied</div>
            <div className="mt-1">
              Only the first {maxRows.toLocaleString()} rows will be exported.
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreview = () => {
    if (!preview) return null;

    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Export Preview</CardTitle>
          <CardDescription>
            Sample of your export data ({preview.sampleData.length} rows shown)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  {preview.columns.map(col => (
                    <th
                      key={col.key}
                      className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left font-medium"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sampleData.slice(0, 5).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {preview.columns.map(col => (
                      <td
                        key={col.key}
                        className="border border-gray-200 dark:border-gray-700 px-3 py-2"
                      >
                        {String(row[col.key] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.sampleData.length > 5 && (
            <div className="mt-2 text-sm text-gray-500">
              ... and {preview.sampleData.length - 5} more rows
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const exportButton = (
    <Button
      onClick={embedded ? handleExport : () => setIsOpen(true)}
      disabled={selectedColumns.length === 0 || isExporting}
      size={embedded ? "sm" : "default"}
      className={embedded ? "h-8" : ""}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? 'Exporting...' : 'Export Data'}
    </Button>
  );

  // Embedded mode - simplified interface
  if (embedded) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {exportButton}
            <Badge variant="outline">
              {selectedColumns.length} columns
            </Badge>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            {actualRowCount.toLocaleString()} rows
          </div>
        </div>

        {(isExporting || exportJobs.length > 0) && (
          <ExportProgress
            jobs={exportJobs}
            currentJob={currentJob}
            isExporting={isExporting}
            onDownload={downloadExport}
            onCancel={cancelExport}
            onClearCompleted={clearCompletedJobs}
          />
        )}

        {exportError && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">
              {exportError}
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
          {exportButton}
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Export Data</span>
              {tableName && (
                <Badge variant="outline">{tableName}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Configure your data export settings and download your data in the desired format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Field Selection */}
            <FieldSelector
              columns={columns}
              selectedColumns={selectedColumns}
              onSelectionChange={setSelectedColumns}
            />

            <Separator />

            {/* Format Selection */}
            <FormatSelector
              selectedFormat={selectedFormat}
              options={exportOptions}
              onFormatChange={setSelectedFormat}
              onOptionsChange={setExportOptions}
              allowedFormats={allowedFormats}
            />

            <Separator />

            {/* Export Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Export Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {renderExportSummary()}
              </CardContent>
            </Card>

            {/* Preview */}
            {showPreview && onPreview && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Preview</h3>
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={isGeneratingPreview || selectedColumns.length === 0}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {isGeneratingPreview ? 'Generating...' : 'Generate Preview'}
                  </Button>
                </div>

                {renderPreview()}
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={handleExport}
                disabled={selectedColumns.length === 0 || isExporting}
                className="min-w-[120px]"
              >
                {isExporting ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Export Progress */}
          {(isExporting || exportJobs.length > 0) && (
            <div className="mt-6">
              <ExportProgress
                jobs={exportJobs}
                currentJob={currentJob}
                isExporting={isExporting}
                onDownload={downloadExport}
                onCancel={cancelExport}
                onClearCompleted={clearCompletedJobs}
              />
            </div>
          )}

          {/* Error Display */}
          {exportError && (
            <div className="mt-4 flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <div className="font-medium">Export Failed</div>
                <div className="mt-1">{exportError}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
