import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Result, Spin, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import WujieReact from 'wujie-react';
import { getToken } from '@/utils/cookie';
import type { MicroAppWidgetConfig, MicroAppModule, Widget } from '@/types';
import { getWidgetDisplayMode } from '@/utils/widgetHelpers';
import type { WidgetSizeInfo } from '@/types/widget-size';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import lifecycles from './lifecycles';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import './index.scss';

const { bus, preloadApp } = WujieReact;

interface MicroAppWidgetProps {
  config: MicroAppWidgetConfig;
  widget?: Widget;
}

type ExportMicroAppState = 'loading' | 'ready' | 'error';

interface ExportAwareWindow extends Window {
  __DASHBOARD_EXPORT_MICRO_APPS__?: Record<string, ExportMicroAppState>;
}

const syncExportMicroAppState = (
  id: string,
  state: ExportMicroAppState,
  appName: string,
  container: HTMLDivElement | null
) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const currentWindow = window as ExportAwareWindow;
  const tracker = currentWindow.__DASHBOARD_EXPORT_MICRO_APPS__ || {};
  tracker[id] = state;
  currentWindow.__DASHBOARD_EXPORT_MICRO_APPS__ = tracker;

  if (container) {
    container.dataset.exportMicroAppId = id;
    container.dataset.exportMicroAppName = appName;
    container.dataset.exportMicroAppState = state;
  }

  const states = Object.values(tracker);
  document.documentElement.dataset.exportMicroAppCount = String(states.length);
  document.documentElement.dataset.exportMicroAppPendingCount = String(
    states.filter(item => item === 'loading').length
  );
};

const clearExportMicroAppState = (id: string, container: HTMLDivElement | null) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const currentWindow = window as ExportAwareWindow;
  const tracker = currentWindow.__DASHBOARD_EXPORT_MICRO_APPS__ || {};
  delete tracker[id];
  currentWindow.__DASHBOARD_EXPORT_MICRO_APPS__ = tracker;

  if (container) {
    delete container.dataset.exportMicroAppId;
    delete container.dataset.exportMicroAppName;
    delete container.dataset.exportMicroAppState;
  }

  const states = Object.values(tracker);
  document.documentElement.dataset.exportMicroAppCount = String(states.length);
  document.documentElement.dataset.exportMicroAppPendingCount = String(
    states.filter(item => item === 'loading').length
  );
};

const MicroAppWidget: React.FC<MicroAppWidgetProps> = ({ config, widget }) => {
  const { themeMode, styleMode, styleTokens } = useCanvasTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleConfig, setModuleConfig] = useState<MicroAppModule | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const appName = `${config.systemId}-${config.moduleId}`;
  const exportMicroAppIdRef = useRef(
    widget?.id || `${appName}-${Math.random().toString(36).slice(2, 10)}`
  );

  const sizeInfo = useMemo<WidgetSizeInfo | undefined>(() => {
    return widget
      ? {
          grid: {
            columns: widget.layout.w,
            rows: widget.layout.h,
          },
          displayMode: getWidgetDisplayMode(widget.layout.w, widget.layout.h),
        }
      : undefined;
  }, [widget?.layout.w, widget?.layout.h]);

  const backgroundConfig = useMemo(
    () => ({
      type: config.backgroundType,
      color: config.backgroundColor,
      image: config.backgroundImage,
      gradient: config.backgroundGradient,
    }),
    [
      config.backgroundType,
      config.backgroundColor,
      config.backgroundImage,
      config.backgroundGradient,
    ]
  );

  const exportState: ExportMicroAppState = loading ? 'loading' : error ? 'error' : 'ready';
  const isGlobalMode = config.mode === 'global';
  const degrade =
    window.localStorage.getItem('degrade') === 'true' ||
    !window.Proxy ||
    !window.CustomElementRegistry;

  const emitAppState = () => {
    bus.$emit('state:change', {
      theme: themeMode,
      styleMode,
      styleTokens,
      __sizeInfo: sizeInfo,
      backgroundConfig,
    });
  };

  const initMicroApp = async () => {
    setLoading(true);
    setError(null);
    setModuleConfig(null);

    try {
      if (!config.systemId || !config.moduleId) {
        throw new Error('微应用配置不完整，请先选择系统和模块');
      }

      const module = await microAppConfigLoader.getModule(config.systemId, config.moduleId);
      if (!module) {
        throw new Error('未找到对应的微应用模块配置');
      }

      setModuleConfig(module);

      if (window.localStorage.getItem('preload') !== 'false') {
        preloadApp({
          name: appName,
          url: module.url,
          exec: true,
        });
      }

      bus.$emit('token:update', getToken());
      emitAppState();
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

  useEffect(() => {
    emitAppState();
  }, [themeMode, styleMode, styleTokens, sizeInfo, backgroundConfig]);

  useEffect(() => {
    syncExportMicroAppState(
      exportMicroAppIdRef.current,
      exportState,
      appName,
      containerRef.current
    );

    return () => {
      clearExportMicroAppState(exportMicroAppIdRef.current, containerRef.current);
    };
  }, [appName, exportState]);

  useEffect(() => {
    if (!loading || !moduleConfig) {
      return;
    }

    const timer = window.setTimeout(() => {
      setError('微应用加载超时，请检查应用地址是否可访问');
      setLoading(false);
    }, 15000);

    return () => window.clearTimeout(timer);
  }, [loading, moduleConfig]);

  const handleRetry = () => {
    initMicroApp();
  };

  const handleBeforeMount = (appWindow: Window) => {
    try {
      const bodyContent = appWindow.document?.body?.innerHTML?.trim();
      if (bodyContent === 'undefined' || bodyContent === 'null') {
        setError('微应用页面无法访问，请检查应用地址是否正确');
        setLoading(false);
      }
    } catch {
      // 忽略跨环境读取异常
    }

    lifecycles.beforeMount?.(appWindow);
  };

  const handleAfterMount = (appWindow: Window) => {
    window.setTimeout(() => {
      setLoading(false);
    }, 1000);

    emitAppState();
    lifecycles.afterMount?.(appWindow);
  };

  const handleActivated = (appWindow: Window) => {
    setLoading(false);
    emitAppState();
    lifecycles.activated?.(appWindow);
  };

  const handleLoadError = (url: string, event: Error) => {
    console.error(`[Wujie] ${url} 加载失败`, event);
    setError(`加载失败: ${event.message}`);
    setLoading(false);
    lifecycles.loadError?.(url, event);
  };

  return (
    <div
      ref={containerRef}
      className={`micro-app-widget-container ${isGlobalMode ? 'global-mode' : ''}`}
      style={{ position: 'relative' }}
    >
      {error && !moduleConfig && (
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
      )}

      {loading && (
        <div className="micro-app-widget-loading">
          <Spin size="large" tip="应用加载中..." />
        </div>
      )}

      {moduleConfig && !error && (
        <div
          className="nodrag"
          style={{
            width: '100%',
            height: '100%',
            opacity: loading ? 0 : 1,
            transition: 'opacity 0.3s',
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          <WujieReact
            width="100%"
            height="100%"
            name={appName}
            url={moduleConfig.url}
            sync={false}
            alive={config.alive ?? true}
            degrade={degrade}
            props={{
              ...config.props,
              token: getToken(),
              appId: appName,
              theme: themeMode,
              styleMode,
              styleTokens,
              __sizeInfo: sizeInfo,
              backgroundConfig,
            }}
            {...lifecycles}
            beforeMount={handleBeforeMount}
            afterMount={handleAfterMount}
            activated={handleActivated}
            loadError={handleLoadError}
          />
        </div>
      )}

      {error && moduleConfig && (
        <div className="micro-app-widget-error">
          <Result
            status="warning"
            title="微应用加载异常"
            subTitle={error}
            extra={
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetry}>
                重试
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
};

export default MicroAppWidget;
