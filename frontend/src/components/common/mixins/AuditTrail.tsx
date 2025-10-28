import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { History, User, FileText, ArrowRight, Plus, Minus, Edit, Trash2 } from 'lucide-react';

export interface AuditTrailEntry {
  id: number;
  user_id?: number;
  entity_type: string;
  entity_id: number;
  entity_name?: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_fields?: string[];
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  reason?: string;
  extra_data?: Record<string, any>;
  created_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
  };
}

interface AuditTrailProps {
  auditEntries: AuditTrailEntry[];
  loading?: boolean;
  emptyMessage?: string;
  showUser?: boolean;
  showChanges?: boolean;
  showDetails?: boolean;
  maxItems?: number;
  className?: string;
}

const getOperationIcon = (operation: string) => {
  switch (operation.toUpperCase()) {
    case 'INSERT':
      return <Plus className="w-4 h-4 text-green-500" />;
    case 'UPDATE':
      return <Edit className="w-4 h-4 text-blue-500" />;
    case 'DELETE':
      return <Trash2 className="w-4 h-4 text-red-500" />;
    default:
      return <History className="w-4 h-4 text-gray-500" />;
  }
};

const getOperationColor = (operation: string) => {
  switch (operation.toUpperCase()) {
    case 'INSERT':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'UPDATE':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'DELETE':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const renderFieldChange = (field: string, oldValue: any, newValue: any) => {
  const oldFormatted = formatValue(oldValue);
  const newFormatted = formatValue(newValue);

  return (
    <div key={field} className="flex items-center space-x-2 py-1">
      <span className="text-xs font-medium text-gray-600 min-w-0 flex-1">{field}:</span>
      <div className="flex items-center space-x-2 flex-1">
        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex-1 truncate" title={oldFormatted}>
          {oldFormatted}
        </span>
        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded flex-1 truncate" title={newFormatted}>
          {newFormatted}
        </span>
      </div>
    </div>
  );
};

export const AuditTrail: React.FC<AuditTrailProps> = ({
  auditEntries,
  loading = false,
  emptyMessage = 'No audit trail found',
  showUser = true,
  showChanges = true,
  showDetails = false,
  maxItems,
  className = ''
}) => {
  const displayEntries = maxItems ? auditEntries.slice(0, maxItems) : auditEntries;

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayEntries.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {displayEntries.map((entry) => (
        <div
          key={entry.id}
          className={`p-4 rounded-lg border ${getOperationColor(entry.operation)}`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getOperationIcon(entry.operation)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {entry.operation} {entry.entity_type}
                  </span>
                  {entry.entity_name && (
                    <span className="text-sm text-gray-600">
                      ({entry.entity_name})
                    </span>
                  )}
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <History className="w-3 h-3 mr-1" />
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-3">
                {showUser && entry.user && (
                  <span className="inline-flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {entry.user.full_name || entry.user.username}
                  </span>
                )}

                <span className="inline-flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  ID: {entry.entity_id}
                </span>

                {entry.ip_address && (
                  <span className="inline-flex items-center">
                    IP: {entry.ip_address}
                  </span>
                )}
              </div>

              {showChanges && entry.changed_fields && entry.changed_fields.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Changes:</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {entry.changed_fields.map(field => {
                      const oldValue = entry.old_values?.[field];
                      const newValue = entry.new_values?.[field];
                      return renderFieldChange(field, oldValue, newValue);
                    })}
                  </div>
                </div>
              )}

              {entry.reason && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Reason:</h4>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {entry.reason}
                  </p>
                </div>
              )}

              {showDetails && entry.extra_data && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Show additional details
                  </summary>
                  <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(entry.extra_data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AuditTrail;