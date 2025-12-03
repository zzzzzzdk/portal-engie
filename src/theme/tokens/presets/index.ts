import { lightPreset } from './light'
import { darkPreset } from './dark'
import { bluePreset } from './blue'
import { purplePreset } from './purple'
import type { ISemanticTokens } from '../semantic'

/**
 * 主题预设名称类型
 */
export type ThemePresetName = 'light' | 'dark' | 'blue' | 'purple'

/**
 * 所有主题预设
 */
export const themePresets: Record<ThemePresetName, ISemanticTokens> = {
  light: lightPreset,
  dark: darkPreset,
  blue: bluePreset,
  purple: purplePreset,
}

/**
 * 获取主题预设
 */
export const getThemePreset = (name: ThemePresetName): ISemanticTokens => {
  return themePresets[name]
}

export { lightPreset, darkPreset, bluePreset, purplePreset }
