import { useMemo, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { getStylePreset } from '@/theme/tokens/styles';
import type { StyleMode, IWidgetStyleTokens } from '@/theme/tokens/semantic';
import type { DashboardConfig } from '@/types';

/**
 * 画布级主题 Hook
 *
 * 从 dashboardConfig 读取 themeMode / styleMode，
 * 计算出对应的 styleTokens，供画布内组件使用。
 *
 * 支持 overrideConfig：预览页等场景可传入外部 config 覆盖 useStore 的数据。
 */
export const useCanvasTheme = (overrideConfig?: DashboardConfig | null) => {
  const storeConfig = useStore((s) => s.dashboardConfig);
  const updateDashboardConfig = useStore((s) => s.updateDashboardConfig);

  const config = overrideConfig ?? storeConfig;

  const themeMode = config?.themeMode || 'light';
  const styleMode = (config?.styleMode as StyleMode) || 'normal';
  const isDark = themeMode === 'dark';
  const isMinimal = styleMode === 'minimal';

  const styleTokens: IWidgetStyleTokens = useMemo(
    () => getStylePreset(styleMode, isDark),
    [styleMode, isDark],
  );

  const setCanvasThemeMode = useCallback(
    (mode: 'light' | 'dark') => updateDashboardConfig({ themeMode: mode }),
    [updateDashboardConfig],
  );

  const setCanvasStyleMode = useCallback(
    (mode: StyleMode) => updateDashboardConfig({ styleMode: mode }),
    [updateDashboardConfig],
  );

  return {
    themeMode,
    styleMode,
    styleTokens,
    isDark,
    isMinimal,
    setCanvasThemeMode,
    setCanvasStyleMode,
  };
};
