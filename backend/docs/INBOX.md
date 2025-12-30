# Unified Inbox System

A Huly-inspired unified inbox system that combines messages, notifications, activities, and mentions into a single interface.

## Overview

The inbox system provides:
- **Unified View**: All communication types in one place
- **Direct Messaging**: Send messages between users
- **Sent Messages**: Track messages you've sent
- **Drafts**: Save and resume message composition
- **Filtering**: Filter by type, read status, priority
- **Bulk Actions**: Mark read, archive multiple items
- **Real-time Updates**: Polling for new items

## Features

### Inbox Tabs

| Tab | Description |
|-----|-------------|
| All | All inbox items (unread count badge) |
| Messages | Direct messages and mentions |
| Notifications | System notifications |
| Activity | Activity log entries |
| Starred | Bookmarked items |
| Sent | Messages you've sent |
| Drafts | Saved draft messages |

### Item Actions

- **Star/Unstar**: Bookmark important items
- **Archive/Unarchive**: Move to/from archive
- **Mark Read/Unread**: Toggle read status
- **Delete**: Permanently remove item

### Compose Features

- **Multiple Recipients**: Send to multiple users
- **Subject Line**: Optional message subject
- **Rich Text Editor**: Format messages with toolbar
- **Emoji Picker**: Full emoji support with search
- **@Mentions**: Mention users with autocomplete
- **Attachments**: Attach files (placeholder)
- **Save as Draft**: Auto-save and manual save

## Backend API

### Endpoints

```
# Inbox Items
GET    /api/v1/inbox/                  List inbox (filters: item_type, is_read, is_archived, is_starred, priority)
GET    /api/v1/inbox/stats             Get unread counts by type
GET    /api/v1/inbox/{id}              Get item with full details
PATCH  /api/v1/inbox/{id}              Update item properties
DELETE /api/v1/inbox/{id}              Delete item

# Item Actions
POST   /api/v1/inbox/{id}/read         Mark as read
POST   /api/v1/inbox/{id}/unread       Mark as unread
POST   /api/v1/inbox/{id}/archive      Archive item
POST   /api/v1/inbox/{id}/unarchive    Unarchive item
POST   /api/v1/inbox/{id}/star         Star item
POST   /api/v1/inbox/{id}/unstar       Unstar item

# Bulk Actions
POST   /api/v1/inbox/bulk-read         Mark multiple as read
POST   /api/v1/inbox/bulk-archive      Archive multiple items

# Messaging
POST   /api/v1/inbox/send              Send direct message
GET    /api/v1/inbox/sent              Get sent messages

# Drafts
GET    /api/v1/inbox/drafts            Get all drafts
POST   /api/v1/inbox/drafts            Create draft
PUT    /api/v1/inbox/drafts/{id}       Update draft
DELETE /api/v1/inbox/drafts/{id}       Delete draft
```

### Request/Response Examples

#### List Inbox Items
```bash
GET /api/v1/inbox/?item_type=message&is_read=false&page=1&page_size=20

Response:
{
  "items": [
    {
      "id": 1,
      "user_id": 26,
      "item_type": "message",
      "reference_type": "messages",
      "reference_id": 23,
      "source_model": "users",
      "source_id": 31,
      "title": "Hello from Demo",
      "preview": "This is a test message...",
      "priority": "normal",
      "is_read": false,
      "is_archived": false,
      "is_starred": false,
      "actor": {
        "id": 31,
        "full_name": "Demo User",
        "avatar_url": null
      },
      "created_at": "2025-12-26T08:14:40.373906+05:30"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20,
  "unread_count": 3,
  "unread_by_type": {
    "message": 2,
    "notification": 1,
    "activity": 0,
    "mention": 0
  }
}
```

#### Send Message
```bash
POST /api/v1/inbox/send
Content-Type: application/json

{
  "recipient_id": 27,
  "subject": "Meeting Tomorrow",
  "body": "Hi, can we meet tomorrow at 10am?",
  "body_html": "<p>Hi, can we meet tomorrow at 10am?</p>",
  "priority": "normal"
}

Response:
{
  "message_id": 24,
  "inbox_item_id": 15,
  "recipient_id": 27,
  "message": "Message sent successfully"
}
```

#### Create Draft
```bash
POST /api/v1/inbox/drafts
Content-Type: application/json

{
  "recipient_ids": [27, 31],
  "subject": "Project Update",
  "body": "Here's the latest update..."
}

Response:
{
  "id": 1,
  "user_id": 26,
  "recipient_ids": [27, 31],
  "subject": "Project Update",
  "body": "Here's the latest update...",
  "body_html": null,
  "attachments": null,
  "created_at": "2025-12-26T08:25:43.969519",
  "updated_at": "2025-12-26T08:25:43.969519"
}
```

## Frontend Components

### Views

#### `views/inbox/index.vue`
Main inbox view with:
- Tabbed navigation (All, Messages, Notifications, Activity, Starred, Sent, Drafts)
- Bulk selection and actions
- Item list with hover actions
- Preview panel for selected item
- Compose button

### Components

#### `components/inbox/ComposeMessage.vue`
Message composer modal with:
- User search/select for recipients
- Subject input field
- Rich text editor with toolbar
- Emoji picker button
- Attachment button (placeholder)
- Save Draft / Send buttons

### Store

#### `store/inbox.ts`
Pinia store managing:
- Inbox items list
- Unread counts by type
- Loading states
- Polling for updates

```typescript
const inboxStore = useInboxStore();

// Fetch inbox
await inboxStore.fetchInbox();

// Access state
console.log(inboxStore.items);
console.log(inboxStore.unreadCount);
console.log(inboxStore.unreadByType);

// Actions
await inboxStore.markAsRead(itemId);
await inboxStore.archive(itemId);
await inboxStore.star(itemId);

// Polling
inboxStore.startPolling(30000); // 30 second interval
inboxStore.stopPolling();
```

### API Functions

#### `api/core/inbox.ts`

```typescript
import {
  getInboxApi,
  getInboxStatsApi,
  getInboxItemApi,
  updateInboxItemApi,
  deleteInboxItemApi,
  markInboxItemReadApi,
  markInboxItemUnreadApi,
  archiveInboxItemApi,
  unarchiveInboxItemApi,
  starInboxItemApi,
  unstarInboxItemApi,
  bulkMarkReadApi,
  bulkArchiveApi,
  sendMessageApi,
  getSentMessagesApi,
  getDraftsApi,
  createDraftApi,
  updateDraftApi,
  deleteDraftApi,
} from '#/api/core/inbox';
```

## Database Schema

### InboxItem Table

```sql
CREATE TABLE inbox_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_type VARCHAR(20) NOT NULL,  -- message, notification, activity, mention
    reference_type VARCHAR(50) NOT NULL,
    reference_id INTEGER NOT NULL,
    source_model VARCHAR(100),
    source_id INTEGER,
    title VARCHAR(255),
    preview TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    actor_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX idx_inbox_user_id ON inbox_items(user_id);
CREATE INDEX idx_inbox_item_type ON inbox_items(item_type);
CREATE INDEX idx_inbox_is_read ON inbox_items(is_read);
CREATE INDEX idx_inbox_created_at ON inbox_items(created_at DESC);
```

## Usage Examples

### Sending a Message (Frontend)

```typescript
import { sendMessageApi } from '#/api/core/inbox';

const response = await sendMessageApi({
  recipient_id: 27,
  subject: 'Meeting Request',
  body: 'Can we schedule a meeting?',
  priority: 'normal',
});

console.log('Message sent:', response.message_id);
```

### Saving a Draft (Frontend)

```typescript
import { createDraftApi, updateDraftApi } from '#/api/core/inbox';

// Create new draft
const draft = await createDraftApi({
  recipient_ids: [27],
  subject: 'Work in Progress',
  body: 'Starting to write...',
});

// Update existing draft
await updateDraftApi(draft.id, {
  body: 'Updated content...',
});
```

### Inbox Polling (Frontend)

```typescript
import { useInboxStore } from '#/store/inbox';

const inboxStore = useInboxStore();

// Start polling every 30 seconds
onMounted(() => {
  inboxStore.startPolling(30000);
});

// Stop when component unmounts
onUnmounted(() => {
  inboxStore.stopPolling();
});
```

## Implemented Features

- [x] Real-time updates via WebSocket
- [x] Message reactions (emoji)
- [x] @Mentions with notifications
- [x] Text templates
- [x] Bookmarks & Archive
- [x] Rich text editor
- [x] Push notifications (VAPID)
- [x] Email notifications with digests
- [x] Notification preferences
- [x] Do Not Disturb scheduling
- [x] Labels/folders

## Future Enhancements

- [ ] Message threads/replies (UI enhancements)
- [ ] File attachments upload (S3 integration)
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Full-text search within inbox

---

## WebSocket Real-Time Updates

### Connection

```javascript
// Frontend connection
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws?token=${accessToken}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Event:', message.type, message.data);
};
```

### Event Types

| Event | Description |
|-------|-------------|
| `connection:established` | WebSocket connected successfully |
| `inbox:new` | New inbox item received |
| `inbox:updated` | Inbox item updated |
| `inbox:deleted` | Inbox item deleted |
| `message:new` | New message received |
| `message:reaction` | Reaction added/removed |
| `notification:new` | New notification |
| `typing:start` | User started typing |
| `typing:stop` | User stopped typing |
| `read:receipt` | Message was read |
| `user:online` | User came online |
| `user:offline` | User went offline |
| `label:created` | Label created |
| `label:updated` | Label updated |
| `label:deleted` | Label deleted |

### Backend Usage

```python
from app.services.realtime import realtime, EventType

# Notify user of new message
await realtime.notify_message_new(
    recipient_id=27,
    message_id=123,
    sender_id=26,
    sender_name="John Doe",
    subject="Hello",
    preview="This is a message..."
)

# Notify of reaction
await realtime.notify_message_reaction(
    message_author_id=26,
    message_id=123,
    reactor_id=27,
    reactor_name="Jane",
    emoji="👍",
    action="added"
)

# Broadcast to all users
await realtime.publish(
    EventType.NOTIFICATION_NEW,
    {"title": "System Update", "message": "..."},
    user_ids=None  # All connected users
)
```

---

## Emoji Reactions

### API Endpoints

```
POST   /api/v1/messages/{id}/reactions          Add reaction
DELETE /api/v1/messages/{id}/reactions/{emoji}  Remove reaction
GET    /api/v1/messages/{id}/reactions          Get all reactions
```

### Request/Response

```bash
# Add reaction
POST /api/v1/messages/123/reactions
Content-Type: application/json
{"emoji": "👍"}

Response:
{
  "id": 1,
  "message_id": 123,
  "user_id": 26,
  "emoji": "👍",
  "created_at": "2025-12-26T10:00:00Z"
}

# Get reactions summary
GET /api/v1/messages/123/reactions

Response:
{
  "reactions": [
    {"emoji": "👍", "count": 3, "users": [{"id": 26, "name": "John"}, ...]},
    {"emoji": "❤️", "count": 1, "users": [{"id": 27, "name": "Jane"}]}
  ],
  "user_reactions": ["👍"]  // Current user's reactions
}
```

---

## @Mentions

### Parsing Mentions

Mentions are parsed from message body using `@username` pattern:

```python
from app.services.mention import mention_service

# Parse and create mentions when sending message
await mention_service.process_message_mentions(
    db=db,
    message=message,
    sender=current_user
)
```

### Mention Notifications

When a user is mentioned:
1. Inbox item created with `item_type="mention"`
2. Push notification sent (if enabled)
3. Email notification sent (if enabled)
4. Real-time WebSocket event

---

## Labels/Folders

### API Endpoints

```
GET    /api/v1/labels/                      List labels
POST   /api/v1/labels/                      Create label
PATCH  /api/v1/labels/{id}                  Update label
DELETE /api/v1/labels/{id}                  Delete label
POST   /api/v1/inbox/{id}/labels            Add labels to item
DELETE /api/v1/inbox/{id}/labels/{label_id} Remove label
POST   /api/v1/inbox/bulk-label             Bulk add labels
```

### Label Schema

```json
{
  "id": 1,
  "name": "Important",
  "color": "#ff4d4f",
  "icon": "star",
  "is_system": false,
  "sort_order": 0
}
```

### System Labels

| Label | Color | Description |
|-------|-------|-------------|
| Important | Red | High priority items |
| Work | Blue | Work-related |
| Personal | Green | Personal items |
| Follow-up | Orange | Needs follow-up |

---

## Messaging Configuration

The messaging configuration system controls who can message whom within the application. This provides fine-grained control over messaging permissions based on users, groups, roles, or company membership.

### Scope Types

| Scope | Description |
|-------|-------------|
| `user` | Specific user (requires `source_id` or `target_id`) |
| `group` | Users in a specific group |
| `role` | Users with a specific role |
| `all` | All users in the system |
| `same_company` | Users in the same company |
| `same_group` | Users in the same group(s) |

### API Endpoints

```
# Messaging Configuration (requires settings.* permissions)
GET    /api/v1/messaging-config/              List configurations
GET    /api/v1/messaging-config/{id}          Get configuration
POST   /api/v1/messaging-config/              Create configuration
PUT    /api/v1/messaging-config/{id}          Update configuration
DELETE /api/v1/messaging-config/{id}          Delete configuration
POST   /api/v1/messaging-config/ensure-default  Ensure default rule exists

# Messageable Users (available to all authenticated users)
GET    /api/v1/users/messageable              Get users current user can message
```

### Configuration Schema

```json
{
  "id": 1,
  "company_id": 32,
  "name": "Same Company Messaging",
  "description": "Allow users in the same company to message each other",
  "source_type": "all",
  "source_id": null,
  "target_type": "same_company",
  "target_id": null,
  "can_message": true,
  "can_see_online": true,
  "can_see_typing": true,
  "priority": 0,
  "is_active": true,
  "created_at": "2025-12-26T10:00:00Z",
  "updated_at": null
}
```

### Default Rule

When a user first tries to compose a message, the system automatically creates a default rule allowing all users in the same company to message each other:

```python
# Default rule created automatically
{
    "name": "Default Same Company",
    "source_type": "all",
    "target_type": "same_company",
    "can_message": True,
    "can_see_online": True,
    "can_see_typing": True,
    "priority": 0
}
```

### Rule Evaluation

1. Rules are evaluated by priority (higher priority wins)
2. More specific rules (user, group) override general rules (all, same_company)
3. `can_message: false` explicitly blocks messaging even if other rules allow it

### Example Configurations

#### Allow Managers to Message Anyone
```json
{
  "name": "Managers Full Access",
  "source_type": "role",
  "source_id": 2,
  "target_type": "all",
  "target_id": null,
  "can_message": true,
  "priority": 10
}
```

#### Block Specific User
```json
{
  "name": "Block User 42",
  "source_type": "user",
  "source_id": 42,
  "target_type": "all",
  "target_id": null,
  "can_message": false,
  "priority": 100
}
```

#### Group-to-Group Messaging
```json
{
  "name": "Engineering to Sales",
  "source_type": "group",
  "source_id": 1,
  "target_type": "group",
  "target_id": 4,
  "can_message": true,
  "priority": 5
}
```

### Frontend Integration

The compose message dialog uses the `/users/messageable` endpoint to show only users the current user can message:

```typescript
// ComposeMessage.vue
const response = await requestClient.get<{ items: UserOption[] }>('/users/messageable', {
  params: { search: query, page_size: 10 },
});
```

### Permissions

| Endpoint | Required Permission |
|----------|---------------------|
| List/Get configs | `settings.read` |
| Create config | `settings.create` |
| Update config | `settings.update` |
| Delete config | `settings.delete` |
| Get messageable users | (any authenticated user) |
| Ensure default | (any authenticated user) |
