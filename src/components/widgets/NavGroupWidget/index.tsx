import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Spin, Empty, Tooltip, Typography, Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { WidgetConfig, Widget, NavItem } from '@/types';
import { safeIntervalMs } from '@/constants/dashboard';
import IconRenderer from '@/components/IconRenderer';
import clsx from 'clsx';
import axios from 'axios';
import './index.scss'

/**
 * 导航组组件配置
 */
interface NavGroupWidgetConfig extends WidgetConfig {
  apiHeaders?: Record<string, string>;  // 请求头
  apiMethod?: 'GET' | 'POST';          // 请求方式
  apiBody?: string;                     // POST 请求体（JSON 字符串）
  groupTitle?: string;        // 导航组标题（可覆盖 widget title）
  layout?: 'flex' | 'grid' | 'list' | 'text' | 'tag';   // 布局模式
  columns?: number;           // 网格列数（grid 模式）
  iconSize?: number;          // 图标大小
  showLabel?: boolean;        // 是否显示导航项名称
  staticItems?: NavItem[];    // 静态导航项（无接口时使用）
  itemGap?: number;           // 导航项间距

  // 通用样式配置（所有模式共用）
  itemBgColor?: string;       // 导航项背景色
  itemTextColor?: string;     // 导航项文字颜色
  itemIconColor?: string;     // 导航项图标颜色
  itemBlur?: number;          // 导航项背景模糊（px）
  itemBorderRadius?: number;  // 导航项圆角（px）
  itemSize?: 'small' | 'middle' | 'large';  // 导航项尺寸

  // text 模式特有配置
  textIcon?: string;          // 文本模式统一图标（默认 SearchOutlined）
  textIconSize?: number;      // 文本模式图标大小（默认 16）
  textColumns?: number;       // 文本模式列数（默认 1）
}

interface NavGroupWidgetProps {
  config?: NavGroupWidgetConfig;
  widget?: Widget;
}

// 规范化颜色值（处理 ColorPicker 对象和序列化后的 JSON 对象）
const normalizeColor = (color: any, defaultColor: string): string => {
  if (!color) return defaultColor;
  if (typeof color === 'string') return color;
  // 处理 ColorPicker 实例（有 toHexString/toRgbString 方法）
  if (typeof color === 'object' && color?.toHexString) {
    return color.toHexString();
  }
  // 处理序列化后的 ColorPicker 对象（包含 metaColor）
  if (typeof color === 'object' && color?.metaColor) {
    const { r, g, b, a } = color.metaColor;
    if (a !== undefined && a < 1) {
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
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
  { id: '1', url: '/dashboard', icon: 'DashboardOutlined', name: '工作台' },
  { id: '2', url: '/settings', icon: 'SettingOutlined', name: '设置' },
  { id: '3', url: '/users', icon: 'UserOutlined', name: '用户' },
  { id: '4', url: '/files', icon: 'FolderOutlined', name: '文件' },
  // { id: '5', url: '/files', icon: 'FolderOutlined', name: '文件' },
  // { id: '6', url: '/files', icon: 'FolderOutlined', name: '文件' },
  // { id: '7', url: '/files', icon: 'FolderOutlined', name: '文件' },
  // { id: '8', url: '/files', icon: 'FolderOutlined', name: '文件' },
  // { id: '9', url: '/files', icon: 'FolderOutlined', name: '文件' },
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
  const itemGap = widgetConfig?.itemGap || 12;

  // 通用样式配置（所有模式共用）
  const itemBgColor = normalizeColor(widgetConfig?.itemBgColor, '');
  const itemTextColor = normalizeColor(widgetConfig?.itemTextColor, '');
  const itemIconColor = normalizeColor(widgetConfig?.itemIconColor, '#FFFFFF');
  const itemBlur = widgetConfig?.itemBlur || 0;
  const itemBorderRadius = widgetConfig?.itemBorderRadius ?? 4;
  const itemSize = widgetConfig?.itemSize || 'middle';

  // text 模式配置
  const textIcon = widgetConfig?.textIcon || 'SearchOutlined';
  const textIconSize = widgetConfig?.textIconSize || 16;
  const textColumns = widgetConfig?.textColumns || 1;

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
      const headers = widgetConfig?.apiHeaders;
      const method = widgetConfig?.apiMethod || 'GET';
      let requestBody: any = undefined;
      if (method === 'POST' && widgetConfig?.apiBody) {
        try {
          requestBody = JSON.parse(widgetConfig.apiBody);
        } catch {
          console.warn('NavGroupWidget: apiBody JSON 解析失败，将作为空 body 发送');
        }
      }
      const response = await axios({
        method,
        url: apiEndpoint.trim(),
        ...(headers ? { headers } : {}),
        ...(requestBody !== undefined ? { data: requestBody } : {}),
      });
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
      }, safeIntervalMs(refreshInterval));
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

  // 点击导航项（默认新窗口打开）
  const handleItemClick = (item: NavItem) => {
    if (item.url) {
      console.log('导航组点击:', item.name, item.url);
      // 默认新窗口打开，除非明确设置 openInNew: false
      if (item.openInNew !== false) {
        window.open(item.url, '_blank');
      } else {
        window.location.href = item.url;
      }
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
    // 优先级：数据中的 iconBgColor > 组件配置的 itemBgColor > 随机渐变
    const bgValue = item.iconBgColor || itemBgColor || getRandomGradient(index);
    return {
      background: bgValue,
      width: iconSize + 36,
      height: iconSize + 36,
      borderRadius: itemBorderRadius,
      backdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
      WebkitBackdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
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
                  style={{ color: item.textColor || itemTextColor || undefined }}
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
                  style={{ color: item.textColor || itemTextColor || undefined }}
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

  // Text 文本列表模式（带图标的纵向列表）
  if (layout === 'text') {
    // 计算尺寸对应的 padding
    const textPadding = itemSize === 'small' ? '6px 12px' : itemSize === 'large' ? '12px 20px' : '8px 16px';
    const textFontSize = itemSize === 'small' ? 12 : itemSize === 'large' ? 16 : 14;

    return (
      <div
        className="nav-group-widget__text"
        style={{
          gridTemplateColumns: `repeat(${textColumns}, 1fr)`,
          gap: itemGap,
        }}
      >
        {navItems.map((item, index) => (
          <div
            key={item.id || index}
            className={clsx('nav-group-widget__text-item', {
              'nav-group-widget__text-item--clickable': !!item.url,
            })}
            style={{
              padding: textPadding,
              fontSize: textFontSize,
              background: item.iconBgColor || itemBgColor || undefined,
              color: item.textColor || itemTextColor || undefined,
              borderRadius: itemBorderRadius,
              backdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
              WebkitBackdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
            }}
            title={item.name}
            onClick={() => handleItemClick(item)}
          >
            <span className="nav-group-widget__text-icon">
              <IconRenderer
                value={item.icon || textIcon}
                size={textIconSize}
                color={item.iconColor || item.textColor || itemTextColor || itemIconColor}
              />
            </span>
            <span className="nav-group-widget__text-label">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Tag 标签模式（横向流式标签）
  if (layout === 'tag') {
    // 计算尺寸对应的固定宽高（大号: 190x72, 中号: 140x52, 小号: 100x38）
    const tagWidth = itemSize === 'small' ? 100 : itemSize === 'large' ? 190 : 140;
    const tagHeight = itemSize === 'small' ? 38 : itemSize === 'large' ? 72 : 52;
    const tagFontSize = itemSize === 'small' ? 12 : itemSize === 'large' ? 16 : 14;

    return (
      <div className="nav-group-widget__tag" style={{ gap: itemGap }}>
        {navItems.map((item, index) => (
          <Tag
            key={item.id || index}
            className={clsx('nav-group-widget__tag-item', {
              'nav-group-widget__tag-item--clickable': !!item.url,
            })}
            style={{
              width: tagWidth,
              height: tagHeight,
              fontSize: tagFontSize,
              background: item.iconBgColor || itemBgColor || undefined,
              color: item.textColor || itemTextColor || undefined,
              borderRadius: itemBorderRadius,
              border: 'none',
              cursor: item.url ? 'pointer' : 'default',
              backdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
              WebkitBackdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
            }}
            title={item.name}
            onClick={() => handleItemClick(item)}
          >
            <span className="nav-group-widget__tag-text">{item.name}</span>
          </Tag>
        ))}
      </div>
    );
  }

  // 列表布局（默认）
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
              style={{ color: item.textColor || itemTextColor || undefined }}
            >
              {item.name}
            </Typography.Text>
            {item.description && (
              <Typography.Text
                type="secondary"
                className="nav-group-widget__list-description"
                style={{ color: item.textColor ? `${item.textColor}99` : (itemTextColor ? `${itemTextColor}99` : undefined) }}
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
