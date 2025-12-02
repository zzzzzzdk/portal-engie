import React, { useEffect, memo } from "react";
import WujieReact from "wujie-react";
import { useNavigate } from "react-router-dom";
import lifecycles from "./lifecycles";
import { getToken } from "@/utils/cookie";
import "./index.scss";

// 微应用配置参数接口
export interface MicroAppConfigProps {
  baseRouter?: string;
  height?: string;
  width?: string;
  name: string;
  loading?: React.ReactNode;
  url: string;
  alive?: boolean;
  fetch?: () => void;
  props?: object;
  attrs?: object;
  replace?: () => void;
  sync?: boolean;
  prefix?: object;
  fiber?: boolean;
  degrade?: boolean;
  plugins?: string[];
  beforeLoad?: () => void;
  beforeMount?: () => void;
  afterMount?: () => void;
  beforeUnmount?: () => void;
  afterUnmount?: () => void;
  activated?: () => void;
  deactivated?: () => void;
  loadError?: () => void;
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

      // 事件处理函数
      const handleLogin = (data: any) => {
        // 处理登录逻辑，比如刷新用户信息、跳转首页等
      };

      const handleLogout = () => {
        // 处理登出逻辑，比如清空用户信息、跳转登录页等
        console.log("收到子应用登出事件");
      };

      // 事件监听
      WujieReact.bus.$on("mainApp:login", handleLogin);
      WujieReact.bus.$on("mainApp:logout", handleLogout);

      return () => {
        // 清理事件监听
        WujieReact.bus.$off("mainApp:login", handleLogin);
        WujieReact.bus.$off("mainApp:logout", handleLogout);
      };
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