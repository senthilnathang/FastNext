'use client'

import React, { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CommonFormViewManager, createFormViewConfig } from '@/shared/components/views/CommonFormViewManager'
import { FormField } from '@/shared/components/views/GenericFormView'
import { Column } from '@/shared/components/views/ViewManager'
import { Badge } from '@/shared/components/ui/badge'
import { z } from 'zod'
import { useRLSAssignments, useCreateRLSAssignment, useUpdateRLSAssignment, useDeleteRLSAssignment, type RLSRuleAssignment } from '@/modules/rls/hooks/useRLSAssignments'
import { useRLSPolicies } from '@/modules/rls/hooks/useRLSPolicies'

// Note: RLSRuleAssignment type is imported from hooks

// Validation schema
const rlsAssignmentSchema = z.object({
  id: z.number().optional(),
  policy_id: z.number().min(1, 'Policy is required'),
  entity_type: z.string().min(1, 'Entity type is required'),
  entity_id: z.number().optional(),
  user_id: z.number().optional(),
  role_id: z.number().optional(),
  is_active: z.boolean().default(true),
  conditions: z.record(z.string(), z.any()).optional(),
  created_by: z.number().optional(),
  created_at: z.string().optional(),
  // Relations (optional)
  policy: z.object({
    id: z.number(),
    name: z.string(),
    policy_type: z.string(),
  }).optional(),
  user: z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
  }).optional(),
  role: z.object({
    id: z.number(),
    name: z.string(),
  }).optional(),
}).refine(data => data.user_id || data.role_id, {
  message: "Either user or role must be specified",
  path: ["user_id"]
})

// Form fields configuration
const formFields: FormField<RLSRuleAssignment>[] = [
  {
    name: 'policy_id',
    label: 'Security Policy',
    type: 'select',
    required: true,
    options: [], // Will be populated dynamically
    description: 'Select the security policy to assign'
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
    description: 'Type of entity this assignment applies to'
  },
  {
    name: 'entity_id',
    label: 'Entity ID',
    type: 'number',
    placeholder: 'Leave empty to apply to all entities',
    description: 'Specific entity ID (optional - leave empty for all entities of this type)'
  },
  {
    name: 'user_id',
    label: 'User',
    type: 'select',
    options: [], // Will be populated dynamically
    description: 'Assign to specific user (choose either user or role, not both)'
  },
  {
    name: 'role_id',
    label: 'Role',
    type: 'select',
    options: [], // Will be populated dynamically
    description: 'Assign to users with this role (choose either user or role, not both)'
  },
  {
    name: 'is_active',
    label: 'Active',
    type: 'checkbox',
    defaultValue: true,
    description: 'Whether this assignment is currently active'
  },
  {
    name: 'conditions',
    label: 'Additional Conditions',
    type: 'textarea',
    placeholder: '{"key": "value"}',
    description: 'Optional JSON object with additional conditions'
  }
]

// Table columns configuration
const columns: Column<RLSRuleAssignment>[] = [
  {
    id: 'policy',
    key: 'policy_id',
    label: 'Policy',
    sortable: true,
    searchable: true,
    render: (value, row) => (
      <div>
        <div className="font-medium">{row.policy?.name || `Policy ${value}`}</div>
        {row.policy?.policy_type && (
          <Badge variant="outline" className="text-xs">
            {row.policy.policy_type.replace('_', ' ')}
          </Badge>
        )}
      </div>
    )
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
    id: 'entity_id',
    key: 'entity_id',
    label: 'Entity ID',
    sortable: true,
    render: (value) => {
      if (!value) {
        return <span className="text-muted-foreground">All</span>
      }
      return <span>{String(value)}</span>
    }
  },
  {
    id: 'assigned_to',
    key: 'user_id',
    label: 'Assigned To',
    searchable: true,
    render: (value, row) => {
      if (row.user) {
        return (
          <div>
            <div className="font-medium">{row.user.name}</div>
            <div className="text-xs text-muted-foreground">{row.user.email}</div>
          </div>
        )
      }
      if (row.role) {
        return (
          <Badge variant="secondary">Role: {row.role.name}</Badge>
        )
      }
      return <span className="text-muted-foreground">-</span>
    }
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

export default function RLSAssignmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Use RLS hooks
  const { data: assignmentsData, isLoading, error } = useRLSAssignments()
  const { data: policiesData } = useRLSPolicies()
  const createAssignmentMutation = useCreateRLSAssignment()
  const updateAssignmentMutation = useUpdateRLSAssignment()
  const deleteAssignmentMutation = useDeleteRLSAssignment()

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
    router.push(`/admin/rls/assignments?${params.toString()}`)
  }

  const assignments = assignmentsData || []

  // API functions
  const fetchAssignments = async (): Promise<RLSRuleAssignment[]> => {
    return assignments
  }

  const createAssignment = async (data: RLSRuleAssignment): Promise<RLSRuleAssignment> => {
    // Parse conditions if it's a string
    const processedData = {
      ...data,
      conditions: typeof data.conditions === 'string' 
        ? JSON.parse(data.conditions || '{}') 
        : data.conditions
    }

    return new Promise((resolve, reject) => {
      createAssignmentMutation.mutate(processedData as any, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(error)
      })
    })
  }

  const updateAssignment = async (id: string | number, data: RLSRuleAssignment): Promise<RLSRuleAssignment> => {
    // Parse conditions if it's a string
    const processedData = {
      ...data,
      conditions: typeof data.conditions === 'string' 
        ? JSON.parse(data.conditions || '{}') 
        : data.conditions
    }

    return new Promise((resolve, reject) => {
      updateAssignmentMutation.mutate({ id: Number(id), data: processedData as any }, {
        onSuccess: (result) => resolve(result),
        onError: (error) => reject(error)
      })
    })
  }

  const deleteAssignment = async (id: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
      deleteAssignmentMutation.mutate(Number(id), {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      })
    })
  }

  // Populate form options
  useEffect(() => {
    // Load policies for form options
    if (policiesData) {
      const policyField = formFields.find(f => f.name === 'policy_id')
      if (policyField) {
        policyField.options = policiesData.map((policy: any) => ({
          value: policy.id,
          label: `${policy.name} (${policy.policy_type})`
        }))
      }
    }

    // Load users for form options
    fetch('/api/v1/users')
      .then(res => res.json())
      .then(users => {
        const userField = formFields.find(f => f.name === 'user_id')
        if (userField) {
          userField.options = users.map((user: any) => ({
            value: user.id,
            label: `${user.name} (${user.email})`
          }))
        }
      })
      .catch(console.error)

    // Load roles for form options
    fetch('/api/v1/roles')
      .then(res => res.json())
      .then(roles => {
        const roleField = formFields.find(f => f.name === 'role_id')
        if (roleField) {
          roleField.options = roles.map((role: any) => ({
            value: role.id,
            label: role.name
          }))
        }
      })
      .catch(console.error)
  }, [policiesData])

  // Create form view configuration
  const config = createFormViewConfig<RLSRuleAssignment>({
    resourceName: 'rls_assignment',
    baseUrl: '/admin/rls/assignments',
    apiEndpoint: '/api/v1/rls/rule-assignments',
    title: 'RLS Rule Assignments',
    subtitle: 'Assign security policies to users, roles, and entities',
    formFields,
    columns,
    validationSchema: rlsAssignmentSchema,
    onFetch: fetchAssignments,
    onCreate: createAssignment,
    onUpdate: updateAssignment,
    onDelete: deleteAssignment,
  })

  return (
    <CommonFormViewManager
      config={config}
      mode={mode as any}
      itemId={itemId}
      onModeChange={handleModeChange}
      data={assignments}
      loading={isLoading}
      error={error ? String(error) : null}
    />
  )
}