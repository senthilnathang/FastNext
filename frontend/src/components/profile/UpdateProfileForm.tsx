'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { User, MapPin, Globe, FileText } from 'lucide-react';
import { API_CONFIG, getApiUrl } from '@/lib/api/config';

interface ProfileFormData {
  full_name: string;
  bio: string;
  location: string;
  website: string;
  avatar_url: string;
}

interface UpdateProfileFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function UpdateProfileForm({ onSuccess, onCancel }: UpdateProfileFormProps) {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<ProfileFormData>();

  useEffect(() => {
    if (user) {
      setValue('full_name', user.full_name || '');
      setValue('bio', user.bio || '');
      setValue('location', user.location || '');
      setValue('website', user.website || '');
      setValue('avatar_url', user.avatar_url || '');
    }
  }, [user, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.PROFILE.ME), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      updateUser(updatedUser);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    reset();
    if (user) {
      setValue('full_name', user.full_name || '');
      setValue('bio', user.bio || '');
      setValue('location', user.location || '');
      setValue('website', user.website || '');
      setValue('avatar_url', user.avatar_url || '');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <User className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Update Profile
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">Profile updated successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="full_name" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Full Name</span>
          </Label>
          <Input
            id="full_name"
            {...register('full_name', {
              maxLength: { value: 255, message: 'Full name must be less than 255 characters' }
            })}
            placeholder="Enter your full name"
            className="mt-1"
          />
          {errors.full_name && (
            <p className="text-sm text-red-600 mt-1">{errors.full_name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="bio" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Bio</span>
          </Label>
          <textarea
            id="bio"
            {...register('bio', {
              maxLength: { value: 1000, message: 'Bio must be less than 1000 characters' }
            })}
            placeholder="Tell us about yourself"
            rows={3}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors.bio && (
            <p className="text-sm text-red-600 mt-1">{errors.bio.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="location" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Location</span>
          </Label>
          <Input
            id="location"
            {...register('location', {
              maxLength: { value: 255, message: 'Location must be less than 255 characters' }
            })}
            placeholder="Your location"
            className="mt-1"
          />
          {errors.location && (
            <p className="text-sm text-red-600 mt-1">{errors.location.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="website" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Website</span>
          </Label>
          <Input
            id="website"
            type="url"
            {...register('website', {
              maxLength: { value: 500, message: 'Website URL must be less than 500 characters' },
              pattern: {
                value: /^https?:\/\/.*/,
                message: 'Website must be a valid URL starting with http:// or https://'
              }
            })}
            placeholder="https://your-website.com"
            className="mt-1"
          />
          {errors.website && (
            <p className="text-sm text-red-600 mt-1">{errors.website.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="avatar_url" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Avatar URL</span>
          </Label>
          <Input
            id="avatar_url"
            type="url"
            {...register('avatar_url', {
              maxLength: { value: 500, message: 'Avatar URL must be less than 500 characters' }
            })}
            placeholder="https://your-avatar-url.com/image.jpg"
            className="mt-1"
          />
          {errors.avatar_url && (
            <p className="text-sm text-red-600 mt-1">{errors.avatar_url.message}</p>
          )}
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
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