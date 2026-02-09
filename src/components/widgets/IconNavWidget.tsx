import React from 'react';
import { Tooltip } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { WidgetConfig, Widget } from '@/types';
import IconRenderer from '@/components/IconRenderer';

/**
 * 图标导航组件配置
 */
interface IconNavWidgetConfig extends WidgetConfig {
  icon?: string;           // 图标（图标名/URL/SVG）
  url?: string;            // 跳转链接
  openInNew?: boolean;     // 是否新窗口打开
  iconSize?: number;       // 图标大小（像素）
  iconColor?: string;      // 图标颜色
  hoverColor?: string;     // 悬停颜色
  // tooltip?: string;        // 提示文本
}

interface IconNavWidgetProps {
  config?: IconNavWidgetConfig;
  widget?: Widget;
  isEditMode?: boolean;  // 是否为编辑模式
}

// 规范化颜色值
const normalizeColor = (color: any, defaultColor: string): string => {
  if (!color) return defaultColor;
  if (typeof color === 'string') return color;
  if (typeof color === 'object' && color?.toHexString) {
    return color.toHexString();
  }
  return defaultColor;
};

const IconNavWidget: React.FC<IconNavWidgetProps> = ({ config, widget: _widget, isEditMode }) => {
  const widgetConfig = config as IconNavWidgetConfig;

  const icon = widgetConfig?.icon || 'AppstoreOutlined';
  const url = widgetConfig?.url || '';
  const openInNew = widgetConfig?.openInNew ?? false;
  const iconSize = widgetConfig?.iconSize || 48;
  const iconColor = normalizeColor(widgetConfig?.iconColor, '#1890ff');
  // const tooltip = widgetConfig?.tooltip || widgetConfig?.title || '点击跳转';

  // 点击处理（仅在非编辑模式下生效）
  const handleClick = () => {
    // 编辑模式下不响应点击
    console.log(isEditMode)
    if (isEditMode) {
      return;
    }
    if (url) {
      console.log('图标导航点击:', url);
      if (openInNew) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    }
  };

  // 渲染图标
  const renderIcon = () => {
    if (!icon) {
      return <LinkOutlined style={{ fontSize: iconSize, color: iconColor }} />;
    }
    return (
      <IconRenderer
        value={icon}
        size={iconSize}
        color={iconColor}
        fallbackText="Nav"
        fallbackColor={iconColor}
      />
    );
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* <Tooltip title={tooltip}> */}
        <div
          onClick={handleClick}
          style={{
            cursor: url && !isEditMode ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // padding: 12,
            borderRadius: 12,
            transition: 'all 0.3s ease',
          }}
          // onMouseEnter={(e) => {
          //   if (url && !isEditMode) {
          //     e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
          //     e.currentTarget.style.transform = 'scale(1.1)';
          //   }
          // }}
          // onMouseLeave={(e) => {
          //   e.currentTarget.style.backgroundColor = 'transparent';
          //   e.currentTarget.style.transform = 'scale(1)';
          // }}
        >
          {renderIcon()}
        </div>
      {/* </Tooltip> */}
    </div>
  );
};

export default IconNavWidget;
