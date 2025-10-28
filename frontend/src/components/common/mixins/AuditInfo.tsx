import React from 'react';
import { Shield, User, Clock, Eye, Edit, Trash2, Plus } from 'lucide-react';
import TimestampDisplay from './TimestampDisplay';

export interface AuditInfo {
  created_by?: number;
  updated_by?: number;
  created_by_datetime?: string;
  updated_by_datetime?: string;
  created_by_user?: {
    id: number;
    username: string;
    full_name: string;
    email?: string;
  };
  updated_by_user?: {
    id: number;
    username: string;
    full_name: string;
    email?: string;
  };
  // Additional audit fields that might be available
  created_at?: string;
  updated_at?: string;
}

interface AuditInfoProps {
  audit: AuditInfo;
  showTimestamps?: boolean;
  showUsers?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

const UserBadge: React.FC<{
  user?: { id: number; username: string; full_name: string; email?: string };
  label: string;
  icon?: React.ReactNode;
}> = ({ user, label, icon }) => {
  if (!user) return null;

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-900 truncate">
          {user.full_name || user.username}
        </div>
        {user.email && (
          <div className="text-xs text-gray-500 truncate">{user.email}</div>
        )}
      </div>
    </div>
  );
};

const AuditInfo: React.FC<AuditInfoProps> = ({
  audit,
  showTimestamps = true,
  showUsers = true,
  showActions = false,
  compact = false,
  className = ''
}) => {
  const {
    created_by,
    updated_by,
    created_by_datetime,
    updated_by_datetime,
    created_by_user,
    updated_by_user,
    created_at,
    updated_at
  } = audit;

  const hasAuditUsers = created_by_user || updated_by_user;
  const hasAuditTimestamps = created_by_datetime || updated_by_datetime;
  const hasBasicTimestamps = created_at || updated_at;

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 text-xs text-gray-600 ${className}`}>
        {showUsers && created_by_user && (
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>Created by {created_by_user.full_name || created_by_user.username}</span>
          </div>
        )}

        {showUsers && updated_by_user && updated_by !== created_by && (
          <div className="flex items-center space-x-1">
            <Edit className="w-3 h-3" />
            <span>Updated by {updated_by_user.full_name || updated_by_user.username}</span>
          </div>
        )}

        {showTimestamps && hasAuditTimestamps && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>
              {created_by_datetime && `Created ${new Date(created_by_datetime).toLocaleDateString()}`}
              {updated_by_datetime && updated_by_datetime !== created_by_datetime &&
               ` • Updated ${new Date(updated_by_datetime).toLocaleDateString()}`}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <Shield className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-900">Audit Information</h3>
      </div>

      {/* User Information */}
      {showUsers && hasAuditUsers && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {created_by_user && (
            <UserBadge
              user={created_by_user}
              label="Created By"
              icon={<Plus className="w-4 h-4 text-green-500" />}
            />
          )}

          {updated_by_user && updated_by !== created_by && (
            <UserBadge
              user={updated_by_user}
              label="Last Updated By"
              icon={<Edit className="w-4 h-4 text-blue-500" />}
            />
          )}
        </div>
      )}

      {/* Timestamp Information */}
      {showTimestamps && (
        <div className="space-y-3">
          {hasAuditTimestamps ? (
            <TimestampDisplay
              timestamps={{
                created_at: created_by_datetime || created_at || '',
                updated_at: updated_by_datetime || updated_at,
                created_by_datetime,
                updated_by_datetime,
                created_by_user,
                updated_by_user
              }}
              showRelative={true}
              showAbsolute={true}
              showUser={false}
              compact={false}
            />
          ) : hasBasicTimestamps ? (
            <TimestampDisplay
              timestamps={{
                created_at: created_at || '',
                updated_at,
                created_by_user,
                updated_by_user
              }}
              showRelative={true}
              showAbsolute={true}
              showUser={true}
              compact={false}
            />
          ) : (
            <div className="text-sm text-gray-500 italic">
              No timestamp information available
            </div>
          )}
        </div>
      )}

      {/* Action Indicators */}
      {showActions && (
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Actions</h4>
          <div className="flex flex-wrap gap-2">
            {created_by && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                <Plus className="w-3 h-3 mr-1" />
                Created
              </span>
            )}

            {updated_by && updated_by !== created_by && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                <Edit className="w-3 h-3 mr-1" />
                Updated
              </span>
            )}

            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
              <Eye className="w-3 h-3 mr-1" />
              Viewed
            </span>
          </div>
        </div>
      )}

      {/* No audit information */}
      {!hasAuditUsers && !hasAuditTimestamps && !hasBasicTimestamps && (
        <div className="text-center py-4 text-gray-500">
          <Shield className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No audit information available</p>
        </div>
      )}
    </div>
  );
};

export default AuditInfo;