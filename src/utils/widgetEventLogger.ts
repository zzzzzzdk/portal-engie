import type { WidgetEventLogEntry, WidgetEventMessage, WidgetEventLogStatus } from '@/types/widget-event'

const MAX_LOG_COUNT = 50

let logs: WidgetEventLogEntry[] = []
const listeners = new Set<(logs: WidgetEventLogEntry[]) => void>()

const notify = () => {
  const snapshot = [...logs]
  listeners.forEach(listener => listener(snapshot))
}

export const recordWidgetEventLog = (
  status: WidgetEventLogStatus,
  message: WidgetEventMessage,
  reason?: string,
) => {
  logs = [
    {
      id: `${message.id}-${status}-${Date.now()}`,
      status,
      message,
      reason,
      createdAt: Date.now(),
    },
    ...logs,
  ].slice(0, MAX_LOG_COUNT)
  notify()
}

export const getWidgetEventLogs = () => [...logs]

export const clearWidgetEventLogs = () => {
  logs = []
  notify()
}

export const onWidgetEventLogsChange = (listener: (logs: WidgetEventLogEntry[]) => void) => {
  listeners.add(listener)
  listener(getWidgetEventLogs())

  return {
    off: () => {
      listeners.delete(listener)
    },
  }
}
