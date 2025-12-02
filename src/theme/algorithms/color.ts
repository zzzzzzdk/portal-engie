import { generate } from '@ant-design/colors'
import type { IBaseColors, IColorPalette } from '../tokens/semantic'

/**
 * 生成完整的调色板
 * 基于基础颜色，每个颜色生成 10 个色阶
 * @param baseColors 基础颜色配置
 * @returns 完整的调色板（每个颜色 10 个色阶）
 */
export const generatePalette = (baseColors: IBaseColors): IColorPalette => {
  return {
    primary: generate(baseColors.primary),
    brand: generate(baseColors.brand),
    success: generate(baseColors.success),
    warning: generate(baseColors.warning),
    error: generate(baseColors.error),
    info: generate(baseColors.info),
  }
}

/**
 * 将 camelCase 转换为 kebab-case
 * @param str camelCase 字符串
 * @returns kebab-case 字符串
 */
export const toKebabCase = (str: string): string => {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

/**
 * 注入调色板到 CSS 变量
 * @param palette 调色板
 * @param prefix CSS 变量前缀（默认 'aurora'）
 */
export const injectColorPalette = (palette: IColorPalette, prefix = 'aurora') => {
  const root = document.documentElement

  Object.entries(palette).forEach(([colorName, colors]) => {
    colors.forEach((color: string, index: number) => {
      const cssVarName = `--${prefix}-color-${toKebabCase(colorName)}-${index + 1}`
      root.style.setProperty(cssVarName, color)
    })

    // 添加语义化别名（主色 = 第 6 个色阶）
    root.style.setProperty(`--${prefix}-color-${toKebabCase(colorName)}`, colors[5])
    root.style.setProperty(`--${prefix}-color-${toKebabCase(colorName)}-hover`, colors[4])
    root.style.setProperty(`--${prefix}-color-${toKebabCase(colorName)}-active`, colors[6])
  })
}

/**
 * 注入对象到 CSS 变量（通用工具）
 * @param obj 对象
 * @param prefix CSS 变量前缀
 * @param parentKey 父级键名（用于嵌套对象）
 */
export const injectCSSVariables = (
  obj: Record<string, any>,
  prefix = 'aurora',
  parentKey = ''
) => {
  const root = document.documentElement

  Object.entries(obj).forEach(([key, value]) => {
    const cssVarName = parentKey
      ? `--${prefix}-${parentKey}-${toKebabCase(key)}`
      : `--${prefix}-${toKebabCase(key)}`

    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      // 嵌套对象，递归处理
      injectCSSVariables(value, prefix, parentKey ? `${parentKey}-${toKebabCase(key)}` : toKebabCase(key))
    } else {
      // 基本类型或数组，直接注入
      const cssValue = typeof value === 'number' ? `${value}px` : String(value)
      root.style.setProperty(cssVarName, cssValue)
    }
  })
}
