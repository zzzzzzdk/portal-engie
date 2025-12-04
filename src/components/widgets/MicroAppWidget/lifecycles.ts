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
    const appName = getAppName(appWindow);
    console.log(`[Wujie] ${appName} beforeMount`);
    
    // 诊断代码：检查 DOM 结构
    // try {
      // const rootElement = appWindow.document.getElementById('root');
      // console.log(`[Wujie 诊断] ${appName} #root 元素状态:`, rootElement ? '存在' : '不存在');
      
      // if (!rootElement) {
        // console.warn(`[Wujie 诊断] ${appName} 警告: 找不到 #root 元素!`);
        // console.log(`[Wujie 诊断] ${appName} body 内容预览:`, appWindow.document.body.innerHTML.slice(0, 500));
        
        // 自动修复逻辑已移除，建议在子应用中处理挂载点问题
        // const newRoot = appWindow.document.createElement('div'); ...

        // 尝试查找其他可能的挂载点
        // const appElement = appWindow.document.getElementById('app');
        // if (appElement) {
        //   console.log(`[Wujie 诊断] ${appName} 发现 #app 元素，可能是挂载点 ID 不匹配`);
        // }
      // }
    // } catch (e) {
      // console.error(`[Wujie 诊断] ${appName} 检查 DOM 失败:`, e);
    // }
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
