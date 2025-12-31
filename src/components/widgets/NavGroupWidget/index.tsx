import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Spin, Empty, Tooltip, Typography } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { WidgetConfig, Widget, NavItem } from '@/types';
import IconRenderer from '@/components/IconRenderer';
import clsx from 'clsx';
import axios from 'axios';
import './index.scss'

/**
 * 导航组组件配置
 */
interface NavGroupWidgetConfig extends WidgetConfig {
  groupTitle?: string;        // 导航组标题（可覆盖 widget title）
  layout?: 'flex' | 'grid' | 'list';   // 布局模式：flex(默认自适应)、grid(固定列数)、list(列表)
  columns?: number;           // 网格列数（grid 模式）
  iconSize?: number;          // 图标大小
  showLabel?: boolean;        // 是否显示导航项名称
  staticItems?: NavItem[];    // 静态导航项（无接口时使用）
  itemIconColor?: string;     // 统一图标颜色
  itemGap?: number;           // 导航项间距
}

interface NavGroupWidgetProps {
  config?: NavGroupWidgetConfig;
  widget?: Widget;
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

// 图标背景渐变色预设（用于随机分配）
const ICON_BG_GRADIENT_PRESETS = [
  'linear-gradient(137deg, #6fa4ff 15%, #406eef 86%)',  // 蓝色
  'linear-gradient(137deg, #68d56e 15%, #3eb864 86%)',  // 绿色
  'linear-gradient(135deg, #fda96b 9%, #fe700e 91%)',   // 橙色
  'linear-gradient(137deg, #ff7eb3 15%, #e6488d 86%)',  // 粉红
  'linear-gradient(135deg, #a78bfa 12%, #7c3aed 88%)',  // 紫色
  'linear-gradient(137deg, #5eead4 15%, #14b8a6 86%)',  // 青色
  'linear-gradient(135deg, #fbbf24 10%, #f59e0b 90%)',  // 黄色
  'linear-gradient(137deg, #f87171 15%, #dc2626 86%)',  // 红色
  'linear-gradient(135deg, #60a5fa 12%, #2563eb 88%)',  // 天蓝
  'linear-gradient(137deg, #c084fc 15%, #9333ea 86%)',  // 淡紫
  'linear-gradient(135deg, #4ade80 10%, #16a34a 90%)',  // 翠绿
  'linear-gradient(137deg, #fb923c 15%, #ea580c 86%)',  // 深橙
];

// 根据索引获取随机渐变背景色
const getRandomGradient = (index: number): string => {
  return ICON_BG_GRADIENT_PRESETS[index % ICON_BG_GRADIENT_PRESETS.length];
};

// 默认导航数据
const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: '1', url: '/dashboard', icon: 'DashboardOutlined', name: '仪表盘' },
  { id: '2', url: '/settings', icon: 'SettingOutlined', name: '设置' },
  { id: '3', url: '/users', icon: 'UserOutlined', name: '用户' },
  { id: '4', url: '/files', icon: 'FolderOutlined', name: '文件' },
  { id: '5', url: '/files', icon: 'FolderOutlined', name: '文件' },
  { id: '6', url: '/files', icon: 'FolderOutlined', name: '文件' },
  { id: '7', url: '/files', icon: 'FolderOutlined', name: '文件' },
  { id: '8', url: '/files', icon: 'FolderOutlined', name: '文件' },
  { id: '9', url: '/files', icon: 'FolderOutlined', name: '文件' },
];

const NavGroupWidget: React.FC<NavGroupWidgetProps> = ({ config, widget }) => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 获取配置
  const widgetConfig = config as NavGroupWidgetConfig;
  const apiEndpoint = widgetConfig?.apiEndpoint;
  const refreshInterval = widgetConfig?.refreshInterval || 0;
  const layout = widgetConfig?.layout || 'flex';  // 默认使用 flex 布局
  const columns = widgetConfig?.columns || 4;
  const iconSize = widgetConfig?.iconSize || 32;
  const showLabel = widgetConfig?.showLabel !== false;
  const staticItems = widgetConfig?.staticItems;
  const itemIconColor = normalizeColor(widgetConfig?.itemIconColor, '#1890ff');
  const itemGap = widgetConfig?.itemGap || 12;

  // 加载数据
  const loadData = useCallback(async () => {
    // 如果有静态数据，直接使用
    if (staticItems && staticItems.length > 0) {
      setNavItems(staticItems);
      return;
    }

    // 如果没有接口，使用默认数据
    if (!apiEndpoint) {
      setNavItems(DEFAULT_NAV_ITEMS);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(apiEndpoint);
      const data = response.data?.data || response.data;

      if (Array.isArray(data)) {
        setNavItems(data);
      } else {
        console.warn('NavGroupWidget: 接口返回数据格式不正确，使用默认数据');
        setNavItems([]);
      }
    } catch (err: any) {
      console.error('NavGroupWidget: 加载数据失败:', err);
      setError(err.message || '数据加载失败');
      setNavItems(DEFAULT_NAV_ITEMS);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, staticItems]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 设置轮询
  useEffect(() => {
    if (refreshInterval > 0 && apiEndpoint) {
      intervalRef.current = setInterval(() => {
        loadData();
      }, refreshInterval * 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshInterval, apiEndpoint, loadData]);

  // 响应刷新操作
  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      loadData();
    }
  }, [widget?.refreshCount, loadData]);

  // 点击导航项
  const handleItemClick = (item: NavItem) => {
    if (item.url) {
      console.log('导航组点击:', item.name, item.url);
      // 内网环境，仅输出日志
      // 如需跳转可取消下方注释
      // if (item.openInNew) {
      //   window.open(item.url, '_blank');
      // } else {
      //   window.location.href = item.url;
      // }
    }
  };

  // 渲染图标（使用 item.iconColor，默认白色）
  const renderIcon = (item: NavItem) => {
    // 图标颜色：优先使用 item.iconColor，否则使用组件配置的 itemIconColor，最后默认白色
    const iconColor = item.iconColor || (item.iconBgColor ? '#ffffff' : itemIconColor);

    if (!item.icon) {
      return <AppstoreOutlined style={{ fontSize: iconSize, color: iconColor }} />;
    }
    return (
      <IconRenderer
        value={item.icon}
        size={iconSize}
        color={iconColor}
        fallbackText={item.name?.charAt(0) || 'N'}
        fallbackColor={iconColor}
      />
    );
  };

  // 获取图标背景样式（仅动态部分）
  const getIconBgStyle = (item: NavItem, index: number): React.CSSProperties => {
    const bgValue = item.iconBgColor || getRandomGradient(index);
    return {
      background: bgValue,
      width: iconSize + 36,
      height: iconSize + 36,
    };
  };

  // 加载状态
  if (loading && navItems.length === 0) {
    return (
      <div className="nav-group-widget__status">
        <Spin tip="加载中..." />
      </div>
    );
  }

  // 空状态
  if (!loading && navItems.length === 0) {
    return (
      <div className="nav-group-widget__status">
        <Empty description={error || '暂无导航数据'} />
      </div>
    );
  }

  // Flex 自适应布局（默认）
  if (layout === 'flex') {
    return (
      <div className="nav-group-widget__flex" style={{ gap: itemGap }}>
        {navItems.map((item, index) => (
          <Tooltip key={item.id || index} title={item.description || item.name}>
            <div
              className={clsx('nav-group-widget__flex-item', {
                'nav-group-widget__flex-item--clickable': !!item.url,
              })}
              onClick={() => handleItemClick(item)}
            >
              <div
                className="nav-group-widget__icon-bg"
                style={{
                  ...getIconBgStyle(item, index),
                  marginBottom: showLabel ? 8 : 0,
                }}
              >
                {renderIcon(item)}
              </div>
              {showLabel && (
                <Typography.Text
                  ellipsis={{ tooltip: item.name }}
                  className="nav-group-widget__flex-label"
                  style={{ color: item.textColor || undefined }}
                >
                  {item.name}
                </Typography.Text>
              )}
            </div>
          </Tooltip>
        ))}
      </div>
    );
  }

  // 网格布局（固定列数）
  if (layout === 'grid') {
    return (
      <div
        className="nav-group-widget__grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: itemGap,
        }}
      >
        {navItems.map((item, index) => (
          <Tooltip key={item.id || index} title={item.description || item.name}>
            <div
              className={clsx('nav-group-widget__grid-item', {
                'nav-group-widget__grid-item--clickable': !!item.url,
              })}
              onClick={() => handleItemClick(item)}
            >
              <div
                className="nav-group-widget__icon-bg"
                style={{
                  ...getIconBgStyle(item, index),
                  marginBottom: showLabel ? 8 : 0,
                }}
              >
                {renderIcon(item)}
              </div>
              {showLabel && (
                <Typography.Text
                  ellipsis={{ tooltip: item.name }}
                  className="nav-group-widget__grid-label"
                  style={{ color: item.textColor || undefined }}
                >
                  {item.name}
                </Typography.Text>
              )}
            </div>
          </Tooltip>
        ))}
      </div>
    );
  }

  // 列表布局
  return (
    <div className="nav-group-widget__list">
      {navItems.map((item, index) => (
        <div
          key={item.id || index}
          className={clsx('nav-group-widget__list-item', {
            'nav-group-widget__list-item--clickable': !!item.url,
          })}
          onClick={() => handleItemClick(item)}
        >
          <div
            className="nav-group-widget__icon-bg"
            style={{
              ...getIconBgStyle(item, index),
              marginRight: 12,
            }}
          >
            {renderIcon(item)}
          </div>
          <div className="nav-group-widget__list-content">
            <Typography.Text
              strong
              ellipsis
              style={{ color: item.textColor || undefined }}
            >
              {item.name}
            </Typography.Text>
            {item.description && (
              <Typography.Text
                type="secondary"
                className="nav-group-widget__list-description"
                style={{ color: item.textColor ? `${item.textColor}99` : undefined }}
                ellipsis
              >
                {item.description}
              </Typography.Text>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NavGroupWidget;
