
import React from 'react';

/**
 * 小组件尺寸相关类型定义
 */

/**
 * 显示模式
 */
export type WidgetDisplayMode = 'icon-only' | 'minimal' | 'compact' | 'normal' | 'large';

/**
 * 网格尺寸
 */
export interface GridSize {
  columns: number;  // 宽度（占几列，1-12）
  rows: number;     // 高度（占几行）
}

/**
 * 器像素尺寸
 */
export interface ContainerSize {
  width: number;           // 容器宽度（px）
  height: number;          // 容器高度（px）
  contentHeight: number;   // 可用内容高度（px，减去 header）
}

/**
 * 传递给子应用的尺寸信息
 */
export interface WidgetSizeInfo {
  // 网格尺寸（必需）
  grid: GridSize;

  // 容器像素尺寸（可选）
  container?: ContainerSize;

  // 显示模式提示（可选）
  displayMode?: WidgetDisplayMode;
}

/**
 * Icon 配置
 */
export interface WidgetIconConfig {
  // Icon URL 或 React 组件 或 组件类型
  icon: string | React.ReactNode | React.ComponentType<any>;

  // 降级方案
  fallback?: 'letter' | 'default';

  // 背景色（用于首字母 Avatar）
  backgroundColor?: string;
}
