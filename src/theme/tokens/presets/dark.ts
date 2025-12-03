import type { ISemanticTokens } from '../semantic'

/**
 * 深色主题预设
 */
export const darkPreset: ISemanticTokens = {
  colors: {
    primary: '#177ddc',
    brand: '#5a67d8',
    success: '#49aa19',
    warning: '#d89614',
    error: '#d32029',
    info: '#177ddc',
  },
  layout: {
    header: {
      gradientBg: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
      text: 'rgba(255, 255, 255, 0.85)',
      height: 64,
    },
    sidebar: {
      bg: '#141414',
      text: 'rgba(255, 255, 255, 0.85)',
      width: 256,
      collapsedWidth: 80,
    },
    content: {
      bg: '#1f1f1f',
    },
    footer: {
      bg: '#141414',
      text: 'rgba(255, 255, 255, 0.65)',
      height: 64,
    },
  },
}
