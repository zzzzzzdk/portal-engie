/**
 * IconPicker 组件类型定义
 */

import type React from 'react';

/** 图标类型分类 */
export type IconType = 'antd-outlined' | 'antd-filled' | 'iconfont';

/** 图标项定义 */
export interface IconItem {
  /** 图标名称 (如 "HomeOutlined") */
  name: string;
  /** Ant Design 图标组件 */
  component?: React.ComponentType<{ style?: React.CSSProperties }>;
  /** 图标类型 */
  type: IconType;
  /** 搜索关键词 */
  keywords?: string[];
}

/** IconPicker 组件 Props */
export interface IconPickerProps {
  /** 图标值（图标名/URL/SVG代码） */
  value?: string;
  /** 值变化回调 */
  onChange?: (value: string) => void;
  /**
   * 模式
   * - simple: 仅图标列表选择
   * - full: 包含图标选择、URL输入、图片上传、SVG代码输入
   */
  mode?: 'simple' | 'full';
  /** 是否允许上传图片（仅 full 模式生效） */
  allowUpload?: boolean;
  /** 是否允许 SVG 代码输入（仅 full 模式生效） */
  allowSvg?: boolean;
  /** 是否允许 URL 输入（仅 full 模式生效） */
  allowUrl?: boolean;
  /** 占位文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/** IconGrid 组件 Props */
export interface IconGridProps {
  /** 当前选中的图标名称 */
  value?: string;
  /** 选择图标回调 */
  onSelect: (iconName: string) => void;
}

/** 图标值类型判断结果 */
export type IconValueType = 'icon-name' | 'url' | 'svg' | 'empty';

/** 判断图标值类型 */
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
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return 'url';
  }

  // 图标名称
  return 'icon-name';
}
