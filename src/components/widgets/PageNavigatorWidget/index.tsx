import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { WidgetConfig } from '@/types';
import IconRenderer from '../../IconRenderer';
import './index.scss';

interface NavigationItem {
  name: string;
  path: string;
  icon?: string;  // Ant Design 图标名或图片 URL
  openInNew?: boolean;  // 是否在新窗口打开
}

interface PageNavigatorWidgetConfig extends WidgetConfig {
  items?: NavigationItem[];
  displayMode?: 'icon' | 'text';  // 显示模式：仅图标或仅文字
  itemSize?: 'small' | 'medium' | 'large';  // 项目大小
  itemColor?: string | { toHexString?: () => string };  // 颜色配置
}

interface PageNavigatorWidgetProps {
  config: PageNavigatorWidgetConfig;
}

const DEFAULT_ITEMS: NavigationItem[] = [
  { name: '首页', path: '/', icon: 'HomeOutlined' },
  { name: '工作台', path: '/workspace', icon: 'AppstoreOutlined' },
  { name: '设置', path: '/settings', icon: 'SettingOutlined' }
];

// 根据 itemSize 获取导航项的宽度
const getItemWidth = (size: 'small' | 'medium' | 'large', mode: 'icon' | 'text'): number => {
  if (mode === 'icon') {
    switch (size) {
      case 'small': return 40;
      case 'large': return 60;
      default: return 50;
    }
  }
  switch (size) {
    case 'small': return 80;
    case 'large': return 140;
    default: return 110;
  }
};

// 解析颜色值
const normalizeColor = (color: string | { toHexString?: () => string } | undefined): string | undefined => {
  if (!color) return undefined;
  if (typeof color === 'string') return color;
  if (typeof color === 'object' && color.toHexString) {
    return color.toHexString();
  }
  return undefined;
};

const PageNavigatorWidget: React.FC<PageNavigatorWidgetProps> = ({ config }) => {
  const navigate = useNavigate();
  const { isEditMode } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const items = config.items && config.items.length > 0 ? config.items : DEFAULT_ITEMS;
  const displayMode = config.displayMode || 'text';
  const itemSize = config.itemSize || 'medium';
  const itemColor = normalizeColor(config.itemColor);

  // 监听容器宽度变化
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // 计算每个导航项的位置
  const itemPositions = useMemo(() => {
    const count = items.length;
    if (count === 0 || containerWidth === 0) return [];

    const itemWidth = getItemWidth(itemSize, displayMode);
    const gap = 8; // 导航项间距
    const totalWidth = itemWidth * count + gap * (count - 1);
    const startX = (containerWidth - totalWidth) / 2;

    return items.map((_, index) => ({
      left: startX + index * (itemWidth + gap),
    }));
  }, [items, containerWidth, itemSize, displayMode]);

  const handleNavigate = (item: NavigationItem) => {
    if (isEditMode) return;
    if (!item.path) return;

    if (item.openInNew) {
      window.open(item.path, '_blank');
    } else {
      window.location.href = item.path;
    }
  };

  return (
    <div className={`page-navigator-widget mode-${displayMode} size-${itemSize}`} ref={containerRef}>
      <div className="nav-container">
        {items.map((item, index) => (
          <div
            key={`${index}-${item.name}`}
            className="nav-item"
            style={{ left: itemPositions[index]?.left ?? 0, color: itemColor }}
            onClick={() => handleNavigate(item)}
            title={displayMode === 'icon' ? item.name : undefined}
          >
            {displayMode === 'icon' ? (
              <IconRenderer value={item.icon || 'AppstoreOutlined'} size={itemSize === 'small' ? 20 : itemSize === 'large' ? 32 : 24} color={itemColor} />
            ) : (
              <span>{item.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageNavigatorWidget;
