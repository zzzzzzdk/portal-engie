import ajax from '@/utils/axios.config'
import { getApiBaseUrl } from '@/config/env'
import { getToken } from '@/utils/cookie'
import type { DashboardSnapshot } from './dashboard'

export interface AgentChatReasoningStep {
  title: string
  content: string
}

export interface AgentChatNextAction {
  id: string
  label: string
  prompt: string
  mode: 'fill' | 'send'
  destructive?: boolean
}

export interface AgentChatSnapshotSummary {
  title: string
  widgetCount: number
  widgetTypes: string[]
  mode: 'create' | 'edit'
}

export interface AgentChatConversationSummary {
  id: string
  title: string
  status: string
  scene: string
  bizKey: string
  bizTitle: string
  summaryText: string
  upstreamSessionId: string
  lastMessageAt: string
  createdAt: string
  updatedAt: string
}

export interface AgentChatStoredMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  status: string
  sequence: number
  upstreamMessageId?: string | null
  errorMessage?: string | null
  model?: string
  snapshotRecovered?: boolean
  reasoning?: AgentChatReasoningStep[]
  summary?: AgentChatSnapshotSummary | null
  snapshot?: DashboardSnapshot | null
  nextActions?: AgentChatNextAction[]
  appliable?: boolean
  createdAt: string
}

export interface AgentChatMessagePayload {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentChatScenePayload {
  scene: string
  bizKey: string
  bizTitle?: string
}

export interface AgentChatStreamParams extends AgentChatScenePayload {
  prompt: string
  mode: 'create' | 'edit'
  currentSnapshot?: DashboardSnapshot | null
  messages?: AgentChatMessagePayload[]
  conversationId?: string
}

export interface AgentChatStreamResponse {
  conversationId: string
  model: string
  reply: string
  snapshotRecovered: boolean
  reasoning: AgentChatReasoningStep[]
  snapshot: DashboardSnapshot | null
  summary: AgentChatSnapshotSummary | null
  nextActions: AgentChatNextAction[]
  appliable: boolean
}

export type AgentChatStreamPhase =
  | 'context'
  | 'skill'
  | 'request'
  | 'validate'
  | 'finalize'

export interface AgentChatStreamStatusEvent {
  phase: AgentChatStreamPhase
  message: string
  conversationId?: string
}

export interface AgentChatConversationCreateParams extends AgentChatScenePayload {
  title?: string
}

export interface AgentChatStreamHandlers {
  onStatus?: (event: AgentChatStreamStatusEvent) => void
  onReplyDelta?: (delta: string) => void
  onThinkingDelta?: (delta: string) => void
  onReasoning?: (step: AgentChatReasoningStep) => void
  onMessage?: (result: AgentChatStreamResponse) => void
  onError?: (message: string) => void
  onDone?: () => void
}

export interface AgentChatStreamOptions {
  signal?: AbortSignal
}

export interface AbortAgentChatConversationOptions {
  keepalive?: boolean
}

const pickFirstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

const unwrapApiData = <T>(response: any) => response?.data as T

const resolveStreamErrorMessage = (payload: any) => {
  const message = pickFirstText(
    payload?.message,
    payload?.error?.message,
    payload?.details?.message,
    payload?.details?.error?.message,
    typeof payload?.details === 'string' ? payload.details : '',
  )

  if (!message) {
    return 'AI 生成失败，请稍后重试。'
  }

  const errorType = pickFirstText(
    payload?.type,
    payload?.error?.type,
    payload?.details?.type,
    payload?.details?.error?.type,
  )
  const errorCode = pickFirstText(
    payload?.code,
    payload?.error?.code,
    payload?.details?.code,
    payload?.details?.error?.code,
  )
  const prefix = [errorType, errorCode].filter(Boolean).join(' / ')

  if (!prefix || message.includes(prefix)) {
    return message
  }

  return `${prefix}: ${message}`
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

export const getAgentChatConversations = async (params: AgentChatScenePayload) => {
  const response = await ajax<AgentChatConversationSummary[]>({
    method: 'get',
    url: '/v1/agent-chat/conversations',
    data: params,
  })
  return unwrapApiData<AgentChatConversationSummary[]>(response) || []
}

export const createAgentChatConversation = async (
  data: AgentChatConversationCreateParams,
) => {
  const response = await ajax<AgentChatConversationSummary>({
    method: 'post',
    url: '/v1/agent-chat/conversations',
    data,
  })
  return unwrapApiData<AgentChatConversationSummary>(response)
}

export const getAgentChatMessages = async (conversationId: string) => {
  const response = await ajax<AgentChatStoredMessage[]>({
    method: 'get',
    url: `/v1/agent-chat/conversations/${conversationId}/messages`,
  })
  return unwrapApiData<AgentChatStoredMessage[]>(response) || []
}

export const deleteAgentChatConversation = async (conversationId: string) => {
  const response = await ajax<{ conversationId: string; deleted: boolean }>({
    method: 'post',
    url: `/v1/agent-chat/conversations/${conversationId}/delete`,
  })
  return unwrapApiData<{ conversationId: string; deleted: boolean }>(response)
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
    const errorPayload = await response.json().catch(() => null)
    throw new Error(errorPayload?.message || `Agent chat request failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Streaming response body is empty.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: AgentChatStreamResponse | null = null

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
      if (event === 'message') {
        result = {
          conversationId: String(payload?.conversationId || ''),
          model: String(payload?.model || ''),
          reply: String(payload?.reply || ''),
          snapshotRecovered: payload?.snapshotRecovered !== false,
          reasoning: Array.isArray(payload?.reasoning) ? payload.reasoning : [],
          snapshot: payload?.snapshot || null,
          summary: payload?.summary || null,
          nextActions: Array.isArray(payload?.nextActions) ? payload.nextActions : [],
          appliable: payload?.appliable === true,
        }
        handlers.onMessage?.(result)
        return
      }
      if (event === 'error') {
        const errorMessage = resolveStreamErrorMessage(payload)
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

export const abortAgentChatConversation = async (
  conversationId: string,
  options: AbortAgentChatConversationOptions = {},
) => {
  const response = await fetch(
    resolveApiUrl(`/v1/agent-chat/conversations/${conversationId}/abort`),
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Frontend-Route': window.location.hash.split('?')[0],
        ...(getToken() ? { Authorization: getToken() as string } : {}),
      },
      keepalive: options.keepalive,
    },
  )

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    throw new Error(
      errorPayload?.message || `Abort agent chat request failed: ${response.status}`,
    )
  }

  return response.json().catch(() => null)
}
