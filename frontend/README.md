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

## Project Structure

```
src/
├── shared/
│   ├── components/          # Reusable UI components
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

## Mobile Optimization Features

- **Touch-First Design** - Optimized for mobile interactions
- **Gesture Navigation** - Swipe gestures for navigation
- **Responsive Breakpoints** - Mobile, tablet, desktop layouts
- **Performance Optimized** - Lazy loading and code splitting
- **Accessibility** - ARIA labels and keyboard navigation
- **PWA Ready** - Service worker and offline support

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
