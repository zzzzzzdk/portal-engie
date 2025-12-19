
import React, { useState, useEffect } from 'react';
import { Widget } from '@/types';
import { Tooltip, Dropdown, Modal, Button } from 'antd';
import type { MenuProps } from 'antd';
import { Settings, Trash2, RefreshCw } from 'lucide-react';
import { getWidgetIcon } from '@/utils/widgetHelpers';
import { WidgetIconConfig } from '@/types/widget-size';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import { useStore } from '@/store/useStore';
import ConfigDialog from '@/components/ConfigDialog';
import IconRenderer, { getIconValueType } from '@/components/IconRenderer';
import clsx from 'clsx';
import './index.scss';

const { confirm } = Modal;

interface WidgetIconViewProps {
  widget: Widget;
  isEditMode: boolean;
  onClick?: () => void;
}

/**
 * 小组件 Icon-Only 视图
 * 当小组件尺寸为 1x1 时显示
 */
const WidgetIconView: React.FC<WidgetIconViewProps> = ({ widget, isEditMode, onClick }) => {
  const [iconConfig, setIconConfig] = useState<WidgetIconConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { removeWidget, refreshWidget } = useStore();

  // 加载 icon 配置
  useEffect(() => {
    const loadIcon = async () => {
      setLoading(true);
      const config = await getWidgetIcon(widget);
      setIconConfig(config);
      setLoading(false);
    };
    loadIcon();
  }, [widget.id, widget.type, widget.title, widget.config]);

  const handleConfig = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsConfigOpen(true);
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    confirm({
      title: '删除小部件',
      content: '确定要删除这个小部件吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => removeWidget(widget.id),
    });
  };

  const handleRefresh = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsRefreshing(true);
    refreshWidget(widget.id);
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
      onClick: () => handleRefresh(),
      disabled: isRefreshing,
    },
    {
      key: 'config',
      label: '设置',
      icon: <Settings size={14} />,
      onClick: () => handleConfig(),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => handleDelete(),
    },
  ];

  // 处理点击事件
  const handleClick = async () => {
    if (isEditMode) {
      return; // 编辑模式下不响应点击
    }

    // 如果有自定义点击事件，优先使用
    if (onClick) {  
      onClick();
      return;
    }

    // 微应用：打开新窗口
    if (widget.type === 'microApp' && widget.config.systemId && widget.config.moduleId) {
      try {
        const module = await microAppConfigLoader.getModule(
          widget.config.systemId,
          widget.config.moduleId
        );
        
        if (module && module.url) {
          window.open(module.url, '_blank');
        } else {
            console.warn('MicroApp URL not found for', widget.config.systemId, widget.config.moduleId);
        }
      } catch (error) {
        console.error('Failed to get micro app module info:', error);
      }
    }
    // 其他类型：可以实现自动放大等逻辑
    // 这里暂时不处理
  };

  // 渲染 Icon
  const renderIcon = () => {
    // 优先使用 widget.config.icon（用户配置的图标）
    const configIcon = widget.config.icon;
    const svgMarkup = widget.config.iconSvg || iconConfig?.iconSvg;

    // SVG 代码优先
    if (svgMarkup) {
      return (
        <IconRenderer
          value={svgMarkup}
          size={56}
          fallbackText={widget.title}
          className="widget-icon-svg"
        />
      );
    }

    // 用户配置的图标（可能是 URL、Ant Design 名称、Iconfont 名称）
    if (configIcon) {
      const iconType = getIconValueType(configIcon);
      if (iconType !== 'empty') {
        return (
          <IconRenderer
            value={configIcon}
            size={56}
            fallbackText={widget.title}
            className="widget-icon-custom"
          />
        );
      }
    }

    if (loading) {
      return <div className="widget-icon-skeleton" />;
    }

    if (!iconConfig) {
      return null;
    }

    // 图片 URL（来自 iconConfig）
    if (typeof iconConfig.icon === 'string' && (iconConfig.icon.startsWith('http') || iconConfig.icon.startsWith('data:'))) {
      return (
        <img
          src={iconConfig.icon}
          alt={widget.title}
          className="widget-icon-image"
        />
      );
    }

    // React Element (already instantiated) - Lucide 图标等
    if (React.isValidElement(iconConfig.icon)) {
      return React.cloneElement(iconConfig.icon as React.ReactElement, {
        size: 56,
        strokeWidth: 1.5,
        className: 'widget-icon-component'
      } as any);
    }

    // React Component Type (needs instantiation) - Lucide 图标组件
    if (typeof iconConfig.icon === 'function' || typeof iconConfig.icon === 'object') {
       const IconComponent = iconConfig.icon as React.ComponentType<any>;
       return <IconComponent size={56} strokeWidth={1.5} className="widget-icon-component" />;
    }

    // 首字母 Avatar
    if (iconConfig.fallback === 'letter') {
      return (
        <div
          className="widget-icon-letter"
          style={{ backgroundColor: iconConfig.backgroundColor }}
        >
          {iconConfig.icon as React.ReactNode}
        </div>
      );
    }

    return null;
  };

  const tooltipTitle = isEditMode
    ? '右键打开菜单'
    : '点击打开应用';

  const content = (
    <div
      className={clsx('widget-icon-view', {
        'edit-mode': isEditMode,
        'clickable': !isEditMode
      })}
      onClick={handleClick}
    >
      <div className="widget-icon-container">
        {renderIcon()}
      </div>

      <div className="widget-icon-title">
        {widget.title}
      </div>

      {!isEditMode && (
        <div className="widget-icon-hint">
          点击打开
        </div>
      )}

      {/* 编辑模式下显示操作按钮 */}
      {isEditMode && (
        <div className="widget-icon-actions" onClick={e => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<Settings size={14} />}
            onClick={handleConfig}
            className="action-btn"
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<Trash2 size={14} />}
            onClick={handleDelete}
            className="action-btn"
          />
        </div>
      )}

      <ConfigDialog
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        widget={widget}
      />
    </div>
  );

  // 编辑模式下使用右键菜单包裹
  if (isEditMode) {
    return (
      <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
        <Tooltip title={tooltipTitle} placement="top">
          {content}
        </Tooltip>
      </Dropdown>
    );
  }

  return (
    <Tooltip title={tooltipTitle} placement="top">
      {content}
    </Tooltip>
  );
};

export default WidgetIconView;
