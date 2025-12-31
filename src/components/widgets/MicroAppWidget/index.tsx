import React, { useEffect, useState, useMemo } from 'react';
import { Result, Spin, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import WujieReact from 'wujie-react';
import { getToken } from '@/utils/cookie';
import type { MicroAppWidgetConfig, MicroAppModule, Widget } from '@/types';
import { getWidgetDisplayMode } from '@/utils/widgetHelpers';
import type { WidgetSizeInfo } from '@/types/widget-size';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import lifecycles from './lifecycles';
import { useTheme } from '@/theme/useTheme';
import './index.scss';

const { bus, preloadApp } = WujieReact;

interface MicroAppWidgetProps {
  config: MicroAppWidgetConfig;
  widget?: Widget;
}

const MicroAppWidget: React.FC<MicroAppWidgetProps> = ({ config, widget }) => {
  const { themeMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleConfig, setModuleConfig] = useState<MicroAppModule | null>(null);
  const appName = `${config.systemId}-${config.moduleId}`;

  // 计算尺寸信息
  const sizeInfo = useMemo<WidgetSizeInfo | undefined>(() => {
    return widget ? {
      grid: {
        columns: widget.layout.w,
        rows: widget.layout.h
      },
      displayMode: getWidgetDisplayMode(widget.layout.w, widget.layout.h)
    } : undefined;
  }, [widget?.layout.w, widget?.layout.h]);

  const backgroundConfig = useMemo(() => ({
    type: config.backgroundType,
    color: config.backgroundColor,
    image: config.backgroundImage,
    gradient: config.backgroundGradient,
  }), [config.backgroundType, config.backgroundColor, config.backgroundImage, config.backgroundGradient]);

  // 检查模式
  const isGlobalMode = config.mode === 'global';

  // 检测是否需要降级模式
  const degrade = window.localStorage.getItem('degrade') === 'true' || !window.Proxy || !window.CustomElementRegistry;

  const initMicroApp = async () => {
    setLoading(true);
    setError(null);

    try {
      // 检查配置是否完整
      if (!config.systemId || !config.moduleId) {
        throw new Error('微应用配置不完整,请在设置中选择系统和模块');
      }

      // 从配置中心获取模块详细信息
      const module = await microAppConfigLoader.getModule(
        config.systemId,
        config.moduleId
      );
      if (!module) {
        throw new Error('未找到对应的微应用模块配置');
      }

      setModuleConfig(module);

      // 执行预加载
      if (window.localStorage.getItem("preload") !== "false") {
        console.log("执行预加载")
        preloadApp({
          name: appName,
          url: module.url, 
          exec: true
        });
      }

      // 注入 token
      bus.$emit('token:update', getToken());
      bus.$emit('state:change', {
        theme: themeMode,
        __sizeInfo: sizeInfo,
        backgroundConfig
      });
      
      // 注意：这里不设置 loading(false)，等待子应用 afterMount 生命周期触发
    } catch (err: any) {
      console.error('Failed to initialize micro app:', err);
      setError(err.message || '微应用初始化失败');
      setLoading(false);
    }
  };

  useEffect(() => {
    initMicroApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.systemId, config.moduleId]);

  // 监听上下文变化并通知子应用（主题、尺寸、背景）
  useEffect(() => {
    bus.$emit('state:change', {
      theme: themeMode,
      __sizeInfo: sizeInfo,
      backgroundConfig
    });
  }, [themeMode, sizeInfo, backgroundConfig]);

  const handleRetry = () => {
    initMicroApp();
  };

  // 生命周期处理
  const handleAfterMount = (appWindow: Window) => {
    console.log(`[Wujie] ${appName} 挂载完成，关闭 Loading`);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
    lifecycles.afterMount?.(appWindow);
  };

  const handleActivated = (appWindow: Window) => {
    console.log(`[Wujie] ${appName} 激活，确保 Loading 关闭`);
    setLoading(false);
    lifecycles.activated?.(appWindow);
  };

  const handleLoadError = (url: string, e: Error) => {
    console.error(`[Wujie] ${url} 加载失败`, e);
    setError(`加载失败: ${e.message}`);
    setLoading(false);
    lifecycles.loadError?.(url, e);
  }

  // 如果有严重错误导致无法尝试渲染
  if (error && !moduleConfig) {
    return (
      <div className="micro-app-widget-error">
        <Result
          status="error"
          title="微应用加载失败"
          subTitle={error}
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
    <div className={`micro-app-widget-container ${isGlobalMode ? 'global-mode' : ''}`} style={{ position: 'relative' }}>
      {/* Loading 遮罩：覆盖在容器之上 */}
      {loading && (
        <div 
          className="micro-app-widget-loading" 
        >
          <Spin size="large" tip="应用加载中..." />
        </div>
      )}

      {/* Wujie 容器 */}
      {moduleConfig && (
        <div 
          className="nodrag" 
          style={{ width: '100%', height: '100%', opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }}
          onMouseDown={(e) => {
            // 阻止事件冒泡，防止触发 GridStack 拖拽
            e.stopPropagation();
          }}
        >
        <WujieReact
          width="100%"
          height="100%"
          name={appName} 
          url={moduleConfig.url}
          // sync={config.sync}
          sync={false}
          alive={config.alive ?? true}
          degrade={degrade}
          props={{
            ...config.props,
            token: getToken(),
            appId: appName,
            theme: themeMode,
            __sizeInfo: sizeInfo,
            backgroundConfig,
          }}
          // 绑定生命周期
          {...lifecycles}
          // 覆盖特定生命周期以控制 Loading
          afterMount={handleAfterMount}
          activated={handleActivated}
          loadError={handleLoadError}
        />
        </div>
      )}
      
      {/* 如果渲染过程中出错（Wujie 内部错误），显示错误信息 */}
      {error && moduleConfig && (
         <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 101 }}>
            <Result status="error" title="加载异常" subTitle={error} />
         </div>
      )}
    </div>
  );
};

export default MicroAppWidget;
