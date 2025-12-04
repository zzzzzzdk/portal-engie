import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import {
  DragOutlined,
  SettingOutlined,
  CloseOutlined,
  MinusOutlined
} from '@ant-design/icons';
import { Modal } from 'antd';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useConfigStore } from '@/store/useConfigStore';
import MicroAppWidget from '../widgets/MicroAppWidget';
import { LocalComponentRegistry } from './components';
import ConfigDialog from '../ConfigDialog';
import type { Widget, FloatingModuleConfig } from '@/types';
import './index.scss';

const { confirm } = Modal;

interface FloatingModuleProps {
  widget: Widget;
}


const FloatingModule: React.FC<FloatingModuleProps> = memo(({ widget }) => {
  const {
    isEditMode,
    updateFloatingModulePosition,
    updateFloatingModuleSize,
    toggleFloatingModuleExpanded,
    removeFloatingModule
  } = useStore();

  const { themeMode } = useConfigStore();
  const config = widget.config as FloatingModuleConfig;

  // ==================== 状态管理 ====================
  const [isExpanded, setIsExpanded] = useState(config.isExpanded ?? true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [_isDragging, setIsDragging] = useState(false);
  const [_isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({
    width: config.width || 380,
    height: config.height || 400,
  });

  // 拖拽位置 - 使用受控模式
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 智能展开位置偏移
  const [expandOffset, setExpandOffset] = useState({ x: 0, y: 0 });
  // 记录展开对齐方，用于动画原点控制
  const [alignment, setAlignment] = useState({ x: 'left', y: 'top' });

  // ==================== Refs ====================
  const savePositionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveSizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);

  // ==================== 计算值 ====================

  // 计算实际主题
  const actualTheme = useMemo(() =>
    config.theme === 'auto' ? themeMode : (config.theme || 'light'),
    [config.theme, themeMode]
  );

  // 计算初始位置
  const initialPosition = useMemo(() => {
    if (config.position) return config.position;

    const defaultPos = config.defaultPosition || 'bottom-right';
    const padding = 20;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    const moduleWidth = config.width || 380;
    const moduleHeight = config.height || 400;
    const safeWidth = Math.min(moduleWidth, viewportWidth - padding * 2);
    const safeHeight = Math.min(moduleHeight, viewportHeight - padding * 2);
    const maxX = Math.max(padding, viewportWidth - safeWidth - padding);
    const maxY = Math.max(padding, viewportHeight - safeHeight - padding);

    const positions = {
      'bottom-right': { x: maxX, y: maxY },
      'bottom-left': { x: padding, y: maxY },
      'top-right': { x: maxX, y: padding },
      'top-left': { x: padding, y: padding },
      'center': {
        x: Math.max(padding, (viewportWidth - safeWidth) / 2),
        y: Math.max(padding, (viewportHeight - safeHeight) / 2)
      }
    };

    return positions[defaultPos] || positions['bottom-right'];
  }, [config.position, config.defaultPosition, config.width, config.height]);

  // 初始化位置
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  // 计算样式
  const moduleStyle = useMemo(() => ({
    width: isExpanded ? size.width : (config.collapsedWidth || 60),
    height: isExpanded ? size.height : (config.collapsedHeight || 60),
    zIndex: config.zIndex || 9999,
    borderRadius: config.borderRadius || 12,
  }), [isExpanded, size, config]);

  const headerStyle = useMemo(() =>
    config.headerColor ? { background: config.headerColor } : {},
    [config.headerColor]
  );

  // 计算权限 - 只在编辑模式下允许拖拽和调整大小
  const isDraggable = useMemo(() =>
    isEditMode,  // 只在编辑模式下可拖拽
    [isEditMode]
  );

  const isResizable = useMemo(() =>
    isExpanded && isEditMode,  // 只在编辑模式下可调整大小
    [isExpanded, isEditMode]
  );

  // ==================== 事件处理 ====================

  // 清理 RAF
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // 防抖保存位置
  const debouncedSavePosition = useCallback((pos: { x: number; y: number }) => {
    if (savePositionTimeoutRef.current) {
      clearTimeout(savePositionTimeoutRef.current);
    }
    savePositionTimeoutRef.current = setTimeout(() => {
      updateFloatingModulePosition(widget.id, pos);
    }, 300);
  }, [widget.id, updateFloatingModulePosition]);

  // 防抖保存尺寸
  const debouncedSaveSize = useCallback((newSize: { width: number; height: number }) => {
    if (saveSizeTimeoutRef.current) {
      clearTimeout(saveSizeTimeoutRef.current);
    }
    saveSizeTimeoutRef.current = setTimeout(() => {
      updateFloatingModuleSize(widget.id, newSize);
    }, 300);
  }, [widget.id, updateFloatingModuleSize]);

  // 拖拽开始
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // 拖拽中 - 使用 RAF 优化性能
  const handleDrag = useCallback((_e: any, data: any) => {
    // 将位置缓存到 ref，避免频繁触发状态更新
    pendingPositionRef.current = { x: data.x, y: data.y };

    // 取消之前的 RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // 使用 RAF 批处理更新
    rafRef.current = requestAnimationFrame(() => {
      if (pendingPositionRef.current) {
        setPosition(pendingPositionRef.current);
      }
    });
  }, []);

  // 拖拽结束
  const handleDragStop = useCallback((_e: any, data: any) => {
    setIsDragging(false);

    // 确保最后的位置被应用
    const finalPos = { x: data.x, y: data.y };
    setPosition(finalPos);

    // 取消任何待处理的 RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // 保存到 store
    debouncedSavePosition(finalPos);
  }, [debouncedSavePosition]);

  // 调整大小开始
  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  // 调整大小
  const handleResize = useCallback((_e: any, { size: newSize }: any) => {
    setSize(newSize);
    debouncedSaveSize(newSize);
  }, [debouncedSaveSize]);

  // 调整大小结束
  const handleResizeStop = useCallback((_e: any, { size: newSize }: any) => {
    setIsResizing(false);
    setSize(newSize);
    debouncedSaveSize(newSize);
  }, [debouncedSaveSize]);

  // 计算智能展开位置
  const calculateExpandPosition = useCallback((currentPos: { x: number; y: number }) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const collapsedWidth = config.collapsedWidth || 60;
    const collapsedHeight = config.collapsedHeight || 60;
    const expandedWidth = size.width;
    const expandedHeight = size.height;
    const padding = 20;

    // 判断折叠位置在屏幕的哪个区域
    const isRight = currentPos.x > viewportWidth / 2;
    const isBottom = currentPos.y > viewportHeight / 2;

    let newX = currentPos.x;
    let newY = currentPos.y;

    // 根据位置调整展开方向
    if (isRight && isBottom) {
      // 右下角 → 朝左上展开
      newX = Math.max(padding, currentPos.x + collapsedWidth - expandedWidth);
      newY = Math.max(padding, currentPos.y + collapsedHeight - expandedHeight);
    } else if (isRight && !isBottom) {
      // 右上角 → 朝左下展开
      newX = Math.max(padding, currentPos.x + collapsedWidth - expandedWidth);
      newY = currentPos.y; // 保持顶部对齐
    } else if (!isRight && isBottom) {
      // 左下角 → 朝右上展开
      newX = currentPos.x; // 保持左侧对齐
      newY = Math.max(padding, currentPos.y + collapsedHeight - expandedHeight);
    } else {
      // 左上角 → 朝右下展开（默认）
      newX = currentPos.x;
      newY = currentPos.y;
    }

    // 确保不超出边界
    newX = Math.max(padding, Math.min(newX, viewportWidth - expandedWidth - padding));
    newY = Math.max(padding, Math.min(newY, viewportHeight - expandedHeight - padding));

    return { x: newX, y: newY };
  }, [size, config]);

  // 展开/收起 - 带智能位置计算
  const toggleExpand = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!isExpanded) {
      // 折叠 → 展开：获取当前小圆圈位置并计算偏移
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const currentPos = {
          x: rect.left,
          y: rect.top
        };

        // 更新对齐方向
        const isRight = rect.left > viewportWidth / 2;
        const isBottom = rect.top > viewportHeight / 2;
        setAlignment({
          x: isRight ? 'right' : 'left',
          y: isBottom ? 'bottom' : 'top'
        });

        const newPos = calculateExpandPosition(currentPos);

        // 计算需要的偏移量
        const offsetX = newPos.x - currentPos.x;
        const offsetY = newPos.y - currentPos.y;

        setExpandOffset({ x: offsetX, y: offsetY });
      }
      setIsExpanded(true);
      toggleFloatingModuleExpanded(widget.id);
    } else {
      // 展开 → 折叠：重置偏移
      setExpandOffset({ x: 0, y: 0 });
      setIsExpanded(false);
      toggleFloatingModuleExpanded(widget.id);
    }
  }, [widget.id, toggleFloatingModuleExpanded, isExpanded, calculateExpandPosition]);

  // 点击外部区域自动收起（仅非编辑模式）
  useEffect(() => {
    // 只在非编辑模式、展开状态、允许折叠时启用
    if (isEditMode || !isExpanded || config.collapsible === false) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      // 检查点击是否在悬浮模块内部
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // 点击在外部，收起悬浮模块
        toggleExpand();
      }
    };

    // 添加延迟以避免刚展开就被收起
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditMode, isExpanded, config.collapsible, toggleExpand]);

  // 关闭（删除）
  const handleClose = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    confirm({
      title: '关闭悬浮窗',
      content: `确定要关闭"${widget.title}"吗？`,
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        removeFloatingModule(widget.id);
      },
    });
  }, [widget.id, widget.title, removeFloatingModule]);

  // 删除（编辑模式）
  const handleDelete = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    confirm({
      title: '删除悬浮模块',
      content: `确定要删除"${widget.title}"吗？删除后无法恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        removeFloatingModule(widget.id);
      },
    });
  }, [widget.id, widget.title, removeFloatingModule]);

  // 打开配置
  const handleOpenConfig = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsConfigOpen(true);
  }, []);

  // 关闭配置
  const handleCloseConfig = useCallback(() => {
    setIsConfigOpen(false);
  }, []);

  // ==================== 渲染内容 ====================

  // 渲染主体内容 - 使用 useMemo 缓存
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
    } else if (config.contentType === 'localComponent') {
      const componentType = config.localComponent?.componentType;
      if (!componentType) {
        return <div className="error-message">未配置组件类型</div>;
      }

      const Component = LocalComponentRegistry[componentType];
      if (!Component) {
        return <div className="error-message">未找到组件: {componentType}</div>;
      }

      return <Component {...(config.localComponent?.componentProps || {})} />;
    }

    return <div className="error-message">未知内容类型</div>;
  }, [config]);

  // ==================== 渲染 ====================

  return (
    <>
      <Draggable
        nodeRef={nodeRef}
        disabled={!isDraggable}
        position={position}
        onStart={handleDragStart}
        onDrag={handleDrag}
        onStop={handleDragStop}
        handle=".drag-handle"
        bounds="body"
      >
        <Resizable
          width={size.width}
          height={size.height}
          onResize={handleResize}
          onResizeStart={handleResizeStart}
          onResizeStop={handleResizeStop}
          minConstraints={[config.minWidth || 300, config.minHeight || 400]}
          maxConstraints={[config.maxWidth || 800, config.maxHeight || 900]}
          resizeHandles={isResizable ? ['se'] : []}
        >
          <div
            ref={(el) => {
              // 同时设置两个 ref
              if (containerRef) {
                (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              }
              if (nodeRef) {
                (nodeRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              }
            }}
            className="floating-module-container"
            style={{
              position: 'absolute',
              width: isExpanded ? size.width : (config.collapsedWidth || 60),
              height: isExpanded ? size.height : (config.collapsedHeight || 60),
              left: expandOffset.x,
              top: expandOffset.y,
            }}
          >
            <AnimatePresence>
              {isExpanded ? (
                // 展开状态
                <motion.div
                  key="expanded"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{
                    duration: 0.35,
                    ease: [0.4, 0, 0.2, 1],
                    scale: {
                      type: "spring",
                      damping: 25,
                      stiffness: 300,
                      mass: 0.8
                    },
                    opacity: { duration: 0.2 }
                  }}
                  className={`floating-module expanded theme-${actualTheme} ${isResizable ? 'resizable' : ''}`}
                  style={{
                    ...moduleStyle,
                    position: 'absolute',
                    transformOrigin: `${alignment.x} ${alignment.y}`,
                  }}
                >
                  {/* 头部 - 根据 showTitle 配置显示完整头部或透明拖拽条 */}
                  {config.showTitle !== false ? (
                    // 完整头部（默认）
                    <div className="floating-module-header drag-handle" style={headerStyle}>
                      {isDraggable && <DragOutlined className="drag-icon" />}
                      <span className="title">{widget.title}</span>
                      <div className="actions">
                        {/* 配置按钮 - 仅编辑模式 */}
                        {isEditMode && (
                          <button
                            onClick={handleOpenConfig}
                            title="设置"
                            className="action-btn config-btn"
                          >
                            <SettingOutlined />
                          </button>
                        )}

                        {/* 最小化按钮 */}
                        {config.collapsible !== false && (
                          <button
                            onClick={toggleExpand}
                            title="最小化"
                            className="action-btn minimize-btn"
                          >
                            <MinusOutlined />
                          </button>
                        )}

                        {/* 关闭按钮 - 根据模式显示不同行为 */}
                        {isEditMode ? (
                          <button
                            onClick={handleDelete}
                            title="删除"
                            className="action-btn delete-btn"
                          >
                            <CloseOutlined />
                          </button>
                        ) : (
                          config.closable !== false && (
                            <button
                              onClick={handleClose}
                              title="关闭"
                              className="action-btn close-btn"
                            >
                              <CloseOutlined />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    // 透明拖拽条（无标题模式）
                    isEditMode && (
                      <div className="floating-module-header-transparent drag-handle">
                        {isDraggable && <DragOutlined className="drag-icon-transparent" />}
                        {/* 编辑模式下显示操作按钮 */}
                        <div className="actions-transparent">
                          <button
                            onClick={handleOpenConfig}
                            title="设置"
                            className="action-btn-transparent"
                          >
                            <SettingOutlined />
                          </button>
                          {config.collapsible !== false && (
                            <button
                              onClick={toggleExpand}
                              title="最小化"
                              className="action-btn-transparent"
                            >
                              <MinusOutlined />
                            </button>
                          )}
                          <button
                            onClick={handleDelete}
                            title="删除"
                            className="action-btn-transparent delete-btn"
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                      </div>

                    )
                  )}

                  {/* 内容 */}
                  <div className="floating-module-content">
                    {/* 拖拽时的遮罩 - 防止 iframe 干扰鼠标事件 */}
                    <div className="drag-mask" />
                    {renderContent}
                  </div>
                </motion.div>
              ) : (
                // 折叠状态
                <motion.div
                  key="collapsed"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{
                    duration: 0.35,
                    ease: [0.34, 1.56, 0.64, 1], // 弹性缓动
                  }}
                  className={`floating-module collapsed theme-${actualTheme} drag-handle`}
                  style={{
                    ...moduleStyle,
                    position: 'absolute',
                    cursor: isDraggable ? 'move' : 'pointer',
                    transformOrigin: `${alignment.x} ${alignment.y}`,
                  }}
                  onClick={toggleExpand}
                >
                  {config.icon || <span className="icon-text">{widget.title?.[0] || '模'}</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Resizable>
      </Draggable>

      {/* 配置对话框 */}
      {isConfigOpen && (
        <ConfigDialog
          isOpen={isConfigOpen}
          onClose={handleCloseConfig}
          widget={widget}
        />
      )}
    </>
  );
});

FloatingModule.displayName = 'FloatingModule';

export default FloatingModule;
