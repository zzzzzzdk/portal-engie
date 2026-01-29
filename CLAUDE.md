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

### State Management - Multi-Store Pattern

**Three separate Zustand stores** for different concerns:

1. **useStore** (`src/store/useStore.ts`) - Dashboard & Widget state
   - Widget management: `widgets` array with layout and config
   - FloatingModule management: `floatingModules` array
   - Edit mode, fullscreen mode
   - Persisted to localStorage (key: `portal-engine-storage`)
   - Auth state synchronized with cookies

2. **useSystemStore** (`src/store/useSystemStore.ts`) - System state
   - User info, system config, initialization status
   - Water mark configuration from system settings
   - Route permissions in `userInfo.route` array

3. **useConfigStore** (`src/store/useConfigStore.ts`) - Theme & Config state
   - Theme mode (light/dark) and preset management
   - Base colors and semantic tokens
   - Sidebar collapsed state
   - Locale settings
   - Persisted to localStorage (keys: `themeMode`, `themePreset`, `locale`)

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

## Dashboard Grid Systems

The project supports **two grid layout implementations** for the dashboard:

### 1. React Grid Layout (Original - `src/pages/Dashboard/`)

**URL**: `/dashboard`

The original implementation using `react-grid-layout`:

**Features**:
- React-native drag & drop
- 12-column responsive grid
- Row height: 120px, margin: 10px
- Edit/preview mode toggle
- Drag handle: `.grid-drag-handle`
- No auto-compacting (`compactType: null`)
- Collision prevention

**File structure**:
```
src/pages/Dashboard/
├── index.tsx          # Main Dashboard component
└── index.scss         # Styles
```

**Grid configuration**:
```typescript
<ResponsiveReactGridLayout
  cols={12}
  rowHeight={120}
  margin={[10, 10]}
  compactType={null}
  preventCollision={true}
  isDraggable={isEditMode}
  isResizable={isEditMode}
  draggableHandle=".grid-drag-handle"
  onLayoutChange={onLayoutChange}
/>
```

### 2. GridStack.js (New - `src/pages/DashboardGridStack/`)

**URL**: `/dashboard-gridstack`

New implementation using `gridstack.js` v12.3.3:

**Features**:
- Framework-neutral TypeScript library
- All features from react-grid-layout
- **Additional capabilities**:
  - Nested grids support
  - Better TypeScript support
  - No external dependencies

**File structure**:
```
src/pages/DashboardGridStack/
├── index.tsx          # GridStack Dashboard component
└── index.scss         # Styles with gridstack overrides
```

**Grid configuration**:
```typescript
GridStack.init({
  column: 12,
  cellHeight: 120,
  margin: 10,
  float: false,  // Equivalent to compactType: null
  draggable: { handle: '.grid-drag-handle' },
  resizable: { handles: 'se' },
  animate: true,
}, gridRef.current);
```

**React integration pattern**:
```typescript
// 1. Use useRef to manage GridStack instance
const gridRef = useRef<HTMLDivElement>(null);
const gridInstanceRef = useRef<GridStack | null>(null);

// 2. Initialize in useEffect
useEffect(() => {
  gridInstanceRef.current = GridStack.init(options, gridRef.current);

  // Listen to layout changes
  gridInstanceRef.current.on('change', (event, items) => {
    updateLayout(items);
  });

  return () => gridInstanceRef.current?.destroy();
}, []);

// 3. Sync edit mode
useEffect(() => {
  gridInstanceRef.current?.enable/disable(isEditMode);
}, [isEditMode]);

// 4. Render widgets using React Portal
widgets.forEach(widget => {
  const el = createWidgetElement(widget);
  gridInstanceRef.current?.addWidget(el);

  // Use createRoot to render React components
  const root = createRoot(el.querySelector('.grid-stack-item-content'));
  root.render(<WidgetWrapper widget={widget}>...</WidgetWrapper>);
});
```

**Key differences from react-grid-layout**:

| Aspect | react-grid-layout | gridstack.js |
|--------|-------------------|--------------|
| Framework | React-specific | Framework-neutral |
| TypeScript | Partial support | Full TypeScript |
| Nested grids | ❌ | ✅ |
| DOM management | React virtual DOM | Direct DOM |
| React integration | Native components | Portal + createRoot |
| Dependencies | Multiple | Zero external deps |

**When to use which**:
- **React Grid Layout**: Simpler React integration, more React-like
- **GridStack.js**: Need nested grids, better TypeScript, framework-neutral

**Shared components**:
Both implementations share:
- `WidgetWrapper` - Widget container with controls
- All widget components (`ClockWidget`, `StatsWidget`, etc.)
- `useStore` - Zustand state management
- `FloatingModule` - Independent of grid layout
- Layout data structure (`Widget` type with `layout` property)

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

## FloatingModule System

**Draggable floating windows** supporting micro-apps and local components.

### Key Features

- Drag & drop positioning with **RAF optimization** for smooth performance
- Resizable windows (react-resizable)
- Expand/collapse with smart position calculation
- Two content types:
  - **MicroApp**: Embedded micro-frontends via Wujie
  - **LocalComponent**: Built-in components (chat, notifications)
- Theme support (auto/light/dark)
- Persistent position/size storage

### Performance Optimization Pattern - CRITICAL

FloatingModule uses **requestAnimationFrame (RAF)** to optimize drag performance:

```typescript
const handleDrag = useCallback((_e: any, data: any) => {
  // Cache position in ref to avoid frequent state updates
  pendingPositionRef.current = { x: data.x, y: data.y };

  // Cancel previous RAF
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current);
  }

  // Batch updates using RAF
  rafRef.current = requestAnimationFrame(() => {
    if (pendingPositionRef.current) {
      setPosition(pendingPositionRef.current);
    }
  });
}, []);
```

**Why this matters**:
- Prevents UI lag during fast mouse movements
- Reduces render count by ~80%
- Syncs updates with browser refresh rate (60fps)
- Uses controlled position mode (`position` prop) instead of `defaultPosition`

### Adding FloatingModule

```typescript
const { addFloatingModuleLocal, addFloatingModuleMicroApp } = useStore();

// Add local component
addFloatingModuleLocal('chat', '在线客服', { /* props */ }, { /* config */ });

// Add micro-app
addFloatingModuleMicroApp('systemId', 'moduleId', { url, entry }, { /* config */ });
```

### Smart Expand Position

When expanding from collapsed state, position is calculated based on screen region:
- **Bottom-right**: Expands toward top-left
- **Bottom-left**: Expands toward top-right
- **Top-right**: Expands toward bottom-left
- **Top-left**: Expands toward bottom-right (default)

This ensures the expanded window stays within viewport bounds.

## Micro-App Integration (Wujie)

**Micro-frontend architecture** using [Wujie](https://wujie-micro.github.io/doc/) for module isolation.

### Architecture Pattern

```typescript
// Widget mode: Embedded in dashboard grid
<MicroAppWidget config={{
  systemId: 'system-id',
  moduleId: 'module-id',
  microAppUrl: 'http://localhost:3001',
  microAppEntry: 'http://localhost:3001/index.html',
  mode: 'widget'  // Embedded mode
}} />

// Global mode: Full container takeover
<MicroAppWidget config={{
  mode: 'global',  // Renders in GlobalMicroAppContainer
  alive: true      // Keep alive when navigating
}} />
```

### Configuration Loading

Micro-app configs are loaded from `public/config/micro-apps.json`:

```typescript
// Centralized config loader
import { microAppConfigLoader } from '@/utils/microAppConfig';

const module = await microAppConfigLoader.getModule('systemId', 'moduleId');
// Returns: { id, name, url, entry, icon, description, ... }
```

### Lifecycle Hooks

File: `src/components/widgets/MicroAppWidget/lifecycles.ts`

```typescript
export default {
  beforeLoad: (appWindow: Window) => {
    console.log('Before load');
  },
  afterMount: (appWindow: Window) => {
    console.log('Mounted, close loading');
  },
  activated: (appWindow: Window) => {
    console.log('Activated from keep-alive');
  },
  loadError: (url: string, e: Error) => {
    console.error('Load failed:', url, e);
  }
};
```

### Communication Pattern

```typescript
import { bus } from 'wujie-react';

// Main app → Sub app
bus.$emit('subApp:setToken', getToken());

// Sub app → Main app
bus.$on('mainApp:navigate', (path) => {
  navigate(path);
});
```

### Degradation Mode

Automatically degrades to iframe mode when:
- `localStorage.getItem('degrade') === 'true'`
- Browser lacks `Proxy` or `CustomElementRegistry` support

### MicroAppMarket Component

**Modal UI** for browsing and selecting micro-apps from the catalog:

```typescript
import MicroAppMarket from '@/components/MicroAppMarket';

<MicroAppMarket
  open={isOpen}
  onClose={handleClose}
  mode="widget"  // 'widget' | 'floating' | 'global'
  onSelectModule={(systemId, moduleId, module) => {
    // Add selected module to dashboard
    addMicroAppWidget(systemId, moduleId, module);
  }}
/>
```

**Features**:
- Groups systems by category
- Displays module cards with name, icon, description
- Supports three modes: widget (grid), floating (window), global (full-screen)
- Loads from `public/config/micro-apps.json`

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

### GridStack.js 迁移项目（已封存）

⚠️ **状态**：实验性项目已放弃 - 难度过大，于 2025-12-05 封存

曾尝试将 react-grid-layout 迁移到 GridStack.js，但由于集成复杂度超出预期而中止。

**已完成的功能**：
- GridStack 基础初始化和 widget 渲染
- React 18 createRoot 集成
- DOM 生命周期管理

**未完成的功能**：
- 拖拽/调整大小功能
- 与 Zustand 的状态同步
- 添加/删除 widgets
- 编辑/预览模式切换
- 所有交互功能

**封存原因**：
- GridStack 的命令式 API 与 React 声明式模型冲突
- 状态同步复杂度高（可能出现循环更新）
- 时间成本超过收益
- react-grid-layout 已满足所有需求

**推荐方案**：**继续使用 react-grid-layout** 实现 Dashboard。

**参考文件**（仅供未来调研）：
- `src/pages/DashboardGridStack/` - 封存的实验性代码
- `GRIDSTACK_MIGRATION_ARCHIVE.md` - 详细的开发日志和技术分析
- `demo/react-hooks.html` - GridStack React 集成示例

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

## ConfigDialog Pattern

**Unified configuration dialog** for both widgets and floating modules.

### Usage

```typescript
import ConfigDialog from '@/components/ConfigDialog';

<ConfigDialog
  isOpen={isConfigOpen}
  onClose={handleClose}
  widget={widget}  // Widget or FloatingModule data
/>
```

### How it Works

1. Detects widget type automatically (`widget.type === 'floating-module'`)
2. Renders appropriate configuration form
3. Updates store on save (`updateWidget` or `updateFloatingModuleConfig`)
4. Validates inputs before saving

### Adding Custom Config Fields

When adding new widget types, add config fields in ConfigDialog:

```typescript
// In ConfigDialog/index.tsx
{widgetType === 'your-widget' && (
  <Form.Item label="Custom Field" name="customField">
    <Input />
  </Form.Item>
)}
```

### Color Fields Default Value - CRITICAL

**All color configuration fields in ConfigDialog MUST have default values** when initializing the form. This ensures:
- ColorPicker displays a meaningful initial color
- Users see what the default appearance will be
- Form validation works correctly

```typescript
// ✅ CORRECT - Always provide default value for color fields
form.setFieldsValue({
  titleColor: normalizeColorValue(widget.config.titleColor, '#222222'),
  backgroundColor: normalizeColorValue(widget.config.backgroundColor, '#FFFFFF'),
  collapsedBgColor: normalizeColorValue(widget.config.collapsedBgColor, '#1677ff'),
});

// ❌ WRONG - Missing default value
form.setFieldsValue({
  titleColor: normalizeColorValue(widget.config.titleColor),  // No default!
});
```

**Common default colors**:
- Title/text color: `#222222`
- Background color: `#FFFFFF`
- Primary/accent color: `#1677ff` (Ant Design blue)
- Tag background: `#FFFFFF`
- Tag text: `#222222`

## Performance Patterns

### RAF (RequestAnimationFrame) Optimization

Use RAF for high-frequency updates (drag, scroll, resize):

```typescript
const rafRef = useRef<number | null>(null);
const pendingDataRef = useRef<T | null>(null);

const handleHighFrequencyEvent = (data: T) => {
  pendingDataRef.current = data;

  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current);
  }

  rafRef.current = requestAnimationFrame(() => {
    if (pendingDataRef.current) {
      setState(pendingDataRef.current);
    }
  });
};

// Cleanup
useEffect(() => {
  return () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  };
}, []);
```

**When to use RAF**:
- ✅ Drag & drop position updates
- ✅ Scroll position tracking
- ✅ Mouse move events
- ✅ Resize events
- ❌ User input (typing)
- ❌ Click events

### useMemo for Expensive Calculations

```typescript
// Good: Cache expensive calculations
const complexData = useMemo(() => {
  return expensiveOperation(props.data);
}, [props.data]);

// Good: Cache derived styles
const moduleStyle = useMemo(() => ({
  width: isExpanded ? size.width : collapsedWidth,
  height: isExpanded ? size.height : collapsedHeight,
  zIndex: config.zIndex || 9999,
}), [isExpanded, size, config]);
```

### useCallback for Event Handlers

```typescript
// Good: Prevent recreation of drag handlers
const handleDrag = useCallback((_e: any, data: any) => {
  // Handler logic
}, [dependencies]);

// Good: Prevent unnecessary child re-renders
const handleClick = useCallback(() => {
  doSomething();
}, []);
```

## Development Workflow

1. **New feature**: Check if widget-based, floating-module, or system-level
2. **Widget feature**: Update widget component + config type + ConfigDialog
3. **FloatingModule local component**:
   - Create component in `src/components/FloatingModule/components/`
   - Register in `LocalComponentRegistry`
   - Add type to `LocalComponentType`
4. **System feature**: Update appropriate store (useStore vs useSystemStore vs useConfigStore)
5. **New route**: Add to `router.config.tsx`, handle permissions
6. **New API**: Add mock endpoint in `./mock/routes/`
7. **Styling**: Use SCSS with `@` alias for imports
8. **Performance-critical features**: Consider RAF optimization for high-frequency events

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
