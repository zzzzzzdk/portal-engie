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
import Draggable, { DraggableEventHandler } from 'react-draggable';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useConfigStore } from '@/store/useConfigStore';
import MicroAppWidget from '../widgets/MicroAppWidget';
import { LocalComponentRegistry } from './components';
import ConfigDialog from '../ConfigDialog';
import Icon from '../Icon';
import type { Widget, FloatingModuleConfig } from '@/types';
import './index.scss';

const { confirm } = Modal;
const VIEWPORT_PADDING = 20;

type Position = { x: number; y: number };
type Size = { width: number; height: number };
type Viewport = { width: number; height: number };

const getViewportSize = (): Viewport => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth || document.documentElement?.clientWidth || 0,
    height: window.innerHeight || document.documentElement?.clientHeight || 0,
  };
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

// 确保整个矩形在视口内
const clampPosition = (
  position: Position,
  size: Size,
  viewport: Viewport,
  padding = VIEWPORT_PADDING
): Position => {
  if (!viewport.width || !viewport.height) return position;

  const maxX = Math.max(0, viewport.width - size.width - padding);
  const maxY = Math.max(0, viewport.height - size.height - padding);

  return {
    x: clamp(position.x, padding, maxX),
    y: clamp(position.y, padding, maxY),
  };
};

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
}

const FloatingModule: React.FC<FloatingModuleProps> = memo(({ widget }) => {

  const {
    isEditMode,
    updateFloatingModulePosition,
    updateFloatingModuleSize,
    toggleFloatingModuleExpanded,
    removeFloatingModule,
  } = useStore();
  const { themeMode } = useConfigStore();

  const config = widget.config as FloatingModuleConfig;
  const collapsedWidth = config.collapsedWidth || 60;
  const collapsedHeight = config.collapsedHeight || 60;

  // State
  const [viewport, setViewport] = useState<Viewport>(() => getViewportSize());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // 核心状态：位置、尺寸、展开状态
  // Position 始终是当前可见元素的左上角
  const [isExpanded, setIsExpanded] = useState(
    typeof config.isExpanded === 'boolean' ? config.isExpanded : true
  );

  const [size, setSize] = useState<Size>(() => {
    if (config.isExpanded === false) {
        return { width: collapsedWidth, height: collapsedHeight };
    }
    return {
      width: config.width || 380,
      height: config.height || 400,
    };
  });

  const [position, setPosition] = useState<Position>(() => {
    // 初始位置逻辑
    const initialSize = config.isExpanded === false 
        ? { width: collapsedWidth, height: collapsedHeight }
        : { width: config.width || 380, height: config.height || 400 };
    
    // 如果有保存的位置，直接使用并限制在视口内
    if (config.position) {
        return clampPosition(config.position, initialSize, getViewportSize());
    }

    // 默认位置逻辑
    const vp = getViewportSize();
    const padding = VIEWPORT_PADDING;
    const maxX = Math.max(padding, vp.width - initialSize.width - padding);
    const maxY = Math.max(padding, vp.height - initialSize.height - padding);

    // 根据 defaultPosition 计算
    switch (config.defaultPosition) {
        case 'bottom-left': return { x: padding, y: maxY };
        case 'top-left': return { x: padding, y: padding };
        case 'top-right': return { x: maxX, y: padding };
        case 'center': return { x: (vp.width - initialSize.width) / 2, y: (vp.height - initialSize.height) / 2 };
        case 'bottom-right':
        default: return { x: maxX, y: maxY };
    }
  });

  // Refs for debouncing updates
  const savePositionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveSizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
        const newVp = getViewportSize();
        setViewport(newVp);
        // 窗口变化时，强制检查边界
        setPosition(prev => clampPosition(prev, size, newVp));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  // 当外部 config 改变时同步状态 (主要是为了响应其他用户的修改或重置)
  // 注意：这可能会与本地交互冲突，所以这里只在必要属性变化时更新，且加防抖或判断
  useEffect(() => {
    if (typeof config.isExpanded === 'boolean' && config.isExpanded !== isExpanded) {
        setIsExpanded(config.isExpanded);
        // 如果外部改变了展开状态，我们需要重新计算 size
        const newSize = config.isExpanded 
            ? { width: config.width || 380, height: config.height || 400 }
            : { width: collapsedWidth, height: collapsedHeight };
        setSize(newSize);
        // 同时也需要调整 position 以适应新 size
        setPosition(prev => calculateSmartPosition(prev, size, newSize, viewport));
    }
  }, [config.isExpanded]);

  // Theme logic
  const actualTheme = useMemo(
    () => (config.theme === 'auto' ? themeMode : config.theme || 'light'),
    [config.theme, themeMode],
  );

  const moduleStyle = useMemo(
    () => ({
      width: size.width,
      height: size.height,
      zIndex: config.zIndex || 9999,
      borderRadius: config.borderRadius || 12,
    }),
    [size.width, size.height, config.zIndex, config.borderRadius],
  );

  const headerStyle = useMemo(
    () => (config.headerColor ? { background: config.headerColor } : {}),
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
    (pos: Position) => {
      if (savePositionTimeoutRef.current) clearTimeout(savePositionTimeoutRef.current);
      savePositionTimeoutRef.current = setTimeout(() => {
        updateFloatingModulePosition(widget.id, pos);
      }, 300);
    },
    [widget.id, updateFloatingModulePosition]
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

  const handleDrag: DraggableEventHandler = useCallback((_e, data) => {
    // 实时更新本地状态，保证流畅
    setPosition({ x: data.x, y: data.y });
  }, []);

  const handleDragStop: DraggableEventHandler = useCallback((_e, data) => {
    // 拖拽结束时，强制边界检查
    const finalPos = clampPosition({ x: data.x, y: data.y }, size, viewport);
    setPosition(finalPos);
    debouncedSavePosition(finalPos);
  }, [size, viewport, debouncedSavePosition]);

  // 计算拖拽边界
  const dragBounds = useMemo(() => {
    return {
      left: VIEWPORT_PADDING,
      top: VIEWPORT_PADDING,
      right: viewport.width - size.width - VIEWPORT_PADDING,
      bottom: viewport.height - size.height - VIEWPORT_PADDING,
    };
  }, [viewport.width, viewport.height, size.width, size.height]);

  const handleResize = useCallback((_e: any, { size: nextSize }: ResizeCallbackData) => {
    setSize(nextSize);
  }, []);

  const handleResizeStop = useCallback((_e: any, { size: nextSize }: ResizeCallbackData) => {
    setSize(nextSize);
    debouncedSaveSize(nextSize);
    // Resize 后也要检查边界，防止溢出
    setPosition(prev => clampPosition(prev, nextSize, viewport));
  }, [debouncedSaveSize, viewport]);

  const toggleExpand = useCallback((event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();

    if (config.collapsible === false) return;

    const nextExpanded = !isExpanded;
    let nextSize: Size;

    if (nextExpanded) {
        nextSize = { width: config.width || 380, height: config.height || 400 };
    } else {
        nextSize = { width: collapsedWidth, height: collapsedHeight };
    }

    // 智能计算新位置
    const nextPos = calculateSmartPosition(position, size, nextSize, viewport);

    setIsExpanded(nextExpanded);
    setSize(nextSize);
    setPosition(nextPos);
    
    toggleFloatingModuleExpanded(widget.id);
    debouncedSavePosition(nextPos);
  }, [isExpanded, config.width, config.height, config.collapsible, collapsedWidth, collapsedHeight, position, size, viewport, widget.id, toggleFloatingModuleExpanded, debouncedSavePosition]);

  const handleClose = useCallback((event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    confirm({
      title: '关闭悬浮窗',
      content: `确定要关闭"${widget.title}"吗？`,
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => removeFloatingModule(widget.id),
    });
  }, [widget.id, widget.title, removeFloatingModule]);

  const handleDelete = useCallback((event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    confirm({
      title: '删除悬浮模块',
      content: `确定要删除"${widget.title}"吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => removeFloatingModule(widget.id),
    });
  }, [widget.id, widget.title, removeFloatingModule]);

  const renderContent = useMemo(() => {
    if (config.contentType === 'microApp') {
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
        />
      );
    }
    if (config.contentType === 'localComponent') {
      const componentType = config.localComponent?.componentType;
      if (!componentType) return <div className="error-message">未配置组件类型</div>;
      const Component = LocalComponentRegistry[componentType];
      if (!Component) return <div className="error-message">未找到组件 {componentType}</div>;
      return <Component {...(config.localComponent?.componentProps || {})} />;
    }
    return <div className="error-message">未知内容类型</div>;
  }, [config]);

  return (
    <>
      <Draggable
        nodeRef={nodeRef}
        disabled={!isDraggable}
        position={position}
        onDrag={handleDrag}
        onStop={handleDragStop}
        handle=".drag-handle"
        bounds={dragBounds}
      >
        <div 
            ref={nodeRef}
            style={{ 
                position: 'fixed', 
                left: 0,
                top: 0,
                zIndex: config.zIndex || 9999,
                // Ensure the wrapper takes the size, crucial for Draggable to calculate bounds correctly
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
              <div 
                className="floating-module-wrapper" 
                style={{ width: size.width, height: size.height }}
              >
                  <AnimatePresence mode="wait">
                    {isExpanded ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`floating-module expanded theme-${actualTheme} ${isResizable ? 'resizable' : ''}`}
                        style={{ ...moduleStyle, position: 'relative', width: '100%', height: '100%' }}
                      >
                         {/* Header */}
                         {config.showTitle !== false ? (
                            <div className="floating-module-header drag-handle" style={headerStyle}>
                              {isDraggable && <DragOutlined className="drag-icon" />}
                              <span className="title">{widget.title}</span>
                              <div className="actions">
                                {isEditMode && (
                                  <button onClick={(e) => { e.stopPropagation(); setIsConfigOpen(true); }} className="action-btn config-btn">
                                    <SettingOutlined />
                                  </button>
                                )}
                                {config.collapsible !== false && (
                                  <button onClick={toggleExpand} className="action-btn minimize-btn">
                                    <MinusOutlined />
                                  </button>
                                )}
                                {isEditMode ? (
                                  <Button onClick={handleDelete} className="action-btn delete-btn" danger><DeleteOutlined /></Button>
                                ) : (
                                  config.closable !== false && (
                                    // <button onClick={handleClose} className="action-btn close-btn"><CloseOutlined /></button>
                                    ""
                                  )
                                )}
                              </div>
                            </div>
                         ) : (
                             // Transparent Header for dragging when title is hidden
                             isEditMode && (
                                <div className="floating-module-header-transparent drag-handle">
                                    {isDraggable && <DragOutlined className="drag-icon-transparent" />}
                                    <div className="actions-transparent">
                                        <button onClick={(e) => { e.stopPropagation(); setIsConfigOpen(true); }} className="action-btn-transparent"><SettingOutlined /></button>
                                        {config.collapsible !== false && (
                                            <button onClick={toggleExpand} className="action-btn-transparent"><MinusOutlined /></button>
                                        )}
                                        <button onClick={handleDelete} className="action-btn-transparent delete-btn"><CloseOutlined /></button>
                                    </div>
                                </div>
                             )
                         )}
                         
                         <div className="floating-module-content">
                            <div className="drag-mask" />
                            {renderContent}
                         </div>
                      </motion.div>
                    ) : (
                        <motion.div
                            key="collapsed"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className={`floating-module collapsed theme-${actualTheme} drag-handle`}
                            style={{ ...moduleStyle, position: 'relative', width: '100%', height: '100%', cursor: 'pointer' }}
                            onClick={toggleExpand}
                        >
                            {typeof config.icon === 'string' ? (
                                (config.icon.startsWith('http') || config.icon.startsWith('//') || config.icon.startsWith('data:image')) ? (
                                    <img 
                                        src={config.icon} 
                                        alt={widget.title} 
                                        style={{ 
                                            width: '80%', 
                                            height: '80%', 
                                            borderRadius: '50%', 
                                            objectFit: 'cover',
                                            display: 'block' 
                                        }} 
                                    />
                                ) : (
                                    <Icon type={config.icon} style={{ fontSize: 24 }} />
                                )
                            ) : (
                                config.icon || <span className="icon-text">{widget.title?.[0] || '模'}</span>
                            )}
                        </motion.div>
                    )}
                  </AnimatePresence>
              </div>
            </Resizable>
        </div>
      </Draggable>

      {isConfigOpen && (
        <ConfigDialog isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} widget={widget} />
      )}
    </>
  );
});

FloatingModule.displayName = 'FloatingModule';

export default FloatingModule;
