interface WujieWindow extends Window {
  __WUJIE_ID__?: string;
  __WUJIE_NAME__?: string;
}

const getAppName = (appWindow?: WujieWindow | null): string => {
  if (!appWindow) {
    return 'MicroApp';
  }

  return appWindow.__WUJIE_ID__ || appWindow.__WUJIE_NAME__ || 'MicroApp';
};

const lifecycles = {
  beforeLoad: (appWindow?: WujieWindow | null) => {
    console.log(`[Wujie] ${getAppName(appWindow)} beforeLoad`);
  },
  beforeMount: (appWindow?: WujieWindow | null) => {
    const appName = getAppName(appWindow);
    console.log(`[Wujie] ${appName} beforeMount`);
  },
  afterMount: (appWindow?: WujieWindow | null) => {
    console.log(`[Wujie] ${getAppName(appWindow)} afterMount`);
  },
  beforeUnmount: (appWindow?: WujieWindow | null) => {
    console.log(`[Wujie] ${getAppName(appWindow)} beforeUnmount`);
  },
  afterUnmount: (appWindow?: WujieWindow | null) => {
    console.log(`[Wujie] ${getAppName(appWindow)} afterUnmount`);
  },
  activated: (appWindow?: WujieWindow | null) => {
    console.log(`[Wujie] ${getAppName(appWindow)} activated`);
  },
  deactivated: (appWindow?: WujieWindow | null) => {
    console.log(`[Wujie] ${getAppName(appWindow)} deactivated`);
  },
  loadError: (url: string, error: Error) => {
    console.error(`[Wujie] ${url} 加载失败`, error);
  },
};

export default lifecycles;
