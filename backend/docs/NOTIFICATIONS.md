# Notification System

Multi-channel notification system supporting in-app, push, and email notifications with user preferences and Do Not Disturb scheduling.

## Overview

The notification system provides:
- **In-App Notifications**: Real-time notifications in the inbox
- **Push Notifications**: Browser push via Web Push API (VAPID)
- **Email Notifications**: SMTP-based emails with HTML templates
- **User Preferences**: Per-channel settings and overrides
- **Do Not Disturb**: Time-based notification muting
- **Admin Management**: Send notifications to users or all users

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Trigger                      │
│  (Message sent, Mention, System event, Admin broadcast)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Notification Preference Check                │
│  - Is channel enabled?                                       │
│  - Is DND active?                                           │
│  - Type-specific overrides?                                 │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  In-App  │   │   Push   │   │  Email   │
        │ (Inbox)  │   │ (VAPID)  │   │ (SMTP)   │
        └──────────┘   └──────────┘   └──────────┘
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │WebSocket │   │ Browser  │   │  SMTP    │
        │  Event   │   │Push API  │   │ Server   │
        └──────────┘   └──────────┘   └──────────┘
```

## Notification Channels

### 1. In-App Notifications

Stored in the `notifications` table and displayed in the user's inbox.

```python
from app.services.notification import notification_service

# Create notification
await notification_service.create_notification(
    db=db,
    user_id=27,
    title="New Message",
    description="You have a new message from John",
    level="info",
    link="/inbox",
    data={"message_id": 123}
)
```

### 2. Push Notifications

Browser push notifications using Web Push API with VAPID authentication.

**Configuration:**
```env
# .env
VAPID_PRIVATE_KEY=your-private-key
VAPID_PUBLIC_KEY=your-public-key
VAPID_CLAIMS_EMAIL=admin@yourdomain.com
```

**Backend Usage:**
```python
from app.services.push import push_service

# Send push notification
await push_service.send_push_notification(
    db=db,
    user_id=27,
    title="New Message",
    body="You have a new message from John",
    icon="/icons/notification.png",
    url="/inbox"
)
```

**Frontend Setup:**
```typescript
import { pushService } from '#/services/push';

// Check support
if (pushService.isSupported.value) {
  // Subscribe
  await pushService.subscribe();

  // Send test
  await pushService.sendTestNotification();
}
```

### 3. Email Notifications

SMTP-based emails with HTML templates.

**Configuration:**
```env
# .env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASSWORD=your-password
SMTP_TLS=true
EMAILS_FROM_EMAIL=noreply@example.com
EMAILS_FROM_NAME=FastVue
```

**Email Types:**
- Immediate: Sent instantly when triggered
- Daily Digest: Batched and sent once daily
- Weekly Digest: Batched and sent once weekly

**Backend Usage:**
```python
from app.services.email import email_service

# Send immediate email
await email_service.send_notification_email(
    to_email="user@example.com",
    subject="New Message",
    body_html="<p>You have a new message...</p>",
    body_text="You have a new message..."
)

# Send message notification
await email_service.send_new_message_email(
    to_email="user@example.com",
    sender_name="John Doe",
    subject="Meeting Tomorrow",
    preview="Can we meet at 10am?",
    message_url="https://app.example.com/inbox/123"
)
```

## API Endpoints

### Notifications

```
GET    /api/v1/notifications/              List notifications (filter: all/unread/read)
GET    /api/v1/notifications/stats         Get notification statistics
GET    /api/v1/notifications/{id}          Get single notification
PUT    /api/v1/notifications/{id}          Mark as read
POST   /api/v1/notifications/bulk-read     Mark multiple as read
POST   /api/v1/notifications/bulk-delete   Delete multiple
POST   /api/v1/notifications/send          Send notification (admin)
```

### Notification Preferences

```
GET    /api/v1/users/me/notification-preferences       Get preferences
PUT    /api/v1/users/me/notification-preferences       Update preferences
POST   /api/v1/users/me/notification-preferences/dnd/enable   Enable DND
POST   /api/v1/users/me/notification-preferences/dnd/disable  Disable DND
DELETE /api/v1/users/me/notification-preferences       Reset to defaults
GET    /api/v1/users/me/notification-preferences/dnd-status   Get DND status
```

### Push Subscriptions

```
GET    /api/v1/push/vapid-key              Get VAPID public key
POST   /api/v1/push/subscribe              Register push subscription
POST   /api/v1/push/unsubscribe            Remove subscription
POST   /api/v1/push/test                   Send test notification
```

## Notification Preferences

### Schema

```python
class NotificationPreference(BaseModel):
    user_id: int  # Unique per user

    # In-App
    inbox_enabled: bool = True
    inbox_sound: bool = True
    inbox_desktop: bool = False

    # Push
    push_enabled: bool = True
    push_messages: bool = True
    push_mentions: bool = True
    push_replies: bool = True
    push_reactions: bool = False
    push_activity: bool = False

    # Email
    email_enabled: bool = True
    email_messages: bool = True
    email_mentions: bool = True
    email_digest: str = "daily"  # none, immediate, daily, weekly

    # Do Not Disturb
    dnd_enabled: bool = False
    dnd_start_time: time = None  # e.g., 22:00
    dnd_end_time: time = None    # e.g., 08:00
    dnd_weekends: bool = False

    # Type overrides (JSON)
    type_overrides: dict = {}
```

### Digest Options

| Value | Description |
|-------|-------------|
| `none` | No email notifications |
| `immediate` | Send emails as events happen |
| `daily` | Batch and send once per day |
| `weekly` | Batch and send once per week |

### Do Not Disturb

DND mutes all notifications during specified hours:

```json
{
  "dnd_enabled": true,
  "dnd_start_time": "22:00",
  "dnd_end_time": "08:00",
  "dnd_weekends": true
}
```

## Sending Notifications (Admin)

### Target Types

| Type | Description |
|------|-------------|
| `all` | Send to all active users |
| `users` | Send to specific user IDs |

### API Example

```bash
# Send to all users
POST /api/v1/notifications/send
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "title": "System Maintenance",
  "description": "The system will be down for maintenance tonight.",
  "level": "warning",
  "target_type": "all",
  "redirect_url": "/announcements"
}

Response:
{
  "message": "Notification sent successfully",
  "recipient_count": 150
}

# Send to specific users
POST /api/v1/notifications/send
{
  "title": "Meeting Reminder",
  "description": "Don't forget the team meeting at 3pm.",
  "level": "info",
  "target_type": "users",
  "user_ids": [26, 27, 31]
}
```

### Notification Levels

| Level | Color | Use Case |
|-------|-------|----------|
| `info` | Blue | General information |
| `success` | Green | Positive updates |
| `warning` | Orange | Important notices |
| `error` | Red | Critical alerts |

## Frontend Integration

### Notification Preferences UI

Location: `/settings/notification-preferences`

Features:
- In-app notification toggles (enabled, sound, desktop)
- Push notification settings (per-type toggles)
- Email settings (digest frequency, per-type toggles)
- Do Not Disturb scheduling (time range, weekends)
- Reset to defaults

### Push Notification Service

```typescript
// src/services/push.ts
import { pushService } from '#/services/push';

// Check if supported
console.log(pushService.isSupported.value);

// Check permission status
console.log(pushService.permission.value); // 'default' | 'granted' | 'denied'

// Subscribe to push
const success = await pushService.subscribe();

// Unsubscribe
await pushService.unsubscribe();

// Check subscription status
console.log(pushService.isSubscribed.value);
```

### Service Worker

Location: `/public/sw.js`

Handles:
- Push event reception
- Notification display
- Click handling (navigation)
- Badge updates

## Database Schema

### notifications

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    level VARCHAR(20) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(500),
    data JSONB DEFAULT '{}',
    actor_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### notification_preferences

```sql
CREATE TABLE notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),

    -- In-App
    inbox_enabled BOOLEAN DEFAULT TRUE,
    inbox_sound BOOLEAN DEFAULT TRUE,
    inbox_desktop BOOLEAN DEFAULT FALSE,

    -- Push
    push_enabled BOOLEAN DEFAULT TRUE,
    push_messages BOOLEAN DEFAULT TRUE,
    push_mentions BOOLEAN DEFAULT TRUE,
    push_replies BOOLEAN DEFAULT TRUE,
    push_reactions BOOLEAN DEFAULT FALSE,
    push_activity BOOLEAN DEFAULT FALSE,

    -- Email
    email_enabled BOOLEAN DEFAULT TRUE,
    email_messages BOOLEAN DEFAULT TRUE,
    email_mentions BOOLEAN DEFAULT TRUE,
    email_digest VARCHAR(20) DEFAULT 'daily',

    -- DND
    dnd_enabled BOOLEAN DEFAULT FALSE,
    dnd_start_time TIME,
    dnd_end_time TIME,
    dnd_weekends BOOLEAN DEFAULT FALSE,

    -- Overrides
    type_overrides JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

### push_subscriptions

```sql
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    endpoint VARCHAR(500) UNIQUE NOT NULL,
    p256dh_key VARCHAR(500) NOT NULL,
    auth_key VARCHAR(500) NOT NULL,
    user_agent VARCHAR(500),
    device_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_is_active ON push_subscriptions(is_active);
```

## Email Templates

### New Message Email

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #1890ff; color: white; padding: 20px; }
    .content { padding: 20px; }
    .button { background: #1890ff; color: white; padding: 12px 24px;
              text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Message</h1>
    </div>
    <div class="content">
      <p>You have a new message from <strong>{{ sender_name }}</strong></p>
      <p><strong>Subject:</strong> {{ subject }}</p>
      <p>{{ preview }}</p>
      <p>
        <a href="{{ message_url }}" class="button">View Message</a>
      </p>
    </div>
  </div>
</body>
</html>
```

### Mention Email

```html
<div class="content">
  <p><strong>{{ sender_name }}</strong> mentioned you in a message:</p>
  <blockquote>{{ context }}</blockquote>
  <p>
    <a href="{{ message_url }}" class="button">View Mention</a>
  </p>
</div>
```

### Digest Email

```html
<div class="content">
  <h2>Your {{ period }} Digest</h2>
  <p>You have {{ unread_count }} unread notifications:</p>
  <ul>
    {% for item in items %}
    <li>
      <strong>{{ item.title }}</strong>
      <p>{{ item.preview }}</p>
    </li>
    {% endfor %}
  </ul>
  <p>
    <a href="{{ inbox_url }}" class="button">View All</a>
  </p>
</div>
```

## Configuration Reference

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | - |
| `SMTP_PORT` | SMTP server port | 587 |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password | - |
| `SMTP_TLS` | Use TLS | true |
| `EMAILS_FROM_EMAIL` | From email address | noreply@fastvue.com |
| `EMAILS_FROM_NAME` | From display name | FastVue |
| `VAPID_PRIVATE_KEY` | VAPID private key | - |
| `VAPID_PUBLIC_KEY` | VAPID public key | - |
| `VAPID_CLAIMS_EMAIL` | VAPID claims email | - |
| `FRONTEND_URL` | Frontend URL for links | http://localhost:5173 |

### Generating VAPID Keys

```bash
# Using web-push CLI
npx web-push generate-vapid-keys

# Output:
# Public Key: BNxRr...
# Private Key: dGVz...
```

## Best Practices

1. **Rate Limiting**: Don't spam users with notifications
2. **Batching**: Use digests for non-urgent notifications
3. **Preferences**: Always respect user preferences
4. **DND**: Check DND status before sending
5. **Fallback**: If push fails, ensure in-app notification exists
6. **Templates**: Use consistent, branded email templates
7. **Unsubscribe**: Provide easy opt-out options
8. **Testing**: Test notifications across channels

## Troubleshooting

### Push Notifications Not Working

1. Check VAPID keys are configured
2. Verify browser supports Push API
3. Check if user granted permission
4. Verify subscription is active in database
5. Check service worker is registered

### Emails Not Sending

1. Verify SMTP credentials
2. Check firewall/network allows SMTP
3. Review email logs for errors
4. Test with simple SMTP client first

### DND Not Working

1. Verify timezone handling
2. Check start/end time format
3. Verify dnd_enabled is true
4. Check weekend flag if applicable
