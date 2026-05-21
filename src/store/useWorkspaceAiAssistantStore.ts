import { create } from 'zustand'
import type {
  AgentChatReasoningStep,
  AgentChatStreamResponse,
  AgentChatStreamStatusEvent,
} from '@/services/agent-chat'

export const WORKSPACE_AI_ASSISTANT_NAME = '工作台 AI 助手'
export const WORKSPACE_AI_ASSISTANT_HINT = '已固定接入 OpenCode 服务'

export type AssistantMessageStatus = 'loading' | 'done' | 'error'

export interface AssistantChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  displayContent?: string
  status?: AssistantMessageStatus
  model?: string
  thinkingText?: string
  reasoning?: AgentChatReasoningStep[]
  streamLogs?: AgentChatStreamStatusEvent[]
  summary?: AgentChatStreamResponse['summary']
}

type MessageUpdater =
  | AssistantChatMessage[]
  | ((prev: AssistantChatMessage[]) => AssistantChatMessage[])

const createMessageId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

export const createAssistantMessageId = createMessageId

export const createInitialAssistantMessage = (): AssistantChatMessage => ({
  id: createMessageId('assistant'),
  role: 'assistant',
  status: 'done',
  model: WORKSPACE_AI_ASSISTANT_NAME,
  content:
    '你可以继续编辑当前工作台，也可以从头生成新页面。',
})

interface WorkspaceAiAssistantState {
  messages: AssistantChatMessage[]
  inputValue: string
  sending: boolean
  conversationId?: string
  abortController: AbortController | null
  minimized: boolean
  floatingVisible: boolean
  requestState: 'idle' | 'running' | 'done' | 'error'
  lastStatusText: string
  setMessages: (updater: MessageUpdater) => void
  appendMessages: (messages: AssistantChatMessage[]) => void
  replaceMessage: (messageId: string, nextMessage: AssistantChatMessage) => void
  patchMessage: (
    messageId: string,
    updater: (message: AssistantChatMessage) => AssistantChatMessage,
  ) => void
  setInputValue: (value: string) => void
  setSending: (sending: boolean) => void
  setConversationId: (conversationId?: string) => void
  setAbortController: (controller: AbortController | null) => void
  setLastStatusText: (text: string) => void
  markRequestRunning: (text?: string) => void
  markRequestDone: (text?: string) => void
  markRequestError: (text?: string) => void
  minimizePanel: () => void
  expandPanel: () => void
  hideFloatingCard: () => void
  resetSession: () => void
}

const getInitialState = () => ({
  messages: [createInitialAssistantMessage()],
  inputValue: '',
  sending: false,
  conversationId: undefined as string | undefined,
  abortController: null as AbortController | null,
  minimized: false,
  floatingVisible: false,
  requestState: 'idle' as const,
  lastStatusText: '',
})

export const useWorkspaceAiAssistantStore = create<WorkspaceAiAssistantState>(
  (set) => ({
    ...getInitialState(),

    setMessages: (updater) => {
      set((state) => ({
        messages:
          typeof updater === 'function'
            ? updater(state.messages)
            : updater,
      }))
    },

    appendMessages: (messages) => {
      set((state) => ({
        messages: [...state.messages, ...messages],
      }))
    },

    replaceMessage: (messageId, nextMessage) => {
      set((state) => ({
        messages: state.messages.map((item) =>
          item.id === messageId ? nextMessage : item,
        ),
      }))
    },

    patchMessage: (messageId, updater) => {
      set((state) => ({
        messages: state.messages.map((item) =>
          item.id === messageId ? updater(item) : item,
        ),
      }))
    },

    setInputValue: (inputValue) => {
      set({ inputValue })
    },

    setSending: (sending) => {
      set({ sending })
    },

    setConversationId: (conversationId) => {
      set({ conversationId })
    },

    setAbortController: (abortController) => {
      set({ abortController })
    },

    setLastStatusText: (lastStatusText) => {
      set({ lastStatusText })
    },

    markRequestRunning: (text = 'AI 正在执行中') => {
      set({
        requestState: 'running',
        lastStatusText: text,
      })
    },

    markRequestDone: (text = 'AI 已完成，点击查看结果') => {
      set((state) => ({
        requestState: 'done',
        lastStatusText: text,
        floatingVisible: state.minimized || state.floatingVisible,
      }))
    },

    markRequestError: (text = 'AI 生成失败，点击查看详情') => {
      set((state) => ({
        requestState: 'error',
        lastStatusText: text,
        floatingVisible: state.minimized || state.floatingVisible,
      }))
    },

    minimizePanel: () => {
      set({
        minimized: true,
        floatingVisible: true,
      })
    },

    expandPanel: () => {
      set({
        minimized: false,
        floatingVisible: false,
      })
    },

    hideFloatingCard: () => {
      set((state) => ({
        minimized: false,
        floatingVisible: false,
        requestState: state.sending ? state.requestState : 'idle',
      }))
    },

    resetSession: () => {
      set(getInitialState())
    },
  }),
)
