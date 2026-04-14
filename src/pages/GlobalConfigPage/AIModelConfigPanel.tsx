import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Collapse,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  message,
} from 'antd'
import {
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  StarOutlined,
} from '@ant-design/icons'
import {
  createGlobalAIModelConfig,
  deleteGlobalAIModelConfig,
  setDefaultGlobalAIModelConfig,
  updateGlobalAIModelConfig,
  type GlobalAIModelConfig,
  type GlobalAIModelProtocol,
} from '@/services'

interface AIModelConfigPanelProps {
  models: GlobalAIModelConfig[]
  onReload: () => Promise<void>
}

const PROTOCOL_OPTIONS: Array<{
  label: string
  value: GlobalAIModelProtocol
}> = [
  {
    label: 'OpenAI Responses',
    value: 'openai-responses',
  },
  {
    label: 'OpenAI Chat Completions',
    value: 'openai-chat',
  },
  {
    label: 'Anthropic Messages',
    value: 'anthropic-messages',
  },
]

const getProtocolDefaults = (protocol: GlobalAIModelProtocol) => {
  if (protocol === 'anthropic-messages') {
    return {
      authStyle: 'x-api-key',
      messagesPath: '/v1/messages',
      anthropicVersion: '2023-06-01',
      chatPath: '',
      responsesPath: '',
    }
  }

  if (protocol === 'openai-responses') {
    return {
      authStyle: 'bearer',
      responsesPath: '/responses',
      chatPath: '/chat/completions',
      messagesPath: '',
      anthropicVersion: '',
    }
  }

  return {
    authStyle: 'bearer',
    chatPath: '/chat/completions',
    responsesPath: '/responses',
    messagesPath: '',
    anthropicVersion: '',
  }
}

const AIModelConfigPanel: React.FC<AIModelConfigPanelProps> = ({ models, onReload }) => {
  const [modelForm] = Form.useForm()
  const [createModelForm] = Form.useForm()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)

  const selectedModel = useMemo<GlobalAIModelConfig | null>(() => {
    if (!models.length) {
      return null
    }

    if (selectedId) {
      return models.find(item => item.id === selectedId) || null
    }

    return models.find(item => item.isDefault) || models[0]
  }, [models, selectedId])

  const currentProtocol =
    (Form.useWatch('protocol', modelForm) as GlobalAIModelProtocol | undefined) ||
    selectedModel?.protocol ||
    'openai-chat'
  const createProtocol =
    (Form.useWatch('protocol', createModelForm) as GlobalAIModelProtocol | undefined) ||
    'openai-chat'

  useEffect(() => {
    if (!models.length) {
      setSelectedId(null)
      modelForm.resetFields()
      return
    }

    setSelectedId(prev => {
      if (prev && models.some(item => item.id === prev)) {
        return prev
      }
      return models.find(item => item.isDefault)?.id || models[0]?.id || null
    })
  }, [modelForm, models])

  useEffect(() => {
    if (!selectedModel) {
      modelForm.resetFields()
      return
    }

    modelForm.setFieldsValue({
      name: selectedModel.name,
      providerLabel: selectedModel.providerLabel,
      description: selectedModel.description,
      enabled: selectedModel.enabled !== false,
      protocol: selectedModel.protocol,
      baseUrl: selectedModel.baseUrl,
      model: selectedModel.model,
      apiKey: selectedModel.apiKey,
      authStyle: selectedModel.authStyle,
      responsesPath: selectedModel.responsesPath,
      chatPath: selectedModel.chatPath,
      messagesPath: selectedModel.messagesPath,
      anthropicVersion: selectedModel.anthropicVersion,
      temperature: selectedModel.temperature,
      maxTokens: selectedModel.maxTokens,
    })
  }, [modelForm, selectedModel])

  const handleApplyProtocolDefaults = (protocol: GlobalAIModelProtocol) => {
    const defaults = getProtocolDefaults(protocol)
    modelForm.setFieldsValue({
      authStyle: defaults.authStyle,
      responsesPath: defaults.responsesPath,
      chatPath: defaults.chatPath,
      messagesPath: defaults.messagesPath,
      anthropicVersion: defaults.anthropicVersion,
    })
  }

  const handleApplyCreateProtocolDefaults = (protocol: GlobalAIModelProtocol) => {
    const defaults = getProtocolDefaults(protocol)
    createModelForm.setFieldsValue({
      authStyle: defaults.authStyle,
      responsesPath: defaults.responsesPath,
      chatPath: defaults.chatPath,
      messagesPath: defaults.messagesPath,
      anthropicVersion: defaults.anthropicVersion,
    })
  }

  const handleCreate = async () => {
    try {
      const values = await createModelForm.validateFields()
      setCreateSaving(true)
      const res = await createGlobalAIModelConfig({
        name: String(values.name || '').trim(),
        providerLabel: String(values.providerLabel || '').trim(),
        protocol: values.protocol,
        providerType: 'custom',
        enabled: true,
        baseUrl: String(values.baseUrl || '').trim(),
        model: String(values.model || '').trim(),
        apiKey: String(values.apiKey || '').trim(),
        authStyle: values.authStyle,
        responsesPath: String(values.responsesPath || '').trim(),
        chatPath: String(values.chatPath || '').trim(),
        messagesPath: String(values.messagesPath || '').trim(),
        anthropicVersion: String(values.anthropicVersion || '').trim(),
      })

      if (res.code !== 20000 || !res.data?.id) {
        message.error(res.message || '新增模型配置失败')
        return
      }

      message.success('新增模型配置成功')
      setSelectedId(res.data.id)
      setCreateOpen(false)
      createModelForm.resetFields()
      await onReload()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      message.error(error?.message || '新增模型配置失败')
    } finally {
      setCreateSaving(false)
    }
  }

  const handleSave = async () => {
    if (!selectedModel) {
      return
    }

    try {
      const values = await modelForm.validateFields()
      setSaving(true)
      const res = await updateGlobalAIModelConfig({
        ...selectedModel,
        ...values,
        enabled: values.enabled !== false,
      })

      if (res.code !== 20000) {
        message.error(res.message || '保存模型配置失败')
        return
      }

      message.success('保存模型配置成功')
      await onReload()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      message.error(error?.message || '保存模型配置失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedModel) {
      return
    }

    const res = await deleteGlobalAIModelConfig({ id: selectedModel.id })
    if (res.code !== 20000) {
      message.error(res.message || '删除模型配置失败')
      return
    }

    message.success('删除模型配置成功')
    setSelectedId(null)
    await onReload()
  }

  const handleSetDefault = async () => {
    if (!selectedModel) {
      return
    }

    const res = await setDefaultGlobalAIModelConfig({ id: selectedModel.id })
    if (res.code !== 20000) {
      message.error(res.message || '设置默认模型失败')
      return
    }

    message.success('已设为默认模型')
    await onReload()
  }

  if (!selectedModel && !models.length) {
    return (
      <div className="global-config-page__module-panel global-config-page__simple-panel">
        <div className="global-config-page__panel-intro">
          <div className="global-config-page__panel-title">模型配置</div>
          <div className="global-config-page__panel-description">
            <div>统一维护 AI 助手可用模型及其关键接入信息。</div>
            <div>支持预置模型维护，也支持新增自定义模型。</div>
          </div>
        </div>

        <div className="global-config-page__panel-body">
          <Card className="global-config-page__content-card" bordered={false}>
            <Empty description="暂无模型配置" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="global-config-page__module-panel global-config-page__theme-panel">
      <div className="global-config-page__panel-intro">
        <div className="global-config-page__panel-title">模型配置</div>
        <div className="global-config-page__panel-description">
          <div>影响范围：AI 助手模型列表、默认模型与上游调用入口。</div>
          <div>配置策略：仅维护关键字段，复杂参数收敛到高级配置，并支持自定义模型接入。</div>
        </div>
      </div>

      <div className="global-config-page__panel-body">
        <div className="global-config-page__theme-layout">
          <Card className="global-config-page__theme-workspace-card" bordered={false}>
            <div className="global-config-page__theme-pane global-config-page__theme-pane--list">
              <div className="global-config-page__theme-list-header">
                <div>
                  <div className="global-config-page__card-title">模型列表</div>
                  <div className="global-config-page__card-tip">选择模型，编辑接入配置</div>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                  新增模型
                </Button>
              </div>

              <div className="global-config-page__theme-list-scroll">
                <div className="global-config-page__theme-list">
                  {models.map(item => {
                    const active = item.id === selectedModel?.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`global-config-page__theme-item${active ? ' is-active' : ''}`}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <div className="global-config-page__theme-item-name">{item.name}</div>
                        <div className="global-config-page__model-item-row">
                          <span>{item.providerLabel}</span>
                          <span>{item.model || '未配置模型名'}</span>
                        </div>
                        <div className="global-config-page__model-tags">
                          <Tag color={item.enabled === false ? 'default' : 'blue'}>
                            {item.enabled === false ? '已停用' : '已启用'}
                          </Tag>
                          {item.isDefault ? <Tag color="gold">默认</Tag> : null}
                          {item.readonly ? <Tag>预置</Tag> : <Tag color="green">自定义</Tag>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="global-config-page__theme-pane global-config-page__theme-pane--editor">
              <div className="global-config-page__editor-header">
                <div>
                  <div className="global-config-page__card-title">模型详情</div>
                  <div className="global-config-page__card-tip">
                    当前模型：{selectedModel?.name || '未选择'}
                  </div>
                </div>
                <Space wrap>
                  <Button
                    icon={<StarOutlined />}
                    disabled={!selectedModel || selectedModel.isDefault || selectedModel.enabled === false}
                    onClick={() => void handleSetDefault()}
                  >
                    设为默认
                  </Button>
                  <Popconfirm
                    title="确认删除当前模型配置吗？"
                    description="删除后将无法在 AI 助手中继续选择该模型。"
                    onConfirm={() => void handleDelete()}
                    okText="确认"
                    cancelText="取消"
                    disabled={!selectedModel || selectedModel.readonly}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!selectedModel || selectedModel.readonly}
                    >
                      删除模型
                    </Button>
                  </Popconfirm>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={() => void handleSave()}
                  >
                    保存配置
                  </Button>
                </Space>
              </div>

              <div className="global-config-page__theme-editor-scroll">
                <Form form={modelForm} layout="vertical">
                  <div className="global-config-page__section-card">
                    <div className="global-config-page__section-title">基础信息</div>
                    <div className="global-config-page__advanced-grid">
                      <Form.Item
                        name="name"
                        label="模型名称"
                        rules={[{ required: true, whitespace: true, message: '请输入模型名称' }]}
                      >
                        <Input placeholder="例如：企业网关 GPT-5.4" maxLength={40} />
                      </Form.Item>

                      <Form.Item
                        name="providerLabel"
                        label="提供方"
                        rules={[{ required: true, whitespace: true, message: '请输入提供方名称' }]}
                      >
                        <Input placeholder="例如：OpenAI / 企业代理 / OpenRouter" maxLength={40} />
                      </Form.Item>

                      <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                        <Switch checkedChildren="启用" unCheckedChildren="停用" />
                      </Form.Item>
                    </div>

                    <Form.Item name="description" label="说明">
                      <Input.TextArea
                        placeholder="用于说明这个模型的用途或来源，可选"
                        rows={3}
                        maxLength={120}
                      />
                    </Form.Item>
                  </div>

                  <div className="global-config-page__section-card">
                    <div className="global-config-page__section-title">接入信息</div>
                    <div className="global-config-page__advanced-grid">
                      <Form.Item
                        name="protocol"
                        label="协议类型"
                        rules={[{ required: true, message: '请选择协议类型' }]}
                      >
                        <Select
                          options={PROTOCOL_OPTIONS}
                          onChange={value => handleApplyProtocolDefaults(value)}
                        />
                      </Form.Item>

                      <Form.Item
                        name="baseUrl"
                        label="Base URL"
                        rules={[{ required: true, whitespace: true, message: '请输入 Base URL' }]}
                      >
                        <Input placeholder="例如：https://api.example.com/v1" />
                      </Form.Item>

                      <Form.Item
                        name="model"
                        label="模型标识"
                        rules={[{ required: true, whitespace: true, message: '请输入模型标识' }]}
                      >
                        <Input placeholder="例如：gpt-5.4 / claude-sonnet-4-20250514" />
                      </Form.Item>

                      <Form.Item
                        name="apiKey"
                        label="API Key"
                        rules={[{ required: true, whitespace: true, message: '请输入 API Key' }]}
                      >
                        <Input.Password placeholder="请输入 API Key" />
                      </Form.Item>
                    </div>
                  </div>

                  <div className="global-config-page__section-card">
                    <div className="global-config-page__section-title">生成参数</div>
                    <div className="global-config-page__advanced-grid">
                      <Form.Item name="temperature" label="Temperature">
                        <InputNumber min={0} max={2} step={0.1} precision={1} style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item name="maxTokens" label="Max Tokens">
                        <InputNumber min={1} max={32768} step={256} style={{ width: '100%' }} />
                      </Form.Item>
                    </div>
                  </div>

                  <Collapse
                    ghost
                    items={[
                      {
                        key: 'advanced',
                        label: '高级配置',
                        children: (
                          <div className="global-config-page__section-card global-config-page__section-card--advanced">
                            <div className="global-config-page__advanced-grid">
                              <Form.Item name="authStyle" label="认证方式">
                                <Select
                                  options={[
                                    { label: 'Bearer', value: 'bearer' },
                                    { label: 'X-API-Key', value: 'x-api-key' },
                                    { label: 'None', value: 'none' },
                                  ]}
                                />
                              </Form.Item>

                              <Form.Item name="responsesPath" label="Responses Path">
                                <Input
                                  placeholder={
                                    currentProtocol === 'openai-responses' ? '/responses' : '可选'
                                  }
                                />
                              </Form.Item>

                              <Form.Item name="chatPath" label="Chat Path">
                                <Input
                                  placeholder={
                                    currentProtocol === 'openai-chat' ? '/chat/completions' : '可选'
                                  }
                                />
                              </Form.Item>

                              <Form.Item name="messagesPath" label="Messages Path">
                                <Input
                                  placeholder={
                                    currentProtocol === 'anthropic-messages' ? '/v1/messages' : '可选'
                                  }
                                />
                              </Form.Item>

                              <Form.Item name="anthropicVersion" label="Anthropic Version">
                                <Input placeholder="仅 Anthropic Messages 协议需要" />
                              </Form.Item>
                            </div>
                          </div>
                        ),
                      },
                    ]}
                  />
                </Form>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        title="新增自定义模型"
        open={createOpen}
        onOk={() => void handleCreate()}
        onCancel={() => {
          setCreateOpen(false)
          createModelForm.resetFields()
        }}
        confirmLoading={createSaving}
        destroyOnHidden
      >
        <Form
          form={createModelForm}
          layout="vertical"
          initialValues={{
            protocol: 'openai-chat',
            authStyle: 'bearer',
            chatPath: '/chat/completions',
            responsesPath: '/responses',
          }}
        >
          <Form.Item
            name="name"
            label="模型名称"
            rules={[{ required: true, whitespace: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="例如：自定义 DeepSeek Chat" maxLength={40} />
          </Form.Item>

          <Form.Item
            name="providerLabel"
            label="提供方"
            rules={[{ required: true, whitespace: true, message: '请输入提供方名称' }]}
          >
            <Input placeholder="例如：企业代理 / OpenRouter / DeepSeek" maxLength={40} />
          </Form.Item>

          <Form.Item
            name="protocol"
            label="协议类型"
            rules={[{ required: true, message: '请选择协议类型' }]}
          >
            <Select
              options={PROTOCOL_OPTIONS}
              onChange={value => handleApplyCreateProtocolDefaults(value)}
            />
          </Form.Item>

          <Form.Item
            name="baseUrl"
            label="Base URL"
            rules={[{ required: true, whitespace: true, message: '请输入 Base URL' }]}
          >
            <Input placeholder="例如：https://api.example.com/v1" />
          </Form.Item>

          <Form.Item
            name="model"
            label="模型标识"
            rules={[{ required: true, whitespace: true, message: '请输入模型标识' }]}
          >
            <Input placeholder="例如：gpt-5.4 / deepseek-chat" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: true, whitespace: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="请输入 API Key" />
          </Form.Item>

          <Collapse
            ghost
            items={[
              {
                key: 'create-advanced',
                label: '高级配置',
                children: (
                  <>
                    <Form.Item name="authStyle" label="认证方式">
                      <Select
                        options={[
                          { label: 'Bearer', value: 'bearer' },
                          { label: 'X-API-Key', value: 'x-api-key' },
                          { label: 'None', value: 'none' },
                        ]}
                      />
                    </Form.Item>

                    <Form.Item name="responsesPath" label="Responses Path">
                      <Input
                        placeholder={
                          createProtocol === 'openai-responses' ? '/responses' : '可选'
                        }
                      />
                    </Form.Item>

                    <Form.Item name="chatPath" label="Chat Path">
                      <Input
                        placeholder={
                          createProtocol === 'openai-chat' ? '/chat/completions' : '可选'
                        }
                      />
                    </Form.Item>

                    <Form.Item name="messagesPath" label="Messages Path">
                      <Input
                        placeholder={
                          createProtocol === 'anthropic-messages' ? '/v1/messages' : '可选'
                        }
                      />
                    </Form.Item>

                    <Form.Item name="anthropicVersion" label="Anthropic Version">
                      <Input placeholder="仅 Anthropic Messages 协议需要" />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
  )
}

export default AIModelConfigPanel
