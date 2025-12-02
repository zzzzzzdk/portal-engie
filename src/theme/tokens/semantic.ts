/**
 * 语义 Token 类型定义
 * 这些是受主题影响的变量（颜色、布局等）
 */

// 基础颜色配置（用于生成调色板）
export interface IBaseColors {
  primary: string
  brand: string
  success: string
  warning: string
  error: string
  info: string
}

// 布局区域配置
export interface ILayoutTokens {
  header: {
    gradientBg: string
    text: string
    height: number
  }
  sidebar: {
    bg: string
    text: string
    width: number
    collapsedWidth: number
  }
  content: {
    bg: string
  }
  footer: {
    bg: string
    text: string
    height: number
  }
}

// 语义 Token（完整配置）
export interface ISemanticTokens {
  colors: IBaseColors
  layout: ILayoutTokens
}

// 调色板类型（每个颜色生成 10 个色阶）
export interface IColorPalette {
  primary: string[]
  brand: string[]
  success: string[]
  warning: string[]
  error: string[]
  info: string[]
}
