// 扩展Window类型以支持wujie的__WUJIE_ID__属性
interface WujieWindow extends Window {
  __WUJIE_ID__?: string;
}

// 微应用生命周期钩子定义
const lifecycles = {
  beforeLoad: (appWindow: WujieWindow) => {
    console.log(`${appWindow.__WUJIE_ID__} beforeLoad`);
  },
  beforeMount: (appWindow: WujieWindow) => {
    console.log(`${appWindow.__WUJIE_ID__} beforeMount`);
  },
  afterMount: (appWindow: WujieWindow) => {
    console.log(`${appWindow.__WUJIE_ID__} afterMount`);
  },
  beforeUnmount: (appWindow: WujieWindow) => {
    console.log(`${appWindow.__WUJIE_ID__} beforeUnmount`);
  },
  afterUnmount: (appWindow: WujieWindow) => {
    console.log(`${appWindow.__WUJIE_ID__} afterUnmount`);
  },
  activated: (appWindow: WujieWindow) => {
    console.log(`${appWindow.__WUJIE_ID__} activated`);
  },
  deactivated: (appWindow: WujieWindow) => {
    console.log(`${appWindow.__WUJIE_ID__} deactivated`);
  },
  loadError: (url: string, e: Error) => {
    console.log(`${url} 加载失败`, e);
  },
};

export default lifecycles;