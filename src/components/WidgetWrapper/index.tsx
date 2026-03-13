import React, { useCallback, useState } from 'react';
import { Widget } from '@/types';
import { useStore } from '@/store/useStore';
import { REFRESHABLE_WIDGET_TYPES } from '@/constants/dashboard';
import { isValidCssGradient } from '@/components/BackgroundSettings';
import { Settings, Trash2, RefreshCw } from 'lucide-react';
import { Button, Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import clsx from 'clsx';
import './index.scss';

const { confirm } = Modal;

interface WidgetWrapperProps {
  widget: Widget;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: React.MouseEventHandler;
  onMouseUp?: React.MouseEventHandler;
  onTouchEnd?: React.TouchEventHandler;
  isPreviewMode?: boolean; // 预览模式，禁用所有编辑功能
}

const WidgetWrapper = React.forwardRef<HTMLDivElement, WidgetWrapperProps>(
  ({ widget, children, style, className, onMouseDown, onMouseUp, onTouchEnd, isPreviewMode = false, ...props }, ref) => {
    const { removeWidget, refreshWidget, isEditMode: storeEditMode, openConfigPanel } = useStore();
    // 预览模式下强制禁用编辑
    const isEditMode = isPreviewMode ? false : storeEditMode;
    const [isRefreshing, setIsRefreshing] = useState(false);
    // const [backgroundStyle, setBackgroundStyle] = useState<React.CSSProperties>({})

    const handleDelete = () => {
      confirm({
        title: '删除小部件',
        content: '确定要删除这个小部件吗？',
        okText: '删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => removeWidget(widget.id),
      });
    };

    const handleConfig = () => {
      openConfigPanel({ type: 'widget', id: widget.id });
    };

    const handleRefresh = () => {
      setIsRefreshing(true);
      refreshWidget(widget.id);
      // 刷新动画持续 600ms
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    };

    const isRefreshable = REFRESHABLE_WIDGET_TYPES.has(widget.type);

    // 右键菜单配置
    const contextMenuItems: MenuProps['items'] = [
      ...(isRefreshable ? [{
        key: 'refresh' as const,
        label: '刷新',
        icon: <RefreshCw size={14} className={isRefreshing ? 'rotating' : ''} />,
        onClick: handleRefresh,
        disabled: isRefreshing,
      }] : []),
      {
        key: 'config',
        label: '设置',
        icon: <Settings size={14} />,
        onClick: handleConfig,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        label: '删除',
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: handleDelete,
      },
    ];

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
    };

    // 判断是否显示标题，默认为 true
    const showTitle = widget.config.showTitle !== false;

    // 判断是否为小尺寸组件（1x1），小尺寸时不显示标题栏以避免影响拖拽
    // 用户可通过右键菜单进行设置和删除操作
    const { w, h } = widget.layout || { w: 2, h: 2 };
    const isSmallSize = w < 2 || h < 2;

    // 在编辑模式下，即使隐藏标题也要显示拖拽条（但小尺寸组件除外）
    const shouldShowHeader = !isSmallSize && (showTitle || isEditMode);

    const backgroundStyle = useCallback(() => {
      // 计算背景样式
      const newBackgroundStyle: React.CSSProperties = {};
      const {
        backgroundType, backgroundColor, backgroundImage, backgroundGradient,
        backgroundSize, backgroundRepeat, backgroundPosition, backdropBlur, boxShadow,
        borderRadius
      } = widget.config;
      // console.log(widget.config)
      if (backgroundType === 'image' && backgroundImage) {
        newBackgroundStyle.backgroundImage = `url(${backgroundImage})`;
        newBackgroundStyle.backgroundSize = backgroundSize || 'auto';
        newBackgroundStyle.backgroundPosition = backgroundPosition || 'center';
        newBackgroundStyle.backgroundRepeat = backgroundRepeat || 'no-repeat';
      } else if (backgroundType === 'gradient' && backgroundGradient && isValidCssGradient(backgroundGradient)) {
        newBackgroundStyle.background = backgroundGradient;
      } else if (backgroundType === 'color' && backgroundColor) {
        newBackgroundStyle.backgroundColor = backgroundColor;
      }
      // 应用背景模糊效果
      // backdropBlur 为 undefined/null 时使用 CSS 变量默认值（极简模式有默认模糊效果）
      // backdropBlur > 0 时设置自定义模糊值
      // backdropBlur === 0 时显式设置 none 覆盖 CSS 变量默认值
      if (backdropBlur !== undefined && backdropBlur !== null) {
        if (backdropBlur > 0) {
          newBackgroundStyle.backdropFilter = `blur(${backdropBlur}px)`;
          newBackgroundStyle.WebkitBackdropFilter = `blur(${backdropBlur}px)`; // Safari 兼容
        } else {
          // backdropBlur === 0 时显式清除模糊效果
          newBackgroundStyle.backdropFilter = 'none';
          newBackgroundStyle.WebkitBackdropFilter = 'none';
        }
      }
      // 应用阴影效果
      if (boxShadow) {
        newBackgroundStyle.boxShadow = boxShadow;
      }
      // 应用圆角
      if (borderRadius !== undefined && borderRadius !== null) {
        newBackgroundStyle.borderRadius = borderRadius;
      }
      return newBackgroundStyle
    }, [widget.config])

    // 判断是否有自定义背景（包括模糊效果）
    const hasCustomBackground = widget.config.backgroundType && (
      (widget.config.backgroundType === 'color' && widget.config.backgroundColor) ||
      (widget.config.backgroundType === 'image' && widget.config.backgroundImage) ||
      (widget.config.backgroundType === 'gradient' && widget.config.backgroundGradient)
    );

    // 是否有背景模糊效果
    const hasBackdropBlur = widget.config.backdropBlur && widget.config.backdropBlur > 0;

    // 计算内容区域的 padding
    // 优先使用用户配置的 contentPadding，否则使用默认值
    // 默认值：有标题时 12px，无标题时 0px
    const getContentPadding = (): number | undefined => {
      const configPadding = widget.config.contentPadding;
      if (configPadding !== undefined && configPadding !== null) {
        return configPadding;
      }
      // 如果没有配置，返回 undefined 让 CSS 处理默认值
      return undefined;
    };

    const contentPadding = getContentPadding();
    const contentStyle: React.CSSProperties = contentPadding !== undefined
      ? { padding: contentPadding }
      : {};

    // 渲染主体内容
    const renderContent = () => (
      <div
        ref={ref}
        style={{ ...style, ...backgroundStyle() }}
        className={clsx('widget-wrapper', className, widget.type, {
          'edit-mode': isEditMode,
          'no-header': !shouldShowHeader,
          'has-custom-bg': hasCustomBackground,
          'has-backdrop-blur': hasBackdropBlur,
        })}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        onContextMenu={isEditMode ? handleContextMenu : undefined}
        {...props}
      >
        {shouldShowHeader && (
          <div className={clsx('widget-header grid-drag-handle', {
            'widget-header--minimal': !showTitle && isEditMode
          })}>
            {showTitle && (
              <h3
                className="widget-title"
                style={widget.config.titleColor ? { color: widget.config.titleColor } : undefined}
              >
                {widget.title}
              </h3>
            )}
            {isEditMode && (
              <div
                className="widget-actions"
                style={widget.config.titleColor ? { color: widget.config.titleColor } : undefined}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isRefreshable && (
                  <Button
                    type="text"
                    size="small"
                    icon={<RefreshCw size={14} className={isRefreshing ? 'rotating' : ''} />}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  />
                )}
                <Button
                  type="text"
                  size="small"
                  icon={<Settings size={14} />}
                  onClick={handleConfig}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 size={14} />}
                  onClick={handleDelete}
                />
              </div>
            )}
          </div>
        )}
        <div className="widget-content" style={contentStyle}>{children}</div>

      </div>
    );

    // 预览模式或非编辑模式下不显示右键菜单
    if (isPreviewMode || !isEditMode) {
      return renderContent();
    }

    // 编辑模式下使用右键菜单包裹
    return (
      <Dropdown
        menu={{ items: contextMenuItems }}
        trigger={['contextMenu']}
      >
        {renderContent()}
      </Dropdown>
    );
  }
);

export default WidgetWrapper;
