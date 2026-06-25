import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  memo,
  useEffect,
} from 'react';
import {
  DragOutlined,
  SettingOutlined,
  CloseOutlined,
  MinusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Button, Modal } from 'antd';
import { DraggableCore, DraggableData, DraggableEvent, DraggableEventHandler } from 'react-draggable';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import { isValidCssGradient } from '@/components/BackgroundSettings';
import MicroAppWidget from '../widgets/MicroAppWidget';
import MicroAppDegradeCard from '../MicroAppDegradeCard';
import { LocalComponentRegistry } from './components';
import IconRenderer from '../IconRenderer';
import type { DashboardConfig, Widget, FloatingModuleConfig } from '@/types';
import { usePortalRuntime } from '@/runtime/portal-runtime-context';
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter';
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs';
import './index.scss';

const { confirm } = Modal;
const VIEWPORT_PADDING = 20;
const DASHBOARD_CONTAINER_SELECTOR = '.dashboard-container';
const PREVIEW_CONTAINER_SELECTOR = '.dashboard-preview-container';

type Position = { x: number; y: number };
type Size = { width: number; height: number };
type Viewport = { width: number; height: number };
type ContainerElement = HTMLElement | null;
type ContainerOffset = { left: number; top: number };

const findFloatingContainer = (): ContainerElement => {
  if (typeof document === 'undefined') {
    return null;
  }
  return (
    (document.querySelector(DASHBOARD_CONTAINER_SELECTOR) as HTMLElement) ||
    (document.querySelector(PREVIEW_CONTAINER_SELECTOR) as HTMLElement) ||
    null
  );
};

const getViewportSize = (container?: ContainerElement): Viewport => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { width: 0, height: 0 };
  }
  const winW = window.innerWidth || document.documentElement?.clientWidth || 0;
  const winH = window.innerHeight || document.documentElement?.clientHeight || 0;
  if (container) {
    const offset = getContainerOffset(container);
    // 将容器尺寸限制在可见视口范围内，避免可滚动容器的 clientHeight 超出屏幕
    return {
      width: Math.min(container.clientWidth, winW - offset.left),
      height: Math.min(container.clientHeight, winH - offset.top),
    };
  }
  return { width: winW, height: winH };
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const getContainerOffset = (container?: ContainerElement): ContainerOffset => {
  if (!container) {
    return { left: 0, top: 0 };
  }
  const rect = container.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
  };
};

// 确保整个矩形在视口内
const clampPosition = (
  position: Position,
  size: Size,
  viewport: Viewport,
  padding = VIEWPORT_PADDING
): Position => {
  if (!viewport.width || !viewport.height) return position;

  const maxX = Math.max(padding, viewport.width - size.width - padding);
  const maxY = Math.max(padding, viewport.height - size.height - padding);

  return {
    x: clamp(position.x, padding, maxX),
    y: clamp(position.y, padding, maxY),
  };
};

// 将绝对位置转换为比例值 (0~1)
const remapPositionForViewport = (
  position: Position,
  blockSize: Size,
  previousViewport: Viewport,
  nextViewport: Viewport,
): Position => {
  const adjustAxis = (
    prevCoord: number,
    prevViewSize: number,
    nextViewSize: number,
    currentBlockSize: number
  ) => {
    if (!prevViewSize || !nextViewSize) {
      return prevCoord;
    }
    if (prevViewSize === nextViewSize) {
      return prevCoord;
    }
    const prevMax = Math.max(
      VIEWPORT_PADDING,
      prevViewSize - currentBlockSize - VIEWPORT_PADDING
    );
    const prevRange = prevMax - VIEWPORT_PADDING;
    if (prevRange <= 0) {
      const nextMax = Math.max(
        VIEWPORT_PADDING,
        nextViewSize - currentBlockSize - VIEWPORT_PADDING
      );
      return clamp(prevCoord, VIEWPORT_PADDING, nextMax);
    }
    const ratio = clamp(
      (prevCoord - VIEWPORT_PADDING) / prevRange,
      0,
      1
    );
    const nextMax = Math.max(
      VIEWPORT_PADDING,
      nextViewSize - currentBlockSize - VIEWPORT_PADDING
    );
    const nextRange = Math.max(0, nextMax - VIEWPORT_PADDING);
    const raw = VIEWPORT_PADDING + ratio * nextRange;
    return clamp(raw, VIEWPORT_PADDING, nextMax);
  };

  return clampPosition({
    x: adjustAxis(
      position.x,
      previousViewport.width,
      nextViewport.width,
      blockSize.width
    ),
    y: adjustAxis(
      position.y,
      previousViewport.height,
      nextViewport.height,
      blockSize.height
    ),
  }, blockSize, nextViewport);
};

const positionToRatio = (
  pos: Position,
  size: Size,
  viewport: Viewport,
  padding = VIEWPORT_PADDING
): { x: number; y: number } => {
  const rangeX = Math.max(1, viewport.width - size.width - 2 * padding);
  const rangeY = Math.max(1, viewport.height - size.height - 2 * padding);
  return {
    x: clamp((pos.x - padding) / rangeX, 0, 1),
    y: clamp((pos.y - padding) / rangeY, 0, 1),
  };
};

// 将比例值转换为绝对位置
const ratioToPosition = (
  ratio: { x: number; y: number },
  size: Size,
  viewport: Viewport,
  padding = VIEWPORT_PADDING
): Position => {
  const rangeX = Math.max(0, viewport.width - size.width - 2 * padding);
  const rangeY = Math.max(0, viewport.height - size.height - 2 * padding);
  return {
    x: padding + ratio.x * rangeX,
    y: padding + ratio.y * rangeY,
  };
};

// 保持中心不变地换算新位置（用于展开/收起尺寸切换）
const keepCenterPosition = (pos: Position, currentSize: Size, targetSize: Size): Position => ({
  x: pos.x + (currentSize.width - targetSize.width) / 2,
  y: pos.y + (currentSize.height - targetSize.height) / 2,
});

// 计算从 currentSize 变换到 targetSize 后的新位置
// 逻辑：尝试保持“重心”或相对象限位置不变
const calculateSmartPosition = (
  currentPos: Position,
  currentSize: Size,
  targetSize: Size,
  viewport: Viewport
): Position => {
  if (!viewport.width || !viewport.height) return currentPos;

  const currentCenterX = currentPos.x + currentSize.width / 2;
  const currentCenterY = currentPos.y + currentSize.height / 2;

  const viewportCenterX = viewport.width / 2;
  const viewportCenterY = viewport.height / 2;

  let newX = currentPos.x;
  let newY = currentPos.y;

  // 如果在右半边，尝试向左扩展（保持右边界不动）
  if (currentCenterX > viewportCenterX) {
    newX = currentPos.x + (currentSize.width - targetSize.width);
  }

  // 如果在下半边，尝试向上扩展（保持下边界不动）
  if (currentCenterY > viewportCenterY) {
    newY = currentPos.y + (currentSize.height - targetSize.height);
  }

  // 最后进行边界限制，确保不会跑出去
  return clampPosition({ x: newX, y: newY }, targetSize, viewport);
};

interface FloatingModuleProps {
  widget: Widget;
  dashboardConfig?: DashboardConfig;
}

const FloatingModule: React.FC<FloatingModuleProps> = memo(({ widget, dashboardConfig }) => {
  const initialContainer = typeof document !== 'undefined' ? findFloatingContainer() : null;
  const initialViewport = getViewportSize(initialContainer);
  const initialOffset = initialContainer ? getContainerOffset(initialContainer) : { left: 0, top: 0 };
  const {
    isEditMode,
    updateFloatingModulePosition,
    updateFloatingModuleSize,
    toggleFloatingModuleExpanded,
    removeFloatingModule,
    openConfigPanel,
  } = useStore();
  const { themeMode } = useCanvasTheme();
  const { microAppMode } = usePortalRuntime();
  const emitWidgetEvent = useWidgetEventEmitter(widget);
  const [containerEl, setContainerEl] = useState<ContainerElement>(initialContainer);
  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const [containerOffset, setContainerOffset] = useState<ContainerOffset>(initialOffset);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedMoved, setExpandedMoved] = useState(false);

  const config = widget.config as FloatingModuleConfig;
  const collapsedWidth = config.collapsedWidth || 60;
  const collapsedHeight = config.collapsedHeight || 60;
  const collapsedIcon = config.collapsedIcon || config.iconSvg || config.icon;
  const collapsedBgColor = config.collapsedBgColor || '#1677ff';
  const collapsedIconSize = config.collapsedIconSize || 28;
  const initialSizeState: Size =
    config.isExpanded === false
      ? { width: collapsedWidth, height: collapsedHeight }
      : { width: config.width || 380, height: config.height || 400 };

  // 核心状态：位置、尺寸、展开状态
  // Position 始终是当前可见元素的左上角
  const [isExpanded, setIsExpanded] = useState(
    typeof config.isExpanded === 'boolean' ? config.isExpanded : true
  );

  const [size, setSize] = useState<Size>(initialSizeState);
  const sizeRef = useRef<Size>(initialSizeState);

  const [position, setPosition] = useState<Position>(() => {
    // 优先使用比例值（基于容器可见视口），还原为容器内坐标
    if (config.positionRatio && initialViewport.width && initialViewport.height) {
      return clampPosition(
        ratioToPosition(config.positionRatio, initialSizeState, initialViewport),
        initialSizeState,
        initialViewport,
      );
    }

    // 如果有保存的绝对位置，直接使用并限制在视口内
    if (config.position) {
      return clampPosition(config.position, initialSizeState, initialViewport);
    }

    // 默认位置逻辑
    const vp = initialViewport;
    const padding = VIEWPORT_PADDING;
    const maxX = Math.max(padding, vp.width - initialSizeState.width - padding);
    const maxY = Math.max(padding, vp.height - initialSizeState.height - padding);

    // 根据 defaultPosition 计算
    switch (config.defaultPosition) {
      case 'bottom-left': return { x: padding, y: maxY };
      case 'top-left': return { x: padding, y: padding };
      case 'top-right': return { x: maxX, y: padding };
      case 'center': return { x: (vp.width - initialSizeState.width) / 2, y: (vp.height - initialSizeState.height) / 2 };
      case 'bottom-right':
      default: return { x: maxX, y: maxY };
    }
  });

  // Refs for debouncing updates
  const savePositionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveSizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<Viewport>(initialViewport);
  const lastCollapsedPosRef = useRef<Position | null>(null);
  const lastExpandedPosRef = useRef<Position | null>(null);
  const positionRef = useRef<Position>(position);
  const justDraggedRef = useRef(false);
  const dragStartPosRef = useRef<Position | null>(null);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const applyNodeTransform = useCallback((nextPosition: Position) => {
    if (!nodeRef.current) {
      return;
    }
    nodeRef.current.style.transform = `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0)`;
  }, []);

  useEffect(() => {
    positionRef.current = position;
    applyNodeTransform(position);
  }, [position, applyNodeTransform]);

  useEffect(() => {
    if (containerEl && containerEl.isConnected) {
      return;
    }
    const next = findFloatingContainer();
    if (next && next !== containerEl) {
      setContainerEl(next);
      setViewport(getViewportSize(next));
      setContainerOffset(getContainerOffset(next));
    }
  }, [containerEl]);

  useEffect(() => {
    const el = containerEl;
    if (!el) {
      if (typeof window === 'undefined') {
        return;
      }
      const handleWindowResize = () => {
        setViewport(getViewportSize());
        setContainerOffset({ left: 0, top: 0 });
      };
      window.addEventListener('resize', handleWindowResize);
      return () => {
        window.removeEventListener('resize', handleWindowResize);
      };
    }

    const updateViewportOnly = () => {
      setViewport(getViewportSize(el));
    };

    const updateMetrics = () => {
      updateViewportOnly();
      setContainerOffset(getContainerOffset(el));
    };

    updateMetrics();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateMetrics()) : null;
    resizeObserver?.observe(el);

    const handleScroll = () => updateViewportOnly();
    el.addEventListener('scroll', handleScroll, { passive: true });
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateMetrics);
    }

    return () => {
      resizeObserver?.disconnect();
      el.removeEventListener('scroll', handleScroll);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateMetrics);
      }
    };
  }, [containerEl]);

  useEffect(() => {
    setPosition((prev) => {
      const previousViewport = viewportRef.current;
      const sizeSnapshot = sizeRef.current;
      viewportRef.current = viewport;

      if (
        previousViewport.width === viewport.width &&
        previousViewport.height === viewport.height
      ) {
        return prev;
      }

      if (lastExpandedPosRef.current) {
        lastExpandedPosRef.current = remapPositionForViewport(
          lastExpandedPosRef.current,
          { width: config.width || 380, height: config.height || 400 },
          previousViewport,
          viewport,
        );
      }

      if (lastCollapsedPosRef.current) {
        lastCollapsedPosRef.current = remapPositionForViewport(
          lastCollapsedPosRef.current,
          { width: collapsedWidth, height: collapsedHeight },
          previousViewport,
          viewport,
        );
      }

      return remapPositionForViewport(prev, sizeSnapshot, previousViewport, viewport);
    });
  }, [viewport.width, viewport.height, config.width, config.height, collapsedWidth, collapsedHeight]);

  // 当外部 config 改变时同步状态 (主要是为了响应其他用户的修改或重置)
  // 注意：这可能会与本地交互冲突，所以这里只在必要属性变化时更新，且加防抖或判断
  useEffect(() => {
    if (typeof config.isExpanded === 'boolean' && config.isExpanded !== isExpanded) {
      setIsExpanded(config.isExpanded);
      const newSize = config.isExpanded
        ? { width: config.width || 380, height: config.height || 400 }
        : { width: collapsedWidth, height: collapsedHeight };
      setSize(newSize);
      setPosition(prev => {
        if (config.isExpanded) {
          lastCollapsedPosRef.current = prev;
          setExpandedMoved(false);
          let expandedPos: Position;
          if (lastExpandedPosRef.current) {
            expandedPos = clampPosition(lastExpandedPosRef.current, newSize, viewport);
          } else if (config.expandAnchor === 'top-left') {
            expandedPos = clampPosition(prev, newSize, viewport);
          } else {
            expandedPos = calculateSmartPosition(prev, size, newSize, viewport);
          }
          lastExpandedPosRef.current = expandedPos;
          return expandedPos;
        }
        const folded = expandedMoved
          ? clampPosition(prev, newSize, viewport)
          : clampPosition(lastCollapsedPosRef.current || prev, newSize, viewport);
        lastCollapsedPosRef.current = folded;
        return folded;
      });
    }
  }, [config.isExpanded, expandedMoved]);

  // Theme logic
  const actualTheme = useMemo(
    () => (config.theme === 'auto' ? themeMode : config.theme || 'light'),
    [config.theme, themeMode],
  );

  // 计算背景样式
  const backgroundStyle = useMemo(() => {
    const style: React.CSSProperties = {};
    const bgType = config.backgroundType || 'color';

    if (bgType === 'color' && config.backgroundColor) {
      // 处理 ColorPicker 返回的对象或字符串，优先 toRgbString 保留 alpha
      const bgColor = config.backgroundColor as any;
      let color: string;
      if (typeof bgColor === 'string') {
        color = bgColor;
      } else if (typeof bgColor === 'object' && bgColor?.toRgbString) {
        color = bgColor.toRgbString();
      } else if (typeof bgColor === 'object' && bgColor?.toHexString) {
        color = bgColor.toHexString();
      } else if (typeof bgColor === 'object' && bgColor?.metaColor) {
        const { r, g, b, a } = bgColor.metaColor;
        color = a !== undefined && a < 1
          ? `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
          : `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      } else {
        color = String(bgColor);
      }
      style.backgroundColor = color;
    } else if (bgType === 'image' && config.backgroundImage) {
      style.backgroundImage = `url(${config.backgroundImage})`;
      style.backgroundSize = config.backgroundSize || 'auto';
      style.backgroundRepeat = config.backgroundRepeat || 'no-repeat';
      style.backgroundPosition = config.backgroundPosition || 'center';
    } else if (bgType === 'gradient' && config.backgroundGradient && isValidCssGradient(config.backgroundGradient)) {
      style.background = config.backgroundGradient;
    }

    return style;
  }, [
    config.backgroundType,
    config.backgroundColor,
    config.backgroundImage,
    config.backgroundGradient,
    config.backgroundSize,
    config.backgroundRepeat,
    config.backgroundPosition,
  ]);

  const moduleStyle = useMemo(
    () => ({
      width: size.width,
      height: size.height,
      zIndex: config.zIndex || 9999,
      borderRadius: config.borderRadius || 12,
      ...backgroundStyle,
    }),
    [size.width, size.height, config.zIndex, config.borderRadius, backgroundStyle],
  );

  // 判断是否有自定义背景
  const hasCustomBackground = useMemo(() => {
    const bgType = config.backgroundType || 'color';
    return (
      (bgType === 'color' && config.backgroundColor) ||
      (bgType === 'image' && config.backgroundImage) ||
      (bgType === 'gradient' && config.backgroundGradient)
    );
  }, [config.backgroundType, config.backgroundColor, config.backgroundImage, config.backgroundGradient]);

  const headerStyle = useMemo(
    () => config.headerColor ? { background: config.headerColor } : {},
    [config.headerColor],
  );

  const isDraggable = useMemo(
    () => isEditMode && config.draggable !== false,
    [isEditMode, config.draggable],
  );

  const isResizable = useMemo(
    () => isExpanded && isEditMode && config.resizable !== false,
    [isExpanded, isEditMode, config.resizable],
  );

  // Handlers
  const debouncedSavePosition = useCallback(
    (pos: Position, currentSize?: Size) => {
      if (savePositionTimeoutRef.current) clearTimeout(savePositionTimeoutRef.current);
      savePositionTimeoutRef.current = setTimeout(() => {
        const sizeForRatio = currentSize || sizeRef.current;
        // 基于容器可见视口计算 ratio
        const ratio = positionToRatio(pos, sizeForRatio, viewport);
        updateFloatingModulePosition(widget.id, pos, ratio);
      }, 300);
    },
    [widget.id, updateFloatingModulePosition, viewport]
  );

  const debouncedSaveSize = useCallback(
    (nextSize: Size) => {
      if (saveSizeTimeoutRef.current) clearTimeout(saveSizeTimeoutRef.current);
      saveSizeTimeoutRef.current = setTimeout(() => {
        updateFloatingModuleSize(widget.id, nextSize);
      }, 300);
    },
    [widget.id, updateFloatingModuleSize]
  );

  const handleDragStart: DraggableEventHandler = useCallback(() => {
    setIsDragging(true);
    dragStartPosRef.current = positionRef.current;
  }, []);

  const handleDrag = useCallback((_e: DraggableEvent, data: DraggableData) => {
    const finalPos = clampPosition({
      x: positionRef.current.x + data.deltaX,
      y: positionRef.current.y + data.deltaY,
    }, sizeRef.current, viewportRef.current);
    positionRef.current = finalPos;
    applyNodeTransform(finalPos);
  }, [applyNodeTransform]);

  const handleDragStop: DraggableEventHandler = useCallback(() => {
    const finalPos = positionRef.current;
    setPosition(finalPos);
    setIsDragging(false);
    const start = dragStartPosRef.current;
    const didMove = start ? Math.abs(finalPos.x - start.x) > 2 || Math.abs(finalPos.y - start.y) > 2 : false;
    dragStartPosRef.current = null;
    if (didMove) {
      justDraggedRef.current = true;
      requestAnimationFrame(() => { justDraggedRef.current = false; });
      if (isExpanded) {
        lastExpandedPosRef.current = finalPos;
        setExpandedMoved(true);
      } else {
        lastCollapsedPosRef.current = finalPos;
        // 收起状态拖到新位置后，清除旧的展开位置，下次展开基于新位置计算
        lastExpandedPosRef.current = null;
      }
    }
    debouncedSavePosition(finalPos);
    emitWidgetEvent('floating.moveEnd', { moduleId: widget.id, position: finalPos }, 'system');
  }, [debouncedSavePosition, emitWidgetEvent, isExpanded, widget.id]);

  const handleResize = useCallback((_e: any, { size: nextSize }: ResizeCallbackData) => {
    setSize(nextSize);
  }, []);

  const handleResizeStop = useCallback((_e: any, { size: nextSize }: ResizeCallbackData) => {
    setSize(nextSize);
    debouncedSaveSize(nextSize);
    // Resize 后也要检查边界，防止溢出
    setPosition(prev => clampPosition(prev, nextSize, viewport));
    emitWidgetEvent('floating.resizeEnd', { moduleId: widget.id, size: nextSize }, 'system');
  }, [debouncedSaveSize, emitWidgetEvent, viewport, widget.id]);

  const toggleExpand = useCallback((event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();

    // 拖拽刚结束时的 click 不应触发展开
    if (justDraggedRef.current) return;
    if (config.collapsible === false) return;

    const nextExpanded = !isExpanded;
    let nextSize: Size;
    let nextPos: Position;

    if (nextExpanded) {
      nextSize = { width: config.width || 380, height: config.height || 400 };
      lastCollapsedPosRef.current = position;
      setExpandedMoved(false);
      if (lastExpandedPosRef.current) {
        // 有记忆的展开位置，直接恢复
        nextPos = clampPosition(lastExpandedPosRef.current, nextSize, viewport);
      } else if (config.expandAnchor === 'top-left') {
        // 基于左上角展开：保持当前位置不变，向右下方扩展，clamp 确保不超出视口
        nextPos = clampPosition(position, nextSize, viewport);
      } else {
        // 无记忆位置（首次展开或收起后拖拽过），基于当前位置智能计算
        nextPos = calculateSmartPosition(position, size, nextSize, viewport);
      }
      lastExpandedPosRef.current = nextPos;
    } else {
      nextSize = { width: collapsedWidth, height: collapsedHeight };
      // 展开 -> 折叠：若展开期间移动过，用当前展开位；否则回到进入展开时的折叠位
      nextPos = expandedMoved
        ? clampPosition(position, nextSize, viewport)
        : clampPosition(lastCollapsedPosRef.current || position, nextSize, viewport);
      lastCollapsedPosRef.current = nextPos;
    }

    setIsExpanded(nextExpanded);
    setSize(nextSize);
    setPosition(nextPos);

    toggleFloatingModuleExpanded(widget.id);
    debouncedSavePosition(nextPos);
    emitWidgetEvent(nextExpanded ? 'floating.expand' : 'floating.collapse', {
      moduleId: widget.id,
      position: nextPos,
      size: nextSize,
    }, 'click');
  }, [isExpanded, expandedMoved, config.width, config.height, config.collapsible, config.expandAnchor, collapsedWidth, collapsedHeight, position, size, viewport, widget.id, toggleFloatingModuleExpanded, debouncedSavePosition, emitWidgetEvent]);

  useWidgetEventInputs(widget, {
    open: () => {
      if (!isExpanded) toggleExpand();
    },
    expand: () => {
      if (!isExpanded) toggleExpand();
    },
    close: () => {
      if (isExpanded) toggleExpand();
    },
    collapse: () => {
      if (isExpanded) toggleExpand();
    },
  });

  const shellTransition = useMemo(
    () => ({ type: 'spring', stiffness: 260, damping: 28, mass: 1.1 }),
    [],
  );

  const shellAnimate = useMemo(
    () => ({
      width: size.width,
      height: size.height,
      borderRadius: config.borderRadius || 12,
      boxShadow: isExpanded
        ? '0 12px 48px rgba(0, 0, 0, 0.18)'
        : '0 6px 24px rgba(0, 0, 0, 0.25)',
      opacity: 1,
      scale: 1,
    }),
    [config.borderRadius, isExpanded, size.height, size.width],
  );

  const shellVariants = {
    expanded: {
      width: size.width,
      height: size.height,
      borderRadius: config.borderRadius || 12,
    },
    collapsed: {
      width: collapsedWidth,
      height: collapsedHeight,
      borderRadius: Math.min(collapsedWidth, collapsedHeight) / 2,
    },
  };

  const handleClose = useCallback((event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    confirm({
      title: '关闭悬浮窗',
      content: `确定要关闭"${widget.title}"吗？`,
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        emitWidgetEvent('floating.close', { moduleId: widget.id }, 'system');
        removeFloatingModule(widget.id);
      },
    });
  }, [emitWidgetEvent, widget.id, widget.title, removeFloatingModule]);

  const handleDelete = useCallback((event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    confirm({
      title: '删除悬浮模块',
      content: `确定要删除"${widget.title}"吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        emitWidgetEvent('floating.close', { moduleId: widget.id }, 'system');
        removeFloatingModule(widget.id);
      },
    });
  }, [emitWidgetEvent, widget.id, widget.title, removeFloatingModule]);

  const renderContent = useMemo(() => {
    if (config.contentType === 'microApp') {
      if (microAppMode === 'degrade') {
        return (
          <MicroAppDegradeCard
            title={widget.title}
            systemId={config.microApp?.systemId}
            moduleId={config.microApp?.moduleId}
            url={config.microApp?.url}
            entry={config.microApp?.entry}
            compact
          />
        );
      }

      return (
        <MicroAppWidget
          config={{
            systemId: config.microApp?.systemId,
            moduleId: config.microApp?.moduleId,
            microAppUrl: config.microApp?.url,
            microAppEntry: config.microApp?.entry,
            props: config.microApp?.props,
            sync: config.microApp?.sync,
            alive: config.microApp?.alive,
          }}
          dashboardConfig={dashboardConfig}
        />
      );
    }
    if (config.contentType === 'localComponent') {
      const componentType = config.localComponent?.componentType;
      if (!componentType) return <div className="error-message">未配置组件类型</div>;
      const Component = LocalComponentRegistry[componentType];
      if (!Component) return <div className="error-message">未找到组件 {componentType}</div>;
      return <Component {...(config.localComponent?.componentProps || {})} emitWidgetEvent={emitWidgetEvent} />;
    }
    return <div className="error-message">未知内容类型</div>;
  }, [config, dashboardConfig, emitWidgetEvent, microAppMode, widget.title]);

  return (
    <>
      <DraggableCore
        nodeRef={nodeRef}
        disabled={!isDraggable}
        onStart={handleDragStart}
        onDrag={handleDrag}
        onStop={handleDragStop}
        handle=".drag-handle"
      >
        <div
          ref={nodeRef}
          className={`floating-module-container${isDragging ? ' react-draggable-dragging' : ''}`}
          style={{
            position: 'fixed',
            left: containerEl ? containerOffset.left : 0,
            top: containerEl ? containerOffset.top : 0,
            zIndex: config.zIndex || 9999,
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            width: size.width,
            height: size.height
          }}
        >
          <Resizable
            width={size.width}
            height={size.height}
            onResize={handleResize}
            onResizeStop={handleResizeStop}
            minConstraints={[config.minWidth || 300, config.minHeight || 400]}
            maxConstraints={[config.maxWidth || 800, config.maxHeight || 900]}
            resizeHandles={isResizable ? ['se'] : []}
          >
            {/* Content Wrapper */}
            <div className="floating-module-wrapper" style={{ width: size.width, height: size.height }}>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key="floating-shell"
                  layout={!isDragging}
                  layoutId={`floating-shell-${widget.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={shellAnimate}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={isDragging ? { duration: 0 } : shellTransition}
                  className={`floating-module ${isExpanded ? 'expanded' : 'collapsed'} theme-${actualTheme} ${isResizable ? 'resizable' : ''}`}
                  style={{
                    ...moduleStyle,
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    cursor: isExpanded ? 'default' : 'pointer',
                    ...(collapsedBgColor && !isExpanded ? { background: collapsedBgColor } : {}),
                  }}
                  variants={shellVariants}
                  onClick={!isExpanded ? toggleExpand : undefined}
                >
                  {isExpanded && (config.showTitle !== false ? (
                    <div
                      className={`floating-module-header drag-handle ${hasCustomBackground ? 'custom-bg' : ''}`}
                      style={headerStyle}
                    >
                      {isDraggable && <DragOutlined className="drag-icon" />}
                      <span
                        className="title"
                        style={{
                          ...(config.titleColor ? { color: config.titleColor } : {}),
                          ...(config.titleFontSize ? { fontSize: Number(config.titleFontSize) } : {}),
                          ...(config.titleFontWeight ? { fontWeight: config.titleFontWeight } : {}),
                        }}
                      >
                        {widget.title}
                      </span>
                      <div
                        className="actions"
                        style={config.titleColor ? { color: config.titleColor } : undefined}
                      >
                        {isEditMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openConfigPanel({ type: 'floating', id: widget.id });
                            }}
                            className="action-btn config-btn"
                          >
                            <SettingOutlined />
                          </button>
                        )}
                        {config.collapsible !== false && (
                          <button onClick={toggleExpand} className="action-btn minimize-btn">
                            <MinusOutlined />
                          </button>
                        )}
                        {isEditMode ? (
                          <Button onClick={handleDelete} className="action-btn delete-btn" danger>
                            <DeleteOutlined />
                          </Button>
                        ) : (
                          config.closable !== false && ''
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`floating-module-header-transparent ${isEditMode ? 'drag-handle is-edit-mode' : 'is-preview-mode'}`}
                    >
                      {isDraggable && <DragOutlined className="drag-icon-transparent" />}
                      <div className="actions-transparent">
                        {isEditMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openConfigPanel({ type: 'floating', id: widget.id });
                            }}
                            className="action-btn-transparent"
                          >
                            <SettingOutlined />
                          </button>
                        )}
                        {config.collapsible !== false && (
                          <button onClick={toggleExpand} className="action-btn-transparent minimize-btn">
                            <MinusOutlined />
                          </button>
                        )}
                        {isEditMode && (
                          <button onClick={handleDelete} className="action-btn-transparent delete-btn">
                            <CloseOutlined />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <motion.div
                    layout={!isDragging}
                    className="floating-module-content"
                    animate={{
                      opacity: isExpanded ? 1 : 0,
                      height: isExpanded ? '100%' : 0,
                    }}
                    transition={isDragging ? { duration: 0 } : shellTransition}
                    style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
                  >
                    <div className="drag-mask" />
                    {renderContent}
                  </motion.div>

                  <motion.div
                    layout={!isDragging}
                    className="floating-module-collapsed-face drag-handle"
                    animate={{ opacity: isExpanded ? 0 : 1, scale: isExpanded ? 0.9 : 1 }}
                    transition={isDragging ? { duration: 0 } : shellTransition}
                    onDragStart={(event) => event.preventDefault()}
                  >
                    <IconRenderer
                      value={collapsedIcon as string}
                      size={collapsedIconSize}
                      color="#fff"
                      fallbackText={widget.title}
                    />
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </Resizable>
        </div>
      </DraggableCore>

    </>
  );
});

FloatingModule.displayName = 'FloatingModule';

export default FloatingModule;
