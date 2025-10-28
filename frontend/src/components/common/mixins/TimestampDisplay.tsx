import React from 'react';
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { Clock, Calendar, User, Edit, Plus, Trash2 } from 'lucide-react';

export interface TimestampInfo {
  created_at: string;
  updated_at?: string;
  created_by_datetime?: string;
  updated_by_datetime?: string;
  created_by_user?: {
    id: number;
    username: string;
    full_name: string;
  };
  updated_by_user?: {
    id: number;
    username: string;
    full_name: string;
  };
}

interface TimestampDisplayProps {
  timestamps: TimestampInfo;
  showRelative?: boolean;
  showAbsolute?: boolean;
  showUser?: boolean;
  showIcons?: boolean;
  compact?: boolean;
  className?: string;
}

const formatTimestamp = (timestamp: string, relative: boolean = false): string => {
  const date = new Date(timestamp);

  if (relative) {
    if (isToday(date)) {
      return `Today at ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'HH:mm')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE \'at\' HH:mm');
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  }

  return format(date, 'PPP \'at\' p');
};

const UserInfo: React.FC<{
  user?: { id: number; username: string; full_name: string };
  label: string;
  icon?: React.ReactNode;
}> = ({ user, label, icon }) => {
  if (!user) return null;

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-600">
      {icon}
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{user.full_name || user.username}</span>
    </div>
  );
};

const TimestampDisplay: React.FC<TimestampDisplayProps> = ({
  timestamps,
  showRelative = true,
  showAbsolute = false,
  showUser = true,
  showIcons = true,
  compact = false,
  className = ''
}) => {
  const {
    created_at,
    updated_at,
    created_by_datetime,
    updated_by_datetime,
    created_by_user,
    updated_by_user
  } = timestamps;

  const hasDetailedTimestamps = created_by_datetime || updated_by_datetime;
  const hasUsers = created_by_user || updated_by_user;
  const isUpdated = updated_at && updated_at !== created_at;

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 text-xs text-gray-500 ${className}`}>
        <div className="flex items-center space-x-1">
          {showIcons && <Plus className="w-3 h-3" />}
          <span>Created {formatTimestamp(created_at, showRelative)}</span>
        </div>

        {isUpdated && (
          <div className="flex items-center space-x-1">
            {showIcons && <Edit className="w-3 h-3" />}
            <span>Updated {formatTimestamp(updated_at!, showRelative)}</span>
          </div>
        )}

        {showUser && hasUsers && (
          <div className="flex items-center space-x-1">
            {showIcons && <User className="w-3 h-3" />}
            <span>
              by {created_by_user?.full_name || created_by_user?.username ||
                   updated_by_user?.full_name || updated_by_user?.username}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Creation Info */}
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {showIcons && <Plus className="w-4 h-4 text-green-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">Created</span>
            <span className="text-sm text-gray-600">
              {formatTimestamp(created_at, showRelative)}
            </span>
            {showAbsolute && (
              <span className="text-xs text-gray-400">
                ({formatTimestamp(created_at, false)})
              </span>
            )}
          </div>

          {showUser && created_by_user && (
            <UserInfo
              user={created_by_user}
              label="by"
              icon={showIcons ? <User className="w-3 h-3" /> : undefined}
            />
          )}

          {hasDetailedTimestamps && created_by_datetime && (
            <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
              {showIcons && <Clock className="w-3 h-3" />}
              <span>Audit timestamp: {formatTimestamp(created_by_datetime, showRelative)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Update Info */}
      {isUpdated && (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {showIcons && <Edit className="w-4 h-4 text-blue-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">Last updated</span>
              <span className="text-sm text-gray-600">
                {formatTimestamp(updated_at!, showRelative)}
              </span>
              {showAbsolute && (
                <span className="text-xs text-gray-400">
                  ({formatTimestamp(updated_at!, false)})
                </span>
              )}
            </div>

            {showUser && updated_by_user && (
              <UserInfo
                user={updated_by_user}
                label="by"
                icon={showIcons ? <User className="w-3 h-3" /> : undefined}
              />
            )}

            {hasDetailedTimestamps && updated_by_datetime && (
              <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                {showIcons && <Clock className="w-3 h-3" />}
                <span>Audit timestamp: {formatTimestamp(updated_by_datetime, showRelative)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No updates indicator */}
      {!isUpdated && (
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          {showIcons && <Clock className="w-3 h-3" />}
          <span>No updates since creation</span>
        </div>
      )}
    </div>
  );
};

export default TimestampDisplay;