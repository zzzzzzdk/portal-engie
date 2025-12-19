/**
 * IconRenderer 组件
 * 统一的图标渲染器，支持：
 * - SVG 代码
 * - 图片 URL（http/https/data:）
 * - Ant Design 图标名
 * - Iconfont 图标名
 * - 首字母降级
 */

import React, { useMemo } from 'react';
import * as AntdIcons from '@ant-design/icons';
import Icon from '@/components/Icon';
import { ICONFONT_ICONS } from '@/components/IconPicker/iconData';
import { getIconValueType, getColorFromString } from './types';
import type { IconRendererProps } from './types';
import './index.scss';

const IconRenderer: React.FC<IconRendererProps> = ({
  value,
  size = 24,
  style,
  className,
  fallbackText,
  fallbackColor,
  color,
}) => {
  const iconType = useMemo(() => getIconValueType(value), [value]);

  const containerStyle: React.CSSProperties = useMemo(() => ({
    width: size,
    height: size,
    fontSize: size,
    lineHeight: `${size}px`,
    color,
    ...style,
  }), [size, color, style]);

  // 空值或空字符串 - 显示降级
  if (iconType === 'empty') {
    return renderFallback();
  }

  // SVG 代码
  if (iconType === 'svg') {
    return (
      <span
        className={`icon-renderer icon-renderer-svg ${className || ''}`}
        style={containerStyle}
        dangerouslySetInnerHTML={{ __html: value! }}
      />
    );
  }

  // URL 图片
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
    );
  }

  // Iconfont 图标
  if (iconType === 'iconfont') {
    // 去掉 icon- 前缀
    const iconName = value!.startsWith('icon-') ? value!.slice(5) : value!;
    return (
      <Icon
        type={iconName}
        className={`icon-renderer ${className || ''}`}
        style={containerStyle}
      />
    );
  }

  // Ant Design 图标
  if (iconType === 'antd') {
    // 首先尝试直接从 @ant-design/icons 获取
    const AntdIcon = (AntdIcons as any)[value!];
    if (AntdIcon) {
      return (
        <AntdIcon
          className={`icon-renderer icon-renderer-antd ${className || ''}`}
          style={containerStyle}
        />
      );
    }

    // 尝试检查是否是 Iconfont 图标（没有 icon- 前缀的情况）
    const isIconfont = ICONFONT_ICONS.some((icon) => icon.name === value);
    if (isIconfont) {
      return (
        <Icon
          type={value!}
          className={`icon-renderer ${className || ''}`}
          style={containerStyle}
        />
      );
    }

    // 都不匹配，显示降级
    return renderFallback();
  }

  // 默认降级
  return renderFallback();

  function renderFallback() {
    const letter = fallbackText?.charAt(0).toUpperCase() || '?';
    const bgColor = fallbackColor || getColorFromString(fallbackText || 'default');

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
    );
  }
};

export default IconRenderer;

// 导出类型和工具函数
export { getIconValueType, getColorFromString } from './types';
export type { IconRendererProps, IconValueType } from './types';
