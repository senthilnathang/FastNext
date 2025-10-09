'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CommonFormViewManager, createFormViewConfig } from '@/shared/components/views/CommonFormViewManager'
import { FormField } from '@/shared/components/views/GenericFormView'
import { Column } from '@/shared/components/views/ViewManager'
import { Badge } from '@/shared/components/ui/badge'
import { z } from 'zod'
import { useRLSPolicies, useCreateRLSPolicy, useUpdateRLSPolicy, useDeleteRLSPolicy, type RLSPolicy } from '@/modules/rls/hooks/useRLSPolicies'

// Note: RLSPolicy type is imported from hooks

// Validation schema
const rlsPolicySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Policy name is required').max(255),
  description: z.string().optional(),
  entity_type: z.string().min(1, 'Entity type is required'),
  table_name: z.string().min(1, 'Table name is required'),
  policy_type: z.string().min(1, 'Policy type is required'),
  action: z.string().min(1, 'Action is required'),
  condition_column: z.string().optional(),
  condition_value_source: z.string().optional(),
  custom_condition: z.string().optional(),
  required_roles: z.array(z.string()).optional(),
  required_permissions: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
  priority: z.number().min(1).max(999).default(100),
  organization_id: z.number().optional(),
  created_by: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Form fields configuration
const formFields: FormField<RLSPolicy>[] = [
  {
    name: 'name',
    label: 'Policy Name',
    type: 'text',
    required: true,
    placeholder: 'Enter policy name',
    description: 'Unique name for this security policy'
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Describe what this policy does',
    description: 'Optional description of the policy purpose'
  },
  {
    name: 'entity_type',
    label: 'Entity Type',
    type: 'select',
    required: true,
    options: [
      { value: 'project', label: 'Project' },
      { value: 'page', label: 'Page' },
      { value: 'component', label: 'Component' },
      { value: 'user', label: 'User' },
      { value: 'asset', label: 'Asset' },
      { value: 'role', label: 'Role' },
      { value: 'permission', label: 'Permission' },
      { value: 'organization', label: 'Organization' },
      { value: 'custom', label: 'Custom' }
    ],
    description: 'Type of entity this policy applies to'
  },
  {
    name: 'table_name',
    label: 'Table Name',
    type: 'text',
    required: true,
    placeholder: 'e.g., projects, pages, users',
    description: 'Database table name this policy applies to'
  },
  {
    name: 'policy_type',
    label: 'Policy Type',
    type: 'select',
    required: true,
    options: [
      { value: 'owner_only', label: 'Owner Only' },
      { value: 'organization_member', label: 'Organization Member' },
      { value: 'project_member', label: 'Project Member' },
      { value: 'role_based', label: 'Role Based' },
      { value: 'conditional', label: 'Conditional' },
      { value: 'public', label: 'Public' },
      { value: 'tenant_isolated', label: 'Tenant Isolated' }
    ],
    description: 'Type of security policy to apply'
  },
  {
    name: 'action',
    label: 'Action',
    type: 'select',
    required: true,
    options: [
      { value: 'select', label: 'Select (Read)' },
      { value: 'insert', label: 'Insert (Create)' },
      { value: 'update', label: 'Update (Modify)' },
      { value: 'delete', label: 'Delete' },
      { value: 'all', label: 'All Actions' }
    ],
    description: 'Database action this policy controls'
  },
  {
    name: 'condition_column',
    label: 'Condition Column',
    type: 'text',
    placeholder: 'e.g., user_id, organization_id',
    description: 'Column to check for access control (optional)'
  },
  {
    name: 'condition_value_source',
    label: 'Condition Value Source',
    type: 'text',
    placeholder: 'e.g., current_user.id, session.tenant_id',
    description: 'Source of the value to compare against (optional)'
  },
  {
    name: 'custom_condition',
    label: 'Custom Condition',
    type: 'textarea',
    placeholder: 'Custom SQL condition...',
    description: 'Advanced: Custom SQL condition for complex rules'
  },
  {
    name: 'priority',
    label: 'Priority',
    type: 'number',
    required: true,
    defaultValue: 100,
    min: 1,
    max: 999,
    description: 'Policy priority (higher number = higher priority)'
  },
  {
    name: 'is_active',
    label: 'Active',
    type: 'checkbox',
    defaultValue: true,
    description: 'Whether this policy is currently active'
  }
]

// Table columns configuration
const columns: Column<RLSPolicy>[] = [
  {
    id: 'name',
    key: 'name',
    label: 'Policy Name',
    sortable: true,
    searchable: true
  },
  {
    id: 'entity_type',
    key: 'entity_type',
    label: 'Entity Type',
    sortable: true,
    filterable: true,
    render: (value) => (
      <Badge variant="outline">{String(value).replace('_', ' ')}</Badge>
    )
  },
  {
    id: 'policy_type',
    key: 'policy_type',
    label: 'Policy Type',
    sortable: true,
    filterable: true,
    render: (value) => (
      <Badge variant="secondary">{String(value).replace('_', ' ')}</Badge>
    )
  },
  {
    id: 'action',
    key: 'action',
    label: 'Action',
    sortable: true,
    filterable: true,
    render: (value) => (
      <Badge variant="default">{String(value).toUpperCase()}</Badge>
    )
  },
  {
    id: 'table_name',
    key: 'table_name',
    label: 'Table',
    sortable: true,
    searchable: true
  },
  {
    id: 'priority',
    key: 'priority',
    label: 'Priority',
    sortable: true,
    type: 'number'
  },
  {
    id: 'is_active',
    key: 'is_active',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value) => (
      <Badge variant={value ? 'default' : 'secondary'}>
        {value ? 'Active' : 'Inactive'}
      </Badge>
    )
  },
  {
    id: 'created_at',
    key: 'created_at',
    label: 'Created',
    sortable: true,
    render: (value) => new Date(String(value)).toLocaleDateString()
  }
]

export default function RLSPoliciesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Use RLS hooks
  const { data: policiesData, isLoading, error } = useRLSPolicies()
  const createPolicyMutation = useCreateRLSPolicy()
  const updatePolicyMutation = useUpdateRLSPolicy()
  const deletePolicyMutation = useDeleteRLSPolicy()

  // Determine current mode from URL
  const mode = searchParams.get('mode') || 'list'
  const itemId = searchParams.get('id') || undefined

  const handleModeChange = (newMode: string, newItemId?: string | number) => {
    const params = new URLSearchParams()
    if (newMode !== 'list') {
      params.set('mode', newMode)
      if (newItemId) {
        params.set('id', String(newItemId))
      }
    }
    router.push(`/admin/rls/policies?${params.toString()}`)
  }

  const policies = policiesData || []

  // API functions
  const fetchPolicies = async (): Promise<RLSPolicy[]> => {
    return policies
  }

  const createPolicy = async (data: RLSPolicy): Promise<RLSPolicy> => {
    return new Promise((resolve, reject) => {
      createPolicyMutation.mutate(data as any, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(error)
      })
    })
  }

  const updatePolicy = async (id: string | number, data: RLSPolicy): Promise<RLSPolicy> => {
    return new Promise((resolve, reject) => {
      updatePolicyMutation.mutate({ id: Number(id), data: data as any }, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(error)
      })
    })
  }

  const deletePolicy = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      deletePolicyMutation.mutate(Number(id), {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      })
    })
  }

  // Create form view configuration
  const config = createFormViewConfig<RLSPolicy>({
    resourceName: 'rls_policy',
    baseUrl: '/admin/rls/policies',
    apiEndpoint: '/api/v1/rls/policies',
    title: 'RLS Security Policies',
    subtitle: 'Configure row-level security policies to control data access',
    formFields,
    columns,
    validationSchema: rlsPolicySchema,
    onFetch: fetchPolicies,
    onCreate: createPolicy,
    onUpdate: updatePolicy,
    onDelete: deletePolicy,
  })

  return (
    <CommonFormViewManager
      config={config}
      mode={mode as any}
      itemId={itemId}
      onModeChange={handleModeChange}
      data={policies}
      loading={isLoading}
      error={error ? String(error) : null}
    />
  )
}