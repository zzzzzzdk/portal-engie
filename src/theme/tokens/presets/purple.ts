import type { ISemanticTokens } from '../semantic'

/**
 * 紫色主题预设
 */
export const purplePreset: ISemanticTokens = {
  colors: {
    primary: '#722ed1',
    brand: '#531dab',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
    info: '#722ed1',
  },
  layout: {
    header: {
      gradientBg: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
      text: '#ffffff',
      height: 64,
    },
    sidebar: {
      bg: '#f9f0ff',
      text: 'rgba(0, 0, 0, 0.85)',
      width: 256,
      collapsedWidth: 80,
    },
    content: {
      bg: '#f0f2f5',
    },
    footer: {
      bg: '#f9f0ff',
      text: 'rgba(0, 0, 0, 0.65)',
      height: 64,
    },
  },
}
