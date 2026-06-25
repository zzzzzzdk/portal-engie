import * as Icons from 'lucide-react'
import type { Widget, WidgetType, MicroAppModule } from '@/types'
import type { WidgetDisplayMode, GridSize, WidgetIconConfig } from '@/types/widget-size'
import { resolveChartLegacyPreset } from '@/components/widgets/chart/presets'
import { microAppConfigLoader } from './microAppConfig'

const CHART_PRESET_ICON_MAP: Record<string, string> = {
  'basic-line': 'line_jichuzhexiantu',
  'basic-bar': 'line_jichuzhuzhuangtu',
  'stacked-bar': 'line_duidiezhuzhuangtu',
  'percent-bar': 'line_baifenbizhuzhuangtu',
  'grouped-bar': 'line_fenzuzhuzhuangtu',
  'basic-horizontal-bar': 'line_jichutiaoxingtu',
  'stacked-horizontal-bar': 'line_duidietiaoxingtu',
  'progress-bar': 'line_jindutiao',
  gauge: 'line_yibiaopan',
  pie: 'line_bingtu',
  donut: 'line_huanxingtu',
  radar: 'line_leidatu',
  'area-map': 'line_quyuditu',
  'flow-map': 'line_liuxiangditu',
  funnel: 'line_loudoutu',
  scatter: 'line_sandiantu',
  'dual-axis': 'line_zhuxianzuhetu',
  'grouped-dual-axis': 'line_fenzuzhuxianzuhetu',
}

const WIDGET_TYPE_ICON_MAP: Record<WidgetType, WidgetIconConfig['icon'] | null> = {
  clock: Icons.Clock,
  stats: 'line_yibiaopan',
  indicatorCard: 'line_zhibiaoka',
  indicatorCardList: 'line_zhibiaoka',
  recognitionCard: Icons.CreditCard,
  chart: 'line_jichuzhexiantu',
  carousel: 'line_tupianlunbo',
  link: Icons.Link,
  news: Icons.Newspaper,
  topList: Icons.ListOrdered,
  search: Icons.Search,
  queryFilter: Icons.Filter,
  dataTable: Icons.Table,
  cardGrid: Icons.LayoutGrid,
  customForm: Icons.FileText,
  nativeForm: Icons.FileSpreadsheet,
  nativeFormField: Icons.TextCursorInput,
  richText: Icons.FileText,
  microApp: null,
  floatingModule: Icons.AppWindow,
  headerBar: Icons.PanelTop,
  typography: Icons.Type,
  pageNavigator: Icons.Layers,
  iconNav: Icons.Navigation,
  navGroup: Icons.Grid3x3,
  myDocuments: Icons.FolderOpen,
}

export const getWidgetDisplayMode = (w: number, h: number): WidgetDisplayMode => {
  if (w <= 2 && h <= 2) {
    return 'icon-only'
  }

  const area = w * h

  if (area <= 4) {
    return 'minimal'
  }

  if (area <= 12) {
    return 'compact'
  }

  if (area <= 24) {
    return 'normal'
  }

  return 'large'
}

export const isIconOnlyMode = (w: number, h: number): boolean => w <= 2 && h <= 2

const getColorFromString = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 65%, 55%)`
}

const getChartWidgetIcon = (widget: Widget): WidgetIconConfig['icon'] => {
  const preset = resolveChartLegacyPreset(widget.config)
  return CHART_PRESET_ICON_MAP[preset] || 'line_jichuzhexiantu'
}

export const getWidgetIcon = async (widget: Widget): Promise<WidgetIconConfig | null> => {
  if (widget.type === 'microApp') {
    if (widget.config.iconSvg) {
      return {
        icon: widget.config.icon || '',
        iconSvg: widget.config.iconSvg,
        fallback: 'letter',
      }
    }

    if (widget.config.icon) {
      return {
        icon: widget.config.icon,
        fallback: 'letter',
      }
    }

    if (widget.config.systemId && widget.config.moduleId) {
      try {
        const module = await microAppConfigLoader.getModule(
          widget.config.systemId,
          widget.config.moduleId,
        )

        if (module?.iconSvg) {
          return {
            icon: module.icon || widget.title.charAt(0).toUpperCase(),
            iconSvg: module.iconSvg,
            fallback: 'letter',
          }
        }

        if (module?.icon) {
          return {
            icon: module.icon,
            fallback: 'letter',
          }
        }
      } catch (error) {
        console.warn('Failed to load micro app icon:', error)
      }
    }

    return {
      icon: widget.title.charAt(0).toUpperCase(),
      fallback: 'letter',
      backgroundColor: getColorFromString(widget.id),
    }
  }

  const icon = widget.type === 'chart'
    ? getChartWidgetIcon(widget)
    : WIDGET_TYPE_ICON_MAP[widget.type]

  if (icon) {
    return {
      icon,
      fallback: 'default',
    }
  }

  return {
    icon: widget.title.charAt(0).toUpperCase(),
    fallback: 'letter',
    backgroundColor: getColorFromString(widget.id),
  }
}

export const getWidgetDefaultSize = (type: WidgetType, module?: MicroAppModule): GridSize => {
  if (type === 'microApp' && module?.defaultSize) {
    return {
      columns: module.defaultSize.w,
      rows: module.defaultSize.h,
    }
  }

  const defaultSizes: Record<WidgetType, GridSize> = {
    clock: { columns: 2, rows: 2 },
    stats: { columns: 3, rows: 2 },
    indicatorCard: { columns: 8, rows: 5 },
    indicatorCardList: { columns: 10, rows: 6 },
    recognitionCard: { columns: 6, rows: 10 },
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
    nativeForm: { columns: 8, rows: 6 },
    nativeFormField: { columns: 5, rows: 4 },
    richText: { columns: 6, rows: 4 },
    microApp: { columns: 6, rows: 4 },
    floatingModule: { columns: 4, rows: 3 },
    headerBar: { columns: 12, rows: 1 },
    typography: { columns: 4, rows: 2 },
    pageNavigator: { columns: 12, rows: 1 },
    iconNav: { columns: 2, rows: 2 },
    navGroup: { columns: 5, rows: 4 },
    myDocuments: { columns: 2, rows: 2 },
  }

  return defaultSizes[type] || { columns: 4, rows: 3 }
}

export const calculateContainerSize = (
  w: number,
  h: number,
  containerWidth: number,
  rowHeight: number = 120,
  margin: number = 10,
  headerHeight: number = 40,
) => {
  const colWidth = containerWidth / 12
  const width = Math.floor(colWidth * w - margin)
  const height = Math.floor(rowHeight * h - margin)
  const contentHeight = Math.max(height - headerHeight, 0)

  return {
    width,
    height,
    contentHeight,
  }
}
