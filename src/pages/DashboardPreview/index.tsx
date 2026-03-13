/**
 * DashboardPreview - 工作台预览页面
 *
 * 根据 URL 中的 ID 获取发布的工作台数据并只读展示
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { GridStackOptions, GridStackWidget } from 'gridstack';
import {
  GridStackProvider,
  GridStackRenderProvider,
  GridStackRender,
  useGridStackContext,
} from '@/lib/gridstack';
import { getPublishedDashboard, parseDashboardSnapshot, PublishedDashboard } from '@/services';
import { Widget, WidgetGroup, GRID_DENSITY_PRESETS } from '@/types';
import sanitizeDashboardConfig from '@/utils/dashboardConfig';
import { isValidCssGradient } from '@/components/BackgroundSettings';
import { PreviewDataProvider } from './PreviewDataContext';
import PreviewWidgetAdapter from './PreviewWidgetAdapter';
import PreviewGroupAdapter from './PreviewGroupAdapter';
import FloatingModule from '@/components/FloatingModule';
import { CanvasThemeProvider } from '@/theme/CanvasThemeProvider';
import { useConfigStore } from '@/store/useConfigStore';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import 'gridstack/dist/gridstack.min.css';
import '@/pages/DashboardGridStack/index.scss';
import './index.scss';

/**
 * 预览页内部组件
 */
interface PreviewInnerProps {
  dashboardData: PublishedDashboard;
}

const PreviewInner: React.FC<PreviewInnerProps> = ({ dashboardData }) => {
  const { gridStack } = useGridStackContext();
  const { floatingModules, dashboardConfig } = dashboardData;
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isDark = dashboardConfig?.themeMode === 'dark';

  const densityPreset = GRID_DENSITY_PRESETS.standard;
  const [gridVisualMetrics, setGridVisualMetrics] = useState({
    cellWidth: 120,
    cellHeight: densityPreset.cellHeight,
    margin: densityPreset.margin,
  });

  const backgroundStyle = useMemo(() => {
    const style: React.CSSProperties = {
      '--grid-cell-width': `${gridVisualMetrics.cellWidth}px`,
      '--grid-cell-height': `${gridVisualMetrics.cellHeight}px`,
      '--grid-gutter': `${gridVisualMetrics.margin}px`,
    } as React.CSSProperties;

    if (dashboardConfig) {
      if (dashboardConfig.backgroundType === 'image' && dashboardConfig.backgroundImage) {
        style.backgroundImage = `url(${dashboardConfig.backgroundImage})`;
        style.backgroundSize = dashboardConfig.backgroundSize || 'auto';
        style.backgroundPosition = dashboardConfig.backgroundPosition || 'center';
        style.backgroundRepeat = dashboardConfig.backgroundRepeat || 'no-repeat';
        style.backgroundAttachment = 'fixed';
      } else if (dashboardConfig.backgroundType === 'gradient' && dashboardConfig.backgroundGradient && isValidCssGradient(dashboardConfig.backgroundGradient)) {
        style.background = dashboardConfig.backgroundGradient;
      } else if (dashboardConfig.backgroundType === 'color' && dashboardConfig.backgroundColor) {
        style.backgroundColor = dashboardConfig.backgroundColor;
      } else {
        style.backgroundColor = isDark ? '#141414' : 'var(--ant-color-bg-layout, #f5f5f5)';
      }
    } else {
      style.backgroundColor = isDark ? '#141414' : 'var(--ant-color-bg-layout, #f5f5f5)';
    }

    return style;
  }, [gridVisualMetrics, dashboardConfig, isDark]);

  // 禁用编辑模式
  useEffect(() => {
    if (gridStack) {
      gridStack.disable();
    }
  }, [gridStack]);

  // 更新格子宽度
  useEffect(() => {
    if (!gridStack?.el) return;
    const updateWidth = () => {
      setGridVisualMetrics((prev) => ({
        ...prev,
        cellWidth: gridStack.cellWidth(),
      }));
    };
    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(gridStack.el);

    return () => observer.disconnect();
  }, [gridStack]);

  return (
    <CanvasThemeProvider containerRef={canvasContainerRef} overrideConfig={dashboardConfig}>
      <div ref={canvasContainerRef} className={clsx('dashboard-preview-container')} style={backgroundStyle}>
        <GridStackRenderProvider>
          <GridStackRender
            componentMap={{
              PreviewWidgetAdapter: PreviewWidgetAdapter,
              PreviewGroupAdapter: PreviewGroupAdapter,
            }}
          />
        </GridStackRenderProvider>

        {/* 悬浮模块 - 预览模式 */}
        {floatingModules?.map((module) => (
          <FloatingModule key={module.id} widget={module}/>
        ))}
      </div>
    </CanvasThemeProvider>
  );
};

/**
 * DashboardPreview 主组件
 */
const DashboardPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setEditMode } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<PublishedDashboard | null>(null);

  useEffect(() => {
    if (!id) {
      setError('缺少工作台 ID');
      setLoading(false);
      return;
    }
    setEditMode(false)

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await getPublishedDashboard({id});
        if (res.data) {
          const snapshot = parseDashboardSnapshot(res.data.dashboardConfig);
          if (!snapshot) {
            setError('解析工作台配置失败');
            return;
          }
          const dashboardConfig = sanitizeDashboardConfig(snapshot.dashboardConfig || {});

          // 仅将全局配色（baseColors/customTokens）写入 ConfigStore
          // themeMode/styleMode 由 CanvasThemeProvider 通过 overrideConfig 处理
          const globalUpdate: Record<string, unknown> = {};
          if (dashboardConfig.baseColors) {
            globalUpdate.baseColors = dashboardConfig.baseColors;
          }
          if (Object.keys(globalUpdate).length > 0) {
            useConfigStore.setState(globalUpdate);
          }

          setDashboardData({
            id: res.data.id,
            title: res.data.title,
            publishTime: res.data.publishTime,
            widgets: snapshot.widgets,
            groups: snapshot.groups,
            floatingModules: snapshot.floatingModules,
            dashboardConfig,
          });
        } else {
          setError(res.message || '获取工作台数据失败');
        }
      } catch (err) {
        setError('获取工作台数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [id]);

  const buildGridOptions = useCallback((): GridStackOptions | null => {
    if (!dashboardData) return null;

    const { widgets, groups } = dashboardData;
    const preset = GRID_DENSITY_PRESETS.compact;
    const children = buildInitialChildren(widgets, groups, preset);

    return {
      column: preset.columnCount,
      cellHeight: preset.cellHeight,
      margin: preset.margin,
      float: true,
      staticGrid: true, // 禁用所有交互
      animate: false,
      children,
    };
  }, [dashboardData]);

  if (loading) {
    return (
      <div className="dashboard-preview-loading">
        <Spin size="large" tip="正在加载工作台..." />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="dashboard-preview-error">
        <Result
          status="error"
          title="加载失败"
          subTitle={error || '未找到工作台数据'}
          extra={[
            <Button key="back" onClick={() => navigate(-1)}>
              返回
            </Button>,
            <Button key="home" type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>,
          ]}
        />
      </div>
    );
  }

  const initialOptions = buildGridOptions();
  if (!initialOptions) {
    return null;
  }

  return (
    <PreviewDataProvider
      widgets={dashboardData.widgets}
      groups={dashboardData.groups}
      floatingModules={dashboardData.floatingModules}
      dashboardConfig={dashboardData.dashboardConfig}
    >
      <GridStackProvider initialOptions={initialOptions}>
        <PreviewInner dashboardData={dashboardData} />
      </GridStackProvider>
    </PreviewDataProvider>
  );
};

// 辅助函数：创建 Widget GridStack 节点
function createWidgetGridNode(widget: Widget): GridStackWidget & { id: string } {
  const normalizedX = Number.isFinite(widget.layout.x) ? widget.layout.x : 0;
  const normalizedY = Number.isFinite(widget.layout.y) ? widget.layout.y : 0;

  return {
    id: widget.id,
    x: normalizedX,
    y: normalizedY,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.layout.minW || 1,
    minH: widget.layout.minH || 1,
    content: JSON.stringify({
      name: 'PreviewWidgetAdapter',
      props: {
        widgetId: widget.id,
        type: widget.type,
      },
    }),
  };
}

// 辅助函数：创建分组 GridStack 节点
function createGroupGridWidget(
  group: WidgetGroup,
  widgetMap: Map<string, Widget>,
  preset: { cellHeight: number; margin: number }
): (GridStackWidget & {
  id: string;
  subGridOpts: GridStackOptions & { children: (GridStackWidget & { id: string })[] };
}) | null {
  const children =
    group.widgetIds
      .map((id) => widgetMap.get(id))
      .filter((widget): widget is Widget => Boolean(widget))
      .map((widget) => {
        const relativeX = (widget.layout.x || 0) - (group.layout.x || 0);
        const relativeY = (widget.layout.y || 0) - (group.layout.y || 0);
        return {
          id: widget.id,
          x: Math.max(relativeX, 0),
          y: Math.max(relativeY, 0),
          w: widget.layout.w,
          h: widget.layout.h,
          minW: widget.layout.minW || 1,
          minH: widget.layout.minH || 1,
          content: JSON.stringify({
            name: 'PreviewWidgetAdapter',
            props: {
              widgetId: widget.id,
              type: widget.type,
            },
          }),
        };
      }) || [];

  const normalizedX = Number.isFinite(group.layout.x) ? group.layout.x : 0;
  const normalizedY = Number.isFinite(group.layout.y) ? group.layout.y : 0;

  return {
    id: group.id,
    x: normalizedX,
    y: normalizedY,
    w: group.layout.w,
    h: group.layout.h,
    minW: group.layout.minW || 2,
    minH: group.layout.minH || 2,
    content: JSON.stringify({
      name: 'PreviewGroupAdapter',
      props: {
        groupId: group.id,
      },
    }),
    subGridOpts: {
      column: 'auto',
      cellHeight: preset.cellHeight,
      margin: preset.margin,
      animate: false,
      float: true,
      staticGrid: true,
      class: 'grid-stack-group-wrap',
      subGridDynamic: true,
      children,
    },
  };
}

// 辅助函数：构建初始 children
function buildInitialChildren(
  widgets: Widget[],
  groups: WidgetGroup[],
  preset: { cellHeight: number; margin: number }
): GridStackWidget[] {
  const widgetMap = new Map(widgets.map((widget) => [widget.id, widget]));
  const rootWidgets = widgets
    .filter((widget) => !widget.groupId)
    .map(createWidgetGridNode);

  const groupWidgets = groups
    .map((group) => createGroupGridWidget(group, widgetMap, preset))
    .filter((groupNode): groupNode is Exclude<ReturnType<typeof createGroupGridWidget>, null> =>
      Boolean(groupNode)
    );

  return [...rootWidgets, ...groupWidgets];
}

export default DashboardPreview;
