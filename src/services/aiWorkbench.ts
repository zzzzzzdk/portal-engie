import ajax from '@/utils/axios.config'
import { getApiBaseUrl } from '@/config/env'
import { getToken } from '@/utils/cookie'
import type { DashboardSnapshot } from './dashboard'

export interface AIWorkbenchModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
  recommended?: boolean;
  isDefault?: boolean;
  configured?: boolean;
  configHint?: string;
}

export interface AIWorkbenchReasoningStep {
  title: string;
  content: string;
}

export interface AIWorkbenchSnapshotSummary {
  title: string;
  widgetCount: number;
  widgetTypes: string[];
  mode: 'create' | 'edit';
}

export interface AIWorkbenchMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIWorkbenchChatParams {
  model: string;
  prompt: string;
  mode: 'create' | 'edit';
  currentSnapshot?: DashboardSnapshot | null;
  messages?: AIWorkbenchMessagePayload[];
  conversationId?: string;
}

export interface AIWorkbenchChatResponse {
  conversationId: string;
  model: string;
  reply: string;
  reasoning: AIWorkbenchReasoningStep[];
  snapshot: DashboardSnapshot;
  summary: AIWorkbenchSnapshotSummary;
}

export type AIWorkbenchStreamPhase =
  | 'context'
  | 'skill'
  | 'request'
  | 'validate'
  | 'finalize'

export interface AIWorkbenchStreamStatusEvent {
  phase: AIWorkbenchStreamPhase;
  message: string;
}

export interface AIWorkbenchStreamHandlers {
  onStatus?: (event: AIWorkbenchStreamStatusEvent) => void;
  onReplyDelta?: (delta: string) => void;
  onThinkingDelta?: (delta: string) => void;
  onReasoning?: (step: AIWorkbenchReasoningStep) => void;
  onResult?: (result: AIWorkbenchChatResponse) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

export interface AIWorkbenchStreamOptions {
  signal?: AbortSignal;
}

export const getAIWorkbenchModels = () => {
  return ajax<AIWorkbenchModel[]>({
    method: 'get',
    url: '/v1/ai-workbench/models',
  })
}

export const sendAIWorkbenchMessage = (data: AIWorkbenchChatParams) => {
  return ajax<AIWorkbenchChatResponse>({
    method: 'post',
    url: '/v1/ai-workbench/chat',
    data,
  })
}

const resolveApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

const parseSseBlocks = (buffer: string) => {
  const events: Array<{ event: string; data: string }> = []
  let rest = buffer.replace(/\r\n/g, '\n')

  while (true) {
    const delimiterIndex = rest.indexOf('\n\n')
    if (delimiterIndex < 0) {
      break
    }

    const block = rest.slice(0, delimiterIndex)
    rest = rest.slice(delimiterIndex + 2)

    const lines = block.split(/\r?\n/)
    let event = 'message'
    const dataLines: string[] = []

    lines.forEach((line) => {
      if (!line || line.startsWith(':')) {
        return
      }
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
        return
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
    })

    if (dataLines.length) {
      events.push({
        event,
        data: dataLines.join('\n'),
      })
    }
  }

  return {
    events,
    rest,
  }
}

export const streamAIWorkbenchMessage = async (
  data: AIWorkbenchChatParams,
  handlers: AIWorkbenchStreamHandlers = {},
  options: AIWorkbenchStreamOptions = {},
) => {
  const response = await fetch(resolveApiUrl('/v1/ai-workbench/chat/stream'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Frontend-Route': window.location.hash.split('?')[0],
      ...(getToken() ? { Authorization: getToken() as string } : {}),
    },
    body: JSON.stringify(data),
    signal: options.signal,
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    throw new Error(errorPayload?.message || `AI workbench request failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Streaming response body is empty.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: AIWorkbenchChatResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const parsed = parseSseBlocks(buffer)
    buffer = parsed.rest

    parsed.events.forEach(({ event, data: rawData }) => {
      const payload = rawData ? JSON.parse(rawData) : {}

      if (event === 'status') {
        handlers.onStatus?.(payload)
        return
      }
      if (event === 'reply_delta') {
        handlers.onReplyDelta?.(String(payload?.delta || ''))
        return
      }
      if (event === 'thinking_delta') {
        handlers.onThinkingDelta?.(String(payload?.delta || ''))
        return
      }
      if (event === 'reasoning') {
        handlers.onReasoning?.(payload?.step)
        return
      }
      if (event === 'result') {
        result = payload
        handlers.onResult?.(payload)
        return
      }
      if (event === 'error') {
        const errorMessage = String(payload?.message || 'AI streaming request failed.')
        handlers.onError?.(errorMessage)
        throw new Error(errorMessage)
      }
      if (event === 'done') {
        handlers.onDone?.()
      }
    })
  }

  if (!result) {
    throw new Error('Streaming response ended without final result.')
  }

  return result
}
