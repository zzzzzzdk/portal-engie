import type { IWidgetStyleTokens } from '../semantic'

/**
 * 极简风格预设
 * 半透明背景、毛玻璃效果、科技感
 */
export const minimalStyle: IWidgetStyleTokens = {
  widget: {
    background: 'rgba(116,143,184,0.20)',
    backdropFilter: 'blur(23px)',
    borderRadius: 14,
    borderColor: 'transparent',
    borderWidth: 1,
    // boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
    titleColor: 'rgba(255, 255, 255, 0.95)',
    textColor: 'rgba(255, 255, 255, 0.75)',
  },
  card: {
    background: 'rgba(116,143,184,0.20)',
    backdropFilter: 'blur(23px)',
    borderRadius: 12,
    // borderColor: 'rgba(255, 255, 255, 0.1)',
    // boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  },
}

/**
 * 极简风格 - 浅色模式变体
 * 适用于浅色背景
 */
export const minimalStyleLight: IWidgetStyleTokens = {
  widget: {
    background: 'rgba(255,255,255,0.20)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    borderColor: 'rgba(65,123,214,0.28)',
    borderWidth: 1,
    boxShadow: '0px 6px 12px 0px rgba(42,44,46,0.09)',
    titleColor: '#222',
    textColor: '#222',
  },
  card: {
    background: 'rgba(255,255,255,0.20)',
    backdropFilter: 'blur(10px)',
    borderRadius: 10,
    borderColor: 'rgba(255,255,255,0.20)',
    boxShadow: '0px 6px 12px 0px rgba(42,44,46,0.09)',
  },
}
