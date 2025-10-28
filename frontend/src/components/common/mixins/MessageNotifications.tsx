import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, X, AlertCircle, Info, CheckCircle, XCircle, Clock } from 'lucide-react';

export interface MessageNotification {
  id: number;
  recipient_id: number;
  message_type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
  action_url?: string;
  action_text?: string;
  metadata?: Record<string, any>;
}

interface MessageNotificationsProps {
  notifications: MessageNotification[];
  loading?: boolean;
  onMarkAsRead?: (notificationId: number) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (notificationId: number) => void;
  showUnreadOnly?: boolean;
  maxItems?: number;
  className?: string;
}

const getMessageIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    default:
      return <Info className="w-5 h-5 text-blue-500" />;
  }
};

const getMessageStyle = (type: string, isRead: boolean) => {
  const baseStyle = isRead ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50';

  switch (type) {
    case 'success':
      return isRead ? 'border-green-200 bg-green-50' : 'border-green-200 bg-green-50';
    case 'error':
      return isRead ? 'border-red-200 bg-red-50' : 'border-red-200 bg-red-50';
    case 'warning':
      return isRead ? 'border-yellow-200 bg-yellow-50' : 'border-yellow-200 bg-yellow-50';
    default:
      return baseStyle;
  }
};

export const MessageNotifications: React.FC<MessageNotificationsProps> = ({
  notifications,
  loading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  showUnreadOnly = false,
  maxItems,
  className = ''
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredNotifications = showUnreadOnly
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const displayNotifications = maxItems
    ? filteredNotifications.slice(0, maxItems)
    : filteredNotifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with mark all as read */}
      {unreadCount > 0 && onMarkAllAsRead && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Mark all as read
          </button>
        </div>
      )}

      {displayNotifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{showUnreadOnly ? 'No unread notifications' : 'No notifications found'}</p>
        </div>
      ) : (
        displayNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border transition-all duration-200 ${
              getMessageStyle(notification.message_type, notification.is_read)
            } ${!notification.is_read ? 'shadow-sm' : ''}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getMessageIcon(notification.message_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${
                      notification.is_read ? 'text-gray-900' : 'text-gray-900'
                    }`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      notification.is_read ? 'text-gray-600' : 'text-gray-700'
                    }`}>
                      {notification.message}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    )}

                    <div className="flex items-center space-x-1">
                      {onMarkAsRead && !notification.is_read && (
                        <button
                          onClick={() => onMarkAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}

                      {onDismiss && (
                        <button
                          onClick={() => onDismiss(notification.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Dismiss"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="inline-flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>

                    {notification.expires_at && (
                      <span className="inline-flex items-center text-orange-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Expires {formatDistanceToNow(new Date(notification.expires_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  {notification.action_url && notification.action_text && (
                    <a
                      href={notification.action_url}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {notification.action_text}
                    </a>
                  )}
                </div>

                {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Show details
                    </summary>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(notification.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MessageNotifications;