import { useCallback } from 'react'
import { useConfigStore } from '@/store'
import type { ThemeMode } from '@/store'
import type { IBaseColors, ISemanticTokens } from './tokens/semantic'
import type { ThemePresetName } from './tokens/presets'
import { getThemePreset } from './tokens/presets'

/**
 * 主题 Hook
 * 提供主题相关的所有操作和状态
 */
export const useTheme = () => {
  // 获取所有主题相关状态和操作
  const themeMode = useConfigStore((state) => state.themeMode)
  const themePreset = useConfigStore((state) => state.themePreset)
  const baseColors = useConfigStore((state) => state.baseColors)
  const customTokens = useConfigStore((state) => state.customTokens)
  const setThemeMode = useConfigStore((state) => state.setThemeMode)
  const setThemePreset = useConfigStore((state) => state.setThemePreset)
  const setBaseColor = useConfigStore((state) => state.setBaseColor)
  const setBaseColors = useConfigStore((state) => state.setBaseColors)
  const updateCustomTokens = useConfigStore((state) => state.updateCustomTokens)
  const setCustomTokens = useConfigStore((state) => state.setCustomTokens)

  // 使用 useCallback 避免无限循环
  const toggleThemeMode = useCallback(() => {
    useConfigStore.setState((state) => ({
      themeMode: state.themeMode === 'light' ? 'dark' : 'light'
    }))
  }, [])

  const setMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode)
  }, [setThemeMode])

  const applyPreset = useCallback((presetName: ThemePresetName, applyColors = true) => {
    const preset = getThemePreset(presetName)

    // 根据预设自动切换主题模式
    if (presetName === 'dark') {
      setThemeMode('dark')
    } else {
      setThemeMode('light')
    }

    setThemePreset(presetName)

    if (applyColors) {
      setBaseColors(preset.colors)
      setCustomTokens(preset)
    }
  }, [setThemeMode, setThemePreset, setBaseColors, setCustomTokens])

  const resetTheme = useCallback(() => {
    const preset = getThemePreset(useConfigStore.getState().themePreset)
    setBaseColors(preset.colors)
    setCustomTokens(preset)
  }, [setBaseColors, setCustomTokens])

  const setColor = useCallback((key: keyof IBaseColors, value: string) => {
    setBaseColor(key, value)
  }, [setBaseColor])

  const setColors = useCallback((colors: IBaseColors) => {
    setBaseColors(colors)
  }, [setBaseColors])

  const updateTokens = useCallback((tokens: Partial<ISemanticTokens>) => {
    updateCustomTokens(tokens)
  }, [updateCustomTokens])

  const replaceTokens = useCallback((tokens: ISemanticTokens) => {
    setCustomTokens(tokens)
  }, [setCustomTokens])

  const getCSSVar = useCallback((path: string, prefix = 'ant') => {
    return `var(--${prefix}-${path.replace(/\./g, '-')})`
  }, [])

  const exportTheme = useCallback(() => {
    const state = useConfigStore.getState()
    return JSON.stringify(
      {
        themeMode: state.themeMode,
        themePreset: state.themePreset,
        baseColors: state.baseColors,
        customTokens: state.customTokens,
      },
      null,
      2
    )
  }, [])

  const importTheme = useCallback((jsonString: string) => {
    try {
      const config = JSON.parse(jsonString)
      if (config.themeMode) setThemeMode(config.themeMode)
      if (config.themePreset) setThemePreset(config.themePreset)
      if (config.baseColors) setBaseColors(config.baseColors)
      if (config.customTokens) setCustomTokens(config.customTokens)
      return true
    } catch (e) {
      console.error('Failed to import theme:', e)
      return false
    }
  }, [setThemeMode, setThemePreset, setBaseColors, setCustomTokens])

  return {
    // === 状态 ===
    themeMode,
    themePreset,
    baseColors,
    customTokens,
    isDark: themeMode === 'dark',

    // === 主题模式操作 ===
    /**
     * 切换主题模式（light ⇄ dark）
     */
    toggleThemeMode,

    /**
     * 设置主题模式
     */
    setMode,

    // === 主题预设操作 ===
    /**
     * 切换到指定预设主题
     * @param presetName 预设名称
     * @param applyColors 是否同步颜色配置（默认 true）
     */
    applyPreset,

    /**
     * 重置为当前预设（放弃自定义修改）
     */
    resetTheme,

    // === 颜色操作 ===
    /**
     * 设置单个基础颜色
     */
    setColor,

    /**
     * 批量设置基础颜色
     */
    setColors,

    // === Token 操作 ===
    /**
     * 更新自定义 Token（部分更新）
     */
    updateTokens,

    /**
     * 完全替换自定义 Token
     */
    replaceTokens,

    // === 工具方法 ===
    /**
     * 获取 CSS 变量名
     */
    getCSSVar,

    /**
     * 导出当前主题配置（JSON）
     */
    exportTheme,

    /**
     * 导入主题配置
     */
    importTheme,
  }
}
