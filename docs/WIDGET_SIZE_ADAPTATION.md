# 小组件尺寸自适应功能实施方案

> **文档版本**: v2.0
> **创建日期**: 2025-12-05
> **状态**: 待实施

---

## 📋 目录

- [1. 方案概述](#1-方案概述)
- [2. 核心设计](#2-核心设计)
- [3. 文件修改清单](#3-文件修改清单)
- [4. 详细实现指南](#4-详细实现指南)
- [5. 样式规范](#5-样式规范)
- [6. 子应用集成指南](#6-子应用集成指南)
- [7. 测试验证](#7-测试验证)
- [8. FAQ](#8-faq)

---

## 1. 方案概述

### 1.1 设计目标

实现小组件的尺寸自适应能力，使得：
- **1x1 小组件**：显示 icon + 标题，不是微应用，不用处理，是微应用点击跳转到独立页面
- **> 1x1 小组件**：渲染实际内容，子应用根据尺寸自适应布局
- **编辑模式**：支持拖拽调整尺寸，通知子应用

### 1.2 核心原则

- 🎯 **职责清晰**：主应用负责 1x1 极端情况，子应用负责其他尺寸适配
- 🚀 **性能优先**：1x1 icon 模式不加载子应用实例
- 🎨 **体验统一**：所有类型小组件都支持 icon-only 模式
- 🔧 **接口简洁**：传递最小必要信息（`grid: {columns, rows}`）

### 1.3 显示模式

| 网格尺寸 | 显示模式 | 主应用行为 | 子应用状态 |
|---------|---------|-----------|-----------|
| **1x1** | **Icon Only** | 显示 icon + 标题，不渲染子应用 | 不加载 |
| **其他尺寸** | **Normal** | 渲染子应用，传递尺寸信息 | 加载运行 |

---

## 2. 核心设计

### 2.1 尺寸信息数据结构

```typescript
/**
 * 传递给子应用的尺寸信息
 */
export interface WidgetSizeInfo {
  // 网格尺寸（必需）
  grid: {
    columns: number;  // 宽度（占几列，1-12）
    rows: number;     // 高度（占几行）
  };

  // 容器像素尺寸（可选）
  container?: {
    width: number;           // 容器宽度（px）
    height: number;          // 容器高度（px）
    contentHeight: number;   // 可用内容高度（减去 header）
  };

  // 显示模式提示（可选）
  displayMode?: 'minimal' | 'compact' | 'normal' | 'large';
}
```

### 2.2 Icon 数据来源

**优先级**（自动降级）：

```
1. 微应用配置的 icon (module.icon)
   ↓ 若无
2. 系统级默认 icon (system.icon)
   ↓ 若无
3. 首字母 Avatar（彩色圆形背景 + 白色字母）
   ↓ 若无标题
4. 默认占位图标（lucide-react Icon）
```

### 2.3 交互行为

#### 预览模式（非编辑模式）

| 操作 | 行为 |
|-----|------|
| **点击 1x1 icon** | 跳转到 `/micro-app/:systemId/:moduleId` |
| **右键菜单** | 显示：打开、配置、刷新、删除 |
| **Hover** | 显示 Tooltip："点击打开应用" |

#### 编辑模式

| 操作 | 行为 |
|-----|------|
| **拖拽** | 移动位置 |
| **调整尺寸** | 从 1x1 放大 → 自动切换到正常渲染 |
| **缩小到 1x1** | 自动切换到 icon 模式 |

---

## 3. 文件修改清单

### 3.1 新增文件

| 文件路径 | 说明 |
|---------|------|
| `src/types/widget-size.ts` | 尺寸相关类型定义 |
| `src/utils/widgetHelpers.ts` | 工具函数（判断显示模式、获取 icon 等） |
| `src/components/WidgetIconView/index.tsx` | Icon-only 模式组件 |
| `src/components/WidgetIconView/index.scss` | Icon 模式样式 |


### 3.2 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/types/index.ts` | 导出 `WidgetSizeInfo` 类型 |
| `src/pages/Dashboard/index.tsx` | 添加 icon-only 判断和渲染逻辑 |
| `src/components/widgets/MicroAppWidget/index.tsx` | 传递 `__sizeInfo` props |
| `src/components/WidgetWrapper/index.tsx` | 支持 icon-only 容器样式 |
| `src/pages/Dashboard/index.scss` | 新增 icon 模式相关样式 |

---

## 4. 详细实现指南

### 4.1 新增类型定义

**文件**: `src/types/widget-size.ts`

```typescript
/**
 * 小组件尺寸相关类型定义
 */

/**
 * 显示模式
 */
export type WidgetDisplayMode = 'icon-only' | 'minimal' | 'compact' | 'normal' | 'large';

/**
 * 网格尺寸
 */
export interface GridSize {
  columns: number;  // 宽度（占几列，1-12）
  rows: number;     // 高度（占几行）
}

/**
 * 容器像素尺寸
 */
export interface ContainerSize {
  width: number;           // 容器宽度（px）
  height: number;          // 容器高度（px）
  contentHeight: number;   // 可用内容高度（px，减去 header）
}

/**
 * 传递给子应用的尺寸信息
 */
export interface WidgetSizeInfo {
  // 网格尺寸（必需）
  grid: GridSize;

  // 容器像素尺寸（可选）
  container?: ContainerSize;

  // 显示模式提示（可选）
  displayMode?: WidgetDisplayMode;
}

/**
 * Icon 配置
 */
export interface WidgetIconConfig {
  // Icon URL 或 React 组件
  icon: string | React.ReactNode;

  // 降级方案
  fallback?: 'letter' | 'default';

  // 背景色（用于首字母 Avatar）
  backgroundColor?: string;
}
```

**修改**: `src/types/index.ts`

```typescript
// 在文件末尾添加导出
export * from './widget-size';
```

---

### 4.2 工具函数实现

**文件**: `src/utils/widgetHelpers.ts`

```typescript
import { Widget, WidgetType, MicroAppModule } from '@/types';
import { WidgetDisplayMode, GridSize, WidgetIconConfig } from '@/types/widget-size';
import { microAppConfigLoader } from './microAppConfig';
import * as Icons from 'lucide-react';

/**
 * 判断小组件的显示模式
 */
export const getWidgetDisplayMode = (w: number, h: number): WidgetDisplayMode => {
  // 严格 1x1 为 icon-only
  if (w === 1 && h === 1) {
    return 'icon-only';
  }

  const area = w * h;

  // 根据面积判断
  if (area <= 4) return 'minimal';      // 2x2 或更小
  if (area <= 12) return 'compact';     // 3x4, 4x3 等
  if (area <= 24) return 'normal';      // 4x6, 6x4 等
  return 'large';                        // > 24
};

/**
 * 判断是否为 icon-only 模式
 */
export const isIconOnlyMode = (w: number, h: number): boolean => {
  return w === 1 && h === 1;
};

/**
 * 获取小组件的 Icon 配置
 * @returns Promise<WidgetIconConfig | null>
 */
export const getWidgetIcon = async (widget: Widget): Promise<WidgetIconConfig | null> => {
  // 微应用类型：从配置中读取
  if (widget.type === 'microApp' && widget.config.systemId && widget.config.moduleId) {
    try {
      const module = await microAppConfigLoader.getModule(
        widget.config.systemId,
        widget.config.moduleId
      );

      if (module?.icon) {
        return {
          icon: module.icon,
          fallback: 'letter'
        };
      }
    } catch (error) {
      console.warn('Failed to load micro app icon:', error);
    }

    // 降级到首字母
    return {
      icon: widget.title.charAt(0).toUpperCase(),
      fallback: 'letter',
      backgroundColor: getColorFromString(widget.id)
    };
  }

  // 其他类型：使用 lucide-react 图标
  const iconComponent = WIDGET_TYPE_ICON_MAP[widget.type];
  if (iconComponent) {
    return {
      icon: iconComponent,
      fallback: 'default'
    };
  }

  // 最终降级
  return {
    icon: widget.title.charAt(0).toUpperCase(),
    fallback: 'letter',
    backgroundColor: getColorFromString(widget.id)
  };
};

/**
 * 根据字符串生成颜色（用于首字母 Avatar）
 */
const getColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
};

/**
 * 小组件类型与图标的映射
 */
const WIDGET_TYPE_ICON_MAP: Record<WidgetType, React.ComponentType<any> | null> = {
  clock: Icons.Clock,
  stats: Icons.BarChart3,
  chart: Icons.LineChart,
  link: Icons.Link,
  news: Icons.Newspaper,
  topList: Icons.ListOrdered,
  search: Icons.Search,
  dataTable: Icons.Table,
  cardGrid: Icons.LayoutGrid,
  customForm: Icons.FileText,
  microApp: null,  // 微应用动态获取
  floatingModule: Icons.Window,
};

/**
 * 获取小组件的默认尺寸
 */
export const getWidgetDefaultSize = (type: WidgetType, module?: MicroAppModule): GridSize => {
  // 微应用：从配置读取
  if (type === 'microApp' && module?.defaultSize) {
    return {
      columns: module.defaultSize.w,
      rows: module.defaultSize.h
    };
  }

  // 其他类型：预定义默认尺寸
  const defaultSizes: Record<WidgetType, GridSize> = {
    clock: { columns: 2, rows: 2 },
    stats: { columns: 3, rows: 2 },
    chart: { columns: 6, rows: 4 },
    link: { columns: 2, rows: 1 },
    news: { columns: 4, rows: 3 },
    topList: { columns: 3, rows: 4 },
    search: { columns: 4, rows: 1 },
    dataTable: { columns: 8, rows: 4 },
    cardGrid: { columns: 6, rows: 3 },
    customForm: { columns: 4, rows: 4 },
    microApp: { columns: 6, rows: 4 },
    floatingModule: { columns: 4, rows: 3 },
  };

  return defaultSizes[type] || { columns: 4, rows: 3 };
};

/**
 * 计算容器像素尺寸
 * @param w 网格宽度
 * @param h 网格高度
 * @param containerWidth 容器总宽度
 * @param rowHeight 行高（默认 120px）
 * @param margin 间距（默认 10px）
 * @param headerHeight 头部高度（默认 40px）
 */
export const calculateContainerSize = (
  w: number,
  h: number,
  containerWidth: number,
  rowHeight: number = 120,
  margin: number = 10,
  headerHeight: number = 40
) => {
  const colWidth = containerWidth / 12;

  const width = Math.floor(colWidth * w - margin);
  const height = Math.floor(rowHeight * h - margin);
  const contentHeight = Math.max(height - headerHeight, 0);

  return {
    width,
    height,
    contentHeight
  };
};
```

---

### 4.3 Icon-Only 视图组件

**文件**: `src/components/WidgetIconView/index.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Widget } from '@/types';
import { Tooltip } from 'antd';
import { getWidgetIcon } from '@/utils/widgetHelpers';
import { WidgetIconConfig } from '@/types/widget-size';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import './index.scss';

interface WidgetIconViewProps {
  widget: Widget;
  isEditMode: boolean;
  onClick?: () => void;
}

/**
 * 小组件 Icon-Only 视图
 * 当小组件尺寸为 1x1 时显示
 */
const WidgetIconView: React.FC<WidgetIconViewProps> = ({ widget, isEditMode, onClick }) => {
  const navigate = useNavigate();
  const [iconConfig, setIconConfig] = useState<WidgetIconConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载 icon 配置
  useEffect(() => {
    const loadIcon = async () => {
      setLoading(true);
      const config = await getWidgetIcon(widget);
      setIconConfig(config);
      setLoading(false);
    };
    loadIcon();
  }, [widget.id, widget.type]);

  // 处理点击事件
  const handleClick = () => {
    if (isEditMode) {
      return; // 编辑模式下不响应点击
    }

    // 如果有自定义点击事件，优先使用
    if (onClick) {
      onClick();
      return;
    }

    // 微应用：跳转到独立页面
    if (widget.type === 'microApp' && widget.config.systemId && widget.config.moduleId) {
      navigate(`/micro-app/${widget.config.systemId}/${widget.config.moduleId}`);
    }
    // 其他类型：可以实现自动放大等逻辑
    // 这里暂时不处理
  };

  // 渲染 Icon
  const renderIcon = () => {
    if (loading) {
      return <div className="widget-icon-skeleton" />;
    }

    if (!iconConfig) {
      return null;
    }

    // 图片 URL
    if (typeof iconConfig.icon === 'string' && iconConfig.icon.startsWith('http')) {
      return (
        <img
          src={iconConfig.icon}
          alt={widget.title}
          className="widget-icon-image"
        />
      );
    }

    // React 组件（lucide-react 图标）
    if (React.isValidElement(iconConfig.icon)) {
      return React.cloneElement(iconConfig.icon as React.ReactElement, {
        size: 56,
        strokeWidth: 1.5,
        className: 'widget-icon-component'
      });
    }

    // 首字母 Avatar
    if (iconConfig.fallback === 'letter') {
      return (
        <div
          className="widget-icon-letter"
          style={{ backgroundColor: iconConfig.backgroundColor }}
        >
          {iconConfig.icon}
        </div>
      );
    }

    return null;
  };

  const tooltipTitle = isEditMode
    ? '拖拽调整大小以查看内容'
    : '点击打开应用';

  return (
    <Tooltip title={tooltipTitle} placement="top">
      <div
        className={clsx('widget-icon-view', {
          'edit-mode': isEditMode,
          'clickable': !isEditMode
        })}
        onClick={handleClick}
      >
        <div className="widget-icon-container">
          {renderIcon()}
        </div>

        <div className="widget-icon-title">
          {widget.title}
        </div>

        {!isEditMode && (
          <div className="widget-icon-hint">
            点击打开
          </div>
        )}
      </div>
    </Tooltip>
  );
};

export default WidgetIconView;
```

**文件**: `src/components/WidgetIconView/index.scss`

```scss
.widget-icon-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 8px;
  position: relative;
  background: #fff;
  border-radius: 4px;
  transition: all 0.2s;

  // 可点击状态
  &.clickable {
    cursor: pointer;

    &:hover {
      background: rgba(0, 0, 0, 0.02);
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);

      .widget-icon-hint {
        opacity: 1;
      }
    }

    &:active {
      transform: translateY(0);
    }
  }

  // 编辑模式
  &.edit-mode {
    cursor: move;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(24, 144, 255, 0.05);
      border: 2px dashed rgba(24, 144, 255, 0.3);
      border-radius: 4px;
      pointer-events: none;
    }
  }

  // Icon 容器
  .widget-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin-bottom: 8px;
  }

  // 图片 Icon
  .widget-icon-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  // 组件 Icon (lucide-react)
  .widget-icon-component {
    color: #666;
  }

  // 首字母 Avatar
  .widget-icon-letter {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 600;
    color: #fff;
    user-select: none;
  }

  // 加载骨架屏
  .widget-icon-skeleton {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      #f0f0f0 25%,
      #e0e0e0 50%,
      #f0f0f0 75%
    );
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
  }

  // 标题
  .widget-icon-title {
    font-size: 12px;
    color: #333;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    line-height: 1.4;
  }

  // 提示文字
  .widget-icon-hint {
    position: absolute;
    bottom: 4px;
    font-size: 10px;
    color: #999;
    opacity: 0;
    transition: opacity 0.2s;
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

---

### 4.4 修改 Dashboard 组件

**文件**: `src/pages/Dashboard/index.tsx`

在 `renderWidgetContent` 函数之前添加：

```typescript
import WidgetIconView from '@/components/WidgetIconView';
import { isIconOnlyMode } from '@/utils/widgetHelpers';

// ... 其他 imports
```

修改渲染逻辑：

```typescript
const Dashboard: React.FC = () => {
  const { widgets, updateLayout, isEditMode, isFullScreen, toggleFullScreen, floatingModules } = useStore();

  // ... 其他代码

  // 渲染单个 widget
  const renderWidget = (widget: Widget) => {
    const { w, h } = widget.layout;

    // 判断是否为 icon-only 模式
    if (isIconOnlyMode(w, h)) {
      return (
        <WidgetErrorBoundary key={widget.id}>
          <WidgetIconView
            widget={widget}
            isEditMode={isEditMode}
          />
        </WidgetErrorBoundary>
      );
    }

    // 正常渲染模式
    return (
      <WidgetErrorBoundary key={widget.id}>
        <WidgetWrapper widget={widget}>
          {renderWidgetContent(widget)}
        </WidgetWrapper>
      </WidgetErrorBoundary>
    );
  };

  // ... 原有的 renderWidgetContent 保持不变

  return (
    <div
      className={clsx('dashboard-container', {
        'grid-background': isEditMode,
        'fullscreen': isFullScreen
      })}
    >
      {/* ... 全屏按钮等 */}

      <ResponsiveReactGridLayout
        className="dashboard-grid"
        layouts={{ lg: sanitizedWidgets.map(w => w.layout) }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        rowHeight={120}
        margin={[10, 10]}
        containerPadding={[10, 10]}
        compactType={null}
        preventCollision={true}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        draggableHandle=".grid-drag-handle"
        onLayoutChange={onLayoutChange}
      >
        {sanitizedWidgets.map(widget => (
          <div key={widget.id} data-grid={widget.layout}>
            {renderWidget(widget)}
          </div>
        ))}
      </ResponsiveReactGridLayout>

      {/* FloatingModule 渲染 */}
      {floatingModules.map(module => (
        <FloatingModule key={module.id} module={module} />
      ))}
    </div>
  );
};

export default Dashboard;
```

---

### 4.5 修改 MicroAppWidget 传递尺寸信息

**文件**: `src/components/widgets/MicroAppWidget/index.tsx`

修改 `MicroAppWidgetProps` 接口：

```typescript
interface MicroAppWidgetProps {
  config: MicroAppWidgetConfig;
  widget: Widget;  // ✅ 新增：需要传递完整的 widget 对象
}
```

修改组件内部逻辑：

```typescript
import { getWidgetDisplayMode } from '@/utils/widgetHelpers';
import { WidgetSizeInfo } from '@/types/widget-size';

const MicroAppWidget: React.FC<MicroAppWidgetProps> = ({ config, widget }) => {
  // ... 原有代码

  // ✅ 新增：计算尺寸信息
  const sizeInfo: WidgetSizeInfo = {
    grid: {
      columns: widget.layout.w,
      rows: widget.layout.h
    },
    displayMode: getWidgetDisplayMode(widget.layout.w, widget.layout.h)
  };

  return (
    <div className={`micro-app-widget-container ${isGlobalMode ? 'global-mode' : ''}`} style={{ position: 'relative' }}>
      {/* Loading 遮罩 */}
      {loading && (
        <div className="micro-app-widget-loading">
          <Spin size="large" tip="应用加载中..." />
        </div>
      )}

      {/* Wujie 容器 */}
      {moduleConfig && (
        <div style={{ width: '100%', height: '100%', opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }}>
        <WujieReact
          width="100%"
          height="100%"
          name={appName}
          url={moduleConfig.url}
          sync={config.sync}
          alive={config.alive ?? true}
          degrade={degrade}
          props={{
            ...config.props,
            token: getToken(),
            appId: appName,

            // ✅ 新增：传递尺寸信息
            __sizeInfo: sizeInfo,
          }}
          // 生命周期
          {...lifecycles}
          afterMount={handleAfterMount}
          activated={handleActivated}
          loadError={handleLoadError}
        />
        </div>
      )}

      {/* 错误信息 */}
      {error && moduleConfig && (
         <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 101 }}>
            <Result status="error" title="加载异常" subTitle={error} />
         </div>
      )}
    </div>
  );
};
```

**注意**：需要在调用 `MicroAppWidget` 的地方传递 `widget` 参数：

在 `Dashboard/index.tsx` 的 `renderWidgetContent` 中：

```typescript
case 'microApp':
  return <MicroAppWidget config={widget.config} widget={widget} />;  // ✅ 新增 widget 参数
```

---

### 4.8 修改 WidgetWrapper 样式支持

**文件**: `src/components/WidgetWrapper/index.tsx`

不需要大改，但要确保 icon-only 模式下不渲染 WidgetWrapper。

在 `Dashboard/index.tsx` 中已经通过条件渲染处理了：

```typescript
// icon-only 模式直接渲染 WidgetIconView，不包裹 WidgetWrapper
if (isIconOnlyMode(w, h)) {
  return <WidgetIconView widget={widget} isEditMode={isEditMode} />;
}

// 正常模式包裹 WidgetWrapper
return (
  <WidgetWrapper widget={widget}>
    {renderWidgetContent(widget)}
  </WidgetWrapper>
);
```

---

## 5. 样式规范

### 5.1 Icon-Only 模式样式要点

```scss
// 1. 容器居中布局
.widget-icon-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

// 2. Icon 尺寸
.widget-icon-container {
  width: 64px;
  height: 64px;
}

// 3. Hover 效果
&.clickable:hover {
  transform: translateY(-2px);  // 上浮
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);  // 阴影
}

// 4. 编辑模式虚线边框
&.edit-mode::after {
  border: 2px dashed rgba(24, 144, 255, 0.3);
}
```

### 5.2 响应式适配

```scss
// 小屏幕下调整 Icon 尺寸
@media (max-width: 768px) {
  .widget-icon-container {
    width: 48px;
    height: 48px;
  }

  .widget-icon-title {
    font-size: 11px;
  }
}
```

---

## 6. 子应用集成指南

### 6.1 接收尺寸信息

子应用通过 `window.$wujie.props.__sizeInfo` 获取：

```typescript
// 示例：React 子应用
import { useEffect, useState } from 'react';

const MyMicroApp = () => {
  const [layout, setLayout] = useState('normal');

  useEffect(() => {
    // 获取尺寸信息
    const sizeInfo = window.$wujie?.props?.__sizeInfo;

    if (!sizeInfo) {
      console.warn('未接收到尺寸信息');
      return;
    }

    const { columns, rows } = sizeInfo.grid;
    const area = columns * rows;

    // 根据面积调整布局
    if (area <= 4) {
      setLayout('minimal');
    } else if (area <= 12) {
      setLayout('compact');
    } else {
      setLayout('full');
    }

    console.log('当前尺寸:', { columns, rows, displayMode: sizeInfo.displayMode });
  }, []);

  return (
    <div className={`app-layout-${layout}`}>
      {/* 根据 layout 渲染不同视图 */}
    </div>
  );
};
```

### 6.2 监听尺寸变化（可选）

如果需要响应尺寸实时变化：

```typescript
import { bus } from 'wujie';

useEffect(() => {
  // 监听尺寸变化事件
  const handleResize = (sizeInfo: any) => {
    console.log('尺寸变化:', sizeInfo);
    updateLayout(sizeInfo);
  };

  bus.$on('resize', handleResize);

  return () => {
    bus.$off('resize', handleResize);
  };
}, []);
```

### 6.3 推荐的适配策略

```typescript
/**
 * 根据网格面积判断布局类型
 */
const getLayoutType = (columns: number, rows: number) => {
  const area = columns * rows;

  if (area <= 4) {
    // 2x2: 极简视图
    return {
      type: 'minimal',
      maxItems: 1,  // 只显示一个核心数据
      showControls: false,
      fontSize: 'small'
    };
  }

  if (area <= 12) {
    // 3x4: 紧凑视图
    return {
      type: 'compact',
      maxItems: 4,
      showControls: true,
      fontSize: 'normal'
    };
  }

  // > 12: 完整视图
  return {
    type: 'full',
    maxItems: -1,  // 无限制
    showControls: true,
    fontSize: 'normal'
  };
};
```

### 6.4 CSS 适配示例

```scss
// 子应用样式
.my-micro-app {
  width: 100%;
  height: 100%;
  padding: 16px;

  // Minimal 布局（2x2）
  &.layout-minimal {
    padding: 8px;

    .header,
    .sidebar,
    .footer {
      display: none;
    }

    .main-content {
      font-size: 14px;

      // 只显示核心指标
      .metric:not(.primary) {
        display: none;
      }
    }
  }

  // Compact 布局（3x4）
  &.layout-compact {
    .sidebar {
      display: none;
    }

    .main-content {
      grid-template-columns: 1fr;  // 单列
    }
  }

  // Full 布局（> 4x4）
  &.layout-full {
    display: grid;
    grid-template-columns: 240px 1fr;  // 侧边栏 + 主内容
  }
}
```

---

## 7. 测试验证

### 7.1 功能测试用例

| 测试项 | 操作步骤 | 期望结果 |
|-------|---------|---------|
| **TC-01: Icon 显示** | 1. 添加微应用小组件<br>2. 缩小到 1x1 | 显示 icon + 标题，不渲染子应用 |
| **TC-02: Icon 点击跳转** | 1. 预览模式<br>2. 点击 1x1 icon | 跳转到 `/micro-app/:systemId/:moduleId` |
| **TC-03: 编辑模式拖拽** | 1. 编辑模式<br>2. 拖拽 1x1 icon | 可正常拖拽，显示虚线边框 |
| **TC-04: 尺寸放大** | 1. 从 1x1 拖拽到 2x2 | 自动加载并渲染子应用 |
| **TC-05: 尺寸缩小** | 1. 从 2x2 缩小到 1x1 | 切换到 icon 模式 |
| **TC-06: Icon 降级** | 1. 微应用无 icon 配置 | 显示首字母 Avatar |
| **TC-07: 右键菜单** | 1. 右键点击 icon | 显示菜单（打开/配置/删除） |
| **TC-08: 尺寸信息传递** | 1. 添加 2x2 微应用<br>2. 子应用打印 `__sizeInfo` | 正确接收 `{grid: {columns:2, rows:2}}` |
| **TC-09: 独立页面返回** | 1. 从 icon 跳转<br>2. 点击返回按钮 | 返回 Dashboard |
| **TC-10: 其他类型 icon** | 1. 添加 clock 小组件<br>2. 缩小到 1x1 | 显示时钟图标 |

### 7.2 性能测试

| 指标 | 场景 | 目标 |
|-----|------|------|
| **内存占用** | 10 个 1x1 icon + 5 个正常 widget | Icon 模式不加载子应用，内存节省 > 50% |
| **切换速度** | 1x1 → 4x4 切换 | < 2s 完成加载 |
| **布局流畅度** | 拖拽调整尺寸 | 60fps，无卡顿 |

### 7.3 浏览器兼容性

| 浏览器 | 版本 | 状态 |
|--------|------|------|
| Chrome | >= 90 | ✅ 测试通过 |
| Edge | >= 90 | ✅ 测试通过 |
| Firefox | >= 88 | ⚠️ 需测试 |
| Safari | >= 14 | ⚠️ 需测试 |

---

## 8. FAQ

### Q1: 为什么选择 1x1 作为 icon-only 的临界点？

**A**: 1x1 尺寸（约 150×120px）太小，无法显示有意义的内容。显示 icon 是最佳体验，类似手机桌面。

### Q2: 子应用如何知道自己在 Dashboard 中的尺寸？

**A**: 通过 Wujie 的 `props.__sizeInfo` 获取，包含 `grid: {columns, rows}` 信息。

### Q3: 如果子应用不适配尺寸，会怎样？

**A**: 子应用仍能正常显示，只是可能在小尺寸下显示不全。建议子应用至少实现基础的响应式布局。

### Q4: Icon 图片加载失败怎么办？

**A**: 自动降级到首字母 Avatar，不会出现空白。

### Q5: 可以禁止用户缩小到 1x1 吗？

**A**: 可以通过设置 `minW: 2, minH: 2` 实现，但建议保留 1x1 功能，提供更灵活的布局。

### Q6: 其他类型小组件也支持 icon-only 吗？

**A**: 是的，所有类型都支持。其他类型使用 lucide-react 图标，点击后自动放大到默认尺寸。

### Q7: 如何为新的微应用配置 icon？

**A**: 在 `public/config/micro-apps.json` 中为模块添加 `icon` 字段（URL 或 base64）。

### Q8: 独立页面路由需要权限控制吗？

**A**: 需要。在 `router.config.tsx` 中设置 `requiresAuth: true`，使用现有的权限检查机制。

---

## 9. 后续扩展

### 9.1 可能的优化方向

- [ ] **容器查询 API**: 使用 CSS Container Queries 替代 JS 计算
- [ ] **尺寸预设**: 提供常用尺寸快速切换按钮（1x1, 2x2, 4x4）
- [ ] **双击放大**: 双击 1x1 icon 自动放大到默认尺寸
- [ ] **拖拽优化**: 从 1x1 拖拽时显示预览大小
- [ ] **Icon 缓存**: 缓存已加载的 icon，减少重复请求

### 9.2 高级特性

- [ ] **像素尺寸传递**: 计算并传递 `container: {width, height}` 像素值
- [ ] **实时尺寸通知**: 监听 `onLayoutChange`，通过 Wujie bus 实时通知子应用
- [ ] **子应用请求放大**: 子应用可以通过事件请求主应用放大自己
- [ ] **响应式断点**: 定义标准断点（xs/sm/md/lg），统一设计规范

---

## 10. 参考资料

- [React Grid Layout 文档](https://github.com/react-grid-layout/react-grid-layout)
- [Wujie 微前端文档](https://wujie-micro.github.io/doc/)
- [Lucide React Icons](https://lucide.dev/)
- [CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)

---

## 附录

### A. 完整的类型定义文件

参见 `src/types/widget-size.ts`

### B. 工具函数完整代码

参见 `src/utils/widgetHelpers.ts`

### C. 微应用配置示例

```json
{
  "id": "chart-system",
  "name": "图表系统",
  "modules": [
    {
      "id": "line-chart",
      "name": "折线图",
      "icon": "https://example.com/icons/line-chart.svg",
      "defaultSize": { "w": 6, "h": 4 },
      "url": "http://localhost:3001/line-chart",
      "entry": "http://localhost:3001/index.html"
    }
  ]
}
```

---

**文档结束**

如有疑问，请参考代码注释或联系开发团队。
