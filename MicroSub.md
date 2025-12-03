# 无界(wujie)微前端子应用改造指南

## 目录
1. [概述](#概述)
2. [项目类型检查](#项目类型检查)
3. [跨域设置](#跨域设置)
4. [入口文件改造](#入口文件改造)
5. [处理全局变量](#处理全局变量)
6. [路由适配](#路由适配)
7. [数据获取和通信改造](#数据获取和通信改造)
8. [统一配置管理](#统一配置管理)
9. [处理保活模式下的路由恢复](#处理保活模式下的路由恢复)
10. [处理样式冲突](#处理样式冲突)
11. [测试与验证](#测试与验证)
12. [常见问题解答](#常见问题解答)

## 概述

本指南详细说明了如何将现有应用改造为基于无界(wujie)微前端框架的子应用，包括跨域设置、入口改造、路由适配、通信机制等关键步骤。通过遵循本指南，您将能够确保应用在无界微前端环境中正常运行，同时保留其独立运行能力。

## 项目类型检查

### 任务说明：检查项目是否有 tsconfig.json 文件，确定项目类型（JavaScript/TypeScript）

**实现要点：**

- 如项目为 JS 项目，使用 JS/JSX 语法进行改造
- 如为 TS 项目，使用 TS/TSX 语法进行改造


## 跨域设置

### 任务说明：配置开发和生产环境的跨域设置，确保主应用能够正常加载和通信子应用
### 1.1 开发环境配置
### 开发环境配置
#### Webpack项目

文件路径：`webpack.config.js`

```javascript
module.exports = {
  // ...其他配置
  devServer: {
    // ...其他devServer配置
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
  },
};
```

#### Vite项目

文件路径：`vite.config.ts`

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  // ...其他配置
  server: {
    // ...其他server配置
    cors: true,
    // 或者更详细的配置
    // headers: {
    //   'Access-Control-Allow-Origin': '*',
    //   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    //   'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    // },
  },
});
```

### 生产环境配置
确保服务器响应头包含：

```plain
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: X-Requested-With, content-type, Authorization
```

### 本地模拟接口允许跨域

文件路径：`mock/app.js`

```javascript
const express = require('express');
const cors = require('cors');
var app = express();
// 使用默认的cors配置
app.use(cors());
```

## 入口文件改造(无界生命周期改造)

### 任务说明：修改应用入口文件，实现无界微前端的挂载和卸载生命周期函数

文件路径：`src/main.tsx` 或 `src/index.tsx`

```typescript
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)

if (window.__POWERED_BY_WUJIE__) {
  window.__WUJIE_MOUNT = () => {
    root.render(
      <Provider store={store}>
        <APPRouter />
        <Update />
      </Provider>
    );
  };
  window.__WUJIE_UNMOUNT = () => {
    root.unmount();
  };
} else {
  root.render(
    <Provider store={store}>
      <APPRouter />
      <Update />
    </Provider>
  );
}
```

## 处理全局变量

### 任务说明：检查并修改全局变量定义，确保在无界隔离环境中能正确访问和使用全局变量
### 3.1 检查 HTML 中的全局变量定义

文件路径：`public/index.html`



```html
<!-- 修改前 -->
  <script>
    var globalConfig = { /* 配置内容 */ };
  </script>

  <!-- 修改后 -->
    <script>
      window.globalConfig = { /* 配置内容 */ };
    </script>
```

### 3.2 检查代码中的全局变量引用

**最佳实践：** 始终使用 `window.` 前缀访问全局变量，避免直接引用未明确挂载到window的变量

确保使用 `window.` 前缀访问全局变量：

```jsx
// 修改前
const apiUrl = globalConfig.apiUrl;

// 修改后
const apiUrl = window.globalConfig?.apiUrl;
```

## 路由适配

### 任务说明：修改应用路由配置，支持在无界环境中正确运行，并适配嵌入模式和独立运行模式
### 4.1 创建无布局组件（用于嵌入模式）

当子应用以嵌入模式运行时，通常不需要显示完整布局，只需展示核心内容区域
文件路径：`src/components/NoLayout.tsx`

```tsx
import React from "react";
import { Outlet } from 'react-router-dom'
import './index.scss'

export default function NoLayout() {
  return (
    <div className="no-layout-con">{<Outlet />}</div>
  )
}
```

文件路径：`src/components/NoLayout.scss`（可选）

```scss
// @import "../../assets/css/mixin.scss";

.no-layout-con {
  width: 100%;
  height: 100%;
  // @include scrollBar();
}
```

### 4.2 修改路由配置

根据运行环境动态切换布局组件，实现不同模式下的路由适配

文件路径：`src/routes/index.tsx` 或路由配置文件，下面只是例子，可做参考。

```tsx
import NoLayout from '@/components/NoLayout';
import Layout from '@/components/Layout';

// 判断是否运行在无界环境中
const isInWujie = window.__POWERED_BY_WUJIE__;

// 路由配置 - 根据运行环境动态调整
const routes = [
  // 公共路由
  { path: '/error', element: <ErrorPage /> },
  { path: '/404', element: <NotFoundPage /> },
  {
    path: '/',
    element: isInWujie ? <NoLayout><Home /></NoLayout> : <Layout><Home /></Layout>,
  },
  {
    path: '/about',
    element: isInWujie ? <NoLayout><About /></NoLayout> : <Layout><About /></Layout>,
  },
  // 专门为嵌入模式设计的路由
  {
    path: '/embed',
    element: <NoLayout><EmbeddedComponent /></NoLayout>,
  },
  // ...其他路由
];

export default routes;
```

## 数据获取和通信改造

### 任务说明：改造数据获取方式和通信机制，支持与主应用的数据交互和事件通信
### 5.1 创建配置获取工具函数

文件路径：`src/utils/config.ts`

```typescript
// 获取主应用配置
export const getMainAppConfig = () => {
  if (window.__POWERED_BY_WUJIE__) {
    // 从无界Props或主应用注入的全局变量获取配置
    return {
      token: window.$wujie?.props?.token,
      apiBaseUrl: window.$wujie?.props?.apiBaseUrl || window.mainAppConfig?.mainAppApiBase,
      userInfo: window.$wujie?.props?.userInfo,
      // 其他配置...
    };
  } else {
    // 独立运行时从本地获取配置
    return {
      token: localStorage.getItem('token'),
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
      userInfo: JSON.parse(localStorage.getItem('userInfo') || '{}'),
      // 其他配置...
    };
  }
};

// 获取Token
export const getToken = () => {
  return window.__POWERED_BY_WUJIE__ ? 
    window.$wujie?.props?.token : 
    localStorage.getItem('token');
};
```

### 5.2 子应用向主应用发送事件

文件路径：`src/utils/eventBus.ts`

```typescript
// 子应用事件总线
export const subAppEventBus = {
  // 通知主应用登录
  notifyLogin: (userData: any) => {
    if (window.__POWERED_BY_WUJIE__) {
      window.$wujie?.bus.$emit('subApp:login', userData);
    } else {
      console.log('独立运行模式: 登录事件', userData);
    }
  },

  // 通知主应用登出
  notifyLogout: () => {
    if (window.__POWERED_BY_WUJIE__) {
      window.$wujie?.bus.$emit('subApp:logout');
    } else {
      console.log('独立运行模式: 登出事件');
    }
  },

  // 通知主应用路由变化
  notifyRouteChange: (path: string) => {
    if (window.__POWERED_BY_WUJIE__) {
      window.$wujie?.bus.$emit('subApp:routeChange', path);
    }
  },

  // 其他事件...
};

// 在组件中使用示例
// import { subAppEventBus } from '@/utils/eventBus';
// subAppEventBus.notifyLogin(userData);
```

### 5.3 监听主应用事件

文件路径：`src/hooks/useMainAppEvents.ts`

```typescript
import { useEffect } from 'react';

// 监听主应用事件的Hook
export const useMainAppEvents = () => {
  useEffect(() => {
    if (!window.__POWERED_BY_WUJIE__) return;

    // 监听主应用的路由变化事件
    const handleRouterChange = (path: string) => {
      // 处理主应用下发的路由变化
      console.log('主应用要求跳转到:', path);
      // 实际处理逻辑，例如使用history跳转
    };

    // 监听主应用的全局数据更新
    const handleDataUpdate = (data: any) => {
      console.log('主应用下发新数据:', data);
      // 更新子应用内的数据
    };

    window.$wujie?.bus.$on('mainApp:routerChange', handleRouterChange);
    window.$wujie?.bus.$on('mainApp:dataUpdate', handleDataUpdate);

    // 清理监听器
    return () => {
      window.$wujie?.bus.$off('mainApp:routerChange', handleRouterChange);
      window.$wujie?.bus.$off('mainApp:dataUpdate', handleDataUpdate);
    };
  }, []);
};

// 在组件中使用
// import { useMainAppEvents } from '@/hooks/useMainAppEvents';
// useMainAppEvents();
```

## 统一配置管理

### 任务说明：创建统一配置中心，集中管理主应用和子应用之间的配置信息，实现配置的统一获取和使用

文件路径：`src/config/mainApp.config.ts`

```typescript
// 子应用统一配置中心
const isInWujie = window.__POWERED_BY_WUJIE__;
// 获取主应用origin，独立运行时使用本地开发环境
const mainAppOrigin = isInWujie ? window.parent.location.origin : 'http://localhost:8081';

const mainAppConfig = {
  // 运行环境
  isInWujie,

  // 主应用基本信息
  mainAppBaseUrl: mainAppOrigin,
  mainAppApiBase: isInWujie ? `${mainAppOrigin}/api` : '/api',

  // 主应用页面地址
  mainAppLoginUrl: `${mainAppOrigin}/login`,
  mainAppLogoutUrl: `${mainAppOrigin}/logout`,
  mainAppHomeUrl: `${mainAppOrigin}/home`,

  // 事件通信配置
  events: {
    login: 'mainApp:login',
    logout: 'mainApp:logout',
    routeChange: 'mainApp:routeChange',
    dataUpdate: 'mainApp:dataUpdate',
    // 子应用发出的事件
    subAppLogin: 'subApp:login',
    subAppLogout: 'subApp:logout',
    subAppRouteChange: 'subApp:routeChange',
  },

  // 功能开关（可根据主应用配置覆盖）
  features: {
    enableExport: true,
    enableImport: true,
    // 其他功能开关...
  },
};

// 挂载到全局，方便访问
window.mainAppConfig = mainAppConfig;

export default mainAppConfig;
```

### 6.1 在应用中使用配置

```tsx
import mainAppConfig from '@/config/mainApp.config';

// 使用示例
const apiUrl = `${mainAppConfig.mainAppApiBase}/user/profile`;
const loginUrl = mainAppConfig.mainAppLoginUrl;
```

## 处理保活模式下的路由恢复

### 任务说明：实现保活模式下的路由恢复功能，确保子应用在被切出后再切入时能正确恢复到之前的路由状态
### 注意事项：react-router-dom的路由跳转API在不同版本间存在较大差异，需根据项目依赖版本选择合适的实现方式

#### 常见版本及路由跳转方式：
- **v5及以下版本**：使用`useHistory`钩子获取history对象，通过`history.push(path)`进行路由跳转
- **v6及以上版本**：使用`useNavigate`钩子获取navigate函数，通过`navigate(path)`进行路由跳转

> 查看项目版本方法：
> - 检查package.json文件中的`react-router-dom`依赖版本
> - 使用命令：`npm list react-router-dom` 或 `yarn list react-router-dom`

文件路径：`src/hooks/useKeepAliveRouter.ts`

```typescript
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// 保活模式下的路由恢复Hook
export const useKeepAliveRouter = (appName: string) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!window.__POWERED_BY_WUJIE__) return;

    // 应用初始化时，向主应用发送当前路由
    window.$wujie?.bus.$emit(`${appName}-current-route`, location.pathname);

    // 监听主应用下发的路由变化事件
    const handleRouterChange = (path: string) => {
      console.log(`${appName} 收到路由变化:`, path);
      if (path && path !== location.pathname) {
        navigate(path);
      }
    };

    window.$wujie?.bus.$on(`${appName}-router-change`, handleRouterChange);

    // 清理监听器
    return () => {
      window.$wujie?.bus.$off(`${appName}-router-change`, handleRouterChange);
    };
  }, [appName, navigate, location]);
};

// 在子应用根组件中使用
// useKeepAliveRouter('your-app-name');
```

## 处理样式冲突

### 任务说明：解决主应用和子应用之间的样式冲突问题，确保子应用样式不影响主应用，反之亦然

### 使用CSS Modules或命名空间

文件路径：`src/index.scss`（或主要样式文件）
```scss
/* 使用命名空间隔离子应用样式 */
.sub-app-container {
  /* 子应用样式 */
}

/* 或使用CSS Modules */
.container {
  color: #333;
}
```

### 修改构建工具配置

#### Webpack项目

文件路径：`webpack.config.js`
```javascript
module.exports = {
  // ...其他配置
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
            },
          },
          'sass-loader',
        ],
      },
    ],
  },
};
```

#### Vite项目

文件路径：`vite.config.ts`
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  // ...其他配置
  css: {
    modules: {
      scopeBehaviour: 'local',
    },
  },
});
```
```scss
// 添加作用域前缀，防止样式污染主应用
// 只有当运行在微前端环境中时才添加前缀
@if variable-exists(__POWERED_BY_WUJIE__) {
  .sub-app {
    // 所有子应用的样式都放在这个类下
    @import 'components/**/*.scss';
    @import 'pages/**/*.scss';
    // 其他样式导入...
  }
} @else {
  // 独立运行时的样式导入
  @import 'components/**/*.scss';
  @import 'pages/**/*.scss';
// 其他样式导入...
}

// 或者在body上添加类名区分
body.sub-app {
  // 子应用样式
}
```

### 在入口文件中添加类名

```tsx
// 在入口文件（main.tsx/index.tsx）中添加
if (window.__POWERED_BY_WUJIE__) {
  document.body.classList.add('sub-app');
  document.body.classList.add('sub-app-' + window.__WUJIE_ID__);
}
```

