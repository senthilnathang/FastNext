'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Lock, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    getValues
  } = useForm<PasswordFormData>();

  const newPassword = watch('new_password');

  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/profile/me/password', {
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

        <div className="flex space-x-3 pt-4">
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
      </form>
    </Card>
  );
}