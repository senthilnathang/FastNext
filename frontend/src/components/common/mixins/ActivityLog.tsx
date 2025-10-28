import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, User, Clock, FileText, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

export interface ActivityLogEntry {
  id: number;
  user_id?: number;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'SHARE' | 'PERMISSION_CHANGE';
  entity_type: string;
  entity_id?: number;
  entity_name?: string;
  description: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  status_code?: number;
  extra_data?: Record<string, any>;
  created_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
  };
}

interface ActivityLogProps {
  activities: ActivityLogEntry[];
  loading?: boolean;
  emptyMessage?: string;
  showUser?: boolean;
  showEntity?: boolean;
  showDetails?: boolean;
  maxItems?: number;
  className?: string;
}

const getActionIcon = (action: string) => {
  switch (action.toUpperCase()) {
    case 'CREATE':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'UPDATE':
      return <FileText className="w-4 h-4 text-blue-500" />;
    case 'DELETE':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'LOGIN':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'LOGOUT':
      return <XCircle className="w-4 h-4 text-gray-500" />;
    default:
      return <Info className="w-4 h-4 text-gray-500" />;
  }
};

const getLevelColor = (level: string) => {
  switch (level.toUpperCase()) {
    case 'ERROR':
    case 'CRITICAL':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'WARNING':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default:
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

const ActivityLog: React.FC<ActivityLogProps> = ({
  activities,
  loading = false,
  emptyMessage = 'No activity found',
  showUser = true,
  showEntity = true,
  showDetails = false,
  maxItems,
  className = ''
}) => {
  const displayActivities = maxItems ? activities.slice(0, maxItems) : activities;

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
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

  if (displayActivities.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {displayActivities.map((activity) => (
        <div
          key={activity.id}
          className={`flex items-start space-x-3 p-3 rounded-lg border ${getLevelColor(activity.level)}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getActionIcon(activity.action)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {activity.description}
              </p>
              <div className="flex items-center text-xs text-gray-500 ml-2">
                <Clock className="w-3 h-3 mr-1" />
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              {showUser && activity.user && (
                <span className="inline-flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {activity.user.full_name || activity.user.username}
                </span>
              )}

              {showEntity && activity.entity_type && (
                <span className="inline-flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  {activity.entity_type}
                  {activity.entity_name && ` (${activity.entity_name})`}
                </span>
              )}

              {activity.level !== 'INFO' && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  activity.level === 'ERROR' || activity.level === 'CRITICAL'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {activity.level}
                </span>
              )}
            </div>

            {showDetails && activity.extra_data && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  Show details
                </summary>
                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(activity.extra_data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityLog;