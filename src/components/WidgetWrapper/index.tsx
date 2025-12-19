import React, { useCallback, useState } from 'react';
import { Widget } from '@/types';
import ConfigDialog from '../ConfigDialog';
import { useStore } from '@/store/useStore';
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
    const { removeWidget, refreshWidget, isEditMode: storeEditMode } = useStore();
    // 预览模式下强制禁用编辑
    const isEditMode = isPreviewMode ? false : storeEditMode;
    const [isConfigOpen, setIsConfigOpen] = useState(false);
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
      setIsConfigOpen(true);
    };

    const handleRefresh = () => {
      setIsRefreshing(true);
      refreshWidget(widget.id);
      // 刷新动画持续 600ms
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    };

    // 右键菜单配置
    const contextMenuItems: MenuProps['items'] = [
      {
        key: 'refresh',
        label: '刷新',
        icon: <RefreshCw size={14} className={isRefreshing ? 'rotating' : ''} />,
        onClick: handleRefresh,
        disabled: isRefreshing,
      },
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
    // 在编辑模式下，即使隐藏标题也要显示拖拽条
    const shouldShowHeader = showTitle || isEditMode;

    const backgroundStyle = useCallback(() => {
      // 计算背景样式
      const newBackgroundStyle: React.CSSProperties = {};
      const {
        backgroundType, backgroundColor, backgroundImage, backgroundGradient,
        backgroundSize, backgroundRepeat, backgroundPosition
      } = widget.config;
      // console.log(widget.config)
      if (backgroundType === 'image' && backgroundImage) {
        newBackgroundStyle.background = `url(${backgroundImage})`;
        newBackgroundStyle.backgroundSize = backgroundSize || 'cover';
        newBackgroundStyle.backgroundPosition = backgroundPosition || 'center';
        newBackgroundStyle.backgroundRepeat = backgroundRepeat || 'no-repeat';
      } else if (backgroundType === 'gradient' && backgroundGradient) {
        newBackgroundStyle.background = backgroundGradient;
      } else if (backgroundType === 'color' && backgroundColor) {
        newBackgroundStyle.backgroundColor = backgroundColor;
      }
      return newBackgroundStyle
    }, [widget.config])

    // 预览模式下不显示右键菜单
    if (isPreviewMode) {
      return (
        <div
          ref={ref}
          style={{ ...style }}
          className={clsx('widget-wrapper', className, widget.type, {
            'no-header': !showTitle,
          })}
          {...props}
        >
          {showTitle && (
            <div className="widget-header">
              <h3 className="widget-title">{widget.title}</h3>
            </div>
          )}
          <div className="widget-content" style={{ ...backgroundStyle() }}>
            {children}
          </div>
        </div>
      );
    }

    return (
      <Dropdown
        menu={{ items: contextMenuItems }}
        trigger={['contextMenu']}
      >
        <div
          ref={ref}
          style={{ ...style }}
          className={clsx('widget-wrapper', className, widget.type, {
            'edit-mode': isEditMode,
            'no-header': !showTitle && !isEditMode,
          })}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onTouchEnd={onTouchEnd}
          onContextMenu={handleContextMenu}
          {...props}
        >
          {shouldShowHeader && (
            <div className={clsx('widget-header grid-drag-handle', {
              'widget-header--minimal': !showTitle && isEditMode
            })}>
              {showTitle && <h3 className="widget-title">{widget.title}</h3>}
              {isEditMode && (
                <div
                  className="widget-actions"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {
                    !!widget.config.refreshInterval ?
                      <Button
                        type="text"
                        size="small"
                        icon={<RefreshCw size={14} className={isRefreshing ? 'rotating' : ''} />}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                      />
                      : ''
                  }
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
          <div
            className="widget-content"
            style={{ ...backgroundStyle() }}
          >{children}</div>

          <ConfigDialog
            isOpen={isConfigOpen}
            onClose={() => setIsConfigOpen(false)}
            widget={widget}
          />
        </div>
      </Dropdown>
    );
  }
);

export default WidgetWrapper;
