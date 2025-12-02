import React, { useState } from 'react';
import { Widget } from '@/types';
import ConfigDialog from '../ConfigDialog';
import { useStore } from '@/store/useStore';
import { Settings, Trash2, RefreshCw } from 'lucide-react';
import { Button, App, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import clsx from 'clsx';
import './index.scss';

interface WidgetWrapperProps {
  widget: Widget;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: React.MouseEventHandler;
  onMouseUp?: React.MouseEventHandler;
  onTouchEnd?: React.TouchEventHandler;
}

const WidgetWrapper = React.forwardRef<HTMLDivElement, WidgetWrapperProps>(
  ({ widget, children, style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => {
    const { removeWidget, isEditMode } = useStore();
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const { modal } = App.useApp();

    const handleDelete = () => {
      modal.confirm({
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
      // Trigger refresh logic here if needed
      console.log('Refreshing widget:', widget.id);
    };

    // 右键菜单配置
    const contextMenuItems: MenuProps['items'] = [
      {
        key: 'refresh',
        label: '刷新',
        icon: <RefreshCw size={14} />,
        onClick: handleRefresh,
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

    return (
      <Dropdown
        menu={{ items: contextMenuItems }}
        trigger={['contextMenu']}
      >
        <div
          ref={ref}
          style={style}
          className={clsx('widget-wrapper', className, {
            'edit-mode': isEditMode,
            'no-header': !showTitle && !isEditMode
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
                  <Button
                    type="text"
                    size="small"
                    icon={<RefreshCw size={14} />}
                    onClick={handleRefresh}
                  />
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
          <div className="widget-content">{children}</div>

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
