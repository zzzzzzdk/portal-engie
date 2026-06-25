import { v4 as uuidv4 } from 'uuid'
import eventBus from '@/utils/eventBus'
import type { Widget } from '@/types'
import type { WidgetEventMessage } from '@/types/widget-event'
import { recordWidgetEventLog } from '@/utils/widgetEventLogger'

export const WIDGET_EVENT_BUS_NAME = 'portal:widget-event'
export const WIDGET_EVENT_MAX_DEPTH = 8

let activeWidgetEventMessage: WidgetEventMessage | null = null

export const emitWidgetEvent = <TPayload extends Record<string, any>>(
  widget: Widget,
  name: string,
  payload: TPayload,
  options?: {
    targetWidgetId?: string | string[]
    trigger?: NonNullable<WidgetEventMessage['meta']>['trigger']
    meta?: Record<string, any>
  },
) => {
  const parentMessage = activeWidgetEventMessage
  const parentDepth = parentMessage?.meta?.depth || 0
  const message: WidgetEventMessage<TPayload> = {
    id: uuidv4(),
    name,
    sourceWidgetId: widget.id,
    sourceWidgetType: widget.type,
    targetWidgetId: options?.targetWidgetId,
    payload,
    meta: {
      version: 1,
      trigger: options?.trigger,
      sourceTitle: widget.config?.title || widget.title,
      traceId: parentMessage?.meta?.traceId || uuidv4(),
      parentId: parentMessage?.id,
      depth: parentDepth + 1,
      ...options?.meta,
    },
    timestamp: Date.now(),
  }

  if ((message.meta?.depth || 0) > WIDGET_EVENT_MAX_DEPTH) {
    recordWidgetEventLog('blocked', message, `事件链路超过最大深度 ${WIDGET_EVENT_MAX_DEPTH}`)
    return message
  }

  eventBus.emit(WIDGET_EVENT_BUS_NAME, message)
  recordWidgetEventLog('emitted', message)
  return message
}

export const onWidgetEvent = (callback: (message: WidgetEventMessage) => void) => {
  return eventBus.on<WidgetEventMessage>(WIDGET_EVENT_BUS_NAME, (message) => {
    const previousMessage = activeWidgetEventMessage
    activeWidgetEventMessage = message

    try {
      callback(message)
    } catch (error) {
      recordWidgetEventLog('error', message, error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      activeWidgetEventMessage = previousMessage
    }
  })
}
