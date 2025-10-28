# Mixin Components

Reusable React components that correspond to backend mixins for displaying audit, activity, and logging information.

## Components

### ActivityLog
Displays activity logs from the `ActivityMixin`. Shows user actions, entity changes, and system events.

```tsx
import { ActivityLog } from '@/components/common/mixins';

<ActivityLog
  activities={activityData}
  showUser={true}
  showEntity={true}
  showDetails={true}
  maxItems={10}
/>
```

**Props:**
- `activities`: Array of `ActivityLogEntry` objects
- `loading?`: Boolean for loading state
- `emptyMessage?`: Message when no activities
- `showUser?`: Show user information
- `showEntity?`: Show entity information
- `showDetails?`: Show expandable details
- `maxItems?`: Limit number of items
- `className?`: Additional CSS classes

### AuditTrail
Shows detailed audit trails from the `AuditTrailMixin`. Displays before/after values for all changes.

```tsx
import { AuditTrail } from '@/components/common/mixins';

<AuditTrail
  auditEntries={auditData}
  showUser={true}
  showChanges={true}
  showDetails={true}
/>
```

**Props:**
- `auditEntries`: Array of `AuditTrailEntry` objects
- `loading?`: Boolean for loading state
- `emptyMessage?`: Message when no entries
- `showUser?`: Show user information
- `showChanges?`: Show field changes
- `showDetails?`: Show expandable details
- `maxItems?`: Limit number of items
- `className?`: Additional CSS classes

### MessageNotifications
Interactive notification system from the `MessageMixin`. Supports marking as read and dismissing.

```tsx
import { MessageNotifications } from '@/components/common/mixins';

<MessageNotifications
  notifications={notificationData}
  onMarkAsRead={handleMarkAsRead}
  onMarkAllAsRead={handleMarkAllAsRead}
  onDismiss={handleDismiss}
  showUnreadOnly={false}
/>
```

**Props:**
- `notifications`: Array of `MessageNotification` objects
- `loading?`: Boolean for loading state
- `onMarkAsRead?`: Callback for marking single notification as read
- `onMarkAllAsRead?`: Callback for marking all as read
- `onDismiss?`: Callback for dismissing notification
- `showUnreadOnly?`: Filter to unread only
- `maxItems?`: Limit number of items
- `className?`: Additional CSS classes

### TimestampDisplay
Shows creation and update timestamps from the `TimestampMixin` with user information.

```tsx
import { TimestampDisplay } from '@/components/common/mixins';

<TimestampDisplay
  timestamps={timestampData}
  showRelative={true}
  showAbsolute={true}
  showUser={true}
  compact={false}
/>
```

**Props:**
- `timestamps`: `TimestampInfo` object
- `showRelative?`: Show relative time (e.g., "2 hours ago")
- `showAbsolute?`: Show absolute time (e.g., "Jan 1, 2024 at 12:00 PM")
- `showUser?`: Show user information
- `showIcons?`: Show icons
- `compact?`: Compact layout
- `className?`: Additional CSS classes

### AuditInfo
Comprehensive audit information display from the `AuditMixin`. Shows all audit-related data.

```tsx
import { AuditInfo } from '@/components/common/mixins';

<AuditInfo
  audit={auditData}
  showTimestamps={true}
  showUsers={true}
  showActions={true}
  compact={false}
/>
```

**Props:**
- `audit`: `AuditInfo` object
- `showTimestamps?`: Show timestamp information
- `showUsers?`: Show user information
- `showActions?`: Show action indicators
- `compact?`: Compact layout
- `className?`: Additional CSS classes

## Data Types

### ActivityLogEntry
```typescript
interface ActivityLogEntry {
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
```

### AuditTrailEntry
```typescript
interface AuditTrailEntry {
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
```

### MessageNotification
```typescript
interface MessageNotification {
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
```

### TimestampInfo
```typescript
interface TimestampInfo {
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
```

### AuditInfo
```typescript
interface AuditInfo {
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
  created_at?: string;
  updated_at?: string;
}
```

## Backend Integration

These components are designed to work with the backend mixins:

- `ActivityMixin` → `ActivityLog` component
- `AuditTrailMixin` → `AuditTrail` component
- `MessageMixin` → `MessageNotifications` component
- `TimestampMixin` → `TimestampDisplay` component
- `AuditMixin` → `AuditInfo` component

## Styling

Components use Tailwind CSS classes and are fully customizable via the `className` prop. They follow a consistent design system with:

- Color-coded severity levels (green/yellow/red/gray)
- Responsive layouts
- Accessible markup
- Loading states
- Empty states

## Demo

See `MixinComponentsDemo.tsx` for a comprehensive example of all components in action with mock data.</content>
</xai:function_call