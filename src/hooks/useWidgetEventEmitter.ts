import { useCallback, useRef } from 'react'
import type { Widget } from '@/types'
import { emitWidgetEvent } from '@/utils/widgetEventBus'
import { applyWidgetEventMapping } from '@/utils/widgetEventMapping'

export const useWidgetEventEmitter = (widget?: Widget) => {
  const debounceTimersRef = useRef<Record<string, number>>({})

  return useCallback((eventName: string, payload: Record<string, any>, trigger?: 'click' | 'change' | 'submit' | 'reset' | 'system') => {
    if (!widget) {
      return undefined
    }

    const matchingOutputs = (widget.config?.eventOutputs || [])
      .filter(output => output.eventName === eventName)
    const configuredOutputs = matchingOutputs
      .filter(output => output.enabled !== false)

    if (configuredOutputs.length === 0) {
      if (matchingOutputs.length > 0) {
        return undefined
      }
      return emitWidgetEvent(widget, eventName, payload, { trigger })
    }

    let latestMessage: ReturnType<typeof emitWidgetEvent> | undefined

    configuredOutputs.forEach(output => {
      const nextPayload = output.payloadMapping
        ? applyWidgetEventMapping({ payload, meta: { trigger }, widget }, output.payloadMapping)
        : payload
      const emit = () => {
        latestMessage = emitWidgetEvent(widget, eventName, nextPayload, {
          trigger,
          targetWidgetId: output.targetWidgetIds,
          meta: {
            outputId: output.id,
            originalPayload: output.payloadMapping ? payload : undefined,
          },
        })
      }

      if (output.debounce && output.debounce > 0) {
        if (debounceTimersRef.current[output.id]) {
          window.clearTimeout(debounceTimersRef.current[output.id])
        }
        debounceTimersRef.current[output.id] = window.setTimeout(emit, output.debounce)
        return
      }

      emit()
    })

    return latestMessage
  }, [widget])
}
