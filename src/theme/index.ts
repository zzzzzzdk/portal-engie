/**
 * 主题系统入口
 * 导出所有主题相关的类型、组件、Hooks 和工具
 */

// 类型
export type { IBaseColors, ISemanticTokens, ILayoutTokens, IColorPalette } from './tokens/semantic'
export type { BaseTokens } from './tokens/base'
export type { ThemePresetName } from './tokens/presets'

// Token
export { baseTokens } from './tokens/base'
export { themePresets, getThemePreset } from './tokens/presets'

// 算法
export { generatePalette, injectColorPalette, injectCSSVariables, toKebabCase } from './algorithms'

// 组件
export { ThemeProvider } from './ThemeProvider'

// Hooks
export { useTheme } from './useTheme'
