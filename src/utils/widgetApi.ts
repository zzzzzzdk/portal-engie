import axios from 'axios'

export type WidgetApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH'
export type WidgetPaginationMode = 'none' | 'pagination'

export interface WidgetPaginationConfig {
  mode?: WidgetPaginationMode
  page?: number
  pageSize?: number
  pageParam?: string
  pageSizeParam?: string
  totalField?: string
  currentField?: string
  pageSizeField?: string
  showTotal?: boolean
}

export interface WidgetApiConfig {
  endpoint?: string
  method?: WidgetApiMethod
  headers?: Record<string, string>
  query?: Record<string, any> | string
  body?: Record<string, any> | string
  dataField?: string
  listField?: string
  pagination?: WidgetPaginationConfig
}

export interface WidgetApiRequestResult {
  raw: any
  data: any
  list: any[]
  resolvedPaths: {
    data?: string
    list?: string
    total?: string
    current?: string
    pageSize?: string
  }
  pagination: {
    total?: number
    current?: number
    pageSize?: number
    detected: boolean
    serverSide: boolean
  }
}

export interface WidgetApiPageState {
  current: number
  pageSize: number
}

export interface WidgetApiKeyValueItem {
  key?: string
  value?: string
}

const isPlainObject = (value: unknown): value is Record<string, any> =>
  Object.prototype.toString.call(value) === '[object Object]'

export const getValueByPath = (target: any, path?: string) => {
  if (!path) {
    return undefined
  }

  return path
    .split('.')
    .filter(Boolean)
    .reduce((current, key) => (current == null ? undefined : current[key]), target)
}

export const parseJsonConfig = (value?: Record<string, any> | string) => {
  if (value == null || value === '') {
    return undefined
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return undefined
    }
  }

  return value
}

const parseKeyValueItem = (value?: string) => {
  if (value == null) {
    return ''
  }

  const text = String(value).trim()
  if (!text) {
    return ''
  }

  try {
    return JSON.parse(text)
  } catch {
    return value
  }
}

export const objectToKeyValueList = (
  value?: Record<string, any> | string,
): WidgetApiKeyValueItem[] => {
  const parsed = parseJsonConfig(value)

  if (!isPlainObject(parsed)) {
    return []
  }

  return Object.entries(parsed).map(([key, itemValue]) => ({
    key,
    value:
      typeof itemValue === 'string'
        ? itemValue
        : itemValue == null
          ? ''
          : JSON.stringify(itemValue),
  }))
}

export const keyValueListToObject = (
  list?: WidgetApiKeyValueItem[],
): Record<string, any> | undefined => {
  if (!Array.isArray(list)) {
    return undefined
  }

  const result = list.reduce<Record<string, any>>((acc, item) => {
    const key = item?.key?.trim()
    if (!key) {
      return acc
    }

    acc[key] = parseKeyValueItem(item.value)
    return acc
  }, {})

  return Object.keys(result).length ? result : undefined
}

export const keyValueListToJsonString = (list?: WidgetApiKeyValueItem[]) => {
  const result = keyValueListToObject(list)
  return result ? JSON.stringify(result, null, 2) : undefined
}

const mergeObjectPayload = (
  baseValue: Record<string, any> | string | undefined,
  extraValue: Record<string, any>,
) => {
  const parsedBase = parseJsonConfig(baseValue)
  if (!Object.keys(extraValue).length) {
    return parsedBase
  }
  if (isPlainObject(parsedBase)) {
    return {
      ...parsedBase,
      ...extraValue,
    }
  }
  return extraValue
}

export const resolveDataRoot = (rawData: any, dataField?: string) => {
  if (dataField) {
    return getValueByPath(rawData, dataField)
  }

  return rawData
}

export const resolveListData = (rawData: any, listField?: string) => {
  if (listField) {
    const explicitValue = getValueByPath(rawData, listField)
    return Array.isArray(explicitValue) ? explicitValue : []
  }

  if (Array.isArray(rawData)) {
    return rawData
  }

  return []
}

export const buildWidgetApiRequest = (
  config: WidgetApiConfig,
  pageState?: WidgetApiPageState,
) => {
  const method = (config.method || 'GET').toUpperCase() as WidgetApiMethod
  const paginationMode = config.pagination?.mode || 'none'
  const pageParam = config.pagination?.pageParam || 'page'
  const pageSizeParam = config.pagination?.pageSizeParam || 'page_size'
  const paginationPayload =
    paginationMode === 'pagination' && pageState
      ? {
          [pageParam]: pageState.current,
          [pageSizeParam]: pageState.pageSize,
        }
      : {}

  return {
    url: config.endpoint?.trim() || '',
    method,
    headers: config.headers,
    params: {
      ...(parseJsonConfig(config.query) || {}),
      ...(method === 'GET' ? paginationPayload : {}),
    },
    data:
      method === 'POST'
        ? mergeObjectPayload(config.body, paginationPayload)
        : undefined,
  }
}

export const requestWidgetApi = async (
  config: WidgetApiConfig,
  pageState?: WidgetApiPageState,
): Promise<WidgetApiRequestResult> => {
  const requestConfig = buildWidgetApiRequest(config, pageState)
  const response = await axios(requestConfig)
  const raw = response.data
  const data = config.dataField ? getValueByPath(raw, config.dataField) : raw
  const explicitList = config.listField ? getValueByPath(raw, config.listField) : undefined
  const list = config.listField ? (Array.isArray(explicitList) ? explicitList : []) : Array.isArray(raw) ? raw : []

  const totalMatch = config.pagination?.totalField
    ? getValueByPath(raw, config.pagination.totalField)
    : undefined
  const currentMatch = config.pagination?.currentField
    ? getValueByPath(raw, config.pagination.currentField)
    : undefined
  const pageSizeMatch = config.pagination?.pageSizeField
    ? getValueByPath(raw, config.pagination.pageSizeField)
    : undefined

  const total = Number(totalMatch) || undefined
  const current = Number(currentMatch) || undefined
  const pageSize = Number(pageSizeMatch) || undefined

  const detected = Boolean(total || current || pageSize)
  const serverSide = detected && typeof total === 'number' && total > list.length

  return {
    raw,
    data,
    list,
    resolvedPaths: {
      data: config.dataField || 'raw',
      list: config.listField || (Array.isArray(raw) ? 'raw' : undefined),
      total: config.pagination?.totalField,
      current: config.pagination?.currentField,
      pageSize: config.pagination?.pageSizeField,
    },
    pagination: {
      total,
      current,
      pageSize,
      detected,
      serverSide,
    },
  }
}
