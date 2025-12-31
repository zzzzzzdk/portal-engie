# Portal Engine 对接指南

本文档描述 Portal Engine 门户系统的功能和对接标准，供外部系统集成参考。

---

## 一、系统概述

Portal Engine 是一个支持通过拖拽配置创建个性化数据展示面板。

### 核心特性

- 响应式网格布局系统
- 拖拽式小部件配置
- 微应用（Wujie）集成
- 悬浮模块支持
- 主题切换（明/暗）
- 状态持久化

---

## 二、小部件类型

系统内置以下小部件类型：

| 类型 | 说明 | 支持数据接口 |
|------|------|-------------|
| `clock` | 时钟组件 | - |
| `stats` | 统计卡片 | ✅ |
| `chart` | 图表组件 | ✅ |
| `link` | 快捷链接 | - |
| `news` | 新闻列表 | ✅ |
| `topList` | 排行榜 | ✅ |
| `search` | 搜索框 | - |
| `dataTable` | 数据表格 | ✅ |
| `customForm` | 自定义表单 | ✅ |
| `headerBar` | 头部栏 | - |
| `typography` | 文本/标题 | - |
| `iconNav` | 图标导航 | - |
| `navGroup` | 导航组 | ✅ |
| `microApp` | 微应用 | - |
| `pageNavigator` | 页面切换 | - |

---

## 三、微应用集成

本章节描述微应用的配置、注册、通信和主题适配。

### 3.1 配置获取方式

微应用配置通过后端接口动态获取：

```
GET /v1/micro_apps/list
```

**响应格式**：

```json
{
  "code": 20000,
  "message": "success",
  "data": {
    "version": "1.0.0",
    "apps": [
      {
        "id": "system-id",
        "name": "系统名称",
        "description": "系统描述",
        "icon": "UserOutlined",
        "category": "分类名称",
        "modules": [
          {
            "id": "module-id",
            "name": "模块名称",
            "description": "模块描述",
            "url": "http://localhost:8083/#/path",
            "entry": "http://localhost:8083/",
            "icon": "图标URL或Ant Design图标名",
            "defaultSize": { "w": 6, "h": 4 },
            "forceIconOnly": false,
            "emittableEvents": [],
            "listenableEvents": []
          }
        ]
      }
    ]
  }
}
```

### 3.2 微应用管理接口

### 3.3 模块配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 模块唯一标识 |
| `name` | string | ✅ | 模块显示名称 |
| `description` | string | - | 模块描述 |
| `url` | string | ✅ | 模块访问路径 |
| `entry` | string | ✅ | 微应用入口地址 |
| `icon` | string | - | 图标（URL 或 Ant Design 图标名） |
| `defaultSize` | object | - | 默认尺寸 `{ w: number, h: number }` |
| `forceIconOnly` | boolean | - | 是否强制以图标形式显示 |
| `emittableEvents` | array | - | 可发送的事件列表 |
| `listenableEvents` | array | - | 可监听的事件列表 |

### 3.4 子应用注册与 Props 注入

主应用在注册子应用时，会自动注入以下 props：

```typescript
{
  token: string;           // 当前用户 Token
  appId: string;           // 应用 ID (格式: systemId-moduleId)
  theme: 'light' | 'dark'; // 当前主题模式
  __sizeInfo: {            // 尺寸信息
    grid: {
      columns: number;     // 网格列数
      rows: number;        // 网格行数
    };
    displayMode: 'icon-only' | 'minimal' | 'compact' | 'normal' | 'large';  // 显示模式
  };
  backgroundConfig: {      // 背景配置
    type: string;
    color?: string;
    image?: string;
    gradient?: string;
  };
  // ...自定义 props
}
```

**子应用获取 Props**：

```javascript
// Vue 3 / React 子应用
const props = window.$wujie?.props || {};
console.log('Token:', props.token);
console.log('Theme:', props.theme);
console.log('AppId:', props.appId);
```

**监听主应用事件**：

```javascript
import { bus } from 'wujie-react'; // 或 wujie-vue3

// 监听 Token 更新
bus.$on('token:update', (token) => {
  console.log('收到新 Token:', token);
});

// 监听状态变更（主题、尺寸、背景）
bus.$on('state:change', (config) => {
  console.log('主题:', config.theme);
  console.log('尺寸信息:', config.__sizeInfo);
  console.log('背景配置:', config.backgroundConfig);
});
```

### 3.5 通信协议

#### 事件类型

| 事件类型 | 说明 |
|----------|------|
| `token:update` | Token 更新（主应用广播） |
| `state:change` | 状态变更（主题、尺寸、背景等，主应用广播） |
| `data:submit` | 数据提交 |
| `data:update` | 数据更新 |
| `data:delete` | 数据删除 |
| `data:query` | 数据查询请求 |
| `data:response` | 数据查询响应 |
| `navigate` | 路由导航 |
| `user:select` | 用户选择 |
| `notification` | 通知消息 |
| `refresh` | 刷新请求 |

#### 事件消息格式

```typescript
interface MicroAppEventMessage<T = any> {
  id: string;                           // 消息唯一 ID
  type: string;                         // 事件类型
  from: string;                         // 发送方应用 ID (格式: systemId-moduleId)
  to?: string | string[];               // 接收方应用 ID（可选，不指定则广播）
  timestamp: number;                    // 时间戳
  payload: T;                           // 消息载荷
  metadata?: {
    correlationId?: string;             // 关联 ID（用于请求-响应模式）
    priority?: 'low' | 'normal' | 'high';
    ttl?: number;                       // 消息存活时间 (ms)
  };
}
```

#### 事件路由配置

微应用之间的事件通信通过事件路由配置：

```typescript
interface EventRouteConfig {
  eventType: string;      // 当前应用发送的事件类型
  toAppId: string;        // 目标应用 ID (格式: systemId-moduleId)
  toAppName?: string;     // 目标应用名称
  toEventType?: string;   // 目标应用监听的事件类型
  enabled?: boolean;      // 是否启用
}
```

#### 事件定义格式

```json
{
  "type": "data:submit",
  "name": "数据提交",
  "description": "提交数据到其他系统"
}
```

#### 通信示例

**发送事件（子应用）**:

```javascript
import { bus } from 'wujie-react';

// 发送数据提交事件
bus.$emit('data:submit', {
  id: 'msg-123',
  type: 'data:submit',
  from: 'system-fusion-input-only',
  timestamp: Date.now(),
  payload: {
    entityType: 'user',
    action: 'create',
    data: { name: '张三', age: 25 }
  }
});
```

**监听事件（子应用）**:

```javascript
import { bus } from 'wujie-react';

// 监听数据提交事件
bus.$on('data:submit:table-only', (message) => {
  console.log('收到数据:', message.payload);
});
```

### 3.6 主题切换与适配

系统支持两种主题模式：`light`（浅色）和 `dark`（深色）。

**主题切换通知方式**：

1. **Props 更新**：子应用通过 `window.$wujie.props.theme` 获取
2. **事件通知**：主应用通过 `bus` 发送 `state:change` 事件

**子应用适配主题（推荐方案）**：

```css
/* 子应用样式 - 使用 CSS 变量 */
:root {
  --bg-color: #ffffff;
  --text-color: #333333;
}

:root.dark {
  --bg-color: #1f1f1f;
  --text-color: #ffffff;
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
}
```

```javascript
// 子应用入口
import { bus } from 'wujie-react';

// 初始化主题
const initTheme = () => {
  const theme = window.$wujie?.props?.theme || 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

// 监听主题变更
bus.$on('state:change', ({ theme }) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
});

initTheme();
```

### 3.7 子应用生命周期

主应用会触发以下生命周期钩子：

| 钩子 | 触发时机 |
|------|----------|
| `beforeLoad` | 加载前 |
| `beforeMount` | 挂载前 |
| `afterMount` | 挂载后 |
| `beforeUnmount` | 卸载前 |
| `afterUnmount` | 卸载后 |
| `activated` | 从 keep-alive 激活 |
| `deactivated` | 进入 keep-alive |
| `loadError` | 加载失败 |

### 3.8 子应用开发规范

接入 Portal Engine 的微应用需遵循以下开发规范：

#### 3.8.1 生命周期支持（必须）

子应用必须正确响应无界（Wujie）生命周期钩子（详情在微应用改造文档）：


#### 3.8.2 主题切换支持（必须）

子应用必须支持主题切换，响应主应用的 `state:change` 事件：

**支持的主题模式**：

| 主题 | 说明 |
|------|------|
| `light` | 浅色主题（必须支持） |
| `dark` | 深色主题（必须支持） |
| `minimal` | 极简风格（可选，适用于小尺寸展示） |

**实现方式**：

```javascript
import { bus } from 'wujie-react';

// 初始化主题
const initTheme = () => {
  const theme = window.$wujie?.props?.theme || 'light';
  applyTheme(theme);
};

// 监听主题变更
bus.$on('state:change', ({ theme }) => {
  applyTheme(theme);
});

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  // 或使用 class 切换
  document.documentElement.className = theme;
};

initTheme();
```

```css
/* 主题变量定义 */
:root, [data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #e8e8e8;
}

[data-theme="dark"] {
  --bg-primary: #1f1f1f;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --border-color: #404040;
}

/* 极简风格（可选） */
[data-theme="minimal"] {
  --bg-primary: transparent;
  --bg-secondary: rgba(255, 255, 255, 0.1);
  --text-primary: inherit;
  --text-secondary: inherit;
  --border-color: transparent;
}
```

#### 3.8.3 尺寸自适应（必须）

子应用必须实现响应式布局适配，支持以下两种方式（可选其一或组合使用）：

##### 方案一：CSS 容器查询 / ResizeObserver（推荐）

子应用自行监听容器尺寸变化，使用 CSS 原生能力实现响应式布局。此方案与主应用解耦，更加灵活。

**CSS Container Query**：

```css
/* 定义容器 */
.app-container {
  container-type: inline-size;
  container-name: app;
  width: 100%;
  height: 100%;
}

/* 根据容器宽度适配 */
@container app (max-width: 200px) {
  .content { display: none; }
  .icon-view { display: flex; }
}

@container app (min-width: 201px) and (max-width: 400px) {
  .sidebar { display: none; }
  .content { padding: 8px; }
}

@container app (min-width: 401px) {
  .sidebar { display: block; }
  .content { padding: 16px; }
}
```

**ResizeObserver（JavaScript）**：

```javascript
const container = document.querySelector('.app-container');
const resizeObserver = new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect;

  if (width <= 200 && height <= 200) {
    setViewMode('icon');
  } else if (width <= 400) {
    setViewMode('compact');
  } else {
    setViewMode('full');
  }
});

resizeObserver.observe(container);
```

##### 方案二：通过 sizeInfo 适配

主应用会传递 `__sizeInfo` 对象，包含网格尺寸和显示模式建议。此方案可获取精确的网格信息。

```typescript
// sizeInfo 结构
interface SizeInfo {
  grid: {
    columns: number;  // 占用的网格列数 (1-12)
    rows: number;     // 占用的网格行数
  };
  displayMode: 'icon-only' | 'minimal' | 'compact' | 'normal' | 'large';
}
```

**displayMode 说明**：

| displayMode | 条件 | 建议展示 |
|-------------|------|----------|
| `icon-only` | w ≤ 2 且 h ≤ 2 | 仅显示图标，隐藏所有内容 |
| `minimal` | 面积 ≤ 4 | 极简视图，只显示核心信息 |
| `compact` | 面积 ≤ 12 | 紧凑视图，隐藏次要信息 |
| `normal` | 面积 ≤ 24 | 标准视图 |
| `large` | 面积 > 24 | 完整视图，可展示更多细节 |

> **注**: 面积 = columns × rows

**实现示例**：

```javascript
import { bus } from 'wujie-react';

const handleSizeChange = (sizeInfo) => {
  const { displayMode, grid } = sizeInfo;

  switch (displayMode) {
    case 'icon-only':
      showIconView();
      break;
    case 'minimal':
      showMinimalView();
      break;
    case 'compact':
      showCompactView();
      break;
    case 'normal':
    case 'large':
      showFullView();
      break;
  }
};

// 初始化
const sizeInfo = window.$wujie?.props?.__sizeInfo;
if (sizeInfo) handleSizeChange(sizeInfo);

// 监听变化
bus.$on('state:change', ({ __sizeInfo }) => {
  if (__sizeInfo) handleSizeChange(__sizeInfo);
});
```

##### 方案选择建议

| 场景 | 推荐方案 |
|------|----------|
| 新开发的子应用 | 方案一（CSS Container Query） |
| 已有响应式布局的应用 | 方案一（复用现有逻辑） |
| 需要精确控制网格尺寸 | 方案二（sizeInfo） |
| 需要根据业务逻辑切换视图 | 方案二（sizeInfo） |
| 两者组合 | 方案一处理常规响应式，方案二处理 icon-only 模式 |

#### 3.8.4 图标/缩略图（必须）

子应用必须提供用于小尺寸展示的图标或缩略图：

**配置方式**（在模块注册时提供）：

```json
{
  "id": "module-id",
  "name": "模块名称",
  "icon": "DashboardOutlined",
  "iconSvg": "<svg>...</svg>",
  "forceIconOnly": false
}
```

| 字段 | 说明 |
|------|------|
| `icon` | Ant Design 图标名或图片 URL |
| `iconSvg` | 自定义 SVG 代码（优先级高于 icon） |
| `forceIconOnly` | 设为 `true` 则始终以图标形式显示 |

**图标设计要求**：
- 尺寸：建议 48x48 或 64x64
- 格式：SVG（推荐）、PNG
- 风格：需同时提供适配浅色/深色主题的版本

#### 3.8.5 事件文档（必须）

子应用必须提供事件输入输出文档，在模块配置中声明：

```json
{
  "id": "module-id",
  "name": "数据表单",
  "emittableEvents": [
    {
      "type": "data:submit",
      "name": "数据提交",
      "description": "用户提交表单时触发",
      "payload": {
        "entityType": "string - 实体类型",
        "action": "create | update | delete",
        "data": "object - 表单数据"
      }
    }
  ],
  "listenableEvents": [
    {
      "type": "data:query",
      "name": "数据查询",
      "description": "接收查询请求并返回数据",
      "payload": {
        "filters": "object - 过滤条件",
        "pagination": "object - 分页参数"
      }
    }
  ]
}
```

#### 3.8.6 开发检查清单

| 检查项 | 必须 | 说明 |
|--------|------|------|
| 无界生命周期 | ✅ | 正确实现 `__WUJIE_MOUNT` 和 `__WUJIE_UNMOUNT` |
| 浅色主题 | ✅ | 支持 `light` 主题 |
| 深色主题 | ✅ | 支持 `dark` 主题 |
| 极简风格 | ⚪ | 可选，适用于嵌入式场景 |
| 尺寸自适应 | ✅ | CSS Container Query 或 sizeInfo 方案（二选一） |
| 图标模式 | ✅ | `icon-only` 模式时显示图标视图 |
| 提供图标 | ✅ | 配置 `icon` 或 `iconSvg` |
| 事件文档 | ✅ | 声明 `emittableEvents` 和 `listenableEvents` |
| Token 接收 | ✅ | 监听 `token:update` 事件 |
| 状态同步 | ✅ | 监听 `state:change` 事件 |

---

## 四、导航组组件接口

### 4.1 接口格式

导航组组件 (`navGroup`) 通过 `apiEndpoint` 配置数据接口。

**请求方式**: GET

**响应格式**:

```json
{
  "code": 0,
  "data": [
    {
      "id": "nav-1",
      "url": "http://example.com/page",
      "icon": "HomeOutlined",
      "name": "导航名称",
      "description": "导航描述（可选）",
      "openInNew": true,
      "iconBgColor": "#1890ff",
      "iconColor": "#ffffff",
      "textColor": "#333333"
    }
  ]
}
```

### 4.2 NavItem 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | - | 导航项唯一标识 |
| `url` | string | ✅ | 跳转链接 |
| `icon` | string | - | 图标（Ant Design 图标名或 URL） |
| `name` | string | ✅ | 导航名称 |
| `description` | string | - | 导航描述 |
| `openInNew` | boolean | - | 是否新窗口打开，默认 `false` |
| `iconBgColor` | string | - | 图标背景色（不返回则使用随机渐变色） |
| `iconColor` | string | - | 图标颜色，默认白色 |
| `textColor` | string | - | 文字颜色，默认黑色 |

### 4.3 组件配置项

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `layout` | `'flex' \| 'grid' \| 'list'` | 布局模式 |
| `columns` | number | 列数（仅网格布局） |
| `iconSize` | number | 图标大小 (px) |
| `showLabel` | boolean | 是否显示名称 |
| `itemIconColor` | string | 图标颜色 |
| `itemGap` | number | 导航项间距 (px) |

---

## 五、悬浮模块配置

悬浮模块支持两种内容类型：微应用和本地组件。

### 5.1 配置结构

```typescript
interface FloatingModuleConfig {
  // 内容类型
  contentType: 'microApp' | 'localComponent';

  // 微应用配置（contentType = 'microApp'）
  microApp?: {
    systemId: string;
    moduleId: string;
    url: string;
    entry: string;
    props?: Record<string, any>;
    sync?: boolean;    // 是否同步路由
    alive?: boolean;   // 是否保持存活
  };

  // 本地组件配置（contentType = 'localComponent'）
  localComponent?: {
    componentType: LocalComponentType;
    componentProps?: Record<string, any>;
  };

  // 位置配置
  position?: { x: number; y: number };
  defaultPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

  // 尺寸配置
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;

  // 折叠配置
  isExpanded?: boolean;
  collapsedWidth?: number;
  collapsedHeight?: number;

  // 行为配置
  draggable?: boolean;
  resizable?: boolean;
  collapsible?: boolean;
  closable?: boolean;

  // 样式配置
  theme?: 'light' | 'dark' | 'auto';
  borderRadius?: number;
  showHeader?: boolean;
  zIndex?: number;
}
```

### 5.2 本地组件类型

| 类型 | 说明 |
|------|------|
| `chat` | 聊天组件 |
| `notification` | 通知中心 |
| `help` | 帮助文档 |
| `calendar` | 日历 |
| `notes` | 笔记 |
| `assistantHub` | 助手中心 |
| `custom` | 自定义组件 |

### 5.3 助手中心配置

助手中心 (`assistantHub`) 支持配置多个入口，每个入口可打开不同的微应用：

```typescript
interface AssistantEntry {
  id: string;
  name: string;
  icon?: string;           // Ant Design 图标名称
  description?: string;
  microApp: {
    systemId?: string;
    moduleId?: string;
    url: string;
    entry: string;
    props?: Record<string, any>;
  };
}
```

---

## 六、背景配置

小部件支持以下背景配置：

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `backgroundType` | `'color' \| 'image' \| 'gradient'` | 背景类型 |
| `backgroundColor` | string | 背景颜色 |
| `backgroundImage` | string | 背景图片 URL |
| `backgroundGradient` | string | 渐变色 CSS |
| `backgroundSize` | string | 背景大小 |
| `backgroundRepeat` | string | 背景重复 |
| `backgroundPosition` | string | 背景位置 |

---

## 附录：图标支持

系统支持以下图标格式：

1. **Ant Design 图标**: 如 `HomeOutlined`、`UserOutlined`
2. **图片 URL**: 如 `http://example.com/icon.png`
3. **SVG 代码**: 直接使用 SVG 代码

---

*文档版本: 0.1.0*
*最后更新: 2025-12-31*
