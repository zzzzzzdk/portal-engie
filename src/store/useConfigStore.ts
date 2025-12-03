// 配置状态管理 - Zustand Store
import { create } from 'zustand';
import type { IBaseColors, ISemanticTokens } from '@/theme/tokens/semantic';
import type { ThemePresetName } from '@/theme/tokens/presets';
import { lightPreset } from '@/theme/tokens/presets/light';
import { getThemePreset } from '@/theme/tokens/presets';

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
  setCollapsed: (collapsed: boolean) => void;
  setLocale: (locale: string) => void;
}

/**
 * 初始化状态
 */
const getInitialState = (): ConfigState => {
  const themeMode = localStorage.getItem('themeMode') as ThemeMode;
  const themePreset = localStorage.getItem('themePreset') as ThemePresetName;

  if (themeMode && themePreset) {
    const preset = getThemePreset(themePreset);
    return {
      themeMode,
      themePreset,
      baseColors: preset.colors,
      customTokens: preset,
      collapsed: false,
      locale: localStorage.getItem('locale') || 'zh-CN',
    };
  }

  const defaultState: ConfigState = {
    themeMode: 'light',
    themePreset: 'light',
    baseColors: lightPreset.colors,
    customTokens: lightPreset,
    collapsed: false,
    locale: 'zh-CN',
  };

  localStorage.setItem('themeMode', defaultState.themeMode);
  localStorage.setItem('themePreset', defaultState.themePreset);

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
    set({ themeMode: mode });
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
