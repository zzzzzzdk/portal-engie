import type { IWidgetStyleTokens } from '../semantic'

/**
 * 标准风格预设
 * 传统的实色背景、清晰边框
 */
export const normalStyle: IWidgetStyleTokens = {
  widget: {
    background: '#ffffff',
    backdropFilter: 'none',
    borderRadius: 8,
    borderColor: '#e8e8e8',
    borderWidth: 1,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    titleColor: 'rgba(0, 0, 0, 0.85)',
    textColor: 'rgba(0, 0, 0, 0.65)',
  },
  card: {
    background: '#ffffff',
    backdropFilter: 'none',
    borderRadius: 8,
    borderColor: '#e8e8e8',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
}

/**
 * 标准风格 - 深色模式变体
 */
export const normalStyleDark: IWidgetStyleTokens = {
  widget: {
    background: '#1f1f1f',
    backdropFilter: 'none',
    borderRadius: 8,
    borderColor: '#434343',
    borderWidth: 1,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    titleColor: 'rgba(255, 255, 255, 0.85)',
    textColor: 'rgba(255, 255, 255, 0.65)',
  },
  card: {
    background: '#1f1f1f',
    backdropFilter: 'none',
    borderRadius: 8,
    borderColor: '#434343',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
}
