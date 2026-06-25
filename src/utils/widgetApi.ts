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
  timeout?: number
  pagination?: WidgetPaginationConfig
  runtimeParams?: Record<string, any>
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

const resolveRuntimeTemplateValue = (value: any, runtimeParams?: Record<string, any>): any => {
  if (!runtimeParams || value == null) {
    return value
  }

  if (typeof value === 'string') {
    const exactMatch = value.match(/^\$\{runtime\.([^}]+)}$/)
    if (exactMatch) {
      return getValueByPath(runtimeParams, exactMatch[1])
    }

    return value.replace(/\$\{runtime\.([^}]+)}/g, (_match, path) => {
      const nextValue = getValueByPath(runtimeParams, path)
      return nextValue == null ? '' : String(nextValue)
    })
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveRuntimeTemplateValue(item, runtimeParams))
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, any>>((result, [key, item]) => {
      result[key] = resolveRuntimeTemplateValue(item, runtimeParams)
      return result
    }, {})
  }

  return value
}

const applyRuntimeParams = (
  value: Record<string, any> | string | undefined,
  runtimeParams?: Record<string, any>,
) => {
  const parsed = parseJsonConfig(value)
  const resolved = resolveRuntimeTemplateValue(parsed, runtimeParams)

  if (isPlainObject(resolved)) {
    return {
      ...resolved,
      ...(runtimeParams || {}),
    }
  }

  return runtimeParams && Object.keys(runtimeParams).length ? runtimeParams : resolved
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
    headers: resolveRuntimeTemplateValue(config.headers, config.runtimeParams),
    timeout: config.timeout,
    params: {
      ...(applyRuntimeParams(config.query, method === 'GET' ? config.runtimeParams : undefined) || {}),
      ...(method === 'GET' ? paginationPayload : {}),
    },
    data:
      method !== 'GET'
        ? mergeObjectPayload(applyRuntimeParams(config.body, config.runtimeParams), paginationPayload)
        : undefined,
  }
}

const translateApiError = (error: any): never => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const statusText = error.response?.statusText
    const baseUrl = error.config?.baseURL || ''
    const url = error.config?.url || ''

    if (error.message === 'Network Error' || error.message.includes('Network')) {
      throw new Error('网络连接失败，请检查接口地址是否正确或网络是否正常')
    }

    if (status) {
      const detail = statusText ? `（${statusText}）` : ''
      switch (status) {
        case 400:
          throw new Error(`请求参数错误${detail}，请检查接口地址、请求参数或请求方式是否正确`)
        case 401:
          throw new Error(`接口未授权${detail}，请检查是否需要登录或配置授权信息`)
        case 403:
          throw new Error(`接口无权限访问${detail}，请确认当前账号是否有权访问该接口`)
        case 404:
          throw new Error(`接口地址不存在${detail}，请检查接口地址是否正确`)
        case 405:
          throw new Error(`请求方式不被允许${detail}，请确认接口支持 ${error.config?.method || 'GET'} 请求方式`)
        case 422:
          throw new Error(`请求参数校验失败${detail}，请检查请求参数格式是否正确`)
        case 429:
          throw new Error(`请求过于频繁${detail}，请稍后再试`)
        case 500:
          throw new Error(`服务器内部错误${detail}，请联系后端开发人员`)
        case 502:
        case 503:
        case 504:
          throw new Error(`网关或服务端异常${detail}，请稍后再试或联系后端开发人员`)
        default:
          throw new Error(`请求失败（${status}）${detail}，${url ? `接口：${baseUrl}${url}` : '请检查接口配置'}`)
      }
    }

    throw new Error(`接口请求失败：${error.message}`)
  }

  throw new Error(error?.message || '接口调试失败')
}

export const requestWidgetApi = async (
  config: WidgetApiConfig,
  pageState?: WidgetApiPageState,
): Promise<WidgetApiRequestResult> => {
  const requestConfig = buildWidgetApiRequest(config, pageState)

  let response: any
  try {
    response = await axios(requestConfig)
  } catch (error) {
    translateApiError(error)
  }
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
