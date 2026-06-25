import type { WidgetType } from '@/types'

export interface WidgetApiFieldMeta {
  name: 'apiDataField' | 'apiListField'
  label: string
  defaultValue: string
  placeholder: string
  tooltip: string
}

const WIDGET_API_ENDPOINT_PLACEHOLDERS: Partial<Record<WidgetType, string>> = {
  chart: '/api/chart-data',
  stats: '/api/stats',
  indicatorCard: '/api/indicator-card',
  indicatorCardList: '/api/indicator-card-list',
  recognitionCard: '/api/recognition-card',
  queryFilter: '/api/query-filter',
  dataTable: '/api/table-data',
  news: '/api/news',
  topList: '/api/top-list',
  navGroup: '/api/nav-group',
  carousel: '/api/carousel',
}

const WIDGET_API_FIELD_META_MAP: Partial<Record<WidgetType, WidgetApiFieldMeta>> = {
  chart: {
    name: 'apiDataField',
    label: '数据字段路径',
    defaultValue: 'result.chart',
    placeholder: 'result.chart',
    tooltip: '默认按 result.chart 取值；修改后按填写路径取值。',
  },
  stats: {
    name: 'apiDataField',
    label: '数据字段路径',
    defaultValue: 'payload.metrics',
    placeholder: 'payload.metrics',
    tooltip: '默认按 payload.metrics 取值；修改后按填写路径取值。',
  },
  indicatorCard: {
    name: 'apiDataField',
    label: '数据字段路径',
    defaultValue: 'payload.metric',
    placeholder: 'payload.metric',
    tooltip: '默认按 payload.metric 取值；修改后按填写路径取值。',
  },
  indicatorCardList: {
    name: 'apiListField',
    label: '列表字段路径',
    defaultValue: 'payload.metrics',
    placeholder: 'payload.metrics',
    tooltip: '默认按 payload.metrics 取值；修改后按填写路径取值。',
  },
  recognitionCard: {
    name: 'apiDataField',
    label: '数据字段路径',
    defaultValue: 'payload.record',
    placeholder: 'payload.record',
    tooltip: '默认按 payload.record 取值；修改后按填写路径取值。',
  },
  dataTable: {
    name: 'apiListField',
    label: '列表字段路径',
    defaultValue: 'data.list',
    placeholder: 'data.list',
    tooltip: '默认按 data.list 取值；修改后按填写路径取值。',
  },
  news: {
    name: 'apiListField',
    label: '列表字段路径',
    defaultValue: 'data.records',
    placeholder: 'data.records',
    tooltip: '默认按 data.records 取值；修改后按填写路径取值。',
  },
  topList: {
    name: 'apiListField',
    label: '列表字段路径',
    defaultValue: 'data.rows',
    placeholder: 'data.rows',
    tooltip: '默认按 data.rows 取值；修改后按填写路径取值。',
  },
  navGroup: {
    name: 'apiListField',
    label: '列表字段路径',
    defaultValue: 'payload.groups.list',
    placeholder: 'payload.groups.list',
    tooltip: '默认按 payload.groups.list 取值；修改后按填写路径取值。',
  },
}

export const DEFAULT_NAV_GROUP_LIST_FIELD = 'payload.groups.list'
export const DEFAULT_CAROUSEL_LIST_FIELD = 'data.carousel.items'

export const getWidgetApiEndpointPlaceholder = (widgetType: WidgetType) =>
  WIDGET_API_ENDPOINT_PLACEHOLDERS[widgetType] || '/api/data'

export const getWidgetApiFieldMeta = (widgetType: WidgetType) =>
  WIDGET_API_FIELD_META_MAP[widgetType]

export const getWidgetDefaultFieldValue = (widgetType: WidgetType) =>
  WIDGET_API_FIELD_META_MAP[widgetType]?.defaultValue

export const getWidgetPaginationDefaults = (widgetType: WidgetType) => {
  switch (widgetType) {
    case 'topList':
      return {
        pageParam: 'page',
        pageSizeParam: 'page_size',
        totalField: 'data.total',
        currentField: 'data.current',
        pageSizeField: 'data.pageSize',
      }
    case 'dataTable':
    case 'news':
      return {
        pageParam: 'page',
        pageSizeParam: 'page_size',
        totalField: 'data.total',
        currentField: 'data.page',
        pageSizeField: 'data.page_size',
      }
    default:
      return undefined
  }
}
