import type { Widget, WidgetGroup, WidgetType } from '@/types'

export type MobileLayoutDisplay = 'card' | 'compact' | 'full'

export interface MobileLayoutItem {
  type: 'widget'
  widgetId: string
  order: number
  visible: boolean
  height?: number | 'auto'
  display: MobileLayoutDisplay
}

export interface MobileGroupLayoutItem {
  type: 'group'
  groupId: string
  order: number
  visible: boolean
  children: MobileLayoutItem[]
}

export type MobileLayoutEntry = MobileLayoutItem | MobileGroupLayoutItem

const readLayoutNumber = (value: unknown): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const compareWidgetPosition = (
  a: { widget: Widget; sourceIndex: number },
  b: { widget: Widget; sourceIndex: number },
) => {
  const ay = readLayoutNumber(a.widget.layout?.y)
  const by = readLayoutNumber(b.widget.layout?.y)
  if (ay !== by) return ay - by

  const ax = readLayoutNumber(a.widget.layout?.x)
  const bx = readLayoutNumber(b.widget.layout?.x)
  if (ax !== bx) return ax - bx

  return a.sourceIndex - b.sourceIndex
}

const compareLayoutPosition = (
  a: { layout?: { x?: number; y?: number }; sourceIndex: number },
  b: { layout?: { x?: number; y?: number }; sourceIndex: number },
) => {
  const ay = readLayoutNumber(a.layout?.y)
  const by = readLayoutNumber(b.layout?.y)
  if (ay !== by) return ay - by

  const ax = readLayoutNumber(a.layout?.x)
  const bx = readLayoutNumber(b.layout?.x)
  if (ax !== bx) return ax - bx

  return a.sourceIndex - b.sourceIndex
}

const AUTO_HEIGHT_WIDGETS = new Set<WidgetType>([
  'clock',
  'stats',
  'indicatorCard',
  'indicatorCardList',
  'recognitionCard',
  'link',
  'news',
  'topList',
  'search',
  'queryFilter',
  'cardGrid',
  'customForm',
  'nativeForm',
  'nativeFormField',
  'headerBar',
  'typography',
  'richText',
  'pageNavigator',
  'iconNav',
  'navGroup',
  'myDocuments',
])

const FIXED_HEIGHT_BY_TYPE: Partial<Record<WidgetType, number>> = {
  chart: 340,
  carousel: 220,
  dataTable: 360,
  microApp: 420,
}

export const getMobileWidgetHeight = (widget: Widget): number | 'auto' => {
  if (AUTO_HEIGHT_WIDGETS.has(widget.type)) {
    return 'auto'
  }

  return FIXED_HEIGHT_BY_TYPE[widget.type] ?? 'auto'
}

export const getMobileWidgetDisplay = (widget: Widget): MobileLayoutDisplay => {
  if (widget.type === 'headerBar' || widget.type === 'carousel') {
    return 'full'
  }

  if (widget.type === 'clock' || widget.type === 'stats' || widget.type === 'indicatorCard') {
    return 'compact'
  }

  return 'card'
}

const createWidgetLayoutItem = (widget: Widget, order: number): MobileLayoutItem => ({
  type: 'widget',
  widgetId: widget.id,
  order,
  visible: true,
  height: getMobileWidgetHeight(widget),
  display: getMobileWidgetDisplay(widget),
})

export const buildAutoMobileLayout = (
  widgets: Widget[],
  groups: WidgetGroup[] = [],
): MobileLayoutEntry[] => {
  const widgetMap = new Map(widgets.map(widget => [widget.id, widget]))
  const groupIdSet = new Set(groups.map(group => group.id))

  const groupEntries = groups
    .map((group, sourceIndex) => ({ group, sourceIndex }))
    .sort((a, b) => compareLayoutPosition(
      { layout: a.group.layout, sourceIndex: a.sourceIndex },
      { layout: b.group.layout, sourceIndex: b.sourceIndex },
    ))
    .map(({ group }, order): MobileGroupLayoutItem | null => {
      const children = group.widgetIds
        .map((widgetId, sourceIndex) => ({ widget: widgetMap.get(widgetId), sourceIndex }))
        .filter((item): item is { widget: Widget; sourceIndex: number } => Boolean(item.widget))
        .sort(compareWidgetPosition)
        .map(({ widget }, childOrder) => createWidgetLayoutItem(widget, childOrder))

      if (!children.length) {
        return null
      }

      return {
        type: 'group',
        groupId: group.id,
        order,
        visible: true,
        children,
      }
    })
    .filter((entry): entry is MobileGroupLayoutItem => Boolean(entry))

  const rootWidgetEntries = widgets
    .filter(widget => !widget.groupId || !groupIdSet.has(widget.groupId))
    .map((widget, sourceIndex) => ({ widget, sourceIndex }))
    .sort(compareWidgetPosition)
    .map(({ widget }, order): MobileLayoutItem => ({
      ...createWidgetLayoutItem(widget, order),
    }))

  return [
    ...groupEntries.map((entry, sourceIndex) => ({
      entry,
      sourceIndex,
      layout: groups.find(group => group.id === entry.groupId)?.layout,
    })),
    ...rootWidgetEntries.map((entry, sourceIndex) => ({
      entry,
      sourceIndex: sourceIndex + groupEntries.length,
      layout: widgetMap.get(entry.widgetId)?.layout,
    })),
  ]
    .sort((a, b) => compareLayoutPosition(a, b))
    .map(({ entry }, order) => ({
      ...entry,
      order,
    }))
}
