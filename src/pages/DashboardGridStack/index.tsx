import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GridStack, GridStackOptions, GridStackWidget } from 'gridstack';
import type { Layout } from 'react-grid-layout';
import { useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import {
  GridStackProvider,
  GridStackRenderProvider,
  GridStackRender,
  useGridStackContext,
} from '@/lib/gridstack';
import { useStore } from '@/store/useStore';
import { getPublishedDashboard } from '@/services/dashboard';
import WidgetAdapter from './WidgetAdapter';
import GroupAdapter from './GroupAdapter';
import FloatingModule from '@/components/FloatingModule';
import clsx from 'clsx';
import { Widget, WidgetGroup, AppState, GRID_DENSITY_PRESETS } from '@/types';

import 'gridstack/dist/gridstack.min.css';
import './index.scss';

const SUBGRID_LISTENER_REGISTRY = new WeakSet<GridStack>();
type PersistHelpers = {
  hasHydrated?: () => boolean;
  onFinishHydration?: (fn: (state?: AppState, error?: unknown) => void) => () => void;
};

/**
 * Dashboard 内部组件（在 Provider 内部）
 */
const DashboardInner: React.FC = () => {
  const {
    widgets,
    groups,
    isEditMode,
    isFullScreen,
    floatingModules,
    updateLayout,
    dashboardConfig,
    gridDensity,
  } = useStore();

  const densityPreset = GRID_DENSITY_PRESETS[gridDensity];
  const [gridVisualMetrics, setGridVisualMetrics] = useState({
    cellWidth: 120,
    cellHeight: densityPreset.cellHeight,
    margin: densityPreset.margin,
  });

  const {
    gridStack,
    saveOptions,
    addWidget: addGridWidget,
    addSubGrid,
    removeWidget: removeGridWidget,
    _rawWidgetMetaMap,
  } = useGridStackContext();
  const availableWidgets = useMemo(() => widgets.filter((widget) => !widget.groupId), [widgets]);
  const widgetMap = useMemo(() => new Map(widgets.map((widget) => [widget.id, widget])), [widgets]);

  const widgetIdsRef = useRef<Set<string>>(new Set(availableWidgets.map((w) => w.id)));
  const allWidgetIdsRef = useRef<Set<string>>(new Set(widgets.map((w) => w.id))); // 追踪所有 widgets 以处理删除
  const groupIdsRef = useRef<Set<string>>(new Set(groups.map((group) => group.id)));
  const isApplyingStoreLayout = useRef(false);
  const pendingSyncFrameRef = useRef<number | null>(null);
  const backgroundStyle = useMemo(() => {
    const style: React.CSSProperties = {
      '--grid-cell-width': `${gridVisualMetrics.cellWidth}px`,
      '--grid-cell-height': `${gridVisualMetrics.cellHeight}px`,
      '--grid-gutter': `${gridVisualMetrics.margin}px`,
    } as React.CSSProperties;

    if (dashboardConfig) {
      if (dashboardConfig.backgroundType === 'image' && dashboardConfig.backgroundImage) {
        style.backgroundImage = `url(${dashboardConfig.backgroundImage})`;
        style.backgroundSize = 'cover';
        style.backgroundPosition = 'center';
        style.backgroundRepeat = 'no-repeat';
        style.backgroundAttachment = 'fixed';
      } else if (dashboardConfig.backgroundType === 'gradient' && dashboardConfig.backgroundGradient) {
        style.background = dashboardConfig.backgroundGradient;
      } else if (dashboardConfig.backgroundType === 'color' && dashboardConfig.backgroundColor) {
        style.backgroundColor = dashboardConfig.backgroundColor;
      } else {
        style.backgroundColor = 'var(--ant-color-bg-layout)';
      }
    } else {
      style.backgroundColor = 'var(--ant-color-bg-layout)';
    }

    return style;
  }, [isEditMode, gridVisualMetrics, dashboardConfig]);

  const syncLayoutFromGrid = useCallback(() => {
    if (pendingSyncFrameRef.current !== null) {
      return;
    }

    // 🔧 延迟到下一帧，确保 GridStack 的 DOM 更新完成（特别是 SubGrid）
    pendingSyncFrameRef.current = requestAnimationFrame(() => {
      const currentLayout = saveOptions();

      if (!currentLayout) {
        pendingSyncFrameRef.current = null;
        return;
      }

      const widgetLayouts: Layout[] = [];
      const groupLayouts: Layout[] = [];
      const widgetAssignments: Record<string, string | null> = {};
      const groupMemberships: Record<string, string[]> = {};

      // 🔧 同步更新元数据 Map（修复拖入 SubGrid 后内容消失的问题）
      // 保留旧的元数据作为后备，防止 content 丢失
      const updatedMetaMap = new Map<string, GridStackWidget>(_rawWidgetMetaMap.value);

      const traverse = (
        items: GridStackWidget[] | undefined,
        parentGroupId: string | null = null,
        offsetX = 0,
        offsetY = 0
      ) => {
        if (!items) return;

        items.forEach((item) => {
          if (!item || !item.id) return;

          const id = String(item.id);
          const absoluteLayout: Layout = {
            i: id,
            x: (item.x ?? 0) + offsetX,
            y: (item.y ?? 0) + offsetY,
            w: item.w ?? 4,
            h: item.h ?? 2,
          };

          const hasSubGrid = !!item.subGridOpts;
          const childItems =
            item.subGridOpts && Array.isArray(item.subGridOpts.children)
              ? (item.subGridOpts.children as GridStackWidget[])
              : undefined;

          // 🔧 更新或添加 widget 元数据 (包括分组)
          if (item.content) {
            updatedMetaMap.set(id, item);
          }

          if (hasSubGrid) {
            groupLayouts.push(absoluteLayout);
            if (!groupMemberships[id]) {
              groupMemberships[id] = [];
            }
            traverse(childItems, id, absoluteLayout.x, absoluteLayout.y);
            return;
          }

          widgetLayouts.push(absoluteLayout);
          widgetAssignments[id] = parentGroupId;

          if (parentGroupId) {
            groupMemberships[parentGroupId] = groupMemberships[parentGroupId] || [];
            groupMemberships[parentGroupId].push(id);
          }
        });
      };

      const rootItems = Array.isArray(currentLayout)
        ? currentLayout
        : currentLayout && 'children' in currentLayout && Array.isArray(currentLayout.children)
          ? currentLayout.children
          : [];

      traverse(rootItems as GridStackWidget[]);

      // 🔧 更新元数据 Map（确保 Portal 能正确渲染）
      _rawWidgetMetaMap.set(updatedMetaMap);

      isApplyingStoreLayout.current = true;
      try {
        updateLayout(widgetLayouts, {
          groupLayouts,
          widgetAssignments,
          groupMemberships,
        });
      } finally {
        requestAnimationFrame(() => {
          isApplyingStoreLayout.current = false;
        });
      }

      pendingSyncFrameRef.current = null;
    });
  }, [saveOptions, updateLayout, _rawWidgetMetaMap, widgetMap]);

  // 只监听用户拖拽和缩放事件，不监听 change（避免 addWidget 触发循环）
  useEffect(() => {
    if (!gridStack) return;

    const handleLayoutChange = () => {
      if (isApplyingStoreLayout.current) {
        return;
      }

      syncLayoutFromGrid();
    };

    gridStack.on('change', handleLayoutChange);
    gridStack.on('added', handleLayoutChange);
    gridStack.on('removed', handleLayoutChange);
    gridStack.on('dragstop', handleLayoutChange);
    gridStack.on('resizestop', handleLayoutChange);

    return () => {
      gridStack.off('change');
      gridStack.off('added');
      gridStack.off('removed');
      gridStack.off('dragstop');
      gridStack.off('resizestop');
    };
  }, [gridStack, syncLayoutFromGrid]);

  useEffect(() => {
    if (!gridStack) return;
    const preset = GRID_DENSITY_PRESETS[gridDensity];
    gridStack.column(preset.columnCount);
    gridStack.cellHeight(preset.cellHeight);
    gridStack.margin(preset.margin);
    updateNestedGridDensity(gridStack, preset);

    const calculatedCellWidth = gridStack.cellWidth();
    setGridVisualMetrics((prev) => ({
      ...prev,
      cellHeight: preset.cellHeight,
      margin: preset.margin,
      cellWidth: calculatedCellWidth,
    }));
  }, [gridStack, gridDensity]);

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

  // 同步 store widgets 变化到 GridStack
  useEffect(() => {
    if (!gridStack) {
      return;
    }

    const currentWidgetIds = new Set(availableWidgets.map((w) => w.id));
    const previousWidgetIds = widgetIdsRef.current;

    const addedWidgets = availableWidgets.filter((w) => !previousWidgetIds.has(w.id));
    const removedIds = Array.from(previousWidgetIds).filter((id) => !currentWidgetIds.has(id));

    if (addedWidgets.length === 0 && removedIds.length === 0) {
      return;
    }

    isApplyingStoreLayout.current = true;
    try {
      addedWidgets.forEach((widget) => {
        // 🔧 修复：如果 widget 已经在 gridStack 中（例如从分组拖出来），不要重复添加
        const existingNode = gridStack.engine.nodes.find((n) => n.id === widget.id);
        if (existingNode) {
          return;
        }

        const shouldAutoPosition = !Number.isFinite(widget.layout.y);
        const normalizedX = Number.isFinite(widget.layout.x) ? widget.layout.x : 0;
        const normalizedY = Number.isFinite(widget.layout.y) ? widget.layout.y : 0;
        const gridWidget: GridStackWidget & { id: string } = {
          id: widget.id,
          x: normalizedX,
          y: shouldAutoPosition ? undefined : normalizedY,
          w: widget.layout.w,
          h: widget.layout.h,
          minW: widget.layout.minW || 1,
          minH: widget.layout.minH || 1,
          autoPosition: shouldAutoPosition ? true : undefined,
          locked: true,
          content: JSON.stringify({
            name: 'WidgetAdapter',
            props: {
              widgetId: widget.id,
              type: widget.type,
            },
          }),
        };
        addGridWidget(gridWidget);
      });

      removedIds.forEach((id) => {
        // 🔧 修复：如果 widget 只是移到了分组（在 store 中有 groupId），且确实不在 root grid 的直接子节点中，则不要移除
        // 注意：removeGridWidget 会尝试从 DOM 查找并移除，如果它已经在 SubGrid 中，我们不希望主 GridStack 干预
        const widget = widgetMap.get(id);
        if (widget && widget.groupId) {
          const isDirectChild = gridStack.engine.nodes.find((n) => n.id === id);
          if (!isDirectChild) {
            return;
          }
        }

        removeGridWidget(id);
      });

      syncLayoutFromGrid();
    } finally {
      isApplyingStoreLayout.current = false;
    }

    widgetIdsRef.current = currentWidgetIds;
  }, [availableWidgets, gridStack, addGridWidget, removeGridWidget, syncLayoutFromGrid]);

  // 🔧 监听所有 widgets 的删除（包括分组内的 widgets）
  useEffect(() => {
    if (!gridStack) {
      return;
    }

    const currentAllWidgetIds = new Set(widgets.map((w) => w.id));
    const previousAllWidgetIds = allWidgetIdsRef.current;

    const removedIds = Array.from(previousAllWidgetIds).filter((id) => !currentAllWidgetIds.has(id));

    // 🔧 修复：无论是否有删除，都要更新 ref，否则下次比较会出错
    allWidgetIdsRef.current = currentAllWidgetIds;

    if (removedIds.length === 0) {
      return;
    }

    // 这里只处理删除。添加操作由上面的 useEffect (availableWidgets) 和 initial load 处理。
    isApplyingStoreLayout.current = true;
    try {
      removedIds.forEach((id) => {
        // removeGridWidget 已经被增强，可以查找嵌套的 widget 并从其父 grid 中移除
        removeGridWidget(id);
      });

      syncLayoutFromGrid();
    } finally {
      isApplyingStoreLayout.current = false;
    }
  }, [widgets, gridStack, removeGridWidget, syncLayoutFromGrid]);

  useEffect(() => {
    if (!gridStack) return;

    const previousIds = groupIdsRef.current;
    const currentIds = new Set(groups.map((group) => group.id));

    const addedGroups = groups.filter((group) => !previousIds.has(group.id));
    const removedGroupIds = Array.from(previousIds).filter((id) => !currentIds.has(id));

    if (addedGroups.length === 0 && removedGroupIds.length === 0) {
      return;
    }

    isApplyingStoreLayout.current = true;
    try {
      removedGroupIds.forEach((id) => removeGridWidget(id));

      addedGroups.forEach((group) => {
        const groupNode = createGroupGridWidget(group, widgetMap, densityPreset);
        if (groupNode) {
          addSubGrid(groupNode);
        }
      });

      syncLayoutFromGrid();
    } finally {
      isApplyingStoreLayout.current = false;
    }

    groupIdsRef.current = currentIds;

    attachListenersToNestedGrids(gridStack, syncLayoutFromGrid);
  }, [groups, widgetMap, densityPreset, gridStack, addSubGrid, removeGridWidget, syncLayoutFromGrid]);

  // 切换编辑模式
  useEffect(() => {
    if (gridStack) {
      if (isEditMode) {
        gridStack.enable();
      } else {
        gridStack.disable();
      }
    }
  }, [gridStack, isEditMode]);

  useEffect(() => {
    if (!gridStack) return;
    attachListenersToNestedGrids(gridStack, syncLayoutFromGrid);

    // 🔧 监听 SubGrid 的 change 事件（修复拖入到分组后内容消失的问题）
    const handleSubGridAdded = () => {
      setTimeout(() => {
        attachListenersToNestedGrids(gridStack, syncLayoutFromGrid);
      }, 100);
    };

    gridStack.on('added', handleSubGridAdded);

    return () => {
      gridStack.off('added');
    };
  }, [gridStack, syncLayoutFromGrid]);

  return (
    <div
      className={clsx('dashboard-container', {
        'grid-background': isEditMode,
        'fullscreen': isFullScreen,
      })}
      style={backgroundStyle}
    >

      {/* GridStack 渲染器 */}
      <GridStackRenderProvider>
        <GridStackRender componentMap={{
          WidgetAdapter: WidgetAdapter,
          GroupAdapter: GroupAdapter,
        }} />
      </GridStackRenderProvider>

      {/* 悬浮模块 */}
      {floatingModules.map(module => (
        <FloatingModule key={module.id} widget={module} />
      ))}

      {/* Debug Panel - 开发调试用 */}
      {/* {import.meta.env.DEV && <DebugPanel />} */}
    </div>
  );
};

/**
 * DashboardGridStack 主组件
 */

const DashboardGridStack: React.FC = () => {
  const { widgets, groups, gridDensity, loadDashboardFromData, setEditMode } = useStore();
  const persistApi = (useStore as typeof useStore & { persist?: PersistHelpers }).persist;
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const [isLoadingEditData, setIsLoadingEditData] = useState(!!editId); // 有 editId 时初始为 loading
  const [editDataLoaded, setEditDataLoaded] = useState(!editId); // 无 editId 时直接标记为已完成

  const buildGridOptions = useCallback((): GridStackOptions => {
    const preset = GRID_DENSITY_PRESETS[gridDensity] ?? GRID_DENSITY_PRESETS.standard;
    const children = buildInitialChildren(widgets, groups, preset);
    return {
      column: preset.columnCount,
      cellHeight: preset.cellHeight,
      margin: preset.margin,
      float: true,
      draggable: {
        handle: '.grid-drag-handle',
        appendTo: 'parent',  // 添加这行
        scroll: false,   // 禁用自动滚动
      },
      resizable: {
        handles: 'se',
      },
      // animate: true,
      acceptWidgets: true,
      children,
    };
  }, [widgets, groups, gridDensity]);

  // 如果没有 editId，直接使用 localStorage 数据初始化
  // 如果有 editId，等待 API 数据加载完成后再初始化
  const [initialOptions, setInitialOptions] = useState<GridStackOptions | null>(() => {
    if (!editId && persistApi?.hasHydrated?.()) {
      return buildGridOptions();
    }
    return null;
  });

  const [isHydrated, setIsHydrated] = useState<boolean>(() => {
    if (!persistApi?.hasHydrated) {
      return true;
    }
    return persistApi.hasHydrated();
  });

  useEffect(() => {
    if (!persistApi?.hasHydrated) {
      return;
    }
    if (persistApi.hasHydrated()) {
      setIsHydrated(true);
      return;
    }
    const unsubscribe = persistApi.onFinishHydration?.(() => {
      setIsHydrated(true);
    });
    return () => unsubscribe?.();
  }, [persistApi]);

  // 处理编辑已发布的仪表盘 - 在设置 initialOptions 之前加载数据
  useEffect(() => {
    if (!editId || !isHydrated) {
      return;
    }

    const loadEditData = async () => {
      setIsLoadingEditData(true);
      try {
        const res = await getPublishedDashboard({ id: editId });
        if (res.code === 20000 && res.data) {
          // 加载数据到 store，将 title 合并到 dashboardConfig 中
          loadDashboardFromData({
            widgets: res.data.widgets,
            groups: res.data.groups,
            floatingModules: res.data.floatingModules,
            dashboardConfig: {
              backgroundType: 'color', // 默认值
              ...res.data.dashboardConfig,
              title: res.data.title, // 保存标题用于编辑后发布
            },
          });
          setEditMode(true);
          setEditDataLoaded(true); // 标记编辑数据已加载
          message.success('已加载仪表盘数据');
        } else {
          message.error(res.message || '加载仪表盘数据失败');
          setEditDataLoaded(true); // 即使失败也标记完成，避免卡住
        }
      } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        message.error('加载仪表盘数据失败');
        setEditDataLoaded(true);
      } finally {
        setIsLoadingEditData(false);
      }
    };

    loadEditData();
  }, [editId, isHydrated, loadDashboardFromData, setEditMode]);

  // 设置 initialOptions：等待水合完成 + 编辑数据加载完成（如果有 editId）
  useEffect(() => {
    if (!isHydrated || !editDataLoaded || initialOptions) {
      return;
    }
    setInitialOptions(buildGridOptions());
  }, [isHydrated, editDataLoaded, initialOptions, buildGridOptions]);

  if (isLoadingEditData) {
    return (
      <div className="dashboard-container dashboard-loading">
        正在加载仪表盘数据...
      </div>
    );
  }

  if (!initialOptions) {
    return (
      <div className="dashboard-container dashboard-loading">
        正在加载布局...
      </div>
    );
  }

  return (
    <GridStackProvider initialOptions={initialOptions}>
      <DashboardInner />
    </GridStackProvider>
  );
};

function createWidgetGridNode(widget: Widget): GridStackWidget & { id: string } {
  const shouldAutoPosition = !Number.isFinite(widget.layout.y);
  const normalizedX = Number.isFinite(widget.layout.x) ? widget.layout.x : 0;
  const normalizedY = Number.isFinite(widget.layout.y) ? widget.layout.y : 0;

  return {
    id: widget.id,
    x: normalizedX,
    y: shouldAutoPosition ? undefined : normalizedY,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.layout.minW || 1,
    minH: widget.layout.minH || 1,
    locked: true,
    autoPosition: shouldAutoPosition ? true : undefined,
    content: JSON.stringify({
      name: 'WidgetAdapter',
      props: {
        widgetId: widget.id,
        type: widget.type,
      },
    }),
  };
}

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
            name: 'WidgetAdapter',
            props: {
              widgetId: widget.id,
              type: widget.type,
            },
          }),
        };
      }) || [];

  const shouldAutoPosition = !Number.isFinite(group.layout.y);
  const normalizedX = Number.isFinite(group.layout.x) ? group.layout.x : 0;

  return {
    id: group.id,
    x: normalizedX,
    y: shouldAutoPosition ? undefined : group.layout.y,
    autoPosition: shouldAutoPosition ? true : undefined,
    w: group.layout.w,
    h: group.layout.h,
    minW: group.layout.minW || 2,
    minH: group.layout.minH || 2,
    locked: true,
    content: JSON.stringify({
      name: 'GroupAdapter',
      props: {
        groupId: group.id,
      },
    }),
    // resizable: { handles: 'all' },
    subGridOpts: {
      acceptWidgets: true,
      // column: COLUMN_COUNT,
      column: 'auto',
      cellHeight: preset.cellHeight,
      margin: preset.margin,
      alwaysShowResizeHandle: false,
      animate: true,
      float: true,
      // itemClass: 'grid-stack-group-wrap',
      class: 'grid-stack-group-wrap',
      // handle: true,
      subGridDynamic: false,  // 禁用自动销毁空分组，由 store 管理分组生命周期
      children,
    },
  };
}

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
    .filter((groupNode): groupNode is Exclude<ReturnType<typeof createGroupGridWidget>, null> => Boolean(groupNode));
  return [...rootWidgets, ...groupWidgets];
}

function updateNestedGridDensity(
  grid: GridStack | null,
  preset: { cellHeight: number; margin: number; columnCount: number }
) {
  if (!grid?.engine?.nodes) return;
  grid.engine.nodes.forEach((node: any) => {
    if (node?.subGrid) {
      // 嵌套网格使用 'auto' 列模式，不需要更新 column
      node.subGrid.cellHeight(preset.cellHeight);
      node.subGrid.margin(preset.margin);
      updateNestedGridDensity(node.subGrid, preset);
    }
  });
}

function attachListenersToNestedGrids(grid: GridStack | null, handler: () => void) {
  if (!grid?.engine?.nodes) return;
  grid.engine.nodes.forEach((node: any) => {
    if (node?.subGrid) {
      if (!SUBGRID_LISTENER_REGISTRY.has(node.subGrid)) {
        // 🔧 修复：添加 change 事件监听（拖入拖出分组时触发）
        node.subGrid.on('change', handler);
        node.subGrid.on('added', handler);
        node.subGrid.on('removed', handler);
        node.subGrid.on('dragstop', handler);
        node.subGrid.on('resizestop', handler);

        SUBGRID_LISTENER_REGISTRY.add(node.subGrid);
      }
      attachListenersToNestedGrids(node.subGrid, handler);
    }
  });
}

export default DashboardGridStack;
