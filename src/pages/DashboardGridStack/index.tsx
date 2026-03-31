import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GridStack, GridStackOptions, GridStackWidget, GridStackNode } from 'gridstack';
import type { Layout } from 'react-grid-layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import {
  GridStackProvider,
  GridStackRenderProvider,
  GridStackRender,
  useGridStackContext,
} from '@/lib/gridstack';
import { useStore } from '@/store/useStore';
import { useConfigStore } from '@/store/useConfigStore';
import { CanvasThemeProvider } from '@/theme/CanvasThemeProvider';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import { getPublishedDashboard, parseDashboardSnapshot } from '@/services/dashboard';
import sanitizeDashboardConfig from '@/utils/dashboardConfig';
import { createChartWidgetByPreset, isChartPresetWidgetKey } from '@/utils/chartWidgetPreset';
import { isValidCssGradient } from '@/components/BackgroundSettings';
import WidgetAdapter from './WidgetAdapter';
import GroupAdapter from './GroupAdapter';
import FloatingModule from '@/components/FloatingModule';
import clsx from 'clsx';
import { Widget, WidgetGroup, WidgetType, AppState, GRID_DENSITY_PRESETS, DashboardConfig } from '@/types';

import 'gridstack/dist/gridstack.min.css';
import './index.scss';

const SUBGRID_LISTENER_REGISTRY = new WeakSet<GridStack>();
type DropPayload =
  | { source: 'external'; widgetType: string }
  | { source: 'widget'; widgetId: string; widgetType?: WidgetType }
  | { source: 'group'; groupId: string }
  | { source: 'unknown' };

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
    addWidget,
    updateWidget,
    createEmptyGroup,
    addFloatingModuleLocal,
    setPendingMicroAppDrop,
    dashboardConfig,
    gridDensity,
  } = useStore();
  const { isDark } = useCanvasTheme();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

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
        style.backgroundSize = dashboardConfig.backgroundSize || 'auto';
        style.backgroundPosition = dashboardConfig.backgroundPosition || 'center';
        style.backgroundRepeat = dashboardConfig.backgroundRepeat || 'no-repeat';
        style.backgroundAttachment = 'fixed';
      } else if (dashboardConfig.backgroundType === 'gradient' && dashboardConfig.backgroundGradient && isValidCssGradient(dashboardConfig.backgroundGradient)) {
        style.background = dashboardConfig.backgroundGradient;
      } else if (dashboardConfig.backgroundType === 'color' && dashboardConfig.backgroundColor) {
        style.backgroundColor = dashboardConfig.backgroundColor;
      } else {
        style.backgroundColor = isDark ? '#141414' : 'var(--ant-color-bg-container, #f5f5f5)';
      }
    } else {
      style.backgroundColor = isDark ? '#141414' : 'var(--ant-color-bg-container, #f5f5f5)';
    }

    return style;
  }, [isEditMode, gridVisualMetrics, dashboardConfig, isDark]);

  const findParentGroupIdByGrid = useCallback((targetGrid: GridStack | null): string | null => {
    if (!gridStack || !targetGrid || targetGrid === gridStack) {
      return null;
    }

    const findInNodes = (nodes: GridStackNode[] | undefined): string | null => {
      if (!nodes) {
        return null;
      }

      for (const node of nodes) {
        if (!node?.id) {
          continue;
        }

        if (node.subGrid === targetGrid) {
          return String(node.id);
        }

        const nestedGroupId = findInNodes(node.subGrid?.engine?.nodes);
        if (nestedGroupId) {
          return nestedGroupId;
        }
      }

      return null;
    };

    return findInNodes(gridStack.engine?.nodes);
  }, [gridStack]);

  const resolveDropPayload = useCallback((newNode: GridStackNode): DropPayload => {
    const nodeId = newNode.id ? String(newNode.id) : '';

    if (nodeId && widgetMap.has(nodeId)) {
      return {
        source: 'widget',
        widgetId: nodeId,
        widgetType: widgetMap.get(nodeId)?.type,
      };
    }

    if (nodeId && groupMap.has(nodeId)) {
      return {
        source: 'group',
        groupId: nodeId,
      };
    }

    const rawContent = typeof newNode.content === 'string' ? newNode.content : '';
    if (!rawContent) {
      return { source: 'unknown' };
    }

    try {
      const parsed = JSON.parse(rawContent) as {
        name?: string;
        props?: {
          widgetId?: string;
          groupId?: string;
          type?: WidgetType;
        };
      };

      if (parsed.name === 'WidgetAdapter' && parsed.props?.widgetId) {
        return {
          source: 'widget',
          widgetId: parsed.props.widgetId,
          widgetType: parsed.props.type,
        };
      }

      if (parsed.name === 'GroupAdapter' && parsed.props?.groupId) {
        return {
          source: 'group',
          groupId: parsed.props.groupId,
        };
      }
    } catch {
      // 左侧组件库拖入时 content 是简单字符串，不需要额外处理
    }

    return {
      source: 'external',
      widgetType: rawContent,
    };
  }, [groupMap, widgetMap]);

  const handleExternalDrop = useCallback((
    ownerGrid: GridStack,
    _event: Event,
    _prevNode: GridStackNode,
    newNode: GridStackNode
  ) => {
    if (!isEditMode) return;

    const dropPayload = resolveDropPayload(newNode);
    if (dropPayload.source === 'widget' || dropPayload.source === 'group') {
      return;
    }

    const widgetType = dropPayload.source === 'external'
      ? dropPayload.widgetType
      : undefined;
    const el = newNode.el;
    if (el) {
      try {
        const sourceGrid = el.gridstackNode?.grid || ownerGrid;
        sourceGrid.removeWidget(el, true, false);
      } catch {
        // 忽略临时节点清理失败
      }
    }

    if (!widgetType) return;
    const resolvedWidgetType = widgetType as string;

    const targetGroupId = findParentGroupIdByGrid(ownerGrid);
    const targetGroup = targetGroupId ? groupMap.get(targetGroupId) : undefined;
    const dropX = newNode.x ?? 0;
    const dropY = newNode.y ?? 0;
    const widgetPosition = targetGroup
      ? {
        x: (targetGroup.layout.x || 0) + dropX,
        y: (targetGroup.layout.y || 0) + dropY,
        groupId: targetGroupId || undefined,
      }
      : { x: dropX, y: dropY };

    if (resolvedWidgetType === 'create-group') {
      createEmptyGroup(undefined, {
        x: widgetPosition.x,
        y: widgetPosition.y,
      });
      return;
    }

    if (resolvedWidgetType === 'microApp') {
      setPendingMicroAppDrop({
        x: widgetPosition.x,
        y: widgetPosition.y,
        groupId: targetGroupId || undefined,
        mode: 'widget',
      });
      return;
    }

    if (resolvedWidgetType.startsWith('floating-')) {
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      const pixelX = lastMousePosRef.current.x - (containerRect?.left || 0);
      const pixelY = lastMousePosRef.current.y - (containerRect?.top || 0);

      if (resolvedWidgetType === 'floating-assistantHub') {
        addFloatingModuleLocal(
          'assistantHub',
          '鍔╂墜涓績',
          { entries: [] },
          {
            width: 720, height: 500,
            collapsedWidth: 60, collapsedHeight: 60,
            isExpanded: false,
            expandAnchor: 'top-left',
            position: { x: pixelX, y: pixelY },
          }
        );
      } else if (resolvedWidgetType === 'floating-microApp') {
        setPendingMicroAppDrop({ x: pixelX, y: pixelY, mode: 'floating' });
      }
      return;
    }

    if (isChartPresetWidgetKey(resolvedWidgetType)) {
      createChartWidgetByPreset({
        widgetKey: resolvedWidgetType,
        addWidget,
        updateWidget,
        position: widgetPosition,
      });
      return;
    }

    addWidget(resolvedWidgetType as WidgetType, widgetPosition);
  }, [
    addFloatingModuleLocal,
    addWidget,
    updateWidget,
    canvasContainerRef,
    createEmptyGroup,
    findParentGroupIdByGrid,
    groupMap,
    isEditMode,
    resolveDropPayload,
    setPendingMicroAppDrop,
  ]);

  const syncLayoutFromGrid = useCallback(() => {
    if (pendingSyncFrameRef.current !== null) {
      return;
    }

    // 🔧 延迟到下一帧，确保 GridStack 的 DOM 更新完成（特别是 SubGrid）
    pendingSyncFrameRef.current = requestAnimationFrame(() => {
      const currentLayout = saveOptions();

      // 🔧 从 engine.nodes 构建 ID -> node 映射，用于获取准确的 w/h
      // GridStack 的 save() 方法有时不返回 w 属性，需要从 engine.nodes 获取
      const engineNodeMap = new Map<string, any>();
      if (gridStack?.engine?.nodes) {
        const collectNodes = (nodes: any[]) => {
          nodes.forEach((node: any) => {
            if (node.id) {
              engineNodeMap.set(node.id, node);
            }
            // 递归收集 SubGrid 中的节点
            if (node.subGrid?.engine?.nodes) {
              collectNodes(node.subGrid.engine.nodes);
            }
          });
        };
        collectNodes(gridStack.engine.nodes);
      }

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

          // 🔧 修复：优先从 engine.nodes 获取准确的 w/h
          const engineNode = engineNodeMap.get(id);
          let itemW = item.w ?? engineNode?.w;
          let itemH = item.h ?? engineNode?.h;

          // 如果还是没有，尝试从 DOM 读取
          if (itemW === undefined || itemH === undefined) {
            const el = document.querySelector(`[gs-id="${id}"]`);
            if (el) {
              const gsW = el.getAttribute('gs-w');
              const gsH = el.getAttribute('gs-h');
              if (itemW === undefined && gsW) {
                itemW = parseInt(gsW, 10);
              }
              if (itemH === undefined && gsH) {
                itemH = parseInt(gsH, 10);
              }
            }
          }

          const absoluteLayout: Layout = {
            i: id,
            x: (item.x ?? 0) + offsetX,
            y: (item.y ?? 0) + offsetY,
            w: itemW ?? 4,
            h: itemH ?? 2,
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

      // 🔧 调试日志：查看解析后的布局数据
      // console.log('[syncLayoutFromGrid] Parsed widgetLayouts:', JSON.stringify(widgetLayouts, null, 2));

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
  }, [saveOptions, updateLayout, _rawWidgetMetaMap, widgetMap, gridStack]);

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
    if (!gridStack) {
      return;
    }

    let hasDomChanges = false;
    const nextMetaMap = new Map<string, GridStackWidget>(_rawWidgetMetaMap.value);

    groups.forEach((group) => {
      const groupNode = findGridNodeById(gridStack, group.id);
      const subGrid = groupNode?.subGrid;
      if (!subGrid) {
        return;
      }

      const desiredIds = group.widgetIds.filter((id) => widgetMap.has(id));
      const desiredIdSet = new Set(desiredIds);
      const currentNodes = subGrid.engine?.nodes || [];
      const currentIds = currentNodes
        .map((node) => (node?.id ? String(node.id) : ''))
        .filter(Boolean);

      desiredIds.forEach((widgetId) => {
        if (currentIds.includes(widgetId)) {
          return;
        }

        const widget = widgetMap.get(widgetId);
        if (!widget) {
          return;
        }

        const childNode = createGroupChildGridNode(widget, group);
        subGrid.addWidget(childNode);
        nextMetaMap.set(widgetId, childNode);
        hasDomChanges = true;
      });

      currentIds.forEach((widgetId) => {
        if (desiredIdSet.has(widgetId)) {
          return;
        }

        const widgetEl = document.body.querySelector<HTMLElement>(`[gs-id="${widgetId}"]`);
        if (widgetEl) {
          subGrid.removeWidget(widgetEl, true, false);
          nextMetaMap.delete(widgetId);
          hasDomChanges = true;
        }
      });
    });

    if (!hasDomChanges) {
      return;
    }

    isApplyingStoreLayout.current = true;
    try {
      _rawWidgetMetaMap.set(nextMetaMap);
      syncLayoutFromGrid();
    } finally {
      requestAnimationFrame(() => {
        isApplyingStoreLayout.current = false;
      });
    }
  }, [groups, gridStack, syncLayoutFromGrid, widgetMap, _rawWidgetMetaMap]);

  useEffect(() => {
    if (gridStack) {
      if (isEditMode) {
        gridStack.enable();
      } else {
        gridStack.disable();
      }
    }
  }, [gridStack, isEditMode]);

  // 注册侧边栏组件拖入画布（setupDragIn 是静态方法，每次 Drawer 打开时 DOM 重建需要重新注册）
  useEffect(() => {
    if (!gridStack || !isEditMode) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastItemCount = 0;

    const register = () => {
      const items = document.querySelectorAll('.widget-drag-item');
      // 仅当元素数量发生变化时才重新注册（避免无效调用）
      if (items.length > 0 && items.length !== lastItemCount) {
        lastItemCount = items.length;
        GridStack.setupDragIn('.widget-drag-item', {
          appendTo: 'body',
          helper: 'clone',
        });
      } else if (items.length === 0) {
        lastItemCount = 0;
      }
    };

    // 立即尝试注册一次
    register();

    // 监听 DOM 变化（WidgetDrawer 打开/关闭时），加防抖避免频繁触发
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(register, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [gridStack, isEditMode]);

  // 追踪鼠标实际位置，用于悬浮模块拖放定位（比网格坐标转像素更精确）
  useEffect(() => {
    if (!isEditMode) return;
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isEditMode]);

  // 监听外部元素拖入画布事件（dropped）
  useEffect(() => {
    if (!gridStack) return;

    const handleDropped = (_event: Event, _prevNode: GridStackNode, newNode: GridStackNode) => {
      handleExternalDrop(gridStack, _event, _prevNode, newNode);
      return;

      if (!isEditMode) return;

      // 从 newNode.content 读取 widget 类型（在 data-gs-widget JSON 中设置）
      // newNode.el 是 GridStack 创建的 .grid-stack-item 包装元素，不携带原始属性
      const widgetType = newNode.content as string | undefined;
      // console.log(widgetType)
      // 从网格中移除 GridStack 自动插入的临时节点
      const el = newNode.el;
      if (el) {
        try {
          const ownerGrid = (el?.gridstackNode?.grid || gridStack)!;
          if (ownerGrid && el) {
            ownerGrid.removeWidget(el!, true, false);
          }
        } catch {
          // 忽略移除失败
        }
      }

      if (!widgetType) return;
      const resolvedWidgetType = widgetType as string;

      // 只传 x/y 位置，w/h 让 addWidget 使用 store 中各组件类型的默认尺寸
      // 这样拖拽放置和点击添加的组件大小保持一致
      const dropX = newNode.x ?? 0;
      const dropY = newNode.y ?? 0;

      // 分组
      if (resolvedWidgetType === 'create-group') {
        createEmptyGroup();
        return;
      }

      // 微应用：暂存拖放位置，由 Layout 打开市场选择器
      if (resolvedWidgetType === 'microApp') {
        setPendingMicroAppDrop({ x: dropX, y: dropY, mode: 'widget' });
        return;
      }

      // 悬浮模块：直接添加到鼠标释放位置（使用实际鼠标坐标，比网格坐标转换更精确）
      if (resolvedWidgetType.startsWith('floating-')) {
        // 鼠标坐标是 viewport-relative (clientX/Y)，但 FloatingModule 使用 position:fixed
        // 并以容器偏移为基准，所以需要减去容器偏移，避免位置偏移到右下方
        const containerRect = canvasContainerRef.current?.getBoundingClientRect();
        const pixelX = lastMousePosRef.current.x - (containerRect?.left || 0);
        const pixelY = lastMousePosRef.current.y - (containerRect?.top || 0);

        if (resolvedWidgetType === 'floating-assistantHub') {
          addFloatingModuleLocal(
            'assistantHub',
            '助手中心',
            { entries: [] },
            {
              width: 720, height: 500,
              collapsedWidth: 60, collapsedHeight: 60,
              isExpanded: false,
              expandAnchor: 'top-left',
              position: { x: pixelX, y: pixelY },
            }
          );
        } else if (resolvedWidgetType === 'floating-microApp') {
          // 悬浮微应用需要打开市场选择器
          setPendingMicroAppDrop({ x: pixelX, y: pixelY, mode: 'floating' });
        }
        return;
      }

      // 普通组件：通过 store 创建 widget（带拖放位置）
      if (isChartPresetWidgetKey(resolvedWidgetType)) {
        createChartWidgetByPreset({
          widgetKey: resolvedWidgetType,
          addWidget,
          updateWidget,
          position: { x: dropX, y: dropY },
        });
        return;
      }

      addWidget(resolvedWidgetType as WidgetType, { x: dropX, y: dropY });
    };

    gridStack.on('dropped', handleDropped as any);

    return () => {
      gridStack.off('dropped');
    };
  }, [gridStack, isEditMode, addWidget, updateWidget, createEmptyGroup, addFloatingModuleLocal, setPendingMicroAppDrop, handleExternalDrop]);

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

  useEffect(() => {
    if (!gridStack) {
      return;
    }

    const handleNestedDropped = (ownerGrid: GridStack) =>
      (event: Event, prevNode: GridStackNode, newNode: GridStackNode) => {
        handleExternalDrop(ownerGrid, event, prevNode, newNode);
      };

    syncNestedGridDropListeners(gridStack, handleNestedDropped);

    const handleSubGridAdded = () => {
      window.setTimeout(() => {
        syncNestedGridDropListeners(gridStack, handleNestedDropped);
      }, 100);
    };

    gridStack.on('added', handleSubGridAdded);

    return () => {
      gridStack.off('added');
    };
  }, [gridStack, handleExternalDrop]);

  return (
    <CanvasThemeProvider containerRef={canvasContainerRef}>
      <div
        ref={canvasContainerRef}
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
      </div>
    </CanvasThemeProvider>
  );
};

/**
 * DashboardGridStack 主组件
 */

const DashboardGridStack: React.FC = () => {
  const { widgets, groups, gridDensity, loadDashboardFromData, setEditMode } = useStore();
  const persistApi = (useStore as typeof useStore & { persist?: PersistHelpers }).persist;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const [isLoadingRemoteData, setIsLoadingRemoteData] = useState(true);
  const [remoteDataLoaded, setRemoteDataLoaded] = useState(false);

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
      acceptWidgets: (_el: Element) => true,
      children,
    };
  }, [widgets, groups, gridDensity]);

  // 如果没有 editId，直接使用 localStorage 数据初始化
  // 如果有 editId，等待 API 数据加载完成后再初始化
  const [initialOptions, setInitialOptions] = useState<GridStackOptions | null>(null);

  const [isHydrated, setIsHydrated] = useState<boolean>(() => {
    if (!persistApi?.hasHydrated) {
      return true;
    }
    return persistApi.hasHydrated();
  });

  // 仅将全局配色（baseColors/customTokens）写入 ConfigStore
  // themeMode/styleMode 保留在 dashboardConfig 中由 CanvasThemeProvider 处理
  const applyGlobalColorsFromConfig = useCallback((config?: DashboardConfig | null) => {
    if (!config) {
      return;
    }
    const globalUpdate: Record<string, unknown> = {};
    if (config.baseColors) {
      globalUpdate.baseColors = config.baseColors;
    }
    if (config.customTokens) {
      globalUpdate.customTokens = config.customTokens;
    }
    if (Object.keys(globalUpdate).length > 0) {
      useConfigStore.setState(globalUpdate);
    }
  }, []);

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

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    let cancelled = false;

    const loadData = async () => {
      setIsLoadingRemoteData(true);
      if (!editId) {
        message.info('请从应用列表新建或编辑应用');
        navigate('/publish-list', { replace: true });
        if (!cancelled) {
          setIsLoadingRemoteData(false);
        }
        return;
      }

      // 加载新的远程数据时，重置 GridStack 初始化选项
      // 确保 GridStack 使用新数据重新初始化，而不是复用旧的 children
      setInitialOptions(null);
      setRemoteDataLoaded(false);

      try {
        const res = await getPublishedDashboard({ id: editId });
        if (res.code === 20000 && res.data) {
          const snapshot = parseDashboardSnapshot(res.data.dashboardConfig);
          if (!snapshot) {
            message.error('解析工作台配置失败');
          } else {
            const config = sanitizeDashboardConfig(snapshot.dashboardConfig || {});
            applyGlobalColorsFromConfig(config);
            loadDashboardFromData({
              widgets: snapshot.widgets,
              groups: snapshot.groups,
              floatingModules: snapshot.floatingModules,
              coverUrl: (res.data as typeof res.data & { cover_url?: string }).cover_url ?? res.data.coverUrl ?? '',
              dashboardConfig: {
                backgroundType: 'color',
                ...config,
                title: res.data.title,
              },
            });
            setEditMode(true);
            message.success('已加载工作台数据');
          }
        } else {
          message.error(res.message || '加载工作台数据失败');
          navigate('/publish-list', { replace: true });
        }
      } catch (error) {
        console.error('加载工作台数据失败:', error);
        message.error('加载工作台数据失败');
        navigate('/publish-list', { replace: true });
      }

      if (!cancelled) {
        setRemoteDataLoaded(true);
        setIsLoadingRemoteData(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [editId, isHydrated, loadDashboardFromData, setEditMode, applyGlobalColorsFromConfig, navigate]);

  useEffect(() => {
    if (!isHydrated || !remoteDataLoaded || initialOptions) {
      return;
    }
    setInitialOptions(buildGridOptions());
  }, [isHydrated, remoteDataLoaded, initialOptions, buildGridOptions]);

  if (isLoadingRemoteData) {
    return (
      <div className="dashboard-container dashboard-loading">
        正在加载工作台数据...
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

function createGroupChildGridNode(widget: Widget, group: WidgetGroup): GridStackWidget & { id: string } {
  const baseNode = createWidgetGridNode(widget);
  const relativeX = (widget.layout.x || 0) - (group.layout.x || 0);
  const relativeY = (widget.layout.y || 0) - (group.layout.y || 0);

  return {
    ...baseNode,
    x: Math.max(relativeX, 0),
    y: Math.max(relativeY, 0),
    autoPosition: undefined,
  };
}

function findGridNodeById(grid: GridStack | null, targetId: string): GridStackNode | null {
  const findInNodes = (nodes: GridStackNode[] | undefined): GridStackNode | null => {
    if (!nodes) {
      return null;
    }

    for (const node of nodes) {
      if (!node) {
        continue;
      }

      if (String(node.id) === targetId) {
        return node;
      }

      const nestedNode = findInNodes(node.subGrid?.engine?.nodes);
      if (nestedNode) {
        return nestedNode;
      }
    }

    return null;
  };

  return findInNodes(grid?.engine?.nodes);
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
      acceptWidgets: (_el: Element) => true,
      // column: COLUMN_COUNT,
      column: 'auto',
      cellHeight: preset.cellHeight,
      margin: preset.margin,
      minRow: 1,  // 确保空分组至少有一行高度，可作为拖拽目标
      // alwaysShowResizeHandle: false,
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

function syncNestedGridDropListeners(
  grid: GridStack | null,
  createDroppedHandler: (ownerGrid: GridStack) => (event: Event, prevNode: GridStackNode, newNode: GridStackNode) => void
) {
  if (!grid?.engine?.nodes) return;

  grid.engine.nodes.forEach((node: any) => {
    if (node?.subGrid) {
      node.subGrid.off('dropped');
      node.subGrid.on('dropped', createDroppedHandler(node.subGrid) as any);
      syncNestedGridDropListeners(node.subGrid, createDroppedHandler);
    }
  });
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
