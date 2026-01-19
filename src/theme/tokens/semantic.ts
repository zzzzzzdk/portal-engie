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

// ============ 显示风格 Token ============

/**
 * Widget 组件风格 Token
 */
export interface IWidgetStyleTokens {
  widget: {
    background: string        // 组件背景（支持透明度）
    backdropFilter?: string    // 背景模糊（毛玻璃效果）
    borderRadius: number      // 圆角大小
    borderColor?: string       // 边框颜色
    borderWidth?: number       // 边框宽度
    boxShadow?: string         // 阴影
    titleColor?: string        // 标题颜色
    textColor?: string         // 文字颜色
  }
  card: {
    background: string
    backdropFilter: string
    borderRadius?: number
    borderColor?: string
    boxShadow?: string
  }
}

/**
 * 显示风格模式
 */
export type StyleMode = 'normal' | 'minimal'
