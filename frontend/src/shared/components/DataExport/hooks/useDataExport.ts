'use client';

import { useState, useCallback, useRef } from 'react';
import { ExportOptions, ExportJob, ExportResponse, ExportPreview } from '../types';

interface UseDataExportProps {
  onExport?: (options: ExportOptions) => Promise<ExportResponse>;
  onPreview?: (options: Partial<ExportOptions>) => Promise<ExportPreview>;
  pollingInterval?: number;
}

interface UseDataExportReturn {
  isExporting: boolean;
  exportJobs: ExportJob[];
  currentJob: ExportJob | null;
  startExport: (options: ExportOptions) => Promise<void>;
  cancelExport: (jobId: string) => Promise<void>;
  downloadExport: (jobId: string) => Promise<void>;
  clearCompletedJobs: () => void;
  getExportPreview: (options: Partial<ExportOptions>) => Promise<ExportPreview | null>;
  exportProgress: number;
  exportError: string | null;
}

export function useDataExport({
  onExport,
  onPreview,
  pollingInterval = 2000
}: UseDataExportProps): UseDataExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeJobIds = useRef<Set<string>>(new Set());

  const downloadExport = useCallback(async (jobId: string) => {
    try {
      const job = exportJobs.find(j => j.id === jobId);
      if (!job) throw new Error('Job not found');

      if (job.downloadUrl) {
        const link = document.createElement('a');
        link.href = job.downloadUrl;
        link.download = `export_${jobId}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fetch download URL
        const response = await fetch(`/api/v1/export/download/${jobId}`);
        if (!response.ok) throw new Error('Failed to download export');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export_${jobId}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

    } catch (error) {
      console.error('Failed to download export:', error);
      throw error;
    }
  }, [exportJobs]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/v1/export/status/${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch job status');
      
      const job: ExportJob = await response.json();
      
      setExportJobs(prev => 
        prev.map(j => j.id === jobId ? job : j)
      );
      
      if (currentJob?.id === jobId) {
        setCurrentJob(job);
        setExportProgress(job.progress);
      }
      
      // Stop polling if job is completed, failed, or cancelled
      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        activeJobIds.current.delete(jobId);
        
        if (currentJob?.id === jobId) {
          setIsExporting(false);
          if (job.status === 'failed') {
            setExportError(job.error || 'Export failed');
          } else if (job.status === 'completed') {
            setExportError(null);
            // Auto-download if completed
            if (job.downloadUrl) {
              await downloadExport(jobId);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to poll job status:', error);
      activeJobIds.current.delete(jobId);
      
       if (currentJob?.id === jobId) {
         setIsExporting(false);
         setExportError('Failed to track export progress');
       }
     }
   }, [currentJob, downloadExport]);

  const startPolling = useCallback((jobId: string) => {
    activeJobIds.current.add(jobId);
    
    const poll = async () => {
      if (activeJobIds.current.has(jobId)) {
        await pollJobStatus(jobId);
        
        if (activeJobIds.current.has(jobId)) {
          pollingIntervalRef.current = setTimeout(poll, pollingInterval);
        }
      }
    };
    
    poll();
  }, [pollJobStatus, pollingInterval]);

  const startExport = useCallback(async (options: ExportOptions) => {
    if (!onExport) {
      throw new Error('Export handler not provided');
    }

    try {
      setIsExporting(true);
      setExportError(null);
      setExportProgress(0);

      const response = await onExport(options);
      
      if (response.jobId) {
        // Background job - start polling
        const newJob: ExportJob = {
          id: response.jobId,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          estimatedSize: response.estimatedRows
        };
        
        setExportJobs(prev => [newJob, ...prev]);
        setCurrentJob(newJob);
        startPolling(response.jobId);
        
      } else if (response.downloadUrl) {
        // Direct download
        setIsExporting(false);
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = options.fileName || `export_${Date.now()}.${options.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
    } catch (error) {
      setIsExporting(false);
      setExportError(error instanceof Error ? error.message : 'Export failed');
      throw error;
    }
  }, [onExport, startPolling]);

  const cancelExport = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/v1/export/cancel/${jobId}`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to cancel export');
      
      activeJobIds.current.delete(jobId);
      
      setExportJobs(prev =>
        prev.map(job =>
          job.id === jobId
            ? { ...job, status: 'cancelled' as const }
            : job
        )
      );
      
      if (currentJob?.id === jobId) {
        setCurrentJob(null);
        setIsExporting(false);
        setExportProgress(0);
      }
      
    } catch (error) {
      console.error('Failed to cancel export:', error);
      throw error;
    }
  }, [currentJob]);

  const clearCompletedJobs = useCallback(() => {
    setExportJobs(prev => 
      prev.filter(job => !['completed', 'failed', 'cancelled'].includes(job.status))
    );
  }, []);

  const getExportPreview = useCallback(async (options: Partial<ExportOptions>): Promise<ExportPreview | null> => {
    if (!onPreview) return null;
    
    try {
      return await onPreview(options);
    } catch (error) {
      console.error('Failed to get export preview:', error);
      return null;
    }
  }, [onPreview]);

  // Cleanup polling on unmount
  return {
    isExporting,
    exportJobs,
    currentJob,
    startExport,
    cancelExport,
    downloadExport,
    clearCompletedJobs,
    getExportPreview,
    exportProgress,
    exportError
  };
}