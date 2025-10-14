'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/modules/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components';
import {
  Upload,
  Download,
  FileText,
  Shield,
  AlertCircle
} from 'lucide-react';

export default function DataImportExportConfigPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState({
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
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load configuration on component mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found');
        return;
      }

      const response = await fetch('/api/v1/config/data-import-export/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.status}`);
      }

      const data = await response.json();
      if (data.config_data) {
        setConfig(data.config_data);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found');
        return;
      }

      const response = await fetch('/api/v1/config/data-import-export/current', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config_data: config,
          change_reason: 'Updated via configuration UI'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.status}`);
      }

      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    saveConfiguration();
  };

  const resetToDefaults = () => {
    setConfig({
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
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Import Settings</span>
            </CardTitle>
            <CardDescription>Configure data import parameters and validation rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                value={config.max_file_size_mb}
                onChange={(e) => setConfig(prev => ({ ...prev, max_file_size_mb: parseInt(e.target.value) || 100 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchSize">Batch Processing Size</Label>
              <Input
                id="batchSize"
                type="number"
                value={config.batch_size}
                onChange={(e) => setConfig(prev => ({ ...prev, batch_size: parseInt(e.target.value) || 1000 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Processing Timeout (seconds)</Label>
              <Input
                id="timeout"
                type="number"
                value={config.timeout_seconds}
                onChange={(e) => setConfig(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) || 300 }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enableValidation"
                checked={config.enable_validation}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enable_validation: checked }))}
              />
              <Label htmlFor="enableValidation">Enable Data Validation</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="requireApproval"
                checked={config.require_approval}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_approval: checked }))}
              />
              <Label htmlFor="requireApproval">Require Import Approval</Label>
            </div>
          </CardContent>
        </Card>

        {/* Export Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Export Settings</span>
            </CardTitle>
            <CardDescription>Configure data export formats and compression options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compressionLevel">Compression Level</Label>
              <Select
                value={config.compression_level}
                onValueChange={(value) => setConfig(prev => ({ ...prev, compression_level: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retentionDays">File Retention (days)</Label>
              <Input
                id="retentionDays"
                type="number"
                value={config.retention_days}
                onChange={(e) => setConfig(prev => ({ ...prev, retention_days: parseInt(e.target.value) || 30 }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="notifyOnCompletion"
                checked={config.notify_on_completion}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, notify_on_completion: checked }))}
              />
              <Label htmlFor="notifyOnCompletion">Notify on Completion</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enableAuditLog"
                checked={config.enable_audit_log}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enable_audit_log: checked }))}
              />
              <Label htmlFor="enableAuditLog">Enable Audit Logging</Label>
            </div>
          </CardContent>
        </Card>

        {/* File Format Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>File Format Settings</span>
            </CardTitle>
            <CardDescription>Configure supported file formats and parsing options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Allowed File Formats</Label>
              <div className="grid grid-cols-2 gap-2">
                {['csv', 'json', 'xlsx', 'xml', 'tsv', 'parquet'].map((format) => (
                  <div key={format} className="flex items-center space-x-2">
                    <Switch
                      id={format}
                      checked={config.allowed_formats.includes(format)}
                      onCheckedChange={(checked) => {
                        setConfig(prev => ({
                          ...prev,
                          allowed_formats: checked
                            ? [...prev.allowed_formats, format]
                            : prev.allowed_formats.filter(f => f !== format)
                        }));
                      }}
                    />
                    <Label htmlFor={format} className="text-sm uppercase">{format}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security & Compliance</span>
            </CardTitle>
            <CardDescription>Configure security measures and compliance requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Security Notice</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    All import/export operations are logged and monitored for compliance.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="encryptionEnabled"
                checked={config.encryption_enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, encryption_enabled: checked }))}
              />
              <Label htmlFor="encryptionEnabled">Enable Encryption</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxConcurrentJobs">Max Concurrent Jobs</Label>
              <Input
                id="maxConcurrentJobs"
                type="number"
                value={config.max_concurrent_jobs}
                onChange={(e) => setConfig(prev => ({ ...prev, max_concurrent_jobs: parseInt(e.target.value) || 5 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memoryLimit">Memory Limit (MB)</Label>
              <Input
                id="memoryLimit"
                type="number"
                value={config.memory_limit_mb}
                onChange={(e) => setConfig(prev => ({ ...prev, memory_limit_mb: parseInt(e.target.value) || 512 }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="parallelProcessing"
                checked={config.parallel_processing}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, parallel_processing: checked }))}
              />
              <Label htmlFor="parallelProcessing">Enable Parallel Processing</Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end space-x-4">
        <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
