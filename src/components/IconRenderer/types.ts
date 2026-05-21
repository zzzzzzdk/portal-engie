/**
 * IconRenderer 组件类型定义
 * 统一的图标渲染组件，支持多种图标来源
 */

import { findIconByName } from '@/components/IconPicker/iconData'

export type IconValueType = 'svg' | 'url' | 'antd' | 'iconfont' | 'empty'

export interface IconRendererProps {
  /** 图标值：可以是 SVG 代码、URL、Ant Design 图标名、Iconfont 图标名 */
  value?: string
  /** 图标大小（像素），默认 24 */
  size?: number
  /** 自定义样式 */
  style?: React.CSSProperties
  /** 自定义类名 */
  className?: string
  /** 降级显示的文本 */
  fallbackText?: string
  /** 降级头像背景色 */
  fallbackColor?: string
  /** 图标颜色 */
  color?: string
}

/**
 * 判断图标值的类型
 */
export function getIconValueType(value?: string): IconValueType {
  if (!value || value.trim() === '') {
    return 'empty'
  }

  const trimmed = value.trim()

  if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
    return 'svg'
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return 'url'
  }

  if (trimmed.startsWith('icon-')) {
    return 'iconfont'
  }

  const iconItem = findIconByName(trimmed)
  if (iconItem && iconItem.type === 'iconfont') {
    return 'iconfont'
  }

  return 'antd'
}

/**
 * 根据字符串生成 HSL 颜色
 */
export function getColorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 60%, 55%)`
}
