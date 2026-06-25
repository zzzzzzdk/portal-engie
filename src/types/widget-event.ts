import type { WidgetType } from './index'

export type WidgetEventSourceType = WidgetType | 'widgetGroup' | 'floatingModule'

export type WidgetEventAction =
  | 'reload'
  | 'setParams'
  | 'setParamsAndReload'
  | 'clearParams'
  | 'setValue'
  | 'clearValue'
  | 'reset'
  | 'select'
  | 'clearSelection'
  | 'show'
  | 'hide'
  | 'open'
  | 'close'
  | 'expand'
  | 'collapse'
  | 'setTitle'
  | 'setTheme'
  | 'highlight'
  | 'clearHighlight'
  | 'goTo'
  | 'next'
  | 'prev'

export interface WidgetEventMessage<TPayload = Record<string, any>> {
  id: string
  name: string
  sourceWidgetId: string
  sourceWidgetType: WidgetEventSourceType
  targetWidgetId?: string | string[]
  payload: TPayload
  meta?: {
    trigger?: 'click' | 'change' | 'submit' | 'reset' | 'system'
    sourceTitle?: string
    targetTitle?: string
    traceId?: string
    parentId?: string
    depth?: number
    version?: 1
    [key: string]: any
  }
  timestamp: number
}

export type WidgetEventLogStatus = 'emitted' | 'blocked' | 'error'

export interface WidgetEventLogEntry {
  id: string
  status: WidgetEventLogStatus
  message: WidgetEventMessage
  reason?: string
  createdAt: number
}

export interface WidgetEventOutputConfig {
  id: string
  enabled: boolean
  eventName: string
  targetWidgetIds: string[]
  payloadMapping?: Record<string, string>
  debounce?: number
  description?: string
}

export interface WidgetEventInputConfig {
  id: string
  enabled: boolean
  listenWidgetId: string
  listenEventName: string
  action: WidgetEventAction
  paramMapping?: Record<string, string>
  mergeMode?: 'merge' | 'replace' | 'clearThenMerge'
  autoRun?: boolean
  debounce?: number
}

export interface WidgetVariableBindingConfig {
  id: string
  target: 'query' | 'body' | 'headers' | 'localState'
  key: string
  source: string
  defaultValue?: any
  transform?: 'string' | 'number' | 'boolean' | 'array' | 'dateRange'
}

export interface WidgetEventCapability {
  outputEvents: string[]
  inputActions: WidgetEventAction[]
  tags: Array<'emitsChange' | 'emitsSubmit' | 'emitsSelect' | 'requestable' | 'controllable' | 'floatingControllable' | 'formControllable'>
}
