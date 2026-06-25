import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  App as AntdApp,
  Button,
  Collapse,
  Empty,
  Input,
  List,
  Popconfirm,
  Popover,
  Spin,
  Tag,
  Tooltip,
} from 'antd'
import {
  BulbOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  LoadingOutlined,
  MessageOutlined,
  PauseCircleOutlined,
  HistoryOutlined,
  RobotOutlined,
  SendOutlined,
  FormOutlined
} from '@ant-design/icons'
import {
  abortAgentChatConversation,
  createAgentChatConversation,
  deleteAgentChatConversation,
  getAgentChatConversations,
  getAgentChatMessages,
  streamAgentChatMessage,
} from '@/services/agent-chat'
import type {
  AgentChatConversationSummary,
  AgentChatMessagePayload,
  AgentChatNextAction,
  AgentChatReasoningStep,
  AgentChatStoredMessage,
  AgentChatStreamResponse,
  AgentChatStreamStatusEvent,
} from '@/services/agent-chat'
import type { DashboardSnapshot } from '@/services/dashboard'
import { useStore } from '@/store/useStore'
import {
  WORKSPACE_AI_ASSISTANT_NAME,
  WORKSPACE_AI_ASSISTANT_SCENE,
  createAssistantMessageId,
  createInitialAssistantMessage,
  useWorkspaceAiAssistantStore,
  type AssistantChatMessage,
} from '@/store/useWorkspaceAiAssistantStore'
import sanitizeDashboardConfig from '@/utils/dashboardConfig'
import './index.scss'

const { TextArea } = Input

const REPLY_TYPING_INTERVAL_MS = 20
const REPLY_TYPING_STEP = 1

interface AIAssistantPanelProps {
  currentSnapshot: DashboardSnapshot
  hasWorkspaceContent: boolean
  visible: boolean
  workspaceKey: string
  workspaceTitle?: string
  onApplySnapshot: (snapshot: DashboardSnapshot) => void
  onClearWorkspace: () => void
  onClose: () => void
}

const buildEmptySnapshotWithConfig = (
  dashboardConfig?: DashboardSnapshot['dashboardConfig'] | null,
): DashboardSnapshot => ({
  widgets: [],
  groups: [],
  floatingModules: [],
  dashboardConfig: sanitizeDashboardConfig(dashboardConfig || {}),
})

const DEFAULT_PROMPT_SUGGESTIONS = [
  '生成一个简洁的运营看板，包含标题、KPI 指标卡、趋势图和数据表格。',
  '保留当前结构，把页面改成科技蓝大屏风格，并补充更丰富的模拟数据。',
  '新建一个企业门户首页，包含 Banner、快捷入口、公告区和导航模块。',
]

const CREATE_INTENT_PATTERN =
  /(rebuild|recreate|create from scratch|start over|new page|clear then rebuild|从头创建|重新生成|新建页面|清空后重建|重新搭建)/i

const snapshotHasContent = (snapshot?: DashboardSnapshot | null) =>
  Boolean(
    snapshot &&
    (snapshot.widgets?.length ||
      snapshot.groups?.length ||
      snapshot.floatingModules?.length),
  )

const truncateConversationText = (value?: string, maxLength = 38) => {
  const text = value?.trim()
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const formatConversationTime = (date = new Date()) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const isAbortError = (error: unknown) =>
  error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error
      ? error.name === 'AbortError' || /abort/i.test(error.message)
      : false

const buildReasoningDigest = (message: AssistantChatMessage) => {
  if (message.summary) {
    return `${message.summary.title} / ${message.summary.widgetCount} 个组件`
  }
  if (message.reasoning?.length) {
    return message.reasoning[0].title
  }
  if (message.thinkingText) {
    return `${message.thinkingText.slice(0, 48)}${message.thinkingText.length > 48 ? '...' : ''}`
  }
  return '查看推理'
}

const buildStreamingStatusText = (message: AssistantChatMessage) => {
  const latestPhase = message.streamLogs?.[message.streamLogs.length - 1]?.phase
  const contentLength = message.content?.trim().length || 0

  if (latestPhase === 'context') return '正在读取当前页面与历史会话...'
  if (latestPhase === 'skill') return '正在规划处理步骤...'
  if (latestPhase === 'request') return contentLength > 0 ? '正在继续生成回复内容...' : '正在生成本轮方案...'
  if (latestPhase === 'validate') return '正在校验生成结果...'
  if (latestPhase === 'finalize') return '正在整理最终结果...'
  if (message.thinkingText?.trim()) return '正在分析需求和当前页面...'
  if (contentLength > 0) return '正在生成回复内容...'
  return '正在准备本轮对话...'
}

const buildTraceDigest = (message: AssistantChatMessage) => {
  const latestLog = message.streamLogs?.[message.streamLogs.length - 1]?.message?.trim()
  return latestLog || '查看执行过程'
}

const buildVisibleMessageContent = (message: AssistantChatMessage) => {
  if (
    typeof message.displayContent === 'string' &&
    message.displayContent !== message.content &&
    message.content.startsWith(message.displayContent) &&
    (message.status === 'loading' || message.displayContent.length > 0)
  ) {
    return message.displayContent
  }

  return message.content
}

const mapStoredMessagesToAssistantMessages = (
  messages: AgentChatStoredMessage[],
): AssistantChatMessage[] => {
  if (!messages.length) {
    return [createInitialAssistantMessage()]
  }
  return messages.map((item) => ({
    id: item.id,
    role: item.role,
    content: item.content,
    status: item.status === 'failed' ? 'error' : 'done',
    model: item.model || (item.role === 'assistant' ? WORKSPACE_AI_ASSISTANT_NAME : undefined),
    reasoning: item.reasoning || [],
    summary: item.summary || undefined,
    snapshot: item.snapshot || undefined,
    nextActions: item.nextActions || [],
    appliable: item.appliable,
    createdAt: item.createdAt,
  }))
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  currentSnapshot,
  hasWorkspaceContent,
  visible,
  workspaceKey,
  workspaceTitle,
  onApplySnapshot,
  onClearWorkspace,
  onClose,
}) => {
  const { message, modal } = AntdApp.useApp()
  const messages = useWorkspaceAiAssistantStore((state) => state.messages)
  const conversations = useWorkspaceAiAssistantStore((state) => state.conversations)
  const activeConversationId = useWorkspaceAiAssistantStore((state) => state.activeConversationId)
  const inputValue = useWorkspaceAiAssistantStore((state) => state.inputValue)
  const sending = useWorkspaceAiAssistantStore((state) => state.sending)
  const conversationId = useWorkspaceAiAssistantStore((state) => state.conversationId)
  const loadingConversations = useWorkspaceAiAssistantStore((state) => state.loadingConversations)
  const loadingMessages = useWorkspaceAiAssistantStore((state) => state.loadingMessages)
  const setMessages = useWorkspaceAiAssistantStore((state) => state.setMessages)
  const appendMessages = useWorkspaceAiAssistantStore((state) => state.appendMessages)
  const replaceMessage = useWorkspaceAiAssistantStore((state) => state.replaceMessage)
  const patchMessage = useWorkspaceAiAssistantStore((state) => state.patchMessage)
  const setConversations = useWorkspaceAiAssistantStore((state) => state.setConversations)
  const upsertConversation = useWorkspaceAiAssistantStore((state) => state.upsertConversation)
  const removeConversation = useWorkspaceAiAssistantStore((state) => state.removeConversation)
  const setActiveConversationId = useWorkspaceAiAssistantStore(
    (state) => state.setActiveConversationId,
  )
  const setInputValue = useWorkspaceAiAssistantStore((state) => state.setInputValue)
  const setSending = useWorkspaceAiAssistantStore((state) => state.setSending)
  const setConversationId = useWorkspaceAiAssistantStore(
    (state) => state.setConversationId,
  )
  const setAbortController = useWorkspaceAiAssistantStore(
    (state) => state.setAbortController,
  )
  const setLastStatusText = useWorkspaceAiAssistantStore(
    (state) => state.setLastStatusText,
  )
  const setLoadingConversations = useWorkspaceAiAssistantStore(
    (state) => state.setLoadingConversations,
  )
  const setLoadingMessages = useWorkspaceAiAssistantStore(
    (state) => state.setLoadingMessages,
  )
  const markRequestRunning = useWorkspaceAiAssistantStore(
    (state) => state.markRequestRunning,
  )
  const markRequestDone = useWorkspaceAiAssistantStore(
    (state) => state.markRequestDone,
  )
  const markRequestError = useWorkspaceAiAssistantStore(
    (state) => state.markRequestError,
  )
  const listRef = useRef<HTMLDivElement>(null)
  const currentSnapshotRef = useRef(currentSnapshot)
  const hasWorkspaceContentRef = useRef(hasWorkspaceContent)
  const conversationIdRef = useRef(conversationId)
  const replyTypingQueueRef = useRef(new Map<string, string>())
  const replyTypingTimerRef = useRef(new Map<string, number>())
  const initializedWorkspaceRef = useRef('')
  const [historyPopoverOpen, setHistoryPopoverOpen] = useState(false)

  useEffect(() => {
    currentSnapshotRef.current = currentSnapshot
  }, [currentSnapshot])

  useEffect(() => {
    hasWorkspaceContentRef.current = hasWorkspaceContent
  }, [hasWorkspaceContent])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    if (!visible) return
    const element = listRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [messages, visible])

  useEffect(() => {
    if (!visible) {
      setHistoryPopoverOpen(false)
    }
  }, [visible])

  useEffect(() => {
    return () => {
      replyTypingTimerRef.current.forEach((timerId) => {
        window.clearInterval(timerId)
      })
      replyTypingTimerRef.current.clear()
      replyTypingQueueRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!visible || !workspaceKey) {
      return
    }
    const nextScopeKey = `${WORKSPACE_AI_ASSISTANT_SCENE}:${workspaceKey}`
    if (initializedWorkspaceRef.current === nextScopeKey) {
      return
    }
    initializedWorkspaceRef.current = nextScopeKey

    let cancelled = false

    const loadConversations = async () => {
      setLoadingConversations(true)
      try {
        const data = await getAgentChatConversations({
          scene: WORKSPACE_AI_ASSISTANT_SCENE,
          bizKey: workspaceKey,
          bizTitle: workspaceTitle,
        })
        if (cancelled) return
        setConversations(data)
        const latest = data[0]
        if (latest) {
          setConversationId(latest.id)
          setActiveConversationId(latest.id)
          setLoadingMessages(true)
          try {
            const messageData = await getAgentChatMessages(latest.id)
            if (cancelled) return
            setMessages(mapStoredMessagesToAssistantMessages(messageData))
          } finally {
            if (!cancelled) {
              setLoadingMessages(false)
            }
          }
        } else {
          setConversationId(undefined)
          setActiveConversationId(undefined)
          setMessages([createInitialAssistantMessage()])
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Load AI conversations failed:', error)
          message.error('加载 AI 历史会话失败')
        }
      } finally {
        if (!cancelled) {
          setLoadingConversations(false)
        }
      }
    }

    void loadConversations()

    return () => {
      cancelled = true
      setHistoryPopoverOpen(false)
      setLoadingConversations(false)
      setLoadingMessages(false)
    }
  }, [
    message,
    setActiveConversationId,
    setConversationId,
    setConversations,
    setLoadingConversations,
    setLoadingMessages,
    setMessages,
    visible,
    workspaceKey,
    workspaceTitle,
  ])

  const isInitialState = useMemo(
    () => !messages.some((item) => item.role === 'user'),
    [messages],
  )

  const visibleHistory = useMemo<AgentChatMessagePayload[]>(
    () =>
      messages
        .filter((item) => item.status === 'done')
        .map((item) => ({
          role: item.role,
          content: item.content,
        })),
    [messages],
  )

  const activeConversation = useMemo(
    () =>
      conversations.find((item) => item.id === activeConversationId)
      || conversations.find((item) => item.id === conversationId),
    [activeConversationId, conversationId, conversations],
  )

  const stopReplyTyping = (messageId?: string) => {
    if (messageId) {
      const timerId = replyTypingTimerRef.current.get(messageId)
      if (timerId !== undefined) {
        window.clearInterval(timerId)
        replyTypingTimerRef.current.delete(messageId)
      }
      return
    }

    replyTypingTimerRef.current.forEach((timerId) => {
      window.clearInterval(timerId)
    })
    replyTypingTimerRef.current.clear()
  }

  const replaceAssistantPlaceholder = (
    placeholderId: string,
    nextMessage: AssistantChatMessage,
  ) => {
    stopReplyTyping(placeholderId)
    replyTypingQueueRef.current.delete(placeholderId)
    replaceMessage(placeholderId, nextMessage)
  }

  const appendStreamLog = (
    messageId: string,
    event: AgentChatStreamStatusEvent,
  ) => {
    setLastStatusText(event.message || '')
    patchMessage(messageId, (current) => ({
      ...current,
      streamLogs: [...(current.streamLogs || []), event],
    }))
  }

  const flushReplyTyping = (messageId: string) => {
    const pendingText = replyTypingQueueRef.current.get(messageId) || ''
    if (!pendingText) {
      stopReplyTyping(messageId)
      return
    }

    const chars = Array.from(pendingText)
    const nextChunk = chars.slice(0, REPLY_TYPING_STEP).join('')
    const restText = chars.slice(REPLY_TYPING_STEP).join('')

    if (restText) {
      replyTypingQueueRef.current.set(messageId, restText)
    } else {
      replyTypingQueueRef.current.delete(messageId)
      stopReplyTyping(messageId)
    }

    patchMessage(messageId, (current) => ({
      ...current,
      displayContent: `${current.displayContent || ''}${nextChunk}`,
    }))
  }

  const ensureReplyTyping = (messageId: string) => {
    if (replyTypingTimerRef.current.has(messageId)) {
      return
    }

    const timerId = window.setInterval(() => {
      flushReplyTyping(messageId)
    }, REPLY_TYPING_INTERVAL_MS)
    replyTypingTimerRef.current.set(messageId, timerId)
  }

  const enqueueReplyDelta = (messageId: string, delta: string) => {
    patchMessage(messageId, (current) => ({
      ...current,
      content: `${current.content || ''}${delta}`,
    }))

    const currentQueue = replyTypingQueueRef.current.get(messageId) || ''
    replyTypingQueueRef.current.set(messageId, `${currentQueue}${delta}`)
    ensureReplyTyping(messageId)
  }

  const applyFinalResult = (
    placeholderId: string,
    data: AgentChatStreamResponse,
  ) => {
    conversationIdRef.current = data.conversationId
    setConversationId(data.conversationId)
    patchMessage(placeholderId, (current) => ({
      ...current,
      status: 'done',
      model: data.model || current.model || WORKSPACE_AI_ASSISTANT_NAME,
      content: current.content || data.reply,
      reasoning: [
        ...(current.reasoning || []),
        ...data.reasoning.filter(
          (step) =>
            !(current.reasoning || []).some(
              (item) =>
                item.title === step.title && item.content === step.content,
            ),
        ),
      ],
      summary: data.summary,
      snapshot: data.snapshot,
      nextActions: data.nextActions || [],
      appliable: Boolean(data.appliable),
    }))
    const conversationTitle =
      truncateConversationText(visibleHistory[visibleHistory.length - 1]?.content || data.reply, 24) ||
      conversations.find((item) => item.id === data.conversationId)?.title ||
      '新会话'
    const currentTime = formatConversationTime()
    upsertConversation({
      id: data.conversationId,
      title: conversationTitle,
      status: 'active',
      scene: WORKSPACE_AI_ASSISTANT_SCENE,
      bizKey: workspaceKey,
      bizTitle: workspaceTitle || conversationTitle,
      summaryText: data.reply,
      upstreamSessionId: data.conversationId,
      lastMessageAt: currentTime,
      createdAt: currentTime,
      updatedAt: currentTime,
    })
    markRequestDone('AI 已完成，点击查看结果')
  }

  const runAssistantRequest = async (
    prompt: string,
    placeholderId: string,
    mode: 'create' | 'edit',
    snapshotForRequest: DashboardSnapshot | null,
    history: AgentChatMessagePayload[],
    signal?: AbortSignal,
  ) => {
    try {
      await streamAgentChatMessage(
        {
          scene: WORKSPACE_AI_ASSISTANT_SCENE,
          bizKey: workspaceKey,
          bizTitle: workspaceTitle,
          prompt,
          mode,
          currentSnapshot: snapshotForRequest,
          messages: history,
          conversationId: conversationIdRef.current,
        },
        {
          onStatus: (event) => {
            appendStreamLog(placeholderId, event)
          },
          onReplyDelta: (delta) => {
            if (!delta) return
            enqueueReplyDelta(placeholderId, delta)
          },
          onThinkingDelta: (delta) => {
            if (!delta) return
            patchMessage(placeholderId, (current) => ({
              ...current,
              thinkingText: `${current.thinkingText || ''}${delta}`,
            }))
          },
          onReasoning: (step) => {
            if (!step?.title || !step?.content) return
            patchMessage(placeholderId, (current) => ({
              ...current,
              reasoning: [...(current.reasoning || []), step],
            }))
          },
          onMessage: (data) => {
            applyFinalResult(placeholderId, data)
          },
        },
        { signal },
      )
    } catch (error) {
      if (isAbortError(error)) {
        appendStreamLog(placeholderId, {
          phase: 'finalize',
          message: '本次生成已停止。',
        })
        patchMessage(placeholderId, (current) => ({
          ...current,
          status: 'done',
          content: current.content || '本次生成已停止，你可以调整描述后重试。',
        }))
        markRequestDone('本次生成已停止')
        return
      }

      console.error('AI assistant request failed:', error)
      const errorMessage =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : '生成失败，请调整需求描述后重试。'
      replaceAssistantPlaceholder(placeholderId, {
        id: placeholderId,
        role: 'assistant',
        status: 'error',
        model: WORKSPACE_AI_ASSISTANT_NAME,
        content: errorMessage,
      })
      markRequestError(errorMessage)
      message.error(errorMessage)
    } finally {
      setAbortController(null)
      setSending(false)
    }
  }

  const handleStop = async () => {
    const { abortController } = useWorkspaceAiAssistantStore.getState()
    abortController?.abort()

    const currentConversationId = conversationIdRef.current
    if (!currentConversationId) {
      return
    }

    try {
      await abortAgentChatConversation(currentConversationId)
    } catch (error) {
      console.error('Abort AI assistant request failed:', error)
    }
  }

  const switchConversation = async (
    item: AgentChatConversationSummary,
    options: { keepHistoryPopoverOpen?: boolean } = {},
  ) => {
    if (sending) {
      message.warning('请先等待当前生成完成或手动停止')
      return
    }
    setActiveConversationId(item.id)
    setConversationId(item.id)
    if (!options.keepHistoryPopoverOpen) {
      setHistoryPopoverOpen(false)
    }
    setLoadingMessages(true)
    try {
      const data = await getAgentChatMessages(item.id)
      setMessages(mapStoredMessagesToAssistantMessages(data))
    } catch (error) {
      console.error('Load AI messages failed:', error)
      message.error('加载会话消息失败')
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleCreateConversation = async () => {
    if (sending) {
      message.warning('请先等待当前生成完成或手动停止')
      return
    }
    try {
      const created = await createAgentChatConversation({
        scene: WORKSPACE_AI_ASSISTANT_SCENE,
        bizKey: workspaceKey,
        bizTitle: workspaceTitle,
        title: '新会话',
      })
      upsertConversation(created)
      setConversationId(created.id)
      setActiveConversationId(created.id)
      setMessages([createInitialAssistantMessage()])
      setHistoryPopoverOpen(false)
    } catch (error) {
      console.error('Create AI conversation failed:', error)
      message.error('创建新会话失败')
    }
  }

  const handleDeleteConversation = async (item: AgentChatConversationSummary) => {
    try {
      await deleteAgentChatConversation(item.id)
      removeConversation(item.id)
      if (activeConversationId === item.id || conversationId === item.id) {
        const restConversations = conversations.filter((current) => current.id !== item.id)
        const nextConversation = restConversations[0]
        if (nextConversation) {
          await switchConversation(nextConversation, { keepHistoryPopoverOpen: true })
        } else {
          setConversationId(undefined)
          setActiveConversationId(undefined)
          setMessages([createInitialAssistantMessage()])
          setHistoryPopoverOpen(true)
        }
      }
    } catch (error) {
      console.error('Delete AI conversation failed:', error)
      message.error('删除会话失败')
    }
  }

  const handleApplyMessageSnapshot = (item: AssistantChatMessage) => {
    if (!item.snapshot) {
      return
    }
    onApplySnapshot(item.snapshot)
    message.success('已应用该轮结果到当前工作台')
  }

  const handleUseNextAction = async (action: AgentChatNextAction) => {
    if (action.mode === 'fill') {
      setInputValue(action.prompt)
      return
    }
    if (action.destructive && hasWorkspaceContentRef.current) {
      modal.confirm({
        title: '确认执行该建议',
        content: '该操作可能重建当前页面内容，确认继续吗？',
        okText: '确认执行',
        cancelText: '取消',
        onOk: async () => {
          setInputValue(action.prompt)
          await Promise.resolve()
          const nextStore = useWorkspaceAiAssistantStore.getState()
          nextStore.setInputValue(action.prompt)
          setTimeout(() => {
            void handleSend(action.prompt)
          }, 0)
        },
      })
      return
    }
    setInputValue(action.prompt)
    await handleSend(action.prompt)
  }

  const handleSend = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? inputValue).trim()
    if (!prompt) {
      message.warning('请输入内容后再发送。')
      return
    }
    if (sending) return

    const userMessage: AssistantChatMessage = {
      id: createAssistantMessageId('user'),
      role: 'user',
      content: prompt,
      status: 'done',
    }

    const placeholderId = createAssistantMessageId('assistant')
    const placeholderMessage: AssistantChatMessage = {
      id: placeholderId,
      role: 'assistant',
      content: '',
      displayContent: '',
      status: 'loading',
      model: WORKSPACE_AI_ASSISTANT_NAME,
      thinkingText: '',
      streamLogs: [],
      reasoning: [],
      nextActions: [],
    }

    appendMessages([userMessage, placeholderMessage])
    setInputValue('')
    setSending(true)
    markRequestRunning('AI 正在执行中')
    const controller = new AbortController()
    setAbortController(controller)

    const wantsRecreate = CREATE_INTENT_PATTERN.test(prompt)
    const requestHistory = [
      ...visibleHistory,
      { role: 'user' as const, content: prompt },
    ]

    if (wantsRecreate && hasWorkspaceContentRef.current) {
      modal.confirm({
        title: '确认从头重建页面',
        content:
          '当前工作台已有内容。确认后会先清空页面，再按本次描述重新生成。',
        okText: '清空并重建',
        cancelText: '取消',
        onOk: async () => {
          onClearWorkspace()
          const clearedSnapshot = buildEmptySnapshotWithConfig(
            useStore.getState().dashboardConfig,
          )
          currentSnapshotRef.current = clearedSnapshot
          hasWorkspaceContentRef.current = false
          await runAssistantRequest(
            prompt,
            placeholderId,
            'create',
            clearedSnapshot,
            requestHistory,
            controller.signal,
          )
        },
        onCancel: () => {
          setMessages((prev) =>
            prev.filter(
              (item) => item.id !== placeholderId && item.id !== userMessage.id,
            ),
          )
          stopReplyTyping(placeholderId)
          replyTypingQueueRef.current.delete(placeholderId)
          setInputValue(prompt)
          setAbortController(null)
          setSending(false)
          useWorkspaceAiAssistantStore.getState().hideFloatingCard()
        },
      })
      return
    }

    const mode = hasWorkspaceContentRef.current ? 'edit' : 'create'
    const snapshotForRequest =
      mode === 'edit'
        ? currentSnapshotRef.current
        : buildEmptySnapshotWithConfig(currentSnapshotRef.current?.dashboardConfig)

    await runAssistantRequest(
      prompt,
      placeholderId,
      mode,
      snapshotForRequest,
      requestHistory,
      controller.signal,
    )
  }

  const historyPopoverContent = (
    <div className="ai-assistant-panel__history-popover">
      <div className="ai-assistant-panel__history-popover-header">
        <span>历史会话</span>
        <span>{conversations.length} 条</span>
      </div>
      <div className="ai-assistant-panel__history-popover-body">
        {loadingConversations ? (
          <div className="ai-assistant-panel__sessions-loading">
            <Spin size="small" />
            <span>加载会话中...</span>
          </div>
        ) : conversations.length ? (
          <List
            dataSource={conversations}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                className={`ai-assistant-panel__session-item ${activeConversationId === item.id ? 'is-active' : ''}`}
                onClick={() => void switchConversation(item)}
                actions={[
                  <Popconfirm
                    key={`${item.id}-delete`}
                    title="确认删除该会话？"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={() => void handleDeleteConversation(item)}
                    // getPopupContainer={(triggerNode: HTMLElement) => triggerNode.parentElement!}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<MessageOutlined />}
                  title={item.title || '未命名会话'}
                  description={
                    <div className="ai-assistant-panel__session-desc">
                      <span className="ai-assistant-panel__session-desc-text">
                        {item.summaryText || item.bizTitle || '继续当前页面设计'}
                      </span>
                      <span className="ai-assistant-panel__session-desc-time">
                        {item.updatedAt || item.lastMessageAt}
                      </span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无历史会话"
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-panel__header">
        <div className="ai-assistant-panel__header-main">
          <div className="ai-assistant-panel__title">
            <RobotOutlined />
            <span>AI 辅助设计</span>
          </div>
          {/* <div className="ai-assistant-panel__header-model">
            <Tag color="processing">{WORKSPACE_AI_ASSISTANT_NAME}</Tag>
          </div> */}
        </div>
        <div className="ai-assistant-panel__header-actions">
          <Tooltip title="新建会话">
            <Button
              type="text"
              icon={<FormOutlined />}
              onClick={() => void handleCreateConversation()}
              disabled={sending}
            >
            </Button>
          </Tooltip>
          <Popover
            trigger="click"
            placement="bottomRight"
            open={historyPopoverOpen}
            onOpenChange={setHistoryPopoverOpen}
            content={historyPopoverContent}
            overlayClassName="ai-assistant-panel__history-overlay"
          >
            <Button type="text" icon={<HistoryOutlined />}>
              {/* <DownOutlined className="ai-assistant-panel__header-caret" /> */}
            </Button>
          </Popover>
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
        </div>
      </div>

      <div className="ai-assistant-panel__context">
        <Tag color={hasWorkspaceContent ? 'blue' : 'default'}>
          {hasWorkspaceContent
            ? '基于当前工作台继续编辑'
            : '当前工作台为空，将从头创建'}
        </Tag>
        {activeConversation ? (
          <Tag color="default">
            当前会话：{activeConversation.title || '未命名会话'}
          </Tag>
        ) : null}
      </div>

      <div className="ai-assistant-panel__messages" ref={listRef}>
        {loadingMessages ? (
          <div className="ai-assistant-panel__messages-loading">
            <Spin />
            <span>加载消息中...</span>
          </div>
        ) : messages.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="先描述你想创建或调整的页面。"
          />
        ) : (
          messages.map((item) => (
            <div
              key={item.id}
              className={`ai-message ai-message--${item.role} ${item.status === 'error' ? 'is-error' : ''}`}
            >
              <div className="ai-message__bubble">
                {/* <div className="ai-message__meta">
                  <span>{item.role === 'user' ? '你' : 'AI'}</span>
                  {item.model ? <Tag>{item.model}</Tag> : null}
                </div> */}

                <div className="ai-message__content">
                  {item.status === 'loading' ? (
                    <div className="ai-message__streaming">
                      {buildVisibleMessageContent(item) ? (
                        <div className="ai-message__streaming-content">
                          {buildVisibleMessageContent(item)}
                        </div>
                      ) : null}
                      <span className="ai-message__loading">
                        <Spin indicator={<LoadingOutlined spin />} size="small" />
                        <span>{buildStreamingStatusText(item)}</span>
                      </span>
                    </div>
                  ) : (
                    buildVisibleMessageContent(item)
                  )}
                </div>

                {item.appliable && item.snapshot ? (
                  <div className="ai-message__actions">
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => handleApplyMessageSnapshot(item)}
                    >
                      应用该轮结果
                    </Button>
                  </div>
                ) : null}

                {item.nextActions?.length ? (
                  <div className="ai-message__next-actions">
                    <div className="ai-message__next-actions-label">建议下一步</div>
                    <div className="ai-message__next-actions-list">
                      {item.nextActions.map((action) => (
                        <Tooltip title={action.prompt}>

                          <Button
                            key={`${item.id}-${action.id}`}
                            size="small"
                            onClick={() => void handleUseNextAction(action)}
                            danger={Boolean(action.destructive)}
                            disabled={sending}
                          >
                            {action.label}
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ) : null}

                {item.streamLogs?.length ? (
                  <Collapse
                    ghost
                    className="ai-message__collapse"
                    items={[
                      {
                        key: `${item.id}-trace`,
                        label: (
                          <div className="ai-message__collapse-label">
                            <span className="ai-message__collapse-title">
                              执行过程
                            </span>
                            <span className="ai-message__collapse-digest">
                              {buildTraceDigest(item)}
                            </span>
                          </div>
                        ),
                        children: (
                          <div className="ai-message__trace ai-message__trace--panel">
                            {item.streamLogs.map((log, index) => (
                              <div
                                key={`${item.id}-${log.phase}-${index}`}
                                className="ai-message__trace-item"
                              >
                                <span className="ai-message__trace-phase">{log.phase}</span>
                                <span className="ai-message__trace-text">{log.message}</span>
                              </div>
                            ))}
                          </div>
                        ),
                      },
                    ]}
                  />
                ) : null}

                {item.thinkingText || item.reasoning?.length ? (
                  <Collapse
                    ghost
                    className="ai-message__collapse"
                    items={[
                      {
                        key: `${item.id}-reasoning`,
                        label: (
                          <div className="ai-message__collapse-label">
                            <span className="ai-message__collapse-title">
                              推理过程
                            </span>
                            <span className="ai-message__collapse-digest">
                              {buildReasoningDigest(item)}
                            </span>
                          </div>
                        ),
                        children: (
                          <>
                            {item.thinkingText ? (
                              <div className="ai-message__reasoning ai-message__reasoning--live">
                                <div className="ai-message__reasoning-title">
                                  <BulbOutlined />
                                  <span>实时分析</span>
                                </div>
                                <div className="ai-message__reasoning-step-content">
                                  {item.thinkingText}
                                </div>
                              </div>
                            ) : null}

                            {item.reasoning?.length ? (
                              <div className="ai-message__reasoning">
                                <div className="ai-message__reasoning-title">
                                  <BulbOutlined />
                                  <span>总结</span>
                                </div>
                                {item.reasoning.map((step: AgentChatReasoningStep) => (
                                  <div
                                    key={`${item.id}-${step.title}-${step.content}`}
                                    className="ai-message__reasoning-step"
                                  >
                                    <div className="ai-message__reasoning-step-title">
                                      {step.title}
                                    </div>
                                    <div className="ai-message__reasoning-step-content">
                                      {step.content}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </>
                        ),
                      },
                    ]}
                  />
                ) : null}

                {/* {item.summary ? (
                  <div className="ai-message__summary">
                    <Tag
                      color={
                        item.summary.mode === 'create' ? 'green' : 'processing'
                      }
                    >
                      {item.summary.mode === 'create' ? '新建' : '编辑'}
                    </Tag>
                    <span>{item.summary.title}</span>
                    <span>{item.summary.widgetCount} 个组件</span>
                    {item.summary.widgetTypes.slice(0, 4).map((type) => (
                      <Tag key={`${item.id}-${type}`}>{type}</Tag>
                    ))}
                  </div>
                ) : null} */}
              </div>
            </div>
          ))
        )}
      </div>

      {isInitialState ? (
        <div className="ai-assistant-panel__suggestions">
          <div className="ai-assistant-panel__section-label">快捷提示</div>
          <div className="ai-assistant-panel__suggestion-list">
            {DEFAULT_PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="ai-assistant-panel__suggestion"
                disabled={sending}
                onClick={() => setInputValue(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ai-assistant-panel__composer">
        <TextArea
          value={inputValue}
          rows={4}
          maxLength={1000}
          disabled={sending}
          placeholder="请描述你想创建或调整的页面。"
          onChange={(event) => setInputValue(event.target.value)}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
        />
        <div className="ai-assistant-panel__composer-actions">
          <span>Enter 发送，Shift + Enter 换行</span>
          {sending ? (
            <Button danger icon={<PauseCircleOutlined />} onClick={() => void handleStop()}>
              停止
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              disabled={!inputValue.trim() || sending}
              onClick={() => void handleSend()}
            >
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIAssistantPanel
