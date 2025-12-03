# 无界(wujie)微前端主应用改造指令

## 概述

本指令文档详细说明了如何将现有单体应用改造为基于无界(wujie)微前端框架的主应用，包括依赖安装、组件封装、路由改造、通信机制等关键步骤。

## 1. 关键特性要求

### 任务说明
检查项目是否有 tsconfig.json 文件，如果没有，接下来的改造都不使用 ts 语法。

**必须实现的关键特性：**

- 计划实现自适应代码转换：如项目为 JS 项目，自动转化为 JSX 语法；如为 TS 项目，自动转化为 TSX 语法
- 完整实现微应用加载、通信、路由管理等核心功能

## 2. 安装依赖

### 任务说明
安装无界微前端框架的 React 封装依赖包

根据项目`package.json`文件显示，当前项目未安装`wujie-react`依赖，使用 npm 作为包管理器。

```bash
# 在主应用根目录下执行
npm install wujie-react
```

**注意事项：**

- 确保 Node.js 版本 >= 14.0.0（项目未明确指定 Node.js 版本要求，但无界微前端推荐此版本）
- 安装完成后，可在`package.json`文件的`dependencies`字段中验证是否成功添加`wujie-react`依赖

## 3. 创建微应用封装组件

### 任务说明
创建一个封装无界微应用的 React 组件，实现微应用的加载、通信和生命周期管理

### 文件路径
`src/components/MicroApp/index.tsx` 或 `src/components/MicroApp/index.jsx`

```tsx
import React, { useEffect, useRef, memo, ReactNode } from "react";
import WujieReact from "wujie-react";
import { useNavigate } from "react-router-dom";
import lifecycles from "./lifecycles";
import { getToken } from "@/utils/cookie";
import "./index.scss";

// 微应用配置参数接口
export interface MicroAppConfigProps {
  baseRouter?: string;
  height: string;
  width: string;
  name: string;
  loading: React.ReactNode;
  url: string;
  alive: boolean;
  fetch: () => void;
  props: object;
  attrs: object;
  replace: () => void;
  sync: boolean;
  prefix: object;
  fiber: boolean;
  degrade: boolean;
  plugins: string[];
  beforeLoad: () => void;
  beforeMount: () => void;
  afterMount: () => void;
  beforeUnmount: () => void;
  afterUnmount: () => void;
  activated: () => void;
  deactivated: () => void;
  loadError: () => void;
}

const { bus, setupApp, preloadApp, destroyApp } = WujieReact;

// 微应用组件属性接口
interface MicroAppProps {
  // 微前端应用的配置参数
  microAppConfig: MicroAppConfigProps;
  // 微应用数据变化回调
  onChange?: (data: any) => void;
}

// 微应用封装组件
const MicroApp: React.FC<MicroAppProps> = memo(
  ({ microAppConfig, onChange }) => {
    const navigation = useNavigate();
    const degrade =
      window.localStorage.getItem("degrade") === "true" ||
      !window.Proxy ||
      !window.CustomElementRegistry;

    const path = microAppConfig.url.split("#/")[1];
    const props = {
      jump: (name: string) => {
        // window.open(`${name}`);
        console.log(`${window.location.origin}/${name}`);
        navigation(`${name}`);
      },
    };

    useEffect(() => {
      setupApp({
        name: microAppConfig.name,
        url: microAppConfig.url,
        exec: true,
        alive: true,
        degrade,
        ...lifecycles,
      });

      if (window.localStorage.getItem("preload") !== "false") {
        console.log("执行预加载");
        preloadApp({
          name: microAppConfig.name,
          exec: true,
        });
      }
      // 告诉子应用要跳转哪个路由
      path && WujieReact.bus.$emit("router-change", path);

      // 下发token给子应用
      bus.$emit("subApp:setToken", getToken());

      // 事件监听
      WujieReact.bus.$on("mainApp:login", (data: any) => {
        // 处理登录逻辑，比如刷新用户信息、跳转首页等
      });

      // 监听子应用发来的登出事件
      WujieReact.bus.$on("mainApp:logout", () => {
        // 处理登出逻辑，比如清空用户信息、跳转登录页等
        console.log("收到子应用登出事件");
      });
    }, []);

    return (
      <>
        <WujieReact
          width="100%"
          height="100%"
          name={microAppConfig.name}
          url={microAppConfig.url}
          sync={microAppConfig.sync || !path}
          alive={true}
          props={props}
          // plugins={plugins}
        />
      </>
    );
  }
);

export default MicroApp;
```

## 3.2 创建生命周期钩子文件

### 任务说明
定义微应用的生命周期钩子函数，用于在微应用加载、挂载、卸载等阶段执行特定逻辑

### 文件路径
`src/components/MicroApp/lifecycles.ts` 或 `src/components/MicroApp/lifecycles.js`

```tsx
// 微应用生命周期钩子定义
const lifecycles = {
  beforeLoad: (appWindow: Window) => {
    console.log(`${appWindow.__WUJIE_ID__} beforeLoad`);
  },
  beforeMount: (appWindow: Window) => {
    console.log(`${appWindow.__WUJIE_ID__} beforeMount`);
  },
  afterMount: (appWindow: Window) => {
    console.log(`${appWindow.__WUJIE_ID__} afterMount`);
  },
  beforeUnmount: (appWindow: Window) => {
    console.log(`${appWindow.__WUJIE_ID__} beforeUnmount`);
  },
  afterUnmount: (appWindow: Window) => {
    console.log(`${appWindow.__WUJIE_ID__} afterUnmount`);
  },
  activated: (appWindow: Window) => {
    console.log(`${appWindow.__WUJIE_ID__} activated`);
  },
  deactivated: (appWindow: Window) => {
    console.log(`${appWindow.__WUJIE_ID__} deactivated`);
  },
  loadError: (url: string, e: Error) => {
    console.log(`${url} 加载失败`, e);
  },
};

export default lifecycles;
```

## 3.3 创建样式文件

### 任务说明
创建一个样式文件，用于定义微应用组件的样式

### 文件路径
`src/components/MicroApp/index.scss`

```scss
.micro-app-wrap {
  iframe {
    border: none;
  }
}

wujie-app {
  width: 100%;
  height: 100%;
}
```

## 总结

1. 本指令文档提供了将现有单体应用改造为无界(wujie)微前端主应用的完整步骤
2. 关键改造点包括：依赖安装、微应用封装组件创建、局部嵌入和通信机制实现
3. 改造后的主应用将支持微应用的加载、卸载、通信和路由同步等功能
4. 请根据项目实际情况调整文件路径和代码实现细节

## 注意事项

- 确保无界微前端版本与项目其他依赖版本兼容
- 在生产环境中建议关闭微应用的控制台日志输出
- 对于复杂的微应用通信场景，考虑使用更完善的状态管理方案
- 微应用和主应用之间的样式隔离需要额外配置
- 确保所有微应用都正确注册并遵循主应用的通信协议
