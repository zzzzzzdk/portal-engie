import ajax from '@/utils/axios.config'

export type BackgroundType = 'color' | 'image' | 'gradient'

export interface GlobalBackgroundConfig {
  backgroundType?: BackgroundType
  backgroundColor?: string
  backgroundImage?: string
  backgroundGradient?: string
  backgroundSize?: string
  backgroundRepeat?: string
  backgroundPosition?: string
  backdropBlur?: number
  boxShadow?: string
}

export interface GlobalWidgetTitleConfig {
  showTitle?: boolean
  titleColor?: string
  titleFontSize?: number
  titleFontWeight?: number | string
}

export interface GlobalThemeScheme {
  id: string
  name: string
  pageBackground?: GlobalBackgroundConfig
  widgetBackground?: GlobalBackgroundConfig
  widgetTitle?: GlobalWidgetTitleConfig
  createdAt?: string
  updatedAt?: string
}

export interface GlobalComponentDataSourceConfig {
  businessApiUrl: string
  documentStorageUrl: string
}

export interface GlobalMessageCopyConfig {
  'form.success': string
  'form.error': string
}

export interface GlobalOpenCodeConfig {
  serviceUrl: string
}

export interface GlobalConfigDetail {
  currentThemeId?: string
  themes: GlobalThemeScheme[]
  componentDataSource: GlobalComponentDataSourceConfig
  messageCopies: GlobalMessageCopyConfig
  opencode: GlobalOpenCodeConfig
}

export interface ThemeSaveParams {
  id?: string
  name: string
  pageBackground?: GlobalBackgroundConfig
  widgetBackground?: GlobalBackgroundConfig
  widgetTitle?: GlobalWidgetTitleConfig
}

export const getGlobalConfigDetail = () => {
  return ajax<GlobalConfigDetail>({
    method: 'get',
    url: '/v1/global-config/detail',
  })
}

export const createThemeScheme = (data: Pick<ThemeSaveParams, 'name'>) => {
  return ajax<{ id: string }>({
    method: 'post',
    url: '/v1/global-config/theme/create',
    data,
  })
}

export const updateThemeScheme = (data: ThemeSaveParams) => {
  return ajax<{ id: string }>({
    method: 'post',
    url: '/v1/global-config/theme/update',
    data,
  })
}

export const deleteThemeScheme = (data: { id: string }) => {
  return ajax<{ success: boolean; currentThemeId?: string }>({
    method: 'post',
    url: '/v1/global-config/theme/delete',
    data,
  })
}

export const saveComponentDataSourceConfig = (data: GlobalComponentDataSourceConfig) => {
  return ajax<GlobalComponentDataSourceConfig>({
    method: 'post',
    url: '/v1/global-config/component-data-source/save',
    data,
  })
}

export const saveMessageCopyConfig = (data: GlobalMessageCopyConfig) => {
  return ajax<GlobalMessageCopyConfig>({
    method: 'post',
    url: '/v1/global-config/message-copy/save',
    data,
  })
}

export const saveOpenCodeConfig = (data: GlobalOpenCodeConfig) => {
  return ajax<GlobalOpenCodeConfig>({
    method: 'post',
    url: '/v1/global-config/opencode/save',
    data,
  })
}
