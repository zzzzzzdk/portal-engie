/**
 * IconRenderer 组件
 * 统一的图标渲染器，支持：
 * - SVG 代码
 * - 图片 URL（http/https/data）
 * - Ant Design 图标名
 * - Iconfont 图标名
 * - 首字母降级
 */

import React, { useMemo } from 'react'
import * as AntdIcons from '@ant-design/icons'
import Icon from '@/components/Icon'
import { findIconByName } from '@/components/IconPicker/iconData'
import { sanitizeSvg } from '@/utils/sanitizeSvg'
import { getIconValueType, getColorFromString } from './types'
import type { IconRendererProps } from './types'
import './index.scss'

const IconRenderer: React.FC<IconRendererProps> = ({
  value,
  size = 24,
  style,
  className,
  fallbackText,
  fallbackColor,
  color,
}) => {
  const iconType = useMemo(() => getIconValueType(value), [value])

  const containerStyle: React.CSSProperties = useMemo(() => ({
    width: size,
    height: size,
    fontSize: size,
    lineHeight: `${size}px`,
    color,
    ...style,
  }), [size, color, style])

  if (iconType === 'empty') {
    return renderFallback()
  }

  if (iconType === 'svg') {
    return (
      <span
        className={`icon-renderer icon-renderer-svg ${className || ''}`}
        style={containerStyle}
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(value!) }}
      />
    )
  }

  if (iconType === 'url') {
    return (
      <img
        src={value}
        alt="icon"
        className={`icon-renderer icon-renderer-img ${className || ''}`}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          ...style,
        }}
      />
    )
  }

  if (iconType === 'iconfont') {
    const iconName = value!.startsWith('icon-') ? value!.slice(5) : value!
    return (
      <Icon
        type={iconName}
        className={`icon-renderer ${className || ''}`}
        style={containerStyle}
      />
    )
  }

  if (iconType === 'antd') {
    const AntdIcon = (AntdIcons as Record<string, unknown>)[value!] as React.ComponentType<{
      className?: string
      style?: React.CSSProperties
    }> | undefined
    if (AntdIcon) {
      return (
        <AntdIcon
          className={`icon-renderer icon-renderer-antd ${className || ''}`}
          style={containerStyle}
        />
      )
    }

    const iconItem = findIconByName(value!)
    if (iconItem && iconItem.type === 'iconfont') {
      return (
        <Icon
          type={value!}
          className={`icon-renderer ${className || ''}`}
          style={containerStyle}
        />
      )
    }

    return renderFallback()
  }

  return renderFallback()

  function renderFallback() {
    const letter = fallbackText?.charAt(0).toUpperCase() || '?'
    const bgColor = fallbackColor || getColorFromString(fallbackText || 'default')

    return (
      <span
        className={`icon-renderer icon-renderer-letter ${className || ''}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.5,
          lineHeight: `${size}px`,
          backgroundColor: bgColor,
          color: '#fff',
          ...style,
        }}
      >
        {letter}
      </span>
    )
  }
}

export default IconRenderer

export { getIconValueType, getColorFromString } from './types'
export type { IconRendererProps, IconValueType } from './types'
