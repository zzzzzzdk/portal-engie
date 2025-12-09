
import React, { useState, useEffect } from 'react';
import { Widget } from '@/types';
import { Tooltip } from 'antd';
import { getWidgetIcon } from '@/utils/widgetHelpers';
import { WidgetIconConfig } from '@/types/widget-size';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import clsx from 'clsx';
import './index.scss';

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
    if (loading) {
      return <div className="widget-icon-skeleton" />;
    }

    if (!iconConfig) {
      return null;
    }

    // 图片 URL
    if (typeof iconConfig.icon === 'string' && (iconConfig.icon.startsWith('http') || iconConfig.icon.startsWith('data:'))) {
      return (
        <img
          src={iconConfig.icon}
          alt={widget.title}
          className="widget-icon-image"
        />
      );
    }

    // React Element (already instantiated)
    if (React.isValidElement(iconConfig.icon)) {
      return React.cloneElement(iconConfig.icon as React.ReactElement, {
        size: 56,
        strokeWidth: 1.5,
        className: 'widget-icon-component'
      } as any);
    }

    // React Component Type (needs instantiation)
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
    ? '拖拽调整大小以查看内容'
    : '点击打开应用';

  return (
    <Tooltip title={tooltipTitle} placement="top">
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
      </div>
    </Tooltip>
  );
};

export default WidgetIconView;
