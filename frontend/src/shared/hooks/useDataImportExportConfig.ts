import { useState, useEffect } from 'react';

interface DataImportExportConfig {
  max_file_size_mb: number;
  allowed_formats: string[];
  batch_size: number;
  timeout_seconds: number;
  enable_validation: boolean;
  enable_audit_log: boolean;
  require_approval: boolean;
  notify_on_completion: boolean;
  retention_days: number;
  compression_level: string;
  encryption_enabled: boolean;
  parallel_processing: boolean;
  max_concurrent_jobs: number;
  memory_limit_mb: number;
}

const defaultConfig: DataImportExportConfig = {
  max_file_size_mb: 100,
  allowed_formats: ['csv', 'json', 'xlsx'],
  batch_size: 1000,
  timeout_seconds: 300,
  enable_validation: true,
  enable_audit_log: true,
  require_approval: false,
  notify_on_completion: true,
  retention_days: 30,
  compression_level: 'medium',
  encryption_enabled: false,
  parallel_processing: true,
  max_concurrent_jobs: 5,
  memory_limit_mb: 512
};

export function useDataImportExportConfig() {
  const [config, setConfig] = useState<DataImportExportConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('No access token found, using default configuration');
        setConfig(defaultConfig);
        return;
      }

      const response = await fetch('/api/v1/config/data-import-export/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Configuration not found, use defaults
          console.warn('Configuration not found, using default configuration');
          setConfig(defaultConfig);
          return;
        }
        throw new Error(`Failed to load configuration: ${response.status}`);
      }

      const data = await response.json();
      if (data.config_data) {
        setConfig({ ...defaultConfig, ...data.config_data });
      } else {
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to load configuration');
      // Fall back to default configuration
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const refreshConfig = () => {
    loadConfiguration();
  };

  return {
    config,
    loading,
    error,
    refreshConfig,
    // Helper methods for common checks
    isFormatAllowed: (format: string) => config.allowed_formats.includes(format.toLowerCase()),
    getMaxFileSize: () => config.max_file_size_mb,
    getBatchSize: () => config.batch_size,
    shouldValidate: () => config.enable_validation,
    requiresApproval: () => config.require_approval,
    shouldNotify: () => config.notify_on_completion,
    shouldAuditLog: () => config.enable_audit_log
  };
}