// 扩展Window类型以支持wujie的属性
interface WujieWindow extends Window {
  __WUJIE_ID__?: string;
  __WUJIE_NAME__?: string;
}

// 获取应用名称的辅助函数
const getAppName = (appWindow: WujieWindow): string => {
  return appWindow.__WUJIE_ID__ || appWindow.__WUJIE_NAME__ || 'MicroApp';
};

// 微应用生命周期钩子定义
const lifecycles = {
  beforeLoad: (appWindow: WujieWindow) => {
    console.log(`[Wujie] ${getAppName(appWindow)} beforeLoad`);
  },
  beforeMount: (appWindow: WujieWindow) => {
    console.log(`[Wujie] ${getAppName(appWindow)} beforeMount`);
  },
  afterMount: (appWindow: WujieWindow) => {
    console.log(`[Wujie] ${getAppName(appWindow)} afterMount`);
  },
  beforeUnmount: (appWindow: WujieWindow) => {
    console.log(`[Wujie] ${getAppName(appWindow)} beforeUnmount`);
  },
  afterUnmount: (appWindow: WujieWindow) => {
    console.log(`[Wujie] ${getAppName(appWindow)} afterUnmount`);
  },
  activated: (appWindow: WujieWindow) => {
    console.log(`[Wujie] ${getAppName(appWindow)} activated`);
  },
  deactivated: (appWindow: WujieWindow) => {
    console.log(`[Wujie] ${getAppName(appWindow)} deactivated`);
  },
  loadError: (url: string, e: Error) => {
    console.error(`[Wujie] ${url} 加载失败`, e);
  },
};

export default lifecycles;