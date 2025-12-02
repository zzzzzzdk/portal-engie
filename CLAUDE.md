# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Portal Engine 是一个基于 React 的仪表盘构建应用，允许用户通过拖放功能创建可自定义的小部件布局。应用提供 10 种小部件类型（时钟、统计、图表、链接、新闻、排行榜、搜索、数据表格、卡片网格、自定义表单），可以进行排列、配置和保存。

## 技术栈

- **框架**: React 18+ with TypeScript
- **构建工具**: Vite 5
- **UI 组件库**: Ant Design 6
- **状态管理**: Zustand (带 persist 中间件)
- **拖放布局**: React Grid Layout
- **图表库**: ECharts for React
- **路由**: React Router DOM v7
- **HTTP 客户端**: Axios
- **样式**: SCSS (modern compiler API)

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器和 Mock 后端（推荐）
npm start
# 同时运行 mock 服务器 (端口 3001) 和开发服务器 (端口 3000)

# 仅启动开发服务器
npm run dev

# 仅启动 mock 服务器
npm run mock

# 生产构建
npm run build

# 代码检查
npm run lint

# 预览生产构建
npm run preview

# TypeScript 类型检查
npx tsc --noEmit
```

## 架构概览

### Zustand 状态管理

应用使用单一 Zustand store ([src/store/useStore.ts](src/store/useStore.ts)) 管理：
- **widgets**: 小部件对象数组，包含布局和配置信息
- **isEditMode**: 控制拖放/调整大小功能的开关
- **isFullScreen**: 全屏模式状态

核心状态方法：
- `addWidget(type)`: 创建新小部件，自动生成 UUID 和定位
- `removeWidget(id)`: 根据 ID 删除小部件
- `updateWidget(id, updates)`: 部分更新小部件属性
- `updateLayout(layouts)`: 将 React Grid Layout 的变化同步到状态
- `saveDashboard()`: API 同步占位符（当前仅输出日志）
- `loadDashboard()`: API 获取占位符

**持久化**: `widgets` 数组通过 Zustand 的 persist 中间件自动持久化到 localStorage，存储键为 `portal-engine-storage`。

### 小部件系统

小部件通过 [src/components/Dashboard.tsx](src/components/Dashboard.tsx) 中的工厂模式渲染：
- 每个小部件都包装在 `WidgetWrapper` 中，提供编辑控件（设置、刷新、删除）
- 小部件类型决定渲染哪个组件（ClockWidget、StatsWidget 等）
- 所有小部件位于 [src/components/widgets/](src/components/widgets/)
- 每个小部件从小部件的 config 对象接收 `config` 属性

**添加新小部件类型**：
1. 在 [src/components/widgets/](src/components/widgets/) 创建小部件组件
2. 将类型添加到 [src/types/index.ts](src/types/index.ts) 的 `WidgetType` 联合类型
3. 在 [src/components/Dashboard.tsx](src/components/Dashboard.tsx) 的 `renderWidgetContent()` switch 中导入并添加 case
4. 在 [src/App.tsx](src/App.tsx) 的下拉菜单 items 中添加
5. 可选：在 [src/store/useStore.ts](src/store/useStore.ts) 的 `getDefaultConfig()` 中扩展默认配置

### React Grid Layout 集成

网格布局配置 ([src/components/Dashboard.tsx](src/components/Dashboard.tsx))：
- **cols**: 12 列
- **rowHeight**: 120px
- **margin**: [10, 10]
- **compactType**: null (不自动压缩)
- **preventCollision**: true
- **draggableHandle**: '.grid-drag-handle' (必须在 WidgetWrapper 中存在)

添加小部件时，`y: Infinity` 将其放置在底部以避免重叠。

### 预览模式和路由

应用有两个路由：
- `/` - 带头部和编辑控件的主仪表盘
- `/preview` - 无头部的干净视图，在新窗口打开

通过 `location.pathname === '/preview'` 检测预览模式并自动禁用编辑模式。

### Mock 服务器

基于 Express 的 mock 服务器位于 [mock/](mock/) 目录：
- **端口**: 3001
- **API 前缀**: `/api`
- **路由**: 在 [mock/routes/](mock/routes/) 中组织
  - `index.js` - 核心接口
  - `dataBoard.js` - 仪表盘数据
  - `home.js` - 首页数据
  - `system-settings.js` - 设置 CRUD

**Mock 服务器工具**：
- `req.json` - 预配置的响应对象，包含 `{code: 20000, status: 0, message: "ok"}`
- `req.sleep(seconds)` - 使用基于 Promise 的延迟模拟网络延迟
- 自动 CORS 处理和 token 刷新头

**Vite 代理配置**: 开发环境中所有 `/api/*` 请求都代理到 `http://localhost:3001` (见 [vite.config.ts](vite.config.ts))。

### 样式系统

- **全局样式**: [src/assets/css/](src/assets/css/)
- **自动导入**: 通过 Vite 配置将 `mixin.scss` 注入所有 SCSS 文件
- **现代 SCSS**: Vite 配置中使用 `api: 'modern-compiler'`
- **路径别名**: `@/` 映射到 `src/` 目录

### TypeScript 配置

- **路径别名**: `@/*` 解析为 `./src/*`
- **严格模式**: 未显式启用，项目使用 TypeScript 5+
- **主类型文件**: [src/types/index.ts](src/types/index.ts) 定义 Widget、WidgetConfig、AppState、FormField

## 关键实现模式

### 添加小部件配置

小部件配置存储在每个小部件的 `config` 对象中。添加可配置属性：
1. 在 [src/types/index.ts](src/types/index.ts) 中使用可选属性扩展 `WidgetConfig` 接口
2. 更新 [src/store/useStore.ts](src/store/useStore.ts) 的 `getDefaultConfig()` 以设置默认值
3. 使用 `updateWidget(id, {config: {...}})` 修改配置
4. 在小部件组件中通过 `config` 属性访问

### 全屏模式

由 `toggleFullScreen()` 操作触发：
- 为仪表盘容器添加 `.fullscreen` 类
- 显示固定位置的退出按钮覆盖层
- 可以在 CSS 中设置样式以隐藏/显示元素

### 编辑模式控件

编辑模式状态控制：
- React Grid Layout 的 `isDraggable` 和 `isResizable` 属性
- WidgetWrapper 的操作按钮可见性
- 头部"添加小部件"按钮的禁用状态
- 头部的开关切换

## 开发规范

- **文件命名**: 组件使用 PascalCase（如 `ClockWidget.tsx`）
- **组件结构**: 使用 TypeScript 的函数组件
- **状态更新**: 始终使用 Zustand actions，永远不要直接修改状态
- **小部件布局**: React Grid Layout 处理位置，使用小部件的 `layout` 属性
- **持久化**: Zustand persist 中间件自动保存，`saveDashboard()` 用于未来的 API 集成
- **Mock 延迟**: 使用 `await req.sleep(0.3)` 模拟真实网络条件（300ms）

## 重要说明

- 应用在初始加载时默认为编辑模式，便于设置
- 小部件 ID 是使用 `uuid` 包生成的 UUID
- 布局更改通过 `onLayoutChange` 回调立即反映到状态中
- 预览模式在打开新窗口前自动保存仪表盘
- 还有一个 GEMINI.md 文件包含更详细的中文文档 - 如需额外上下文可参考
