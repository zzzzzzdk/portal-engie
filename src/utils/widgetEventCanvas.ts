import type { Widget, WidgetGroup } from '@/types'
import { getWidgetEventCapability } from '@/utils/widgetEventCapabilities'

export interface CanvasWidgetEventOption {
  id: string
  title: string
  type: string
  shortId: string
  outputEvents: string[]
  inputActions: string[]
  disabled?: boolean
  disabledReason?: string
}

export const buildCanvasWidgetEventOptions = (
  widgets: Widget[],
  groups: WidgetGroup[],
  floatingModules: Widget[],
  currentWidgetId?: string,
): CanvasWidgetEventOption[] => {
  const groupOptions = groups.map(group => ({
    id: group.id,
    title: group.title || '未命名分组',
    type: 'widgetGroup',
    shortId: group.id.slice(-6),
    outputEvents: [],
    inputActions: ['show', 'hide', 'expand', 'collapse'],
    disabled: group.id === currentWidgetId,
    disabledReason: group.id === currentWidgetId ? '当前配置对象' : undefined,
  }))

  const widgetOptions = widgets.map(widget => {
    const capability = getWidgetEventCapability(widget.type)
    return {
      id: widget.id,
      title: widget.config?.title || widget.title || '未命名组件',
      type: widget.type,
      shortId: widget.id.slice(-6),
      outputEvents: capability?.outputEvents || [],
      inputActions: capability?.inputActions || [],
      disabled: widget.id === currentWidgetId || !capability,
      disabledReason: widget.id === currentWidgetId
        ? '当前配置对象'
        : !capability
          ? '该组件暂未声明联动能力'
          : undefined,
    }
  })

  const getFloatingOutputEvents = (componentType?: string) => {
    switch (componentType) {
      case 'notification':
        return ['floating.open', 'floating.close', 'floating.expand', 'floating.collapse', 'notification.click', 'notification.read']
      case 'assistantHub':
        return ['floating.open', 'floating.close', 'floating.expand', 'floating.collapse', 'assistant.openEntry', 'assistant.select']
      case 'chat':
        return ['floating.open', 'floating.close', 'floating.expand', 'floating.collapse', 'chat.send', 'chat.receive']
      default:
        return ['floating.open', 'floating.close', 'floating.expand', 'floating.collapse']
    }
  }

  const floatingOptions = floatingModules
    .filter(module => module.config?.contentType === 'localComponent')
    .map(module => ({
      id: module.id,
      title: module.config?.title || module.title || '悬浮模块',
      type: `floating:${module.config?.localComponent?.componentType || 'localComponent'}`,
      shortId: module.id.slice(-6),
      outputEvents: getFloatingOutputEvents(module.config?.localComponent?.componentType),
      inputActions: ['open', 'close', 'expand', 'collapse'],
      disabled: module.id === currentWidgetId,
      disabledReason: module.id === currentWidgetId ? '当前配置对象' : undefined,
    }))

  return [...widgetOptions, ...groupOptions, ...floatingOptions]
}
