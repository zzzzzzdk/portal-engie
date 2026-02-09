import type { ISemanticTokens } from '../semantic'
import headerBgUrl from '@/assets/images/header-light.jpg'


/**
 * 浅色主题预设
 */
export const lightPreset: ISemanticTokens = {
  colors: {
    primary: '#1890ff',
    brand: '#667eea',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
    info: '#1890ff',
  },
  layout: {
    header: {
      // gradientBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      gradientBg: `url("${headerBgUrl}") no-repeat`,
      text: '#ffffff',
      height: 64,
    },
    sidebar: {
      bg: '#ffffff',
      text: 'rgba(0, 0, 0, 0.85)',
      width: 256,
      collapsedWidth: 80,
    },
    content: {
      bg: '#f0f2f5',
    },
    footer: {
      bg: '#ffffff',
      text: 'rgba(0, 0, 0, 0.65)',
      height: 64,
    },
  },
}
