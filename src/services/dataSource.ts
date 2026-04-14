import ajax from '@/utils/axios.config'
import type { WidgetApiKeyValueItem, WidgetPaginationConfig } from '@/utils/widgetApi'

export type DataSourceMethod = 'GET' | 'POST'

export interface DataSourceRequestConfig {
  headersList?: WidgetApiKeyValueItem[]
  queryList?: WidgetApiKeyValueItem[]
  bodyList?: WidgetApiKeyValueItem[]
  pagination?: WidgetPaginationConfig
}

export interface DataSourceItem {
  id: string
  name: string
  method: DataSourceMethod
  url: string
  description?: string
  listField?: string
  timeout: number
  requestConfig?: DataSourceRequestConfig
  createdAt?: string
  updatedAt?: string
}

export interface DataSourceListParams {
  page: number
  page_size: number
  keyword?: string
}

export interface DataSourceListResponse {
  list: DataSourceItem[]
  total: number
  page: number
  page_size: number
}

export interface DataSourceDetailParams {
  id: string
}

export interface DataSourceSaveParams {
  id?: string
  name: string
  method: DataSourceMethod
  url: string
  description?: string
  listField?: string
  timeout: number
  requestConfig?: DataSourceRequestConfig
}

export const getDataSourceList = (params: DataSourceListParams) => {
  return ajax<DataSourceListResponse>({
    method: 'get',
    url: '/v1/data-sources/list',
    params,
  })
}

export const getDataSourceDetail = (params: DataSourceDetailParams) => {
  return ajax<DataSourceItem>({
    method: 'get',
    url: '/v1/data-sources/detail',
    params,
  })
}

export const createDataSource = (data: DataSourceSaveParams) => {
  return ajax<{ id: string }>({
    method: 'post',
    url: '/v1/data-sources/create',
    data,
  })
}

export const updateDataSource = (data: DataSourceSaveParams) => {
  return ajax<{ id: string }>({
    method: 'post',
    url: '/v1/data-sources/update',
    data,
  })
}

export const deleteDataSource = (data: { id: string }) => {
  return ajax<{ success: boolean }>({
    method: 'post',
    url: '/v1/data-sources/delete',
    data,
  })
}
