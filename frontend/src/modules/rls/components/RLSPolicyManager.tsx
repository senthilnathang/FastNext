'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  Users,
  Lock,
  Settings,
  Search,
  RotateCcw
} from 'lucide-react';
import { getApiUrl } from '@/shared/services/api/config';

// Types
interface RLSPolicy {
  id: number;
  name: string;
  description?: string;
  entity_type: EntityType;
  table_name: string;
  policy_type: PolicyType;
  action: ActionType;
  condition_column?: string;
  condition_value_source?: string;
  custom_condition?: string;
  required_roles?: string[];
  required_permissions?: string[];
  is_active: boolean;
  priority: number;
  organization_id?: number;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

enum EntityType {
  PROJECT = 'PROJECT',
  PAGE = 'PAGE',
  COMPONENT = 'COMPONENT',
  USER = 'USER',
  ASSET = 'ASSET',
  ROLE = 'ROLE',
  PERMISSION = 'PERMISSION',
  ORGANIZATION = 'ORGANIZATION',
  CUSTOM = 'CUSTOM'
}

enum PolicyType {
  OWNER_ONLY = 'OWNER_ONLY',
  ORGANIZATION_MEMBER = 'ORGANIZATION_MEMBER',
  PROJECT_MEMBER = 'PROJECT_MEMBER',
  ROLE_BASED = 'ROLE_BASED',
  CONDITIONAL = 'CONDITIONAL',
  PUBLIC = 'PUBLIC',
  TENANT_ISOLATED = 'TENANT_ISOLATED'
}

enum ActionType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ALL = 'ALL'
}

interface RLSPolicyFormData {
  name: string;
  description?: string;
  entity_type: EntityType;
  table_name: string;
  policy_type: PolicyType;
  action: ActionType;
  condition_column?: string;
  condition_value_source?: string;
  custom_condition?: string;
  required_roles?: string[];
  required_permissions?: string[];
  priority: number;
  organization_id?: number;
  is_active: boolean;
}

export default function RLSPolicyManager() {
  const [policies, setPolicies] = useState<RLSPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<RLSPolicy | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntityType, setFilterEntityType] = useState<EntityType | ''>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<RLSPolicyFormData>();

  const watchPolicyType = watch('policy_type');

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const params = new URLSearchParams();
      if (filterEntityType) params.append('entity_type', filterEntityType);
      if (filterActive !== null) params.append('is_active', filterActive.toString());

      const response = await fetch(`${getApiUrl('/api/v1/rls/policies')}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch RLS policies');

      const data = await response.json();
      setPolicies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RLS policies');
    } finally {
      setLoading(false);
    }
  }, [filterEntityType, filterActive]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const onSubmit = async (data: RLSPolicyFormData) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('access_token');
      const url = selectedPolicy 
        ? `${getApiUrl('/api/v1/rls/policies')}/${selectedPolicy.id}`
        : getApiUrl('/api/v1/rls/policies');
      
      const method = selectedPolicy ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save RLS policy');
      }

      setSuccess(true);
      reset();
      setShowCreateForm(false);
      setShowEditForm(false);
      setSelectedPolicy(null);
      await fetchPolicies();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (policy: RLSPolicy) => {
    setSelectedPolicy(policy);
    
    // Populate form
    setValue('name', policy.name);
    setValue('description', policy.description || '');
    setValue('entity_type', policy.entity_type);
    setValue('table_name', policy.table_name);
    setValue('policy_type', policy.policy_type);
    setValue('action', policy.action);
    setValue('condition_column', policy.condition_column || '');
    setValue('condition_value_source', policy.condition_value_source || '');
    setValue('custom_condition', policy.custom_condition || '');
    setValue('required_roles', policy.required_roles || []);
    setValue('required_permissions', policy.required_permissions || []);
    setValue('priority', policy.priority);
    setValue('organization_id', policy.organization_id);
    setValue('is_active', policy.is_active);
    
    setShowEditForm(true);
  };

  const handleDelete = async (policyId: number) => {
    if (!confirm('Are you sure you want to delete this RLS policy? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${getApiUrl('/api/v1/rls/policies')}/${policyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete RLS policy');
      }

      setSuccess(true);
      await fetchPolicies();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete policy');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (policy: RLSPolicy) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${getApiUrl('/api/v1/rls/policies')}/${policy.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_active: !policy.is_active
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update policy status');
      }

      await fetchPolicies();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy');
    } finally {
      setSaving(false);
    }
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = !searchTerm || 
      policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getPolicyTypeIcon = (policyType: PolicyType) => {
    switch (policyType) {
      case PolicyType.OWNER_ONLY: return <Lock className="h-4 w-4 text-red-600" />;
      case PolicyType.ORGANIZATION_MEMBER: return <Users className="h-4 w-4 text-blue-600" />;
      case PolicyType.PROJECT_MEMBER: return <Users className="h-4 w-4 text-green-600" />;
      case PolicyType.ROLE_BASED: return <Shield className="h-4 w-4 text-purple-600" />;
      case PolicyType.CONDITIONAL: return <Settings className="h-4 w-4 text-orange-600" />;
      case PolicyType.PUBLIC: return <Eye className="h-4 w-4 text-gray-600" />;
      case PolicyType.TENANT_ISOLATED: return <Lock className="h-4 w-4 text-indigo-600" />;
      default: return <Settings className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: ActionType) => {
    switch (action) {
      case ActionType.SELECT: return 'text-blue-600 bg-blue-50';
      case ActionType.INSERT: return 'text-green-600 bg-green-50';
      case ActionType.UPDATE: return 'text-orange-600 bg-orange-50';
      case ActionType.DELETE: return 'text-red-600 bg-red-50';
      case ActionType.ALL: return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading RLS policies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Row Level Security Policies
          </h1>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Policy</span>
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Search Policies</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="entity-filter">Entity Type</Label>
            <select
              id="entity-filter"
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value as EntityType | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Entity Types</option>
              {Object.values(EntityType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div>
            <Label htmlFor="active-filter">Status</Label>
            <select
              id="active-filter"
              value={filterActive === null ? '' : filterActive.toString()}
              onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <Button
              variant="outline"
              onClick={fetchPolicies}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Error and Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-600">Operation completed successfully!</p>
          </div>
        </div>
      )}

      {/* Policies List */}
      <div className="grid gap-4">
        {filteredPolicies.map((policy) => (
          <Card key={policy.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {getPolicyTypeIcon(policy.policy_type)}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {policy.name}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(policy.action)}`}>
                    {policy.action}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    policy.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {policy.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {policy.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-3">{policy.description}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Entity Type:</span>
                    <p className="text-gray-900 dark:text-white">{policy.entity_type}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Table:</span>
                    <p className="text-gray-900 dark:text-white">{policy.table_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Policy Type:</span>
                    <p className="text-gray-900 dark:text-white">{policy.policy_type}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Priority:</span>
                    <p className="text-gray-900 dark:text-white">{policy.priority}</p>
                  </div>
                </div>
                
                {policy.custom_condition && (
                  <div className="mt-3">
                    <span className="font-medium text-gray-500">Custom Condition:</span>
                    <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                      {policy.custom_condition}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(policy)}
                  disabled={saving}
                >
                  {policy.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(policy)}
                  disabled={saving}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(policy.id)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredPolicies.length === 0 && (
        <div className="text-center py-8">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No RLS policies found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first RLS policy.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showCreateForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedPolicy ? 'Edit RLS Policy' : 'Create RLS Policy'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowEditForm(false);
                    setSelectedPolicy(null);
                    reset();
                  }}
                >
                  ×
                </Button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Policy Name *</Label>
                    <Input
                      id="name"
                      {...register('name', { required: 'Policy name is required' })}
                      placeholder="Enter policy name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority *</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="1000"
                      {...register('priority', { 
                        required: 'Priority is required',
                        min: { value: 1, message: 'Priority must be at least 1' },
                        max: { value: 1000, message: 'Priority must be at most 1000' }
                      })}
                      placeholder="100"
                    />
                    {errors.priority && (
                      <p className="text-sm text-red-600 mt-1">{errors.priority.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Enter policy description"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="entity_type">Entity Type *</Label>
                    <select
                      id="entity_type"
                      {...register('entity_type', { required: 'Entity type is required' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select entity type</option>
                      {Object.values(EntityType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.entity_type && (
                      <p className="text-sm text-red-600 mt-1">{errors.entity_type.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="policy_type">Policy Type *</Label>
                    <select
                      id="policy_type"
                      {...register('policy_type', { required: 'Policy type is required' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select policy type</option>
                      {Object.values(PolicyType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.policy_type && (
                      <p className="text-sm text-red-600 mt-1">{errors.policy_type.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="action">Action *</Label>
                    <select
                      id="action"
                      {...register('action', { required: 'Action is required' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select action</option>
                      {Object.values(ActionType).map(action => (
                        <option key={action} value={action}>{action}</option>
                      ))}
                    </select>
                    {errors.action && (
                      <p className="text-sm text-red-600 mt-1">{errors.action.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="table_name">Table Name *</Label>
                  <Input
                    id="table_name"
                    {...register('table_name', { required: 'Table name is required' })}
                    placeholder="Enter database table name"
                  />
                  {errors.table_name && (
                    <p className="text-sm text-red-600 mt-1">{errors.table_name.message}</p>
                  )}
                </div>

                {/* Conditional fields based on policy type */}
                {watchPolicyType === PolicyType.OWNER_ONLY && (
                  <div>
                    <Label htmlFor="condition_column">Owner Column</Label>
                    <Input
                      id="condition_column"
                      {...register('condition_column')}
                      placeholder="user_id"
                      defaultValue="user_id"
                    />
                    <p className="text-xs text-gray-500 mt-1">Column that identifies the owner</p>
                  </div>
                )}

                {watchPolicyType === PolicyType.CONDITIONAL && (
                  <div>
                    <Label htmlFor="custom_condition">Custom Condition *</Label>
                    <Textarea
                      id="custom_condition"
                      {...register('custom_condition', { 
                        required: watchPolicyType === PolicyType.CONDITIONAL ? 'Custom condition is required for conditional policies' : false 
                      })}
                      placeholder="is_public = true OR user_id = :user_id"
                      rows={3}
                    />
                    {errors.custom_condition && (
                      <p className="text-sm text-red-600 mt-1">{errors.custom_condition.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Use :user_id, :organization_id, :entity_id placeholders
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    {...register('is_active')}
                    defaultChecked={true}
                  />
                  <Label htmlFor="is_active">Active Policy</Label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setShowEditForm(false);
                      setSelectedPolicy(null);
                      reset();
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : selectedPolicy ? 'Update Policy' : 'Create Policy'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}