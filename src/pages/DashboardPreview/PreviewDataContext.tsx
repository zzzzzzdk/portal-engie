/**
 * PreviewDataContext - 预览页面数据上下文
 *
 * 为预览页面提供从 API 获取的仪表盘数据
 */

import React, { createContext, useContext, useMemo } from 'react';
import { Widget, WidgetGroup, DashboardConfig } from '@/types';

interface PreviewDataContextType {
  widgets: Widget[];
  groups: WidgetGroup[];
  floatingModules: Widget[];
  dashboardConfig?: DashboardConfig;
  getWidget: (id: string) => Widget | undefined;
  getGroup: (id: string) => WidgetGroup | undefined;
}

const PreviewDataContext = createContext<PreviewDataContextType | null>(null);

interface PreviewDataProviderProps {
  widgets: Widget[];
  groups: WidgetGroup[];
  floatingModules: Widget[];
  dashboardConfig?: DashboardConfig;
  children: React.ReactNode;
}

export const PreviewDataProvider: React.FC<PreviewDataProviderProps> = ({
  widgets,
  groups,
  floatingModules,
  dashboardConfig,
  children,
}) => {
  const widgetMap = useMemo(() => new Map(widgets.map((w) => [w.id, w])), [widgets]);
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const value = useMemo(
    () => ({
      widgets,
      groups,
      floatingModules,
      dashboardConfig,
      getWidget: (id: string) => widgetMap.get(id),
      getGroup: (id: string) => groupMap.get(id),
    }),
    [widgets, groups, floatingModules, dashboardConfig, widgetMap, groupMap]
  );

  return <PreviewDataContext.Provider value={value}>{children}</PreviewDataContext.Provider>;
};

export const usePreviewData = (): PreviewDataContextType => {
  const context = useContext(PreviewDataContext);
  if (!context) {
    throw new Error('usePreviewData must be used within a PreviewDataProvider');
  }
  return context;
};

export const usePreviewWidget = (widgetId: string): Widget | undefined => {
  const context = useContext(PreviewDataContext);
  return context?.getWidget(widgetId);
};

export const usePreviewGroup = (groupId: string): WidgetGroup | undefined => {
  const context = useContext(PreviewDataContext);
  return context?.getGroup(groupId);
};

export default PreviewDataContext;
