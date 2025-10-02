# FastNext Frontend

A modern, mobile-first full-stack admin dashboard built with Next.js, featuring comprehensive mobile navigation, responsive design, and advanced UI components.

## Features

### 🚀 Core Technologies
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Framer Motion** for animations
- **TanStack Table** for data tables

### 📱 Mobile-First Design
- **Responsive Navigation** - Collapsible sidebar with gesture support
- **Touch Gestures** - Swipe navigation and interactions
- **Mobile Tables** - Card-based layouts for mobile devices
- **Bottom Navigation** - Modern mobile navigation patterns
- **Voice Search** - Web Speech API integration
- **Progressive Enhancement** - Desktop fallbacks

### 🎨 UI Components
- **Mobile Sidebar** - Gesture-controlled collapsible navigation
- **Mobile Search** - Voice-enabled search with suggestions
- **Responsive Dashboard** - Adaptive grid layouts
- **Mobile Tables** - Touch-optimized data views
- **Bottom Navigation** - Tab-based mobile navigation
- **ViewManager** - Universal data visualization with multiple view types
- **Advanced Views** - Kanban, Gantt, and Calendar layouts for data management

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd frontend

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### Development

```bash
# Start development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Mobile Navigation Components

### MobileSidebar
Collapsible sidebar with gesture support and smooth animations.

```tsx
import { MobileSidebar, useMobileSidebar } from '@/shared/components/MobileSidebar'

function App() {
  const { isOpen, toggle } = useMobileSidebar()
  
  return (
    <MobileSidebar
      isOpen={isOpen}
      onOpenChange={toggle}
      enableSwipe={true}
    >
      {/* Navigation content */}
    </MobileSidebar>
  )
}
```

### MobileSearch
Voice-enabled search with suggestions and filters.

```tsx
import { MobileSearch } from '@/shared/components/MobileSearch'

function SearchComponent() {
  const [value, setValue] = useState('')
  
  return (
    <MobileSearch
      value={value}
      onChange={setValue}
      enableVoiceSearch={true}
      suggestions={['Option 1', 'Option 2']}
    />
  )
}
```

### MobileTable
Responsive tables that switch between desktop tables and mobile cards.

```tsx
import { MobileTable } from '@/shared/components/MobileTable'

function DataTable() {
  return (
    <MobileTable
      columns={columns}
      data={data}
      enableSearch={true}
      searchKey="name"
    />
  )
}
```

### ResponsiveDashboard
Adaptive grid system for dashboard widgets.

```tsx
import { ResponsiveDashboard, ResponsiveWidget } from '@/shared/components/ResponsiveDashboard'

function Dashboard() {
  return (
    <ResponsiveDashboard>
      <ResponsiveWidget span={{ desktop: 2 }} priority="high">
        {/* Widget content */}
      </ResponsiveWidget>
    </ResponsiveDashboard>
  )
}
```

### BottomNavigation
Modern bottom navigation for mobile devices.

```tsx
import { BottomNavigation, useBottomNavigation } from '@/shared/components/BottomNavigation'
import { Home, Users, Settings } from 'lucide-react'

function App() {
  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'users', label: 'Users', icon: Users, badge: 5 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]
  
  const { activeItem, handleItemClick } = useBottomNavigation(items)
  
  return (
    <BottomNavigation
      items={items}
      activeItem={activeItem}
      onItemClick={handleItemClick}
    />
  )
}
```

## Gesture Support

### useSwipeGesture Hook
Comprehensive gesture detection for touch interactions.

```tsx
import { useSwipeGesture } from '@/shared/hooks/useSwipeGesture'

function GestureComponent() {
  const { addSwipeListeners } = useSwipeGesture({
    onSwipeLeft: () => console.log('Swiped left'),
    onSwipeRight: () => console.log('Swiped right'),
    threshold: 50
  })
  
  useEffect(() => {
    const element = ref.current
    if (element) {
      return addSwipeListeners(element)
    }
  }, [addSwipeListeners])
}
```

## Testing

### Unit Tests
```bash
# Run Jest tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Storybook
```bash
# Start Storybook development server
npm run storybook

# Build Storybook for production
npm run build-storybook
```

## ViewManager & Advanced Data Views

### ViewManager
Universal data visualization component supporting multiple view types with advanced features.

```tsx
import { ViewManager } from '@/shared/components/views'

function DataPage() {
  const [activeView, setActiveView] = useState('data-list')
  const [selectedItems, setSelectedItems] = useState([])
  
  return (
    <ViewManager
      title="My Data"
      data={data}
      columns={columns}
      views={views}
      activeView={activeView}
      onViewChange={setActiveView}
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
      showToolbar={true}
      showSearch={true}
      showFilters={true}
      onCreateClick={() => console.log('Create')}
      onEditClick={(item) => console.log('Edit', item)}
      onDeleteClick={(item) => console.log('Delete', item)}
    />
  )
}
```

### Kanban View
Project management style boards with drag & drop functionality.

```tsx
import { KanbanView } from '@/shared/components/views'

function ProjectBoard() {
  const kanbanColumns = [
    { id: 'todo', title: 'To Do', color: '#94a3b8' },
    { id: 'in_progress', title: 'In Progress', color: '#3b82f6' },
    { id: 'done', title: 'Done', color: '#10b981' }
  ]
  
  return (
    <KanbanView
      data={tasks}
      columns={kanbanColumns}
      groupByField="status"
      cardTitleField="title"
      cardDescriptionField="description"
      onMoveCard={handleMoveCard}
      enableQuickAdd={true}
      onQuickAdd={handleQuickAdd}
    />
  )
}
```

### Gantt Chart View
Timeline visualization for project scheduling and task management.

```tsx
import { GanttView } from '@/shared/components/views'

function ProjectTimeline() {
  return (
    <GanttView
      data={projects}
      idField="id"
      titleField="name"
      startDateField="start_date"
      endDateField="end_date"
      progressField="progress"
      viewMode="weeks"
      showProgress={true}
      allowResize={true}
      allowMove={true}
      onUpdateDates={handleDateUpdate}
      onUpdateProgress={handleProgressUpdate}
    />
  )
}
```

### Calendar View
Calendar-based data management with month/week views and drag & drop.

```tsx
import { CalendarView } from '@/shared/components/views'

function EventCalendar() {
  return (
    <CalendarView
      data={events}
      idField="id"
      titleField="title"
      dateField="event_date"
      descriptionField="description"
      view="month"
      showToday={true}
      allowDragDrop={true}
      enableQuickAdd={true}
      onDateChange={handleDateChange}
      onQuickAdd={handleQuickAdd}
    />
  )
}
```

## Project Structure

```
src/
├── shared/
│   ├── components/          # Reusable UI components
│   │   ├── views/          # Data visualization components
│   │   │   ├── ViewManager.tsx      # Universal data manager
│   │   │   ├── KanbanView.tsx       # Kanban board layout
│   │   │   ├── GanttView.tsx        # Timeline visualization
│   │   │   ├── CalendarView.tsx     # Calendar layout
│   │   │   └── index.ts            # View exports
│   │   ├── MobileSidebar.tsx
│   │   ├── MobileSearch.tsx
│   │   ├── MobileTable.tsx
│   │   ├── ResponsiveDashboard.tsx
│   │   └── BottomNavigation.tsx
│   ├── hooks/              # Custom React hooks
│   │   └── useSwipeGesture.ts
│   └── utils/              # Utility functions
├── app/                    # Next.js App Router pages
├── stories/               # Storybook stories
└── __tests__/             # Jest test files
```

## Advanced View Features

### 🎯 Multi-View Support
- **List View** - Traditional table with advanced sorting/filtering
- **Card View** - Grid-based layout for visual data presentation
- **Kanban Board** - Project management style columns with drag & drop
- **Gantt Chart** - Timeline visualization for project scheduling
- **Calendar View** - Calendar-based data management with quick add

### 🔧 Data Management
- **Smart Search** - Real-time search across all searchable columns
- **Advanced Filters** - Column-specific filters with custom options
- **Multi-Column Sorting** - Sort by multiple fields with visual indicators
- **Flexible Grouping** - Organize data by any field with visual grouping
- **Bulk Operations** - Select multiple items for batch operations

### 📊 Export & Import
- **Multiple Formats** - CSV, JSON, Excel export support
- **Selective Export** - Export selected items or entire dataset
- **Import Validation** - File format validation and error handling
- **Data Mapping** - Flexible field mapping for imports

## Mobile Optimization Features

- **Touch-First Design** - Optimized for mobile interactions
- **Gesture Navigation** - Swipe gestures for navigation
- **Responsive Breakpoints** - Mobile, tablet, desktop layouts
- **Performance Optimized** - Lazy loading and code splitting
- **Accessibility** - ARIA labels and keyboard navigation
- **PWA Ready** - Service worker and offline support
- **Advanced Views** - All view types work seamlessly on mobile devices

## Browser Support

- **Mobile**: iOS Safari 12+, Android Chrome 70+
- **Desktop**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Touch Support**: Required for gesture features
- **Voice Search**: Chrome-based browsers with Web Speech API

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## License

This project is licensed under the MIT License.
