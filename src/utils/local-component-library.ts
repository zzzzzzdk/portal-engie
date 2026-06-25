import type {
  Layout,
} from 'react-grid-layout'
import type {
  Widget,
  WidgetConfig,
  WidgetGroup,
  WidgetGroupConfig,
  WidgetType,
} from '@/types'
import type {
  LocalTemplateRecord,
  LocalTemplateSnapshot,
  LocalTemplateSourceMeta,
} from '@/types/local-component-library'

export const LOCAL_TEMPLATE_KEY_PREFIX = 'local-template:'

type StoreLike = {
  widgets: Widget[]
  groups: WidgetGroup[]
  addWidget: (
    type: WidgetType,
    position?: { x: number; y: number; w?: number; h?: number; groupId?: string }
  ) => Widget
  updateWidget: (id: string, updates: Partial<Widget>) => void
  createEmptyGroup: (title?: string, position?: { x: number; y: number }) => WidgetGroup
  updateGroup: (id: string, updates: Partial<WidgetGroup>) => void
}

const normalizeLayoutBase = (layout: Layout, overrides: Partial<Layout> = {}): Layout => ({
  ...layout,
  ...overrides,
  i: overrides.i || layout.i || '',
  x: Number.isFinite(overrides.x) ? Number(overrides.x) : Number.isFinite(layout.x) ? Number(layout.x) : 0,
  y: Number.isFinite(overrides.y) ? Number(overrides.y) : Number.isFinite(layout.y) ? Number(layout.y) : 0,
  w: Number.isFinite(overrides.w) ? Number(overrides.w) : Number.isFinite(layout.w) ? Number(layout.w) : 4,
  h: Number.isFinite(overrides.h) ? Number(overrides.h) : Number.isFinite(layout.h) ? Number(layout.h) : 3,
  minW: Number.isFinite(overrides.minW) ? Number(overrides.minW) : Number.isFinite(layout.minW) ? Number(layout.minW) : 1,
  minH: Number.isFinite(overrides.minH) ? Number(overrides.minH) : Number.isFinite(layout.minH) ? Number(layout.minH) : 1,
})

const cloneSerializable = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const sortObjectDeep = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, any>>((result, key) => {
      result[key] = sortObjectDeep(value[key])
      return result
    }, {})
}

const stripWidgetTemplateMeta = (config?: WidgetConfig): WidgetConfig => {
  if (!config) {
    return {}
  }

  const nextConfig = cloneSerializable(config)
  delete (nextConfig as WidgetConfig & { localTemplateMeta?: LocalTemplateSourceMeta }).localTemplateMeta
  return nextConfig
}

const stripGroupTemplateMeta = (config?: WidgetGroupConfig): WidgetGroupConfig => {
  if (!config) {
    return {}
  }

  const nextConfig = cloneSerializable(config)
  delete (nextConfig as WidgetGroupConfig & { localTemplateMeta?: LocalTemplateSourceMeta }).localTemplateMeta
  return nextConfig
}

const normalizeWidgetForSignature = (widget: Widget) => ({
  type: widget.type,
  title: widget.title,
  layout: {
    w: Number(widget.layout?.w || 4),
    h: Number(widget.layout?.h || 3),
    minW: Number(widget.layout?.minW || 1),
    minH: Number(widget.layout?.minH || 1),
  },
  config: stripWidgetTemplateMeta(widget.config),
})

const normalizeGroupForSignature = (group: WidgetGroup, widgets: Widget[]) => ({
  title: group.title,
  layout: {
    w: Number(group.layout?.w || 6),
    h: Number(group.layout?.h || 5),
    minW: Number(group.layout?.minW || 2),
    minH: Number(group.layout?.minH || 2),
  },
  config: stripGroupTemplateMeta(group.config),
  widgets: widgets.map(normalizeWidgetForSignature),
})

const buildRootInsertPosition = (widgets: Widget[], groups: WidgetGroup[]) => {
  const rootWidgetBottom = widgets
    .filter((widget) => !widget.groupId)
    .reduce((maxBottom, widget) => {
      const y = Number.isFinite(widget.layout?.y) ? Number(widget.layout.y) : 0
      const h = Number.isFinite(widget.layout?.h) ? Number(widget.layout.h) : 0
      return Math.max(maxBottom, y + h)
    }, 0)

  const rootGroupBottom = groups.reduce((maxBottom, group) => {
    const y = Number.isFinite(group.layout?.y) ? Number(group.layout.y) : 0
    const h = Number.isFinite(group.layout?.h) ? Number(group.layout.h) : 0
    return Math.max(maxBottom, y + h)
  }, 0)

  return {
    x: 0,
    y: Math.max(rootWidgetBottom, rootGroupBottom),
  }
}

const createWidgetSourceMeta = (template: LocalTemplateRecord, signature: string): LocalTemplateSourceMeta => ({
  sourceSignature: signature,
  sourceTemplateId: template.id,
  sourceTemplateName: template.name,
  sourceType: 'local-template',
  sourceKey: createLocalTemplateKey(template.id),
  sourceUpdatedAt: template.updatedAt,
})

export const createSystemTemplateSourceMeta = (
  sourceKey: string,
  sourceSignature: string,
): LocalTemplateSourceMeta => ({
  sourceKey,
  sourceSignature,
  sourceType: 'system',
})

export const createLocalTemplateKey = (templateId: string) => `${LOCAL_TEMPLATE_KEY_PREFIX}${templateId}`

export const isLocalTemplateKey = (key: string) => key.startsWith(LOCAL_TEMPLATE_KEY_PREFIX)

export const parseLocalTemplateIdFromKey = (key: string) => {
  if (!isLocalTemplateKey(key)) {
    return ''
  }

  return key.slice(LOCAL_TEMPLATE_KEY_PREFIX.length)
}

export const createLocalTemplateDragContent = (templateId: string) => {
  return JSON.stringify({
    kind: 'local-template',
    templateId,
  })
}

export const parseLocalTemplateDragContent = (content: string) => {
  if (!content) {
    return null
  }

  try {
    const parsed = JSON.parse(content) as { kind?: string; templateId?: string }
    if (parsed.kind !== 'local-template' || !parsed.templateId) {
      return null
    }

    return parsed.templateId
  } catch {
    return null
  }
}

export const buildWidgetTemplateSnapshot = (widget: Widget): LocalTemplateSnapshot => {
  const nextWidget = cloneSerializable(widget)
  nextWidget.config = stripWidgetTemplateMeta(nextWidget.config)
  nextWidget.layout = normalizeLayoutBase(nextWidget.layout, {
    x: 0,
    y: 0,
  })
  nextWidget.refreshCount = 0

  return {
    scope: 'widget',
    widget: nextWidget,
  }
}

export const buildGroupTemplateSnapshot = (
  group: WidgetGroup,
  widgets: Widget[],
): LocalTemplateSnapshot => {
  const normalizedGroup = cloneSerializable(group)
  const groupX = Number.isFinite(group.layout?.x) ? Number(group.layout.x) : 0
  const groupY = Number.isFinite(group.layout?.y) ? Number(group.layout.y) : 0

  normalizedGroup.config = stripGroupTemplateMeta(normalizedGroup.config)
  normalizedGroup.layout = normalizeLayoutBase(normalizedGroup.layout, {
    x: 0,
    y: 0,
  })

  const orderedWidgets = widgets.map((widget) => {
    const nextWidget = cloneSerializable(widget)
    nextWidget.config = stripWidgetTemplateMeta(nextWidget.config)
    nextWidget.layout = normalizeLayoutBase(nextWidget.layout, {
      x: (Number.isFinite(nextWidget.layout?.x) ? Number(nextWidget.layout.x) : 0) - groupX,
      y: (Number.isFinite(nextWidget.layout?.y) ? Number(nextWidget.layout.y) : 0) - groupY,
    })
    nextWidget.groupId = group.id
    nextWidget.refreshCount = 0
    return nextWidget
  })

  normalizedGroup.widgetIds = orderedWidgets.map((widget) => widget.id)

  return {
    scope: 'group',
    group: normalizedGroup,
    widgets: orderedWidgets,
  }
}

export const buildLocalTemplateSignature = (snapshot: LocalTemplateSnapshot) => {
  const normalized =
    snapshot.scope === 'widget'
      ? {
          scope: 'widget',
          widget: normalizeWidgetForSignature(snapshot.widget),
        }
      : {
          scope: 'group',
          group: normalizeGroupForSignature(snapshot.group, snapshot.widgets),
        }

  return JSON.stringify(sortObjectDeep(normalized))
}

export const getWidgetTemplateSourceMeta = (widget?: Widget | null) => {
  return (widget?.config as WidgetConfig & { localTemplateMeta?: LocalTemplateSourceMeta })?.localTemplateMeta
}

export const getGroupTemplateSourceMeta = (group?: WidgetGroup | null) => {
  return (group?.config as WidgetGroupConfig & { localTemplateMeta?: LocalTemplateSourceMeta })?.localTemplateMeta
}

export const applyLocalTemplateRecordToStore = (
  template: LocalTemplateRecord,
  store: StoreLike,
  position?: { x?: number; y?: number; groupId?: string },
) => {
  if (template.snapshot.scope === 'widget') {
    const sourceWidget = template.snapshot.widget
    const widgetSignature = buildLocalTemplateSignature(buildWidgetTemplateSnapshot(sourceWidget))
    const targetWidget = position && typeof position.x === 'number' && typeof position.y === 'number'
      ? store.addWidget(sourceWidget.type, {
          x: position.x,
          y: position.y,
          w: sourceWidget.layout?.w,
          h: sourceWidget.layout?.h,
          groupId: position.groupId,
        })
      : store.addWidget(sourceWidget.type)

    store.updateWidget(targetWidget.id, {
      title: sourceWidget.title,
      groupId: position?.groupId,
      config: {
        ...stripWidgetTemplateMeta(sourceWidget.config),
        localTemplateMeta: createWidgetSourceMeta(template, widgetSignature),
      },
      layout: normalizeLayoutBase(targetWidget.layout, {
        i: targetWidget.id,
        w: sourceWidget.layout?.w,
        h: sourceWidget.layout?.h,
        minW: sourceWidget.layout?.minW,
        minH: sourceWidget.layout?.minH,
      }),
    })

    return {
      widgetId: targetWidget.id,
      groupId: '',
    }
  }

  const sourceGroup = template.snapshot.group
  const sourceWidgets = template.snapshot.widgets
  const groupSignature = buildLocalTemplateSignature(
    buildGroupTemplateSnapshot(sourceGroup, sourceWidgets),
  )
  const rootPosition =
    typeof position?.x === 'number' && typeof position?.y === 'number'
      ? { x: position.x, y: position.y }
      : buildRootInsertPosition(store.widgets, store.groups)
  const targetGroup = store.createEmptyGroup(sourceGroup.title, rootPosition)
  const nextWidgetIds: string[] = []

  sourceWidgets.forEach((sourceWidget) => {
    const widgetSignature = buildLocalTemplateSignature(buildWidgetTemplateSnapshot(sourceWidget))
    const targetWidget = store.addWidget(sourceWidget.type, {
      x: rootPosition.x + (Number(sourceWidget.layout?.x) || 0),
      y: rootPosition.y + (Number(sourceWidget.layout?.y) || 0),
      w: sourceWidget.layout?.w,
      h: sourceWidget.layout?.h,
      groupId: targetGroup.id,
    })

    store.updateWidget(targetWidget.id, {
      title: sourceWidget.title,
      groupId: targetGroup.id,
      config: {
        ...stripWidgetTemplateMeta(sourceWidget.config),
        localTemplateMeta: createWidgetSourceMeta(template, widgetSignature),
      },
      layout: normalizeLayoutBase(targetWidget.layout, {
        i: targetWidget.id,
        x: rootPosition.x + (Number(sourceWidget.layout?.x) || 0),
        y: rootPosition.y + (Number(sourceWidget.layout?.y) || 0),
        w: sourceWidget.layout?.w,
        h: sourceWidget.layout?.h,
        minW: sourceWidget.layout?.minW,
        minH: sourceWidget.layout?.minH,
      }),
    })

    nextWidgetIds.push(targetWidget.id)
  })

  store.updateGroup(targetGroup.id, {
    title: sourceGroup.title,
    widgetIds: nextWidgetIds,
    layout: normalizeLayoutBase(targetGroup.layout, {
      i: targetGroup.id,
      x: rootPosition.x,
      y: rootPosition.y,
      w: sourceGroup.layout?.w,
      h: sourceGroup.layout?.h,
      minW: sourceGroup.layout?.minW,
      minH: sourceGroup.layout?.minH,
    }),
    config: {
      ...stripGroupTemplateMeta(sourceGroup.config),
      localTemplateMeta: createWidgetSourceMeta(template, groupSignature),
    } as WidgetGroupConfig,
  })

  return {
    widgetId: '',
    groupId: targetGroup.id,
  }
}
