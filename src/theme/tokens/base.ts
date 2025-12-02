/**
 * 基础 Token
 * 这些是不受主题影响的固定值（间距、字体、圆角等）
 */

export const baseTokens = {
  // 间距系统
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // 圆角系统
  borderRadius: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 16,
  },

  // 字体大小系统
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },

  // 阴影系统
  shadow: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 8px rgba(0, 0, 0, 0.12)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.15)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.18)',
  },

  // 过渡动画
  transition: {
    fast: '0.1s',
    base: '0.2s',
    slow: '0.3s',
  },

  // 层级系统
  zIndex: {
    dropdown: 1000,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
}

export type BaseTokens = typeof baseTokens
