import { useEffect, useMemo, useRef } from 'react'
import type { Widget } from '@/types'
import type { WidgetEventAction, WidgetEventInputConfig, WidgetEventMessage } from '@/types/widget-event'
import { applyWidgetEventMapping } from '@/utils/widgetEventMapping'
import { onWidgetEvent } from '@/utils/widgetEventBus'

export type WidgetEventActionHandlers = Partial<Record<WidgetEventAction, (params: Record<string, any>, message: WidgetEventMessage, input: WidgetEventInputConfig) => void>>

const shouldReceiveMessage = (widget: Widget, message: WidgetEventMessage) => {
  if (message.sourceWidgetId === widget.id) {
    return false
  }

  if (!message.targetWidgetId) {
    return true
  }

  if (Array.isArray(message.targetWidgetId)) {
    return message.targetWidgetId.includes(widget.id)
  }

  return message.targetWidgetId === widget.id
}

export const useWidgetEventInputs = (
  widget: Widget | undefined,
  handlers: WidgetEventActionHandlers,
) => {
  const handlersRef = useRef(handlers)
  const debounceTimersRef = useRef<Record<string, number>>({})
  handlersRef.current = handlers
  const eventInputs = useMemo(() => widget?.config?.eventInputs || [], [widget?.config?.eventInputs])

  useEffect(() => {
    if (!widget || eventInputs.length === 0) {
      return
    }

    const subscription = onWidgetEvent((message) => {
      if (!shouldReceiveMessage(widget, message)) {
        return
      }

      eventInputs
        .filter(input => input.enabled !== false)
        .filter(input => input.listenWidgetId === message.sourceWidgetId)
        .filter(input => input.listenEventName === message.name)
        .forEach(input => {
          const handler = handlersRef.current[input.action]
          if (!handler) {
            return
          }

          const params = applyWidgetEventMapping({ payload: message.payload, meta: message.meta, message }, input.paramMapping)
          const run = () => handler(params, message, input)

          if (input.debounce && input.debounce > 0) {
            if (debounceTimersRef.current[input.id]) {
              window.clearTimeout(debounceTimersRef.current[input.id])
            }
            debounceTimersRef.current[input.id] = window.setTimeout(run, input.debounce)
          } else {
            run()
          }
        })
    })

    return () => {
      subscription?.off()
      Object.values(debounceTimersRef.current).forEach(timer => window.clearTimeout(timer))
      debounceTimersRef.current = {}
    }
  }, [eventInputs, widget])
}
