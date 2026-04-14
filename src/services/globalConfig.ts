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

export type GlobalAIModelProtocol = 'openai-responses' | 'openai-chat' | 'anthropic-messages'

export type GlobalAIModelProviderType =
  | 'openai'
  | 'anthropic'
  | 'qwen'
  | 'doubao'
  | 'custom'

export interface GlobalAIModelConfig {
  id: string
  name: string
  providerType: GlobalAIModelProviderType
  providerLabel: string
  protocol: GlobalAIModelProtocol
  enabled: boolean
  isDefault?: boolean
  recommended?: boolean
  readonly?: boolean
  description?: string
  baseUrl: string
  model: string
  apiKey?: string
  authStyle?: 'bearer' | 'x-api-key' | 'none'
  responsesPath?: string
  chatPath?: string
  messagesPath?: string
  anthropicVersion?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: string
  createdAt?: string
  updatedAt?: string
}

export interface GlobalConfigDetail {
  currentThemeId?: string
  themes: GlobalThemeScheme[]
  componentDataSource: GlobalComponentDataSourceConfig
  messageCopies: GlobalMessageCopyConfig
  aiModels: GlobalAIModelConfig[]
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

export const createGlobalAIModelConfig = (
  data: Pick<GlobalAIModelConfig, 'name' | 'providerLabel' | 'protocol'> &
    Partial<GlobalAIModelConfig>,
) => {
  return ajax<{ id: string }>({
    method: 'post',
    url: '/v1/global-config/ai-model/create',
    data,
  })
}

export const updateGlobalAIModelConfig = (data: GlobalAIModelConfig) => {
  return ajax<{ id: string }>({
    method: 'post',
    url: '/v1/global-config/ai-model/update',
    data,
  })
}

export const deleteGlobalAIModelConfig = (data: { id: string }) => {
  return ajax<{ success: boolean; defaultModelId?: string }>({
    method: 'post',
    url: '/v1/global-config/ai-model/delete',
    data,
  })
}

export const setDefaultGlobalAIModelConfig = (data: { id: string }) => {
  return ajax<{ id: string }>({
    method: 'post',
    url: '/v1/global-config/ai-model/set-default',
    data,
  })
}
