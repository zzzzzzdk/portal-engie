import React from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { WidgetConfig, Widget } from '@/types';
import IconRenderer from '@/components/IconRenderer';

/**
 * 链接项配置
 */
interface LinkItem {
  id?: string;
  title: string;          // 链接标题
  url: string;            // 跳转地址
  icon?: string;          // 图标名称
  iconColor?: string;     // 图标颜色
  description?: string;   // 描述
  openInNew?: boolean;    // 是否新窗口打开
}

/**
 * 链接组件配置
 */
interface LinkWidgetConfig extends WidgetConfig {
  links?: LinkItem[];           // 链接数组
  layout?: 'button' | 'list' | 'card';  // 布局方式
  buttonShape?: 'circle' | 'default' | 'round';  // 按钮形状
  buttonSize?: 'small' | 'middle' | 'large';     // 按钮大小
  showTitle?: boolean;          // 是否显示标题
  columns?: number;             // 列数(card模式)
}

interface LinkWidgetProps {
  config?: LinkWidgetConfig;
  widget?: Widget;
}

// 默认链接数据
const DEFAULT_LINKS: LinkItem[] = [
  { id: '1', title: '首页', url: '/', icon: 'HomeOutlined', iconColor: '#1890ff' },
  { id: '2', title: '应用中心', url: '/apps', icon: 'AppstoreOutlined', iconColor: '#52c41a' },
  { id: '3', title: '文档', url: '/docs', icon: 'FileOutlined', iconColor: '#faad14' },
  { id: '4', title: '设置', url: '/settings', icon: 'SettingOutlined', iconColor: '#722ed1' },
];

const LinkWidget: React.FC<LinkWidgetProps> = ({ config, widget: _widget }) => {
  // 获取配置
  const linkConfig = config as LinkWidgetConfig;
  const links = linkConfig?.links || DEFAULT_LINKS;
  const layout = linkConfig?.layout || 'button';
  const buttonShape = linkConfig?.buttonShape || 'circle';
  const buttonSize = linkConfig?.buttonSize || 'large';
  const showTitle = linkConfig?.showTitle ?? true;
  const columns = linkConfig?.columns || 4;

  // 获取图标
  const getIcon = (iconName?: string, size: number = 16, color?: string): React.ReactNode => {
    if (!iconName) return <LinkOutlined />;
    return <IconRenderer value={iconName} size={size} color={color} fallbackText={iconName} />;
  };

  // 点击链接
  const handleLinkClick = (link: LinkItem) => {
    if (link.url) {
      console.log('打开链接:', link.title, link.url);
      // 内网环境，仅输出日志
      // 如需跳转可取消下方注释
      if (link.openInNew) {
        window.open(link.url, '_blank');
      } else {
        window.location.href = link.url;
      }
    }
  };

  // 按钮布局
  if (layout === 'button') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Space wrap size="middle">
          {links.map((link, index) => (
            <Tooltip title={link.description || link.title} key={link.id || index}>
              {showTitle && buttonShape !== 'circle' ? (
                <Button
                  type="primary"
                  shape={buttonShape}
                  size={buttonSize}
                  icon={getIcon(link.icon, 14, '#fff')}
                  style={link.iconColor ? { backgroundColor: link.iconColor, borderColor: link.iconColor } : undefined}
                  onClick={() => handleLinkClick(link)}
                >
                  {link.title}
                </Button>
              ) : (
                <Button
                  type="primary"
                  shape="circle"
                  size={buttonSize}
                  icon={getIcon(link.icon, 16, '#fff')}
                  style={link.iconColor ? { backgroundColor: link.iconColor, borderColor: link.iconColor } : undefined}
                  onClick={() => handleLinkClick(link)}
                />
              )}
            </Tooltip>
          ))}
        </Space>
      </div>
    );
  }

  // 列表布局
  if (layout === 'list') {
    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {links.map((link, index) => (
          <div
            key={link.id || index}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            className="link-list-item"
            onClick={() => handleLinkClick(link)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: link.iconColor || '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '18px',
                marginRight: '12px',
              }}
            >
              {getIcon(link.icon, 18, '#fff')}
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text strong>{link.title}</Typography.Text>
              {link.description && (
                <Typography.Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                  {link.description}
                </Typography.Text>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 卡片布局
  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '12px',
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '12px',
      }}
    >
      {links.map((link, index) => (
        <div
          key={link.id || index}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 8px',
            cursor: 'pointer',
            borderRadius: '8px',
            border: '1px solid #f0f0f0',
            transition: 'all 0.2s',
          }}
          onClick={() => handleLinkClick(link)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.borderColor = link.iconColor || '#1890ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#f0f0f0';
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: link.iconColor || '#1890ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              marginBottom: '8px',
            }}
          >
            {getIcon(link.icon, 24, '#fff')}
          </div>
          <Typography.Text strong ellipsis={{ tooltip: link.title }} style={{ textAlign: 'center' }}>
            {link.title}
          </Typography.Text>
          {link.description && (
            <Typography.Text
              type="secondary"
              ellipsis={{ tooltip: link.description }}
              style={{ fontSize: '12px', textAlign: 'center' }}
            >
              {link.description}
            </Typography.Text>
          )}
        </div>
      ))}
    </div>
  );
};

export default LinkWidget;
