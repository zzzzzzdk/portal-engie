import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  App as AntdApp,
  Button,
  Collapse,
  Empty,
  Input,
  Select,
  Spin,
  Tag,
} from "antd";
import {
  BulbOutlined,
  CloseOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  RobotOutlined,
  SendOutlined,
} from "@ant-design/icons";
import {
  getAIWorkbenchModels,
  streamAIWorkbenchMessage,
} from "@/services/aiWorkbench";
import type {
  AIWorkbenchChatResponse,
  AIWorkbenchMessagePayload,
  AIWorkbenchModel,
  AIWorkbenchReasoningStep,
  AIWorkbenchStreamStatusEvent,
} from "@/services/aiWorkbench";
import type { DashboardSnapshot } from "@/services/dashboard";
import "./index.scss";

const { TextArea } = Input;

type AssistantMessageStatus = "loading" | "done" | "error";

interface AssistantChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: AssistantMessageStatus;
  model?: string;
  thinkingText?: string;
  reasoning?: AIWorkbenchReasoningStep[];
  streamLogs?: AIWorkbenchStreamStatusEvent[];
  summary?: AIWorkbenchChatResponse["summary"];
}

interface AIAssistantPanelProps {
  currentSnapshot: DashboardSnapshot;
  hasWorkspaceContent: boolean;
  onApplySnapshot: (snapshot: DashboardSnapshot) => void;
  onClearWorkspace: () => void;
  onClose: () => void;
}

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  widgets: [],
  groups: [],
  floatingModules: [],
  dashboardConfig: {},
};

const DEFAULT_PROMPT_SUGGESTIONS = [
  "生成一个简洁的运营看板，包含标题、KPI 指标卡、趋势图和数据表格。",
  "保留当前结构，把页面改成科技蓝大屏风格，并补充更丰富的模拟数据。",
  "新建一个企业门户首页，包含 Banner、快捷入口、公告区和导航模块。",
  // "清空当前页面，并重建成适合领导汇报的区域运营总览看板。",
];

const CREATE_INTENT_PATTERN =
  /(rebuild|recreate|create from scratch|start over|new page|clear then rebuild|从头创建|重新生成|新建页面|清空后重建|重新搭建)/i;

const createMessageId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const snapshotHasContent = (snapshot?: DashboardSnapshot | null) =>
  Boolean(
    snapshot &&
      (snapshot.widgets?.length ||
        snapshot.groups?.length ||
        snapshot.floatingModules?.length),
  );

const isAbortError = (error: unknown) =>
  error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error
      ? error.name === "AbortError" || /abort/i.test(error.message)
      : false;

const buildReasoningDigest = (message: AssistantChatMessage) => {
  if (message.summary) {
    return `${message.summary.title} / ${message.summary.widgetCount} 个组件`;
  }
  if (message.reasoning?.length) {
    return message.reasoning[0].title;
  }
  if (message.streamLogs?.length) {
    return message.streamLogs[message.streamLogs.length - 1].message;
  }
  if (message.thinkingText) {
    return `${message.thinkingText.slice(0, 48)}${message.thinkingText.length > 48 ? "..." : ""}`;
  }
  return "查看推理";
};

const buildStreamingStatusText = (message: AssistantChatMessage) => {
  const latestLog = message.streamLogs?.[message.streamLogs.length - 1]?.message;
  const contentLength = message.content?.trim().length || 0;

  if (latestLog && contentLength > 0) return latestLog;
  if (latestLog) return latestLog;
  if (message.thinkingText?.trim()) return "正在分析需求和当前工作台上下文...";
  if (contentLength > 0) return "正在整理最终回复...";
  return "正在生成...";
};

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  currentSnapshot,
  hasWorkspaceContent,
  onApplySnapshot,
  onClearWorkspace,
  onClose,
}) => {
  const { message, modal } = AntdApp.useApp();
  const [models, setModels] = useState<AIWorkbenchModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>();
  const [configLoading, setConfigLoading] = useState(true);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const initializedRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const currentSnapshotRef = useRef(currentSnapshot);
  const hasWorkspaceContentRef = useRef(hasWorkspaceContent);
  const conversationIdRef = useRef(conversationId);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    currentSnapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  useEffect(() => {
    hasWorkspaceContentRef.current = hasWorkspaceContent;
  }, [hasWorkspaceContent]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    const loadConfig = async () => {
      setConfigLoading(true);

      const result = await getAIWorkbenchModels().catch((error) => {
        console.error("Failed to load platform AI models:", error);
        return null;
      });

      if (result?.data) {
        const nextModels = result.data || [];
        const configuredModels = nextModels.filter(
          (item) => item.configured !== false,
        );
        const recommendedModel =
          configuredModels.find((item) => item.isDefault)?.id ||
          configuredModels.find((item) => item.recommended)?.id ||
          configuredModels[0]?.id ||
          nextModels.find((item) => item.isDefault)?.id ||
          nextModels.find((item) => item.recommended)?.id ||
          nextModels[0]?.id;

        setModels(nextModels);
        setSelectedModel(recommendedModel);
      } else {
        message.warning("平台模型列表加载失败。");
      }

      if (!initializedRef.current) {
        setMessages([
          {
            id: createMessageId("assistant"),
            role: "assistant",
            status: "done",
            content:
              "你可以继续编辑当前工作台，也可以从头生成新页面。当前助手仅使用平台 AI 生成链路。",
          },
        ]);
        initializedRef.current = true;
      }

      setConfigLoading(false);
    };

    void loadConfig();
  }, [message]);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  const selectedModelInfo = useMemo(
    () => models.find((item) => item.id === selectedModel),
    [models, selectedModel],
  );

  const isInitialState = useMemo(
    () => !messages.some((item) => item.role === "user"),
    [messages],
  );

  const visibleHistory = useMemo<AIWorkbenchMessagePayload[]>(
    () =>
      messages
        .filter((item) => item.status === "done")
        .map((item) => ({
          role: item.role,
          content: item.content,
        })),
    [messages],
  );

  const replaceAssistantPlaceholder = (
    placeholderId: string,
    nextMessage: AssistantChatMessage,
  ) => {
    setMessages((prev) =>
      prev.map((item) => (item.id === placeholderId ? nextMessage : item)),
    );
  };

  const patchAssistantMessage = (
    messageId: string,
    updater: (message: AssistantChatMessage) => AssistantChatMessage,
  ) => {
    setMessages((prev) =>
      prev.map((item) => (item.id === messageId ? updater(item) : item)),
    );
  };

  const appendStreamLog = (
    messageId: string,
    event: AIWorkbenchStreamStatusEvent,
  ) => {
    patchAssistantMessage(messageId, (current) => ({
      ...current,
      streamLogs: [...(current.streamLogs || []), event],
    }));
  };

  const applyFinalResult = (
    placeholderId: string,
    data: AIWorkbenchChatResponse,
  ) => {
    conversationIdRef.current = data.conversationId;
    setConversationId(data.conversationId);
    currentSnapshotRef.current = data.snapshot;
    hasWorkspaceContentRef.current = snapshotHasContent(data.snapshot);
    onApplySnapshot(data.snapshot);

    patchAssistantMessage(placeholderId, (current) => ({
      ...current,
      status: "done",
      model: data.model || current.model,
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
    }));
  };

  const runAssistantRequest = async (
    prompt: string,
    placeholderId: string,
    mode: "create" | "edit",
    snapshotForRequest: DashboardSnapshot | null,
    history: AIWorkbenchMessagePayload[],
    signal?: AbortSignal,
  ) => {
    try {
      await streamAIWorkbenchMessage(
        {
          model: selectedModel || "",
          prompt,
          mode,
          currentSnapshot: snapshotForRequest,
          messages: history,
          conversationId: conversationIdRef.current,
        },
        {
          onStatus: (event) => {
            appendStreamLog(placeholderId, event);
          },
          onReplyDelta: (delta) => {
            if (!delta) return;
            patchAssistantMessage(placeholderId, (current) => ({
              ...current,
              content: `${current.content || ""}${delta}`,
            }));
          },
          onThinkingDelta: (delta) => {
            if (!delta) return;
            patchAssistantMessage(placeholderId, (current) => ({
              ...current,
              thinkingText: `${current.thinkingText || ""}${delta}`,
            }));
          },
          onReasoning: (step) => {
            if (!step?.title || !step?.content) return;
            patchAssistantMessage(placeholderId, (current) => ({
              ...current,
              reasoning: [...(current.reasoning || []), step],
            }));
          },
          onResult: (data) => {
            applyFinalResult(placeholderId, data);
          },
        },
        { signal },
      );
    } catch (error) {
      if (isAbortError(error)) {
        appendStreamLog(placeholderId, {
          phase: "finalize",
          message: "本次生成已停止。",
        });
        patchAssistantMessage(placeholderId, (current) => ({
          ...current,
          status: "done",
          content: current.content || "本次生成已停止，你可以调整描述后重试。",
        }));
        return;
      }

      console.error("AI assistant request failed:", error);
      replaceAssistantPlaceholder(placeholderId, {
        id: placeholderId,
        role: "assistant",
        status: "error",
        content: "生成失败，请调整需求描述后重试。",
      });
      message.error("AI 生成失败");
    } finally {
      abortControllerRef.current = null;
      setSending(false);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleSend = async () => {
    const prompt = inputValue.trim();
    if (!prompt || sending) return;

    if (!selectedModel) {
      message.warning("请先选择平台模型。");
      return;
    }

    if (selectedModelInfo?.configured === false) {
      message.warning(
        selectedModelInfo.configHint || "当前所选模型尚未配置。",
      );
      return;
    }

    const userMessage: AssistantChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: prompt,
      status: "done",
    };

    const placeholderId = createMessageId("assistant");
    const placeholderMessage: AssistantChatMessage = {
      id: placeholderId,
      role: "assistant",
      content: "",
      status: "loading",
      model: selectedModel,
      thinkingText: "",
      streamLogs: [],
      reasoning: [],
    };

    setMessages((prev) => [...prev, userMessage, placeholderMessage]);
    setInputValue("");
    setSending(true);
    abortControllerRef.current = new AbortController();

    const wantsRecreate = CREATE_INTENT_PATTERN.test(prompt);
    const requestHistory = [
      ...visibleHistory,
      { role: "user" as const, content: prompt },
    ];

    if (wantsRecreate && hasWorkspaceContentRef.current) {
      modal.confirm({
        title: "确认从头重建页面",
        content:
          "当前工作台已有内容。确认后会先清空页面，再按本次描述重新生成。",
        okText: "清空并重建",
        cancelText: "取消",
        onOk: async () => {
          onClearWorkspace();
          currentSnapshotRef.current = EMPTY_SNAPSHOT;
          hasWorkspaceContentRef.current = false;
          await runAssistantRequest(
            prompt,
            placeholderId,
            "create",
            EMPTY_SNAPSHOT,
            requestHistory,
            abortControllerRef.current?.signal,
          );
        },
        onCancel: () => {
          setMessages((prev) =>
            prev.filter(
              (item) => item.id !== placeholderId && item.id !== userMessage.id,
            ),
          );
          setInputValue(prompt);
          abortControllerRef.current = null;
          setSending(false);
        },
      });
      return;
    }

    const mode = hasWorkspaceContentRef.current ? "edit" : "create";
    const snapshotForRequest =
      mode === "edit" ? currentSnapshotRef.current : EMPTY_SNAPSHOT;

    await runAssistantRequest(
      prompt,
      placeholderId,
      mode,
      snapshotForRequest,
      requestHistory,
      abortControllerRef.current?.signal,
    );
  };

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-panel__header">
        <div className="ai-assistant-panel__header-main">
          <div className="ai-assistant-panel__title">
            <RobotOutlined />
            <span>AI 助手</span>
          </div>
          <div className="ai-assistant-panel__header-model">
            <Select
              value={selectedModel}
              loading={configLoading}
              disabled={sending}
              placeholder="请选择平台模型"
              onChange={setSelectedModel}
              options={models.map((item) => ({
                value: item.id,
                label: `${item.name}${item.isDefault ? " / 默认" : item.recommended ? " / 推荐" : ""}`,
                disabled: item.configured === false,
              }))}
            />
          </div>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      <div className="ai-assistant-panel__context">
        <Tag color={hasWorkspaceContent ? "blue" : "default"}>
          {hasWorkspaceContent
            ? "基于当前工作台继续编辑"
            : "当前工作台为空，将从头创建"}
        </Tag>
        {selectedModelInfo?.configured === false ? (
          <Tag color="warning">
            {selectedModelInfo.configHint || "当前模型尚未配置"}
          </Tag>
        ) : null}
      </div>

      <div className="ai-assistant-panel__messages" ref={listRef}>
        {messages.length === 0 && !configLoading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="先描述你想创建或调整的页面。"
          />
        ) : null}

        {messages.map((item) => (
          <div
            key={item.id}
            className={`ai-message ai-message--${item.role} ${item.status === "error" ? "is-error" : ""}`}
          >
            <div className="ai-message__bubble">
              <div className="ai-message__meta">
                <span>{item.role === "user" ? "你" : "AI"}</span>
                {item.model ? <Tag>{item.model}</Tag> : null}
              </div>

              <div className="ai-message__content">
                {item.status === "loading" ? (
                  <div className="ai-message__streaming">
                    {item.content ? (
                      <div className="ai-message__streaming-content">
                        {item.content}
                      </div>
                    ) : null}
                    <span className="ai-message__loading">
                      <Spin indicator={<LoadingOutlined spin />} size="small" />
                      <span>{buildStreamingStatusText(item)}</span>
                    </span>
                  </div>
                ) : (
                  item.content
                )}
              </div>

              {item.streamLogs?.length ? (
                <div className="ai-message__trace">
                  <div className="ai-message__trace-title">执行过程</div>
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
                              {item.reasoning.map((step) => (
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
                      item.summary.mode === "create" ? "green" : "processing"
                    }
                  >
                    {item.summary.mode === "create" ? "新建" : "编辑"}
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
                disabled={sending || configLoading}
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
          disabled={sending || configLoading}
          placeholder="请描述你想创建或调整的页面。"
          onChange={(event) => setInputValue(event.target.value)}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />
        <div className="ai-assistant-panel__composer-actions">
          <span>Enter 发送，Shift + Enter 换行</span>
          {sending ? (
            <Button danger icon={<PauseCircleOutlined />} onClick={handleStop}>
              停止
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => void handleSend()}
            >
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPanel;
