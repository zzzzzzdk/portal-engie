// 配置状态管理 - Zustand Store
import { create } from 'zustand';
import type { IBaseColors, ISemanticTokens, IWidgetStyleTokens, StyleMode } from '@/theme/tokens/semantic';
import type { ThemePresetName } from '@/theme/tokens/presets';
import { lightPreset } from '@/theme/tokens/presets/light';
import { getThemePreset } from '@/theme/tokens/presets';
import { getStylePreset } from '@/theme/tokens/styles';

/**
 * 主题模式类型
 */
export type ThemeMode = 'light' | 'dark';

/**
 * 配置状态接口
 */
interface ConfigState {
  themeMode: ThemeMode;
  themePreset: ThemePresetName;
  baseColors: IBaseColors;
  customTokens: ISemanticTokens;
  styleMode: StyleMode;
  styleTokens: IWidgetStyleTokens;
  collapsed: boolean;
  locale: string;
}

/**
 * 配置操作接口
 */
interface ConfigActions {
  setThemeMode: (mode: ThemeMode) => void;
  setThemePreset: (preset: ThemePresetName) => void;
  setBaseColor: (key: keyof IBaseColors, value: string) => void;
  setBaseColors: (colors: IBaseColors) => void;
  updateCustomTokens: (tokens: Partial<ISemanticTokens>) => void;
  setCustomTokens: (tokens: ISemanticTokens) => void;
  resetToPreset: (preset: ThemePresetName) => void;
  setStyleMode: (mode: StyleMode) => void;
  setCollapsed: (collapsed: boolean) => void;
  setLocale: (locale: string) => void;
}

/**
 * 初始化状态
 */
const getInitialState = (): ConfigState => {
  const themeMode = localStorage.getItem('themeMode') as ThemeMode;
  const themePreset = localStorage.getItem('themePreset') as ThemePresetName;
  const styleMode = (localStorage.getItem('styleMode') as StyleMode) || 'normal';

  if (themeMode && themePreset) {
    const preset = getThemePreset(themePreset);
    const isDark = themeMode === 'dark';
    return {
      themeMode,
      themePreset,
      baseColors: preset.colors,
      customTokens: preset,
      styleMode,
      styleTokens: getStylePreset(styleMode, isDark),
      collapsed: false,
      locale: localStorage.getItem('locale') || 'zh-CN',
    };
  }

  const defaultState: ConfigState = {
    themeMode: 'light',
    themePreset: 'light',
    baseColors: lightPreset.colors,
    customTokens: lightPreset,
    styleMode: 'normal',
    styleTokens: getStylePreset('normal', false),
    collapsed: false,
    locale: 'zh-CN',
  };

  localStorage.setItem('themeMode', defaultState.themeMode);
  localStorage.setItem('themePreset', defaultState.themePreset);
  localStorage.setItem('styleMode', defaultState.styleMode);

  return defaultState;
};

/**
 * 配置状态管理 Store
 */
export const useConfigStore = create<ConfigState & ConfigActions>((set) => ({
  ...getInitialState(),

  // 设置主题模式
  setThemeMode: (mode: ThemeMode) => {
    localStorage.setItem('themeMode', mode);
    set((state) => ({
      themeMode: mode,
      // 同步更新风格预设（根据新的明暗模式）
      styleTokens: getStylePreset(state.styleMode, mode === 'dark'),
    }));
  },

  // 设置主题预设
  setThemePreset: (preset: ThemePresetName) => {
    localStorage.setItem('themePreset', preset);
    set({ themePreset: preset });
  },

  // 设置单个基础颜色
  setBaseColor: (key: keyof IBaseColors, value: string) => {
    set((state) => ({
      baseColors: {
        ...state.baseColors,
        [key]: value,
      },
    }));
  },

  // 批量设置基础颜色
  setBaseColors: (colors: IBaseColors) => {
    set({ baseColors: colors });
  },

  // 更新自定义 Token
  updateCustomTokens: (tokens: Partial<ISemanticTokens>) => {
    set((state) => ({
      customTokens: {
        ...state.customTokens,
        ...tokens,
        colors: {
          ...state.customTokens.colors,
          ...(tokens.colors || {}),
        },
        layout: {
          ...state.customTokens.layout,
          ...(tokens.layout || {}),
          header: {
            ...state.customTokens.layout.header,
            ...(tokens.layout?.header || {}),
          },
          sidebar: {
            ...state.customTokens.layout.sidebar,
            ...(tokens.layout?.sidebar || {}),
          },
          content: {
            ...state.customTokens.layout.content,
            ...(tokens.layout?.content || {}),
          },
          footer: {
            ...state.customTokens.layout.footer,
            ...(tokens.layout?.footer || {}),
          },
        },
      },
    }));
  },

  // 完全替换自定义 Token
  setCustomTokens: (tokens: ISemanticTokens) => {
    set({ customTokens: tokens });
  },

  // 重置主题为预设
  resetToPreset: (preset: ThemePresetName) => {
    localStorage.setItem('themePreset', preset);
    set({ themePreset: preset });
  },

  // 设置显示风格模式
  setStyleMode: (mode: StyleMode) => {
    localStorage.setItem('styleMode', mode);
    set((state) => ({
      styleMode: mode,
      styleTokens: getStylePreset(mode, state.themeMode === 'dark'),
    }));
  },

  // 设置侧边栏折叠状态
  setCollapsed: (collapsed: boolean) => {
    set({ collapsed });
  },

  // 设置语言
  setLocale: (locale: string) => {
    localStorage.setItem('locale', locale);
    set({ locale });
  },
}));

// 兼容性类型导出
export type ThemeType = ThemePresetName | 'custom';
export type { ISemanticTokens as IThemeColors };
export type { StyleMode } from '@/theme/tokens/semantic';
