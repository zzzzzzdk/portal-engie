import { normalStyle, normalStyleDark } from './normal'
import { minimalStyle, minimalStyleLight } from './minimal'
import type { IWidgetStyleTokens, StyleMode } from '../semantic'

/**
 * 所有风格预设
 */
export const stylePresets = {
  normal: normalStyle,
  normalDark: normalStyleDark,
  minimal: minimalStyle,
  minimalLight: minimalStyleLight,
}

/**
 * 根据风格模式和主题模式获取对应的风格预设
 * @param styleMode 风格模式 (normal | minimal)
 * @param isDark 是否为深色主题
 */
export const getStylePreset = (
  styleMode: StyleMode,
  isDark: boolean = false
): IWidgetStyleTokens => {
  if (styleMode === 'minimal') {
    // 极简风格：深色用 minimalStyle，浅色用 minimalStyleLight
    return isDark ? minimalStyle : minimalStyleLight
  }
  // 标准风格
  return isDark ? normalStyleDark : normalStyle
}

export { normalStyle, normalStyleDark } from './normal'
export { minimalStyle, minimalStyleLight } from './minimal'
