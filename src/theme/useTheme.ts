import { useCallback } from 'react'
import { useConfigStore } from '@/store'
import type { IBaseColors, ISemanticTokens } from './tokens/semantic'
import type { ThemePresetName } from './tokens/presets'
import { getThemePreset } from './tokens/presets'

/**
 * 全局主题 Hook（仅管理全局配色/预设/布局）
 *
 * 注意：themeMode / styleMode / styleTokens 已迁移到画布级，
 * 请使用 useCanvasTheme hook 获取画布级主题配置。
 */
export const useTheme = () => {
  // 获取全局主题状态和操作
  const themePreset = useConfigStore((state) => state.themePreset)
  const baseColors = useConfigStore((state) => state.baseColors)
  const customTokens = useConfigStore((state) => state.customTokens)
  const setThemePreset = useConfigStore((state) => state.setThemePreset)
  const setBaseColor = useConfigStore((state) => state.setBaseColor)
  const setBaseColors = useConfigStore((state) => state.setBaseColors)
  const updateCustomTokens = useConfigStore((state) => state.updateCustomTokens)
  const setCustomTokens = useConfigStore((state) => state.setCustomTokens)

  const applyPreset = useCallback((presetName: ThemePresetName, applyColors = true) => {
    const preset = getThemePreset(presetName)
    setThemePreset(presetName)

    if (applyColors) {
      setBaseColors(preset.colors)
      setCustomTokens(preset)
    }
  }, [setThemePreset, setBaseColors, setCustomTokens])

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
      if (config.themePreset) setThemePreset(config.themePreset)
      if (config.baseColors) setBaseColors(config.baseColors)
      if (config.customTokens) setCustomTokens(config.customTokens)
      return true
    } catch (e) {
      console.error('Failed to import theme:', e)
      return false
    }
  }, [setThemePreset, setBaseColors, setCustomTokens])

  return {
    // === 全局状态 ===
    themePreset,
    baseColors,
    customTokens,

    // === 主题预设操作 ===
    applyPreset,
    resetTheme,

    // === 颜色操作 ===
    setColor,
    setColors,

    // === Token 操作 ===
    updateTokens,
    replaceTokens,

    // === 工具方法 ===
    getCSSVar,
    exportTheme,
    importTheme,
  }
}
