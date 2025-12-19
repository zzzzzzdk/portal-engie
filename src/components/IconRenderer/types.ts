/**
 * IconRenderer 组件类型定义
 * 统一的图标渲染组件，支持多种图标来源
 */

export type IconValueType = 'svg' | 'url' | 'antd' | 'iconfont' | 'empty';

export interface IconRendererProps {
  /** 图标值：可以是 SVG 代码、URL、Ant Design 图标名、Iconfont 名称 */
  value?: string;
  /** 图标大小（像素），默认 24 */
  size?: number;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 降级显示的文本（用于生成首字母头像） */
  fallbackText?: string;
  /** 降级头像的背景色 */
  fallbackColor?: string;
  /** 图标颜色（对 Ant Design 和 Iconfont 有效） */
  color?: string;
}

/**
 * 判断图标值的类型
 */
export function getIconValueType(value?: string): IconValueType {
  if (!value || value.trim() === '') {
    return 'empty';
  }

  const trimmed = value.trim();

  // SVG 代码
  if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
    return 'svg';
  }

  // URL（http/https/data:）
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return 'url';
  }

  // Iconfont（以 icon- 开头或在已知列表中）
  // 注意：Iconfont 使用 #icon-xxx 格式
  if (trimmed.startsWith('icon-')) {
    return 'iconfont';
  }

  // 其他情况尝试作为 Ant Design 图标名
  return 'antd';
}

/**
 * 根据字符串生成 HSL 颜色
 */
export function getColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 55%)`;
}
