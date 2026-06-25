import type { WidgetType } from '@/types';

/** 有数据交互、支持刷新的组件类型 */
export const REFRESHABLE_WIDGET_TYPES: ReadonlySet<WidgetType> = new Set([
  'stats', 'indicatorCard', 'indicatorCardList', 'chart', 'news', 'topList', 'dataTable', 'carousel', 'navGroup', 'microApp',
]);

/**
 * setInterval/setTimeout 最大安全延迟(毫秒)
 * JS 定时器使用 32 位有符号整数，超过 2^31-1 会立即触发
 */
export const MAX_TIMER_DELAY_MS = 2_147_483_647;

/** 刷新间隔最大值(秒)，86400 = 24 小时 */
export const MAX_REFRESH_INTERVAL = 86400;

/** 将刷新间隔(秒)转为安全的定时器延迟(毫秒) */
export const safeIntervalMs = (seconds: number): number =>
  Math.min(seconds * 1000, MAX_TIMER_DELAY_MS);
