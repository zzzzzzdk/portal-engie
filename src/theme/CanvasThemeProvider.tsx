import React, { useEffect, useMemo, useRef } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import { useConfigStore } from '@/store';
import { injectStyleTokens } from './utils';
import type { DashboardConfig } from '@/types';

interface CanvasThemeProviderProps {
  children: React.ReactNode;
  /**
   * 画布容器 ref，CSS 变量和 data 属性将注入到此元素
   */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /**
   * 可选：覆盖 useStore 的 dashboardConfig（预览页使用）
   */
  overrideConfig?: DashboardConfig | null;
}

/**
 * 画布级主题提供者
 *
 * 职责：
 * 1. 将 widget/card CSS 变量注入到画布容器 DOM（而非 documentElement）
 * 2. 在画布容器上设置 data-theme / data-style 属性
 * 3. 嵌套 Ant Design ConfigProvider，画布内组件使用画布级 dark/light 算法
 */
export const CanvasThemeProvider: React.FC<CanvasThemeProviderProps> = ({
  children,
  containerRef,
  overrideConfig,
}) => {
  const { themeMode, styleMode, styleTokens, isDark } = useCanvasTheme(overrideConfig);
  const baseColors = useConfigStore((state) => state.baseColors);

  // 注入 CSS 变量到画布容器
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    injectStyleTokens(styleTokens, container);
    container.dataset.theme = themeMode;
    container.dataset.style = styleMode;
  }, [containerRef, themeMode, styleMode, styleTokens]);

  // 画布级 Ant Design 主题配置
  const canvasAntdTheme = useMemo(() => {
    return {
      cssVar: {
        key: 'ant-canvas',
        prefix: 'ant',
      },
      hashed: false,
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: baseColors.primary,
        colorSuccess: baseColors.success,
        colorWarning: baseColors.warning,
        colorError: baseColors.error,
        colorInfo: baseColors.info,
        ...(isDark && {
          colorBgBase: '#141414',
          colorTextBase: '#fff',
        }),
      },
    };
  }, [isDark, baseColors]);

  return (
    <ConfigProvider locale={zhCN} theme={canvasAntdTheme}>
      {children}
    </ConfigProvider>
  );
};
