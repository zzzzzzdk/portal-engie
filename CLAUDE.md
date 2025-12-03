# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Portal Engine is an enterprise-grade dashboard application built with React + TypeScript + Vite. Users can create personalized data display panels through drag-and-drop configuration with a 12-column responsive grid system. **This project runs in an intranet environment without internet access**.

## Development Commands

```bash
# Install dependencies
npm install

# Start both dev server (port 3000) and mock API server (port 4001)
npm start

# Start only dev server
npm run dev

# Start only mock server
npm run mock

# Production build (runs TypeScript check first)
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# TypeScript type check (no build)
npx tsc --noEmit
```

## Critical Architecture Patterns

### Application Initialization Flow

The app uses a **multi-layer initialization architecture** (App.tsx → Router → Layout → Pages):

1. **App.tsx (Root Container)**
   - Provides `<HashRouter>` wrapper (DO NOT nest Router components elsewhere)
   - Contains two critical wrapper components:
     - **LoginGuard**: Checks cookie token, redirects to `/login` if missing
     - **AppInitializer**: Handles system initialization and dashboard data loading
   - **Shows loading screen** until system is initialized
   - Initializes dashboard data (`loadDashboard()`, `setEditMode(true)`)

2. **Router Layer** (`src/router/`)
   - **Dynamic routing**: Routes defined in `router.config.tsx`, rendered by `index.tsx`
   - **Lazy loading**: All components loaded with `React.lazy()` and `<Suspense>`
   - Route hierarchy:
     ```
     /login (public)
     / → Layout (authenticated container)
       └── /dashboard (requires permission)
     /404, /403 (error pages)
     * (catch-all → redirects to /404)
     ```

3. **Layout Component** (`src/components/Layout/`)
   - Page structure: Header with logo, toolbar, user controls
   - Widget operations: add widget dropdown, save, fullscreen, logout
   - Uses `<Outlet />` to render child routes

### Authentication Flow - CRITICAL PATTERN

**Cookie-based authentication** with token named `YSTOKEN`:

```typescript
// ALWAYS check cookie FIRST, then state
const token = getToken()  // from cookie
if (!token && !isLogin) return false

// This prevents race conditions where cookie is set but state isn't updated yet
```

**Why this matters**:
- Cookie is set immediately on login
- Zustand state may update with a slight delay
- Checking cookie first prevents false negatives

**Token storage locations**:
1. Cookie (via `js-cookie`) - SOURCE OF TRUTH
2. Zustand state (`isAuthenticated`, `isLogin`) - derived state

### State Management - Dual Store Pattern

**Two separate Zustand stores**:

1. **useStore** (`src/store/useStore.ts`) - Dashboard state
   - Widget management: `widgets` array with layout and config
   - Edit mode, fullscreen mode
   - Persisted to localStorage (key: `portal-engine-storage`)
   - Auth state synchronized with cookies

2. **useSystemStore** (`src/store/useSystemStore.ts`) - System state
   - User info, system config, initialization status
   - Water mark configuration from system settings
   - Route permissions in `userInfo.route` array

### Router Permission Checking

**Priority order** (see `src/router/index.tsx`):

```typescript
const hasPermission = (route: RouteConfig): boolean => {
  // 1. Public routes (login, 404, 403)
  if (!route.meta?.requiresAuth) return true

  // 2. Check cookie token FIRST (avoid state delay)
  const token = getToken()
  if (!token && !isLogin) return false

  // 3. Check route permissions
  const hasRoutePermission = userRoutes?.includes(routePath) ?? false
  return hasRoutePermission
}
```

## Widget System

### Widget Lifecycle

1. User selects widget type from dropdown
2. `addWidget(type)` creates widget with UUID
3. Widget positioned at bottom (`y: Infinity`)
4. Layout sanitized to ensure valid numeric values
5. Rendered via `WidgetWrapper` with error boundary
6. Changes auto-saved to localStorage

### Widget Configuration

Each widget has a `config` object:
```typescript
{
  title: string
  showTitle: boolean  // false = full-content mode
  refreshInterval: number
}
```

**showTitle: false** enables full-content display:
- Edit mode: shows semi-transparent drag handle
- Preview mode: completely hides header

### Adding New Widget Type

1. Create component in `src/components/widgets/`
2. Add type to `WidgetType` union in `src/types/index.ts`
3. Import and add case in `Dashboard.tsx` `renderWidgetContent()`
4. Add to dropdown items in `Layout/index.tsx`
5. (Optional) Add defaults in `store/useStore.ts` `getDefaultConfig()`

## Offline Environment Requirements

**No external resources allowed**:
- ❌ External CDN links
- ❌ External image URLs (e.g., avatar APIs)
- ❌ External background images
- ✅ CSS gradients for backgrounds
- ✅ HSL color-based letter avatars
- ✅ Console.log instead of external link navigation

Example offline-friendly avatar:
```typescript
<Avatar style={{ backgroundColor: `hsl(${index * 60}, 70%, 60%)` }}>
  {item.title.charAt(0)}
</Avatar>
```

## React Grid Layout Integration

Grid configuration in Dashboard:
```typescript
{
  cols: 12,
  rowHeight: 120,
  margin: [10, 10],
  compactType: null,  // no auto-compacting
  preventCollision: true,
  draggableHandle: '.grid-drag-handle'
}
```

**Layout sanitization** (critical to prevent NaN errors):
```typescript
const sanitizeLayoutValue = (value: any, defaultValue: number, minValue?: number): number => {
  const num = typeof value === 'number' && !isNaN(value) ? value : defaultValue
  return minValue !== undefined ? Math.max(num, minValue) : num
}
```

## API Layer

### Axios Configuration

File: `src/utils/axios.config.ts`

**Base URL determination**:
- Development: Vite proxy → `http://localhost:4001`
- Production: Reads from `window.__APP_CONFIG__`

**Token injection**:
```typescript
axios.defaults.headers.common['Authorization'] = getToken() ?? ""
```

### Mock Server

Location: `./mock/` directory
- **Port**: 4001
- **Login endpoint**: `/login` (sets YSTOKEN cookie)
- **Hot reload**: Uses nodemon

Example endpoint:
```javascript
router.get('/api/data', async (req, res) => {
  await req.sleep(0.3)  // Simulate network delay
  req.json.data = { /* your data */ }
  res.json(req.json)
})
```

## TypeScript Patterns

### Global Type Extensions

File: `src/vite-env.d.ts`
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    YISACONF?: any
    cancelTokens?: any[]
    __APP_CONFIG__?: any
  }
}
```

### Route Configuration Type

```typescript
export interface RouteConfig {
  path?: string
  index?: boolean
  redirect?: string
  element?: () => Promise<{ default: React.ComponentType<any> }>
  children?: RouteConfig[]
  meta?: {
    requiresAuth?: boolean
    title?: string
  }
}
```

## Common Patterns

### File Naming Conventions
- Components: PascalCase (`ClockWidget.tsx`, `Layout/index.tsx`)
- Utilities: camelCase (`cookie.ts`, `axios.config.ts`)
- Styles: Match component (`Layout/index.scss`)

### Unused Props Pattern
Prefix with `_` to indicate intentionally unused:
```typescript
const Widget = ({ config: _config }) => { /* ... */ }
```

### Component Structure
```typescript
// Props interface
interface ComponentProps {
  prop: string
}

// Component
const Component: React.FC<ComponentProps> = ({ prop }) => {
  return <div>{prop}</div>
}

// Default export at bottom
export default Component
```

## Error Handling

**Two-level error boundary system**:
1. **Global**: `ErrorBoundary.tsx` - catches app-wide errors
2. **Widget**: `WidgetErrorBoundary.tsx` - isolates widget failures

Widget errors don't crash the entire dashboard.

## Router Anti-Patterns

❌ **DON'T**: Nest Router components
```typescript
// WRONG - App.tsx already has <HashRouter>
function MyComponent() {
  return <HashRouter>...</HashRouter>
}
```

❌ **DON'T**: Check only state for auth
```typescript
// WRONG - state may lag behind cookie
if (!isLogin) return false
```

✅ **DO**: Check cookie first, then state
```typescript
// CORRECT - cookie is source of truth
const token = getToken()
if (!token && !isLogin) return false
```

## Development Workflow

1. **New feature**: Check if widget-based or system-level
2. **Widget feature**: Update widget component + config type
3. **System feature**: Update appropriate store (useStore vs useSystemStore)
4. **New route**: Add to `router.config.tsx`, handle permissions
5. **New API**: Add mock endpoint in `./mock/routes/`
6. **Styling**: Use SCSS with `@` alias for imports

## Path Alias Configuration

Vite sets `@` → `src/`:
```typescript
import { Component } from '@/components/Component'
import { useStore } from '@/store/useStore'
```

SCSS also supports `@`:
```scss
@use "@/assets/css/mixin.scss" as *;
```

## Build Process

1. TypeScript check: `tsc` (must pass before build)
2. Vite build: Bundles and optimizes
3. Output: `dist/` directory (static files)
4. Deployment: Hash routing for static hosting compatibility
