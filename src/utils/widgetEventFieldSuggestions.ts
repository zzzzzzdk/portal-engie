import type { Widget } from '@/types'
import { isNativeFormContainerField } from '@/native-form/shared/field-factory'
import type { WidgetEventLogEntry, WidgetEventMessage } from '@/types/widget-event'
import { readWidgetEventPath } from '@/utils/widgetEventMapping'

export interface WidgetEventFieldSuggestion {
  label: string
  value: string
  group: string
  preview?: string
}

const stringifyPreview = (value: unknown) => {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const addSuggestion = (
  suggestions: WidgetEventFieldSuggestion[],
  item: WidgetEventFieldSuggestion,
) => {
  if (suggestions.some(suggestion => suggestion.value === item.value)) {
    return
  }
  suggestions.push(item)
}

const getConfiguredFieldName = (field: any) =>
  field?.field || field?.name || field?.key || field?.dataIndex || field?.id

const getConfiguredFieldLabel = (field: any, fallback: string) =>
  field?.label || field?.title || field?.name || field?.field || fallback

const addConfiguredValueFields = (
  suggestions: WidgetEventFieldSuggestion[],
  fields: any[] | undefined,
  group: string,
  pathPrefix = 'payload.values',
) => {
  ;(fields || []).forEach((field: any) => {
    const fieldName = getConfiguredFieldName(field)
    if (!fieldName) return
    addSuggestion(suggestions, {
      label: getConfiguredFieldLabel(field, fieldName),
      value: `${pathPrefix}.${fieldName}`,
      group,
    })
  })
}

const collectNativeFormFields = (nodes: any[] | undefined): any[] => {
  const result: any[] = []

  ;(nodes || []).forEach((node: any) => {
    if (node?.field) {
      result.push(node)
    }

    if (node?.type === 'grid' && Array.isArray(node.gridCells)) {
      node.gridCells.forEach((cell: any) => {
        if (cell.node) {
          result.push(...collectNativeFormFields([cell.node]))
        }
      })
      return
    }

    if (isNativeFormContainerField(node?.type) && Array.isArray(node.children)) {
      result.push(...collectNativeFormFields(node.children))
    }
  })

  return result
}

const addNativeFormValueFields = (
  suggestions: WidgetEventFieldSuggestion[],
  sourceWidget: Widget,
  eventName?: string,
) => {
  const fields = collectNativeFormFields((sourceWidget.config as any)?.formSchema?.children)
  const group = '原生表单字段'
  const shouldAddValues = !eventName || ['form.submit', 'form.change', 'form.reset'].includes(eventName)

  if (shouldAddValues) {
    addSuggestion(suggestions, { label: '全部表单值', value: 'payload.values', group })
    addConfiguredValueFields(suggestions, fields, group)
  }

  if (!eventName || eventName === 'form.change') {
    addSuggestion(suggestions, { label: '变化字段名', value: 'payload.changedField', group })
    addSuggestion(suggestions, { label: '变化字段值', value: 'payload.changedValue', group })
    addSuggestion(suggestions, { label: '变化字段集合', value: 'payload.changedValues', group })
  }

  if (!eventName || ['field.change', 'field.click'].includes(eventName)) {
    addSuggestion(suggestions, { label: '字段名', value: 'payload.field', group })
    addSuggestion(suggestions, { label: '字段值', value: 'payload.value', group })
    addSuggestion(suggestions, { label: '字段配置', value: 'payload.fieldConfig', group })
    addSuggestion(suggestions, { label: '字段标题', value: 'payload.fieldConfig.label', group })
  }
}

const addTableColumnFields = (
  suggestions: WidgetEventFieldSuggestion[],
  columns: any[] | undefined,
) => {
  ;(columns || []).forEach((column: any) => {
    const dataIndex = getConfiguredFieldName(column)
    if (!dataIndex) return
    addSuggestion(suggestions, {
      label: getConfiguredFieldLabel(column, dataIndex),
      value: `payload.row.${dataIndex}`,
      group: '表格行字段',
    })
  })
}

const getLatestMessage = (
  logs: WidgetEventLogEntry[],
  sourceWidgetId?: string,
  eventName?: string,
) => logs.find(log =>
  log.status === 'emitted' &&
  (!sourceWidgetId || log.message.sourceWidgetId === sourceWidgetId) &&
  (!eventName || log.message.name === eventName),
)?.message

const addConfiguredFieldSuggestions = (
  suggestions: WidgetEventFieldSuggestion[],
  sourceWidget?: Widget,
  eventName?: string,
  targetWidgetId?: string,
  useMappedOutput = true,
) => {
  if (!sourceWidget) return
  const config = sourceWidget.config || {}

  const mappedOutput = (config.eventOutputs || []).find((output: any) =>
    output?.enabled !== false &&
    output?.eventName === eventName &&
    output?.payloadMapping &&
    (!targetWidgetId || output?.targetWidgetIds?.includes?.(targetWidgetId)),
  )

  if (useMappedOutput && mappedOutput?.payloadMapping) {
    Object.keys(mappedOutput.payloadMapping).forEach(key => {
      addSuggestion(suggestions, {
        label: key,
        value: `payload.${key}`,
        group: '接收字段',
      })
    })
    return
  }

  const shouldSuggest = (...eventNames: string[]) => !eventName || eventNames.includes(eventName)

  if (shouldSuggest('data.loaded', 'data.error')) {
    addSuggestion(suggestions, { label: '数据', value: 'payload.data', group: '数据事件字段' })
    addSuggestion(suggestions, { label: '列表', value: 'payload.list', group: '数据事件字段' })
    addSuggestion(suggestions, { label: '总数', value: 'payload.total', group: '数据事件字段' })
    addSuggestion(suggestions, { label: '错误信息', value: 'payload.error', group: '数据事件字段' })
  }

  if (sourceWidget.type === 'queryFilter' && shouldSuggest('form.submit', 'form.change')) {
    addConfiguredValueFields(suggestions, config.queryFields, '查询筛选字段')
  }

  if (sourceWidget.type === 'customForm' && shouldSuggest('form.submit', 'form.change')) {
    addConfiguredValueFields(suggestions, config.fields, '表单字段')
  }

  if (sourceWidget.type === 'nativeForm') {
    addNativeFormValueFields(suggestions, sourceWidget, eventName)
  }

  if (sourceWidget.type === 'search' && shouldSuggest('search.submit', 'search.change')) {
    addSuggestion(suggestions, { label: '关键词', value: 'payload.keyword', group: '搜索字段' })
    addConfiguredValueFields(suggestions, config.searchFields, '搜索字段')
  }

  if (sourceWidget.type === 'dataTable' && shouldSuggest('table.rowClick')) {
    addSuggestion(suggestions, { label: '行数据', value: 'payload.row', group: '表格行数据' })
    addSuggestion(suggestions, { label: '行 Key', value: 'payload.rowKey', group: '表格行数据' })
    addSuggestion(suggestions, { label: '行索引', value: 'payload.index', group: '表格行数据' })
    addTableColumnFields(suggestions, config.columns)
  }

  if (sourceWidget.type === 'dataTable' && shouldSuggest('table.pageChange')) {
    addSuggestion(suggestions, { label: '当前页', value: 'payload.current', group: '分页字段' })
    addSuggestion(suggestions, { label: '每页条数', value: 'payload.pageSize', group: '分页字段' })
    addSuggestion(suggestions, { label: '总数', value: 'payload.total', group: '分页字段' })
  }

  if (shouldSuggest('chart.click', 'chart.barClick', 'chart.lineClick', 'chart.pieClick')) {
    addSuggestion(suggestions, { label: '图表项名称', value: 'payload.name', group: '图表字段' })
    addSuggestion(suggestions, { label: '图表项值', value: 'payload.value', group: '图表字段' })
    addSuggestion(suggestions, { label: '图表系列', value: 'payload.seriesName', group: '图表字段' })
    addSuggestion(suggestions, { label: '原始数据', value: 'payload.data', group: '图表字段' })
  }

  if (shouldSuggest('card.click', 'card.itemClick', 'stats.itemClick', 'ranking.itemClick', 'news.itemClick')) {
    addSuggestion(suggestions, { label: '条目数据', value: 'payload.item', group: '条目字段' })
    addSuggestion(suggestions, { label: '条目标题', value: 'payload.item.title', group: '条目字段' })
    addSuggestion(suggestions, { label: '条目名称', value: 'payload.item.name', group: '条目字段' })
    addSuggestion(suggestions, { label: '条目值', value: 'payload.item.value', group: '条目字段' })
    addSuggestion(suggestions, { label: '条目索引', value: 'payload.index', group: '条目字段' })
  }

  if (shouldSuggest('nav.click', 'nav.itemClick', 'link.click', 'page.change')) {
    addSuggestion(suggestions, { label: '导航项', value: 'payload.item', group: '导航字段' })
    addSuggestion(suggestions, { label: '标题', value: 'payload.title', group: '导航字段' })
    addSuggestion(suggestions, { label: '路径', value: 'payload.path', group: '导航字段' })
    addSuggestion(suggestions, { label: '链接', value: 'payload.url', group: '导航字段' })
    addSuggestion(suggestions, { label: '索引', value: 'payload.index', group: '导航字段' })
  }

  if (shouldSuggest('carousel.change', 'carousel.click')) {
    addSuggestion(suggestions, { label: '轮播项', value: 'payload.item', group: '轮播字段' })
    addSuggestion(suggestions, { label: '轮播标题', value: 'payload.item.title', group: '轮播字段' })
    addSuggestion(suggestions, { label: '当前索引', value: 'payload.index', group: '轮播字段' })
  }

  if (sourceWidget.type === 'nativeFormField') {
    addSuggestion(suggestions, { label: '字段值', value: 'payload.value', group: '原生字段' })
    addSuggestion(suggestions, { label: '字段名', value: 'payload.field', group: '原生字段' })
    addSuggestion(suggestions, { label: '字段配置', value: 'payload.fieldConfig', group: '原生字段' })
  }
}

export const buildWidgetEventFieldSuggestions = ({
  sourceWidget,
  eventName,
  logs,
  targetWidgetId,
  useMappedOutput = true,
}: {
  sourceWidget?: Widget
  eventName?: string
  logs?: WidgetEventLogEntry[]
  targetWidgetId?: string
  useMappedOutput?: boolean
}): WidgetEventFieldSuggestion[] => {
  const suggestions: WidgetEventFieldSuggestion[] = []
  const latestMessage = getLatestMessage(logs || [], sourceWidget?.id, eventName)

  addConfiguredFieldSuggestions(suggestions, sourceWidget, eventName, targetWidgetId, useMappedOutput)

  return suggestions.map(suggestion => ({
    ...suggestion,
    preview: suggestion.preview ?? (latestMessage ? stringifyPreview(readWidgetEventPath({
      payload: latestMessage.payload,
      meta: latestMessage.meta,
      message: latestMessage,
    }, suggestion.value)) : undefined),
  }))
}

export const getWidgetEventPathPreview = (
  message: WidgetEventMessage | undefined,
  path?: string,
) => {
  if (!message || !path) return undefined
  return stringifyPreview(readWidgetEventPath({ payload: message.payload, meta: message.meta, message }, path))
}

export const getLatestWidgetEventMessage = getLatestMessage
