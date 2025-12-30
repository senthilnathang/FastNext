# FastVue to FastNext Frontend Migration Plan

## Executive Summary

This document outlines the comprehensive plan to migrate frontend features, themes, UI, and functionality from **FastVue** (Vue.js) to **FastNext** (Next.js).

### Current State Analysis

| Aspect | FastVue | FastNext | Gap Analysis |
|--------|---------|----------|--------------|
| **Framework** | Vue 3.5.24 + Vite 7.2.2 | Next.js 16 (canary) + React 19 | Different paradigms |
| **UI Library** | Ant Design Vue 4.2.6 | Radix UI + shadcn/ui | Need component mapping |
| **State Management** | Pinia 3.0.3 | Context + TanStack Query | Pattern adaptation needed |
| **Styling** | Tailwind 3.4.18 | Tailwind v4 | Minor config updates |
| **Components** | 44 Vue components | 145+ React components | Many already exist |
| **Pages** | 27 views | 20+ routes | Need feature parity |
| **Composables/Hooks** | 35+ composables | 15+ hooks | Need to port remaining |

---

## Migration Stages Overview

```
Stage 1: Foundation & Theme Alignment (Priority: HIGH)
    ↓
Stage 2: Core Components Migration (Priority: HIGH)
    ↓
Stage 3: State Management & API Layer (Priority: HIGH)
    ↓
Stage 4: Feature Modules Migration (Priority: MEDIUM)
    ↓
Stage 5: Real-time & Advanced Features (Priority: MEDIUM)
    ↓
Stage 6: Testing & Quality Assurance (Priority: HIGH)
```

---

## Stage 1: Foundation & Theme Alignment

### 1.1 Theme System Unification

**Objective:** Align FastNext theme with FastVue's Ant Design-based styling

#### Tasks:

1. **Color Palette Migration**
   - [ ] Map Ant Design colors to CSS variables in FastNext
   - [ ] Migrate FastVue primary color: `hsl(212 100% 45%)` (Professional Blue)
   - [ ] Create color token mapping file

   ```typescript
   // /shared/constants/colors.ts
   export const theme = {
     primary: 'hsl(212 100% 45%)',
     success: 'hsl(142 76% 36%)',
     warning: 'hsl(45 93% 47%)',
     error: 'hsl(0 84% 60%)',
     // ... map all Ant Design colors
   }
   ```

2. **Typography Alignment**
   - [ ] Match FastVue font sizes and weights
   - [ ] Ensure consistent heading hierarchy
   - [ ] Port custom typography classes from FastVue

3. **Spacing & Layout**
   - [ ] Verify Tailwind spacing scale matches
   - [ ] Port FastVue-specific layout utilities
   - [ ] Align border-radius tokens (FastVue uses 0.5)

4. **Dark Mode Parity**
   - [ ] Ensure dark mode colors match FastVue
   - [ ] Port scrollbar styling for both modes
   - [ ] Test all components in dark mode

#### Files to Create/Modify:
- `/src/app/globals.css` - Add FastVue color tokens
- `/tailwind.config.ts` - Extend with FastVue colors
- `/shared/constants/theme.ts` - Create theme constants

### 1.2 Global Styles Migration

**Port from FastVue** (`/apps/web-fastvue/src/styles/global.css`):

- [ ] Custom scrollbar styling (light & dark)
- [ ] Responsive design fixes for mobile/tablet
- [ ] Drag-and-drop visual feedback
- [ ] Sortable.js ghost element styling
- [ ] Form improvements for mobile
- [ ] Chart container responsiveness
- [ ] Ant Design component fixes → Radix UI equivalents

---

## Stage 2: Core Components Migration

### 2.1 Component Mapping Matrix

| FastVue Component | FastNext Equivalent | Status | Action Needed |
|-------------------|---------------------|--------|---------------|
| **Activity Components** |
| `ActivityFeed.vue` | `ActivityFeed.tsx` | ✅ Exists | Verify feature parity |
| `MessageReply.vue` | - | ❌ Missing | Create new |
| `MessageThread.vue` | - | ❌ Missing | Create new |
| `ReactionBar.vue` | - | ❌ Missing | Create new |
| `ReadStatusBadge.vue` | - | ❌ Missing | Create new |
| `RichTextEditor.vue` | `RichTextEditor.tsx` | ⚠️ Partial | Enhance features |
| **Attachments Components** |
| `AttachmentList.vue` | `AttachmentList.tsx` | ✅ Exists | Verify parity |
| `AttachmentUploader.vue` | `FileUpload.tsx` | ✅ Exists | Verify parity |
| `FilePreview.vue` | - | ❌ Missing | Create new |
| `ImagePreview.vue` | `OptimizedImage.tsx` | ⚠️ Partial | Add preview modal |
| **Charts Components** |
| `LazyChart.vue` | `EChartsWrapper.tsx` | ✅ Exists | Verify lazy loading |
| `bar-chart.vue` | `BarChart.tsx` | ✅ Exists | Verify parity |
| `line-chart.vue` | `LineChart.tsx` | ✅ Exists | Verify parity |
| `pie-chart.vue` | `PieChart.tsx` | ✅ Exists | Verify parity |
| **Common Components** |
| `ActionButtons.vue` | `ButtonGroup` | ✅ Exists | Verify parity |
| `Breadcrumb.vue` | `Breadcrumb.tsx` | ✅ Exists | Verify parity |
| `CommandPalette.vue` | `CommandPalette.tsx` | ✅ Exists (cmdk) | Verify features |
| `CompanySelect.vue` | - | ❌ Missing | Create new |
| `CompanySwitcher.vue` | - | ❌ Missing | Create new |
| `ColumnSettings.vue` | `ColumnSettings.tsx` | ✅ Exists | Verify parity |
| `ViewToggle.vue` | `ViewToggle.tsx` | ✅ Exists | Verify parity |
| `FilterBuilder.vue` | `FilterBuilder.tsx` | ⚠️ Partial | Enhance dynamic filters |
| `EmptyState.vue` | `EmptyState.tsx` | ✅ Exists | Verify parity |
| `ErrorBoundary.vue` | `ErrorBoundary.tsx` | ✅ Exists | Verify parity |
| `LoadingOverlay.vue` | `LoadingSpinner.tsx` | ✅ Exists | Add overlay variant |
| `Skeleton.vue` | `Skeleton.tsx` | ✅ Exists | Verify parity |
| `StatisticCard.vue` | `StatCard.tsx` | ✅ Exists | Verify parity |
| `StatusTag.vue` | `Badge.tsx` | ✅ Exists | Add status variants |
| `NotificationBell.vue` | - | ❌ Missing | Create new |
| `NotificationContainer.vue` | `Toaster` (Sonner) | ✅ Exists | Add persistent notifications |
| `EmojiPicker.vue` | - | ❌ Missing | Create new |
| `MentionInput.vue` | - | ❌ Missing | Create new |
| `SearchInput.vue` | `SearchInput.tsx` | ✅ Exists | Verify parity |
| `TemplatePicker.vue` | - | ❌ Missing | Create new |
| `BookmarkButton.vue` | - | ❌ Missing | Create new |
| `SessionManager.vue` | `SessionTimeoutWarning` | ✅ Exists | Verify parity |
| **Inbox Components** |
| `CollapsibleThread.vue` | - | ❌ Missing | Create new |
| `ComposeMessage.vue` | `ComposeMessage.tsx` | ⚠️ Partial | Enhance features |
| `ConversationList.vue` | `ConversationList.tsx` | ✅ Exists | Verify parity |
| `ConversationThread.vue` | `ConversationThread.tsx` | ⚠️ Partial | Enhance features |
| `LabelBadge.vue` | `Badge.tsx` | ✅ Exists | Add label variant |
| `LabelPicker.vue` | - | ❌ Missing | Create new |
| `SearchFilters.vue` | `AdvancedSearch.tsx` | ✅ Exists | Verify parity |

### 2.2 Priority Components to Create

**High Priority (Required for feature parity):**

1. **CompanySwitcher Component**
   - Multi-tenancy support
   - Company context management
   - Persist selection

2. **NotificationBell Component**
   - Unread count badge
   - Dropdown with recent notifications
   - Mark as read functionality

3. **EmojiPicker Component**
   - Full emoji support
   - Search functionality
   - Recent emojis

4. **MentionInput Component**
   - @mention support
   - User search/autocomplete
   - Styled mentions display

5. **MessageReply & ReactionBar**
   - Reply threading
   - Emoji reactions
   - Reaction counts

6. **LabelPicker Component**
   - Label management
   - Color selection
   - Multi-select support

### 2.3 Component Implementation Order

```
Week 1-2: Foundation Components
├── CompanySwitcher.tsx
├── NotificationBell.tsx
├── LoadingOverlay.tsx (enhance)
└── StatusTag.tsx (enhance)

Week 3-4: Communication Components
├── EmojiPicker.tsx
├── MentionInput.tsx
├── ReactionBar.tsx
├── MessageReply.tsx
└── MessageThread.tsx

Week 5-6: Inbox Components
├── CollapsibleThread.tsx
├── LabelPicker.tsx
├── LabelBadge.tsx
├── FilePreview.tsx
└── TemplatePicker.tsx

Week 7-8: Enhancement & Polish
├── Enhance RichTextEditor.tsx
├── Enhance FilterBuilder.tsx
├── Add image preview modal
└── Component testing
```

---

## Stage 3: State Management & API Layer

### 3.1 Pinia to React State Migration

#### Store Mapping

| Pinia Store | React Equivalent | Implementation |
|-------------|------------------|----------------|
| `useAuthStore` | `AuthProvider` + `useAuth` | ✅ Exists - verify features |
| `useCompanyStore` | `CompanyProvider` + `useCompany` | ❌ Create new |
| `useConversationsStore` | TanStack Query hooks | ⚠️ Partial - enhance |
| `useInboxStore` | TanStack Query hooks | ⚠️ Partial - enhance |
| `useLabelsStore` | `useLabels` hook | ❌ Create new |
| `useNotificationStore` | `useNotifications` hook | ❌ Create new |
| `usePermissionStore` | `usePermissions` hook | ✅ Exists - verify |

#### Implementation Tasks:

1. **Company Context Provider**
   ```typescript
   // /shared/providers/CompanyProvider.tsx
   - Company selection state
   - Multi-tenancy headers
   - Company switching logic
   - Persist to localStorage
   ```

2. **Notification Hook**
   ```typescript
   // /shared/hooks/useNotifications.ts
   - Fetch notifications
   - Mark as read
   - Real-time updates
   - Unread count
   ```

3. **Labels Hook**
   ```typescript
   // /shared/hooks/useLabels.ts
   - CRUD operations
   - Label assignment
   - Color management
   ```

### 3.2 API Layer Alignment

**FastVue API Patterns to Port:**

1. **Request Interceptors**
   - [ ] X-Company-ID header for multi-tenancy
   - [ ] X-Request-ID for tracing
   - [ ] XSS sanitization (FastVue has this)

2. **Response Handling**
   - [ ] FastAPI error format handling
   - [ ] Pydantic validation error parsing
   - [ ] Rate limit (429) handling with retry

3. **Token Management**
   - [ ] Refresh token flow
   - [ ] Token expiry modal
   - [ ] Automatic re-authentication

#### Files to Create/Modify:
- `/lib/api/interceptors.ts` - Request/response interceptors
- `/lib/api/multitenancy.ts` - Company header management
- `/shared/hooks/useApiClient.ts` - Enhanced API hook

---

## Stage 4: Feature Modules Migration

### 4.1 Module Comparison

| Module | FastVue Status | FastNext Status | Gap |
|--------|---------------|-----------------|-----|
| **Dashboard** | ✅ Complete | ✅ Complete | Minor UI tweaks |
| **User Management** | ✅ Complete | ✅ Complete | Verify parity |
| **Role Management** | ✅ Complete | ✅ Complete | Verify parity |
| **Permission Management** | ✅ Complete | ✅ Complete | Verify parity |
| **Group Management** | ✅ Complete | ⚠️ Partial | Add group features |
| **Company Management** | ✅ Complete | ❌ Missing | Create module |
| **Inbox/Messaging** | ✅ Complete | ⚠️ Partial | Enhance features |
| **Notifications** | ✅ Complete | ⚠️ Partial | Add notification center |
| **Profile** | ✅ Complete | ✅ Complete | Verify parity |
| **Settings** | ✅ Complete | ✅ Complete | Verify parity |
| **Security** | ✅ Complete | ✅ Complete | Verify parity |
| **Audit Logs** | ✅ Complete | ✅ Complete | Verify parity |
| **RLS** | ✅ Complete | ✅ Complete | Verify parity |
| **ACL** | ✅ Complete | ✅ Complete | Verify parity |
| **Modules** | ✅ Complete | ⚠️ Partial | Add dynamic loading |

### 4.2 Priority Modules to Create/Enhance

#### 4.2.1 Company Management Module

**Location:** `/src/modules/company/`

**Pages:**
- `/admin/companies` - Company list
- `/admin/companies/[id]` - Company details
- `/admin/companies/new` - Create company

**Components:**
- `CompanyList.tsx`
- `CompanyForm.tsx`
- `CompanyDetails.tsx`

**Hooks:**
- `useCompanies.ts`
- `useCompany.ts`

#### 4.2.2 Notification Center Module

**Location:** `/src/modules/notifications/`

**Pages:**
- `/notifications` - Notification center

**Components:**
- `NotificationList.tsx`
- `NotificationItem.tsx`
- `NotificationPreferences.tsx`

**Hooks:**
- `useNotifications.ts`
- `useNotificationPreferences.ts`

#### 4.2.3 Group Management Enhancement

**Enhance:** `/src/modules/admin/`

**Add:**
- Group CRUD pages
- Group member management
- Group permission assignment

### 4.3 Page Routes to Create

| Route | FastVue | FastNext Status |
|-------|---------|-----------------|
| `/settings/companies` | ✅ | ❌ Create |
| `/company/form` | ✅ | ❌ Create |
| `/group/form` | ✅ | ❌ Create |
| `/notifications` | ✅ | ❌ Create |
| `/settings/notification-preferences` | ✅ | ❌ Create |
| `/modules` | ✅ | ⚠️ Enhance |

---

## Stage 5: Real-time & Advanced Features

### 5.1 WebSocket Integration

**FastVue WebSocket Features to Port:**

1. **Connection Management**
   - [ ] Auto-reconnection logic
   - [ ] Connection state tracking
   - [ ] Event binding system

2. **Real-time Events**
   - [ ] Typing indicators
   - [ ] Message updates
   - [ ] Notification push
   - [ ] Online status

#### Implementation:

```typescript
// /shared/hooks/useWebSocket.ts (enhance existing)
export function useWebSocket(url: string) {
  // Add reconnection logic
  // Add event binding
  // Add typing indicator support
  // Add online status tracking
}
```

### 5.2 Push Notifications

**Port from FastVue:**
- Service worker integration
- Web Push API support
- Permission handling
- Notification display

#### Files:
- `/public/sw.js` - Service worker (enhance)
- `/shared/hooks/usePushNotifications.ts` - Create new

### 5.3 Typing Indicators

```typescript
// /shared/hooks/useTypingIndicator.ts
export function useTypingIndicator(conversationId: string) {
  // Emit typing events
  // Listen for typing events
  // Debounce logic
  // Display logic
}
```

### 5.4 Session Management

**Enhance existing:**
- [ ] Idle detection (port `useIdleDetection`)
- [ ] Online/offline status
- [ ] Lock screen support
- [ ] Session timeout handling

### 5.5 Dynamic Module Loading

**Port FastVue module system:**

```typescript
// /lib/modules/loader.ts
export async function loadModule(moduleName: string) {
  // Fetch module config from backend
  // Load module routes dynamically
  // Register module stores
  // Handle module lifecycle
}
```

---

## Stage 6: Testing & Quality Assurance

### 6.1 Testing Strategy

| Test Type | FastVue | FastNext | Action |
|-----------|---------|----------|--------|
| Unit Tests | Vitest | Jest + Vitest | Port test patterns |
| E2E Tests | Playwright | Playwright | Expand coverage |
| Component Tests | Vue Test Utils | Testing Library | Create new |

### 6.2 Test Migration Tasks

1. **Port Unit Tests**
   - [ ] `useAsyncData.test.ts` → adapt for React Query
   - [ ] `useFilter.test.ts` → port to React
   - [ ] `usePagination.test.ts` → port to React
   - [ ] `useSearch.test.ts` → port to React
   - [ ] `permission.test.ts` → verify in React

2. **Create New Tests**
   - [ ] Test all new components
   - [ ] Test all new hooks
   - [ ] Test API integration
   - [ ] Test authentication flow

3. **E2E Test Coverage**
   - [ ] Full auth flow
   - [ ] User management CRUD
   - [ ] Role/permission management
   - [ ] Company management
   - [ ] Inbox/messaging
   - [ ] Notification flow

### 6.3 Quality Checklist

- [ ] All FastVue features have FastNext equivalents
- [ ] Responsive design matches FastVue
- [ ] Dark mode works identically
- [ ] Accessibility standards met
- [ ] Performance benchmarks met
- [ ] All API endpoints integrated
- [ ] Error handling consistent
- [ ] Loading states consistent

---

## Composables/Hooks Migration Matrix

| FastVue Composable | FastNext Hook | Status |
|--------------------|---------------|--------|
| `useAbortableRequest` | Built into TanStack Query | ✅ |
| `useAsyncData` | TanStack Query | ✅ |
| `useApiCache` | TanStack Query caching | ✅ |
| `usePrefetch` | TanStack Query prefetch | ✅ |
| `useSearch` | `useSearch.ts` | ✅ Verify |
| `useForm` | react-hook-form | ✅ |
| `useFileUpload` | `useFileUpload.ts` | ✅ Verify |
| `useClipboard` | Need to create | ❌ |
| `useColumnSettings` | Exists | ✅ Verify |
| `useCommandPalette` | cmdk integration | ✅ |
| `useConfirm` | `ConfirmationDialog` | ✅ |
| `useModal` | Radix Dialog | ✅ |
| `useNotification` | Sonner toast | ✅ |
| `useFilter` | Need to enhance | ⚠️ |
| `useListView` | Need to create | ❌ |
| `useTableView` | TanStack Table | ✅ |
| `usePagination` | TanStack Table | ✅ |
| `useVirtualList` | react-window | ✅ |
| `useDragAndDrop` | dnd-kit | ✅ |
| `useKeyboardShortcuts` | Need to create | ❌ |
| `useIdleDetection` | Need to create | ❌ |
| `useOnlineStatus` | Need to create | ❌ |
| `useMediaQuery` | Built-in or create | ⚠️ |
| `useTheme` | next-themes | ✅ |
| `useStorage` | Need to create | ❌ |
| `useExport` | xlsx integration | ✅ |
| `useEventBus` | Need pattern | ❌ |
| `useWebSocket` | Exists | ✅ Enhance |
| `useTypingIndicator` | Need to create | ❌ |
| `usePermission` | Exists | ✅ Verify |

---

## Implementation Priority Matrix

### P0 - Critical (Must Have)

1. Company Management (multi-tenancy is core)
2. Notification System (NotificationBell, center)
3. API interceptor enhancements
4. Missing core components

### P1 - High (Should Have)

1. Messaging enhancements (reactions, threads)
2. Dynamic module loading
3. Real-time WebSocket features
4. Enhanced filtering/search

### P2 - Medium (Nice to Have)

1. Push notifications
2. Typing indicators
3. Idle detection
4. Keyboard shortcuts

### P3 - Low (Future)

1. i18n support
2. Advanced offline support
3. Workflow automation UI
4. Report builder

---

## Success Criteria

1. **Feature Parity:** All FastVue features work in FastNext
2. **UI Consistency:** Visual design matches FastVue
3. **Performance:** Lighthouse score > 90
4. **Test Coverage:** > 80% for critical paths
5. **Accessibility:** WCAG 2.1 AA compliant
6. **Mobile:** Fully responsive on all breakpoints

---

## Appendix A: File Structure for New Components

```
/src/shared/components/
├── communication/
│   ├── EmojiPicker.tsx
│   ├── MentionInput.tsx
│   ├── ReactionBar.tsx
│   ├── MessageReply.tsx
│   └── MessageThread.tsx
├── inbox/
│   ├── CollapsibleThread.tsx
│   ├── LabelPicker.tsx
│   └── LabelBadge.tsx
├── notifications/
│   ├── NotificationBell.tsx
│   ├── NotificationList.tsx
│   └── NotificationItem.tsx
├── company/
│   ├── CompanySwitcher.tsx
│   └── CompanySelect.tsx
└── media/
    ├── FilePreview.tsx
    └── ImagePreviewModal.tsx
```

## Appendix B: Environment Variables to Add

```env
# Multi-tenancy
NEXT_PUBLIC_DEFAULT_COMPANY_ID=

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=

# Feature Flags
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
```

---

**Document Version:** 1.0
**Created:** December 30, 2025
**Last Updated:** December 30, 2025
