'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { Lock, Eye, EyeOff, Shield, AlertCircle, History, Key, RefreshCw, Download } from 'lucide-react';
import { API_CONFIG, getApiUrl } from '@/shared/services/api/config';

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ChangePasswordForm({ onSuccess, onCancel }: ChangePasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordHistory, setPasswordHistory] = useState<any[]>([]);
  const [showPasswordHistory, setShowPasswordHistory] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    getValues,
    setValue
  } = useForm<PasswordFormData>();

  const newPassword = watch('new_password');

  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.PROFILE.PASSWORD), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      setSuccess(true);
      reset();
      
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePassword = (password: string) => {
    const checks = [
      { test: /.{8,}/, label: 'At least 8 characters' },
      { test: /[A-Z]/, label: 'One uppercase letter' },
      { test: /[a-z]/, label: 'One lowercase letter' },
      { test: /\d/, label: 'One number' },
      { test: /[!@#$%^&*(),.?":{}|<>]/, label: 'One special character' }
    ];

    return checks.map(check => ({
      ...check,
      passed: check.test.test(password)
    }));
  };

  const passwordStrengthChecks = newPassword ? validatePassword(newPassword) : [];
  const allChecksPassed = passwordStrengthChecks.every(check => check.passed);

  const generateSecurePassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*(),.?":{}|<>';
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest with random characters
    for (let i = 4; i < 16; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = () => {
    const newPass = generateSecurePassword();
    setGeneratedPassword(newPass);
    setValue('new_password', newPass);
    setValue('confirm_password', newPass);
  };

  const fetchPasswordHistory = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('/api/v1/profile/password-history'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPasswordHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch password history:', err);
    }
  };

  const exportPasswordSecurity = () => {
    const securityData = {
      password_last_changed: new Date().toISOString(),
      password_strength_requirements: passwordStrengthChecks.map(check => ({
        requirement: check.label,
        status: check.passed ? 'met' : 'not_met'
      })),
      generated_at: new Date().toISOString()
    };

    const dataStr = JSON.stringify(securityData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `password-security-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Lock className="h-5 w-5 text-red-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Change Password
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
          <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-600">Password changed successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="current_password" className="flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>Current Password</span>
          </Label>
          <div className="relative mt-1">
            <Input
              id="current_password"
              type={showPasswords.current ? 'text' : 'password'}
              {...register('current_password', {
                required: 'Current password is required'
              })}
              placeholder="Enter your current password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPasswords.current ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.current_password && (
            <p className="text-sm text-red-600 mt-1">{errors.current_password.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="new_password" className="flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>New Password</span>
          </Label>
          <div className="relative mt-1">
            <Input
              id="new_password"
              type={showPasswords.new ? 'text' : 'password'}
              {...register('new_password', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                validate: (value) => {
                  const checks = validatePassword(value);
                  return checks.every(check => check.passed) || 'Password does not meet requirements';
                }
              })}
              placeholder="Enter your new password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPasswords.new ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.new_password && (
            <p className="text-sm text-red-600 mt-1">{errors.new_password.message}</p>
          )}
          
          {newPassword && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password Requirements:
              </p>
              <ul className="space-y-1">
                {passwordStrengthChecks.map((check, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${check.passed ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={check.passed ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                      {check.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="confirm_password" className="flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>Confirm New Password</span>
          </Label>
          <div className="relative mt-1">
            <Input
              id="confirm_password"
              type={showPasswords.confirm ? 'text' : 'password'}
              {...register('confirm_password', {
                required: 'Please confirm your new password',
                validate: (value) => {
                  const newPass = getValues('new_password');
                  return value === newPass || 'Passwords do not match';
                }
              })}
              placeholder="Confirm your new password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPasswords.confirm ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-sm text-red-600 mt-1">{errors.confirm_password.message}</p>
          )}
        </div>

        <div className="space-y-4 pt-4">
          {/* Primary Actions */}
          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={loading || !allChecksPassed}
              className="flex-1"
              variant="default"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={loading}
            >
              Clear
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Password Tools */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Password Tools</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <Key className="h-3 w-3" />
                <span>Generate</span>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchPasswordHistory();
                  setShowPasswordHistory(!showPasswordHistory);
                }}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <History className="h-3 w-3" />
                <span>History</span>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exportPasswordSecurity}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>Export</span>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setValue('new_password', '');
                  setValue('confirm_password', '');
                  setGeneratedPassword('');
                }}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset</span>
              </Button>
            </div>
            
            {generatedPassword && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-700 font-medium">Generated Password:</p>
                <p className="text-sm font-mono text-blue-900 break-all">{generatedPassword}</p>
                <p className="text-xs text-blue-600 mt-1">Password has been filled in the form above.</p>
              </div>
            )}
            
            {showPasswordHistory && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-xs text-gray-700 font-medium mb-2">Recent Password Changes:</p>
                {passwordHistory.length > 0 ? (
                  <ul className="space-y-1">
                    {passwordHistory.slice(0, 5).map((entry, index) => (
                      <li key={index} className="text-xs text-gray-600">
                        {new Date(entry.changed_at).toLocaleDateString()} - via {entry.method || 'web'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">No password history available.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </Card>
  );
}