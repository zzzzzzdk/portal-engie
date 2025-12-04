import React, { useEffect, memo } from 'react';
import WujieReact from 'wujie-react';
import { useNavigate } from "react-router-dom";
import lifecycles from './lifecycles';
import { getToken } from '@/utils';
import { MicroAppWidgetConfig } from '@/types';
import "./index.scss"

const { setupApp, preloadApp } = WujieReact;

export interface MicroAppConfigProps {
  baseRouter?: string;
  height?: string;
  width?: string;
  name: string;
  loading?: React.ReactNode;
  url: string;
  alive?: boolean;
  fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  props?: { [key: string]: any };
  attrs?: { [key: string]: any };
  replace?: (code: string) => string;
  sync?: boolean;
  prefix?: { [key: string]: string };
  fiber?: boolean;
  degrade?: boolean;
  plugins?: any[]; // 修正类型定义
  beforeLoad?: () => void;
  beforeMount?: () => void;
  afterMount?: () => void;
  beforeUnmount?: () => void;
  afterUnmount?: () => void;
  activated?: () => void;
  deactivated?: () => void;
  loadError?: () => void;
}

interface MicroAppProps {
  // appName: string; // 微前端应用的名称
  microAppConfig?: MicroAppConfigProps; // 传递给微前端应用的参数
  config?: MicroAppWidgetConfig; // 兼容从父组件传入的 Widget 配置
  // 回调，后续增加。
  onChange?: (action: string, data: any) => void;
}

const MicroApp: React.FC<MicroAppProps> = memo(({ onChange: _onChange, microAppConfig: propsConfig, config: widgetConfig }) => {
  const navigation = useNavigate();

  // 适配逻辑：如果传了 config (WidgetConfig)，将其转换为 MicroAppConfigProps
  const adaptedConfig: MicroAppConfigProps | undefined = widgetConfig ? {
    name: (widgetConfig.systemId && widgetConfig.moduleId) 
      ? `${widgetConfig.systemId}-${widgetConfig.moduleId}` 
      : (widgetConfig.name || 'unknown-app'),
    url: widgetConfig.microAppUrl || widgetConfig.url || '',
    props: widgetConfig.props,
    alive: widgetConfig.alive,
    sync: widgetConfig.sync,
    degrade: widgetConfig.mode === 'global' ? false : undefined, // 全局模式通常不降级，或者根据需要配置
  } : undefined;

  // 调试配置（保留用户习惯的本地调试地址作为默认值）
  // 当外部未传入配置时，使用此默认配置
  const defaultConfig: MicroAppConfigProps = {
    url: 'http://192.168.13.31:3010/#/home',
    name: 'sssss', // 建议改为更有意义的名字，如 'portal-demo'
    alive: true
  };

  // 合并配置：优先使用 propsConfig，其次使用适配后的 adaptedConfig，最后使用默认值
  // 使用展开运算符合并，确保默认值生效，避免因缺少属性导致 undefined
  const microAppConfig = { 
    ...defaultConfig, 
    ...(adaptedConfig || {}), 
    ...(propsConfig || {}) 
  };
  
  // 提取路由路径
  // 注意：这种 split 方式依赖于 url 包含 '#/'，如果 url 是纯路径可能会有问题
  // 建议优化：如果 url 不含 #，则 path 为空或处理默认逻辑
  const path = microAppConfig.url.includes('#/') ? microAppConfig.url.split('#/')[1] : '';

  // 降级设置：优先读取配置中的 degrade，其次读取 localStorage，最后检查环境兼容性
  const isDegrade = microAppConfig.degrade || 
                   window.localStorage.getItem("degrade") === "true" || 
                   !window.Proxy || 
                   !window.CustomElementRegistry;

  const props = {
    token: getToken(),
    // 补充常用属性，避免子应用因缺少 ID 显示 undefined
    appId: microAppConfig.name,
    jump: (name: string) => {
      console.log(`${window.location.origin}/${name}`)
      navigation(`${name}`)
    },
    ...microAppConfig.props // 合并配置中的 props
  };

  useEffect(() => {
    // 排除 setupApp 不支持或类型不兼容的 React 属性
    const { loading, ...configForSetup } = microAppConfig;
    
    // 初始化配置
    setupApp({
      ...lifecycles,
      ...configForSetup, // 允许覆盖其他配置
      // 显式指定关键属性以确保正确性
      name: microAppConfig.name,
      url: microAppConfig.url,
      exec: true, 
      alive: microAppConfig.alive ?? true,
      degrade: isDegrade,
    });

    // 预加载处理
    if (window.localStorage.getItem("preload") !== "false") {
      console.log("执行预加载:", microAppConfig.name);
      preloadApp({
        name: microAppConfig.name,
        url: microAppConfig.url,
        exec: true
      });
    }

    // 路由同步
    if (path) {
      // 稍微延迟一下以确保子应用已准备好接收事件
      setTimeout(() => {
        WujieReact.bus.$emit("subApp:routerChange", path);
      }, 100);
    }

    // 卸载时的清理工作（可选，如果开启保活通常不销毁）
    // return () => {
    //   if (!microAppConfig.alive) {
    //     destroyApp(microAppConfig.name);
    //   }
    // };
  }, [microAppConfig.name, microAppConfig.url]); // 仅在关键配置变化时重新 setup

  return (
    <div className="micro-app-container" style={{ width: '100%', height: '100%' }}>
      <WujieReact
        width="100%"
        height="100%"
        name={microAppConfig.name}
        url={microAppConfig.url}
        alive={microAppConfig.alive ?? true}
        degrade={isDegrade}
        props={props}
        // 如果有 plugins 也可以在这里传递
        // plugins={microAppConfig.plugins}
      />
    </div>
  );
});

export default MicroApp;
