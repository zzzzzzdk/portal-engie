import React, { useEffect, useState } from 'react';
import { Result, Spin, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import WujieReact from 'wujie-react';
import { getToken } from '@/utils/cookie';
import type { MicroAppWidgetConfig, MicroAppModule } from '@/types';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import lifecycles from './lifecycles';
import './index.scss';

const { bus, setupApp, preloadApp } = WujieReact;

interface MicroAppWidgetProps {
  config: MicroAppWidgetConfig;
}

const MicroAppWidget: React.FC<MicroAppWidgetProps> = ({ config }) => {
  console.log(config)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleConfig, setModuleConfig] = useState<MicroAppModule | null>(null);
  const appName = `${config.systemId}-${config.moduleId}`;

  // 检测是否需要降级模式
  // 如果子应用未适配 Wujie,强制使用 iframe 降级模式
  // const degrade = true; // 强制使用 iframe 降级模式,确保兼容性
  const degrade = window.localStorage.getItem('degrade') === 'true' || !window.Proxy || !window.CustomElementRegistry;

  const initMicroApp = async () => {
    setLoading(true);
    setError(null);

    try {
      // 检查配置是否完整
      if (!config.systemId || !config.moduleId) {
        setError('微应用配置不完整,请在设置中选择系统和模块');
        setLoading(false);
        return;
      }

      // 从配置中心获取模块详细信息
      const module = await microAppConfigLoader.getModule(
        config.systemId,
        config.moduleId
      );
      if (!module) {
        setError('未找到对应的微应用模块配置');
        setLoading(false);
        return;
      }

      setModuleConfig(module);

      // 设置微应用名称

      setupApp({
        name: appName,
        url: module.url,
        exec: true,
        alive: true,
        degrade,
        ...lifecycles
      });

      if (window.localStorage.getItem("preload") !== "false") {
        console.log("执行预加载")
        preloadApp({
          name: appName,
          exec: true
        });
      }

      // 注入 token
      bus.$emit('subApp:setToken', getToken());

      setLoading(false);
    } catch (err: any) {
      console.error('Failed to initialize micro app:', err);
      setError(err.message || '微应用初始化失败');
      setLoading(false);
    }
  };

  useEffect(() => {
    initMicroApp();

    // }, [config.systemId, config.moduleId]);
  }, []);

  const handleRetry = () => {
    initMicroApp();
  };

  if (loading) {
    return (
      <div className="micro-app-widget-loading">
        <Spin size="large" tip="加载微应用中..." />
      </div>
    );
  }

  if (error || !moduleConfig) {
    return (
      <div className="micro-app-widget-error">
        <Result
          status="error"
          title="微应用加载失败"
          subTitle={error || '未知错误'}
          extra={
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetry}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="micro-app-widget-container">
      <WujieReact
        width="100%"
        height="100%"
        name={appName}  // 必须与 setupApp 的 name 一致
        url={moduleConfig.url}
        // sync={config.sync !== false}
        sync={false}
        alive={true}
        // alive={config.alive !== false}
        degrade={degrade}
        props={{
          ...config.props,
          token: getToken(),
          appId: appName,
        }}
      />
    </div>
  );
};

export default MicroAppWidget;
