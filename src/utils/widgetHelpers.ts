
import { Widget, WidgetType, MicroAppModule } from '@/types';
import { WidgetDisplayMode, GridSize, WidgetIconConfig } from '@/types/widget-size';
import { microAppConfigLoader } from './microAppConfig';
import * as Icons from 'lucide-react';

/**
 * 判断小组件的显示模式
 */
export const getWidgetDisplayMode = (w: number, h: number): WidgetDisplayMode => {
  // 严格 2x2 为 icon-only
  if (w <= 2 && h <= 2) {
    return 'icon-only';
  }

  const area = w * h;

  // 根据面积判断
  if (area <= 4) return 'minimal';      // 2x2 或更小
  if (area <= 12) return 'compact';     // 3x4, 4x3 等
  if (area <= 24) return 'normal';      // 4x6, 6x4 等
  return 'large';                        // > 24
};

/**
 * 判断是否为 icon-only 模式
 */
export const isIconOnlyMode = (w: number, h: number): boolean => {
  return w <= 2 && h <= 2;
};

/**
 * 根据字符串生颜色（用于首字母 Avatar）
 */
const getColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
};

/**
 * 小组件类型与图标的映射
 */
const WIDGET_TYPE_ICON_MAP: Record<WidgetType, React.ComponentType<any> | null> = {
  clock: Icons.Clock,
  stats: Icons.BarChart3,
  indicatorCard: Icons.Hash,
  chart: Icons.LineChart,
  carousel: Icons.Image,
  link: Icons.Link,
  news: Icons.Newspaper,
  topList: Icons.ListOrdered,
  search: Icons.Search,
  queryFilter: Icons.Filter,
  dataTable: Icons.Table,
  cardGrid: Icons.LayoutGrid,
  customForm: Icons.FileText,
  richText: Icons.FileText,
  microApp: null,  // 微应用动态获取
  floatingModule: Icons.AppWindow,
  headerBar: Icons.PanelTop,
  typography: Icons.Type,
  pageNavigator: Icons.Layers,
  iconNav: Icons.Navigation,
  navGroup: Icons.Grid3x3,
  myDocuments: Icons.FolderOpen,
};

/**
 * 获取小组件的 Icon 配置
 * @returns Promise<WidgetIconConfig | null>
 */
export const getWidgetIcon = async (widget: Widget): Promise<WidgetIconConfig | null> => {
  // 微应用类型：优先读取 widget 自身配置
  if (widget.type === 'microApp') {
    if (widget.config.iconSvg) {
      return {
        icon: widget.config.icon || '',
        iconSvg: widget.config.iconSvg,
        fallback: 'letter',
      };
    }

    if (widget.config.icon) {
      return {
        icon: widget.config.icon,
        fallback: 'letter',
      };
    }

    if (widget.config.systemId && widget.config.moduleId) {
      try {
        const module = await microAppConfigLoader.getModule(
          widget.config.systemId,
          widget.config.moduleId
        );

        if (module?.iconSvg) {
          return {
            icon: module.icon || widget.title.charAt(0).toUpperCase(),
            iconSvg: module.iconSvg,
            fallback: 'letter'
          };
        }

        if (module?.icon) {
          return {
            icon: module.icon,
            fallback: 'letter'
          };
        }
      } catch (error) {
        console.warn('Failed to load micro app icon:', error);
      }
    }

    // 降级到首字母
    return {
      icon: widget.title.charAt(0).toUpperCase(),
      fallback: 'letter',
      backgroundColor: getColorFromString(widget.id)
    };
  }

  // 其他类型：使用 lucide-react 图标
  const iconComponent = WIDGET_TYPE_ICON_MAP[widget.type];
  if (iconComponent) {
    return {
      icon: iconComponent,
      fallback: 'default'
    };
  }

  // 最终降级
  return {
    icon: widget.title.charAt(0).toUpperCase(),
    fallback: 'letter',
    backgroundColor: getColorFromString(widget.id)
  };
};

/**
 * 获取小组件的默认尺寸
 */
export const getWidgetDefaultSize = (type: WidgetType, module?: MicroAppModule): GridSize => {
  // 微应用：从配置读取
  if (type === 'microApp' && module?.defaultSize) {
    return {
      columns: module.defaultSize.w,
      rows: module.defaultSize.h
    };
  }

  // 其他类型：预定义默认尺寸
  const defaultSizes: Record<WidgetType, GridSize> = {
    clock: { columns: 2, rows: 2 },
  stats: { columns: 3, rows: 2 },
  indicatorCard: { columns: 8, rows: 5 },
  chart: { columns: 6, rows: 4 },
  carousel: { columns: 6, rows: 3 },
  link: { columns: 2, rows: 1 },
    news: { columns: 4, rows: 3 },
    topList: { columns: 3, rows: 4 },
    search: { columns: 4, rows: 1 },
    queryFilter: { columns: 6, rows: 3 },
    dataTable: { columns: 8, rows: 4 },
    cardGrid: { columns: 6, rows: 3 },
    customForm: { columns: 4, rows: 4 },
    richText: { columns: 6, rows: 4 },
    microApp: { columns: 6, rows: 4 },
    floatingModule: { columns: 4, rows: 3 },
    headerBar: { columns: 12, rows: 1 },
    typography: { columns: 4, rows: 2 },
    pageNavigator: { columns: 12, rows: 1 },
    iconNav: { columns: 2, rows: 2 },
    navGroup: { columns: 5, rows: 4 },
    myDocuments: { columns: 2, rows: 2 },
  };

  return defaultSizes[type] || { columns: 4, rows: 3 };
};

/**
 * 计算容器像素尺寸
 * @param w 网格宽度
 * @param h 网格高度
 * @param containerWidth 容器总宽度
 * @param rowHeight 行高（默认 120px）
 * @param margin 间距（默认 10px）
 * @param headerHeight 头部高度（默认 40px）
 */
export const calculateContainerSize = (
  w: number,
  h: number,
  containerWidth: number,
  rowHeight: number = 120,
  margin: number = 10,
  headerHeight: number = 40
) => {
  const colWidth = containerWidth / 12;

  const width = Math.floor(colWidth * w - margin);
  const height = Math.floor(rowHeight * h - margin);
  const contentHeight = Math.max(height - headerHeight, 0);

  return {
    width,
    height,
    contentHeight
  };
};
