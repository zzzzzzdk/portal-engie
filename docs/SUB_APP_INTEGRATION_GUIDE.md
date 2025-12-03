# Portal Engine 子应用对接指南

> 版本: 1.0.0
> 更新时间: 2025-12-02

## 文档目的

本文档面向需要接入 Portal Engine 的外部团队，详细说明如何将您的应用改造为可嵌入的子应用，以及如何与主应用进行数据交互和事件通信。

## 目录

1. [对接流程概述](#对接流程概述)
2. [子应用改造指南](#子应用改造指南)
3. [Token 接收与使用](#token-接收与使用)
4. [事件通信机制](#事件通信机制)
5. [配置信息提交](#配置信息提交)
6. [测试与验证](#测试与验证)
7. [常见问题](#常见问题)

---

## 对接流程概述

```
┌─────────────────────────────────────────────────────────────┐
│  步骤1: 子应用改造                                             │
│  - 配置跨域                                                    │
│  - 实现 Wujie 生命周期                                         │
│  - 适配路由                                                    │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  步骤2: 对接联调                                              │
│  - 接收 Token                                                 │
│  - 实现事件发送/接收                                           │
│  - 测试基本功能                                                │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  步骤3: 提交配置                                              │
│  - 填写子应用配置 JSON                                         │
│  - 声明可发送/监听的事件                                       │
│  - 提供访问地址                                                │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  步骤4: 集成上线                                              │
│  - 主应用配置路由                                             │
│  - 生产环境验证                                                │
│  - 正式上线                                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 子应用改造指南

### 1. 环境要求

- Node.js >= 14.0.0
- 支持 ES6+ 语法
- React/Vue/Angular 等主流框架均可

### 2. 跨域配置

#### 开发环境

**Vite 项目** (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    cors: true,
    port: 8083, // 您的端口
  },
});
```

**Webpack 项目** (`webpack.config.js`):
```javascript
module.exports = {
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
  },
};
```

#### 生产环境

确保您的服务器配置了 CORS 响应头：
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: X-Requested-With, content-type, Authorization
```

### 3. 入口文件改造

**React 应用** (`src/main.tsx` 或 `src/index.tsx`):

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'
import store from '@/store'
import APPRouter from './app';
import '@yisa/yisa-map/dist/yisa-map.mini.css'
import './assets/css/index.scss'
import Update from './Update.js'


if (window.__POWERED_BY_WUJIE__) {
  let root: ReactDOM.Root | null = null;
  window.__WUJIE_MOUNT = () => {
    // 在 wujie 环境中，需要确保 root 容器存在
    let container = document.getElementById('root');

    // 如果容器不存在，创建一个
    if (!container) {
      container = document.createElement('div');
      container.id = 'root';
      document.body.appendChild(container);
    }
    root = ReactDOM.createRoot(container as HTMLElement);
    root.render(
      <Provider store={store}>
        <APPRouter />
        <Update />
      </Provider>
    );
  };
  window.__WUJIE_UNMOUNT = () => {
    if (root) {
      root.unmount();
      root = null;
    }
  };
} else {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  )
  root.render(
    <Provider store={store}>
      <APPRouter />
      <Update />
    </Provider>
  );
}

```

**Vue 3 应用** (`src/main.ts`):

```typescript
import { createApp, App as VueApp } from 'vue';
import App from './App.vue';

let app: VueApp | null = null;

function getContainer() {
  if (window.__POWERED_BY_WUJIE__) {
    return (
      // window.__WUJIE?.shadowRoot?.querySelector('#app') ||
      // window.__WUJIE?.document?.querySelector('#app') ||
      document.querySelector('#app')
    );
  }
  return document.querySelector('#app');
}

if (window.__POWERED_BY_WUJIE__) {
  window.__WUJIE_MOUNT = () => {
    const container = getContainer();
    if (container && !app) {
      app = createApp(App);
      app.mount(container);
    }
  };

  window.__WUJIE_UNMOUNT = () => {
    if (app) {
      app.unmount();
      app = null;
    }
  };
} else {
  const container = getContainer();
  if (container) {
    app = createApp(App);
    app.mount(container);
  }
}
```

### 4. TypeScript 类型定义

创建 `src/types/wujie.d.ts`:

```typescript
interface WujieProps {
  token?: string;
  appId?: string;
  [key: string]: any;
}

interface Window {
  __POWERED_BY_WUJIE__?: boolean;
  __WUJIE_MOUNT?: () => void;
  __WUJIE_UNMOUNT?: () => void;
  __WUJIE?: {
    id: string;
    props?: WujieProps;
    shadowRoot?: ShadowRoot;
    document?: Document;
  };
  $wujie?: Window['__WUJIE'];
}

declare global {
  interface Window {
    $wujie?: {
      bus?: {
        $on: (event: string, handler: Function) => void;
        $off: (event: string, handler?: Function) => void;
        $emit: (event: string, ...args: any[]) => void;
      };
      props?: WujieProps;
    };
  }
}
```

### 5. 路由适配（可选）

如果您的应用在嵌入模式下需要隐藏顶部导航或侧边栏，可以通过检测 `window.__POWERED_BY_WUJIE__` 动态调整布局：

```tsx
function Layout() {
  const isEmbedded = window.__POWERED_BY_WUJIE__;

  return (
    <div>
      {!isEmbedded && <Header />} {/* 嵌入模式下隐藏头部 */}
      <Content />
    </div>
  );
}
```

---

## Token 接收与使用

### 1. Token 注入方式

主应用会通过 Wujie 的 `props` 将 Token 注入到您的子应用：

```typescript
// 子应用中获取 Token
const getToken = (): string | undefined => {
  if (window.__POWERED_BY_WUJIE__) {
    // 从主应用注入的 props 中获取
    return window.$wujie?.props?.token;
  } else {
    // 独立运行时从本地获取
    return localStorage.getItem('token') || undefined;
  }
};
```

### 2. Token 使用示例

```typescript
// utils/request.ts
import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器 - 注入 Token
request.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default request;
```

### 3. 获取应用 ID

```typescript
// 获取当前子应用的唯一标识
const getAppId = (): string => {
  if (window.__POWERED_BY_WUJIE__) {
    return window.$wujie?.props?.appId || '';
  }
  return 'standalone-mode';
};
```

---

## 事件通信机制

### 架构说明

Portal Engine 使用基于配置的事件路由机制：
- **发送方**：使用 Wujie bus 发送事件
- **主应用**：根据配置自动监听并转发事件
- **接收方**：监听主应用转发的事件

### 1. 发送事件

子应用使用 Wujie 官方 API 发送事件：

```typescript
// 发送数据提交事件
const sendDataToOtherApp = (data: any) => {
  if (window.$wujie?.bus) {
    window.$wujie.bus.$emit('portal:form:submit', {
      id: data.id,
      name: data.name,
      type: data.type,
      content: data.content,
      timestamp: Date.now(),
    });

    console.log('事件已发送:', data);
  } else {
    console.warn('未检测到 Wujie 环境，事件发送失败');
  }
};
```

### 2. 监听事件

接收方子应用监听来自主应用转发的事件：

```typescript
import { useEffect } from 'react';

const useEventListener = () => {
  useEffect(() => {
    if (!window.$wujie?.bus) return;

    // 监听转发的数据提交事件
    const handler = (message: any) => {
      console.log('收到事件:', message);
      // message 格式:
      // {
      //   from: "system-fusion-input-only", // 发送方应用ID
      //   type: "finance:table:receive",    // 事件类型
      //   payload: {...},                   // 原始数据
      //   timestamp: 1234567890             // 时间戳
      // }

      // 处理接收到的数据
      handleReceivedData(message);
    };

    // 监听特定事件类型
    window.$wujie.bus.$on('finance:table:receive', handler);

    // 清理监听器
    return () => {
      window.$wujie?.bus?.$off('finance:table:receive', handler);
    };
  }, []);
};
```

### 3. 事件格式规范

#### 事件类型命名规范

Portal Engine 采用 **系统-模块-动作** 的命名格式，确保事件来源清晰、语义明确。

##### 标准格式

**格式**: `{systemId}:{moduleId}:{action}`

**说明**:
- `systemId`: 系统唯一标识（如 crm、finance、wms）
- `moduleId`: 模块标识（如 customer、invoice、inventory）
- `action`: 业务动作（如 submit、update、query）

##### 命名示例

```
crm:customer:submit            # CRM系统-客户模块-提交数据
finance:invoice:approve        # 财务系统-发票模块-审批通过
wms:inventory:sync             # 仓储系统-库存模块-同步数据
hr:employee:update             # 人力系统-员工模块-更新信息
order:cart:checkout            # 订单系统-购物车-结算
portal:form:reset              # 门户系统-表单模块-重置
analytics:report:export        # 分析系统-报表模块-导出
```

##### 命名最佳实践

1. **保持一致性**: 同一系统内使用统一的命名风格
2. **语义清晰**: 事件名称应清楚表达业务含义
3. **使用小写**: 统一使用小写字母和连字符
4. **避免过长**: 建议每个部分不超过 15 个字符
5. **避免特殊字符**: 仅使用字母、数字、冒号和连字符

#### 常用动作词汇表

根据业务场景选择合适的动作词，保持团队内命名一致性：

##### 数据操作类

| 动作 | 说明 | 示例 |
|------|------|------|
| `create` | 创建新资源 | `crm:customer:create` |
| `update` | 更新现有资源 | `crm:customer:update` |
| `delete` | 删除资源 | `crm:customer:delete` |
| `query` | 查询数据 | `crm:customer:query` |
| `search` | 搜索数据 | `product:catalog:search` |
| `sync` | 数据同步 | `wms:inventory:sync` |
| `import` | 导入数据 | `hr:employee:import` |
| `export` | 导出数据 | `finance:report:export` |

##### 表单操作类

| 动作 | 说明 | 示例 |
|------|------|------|
| `submit` | 提交表单 | `portal:form:submit` |
| `save` | 保存草稿 | `portal:form:save` |
| `reset` | 重置表单 | `portal:form:reset` |
| `validate` | 验证数据 | `portal:form:validate` |

##### 用户交互类

| 动作 | 说明 | 示例 |
|------|------|------|
| `select` | 选择项目 | `product:picker:select` |
| `click` | 点击操作 | `dashboard:widget:click` |
| `toggle` | 切换状态 | `settings:theme:toggle` |
| `open` | 打开/展开 | `modal:dialog:open` |
| `close` | 关闭/折叠 | `modal:dialog:close` |

##### 流程控制类

| 动作 | 说明 | 示例 |
|------|------|------|
| `approve` | 审批通过 | `workflow:task:approve` |
| `reject` | 审批拒绝 | `workflow:task:reject` |
| `start` | 启动流程 | `workflow:process:start` |
| `complete` | 完成任务 | `workflow:task:complete` |
| `cancel` | 取消操作 | `order:payment:cancel` |

##### 通知提醒类

| 动作 | 说明 | 示例 |
|------|------|------|
| `notify` | 发送通知 | `system:message:notify` |
| `alert` | 发送警告 | `system:monitor:alert` |
| `remind` | 发送提醒 | `calendar:event:remind` |

##### 视图操作类

| 动作 | 说明 | 示例 |
|------|------|------|
| `refresh` | 刷新数据 | `dashboard:widget:refresh` |
| `render` | 渲染视图 | `chart:visualization:render` |
| `filter` | 过滤数据 | `table:data:filter` |
| `sort` | 排序数据 | `table:data:sort` |

##### 文件操作类

| 动作 | 说明 | 示例 |
|------|------|------|
| `upload` | 上传文件 | `document:file:upload` |
| `download` | 下载文件 | `document:file:download` |
| `preview` | 预览文件 | `document:file:preview` |
| `compress` | 压缩文件 | `document:file:compress` |

##### 扩展建议

团队可根据业务需求扩展动作词汇，建议遵循以下原则：
- 使用英文动词原形
- 语义明确、无歧义
- 在团队内统一命名规范文档

#### 消息载荷格式

发送方发送的原始数据会被主应用包装后转发给接收方：

```typescript
// 发送方发送
window.$wujie.bus.$emit('portal:form:submit', {
  name: '张三',
  age: 30
});

// 接收方收到的消息格式
{
  from: "system-fusion-input-only",  // 发送方应用ID
  type: "finance:table:receive",     // 转换后的事件类型
  name: "张三",                      // 原始数据被展开
  age: 30,
  timestamp: 1234567890              // 添加时间戳
}
```

### 4. 完整示例

**发送方（表单子应用）**:

```typescript
import React, { useState } from 'react';

const FormComponent = () => {
  const [formData, setFormData] = useState({ name: '', age: 0 });

  const handleSubmit = () => {
    // 发送事件到主应用
    window.$wujie?.bus?.$emit('portal:form:submit', {
      id: Date.now(),
      name: formData.name,
      age: formData.age,
      department: '技术部',
      timestamp: new Date().toISOString(),
    });

    alert('数据已提交');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={e => setFormData({...formData, name: e.target.value})}
      />
      <button type="submit">提交</button>
    </form>
  );
};
```

**接收方（表格子应用）**:

```typescript
import React, { useEffect, useState } from 'react';

const TableComponent = () => {
  const [dataSource, setDataSource] = useState<any[]>([]);

  useEffect(() => {
    if (!window.$wujie?.bus) return;

    const handler = (message: any) => {
      console.log('收到数据:', message);
      // 添加到表格
      setDataSource(prev => [...prev, message]);
    };

    // 监听事件
    window.$wujie.bus.$on('finance:table:receive', handler);

    return () => {
      window.$wujie?.bus?.$off('finance:table:receive', handler);
    };
  }, []);

  return (
    <table>
      <thead>
        <tr>
          <th>姓名</th>
          <th>年龄</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        {dataSource.map(item => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.age}</td>
            <td>{item.timestamp}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## 配置信息提交

### 配置模板

请按照以下 JSON 格式提供您的子应用配置信息：

```json
{
  "id": "your-system-id",
  "name": "您的系统名称",
  "description": "系统功能描述",
  "icon": "FileOutlined",
  "category": "业务分类",
  "modules": [
    {
      "id": "module-id",
      "name": "模块名称",
      "description": "模块功能描述",
      "url": "http://localhost:8083/#/your-page",
      "entry": "http://localhost:8083/",
      "icon": "https://your-domain.com/icon.png",
      "defaultSize": {
        "w": 6,
        "h": 4
      },
      "emittableEvents": [
        {
          "type": "your-system:your-module:submit",
          "name": "数据提交",
          "description": "提交数据到其他应用"
        }
      ],
      "listenableEvents": [
        {
          "type": "your-system:your-module:receive",
          "name": "数据接收",
          "description": "接收来自其他应用的数据"
        }
      ]
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 系统唯一标识，建议使用英文，如 `system-crm` |
| `name` | string | 是 | 系统中文名称 |
| `description` | string | 否 | 系统描述 |
| `icon` | string | 否 | Ant Design 图标名称或图片 URL |
| `category` | string | 是 | 业务分类，如"业务管理"、"数据分析" |
| `modules` | array | 是 | 模块列表 |

#### Module 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 模块唯一标识，如 `customer-list` |
| `name` | string | 是 | 模块中文名称 |
| `description` | string | 否 | 模块描述 |
| `url` | string | 是 | 模块访问地址，完整 URL 包含 hash 路由 |
| `entry` | string | 是 | 应用入口地址，用于加载资源 |
| `icon` | string | 否 | 模块图标 URL |
| `defaultSize` | object | 否 | 默认尺寸，`w` 为宽度（栅格），`h` 为高度（栅格） |
| `emittableEvents` | array | 否 | 可发送的事件列表 |
| `listenableEvents` | array | 否 | 可监听的事件列表 |

#### Event 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 事件类型，格式 `action:entity:appId` |
| `name` | string | 是 | 事件中文名称 |
| `description` | string | 否 | 事件描述 |

### 配置示例

```json
{
  "id": "system-crm",
  "name": "客户关系管理",
  "description": "客户信息、销售线索、合同管理",
  "icon": "CustomerServiceOutlined",
  "category": "业务管理",
  "modules": [
    {
      "id": "customer-list",
      "name": "客户列表",
      "description": "客户基本信息与联系记录",
      "url": "http://localhost:8083/#/customer/list",
      "entry": "http://localhost:8083/",
      "icon": "https://your-cdn.com/customer-icon.png",
      "defaultSize": {
        "w": 8,
        "h": 5
      },
      "emittableEvents": [
        {
          "type": "crm:customer:submit",
          "name": "提交客户数据",
          "description": "提交客户数据到其他系统"
        },
        {
          "type": "crm:customer:select",
          "name": "客户选择",
          "description": "用户选择了某些客户"
        }
      ],
      "listenableEvents": [
        {
          "type": "crm:customer:update",
          "name": "更新客户数据",
          "description": "接收并更新客户数据"
        }
      ]
    },
    {
      "id": "sales-leads",
      "name": "销售线索",
      "description": "销售机会跟踪管理",
      "url": "http://localhost:8083/#/sales/leads",
      "entry": "http://localhost:8083/",
      "defaultSize": {
        "w": 6,
        "h": 4
      },
      "listenableEvents": [
        {
          "type": "crm:leads:receive",
          "name": "接收线索数据",
          "description": "接收新的销售线索"
        }
      ]
    }
  ]
}
```

---

## 测试与验证

### 功能检查清单

- [ ] 子应用能在主应用中正常加载
- [ ] Token 注入成功，API 请求正常
- [ ] 能够发送事件到其他子应用
- [ ] 能够接收来自其他子应用的事件
- [ ] 样式隔离正常，无样式冲突
- [ ] 路由切换正常
- [ ] 独立运行模式正常工作


## 常见问题

### Q1: 子应用加载失败？

**A:** 检查以下几点：
1. 跨域配置是否正确
2. 子应用地址是否可访问
3. 入口文件是否正确导出生命周期函数

### Q2: 无法接收 Token？

**A:**
```typescript
// 检查 Token 是否注入
console.log('Token:', window.$wujie?.props?.token);

// 如果为 undefined，检查主应用配置
```

### Q3: 事件发送后没有收到？

**A:**
1. 检查事件类型是否与配置的 `emittableEvents` 匹配
2. 确认主应用已配置事件路由
3. 查看浏览器控制台的调试日志
4. 接收方检查监听的事件类型是否与 `listenableEvents` 匹配

### Q4: 样式冲突怎么办？

**A:**
1. 使用 CSS Modules
2. 添加命名空间前缀
3. 使用 scoped 样式


## 附录

### 参考文档

- [Wujie 官方文档](https://wujie-micro.github.io/doc/)

### 版本历史

- v1.0.0 (2025-12-02): 初始版本

---

**Portal Engine 技术团队**
© 2025 All Rights Reserved
