'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CommonFormViewManager, createFormViewConfig } from '@/shared/components/views/CommonFormViewManager'
import { FormField } from '@/shared/components/views/GenericFormView'
import { Column } from '@/shared/components/views/ViewManager'
import { Badge } from '@/shared/components/ui/badge'
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'

// RLS Audit Log types
interface RLSAuditLog {
  id: number
  request_id?: string
  session_id?: string
  user_id?: number
  policy_id?: number
  entity_type: string
  entity_id?: number
  action: string
  access_granted: boolean
  denial_reason?: string
  table_name?: string
  sql_query?: string
  applied_conditions?: Record<string, any>
  ip_address?: string
  user_agent?: string
  request_method?: string
  request_path?: string
  created_at: string
  // Relations
  user?: {
    id: number
    email: string
    name: string
  }
  policy?: {
    id: number
    name: string
    policy_type: string
  }
}

// Form fields configuration (read-only for audit logs)
const formFields: FormField<RLSAuditLog>[] = [
  {
    name: 'request_id',
    label: 'Request ID',
    type: 'text',
    readOnly: true,
    description: 'Unique identifier for this request'
  },
  {
    name: 'user_id',
    label: 'User',
    type: 'text',
    readOnly: true,
    render: (field, form) => {
      const log = form.watch() as RLSAuditLog
      return (
        <div className="p-2 bg-muted rounded">
          {log.user ? (
            <div>
              <div className="font-medium">{log.user.name}</div>
              <div className="text-sm text-muted-foreground">{log.user.email}</div>
            </div>
          ) : (
            <span className="text-muted-foreground">Unknown User</span>
          )}
        </div>
      )
    }
  },
  {
    name: 'policy_id',
    label: 'Policy',
    type: 'text',
    readOnly: true,
    render: (field, form) => {
      const log = form.watch() as RLSAuditLog
      return (
        <div className="p-2 bg-muted rounded">
          {log.policy ? (
            <div>
              <div className="font-medium">{log.policy.name}</div>
              <Badge variant="outline" className="text-xs">
                {log.policy.policy_type.replace('_', ' ')}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">No Policy</span>
          )}
        </div>
      )
    }
  },
  {
    name: 'entity_type',
    label: 'Entity Type',
    type: 'text',
    readOnly: true
  },
  {
    name: 'entity_id',
    label: 'Entity ID',
    type: 'number',
    readOnly: true
  },
  {
    name: 'action',
    label: 'Action',
    type: 'text',
    readOnly: true
  },
  {
    name: 'access_granted',
    label: 'Access Result',
    type: 'text',
    readOnly: true,
    render: (field, form) => {
      const log = form.watch() as RLSAuditLog
      return (
        <div className="p-2 bg-muted rounded">
          <Badge variant={log.access_granted ? 'default' : 'destructive'}>
            {log.access_granted ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Access Granted
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Access Denied
              </>
            )}
          </Badge>
        </div>
      )
    }
  },
  {
    name: 'denial_reason',
    label: 'Denial Reason',
    type: 'textarea',
    readOnly: true,
    condition: (data) => !data.access_granted && !!data.denial_reason
  },
  {
    name: 'table_name',
    label: 'Table Name',
    type: 'text',
    readOnly: true
  },
  {
    name: 'sql_query',
    label: 'SQL Query',
    type: 'textarea',
    readOnly: true,
    condition: (data) => !!data.sql_query
  },
  {
    name: 'applied_conditions',
    label: 'Applied Conditions',
    type: 'textarea',
    readOnly: true,
    render: (field, form) => {
      const log = form.watch() as RLSAuditLog
      return (
        <div className="p-2 bg-muted rounded">
          <pre className="text-xs whitespace-pre-wrap">
            {log.applied_conditions
              ? JSON.stringify(log.applied_conditions, null, 2)
              : 'No conditions applied'
            }
          </pre>
        </div>
      )
    },
    condition: (data) => !!data.applied_conditions
  },
  {
    name: 'ip_address',
    label: 'IP Address',
    type: 'text',
    readOnly: true
  },
  {
    name: 'request_method',
    label: 'HTTP Method',
    type: 'text',
    readOnly: true
  },
  {
    name: 'request_path',
    label: 'Request Path',
    type: 'text',
    readOnly: true
  },
  {
    name: 'user_agent',
    label: 'User Agent',
    type: 'textarea',
    readOnly: true,
    condition: (data) => !!data.user_agent
  },
  {
    name: 'created_at',
    label: 'Timestamp',
    type: 'text',
    readOnly: true,
    render: (field, form) => {
      const log = form.watch() as RLSAuditLog
      return (
        <div className="p-2 bg-muted rounded">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <div>
              <div className="font-medium">
                {new Date(log.created_at).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(log.created_at).toISOString()}
              </div>
            </div>
          </div>
        </div>
      )
    }
  }
]

// Table columns configuration
const columns: Column<RLSAuditLog>[] = [
  {
    id: 'created_at',
    key: 'created_at',
    label: 'Timestamp',
    sortable: true,
    render: (value) => (
      <div className="text-xs">
        <div>{new Date(String(value)).toLocaleDateString()}</div>
        <div className="text-muted-foreground">
          {new Date(String(value)).toLocaleTimeString()}
        </div>
      </div>
    )
  },
  {
    id: 'user',
    key: 'user_id',
    label: 'User',
    searchable: true,
    render: (value, row) => {
      if (row.user) {
        return (
          <div className="text-xs">
            <div className="font-medium">{row.user.name}</div>
            <div className="text-muted-foreground">{row.user.email}</div>
          </div>
        )
      }
      return <span className="text-muted-foreground text-xs">Unknown</span>
    }
  },
  {
    id: 'access_result',
    key: 'access_granted',
    label: 'Result',
    sortable: true,
    filterable: true,
    render: (value) => (
      <Badge variant={value ? 'default' : 'destructive'} className="text-xs">
        {value ? (
          <>
            <CheckCircle className="h-3 w-3 mr-1" />
            Granted
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" />
            Denied
          </>
        )}
      </Badge>
    )
  },
  {
    id: 'entity_type',
    key: 'entity_type',
    label: 'Entity',
    sortable: true,
    filterable: true,
    render: (value, row) => (
      <div className="text-xs">
        <Badge variant="outline" className="text-xs">
          {String(value).replace('_', ' ')}
        </Badge>
        {row.entity_id && (
          <div className="text-muted-foreground mt-1">ID: {row.entity_id}</div>
        )}
      </div>
    )
  },
  {
    id: 'action',
    key: 'action',
    label: 'Action',
    sortable: true,
    filterable: true,
    render: (value) => (
      <Badge variant="secondary" className="text-xs">
        {String(value).toUpperCase()}
      </Badge>
    )
  },
  {
    id: 'policy',
    key: 'policy_id',
    label: 'Policy',
    searchable: true,
    render: (value, row) => {
      if (row.policy) {
        return (
          <div className="text-xs">
            <div className="font-medium">{row.policy.name}</div>
            <Badge variant="outline" className="text-xs mt-1">
              {row.policy.policy_type.replace('_', ' ')}
            </Badge>
          </div>
        )
      }
      return <span className="text-muted-foreground text-xs">No Policy</span>
    }
  },
  {
    id: 'denial_reason',
    key: 'denial_reason',
    label: 'Denial Reason',
    searchable: true,
    render: (value) => {
      if (!value) return <span className="text-muted-foreground">-</span>
      return (
        <div className="text-xs max-w-48 truncate" title={String(value)}>
          <AlertTriangle className="h-3 w-3 inline mr-1 text-destructive" />
          {String(value)}
        </div>
      )
    }
  },
  {
    id: 'ip_address',
    key: 'ip_address',
    label: 'IP Address',
    searchable: true,
    render: (value) => (
      <span className="text-xs font-mono">{value ? String(value) : '-'}</span>
    )
  }
]

export default function RLSAuditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [auditLogs, setAuditLogs] = useState<RLSAuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    router.push(`/admin/rls/audit?${params.toString()}`)
  }

  // API functions
  const fetchAuditLogs = async (): Promise<RLSAuditLog[]> => {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/rls/audit-logs')
      if (!response.ok) throw new Error('Failed to fetch audit logs')
      const data = await response.json()
      setAuditLogs(data)
      return data
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch audit logs'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchAuditLogs()
  }, [])

  // Create form view configuration (audit logs are read-only)
  const config = createFormViewConfig<RLSAuditLog>({
    resourceName: 'rls_audit_log',
    baseUrl: '/admin/rls/audit',
    apiEndpoint: '/api/v1/rls/audit-logs',
    title: 'RLS Audit Logs',
    subtitle: 'Monitor security access attempts and violations',
    formFields,
    columns,
    onFetch: fetchAuditLogs,
    canCreate: false, // Audit logs are system-generated
    canEdit: false,   // Audit logs are immutable
    canDelete: false, // Audit logs should be preserved
    canView: true,    // Allow viewing details
  })

  return (
    <CommonFormViewManager
      config={config}
      mode={mode as any}
      itemId={itemId}
      onModeChange={handleModeChange}
      data={auditLogs}
      loading={loading}
      error={error}
    />
  )
}
