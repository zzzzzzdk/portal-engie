import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Tooltip,
  message,
} from 'antd'
import {
  ApiOutlined,
  BgColorsOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import BackgroundSettings from '@/components/BackgroundSettings'
import WidgetTitleSettings from '@/components/WidgetTitleSettings'
import {
  createThemeScheme,
  deleteThemeScheme,
  getGlobalConfigDetail,
  saveOpenCodeConfig,
  saveComponentDataSourceConfig,
  saveMessageCopyConfig,
  updateThemeScheme,
  type GlobalBackgroundConfig,
  type GlobalConfigDetail,
  type GlobalThemeScheme,
} from '@/services'
import { useGlobalConfigStore } from '@/store/useGlobalConfigStore'
import './index.scss'

type GlobalModuleKey =
  | 'theme'
  | 'component-data-source'
  | 'message-copy'
  | 'opencode-service'

type MessageCopyFormValues = {
  formSuccess?: string
  formError?: string
}

type OpenCodeConfigFormValues = {
  serviceUrl?: string
}

const MODULE_OPTIONS: Array<{
  key: GlobalModuleKey
  title: string
  description: string
  icon: React.ReactNode
}> = [
  {
    key: 'theme',
    title: '主题设计令牌',
    description: '统一管理页面背景、组件背景与组件标题样式。',
    icon: <BgColorsOutlined />,
  },
  {
    key: 'component-data-source',
    title: '组件数据源',
    description: '统一维护我的文档组件依赖的数据源地址。',
    icon: <DatabaseOutlined />,
  },
  // {
  //   key: 'message-copy',
  //   title: '消息文案配置',
  //   description: '维护自定义表单成功和失败的默认提示文案。',
  //   icon: <MessageOutlined />,
  // },
  {
    key: 'opencode-service',
    title: 'AI 服务',
    description: '统一维护 AI 助手通过后端代理访问的 AI 服务地址。',
    icon: <ApiOutlined />,
  },
]

const normalizeColorValue = (value: any): string | undefined => {
  if (!value) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && typeof value.toRgbString === 'function') {
    return value.toRgbString()
  }

  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString()
  }

  if (typeof value === 'object' && value.metaColor) {
    const { r, g, b, a } = value.metaColor
    if (a !== undefined && a < 1) {
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }

  return undefined
}

const buildBackgroundPayload = (values: any): GlobalBackgroundConfig => ({
  backgroundType: values.backgroundType || 'color',
  backgroundColor: normalizeColorValue(values.backgroundColor),
  backgroundImage: values.backgroundImage || undefined,
  backgroundGradient: values.backgroundGradient || undefined,
  backgroundSize: values.backgroundSize || undefined,
  backgroundRepeat: values.backgroundRepeat || undefined,
  backgroundPosition: values.backgroundPosition || undefined,
  backdropBlur:
    typeof values.backdropBlur === 'number' && !Number.isNaN(values.backdropBlur)
      ? values.backdropBlur
      : undefined,
  boxShadow: values.boxShadow || undefined,
})

const setBackgroundFormValues = (form: any, values?: GlobalBackgroundConfig) => {
  form.resetFields()
  form.setFieldsValue({
    backgroundType: values?.backgroundType || 'color',
    backgroundColor: values?.backgroundColor,
    backgroundImage: values?.backgroundImage,
    backgroundGradient: values?.backgroundGradient,
    backgroundSize: values?.backgroundSize,
    backgroundRepeat: values?.backgroundRepeat,
    backgroundPosition: values?.backgroundPosition,
    backdropBlur: values?.backdropBlur,
    boxShadow: values?.boxShadow,
  })
}

const buildMessageCopyFormValues = (
  messageCopies?: GlobalConfigDetail['messageCopies']
): MessageCopyFormValues => ({
  formSuccess: messageCopies?.['form.success'],
  formError: messageCopies?.['form.error'],
})

const buildOpenCodeConfigFormValues = (
  opencode?: GlobalConfigDetail['opencode']
): OpenCodeConfigFormValues => ({
  serviceUrl: opencode?.serviceUrl,
})

interface MessageCopyPanelProps {
  messageCopies?: GlobalConfigDetail['messageCopies']
  saving: boolean
  onSave: (values: MessageCopyFormValues) => Promise<void>
}

const MessageCopyPanel: React.FC<MessageCopyPanelProps> = ({
  messageCopies,
  saving,
  onSave,
}) => {
  const [form] = Form.useForm<MessageCopyFormValues>()

  useEffect(() => {
    form.setFieldsValue(buildMessageCopyFormValues(messageCopies))
  }, [form, messageCopies])

  const handleSave = async () => {
    const values = await form.validateFields()
    await onSave(values)
  }

  return (
    <div className="global-config-page__module-panel global-config-page__simple-panel">
      <div className="global-config-page__panel-intro">
        <div className="global-config-page__panel-title">消息文案配置</div>
        <div className="global-config-page__panel-description">
          <div>影响范围：自定义表单保存。</div>
          <div>影响策略：平台默认兜底，业务可覆盖文案。</div>
        </div>
      </div>

      <div className="global-config-page__panel-body">
        <Card className="global-config-page__content-card" bordered={false}>
          <div className="global-config-page__editor-header">
            <div>
              <div className="global-config-page__card-title">默认文案</div>
              <div className="global-config-page__card-tip">当前仅维护两个固定文案键</div>
            </div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => void handleSave()}
            >
              保存文案
            </Button>
          </div>

          <div className="global-config-page__content-scroll">
            <Form form={form} layout="vertical">
              <Form.Item
                name="formSuccess"
                label="form.success"
                rules={[{ required: true, whitespace: true, message: '请输入成功文案' }]}
              >
                <Input placeholder="请输入成功提示文案" maxLength={60} />
              </Form.Item>

              <Form.Item
                name="formError"
                label="form.error"
                rules={[{ required: true, whitespace: true, message: '请输入失败文案' }]}
              >
                <Input placeholder="请输入失败提示文案" maxLength={60} />
              </Form.Item>
            </Form>
          </div>
        </Card>
      </div>
    </div>
  )
}

const GlobalConfigPage: React.FC = () => {
  const setGlobalConfigDetail = useGlobalConfigStore(state => state.setDetail)
  const [themeBasicForm] = Form.useForm()
  const [pageBackgroundForm] = Form.useForm()
  const [widgetBackgroundForm] = Form.useForm()
  const [widgetTitleForm] = Form.useForm()
  const [componentDataSourceForm] = Form.useForm()
  const [opencodeConfigForm] = Form.useForm<OpenCodeConfigFormValues>()
  const [createThemeForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [activeModule, setActiveModule] = useState<GlobalModuleKey | null>("theme")
  const [configDetail, setConfigDetail] = useState<GlobalConfigDetail | null>(null)
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null)
  const [themeSaving, setThemeSaving] = useState(false)
  const [componentSaving, setComponentSaving] = useState(false)
  const [messageSaving, setMessageSaving] = useState(false)
  const [openCodeSaving, setOpenCodeSaving] = useState(false)
  const [createThemeOpen, setCreateThemeOpen] = useState(false)
  const [createThemeSaving, setCreateThemeSaving] = useState(false)

  const selectedTheme = useMemo<GlobalThemeScheme | null>(() => {
    if (!configDetail?.themes?.length) {
      return null
    }

    return configDetail.themes.find(item => item.id === selectedThemeId) || configDetail.themes[0]
  }, [configDetail, selectedThemeId])

  const fetchConfigDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getGlobalConfigDetail()
      if (res.code !== 20000 || !res.data) {
        return
      }

      const detail = res.data
      setConfigDetail(detail)
      setGlobalConfigDetail(detail)
      componentDataSourceForm.setFieldsValue(detail.componentDataSource)
      opencodeConfigForm.setFieldsValue(buildOpenCodeConfigFormValues(detail.opencode))
      setSelectedThemeId(prev => {
        if (prev && detail.themes.some(item => item.id === prev)) {
          return prev
        }
        return detail.currentThemeId || detail.themes[0]?.id || null
      })
    } catch (error) {
      console.error('加载全局配置失败', error)
    } finally {
      setLoading(false)
    }
  }, [componentDataSourceForm, opencodeConfigForm, setGlobalConfigDetail])

  useEffect(() => {
    fetchConfigDetail()
  }, [fetchConfigDetail])

  useEffect(() => {
    if (!selectedTheme) {
      themeBasicForm.resetFields()
      pageBackgroundForm.resetFields()
      widgetBackgroundForm.resetFields()
      widgetTitleForm.resetFields()
      return
    }

    themeBasicForm.setFieldsValue({
      name: selectedTheme.name,
    })
    setBackgroundFormValues(pageBackgroundForm, selectedTheme.pageBackground)
    setBackgroundFormValues(widgetBackgroundForm, selectedTheme.widgetBackground)
    widgetTitleForm.setFieldsValue({
      showTitle: selectedTheme.widgetTitle?.showTitle !== false,
      titleColor: selectedTheme.widgetTitle?.titleColor,
      titleFontSize: selectedTheme.widgetTitle?.titleFontSize,
      titleFontWeight: selectedTheme.widgetTitle?.titleFontWeight,
    })
  }, [
    pageBackgroundForm,
    selectedTheme,
    themeBasicForm,
    widgetBackgroundForm,
    widgetTitleForm,
  ])

  useEffect(() => {
    if (!configDetail) {
      return
    }

    let frameId = 0

    if (activeModule === 'component-data-source') {
      frameId = window.requestAnimationFrame(() => {
        componentDataSourceForm.setFieldsValue(configDetail.componentDataSource)
      })
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [activeModule, componentDataSourceForm, configDetail])

  const handleCreateTheme = async () => {
    try {
      const values = await createThemeForm.validateFields()
      setCreateThemeSaving(true)
      const res = await createThemeScheme({
        name: String(values.name || '').trim(),
      })

      if (res.code !== 20000 || !res.data?.id) {
        return
      }

      message.success('新增主题方案成功')
      setCreateThemeOpen(false)
      createThemeForm.resetFields()
      setSelectedThemeId(res.data.id)
      await fetchConfigDetail()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error('新增主题方案失败', error)
    } finally {
      setCreateThemeSaving(false)
    }
  }

  const handleSaveTheme = async () => {
    if (!selectedTheme) {
      return
    }

    try {
      setThemeSaving(true)
      const [basicValues, pageBackgroundValues, widgetBackgroundValues, widgetTitleValues] =
        await Promise.all([
          themeBasicForm.validateFields(),
          pageBackgroundForm.validateFields(),
          widgetBackgroundForm.validateFields(),
          widgetTitleForm.validateFields(),
        ])

      const res = await updateThemeScheme({
        id: selectedTheme.id,
        name: String(basicValues.name || '').trim(),
        pageBackground: buildBackgroundPayload(pageBackgroundValues),
        widgetBackground: buildBackgroundPayload(widgetBackgroundValues),
        widgetTitle: {
          showTitle: widgetTitleValues.showTitle !== false,
          titleColor: normalizeColorValue(widgetTitleValues.titleColor),
          titleFontSize:
            typeof widgetTitleValues.titleFontSize === 'number'
              ? widgetTitleValues.titleFontSize
              : undefined,
          titleFontWeight:
            widgetTitleValues.titleFontWeight !== undefined
              ? Number(widgetTitleValues.titleFontWeight)
              : undefined,
        },
      })

      if (res.code !== 20000) {
        return
      }

      message.success('保存主题方案成功')
      await fetchConfigDetail()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error('保存主题方案失败', error)
    } finally {
      setThemeSaving(false)
    }
  }

  const handleDeleteTheme = async () => {
    if (!selectedTheme) {
      return
    }

    try {
      const res = await deleteThemeScheme({ id: selectedTheme.id })
      if (res.code !== 20000) {
        return
      }

      message.success('删除主题方案成功')
      await fetchConfigDetail()
    } catch (error) {
      console.error('删除主题方案失败', error)
    }
  }

  const handleSaveComponentDataSource = async () => {
    try {
      const values = await componentDataSourceForm.validateFields()
      setComponentSaving(true)
      const res = await saveComponentDataSourceConfig({
        businessApiUrl: String(
          values.businessApiUrl || configDetail?.componentDataSource?.businessApiUrl || ''
        ).trim(),
        documentStorageUrl: String(values.documentStorageUrl || '').trim(),
      })

      if (res.code !== 20000) {
        return
      }

      message.success('保存组件数据源配置成功')
      await fetchConfigDetail()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error('保存组件数据源配置失败', error)
    } finally {
      setComponentSaving(false)
    }
  }

  const handleSaveMessageCopy = async (values?: MessageCopyFormValues) => {
    try {
      const nextValues = values
      if (!nextValues) {
        return
      }
      setMessageSaving(true)
      const res = await saveMessageCopyConfig({
        'form.success': String(nextValues.formSuccess || '').trim(),
        'form.error': String(nextValues.formError || '').trim(),
      })

      if (res.code !== 20000) {
        return
      }

      message.success('保存消息文案成功')
      await fetchConfigDetail()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error('保存消息文案失败', error)
    } finally {
      setMessageSaving(false)
    }
  }

  const handleSaveOpenCodeConfig = async () => {
    try {
      const values = await opencodeConfigForm.validateFields()
      setOpenCodeSaving(true)
      const res = await saveOpenCodeConfig({
        serviceUrl: String(values.serviceUrl || '').trim(),
      })

      if (res.code !== 20000) {
        return
      }

      message.success('保存 AI 服务配置成功')
      await fetchConfigDetail()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error('保存 AI 服务配置失败', error)
    } finally {
      setOpenCodeSaving(false)
    }
  }

  const renderThemePanel = () => {
    if (!selectedTheme || !configDetail) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无主题方案数据" />
    }

    return (
      <div className="global-config-page__module-panel global-config-page__theme-panel">
        <div className="global-config-page__panel-intro">
          <div className="global-config-page__panel-title">主题设计令牌</div>
          <div className="global-config-page__panel-description">
            <div>影响范围：组件背景和标题。</div>
            <div>影响策略：平台默认生效，允许业务主题覆盖；引用后优先影响视觉层，不直接改变业务行为。</div>
          </div>
        </div>

        <div className="global-config-page__panel-body">
          <div className="global-config-page__theme-layout">
            <Card className="global-config-page__theme-workspace-card" bordered={false}>
              <div className="global-config-page__theme-pane global-config-page__theme-pane--list">
                <div className="global-config-page__theme-list-header">
                  <div>
                    <div className="global-config-page__card-title">主题方案</div>
                    <div className="global-config-page__card-tip">选择方案，右侧编辑</div>
                  </div>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateThemeOpen(true)}>
                    新增主题
                  </Button>
                </div>

                <div className="global-config-page__theme-list-scroll">
                  <div className="global-config-page__theme-list">
                    {configDetail.themes.map(item => {
                      const active = item.id === selectedTheme.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`global-config-page__theme-item${active ? ' is-active' : ''}`}
                          onClick={() => setSelectedThemeId(item.id)}
                        >
                          <div className="global-config-page__theme-item-name">{item.name}</div>
                          <div className="global-config-page__theme-item-meta">
                            <span>{item.updatedAt || '未记录时间'}</span>
                            {active ? (
                              <span className="global-config-page__theme-item-tag">当前编辑</span>
                            ) : null}
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
                    <div className="global-config-page__card-title">方案详情</div>
                    <div className="global-config-page__card-tip">当前方案：{selectedTheme.name}</div>
                  </div>
                  <Space wrap>
                    <Popconfirm
                      title="确认删除当前主题方案吗？"
                      description="若工作台已引用当前方案，将会恢复到默认配置。是否确认删除？"
                      onConfirm={() => void handleDeleteTheme()}
                      okText="确认"
                      cancelText="取消"
                      disabled={configDetail.themes.length <= 1}
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        disabled={configDetail.themes.length <= 1}
                      >
                        删除主题
                      </Button>
                    </Popconfirm>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={themeSaving}
                      onClick={() => void handleSaveTheme()}
                    >
                      保存方案
                    </Button>
                  </Space>
                </div>

                <div className="global-config-page__theme-editor-scroll">
                  <Form form={themeBasicForm} layout="vertical">
                    <Form.Item
                      name="name"
                      label="主题方案名称"
                      rules={[{ required: true, whitespace: true, message: '请输入主题方案名称' }]}
                    >
                      <Input placeholder="请输入主题方案名称" maxLength={30} />
                    </Form.Item>
                  </Form>

                  <div className="global-config-page__section-card">
                    <div className="global-config-page__section-title">页面背景设置</div>
                    <Form form={pageBackgroundForm} layout="vertical">
                      <BackgroundSettings
                        form={pageBackgroundForm}
                        initialValues={selectedTheme.pageBackground}
                        showEffects={false}
                      />
                    </Form>
                  </div>

                  <div className="global-config-page__section-card">
                    <div className="global-config-page__section-title">组件背景设置</div>
                    <Form form={widgetBackgroundForm} layout="vertical">
                      <BackgroundSettings
                        form={widgetBackgroundForm}
                        initialValues={selectedTheme.widgetBackground}
                      />
                    </Form>
                  </div>

                  <div className="global-config-page__section-card">
                    <div className="global-config-page__section-title">组件标题设置</div>
                    <Form form={widgetTitleForm} layout="vertical">
                      <WidgetTitleSettings />
                    </Form>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const renderComponentDataSourcePanel = () => (
    <div className="global-config-page__module-panel global-config-page__simple-panel">
      <div className="global-config-page__panel-intro">
        <div className="global-config-page__panel-title">组件数据源配置</div>
        <div className="global-config-page__panel-description">
          <div>影响范围：我的文档组件数据源配置。</div>
          <div>影响策略：配置保存后立即写入全局配置，后续对接运行时直接复用该配置。</div>
        </div>
      </div>

      <div className="global-config-page__panel-body">
        <Card className="global-config-page__content-card" bordered={false}>
          <div className="global-config-page__editor-header">
            <div>
              <div className="global-config-page__card-title">数据源地址</div>
              <div className="global-config-page__card-tip">维护我的文档组件依赖的服务入口</div>
            </div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={componentSaving}
              onClick={() => void handleSaveComponentDataSource()}
            >
              保存配置
            </Button>
          </div>

          <div className="global-config-page__content-scroll">
            <Form form={componentDataSourceForm} layout="vertical">
              {/* 业务 API 地址设置暂时隐藏，保存时沿用现有配置值。 */}
              {/* <Form.Item
                name="businessApiUrl"
                initialValue={""}
                label={(
                  <Space size={6}>
                    <span>业务 API 地址</span>
                    <Tooltip title="文档组件调用“业务 API”的根地址">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                )}
                rules={[{ required: true, whitespace: true, message: '请输入业务 API 地址' }]}
              >
                <Input placeholder="例如：https://example.com/api 或 /api" />
              </Form.Item> */}

              <Form.Item
                name="documentStorageUrl"
                initialValue={"http://192.168.16.26:8010/api"}
                label={(
                  <Space size={6}>
                    <span>文档存储服务地址</span>
                    <Tooltip title="文档文件存储服务的访问地址">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                )}
                rules={[{ required: true, whitespace: true, message: '请输入文档存储服务地址' }]}
              >
                <Input placeholder="例如：https://example.com/minio-api 或 /minio-api" />
              </Form.Item>
            </Form>
          </div>
        </Card>
      </div>
    </div>
  )

  const renderOpenCodeServicePanel = () => (
    <div className="global-config-page__module-panel global-config-page__simple-panel">
      <div className="global-config-page__panel-intro">
        <div className="global-config-page__panel-title">AI 服务配置</div>
        <div className="global-config-page__panel-description">
          <div>影响范围：AI 助手通过后端代理连接 AI 服务。</div>
          <div>影响策略：保存后正式后端复用该服务地址，不再维护自定义模型配置。</div>
        </div>
      </div>

      <div className="global-config-page__panel-body">
        <Card className="global-config-page__content-card" bordered={false}>
          <div className="global-config-page__editor-header">
            <div>
              <div className="global-config-page__card-title">服务地址</div>
              <div className="global-config-page__card-tip">用于后端代理请求 AI 服务的根地址</div>
            </div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={openCodeSaving}
              onClick={() => void handleSaveOpenCodeConfig()}
            >
              保存配置
            </Button>
          </div>

          <div className="global-config-page__content-scroll">
            <Form form={opencodeConfigForm} layout="vertical">
              <Form.Item
                name="serviceUrl"
                label={(
                  <Space size={6}>
                    <span>AI 服务地址</span>
                    <Tooltip title="例如：http://127.0.0.1:8096。后端代理会基于这个地址转发到 AI 服务。">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                )}
                rules={[{ required: true, whitespace: true, message: '请输入 AI 服务地址' }]}
              >
                <Input placeholder="例如：http://127.0.0.1:8096" />
              </Form.Item>
            </Form>
          </div>
        </Card>
      </div>
    </div>
  )

  const renderMessageCopyPanel = () => (
    <MessageCopyPanel
      messageCopies={configDetail?.messageCopies}
      saving={messageSaving}
      onSave={handleSaveMessageCopy}
    />
  )

  const renderRightContent = () => {
    if (loading) {
      return (
        <Card
          className="global-config-page__content-card global-config-page__content-card--loading"
          bordered={false}
        >
          <Spin />
        </Card>
      )
    }

    if (!activeModule) {
      return (
        <div
          className="global-config-page__content-card global-config-page__content-card--empty"
        >
          <div className="global-config-page__empty-state">
            <div className="global-config-page__empty-icon">
              <BgColorsOutlined />
            </div>
            <div className="global-config-page__empty-title">选择一个配置模块开始设置</div>
            <div className="global-config-page__empty-description">
              请先在左侧选择一个全局配置模块，再在右侧查看说明并完成详细配置。
            </div>
          </div>
        </div>
      )
    }

    if (activeModule === 'theme') {
      return renderThemePanel()
    }

    if (activeModule === 'component-data-source') {
      return renderComponentDataSourcePanel()
    }

    if (activeModule === 'opencode-service') {
      return renderOpenCodeServicePanel()
    }

    return renderMessageCopyPanel()
  }

  return (
    <div className="global-config-page">
      <div className="global-config-page__layout">
        <Card className="global-config-page__sidebar" bordered={false}>
          <div className="global-config-page__sidebar-head">
            <div className="global-config-page__sidebar-title">全局配置</div>
            <div className="global-config-page__sidebar-subtitle">
              统一管理平台层面的默认样式、数据源与消息文案。
            </div>
          </div>

          <div className="global-config-page__sidebar-scroll">
            <div className="global-config-page__module-list">
              {MODULE_OPTIONS.map(item => {
                const active = item.key === activeModule
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`global-config-page__module-item${active ? ' is-active' : ''}`}
                    onClick={() => setActiveModule(item.key)}
                  >
                    <span className="global-config-page__module-icon">{item.icon}</span>
                    <span className="global-config-page__module-text">
                      <span className="global-config-page__module-name">{item.title}</span>
                      <span className="global-config-page__module-desc">{item.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        <div className="global-config-page__main">
          <div className="global-config-page__main-content">{renderRightContent()}</div>
        </div>
      </div>

      <Modal
        title="新增主题方案"
        open={createThemeOpen}
        onOk={() => void handleCreateTheme()}
        onCancel={() => {
          setCreateThemeOpen(false)
          createThemeForm.resetFields()
        }}
        confirmLoading={createThemeSaving}
        destroyOnHidden
      >
        <Form form={createThemeForm} layout="vertical">
          <Form.Item
            name="name"
            label="主题方案名称"
            rules={[{ required: true, whitespace: true, message: '请输入主题方案名称' }]}
          >
            <Input placeholder="请输入主题方案名称" maxLength={30} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GlobalConfigPage
