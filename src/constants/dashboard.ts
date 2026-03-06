import type { WidgetType } from '@/types';

export const DASHBOARD_LAST_EDIT_ID_KEY = 'dashboard_last_edit_id';

/** 有数据交互、支持刷新的组件类型 */
export const REFRESHABLE_WIDGET_TYPES: ReadonlySet<WidgetType> = new Set([
  'stats', 'chart', 'news', 'topList', 'dataTable', 'carousel', 'navGroup', 'microApp',
]);
