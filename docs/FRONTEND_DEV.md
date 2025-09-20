# Frontend Development Guide

This guide covers frontend development, testing, Storybook, and deployment for the FastNext framework.

## Prerequisites

- Node.js 18+
- npm or yarn
- Git

## Development Environment Setup

### 1. Initial Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Environment Configuration

Create a `.env.local` file for local development:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=FastNext
NEXT_PUBLIC_VERSION=1.0.0
```

## Development Workflow

### Running the Development Server

```bash
# Start with Turbopack (faster builds)
npm run dev

# Standard development server
npm run dev -- --no-turbopack

# Application will be available at:
# http://localhost:3000
```

### Available Scripts

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server

# Code Quality
npm run lint               # Run ESLint
npm run biome              # Run Biome linter
npm run biome:fix          # Fix Biome issues automatically

# Testing
npm run test               # Run Jest tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report

# Storybook
npm run storybook          # Start Storybook development server
npm run build-storybook    # Build Storybook for production
```

## Project Structure

```
frontend/src/
├── app/                   # Next.js App Router
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   ├── globals.css       # Global styles
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── dashboard/        # Dashboard pages
│   ├── settings/         # Settings pages
│   ├── admin/            # Admin pages
│   ├── projects/         # Projects pages
│   └── builder/          # Visual builder
├── components/           # React components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── layout/          # Layout components
│   ├── auth/            # Authentication components
│   ├── builder/         # Visual builder components
│   ├── profile/         # Profile components
│   └── security/        # Security components
├── contexts/            # React contexts
├── hooks/               # Custom hooks
├── lib/                 # Utilities and configurations
├── types/               # TypeScript type definitions
└── stories/             # Storybook stories
```

## Component Development

### Creating New Components

1. **Use shadcn/ui for base components:**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
```

2. **Create custom components:**
```typescript
// components/example/ExampleComponent.tsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ExampleComponentProps {
  title: string
  onClick?: () => void
}

export function ExampleComponent({ title, onClick }: ExampleComponentProps) {
  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Button onClick={onClick}>Click me</Button>
    </Card>
  )
}
```

3. **Export from index file:**
```typescript
// components/example/index.ts
export { ExampleComponent } from './ExampleComponent'
export type { ExampleComponentProps } from './ExampleComponent'
```

### Styling Guidelines

- Use **Tailwind CSS** for styling
- Follow the existing design system
- Use CSS variables for theming
- Leverage **shadcn/ui** components
- Use **class-variance-authority** for component variants

```typescript
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

## State Management

### React Query for Server State

```typescript
// hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
```

### Context for Client State

```typescript
// contexts/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
```

## Testing

### Test Setup

Tests use **Jest** and **React Testing Library**:

```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Testing Guidelines

- Test user interactions, not implementation details
- Use React Testing Library queries in order of preference:
  1. `getByRole`
  2. `getByLabelText`
  3. `getByPlaceholderText`
  4. `getByText`
  5. `getByTestId` (last resort)
- Mock API calls using MSW or jest.mock
- Test accessibility features

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test Button.test.tsx
```

## Storybook

### Storybook Development

Storybook is used for component documentation and development in isolation.

```bash
# Start Storybook
npm run storybook

# Storybook will be available at:
# http://localhost:6006
```

### Writing Stories

```typescript
// stories/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Button',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
}
```

### Storybook Addons

Configured addons:
- **@storybook/addon-docs** - Auto-generated documentation
- **@storybook/addon-a11y** - Accessibility testing
- **@chromatic-com/storybook** - Visual regression testing

## Production Deployment

### Build and Optimization

```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Analyze bundle size
npm run build -- --analyze
```

### Environment Variables

```bash
# Production environment variables
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_NAME=FastNext
NODE_ENV=production
```

### Deployment Options

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Docker
```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Static Export
```bash
# Add to next.config.ts
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

# Build static site
npm run build
```

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports for large components
import dynamic from 'next/dynamic'

const DynamicComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
})
```

### Image Optimization

```typescript
import Image from 'next/image'

function ProfileImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={200}
      height={200}
      priority={false}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  )
}
```

### Bundle Analysis

```bash
# Analyze bundle size
ANALYZE=true npm run build

# Use webpack-bundle-analyzer
npm install --save-dev @next/bundle-analyzer
```

## Accessibility

### Guidelines

- Use semantic HTML elements
- Provide proper ARIA labels
- Ensure keyboard navigation
- Maintain color contrast ratios
- Test with screen readers

### Testing Accessibility

```bash
# Run Storybook with a11y addon
npm run storybook

# Use axe-core in tests
npm install --save-dev @axe-core/react
```

## Common Issues and Solutions

### TypeScript Errors
```bash
# Check TypeScript errors
npx tsc --noEmit

# Fix common issues with strict mode
```

### Styling Issues
```bash
# Rebuild Tailwind CSS
rm -rf .next
npm run dev

# Check Tailwind config
npx tailwindcss -i ./src/app/globals.css -o ./output.css --watch
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Follow the component naming conventions
2. Write tests for new components
3. Document components in Storybook
4. Follow accessibility guidelines
5. Use TypeScript strict mode
6. Follow the existing code style

### Code Style Guidelines

- Use TypeScript strict mode
- Prefer function components over class components
- Use custom hooks for logic reuse
- Keep components small and focused
- Use proper TypeScript types
- Follow React best practices

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Storybook Documentation](https://storybook.js.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)