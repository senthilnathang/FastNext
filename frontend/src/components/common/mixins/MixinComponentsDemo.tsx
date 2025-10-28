import React, { useState } from 'react';
import {
  ActivityLog,
  AuditTrail,
  MessageNotifications,
  TimestampDisplay,
  AuditInfo,
  ActivityLogEntryType,
  AuditTrailEntryType,
  MessageNotificationType,
  TimestampInfoType,
  AuditInfoType
} from './index';

// Mock data for demonstration
const mockActivityLog: ActivityLogEntryType[] = [
  {
    id: 1,
    user_id: 1,
    action: 'CREATE',
    entity_type: 'Project',
    entity_id: 1,
    entity_name: 'FastNext Framework',
    description: 'Created new project: FastNext Framework',
    level: 'INFO',
    ip_address: '192.168.1.100',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    user: {
      id: 1,
      username: 'john_doe',
      full_name: 'John Doe'
    }
  },
  {
    id: 2,
    user_id: 2,
    action: 'UPDATE',
    entity_type: 'Component',
    entity_id: 5,
    entity_name: 'User Login Form',
    description: 'Updated component: User Login Form - name, styles',
    level: 'INFO',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    user: {
      id: 2,
      username: 'jane_smith',
      full_name: 'Jane Smith'
    }
  },
  {
    id: 3,
    user_id: 1,
    action: 'DELETE',
    entity_type: 'Product',
    entity_id: 10,
    entity_name: 'Legacy Widget',
    description: 'Deleted product: Legacy Widget',
    level: 'WARNING',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    user: {
      id: 1,
      username: 'john_doe',
      full_name: 'John Doe'
    }
  }
];

const mockAuditTrail: AuditTrailEntryType[] = [
  {
    id: 1,
    user_id: 1,
    entity_type: 'User',
    entity_id: 1,
    entity_name: 'john_doe',
    operation: 'UPDATE',
    old_values: { email: 'john@example.com' },
    new_values: { email: 'john.doe@example.com' },
    changed_fields: ['email'],
    ip_address: '192.168.1.100',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    user: {
      id: 1,
      username: 'admin',
      full_name: 'System Admin'
    }
  },
  {
    id: 2,
    user_id: 2,
    entity_type: 'Project',
    entity_id: 1,
    entity_name: 'FastNext Framework',
    operation: 'INSERT',
    new_values: { name: 'FastNext Framework', description: 'Full-stack framework' },
    changed_fields: ['name', 'description'],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    user: {
      id: 2,
      username: 'jane_smith',
      full_name: 'Jane Smith'
    }
  }
];

const mockNotifications: MessageNotificationType[] = [
  {
    id: 1,
    recipient_id: 1,
    message_type: 'success',
    title: 'Project Created',
    message: 'Your project "FastNext Framework" has been created successfully.',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    action_url: '/projects/1',
    action_text: 'View Project'
  },
  {
    id: 2,
    recipient_id: 1,
    message_type: 'warning',
    title: 'Security Alert',
    message: 'Unusual login attempt detected from IP 192.168.1.200.',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    action_url: '/settings/security',
    action_text: 'Review Security'
  },
  {
    id: 3,
    recipient_id: 1,
    message_type: 'info',
    title: 'System Maintenance',
    message: 'Scheduled maintenance will occur tonight from 2-4 AM EST.',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
  }
];

const mockTimestampInfo: TimestampInfoType = {
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
  updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  created_by_datetime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  updated_by_datetime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  created_by_user: {
    id: 2,
    username: 'jane_smith',
    full_name: 'Jane Smith'
  },
  updated_by_user: {
    id: 1,
    username: 'john_doe',
    full_name: 'John Doe'
  }
};

const mockAuditInfo: AuditInfoType = {
  created_by: 2,
  updated_by: 1,
  created_by_datetime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  updated_by_datetime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  created_by_user: {
    id: 2,
    username: 'jane_smith',
    full_name: 'Jane Smith',
    email: 'jane.smith@example.com'
  },
  updated_by_user: {
    id: 1,
    username: 'john_doe',
    full_name: 'John Doe',
    email: 'john.doe@example.com'
  },
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
};

export const MixinComponentsDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'activity' | 'audit' | 'notifications' | 'timestamps' | 'audit-info'>('activity');
  const [notifications, setNotifications] = useState(mockNotifications);

  const handleMarkAsRead = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
  };

  const handleDismiss = (notificationId: number) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
  };

  const tabs = [
    { id: 'activity', label: 'Activity Log', component: 'ActivityLog' },
    { id: 'audit', label: 'Audit Trail', component: 'AuditTrail' },
    { id: 'notifications', label: 'Notifications', component: 'MessageNotifications' },
    { id: 'timestamps', label: 'Timestamps', component: 'TimestampDisplay' },
    { id: 'audit-info', label: 'Audit Info', component: 'AuditInfo' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Mixin Components Demo
        </h1>
        <p className="text-gray-600">
          Reusable UI components for backend mixins - Activity, Audit, Messages, Timestamps
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Component Demo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'activity' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Log</h2>
            <p className="text-gray-600 mb-4">
              Displays activity logs from the ActivityMixin. Shows user actions, entity changes, and system events.
            </p>
            <ActivityLog
              activities={mockActivityLog}
              showUser={true}
              showEntity={true}
              showDetails={true}
            />
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit Trail</h2>
            <p className="text-gray-600 mb-4">
              Shows detailed audit trails from the AuditTrailMixin. Displays before/after values for all changes.
            </p>
            <AuditTrail
              auditEntries={mockAuditTrail}
              showUser={true}
              showChanges={true}
              showDetails={true}
            />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Message Notifications</h2>
            <p className="text-gray-600 mb-4">
              Interactive notification system from the MessageMixin. Supports marking as read and dismissing.
            </p>
            <MessageNotifications
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onDismiss={handleDismiss}
            />
          </div>
        )}

        {activeTab === 'timestamps' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Timestamp Display</h2>
            <p className="text-gray-600 mb-4">
              Shows creation and update timestamps from the TimestampMixin with user information.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Full Display</h3>
                <TimestampDisplay
                  timestamps={mockTimestampInfo}
                  showRelative={true}
                  showAbsolute={true}
                  showUser={true}
                  showIcons={true}
                  compact={false}
                />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Compact Display</h3>
                <TimestampDisplay
                  timestamps={mockTimestampInfo}
                  showRelative={true}
                  showUser={true}
                  compact={true}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit-info' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit Information</h2>
            <p className="text-gray-600 mb-4">
              Comprehensive audit information display from the AuditMixin. Shows all audit-related data.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Full Display</h3>
                <AuditInfo
                  audit={mockAuditInfo}
                  showTimestamps={true}
                  showUsers={true}
                  showActions={true}
                  compact={false}
                />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Compact Display</h3>
                <AuditInfo
                  audit={mockAuditInfo}
                  showTimestamps={true}
                  showUsers={true}
                  compact={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage Examples */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import Components</h3>
            <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`import {
  ActivityLog,
  AuditTrail,
  MessageNotifications,
  TimestampDisplay,
  AuditInfo
} from '@/components/common/mixins';`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Basic Usage</h3>
            <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`<ActivityLog
  activities={activityData}
  showUser={true}
  showEntity={true}
/>

<AuditTrail
  auditEntries={auditData}
  showChanges={true}
/>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MixinComponentsDemo;