import React, { useEffect, useMemo, useRef } from 'react'
import {
  App as AntdApp,
  Button,
  Collapse,
  Empty,
  Input,
  Spin,
  Tag,
} from 'antd'
import {
  BulbOutlined,
  CloseOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  RobotOutlined,
  SendOutlined,
} from '@ant-design/icons'
import {
  abortAgentChatConversation,
  streamAgentChatMessage,
} from '@/services/agent-chat'
import type {
  AgentChatMessagePayload,
  AgentChatReasoningStep,
  AgentChatStreamResponse,
  AgentChatStreamStatusEvent,
} from '@/services/agent-chat'
import type { DashboardSnapshot } from '@/services/dashboard'
import { useStore } from '@/store/useStore'
import {
  WORKSPACE_AI_ASSISTANT_HINT,
  WORKSPACE_AI_ASSISTANT_NAME,
  createAssistantMessageId,
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
  if (message.streamLogs?.length) {
    return message.streamLogs[message.streamLogs.length - 1].message
  }
  if (message.thinkingText) {
    return `${message.thinkingText.slice(0, 48)}${message.thinkingText.length > 48 ? '...' : ''}`
  }
  return '查看推理'
}

const buildStreamingStatusText = (message: AssistantChatMessage) => {
  const latestLog = message.streamLogs?.[message.streamLogs.length - 1]?.message
  const contentLength = message.content?.trim().length || 0

  if (latestLog && contentLength > 0) return latestLog
  if (latestLog) return latestLog
  if (message.thinkingText?.trim()) return '正在分析需求和当前工作台上下文...'
  if (contentLength > 0) return '正在整理最终回答...'
  return '正在生成...'
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

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  currentSnapshot,
  hasWorkspaceContent,
  visible,
  onApplySnapshot,
  onClearWorkspace,
  onClose,
}) => {
  const { message, modal } = AntdApp.useApp()
  const messages = useWorkspaceAiAssistantStore((state) => state.messages)
  const inputValue = useWorkspaceAiAssistantStore((state) => state.inputValue)
  const sending = useWorkspaceAiAssistantStore((state) => state.sending)
  const conversationId = useWorkspaceAiAssistantStore((state) => state.conversationId)
  const setMessages = useWorkspaceAiAssistantStore((state) => state.setMessages)
  const appendMessages = useWorkspaceAiAssistantStore((state) => state.appendMessages)
  const replaceMessage = useWorkspaceAiAssistantStore((state) => state.replaceMessage)
  const patchMessage = useWorkspaceAiAssistantStore((state) => state.patchMessage)
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
    return () => {
      replyTypingTimerRef.current.forEach((timerId) => {
        window.clearInterval(timerId)
      })
      replyTypingTimerRef.current.clear()
      replyTypingQueueRef.current.clear()
    }
  }, [])

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
    if (data.snapshotRecovered && data.snapshot) {
      currentSnapshotRef.current = data.snapshot
      hasWorkspaceContentRef.current = snapshotHasContent(data.snapshot)
      onApplySnapshot(data.snapshot)
    }

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
    }))
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

  const handleSend = async () => {
    const prompt = inputValue.trim()
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

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-panel__header">
        <div className="ai-assistant-panel__header-main">
          <div className="ai-assistant-panel__title">
            <RobotOutlined />
            <span>AI 助手</span>
          </div>
          <div className="ai-assistant-panel__header-model">
            <Tag color="processing">{WORKSPACE_AI_ASSISTANT_NAME}</Tag>
          </div>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      <div className="ai-assistant-panel__context">
        {/* <Tag color="cyan">{WORKSPACE_AI_ASSISTANT_HINT}</Tag> */}
        <Tag color={hasWorkspaceContent ? 'blue' : 'default'}>
          {hasWorkspaceContent
            ? '基于当前工作台继续编辑'
            : '当前工作台为空，将从头创建'}
        </Tag>
      </div>

      <div className="ai-assistant-panel__messages" ref={listRef}>
        {messages.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="先描述你想创建或调整的页面。"
          />
        ) : null}

        {messages.map((item) => (
          <div
            key={item.id}
            className={`ai-message ai-message--${item.role} ${item.status === 'error' ? 'is-error' : ''}`}
          >
            <div className="ai-message__bubble">
              <div className="ai-message__meta">
                <span>{item.role === 'user' ? '你' : 'AI'}</span>
                {item.model ? <Tag>{item.model}</Tag> : null}
              </div>

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

              {item.summary ? (
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
              ) : null}
            </div>
          </div>
        ))}
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
