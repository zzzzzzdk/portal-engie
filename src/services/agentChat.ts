import { getApiBaseUrl } from '@/config/env'
import { getToken } from '@/utils/cookie'
import type { DashboardSnapshot } from './dashboard'

export type AgentChatMode = 'create' | 'edit'

export interface AgentChatMessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  status: string;
  sequence: number;
  upstreamMessageId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface AgentChatSnapshotSummary {
  title: string;
  widgetCount: number;
  widgetTypes: string[];
  mode: AgentChatMode;
}

export interface AgentChatStreamParams {
  prompt: string;
  mode: AgentChatMode;
  currentSnapshot?: DashboardSnapshot | null;
  conversationId?: string;
  title?: string;
}

export interface AgentChatStreamStatusEvent {
  phase: string;
  message: string;
  conversationId?: string;
  messageId?: string;
}

export interface AgentChatFinalPayload {
  conversationId: string;
  reply: string;
  message: AgentChatMessageRecord;
  snapshot?: DashboardSnapshot | null;
  summary?: AgentChatSnapshotSummary | null;
}

export interface AgentChatStreamHandlers {
  onStatus?: (event: AgentChatStreamStatusEvent) => void;
  onReplyDelta?: (delta: string) => void;
  onMessage?: (payload: AgentChatFinalPayload) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

export interface AgentChatStreamOptions {
  signal?: AbortSignal;
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

export const streamAgentChatMessage = async (
  data: AgentChatStreamParams,
  handlers: AgentChatStreamHandlers = {},
  options: AgentChatStreamOptions = {},
) => {
  const response = await fetch(resolveApiUrl('/v1/agent-chat/chat/stream'), {
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
    const errorPayload = await response.json().catch(async () => ({
      message: await response.text().catch(() => ''),
    }))
    throw new Error(errorPayload?.message || `Agent chat request failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Streaming response body is empty.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: AgentChatFinalPayload | null = null

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
      if (event === 'message') {
        result = payload
        handlers.onMessage?.(payload)
        return
      }
      if (event === 'error') {
        const errorMessage = String(payload?.message || 'Agent streaming request failed.')
        handlers.onError?.(errorMessage)
        throw new Error(errorMessage)
      }
      if (event === 'done') {
        handlers.onDone?.()
      }
    })
  }

  if (!result) {
    throw new Error('Streaming response ended without final message.')
  }

  return result
}
