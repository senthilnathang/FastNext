'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { 
  Shield, 
  Smartphone, 
  Lock, 
  Database, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Mail
} from 'lucide-react';
import { API_CONFIG, getApiUrl } from '@/shared/services/api/config';

interface SecuritySettingsData {
  two_factor_enabled: boolean;
  require_password_change: boolean;
  password_expiry_days: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  max_session_duration_hours: number;
  allow_concurrent_sessions: boolean;
  max_concurrent_sessions: number;
  email_on_login: boolean;
  email_on_password_change: boolean;
  email_on_security_change: boolean;
  email_on_suspicious_activity: boolean;
  activity_logging_enabled: boolean;
  data_retention_days: number;
  api_access_enabled: boolean;
  api_rate_limit: number;
}

interface SecurityOverview {
  user_id: number;
  two_factor_enabled: boolean;
  password_strength_score: number;
  last_password_change: string | null;
  active_sessions_count: number;
  recent_login_attempts: number;
  security_score: number;
  recommendations: string[];
}

export default function SecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettingsData | null>(null);
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm<SecuritySettingsData>();

  const allowConcurrentSessions = watch('allow_concurrent_sessions');

  useEffect(() => {
    fetchSecuritySettings();
    fetchSecurityOverview();
  }, []);

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const fetchSecuritySettings = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.SECURITY.SETTINGS), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch security settings');
      
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security settings');
    }
  };

  const fetchSecurityOverview = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.SECURITY.OVERVIEW), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch security overview');
      
      const data = await response.json();
      setOverview(data);
    } catch (err) {
      console.error('Failed to load security overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SecuritySettingsData) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.SECURITY.SETTINGS), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update security settings');
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      setSuccess(true);
      
      // Refresh overview
      await fetchSecurityOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEnable2FA = async () => {
    // TODO: Implement 2FA setup modal
    alert('2FA setup not implemented yet');
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will reduce your account security.')) {
      return;
    }

    const password = prompt('Please enter your current password to confirm:');
    if (!password) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.SECURITY.TWO_FA_DISABLE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to disable 2FA');
      }

      await fetchSecuritySettings();
      await fetchSecurityOverview();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setSaving(false);
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSecurityScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-200';
    if (score >= 60) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading security settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      {overview && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Security Overview
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-lg border-2 ${getSecurityScoreBg(overview.security_score)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Security Score</span>
                <Shield className="h-4 w-4 text-gray-600" />
              </div>
              <div className={`text-2xl font-bold ${getSecurityScoreColor(overview.security_score)}`}>
                {overview.security_score}/100
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">2FA Status</span>
                <Smartphone className="h-4 w-4 text-gray-600" />
              </div>
              <div className={`text-lg font-semibold ${overview.two_factor_enabled ? 'text-green-600' : 'text-red-600'}`}>
                {overview.two_factor_enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Active Sessions</span>
                <Users className="h-4 w-4 text-gray-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {overview.active_sessions_count}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Recent Attempts</span>
                <Lock className="h-4 w-4 text-gray-600" />
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {overview.recent_login_attempts}
              </div>
            </div>
          </div>
          
          {overview.recommendations.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                Security Recommendations
              </h3>
              <ul className="space-y-1">
                {overview.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Security settings updated successfully!
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Two-Factor Authentication */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Smartphone className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Two-Factor Authentication
            </h3>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Enable Two-Factor Authentication
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Add an extra layer of security to your account with TOTP authentication
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {settings?.two_factor_enabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisable2FA}
                  disabled={saving}
                  className="text-red-600 hover:text-red-700"
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleEnable2FA}
                  disabled={saving}
                >
                  Setup 2FA
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Login Security */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Lock className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Login Security
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="password_expiry_days">Password Expiry (days)</Label>
              <Input
                id="password_expiry_days"
                type="number"
                min="0"
                max="365"
                {...register('password_expiry_days', {
                  min: { value: 0, message: 'Must be 0 or greater' },
                  max: { value: 365, message: 'Must be 365 or less' }
                })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Set to 0 for no expiry</p>
            </div>
            
            <div>
              <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
              <Input
                id="max_login_attempts"
                type="number"
                min="1"
                max="20"
                {...register('max_login_attempts', {
                  min: { value: 1, message: 'Must be at least 1' },
                  max: { value: 20, message: 'Must be 20 or less' }
                })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="lockout_duration_minutes">Lockout Duration (minutes)</Label>
              <Input
                id="lockout_duration_minutes"
                type="number"
                min="1"
                max="1440"
                {...register('lockout_duration_minutes', {
                  min: { value: 1, message: 'Must be at least 1 minute' },
                  max: { value: 1440, message: 'Must be 1440 minutes or less' }
                })}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Session Security */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Session Security
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_session_duration_hours">Max Session Duration (hours)</Label>
              <Input
                id="max_session_duration_hours"
                type="number"
                min="1"
                max="168"
                {...register('max_session_duration_hours', {
                  min: { value: 1, message: 'Must be at least 1 hour' },
                  max: { value: 168, message: 'Must be 168 hours or less' }
                })}
                className="mt-1"
              />
            </div>
            
            {allowConcurrentSessions && (
              <div>
                <Label htmlFor="max_concurrent_sessions">Max Concurrent Sessions</Label>
                <Input
                  id="max_concurrent_sessions"
                  type="number"
                  min="1"
                  max="20"
                  {...register('max_concurrent_sessions', {
                    min: { value: 1, message: 'Must be at least 1' },
                    max: { value: 20, message: 'Must be 20 or less' }
                  })}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_concurrent_sessions"
                {...register('allow_concurrent_sessions')}
              />
              <Label htmlFor="allow_concurrent_sessions" className="text-sm">
                Allow multiple concurrent sessions
              </Label>
            </div>
          </div>
        </Card>

        {/* Email Notifications */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Email Notifications
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email_on_login"
                {...register('email_on_login')}
              />
              <Label htmlFor="email_on_login" className="text-sm">
                Send email notification on login
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email_on_password_change"
                {...register('email_on_password_change')}
              />
              <Label htmlFor="email_on_password_change" className="text-sm">
                Send email notification on password change
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email_on_security_change"
                {...register('email_on_security_change')}
              />
              <Label htmlFor="email_on_security_change" className="text-sm">
                Send email notification on security changes
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email_on_suspicious_activity"
                {...register('email_on_suspicious_activity')}
              />
              <Label htmlFor="email_on_suspicious_activity" className="text-sm">
                Send email notification on suspicious activity
              </Label>
            </div>
          </div>
        </Card>

        {/* Privacy & Data */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Database className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Privacy & Data
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="data_retention_days">Data Retention (days)</Label>
              <Input
                id="data_retention_days"
                type="number"
                min="0"
                max="3650"
                {...register('data_retention_days', {
                  min: { value: 0, message: 'Must be 0 or greater' },
                  max: { value: 3650, message: 'Must be 3650 days or less' }
                })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Set to 0 for indefinite retention</p>
            </div>
            
            <div>
              <Label htmlFor="api_rate_limit">API Rate Limit (requests/hour)</Label>
              <Input
                id="api_rate_limit"
                type="number"
                min="10"
                max="10000"
                {...register('api_rate_limit', {
                  min: { value: 10, message: 'Must be at least 10' },
                  max: { value: 10000, message: 'Must be 10000 or less' }
                })}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="activity_logging_enabled"
                {...register('activity_logging_enabled')}
              />
              <Label htmlFor="activity_logging_enabled" className="text-sm">
                Enable activity logging
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="api_access_enabled"
                {...register('api_access_enabled')}
              />
              <Label htmlFor="api_access_enabled" className="text-sm">
                Enable API access
              </Label>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}