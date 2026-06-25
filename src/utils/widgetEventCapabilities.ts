import type { WidgetType } from '@/types'
import type { WidgetEventAction, WidgetEventCapability } from '@/types/widget-event'

const requestActions: WidgetEventAction[] = ['reload', 'setParams', 'setParamsAndReload', 'clearParams']
const formActions: WidgetEventAction[] = ['setValue', 'clearValue', 'reset']
const selectActions: WidgetEventAction[] = ['select', 'clearSelection']

export const WIDGET_EVENT_CAPABILITIES: Partial<Record<WidgetType, WidgetEventCapability>> = {
  search: {
    outputEvents: ['search.submit', 'search.change'],
    inputActions: ['setValue', 'clearValue'],
    tags: ['emitsChange', 'emitsSubmit', 'formControllable'],
  },
  queryFilter: {
    outputEvents: ['form.change', 'form.submit', 'form.reset'],
    inputActions: formActions,
    tags: ['emitsChange', 'emitsSubmit', 'formControllable'],
  },
  dataTable: {
    outputEvents: ['data.loaded', 'data.error', 'table.rowClick', 'table.selectionChange', 'table.pageChange'],
    inputActions: requestActions,
    tags: ['emitsSelect', 'requestable', 'controllable'],
  },
  chart: {
    outputEvents: ['chart.click', 'chart.axisClick', 'chart.sliceClick', 'chart.regionClick', 'chart.dataLoaded', 'chart.dataError'],
    inputActions: requestActions,
    tags: ['emitsSelect', 'requestable', 'controllable'],
  },
  indicatorCard: {
    outputEvents: ['card.click', 'data.loaded', 'data.error'],
    inputActions: requestActions,
    tags: ['requestable', 'controllable'],
  },
  indicatorCardList: {
    outputEvents: ['card.itemClick', 'data.loaded', 'data.error'],
    inputActions: requestActions,
    tags: ['emitsSelect', 'requestable', 'controllable'],
  },
  stats: {
    outputEvents: ['stats.itemClick', 'data.loaded', 'data.error'],
    inputActions: requestActions,
    tags: ['emitsSelect', 'requestable', 'controllable'],
  },
  news: {
    outputEvents: ['news.itemClick', 'data.loaded', 'data.error'],
    inputActions: requestActions,
    tags: ['emitsSelect', 'requestable', 'controllable'],
  },
  topList: {
    outputEvents: ['ranking.itemClick', 'data.loaded', 'data.error'],
    inputActions: requestActions,
    tags: ['emitsSelect', 'requestable', 'controllable'],
  },
  navGroup: {
    outputEvents: ['nav.itemClick', 'data.loaded', 'data.error'],
    inputActions: requestActions,
    tags: ['emitsSelect', 'requestable', 'controllable'],
  },
  iconNav: {
    outputEvents: ['nav.click'],
    inputActions: [],
    tags: ['emitsSelect', 'controllable'],
  },
  headerBar: {
    outputEvents: ['nav.click'],
    inputActions: requestActions,
    tags: ['emitsSelect', 'controllable'],
  },
  pageNavigator: {
    outputEvents: ['page.change'],
    inputActions: [],
    tags: ['emitsSelect', 'controllable'],
  },
  carousel: {
    outputEvents: ['carousel.change', 'carousel.click', 'data.loaded', 'data.error'],
    inputActions: [...requestActions, 'select', 'goTo', 'next', 'prev'],
    tags: ['emitsSelect', 'requestable', 'controllable'],
  },
  customForm: {
    outputEvents: ['form.change', 'form.submit'],
    inputActions: formActions,
    tags: ['emitsChange', 'emitsSubmit', 'formControllable'],
  },
  nativeForm: {
    outputEvents: ['form.change', 'form.submit', 'form.reset', 'field.change', 'field.click'],
    inputActions: [...formActions, ...requestActions],
    tags: ['emitsChange', 'emitsSubmit', 'formControllable'],
  },
  nativeFormField: {
    outputEvents: ['field.change', 'field.click'],
    inputActions: ['setValue', 'clearValue'],
    tags: ['emitsChange', 'formControllable'],
  },
}

export const getWidgetEventCapability = (type?: WidgetType) => {
  if (!type) return undefined
  return WIDGET_EVENT_CAPABILITIES[type]
}

const EVENT_RECOMMENDED_ACTIONS: Record<string, WidgetEventAction[]> = {
  'search.submit': ['setParamsAndReload', 'setValue'],
  'search.change': ['setParams', 'setValue'],
  'form.submit': ['setParamsAndReload', 'setValue'],
  'form.change': ['setParams', 'setValue'],
  'form.reset': ['clearParams', 'clearValue', 'reset'],
  'table.rowClick': ['setParamsAndReload', 'select', 'setValue'],
  'table.selectionChange': ['setParamsAndReload', 'select'],
  'table.pageChange': ['setParamsAndReload'],
  'chart.click': ['setParamsAndReload', 'select'],
  'chart.axisClick': ['setParamsAndReload', 'select'],
  'chart.sliceClick': ['setParamsAndReload', 'select'],
  'chart.regionClick': ['setParamsAndReload', 'select'],
  'card.click': ['setParamsAndReload', 'select'],
  'card.itemClick': ['setParamsAndReload', 'select'],
  'nav.click': ['setParamsAndReload', 'select'],
  'nav.itemClick': ['setParamsAndReload', 'select'],
  'ranking.itemClick': ['setParamsAndReload', 'select'],
  'news.itemClick': ['setParamsAndReload', 'select'],
  'carousel.change': ['setParamsAndReload', 'select'],
  'carousel.click': ['setParamsAndReload', 'select'],
  'notification.click': ['setParamsAndReload', 'open', 'select'],
  'notification.read': ['setParamsAndReload'],
  'assistant.openEntry': ['setParamsAndReload', 'open'],
  'assistant.select': ['setParamsAndReload', 'open', 'select'],
  'chat.send': ['setParamsAndReload', 'open'],
  'chat.receive': ['setParamsAndReload', 'open'],
}

export const getRecommendedActionsForEvent = (eventName?: string): WidgetEventAction[] => {
  if (!eventName) return []
  return EVENT_RECOMMENDED_ACTIONS[eventName] || []
}
