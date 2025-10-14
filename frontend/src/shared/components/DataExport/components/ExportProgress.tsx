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
  CheckCircle,
  XCircle,
  Clock,
  Download,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { ExportJob } from '../types';

interface ExportProgressProps {
  jobs: ExportJob[];
  currentJob: ExportJob | null;
  isExporting: boolean;
  onDownload: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onClearCompleted: () => void;
  className?: string;
}

const getStatusIcon = (status: ExportJob['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'in_progress':
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

const getStatusColor = (status: ExportJob['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'in_progress':
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

export function ExportProgress({
  jobs,
  currentJob,
  isExporting,
  onDownload,
  onCancel,
  onClearCompleted,
  className
}: ExportProgressProps) {
  const completedJobs = jobs.filter(job => ['completed', 'failed', 'cancelled'].includes(job.status));
  const activeJobs = jobs.filter(job => ['pending', 'in_progress'].includes(job.status));

  if (jobs.length === 0 && !isExporting) {
    return null;
  }

  const renderJobItem = (job: ExportJob) => {
    const isActive = job.status === 'in_progress';
    const canDownload = job.status === 'completed' && (job.downloadUrl || job.id);
    const canCancel = ['pending', 'in_progress'].includes(job.status);

    return (
      <div
        key={job.id}
        className="p-4 border rounded-lg space-y-3 bg-white dark:bg-gray-800"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(job.status)}
            <div>
              <div className="font-medium">Export Job</div>
              <div className="text-sm text-gray-500">
                Started {formatDuration(job.createdAt)}
                {job.completedAt && ` • Completed in ${formatDuration(job.createdAt, job.completedAt)}`}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(job.status)}>
              {job.status.replace('_', ' ')}
            </Badge>

            {canDownload && (
              <Button
                size="sm"
                onClick={() => onDownload(job.id)}
                className="h-8"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
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
              {job.estimatedSize && (
                <span>~{formatFileSize(job.estimatedSize)}</span>
              )}
            </div>
          </div>
        )}

        {/* Job details */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            {job.totalRows && (
              <span>{job.totalRows.toLocaleString()} rows</span>
            )}
            {job.actualSize && (
              <span>{formatFileSize(job.actualSize)}</span>
            )}
          </div>

          <div className="text-xs text-gray-500">
            ID: {job.id.slice(-8)}
          </div>
        </div>

        {/* Error message */}
        {job.status === 'failed' && job.error && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <div className="font-medium">Export failed</div>
              <div className="mt-1">{job.error}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Current Export Progress (Prominent Display) */}
      {currentJob && isExporting && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Exporting Data</CardTitle>
                <CardDescription>
                  Your export is being processed...
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
              <Progress value={currentJob.progress} className="h-3" />

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {currentJob.processedRows && currentJob.totalRows
                    ? `${currentJob.processedRows.toLocaleString()} / ${currentJob.totalRows.toLocaleString()} rows processed`
                    : `${currentJob.progress}% complete`
                  }
                </span>

                {currentJob.estimatedSize && (
                  <span className="text-gray-500">
                    Estimated size: {formatFileSize(currentJob.estimatedSize)}
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

      {/* Export Jobs List */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Export History</CardTitle>
                <CardDescription>
                  {activeJobs.length > 0 && `${activeJobs.length} active, `}
                  {completedJobs.length} completed exports
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

// Simple progress indicator for embedded use
export function ExportProgressIndicator({
  isExporting,
  progress,
  className
}: {
  isExporting: boolean;
  progress: number;
  className?: string;
}) {
  if (!isExporting) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      <div className="flex-1 min-w-0">
        <Progress value={progress} className="h-2" />
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {progress}%
      </span>
    </div>
  );
}
