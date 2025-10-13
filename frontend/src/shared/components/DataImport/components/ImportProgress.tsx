'use client';

import React from 'react';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye
} from 'lucide-react';

import type { ImportJob, ImportError, ImportWarning } from '../types';

interface ImportProgressProps {
  jobs: ImportJob[];
  currentJob: ImportJob | null;
  isImporting: boolean;
  onCancel: (jobId: string) => void;
  onRetry?: (jobId: string) => void;
  onViewResults?: (jobId: string) => void;
  onClearCompleted: () => void;
  className?: string;
}

const getStatusIcon = (status: ImportJob['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'parsing':
    case 'validating':
    case 'importing':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'cancelled':
      return <X className="h-4 w-4 text-gray-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: ImportJob['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'parsing':
    case 'validating':
    case 'importing':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

const getStatusLabel = (status: ImportJob['status']) => {
  switch (status) {
    case 'parsing':
      return 'Parsing file';
    case 'validating':
      return 'Validating data';
    case 'importing':
      return 'Importing data';
    default:
      return status.replace('_', ' ');
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDuration = (start: string, end?: string) => {
  const startTime = new Date(start);
  const endTime = end ? new Date(end) : new Date();
  const duration = endTime.getTime() - startTime.getTime();
  
  if (duration < 1000) return '< 1s';
  if (duration < 60000) return `${Math.round(duration / 1000)}s`;
  if (duration < 3600000) return `${Math.round(duration / 60000)}m`;
  
  return `${Math.round(duration / 3600000)}h`;
};

export function ImportProgress({
  jobs,
  currentJob,
  isImporting,
  onCancel,
  onRetry,
  onViewResults,
  onClearCompleted,
  className
}: ImportProgressProps) {
  const completedJobs = jobs.filter(job => ['completed', 'failed', 'cancelled'].includes(job.status));
  const activeJobs = jobs.filter(job => ['pending', 'parsing', 'validating', 'importing'].includes(job.status));

  if (jobs.length === 0 && !isImporting) {
    return null;
  }

  const renderJobItem = (job: ImportJob) => {
    const isActive = ['parsing', 'validating', 'importing'].includes(job.status);
    const canCancel = ['pending', 'parsing', 'validating', 'importing'].includes(job.status);
    const canRetry = job.status === 'failed';
    const canViewResults = job.status === 'completed' && job.importedData;

    return (
      <div
        key={job.id}
        className="p-4 border rounded-lg space-y-3 bg-white dark:bg-gray-800"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(job.status)}
            <div>
              <div className="font-medium">{job.fileName || 'Import Job'}</div>
              <div className="text-sm text-gray-500">
                Started {formatDuration(job.createdAt)}
                {job.completedAt && ` • Completed in ${formatDuration(job.createdAt, job.completedAt)}`}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(job.status)}>
              {getStatusLabel(job.status)}
            </Badge>
            
            {canViewResults && onViewResults && (
              <Button
                size="sm"
                onClick={() => onViewResults(job.id)}
                className="h-8"
              >
                <Eye className="h-3 w-3 mr-1" />
                View Results
              </Button>
            )}
            
            {canRetry && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(job.id)}
                className="h-8"
              >
                Retry
              </Button>
            )}
            
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(job.id)}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar for active jobs */}
        {isActive && (
          <div className="space-y-2">
            <Progress value={job.progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {job.processedRows && job.totalRows 
                  ? `${job.processedRows.toLocaleString()} / ${job.totalRows.toLocaleString()} rows`
                  : `${job.progress}% complete`
                }
              </span>
              {job.fileSize && (
                <span>{formatFileSize(job.fileSize)}</span>
              )}
            </div>
          </div>
        )}

        {/* Job statistics */}
        {(job.totalRows || job.validRows || job.errorRows) && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            {job.totalRows && (
              <div className="text-center">
                <div className="font-medium">{job.totalRows.toLocaleString()}</div>
                <div className="text-gray-500">Total Rows</div>
              </div>
            )}
            {job.validRows !== undefined && (
              <div className="text-center">
                <div className="font-medium text-green-600">{job.validRows.toLocaleString()}</div>
                <div className="text-gray-500">Valid Rows</div>
              </div>
            )}
            {job.errorRows !== undefined && (
              <div className="text-center">
                <div className="font-medium text-red-600">{job.errorRows.toLocaleString()}</div>
                <div className="text-gray-500">Error Rows</div>
              </div>
            )}
          </div>
        )}

        {/* Validation results summary */}
        {job.validationResults && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Validation Results</span>
              <Badge variant={job.validationResults.isValid ? "default" : "destructive"}>
                {job.validationResults.isValid ? 'Valid' : 'Has Errors'}
              </Badge>
            </div>
            
            {job.validationResults.errors.length > 0 && (
              <ErrorList errors={job.validationResults.errors} />
            )}
            
            {job.validationResults.warnings.length > 0 && (
              <WarningList warnings={job.validationResults.warnings} />
            )}
          </div>
        )}

        {/* Error display for failed jobs */}
        {job.status === 'failed' && job.errors && job.errors.length > 0 && (
          <ErrorList errors={job.errors} />
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Current Import Progress (Prominent Display) */}
      {currentJob && isImporting && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Importing Data</CardTitle>
                <CardDescription>
                  {currentJob.fileName && `Processing ${currentJob.fileName}...`}
                </CardDescription>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(currentJob.id)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(currentJob.status)}
                <span className="text-sm font-medium">
                  {getStatusLabel(currentJob.status)}
                </span>
              </div>
              
              <Progress value={currentJob.progress} className="h-3" />
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {currentJob.processedRows && currentJob.totalRows 
                    ? `${currentJob.processedRows.toLocaleString()} / ${currentJob.totalRows.toLocaleString()} rows processed`
                    : `${currentJob.progress}% complete`
                  }
                </span>
                
                {currentJob.fileSize && (
                  <span className="text-gray-500">
                    File size: {formatFileSize(currentJob.fileSize)}
                  </span>
                )}
              </div>
              
              <div className="text-xs text-gray-500">
                Started {formatDuration(currentJob.createdAt)} ago
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Jobs List */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Import History</CardTitle>
                <CardDescription>
                  {activeJobs.length > 0 && `${activeJobs.length} active, `}
                  {completedJobs.length} completed imports
                </CardDescription>
              </div>
              
              {completedJobs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearCompleted}
                >
                  Clear Completed
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {jobs.map(renderJobItem)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Component for displaying errors in a collapsible format
function ErrorList({ errors }: { errors: ImportError[] }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const maxDisplay = 5;

  if (errors.length === 0) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="font-medium text-red-700 dark:text-red-300">
              {errors.length} Error{errors.length !== 1 ? 's' : ''}
            </span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-red-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-red-600" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {errors.slice(0, maxDisplay).map((error, index) => (
              <div key={index} className="text-sm text-red-700 dark:text-red-300">
                <span className="font-medium">Row {error.row}:</span> {error.message}
                {error.field && <span className="text-red-600"> (Field: {error.field})</span>}
              </div>
            ))}
            {errors.length > maxDisplay && (
              <div className="text-sm text-red-600 dark:text-red-400">
                ... and {errors.length - maxDisplay} more errors
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Component for displaying warnings
function WarningList({ warnings }: { warnings: ImportWarning[] }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const maxDisplay = 5;

  if (warnings.length === 0) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="font-medium text-yellow-700 dark:text-yellow-300">
              {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
            </span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-yellow-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-yellow-600" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {warnings.slice(0, maxDisplay).map((warning, index) => (
              <div key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                <span className="font-medium">Row {warning.row}:</span> {warning.message}
                {warning.field && <span className="text-yellow-600"> (Field: {warning.field})</span>}
              </div>
            ))}
            {warnings.length > maxDisplay && (
              <div className="text-sm text-yellow-600 dark:text-yellow-400">
                ... and {warnings.length - maxDisplay} more warnings
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Simple progress indicator for embedded use
export function ImportProgressIndicator({
  isImporting,
  progress,
  status,
  className
}: {
  isImporting: boolean;
  progress: number;
  status?: string;
  className?: string;
}) {
  if (!isImporting) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      <div className="flex-1 min-w-0">
        <Progress value={progress} className="h-2" />
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {status || `${progress}%`}
      </span>
    </div>
  );
}