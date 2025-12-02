import type { ISemanticTokens } from '../semantic'

/**
 * 蓝色主题预设
 */
export const bluePreset: ISemanticTokens = {
  colors: {
    primary: '#1890ff',
    brand: '#0050b3',
    success: '#13c2c2',
    warning: '#faad14',
    error: '#f5222d',
    info: '#1890ff',
  },
  layout: {
    header: {
      gradientBg: 'linear-gradient(135deg, #1890ff 0%, #0050b3 100%)',
      text: '#ffffff',
      height: 64,
    },
    sidebar: {
      bg: '#001529',
      text: 'rgba(255, 255, 255, 0.85)',
      width: 256,
      collapsedWidth: 80,
    },
    content: {
      bg: '#f0f2f5',
    },
    footer: {
      bg: '#001529',
      text: 'rgba(255, 255, 255, 0.65)',
      height: 64,
    },
  },
}
