import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  App,
  Button,
  Collapse,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Switch,
  Typography,
} from 'antd'
import type { NativeFormWidgetConfig, Widget } from '@/types'
import EventRouteConfig from '@/components/EventRouteConfig'
import EventLinkageConfig from '@/components/ConfigDialog/configs/EventLinkageConfig'
import {
  normalizeEventInputsForForm,
  normalizeEventInputsForSave,
  normalizeEventOutputsForForm,
  normalizeEventOutputsForSave,
} from '@/components/ConfigDialog'
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs'
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton'
import BackgroundSettings from '@/components/BackgroundSettings'
import GlobalThemeReferenceFields from '@/components/GlobalThemeReferenceFields'
import WidgetTitleSettings from '@/components/WidgetTitleSettings'
import { useCanvasTheme } from '@/hooks/useCanvasTheme'
import { useStore } from '@/store/useStore'
import { useGlobalConfigStore } from '@/store/useGlobalConfigStore'
import { useNativeFormDesignerStore } from '@/native-form/designer/store/use-native-form-designer-store'
import { normalizeNativeFormConfig } from '@/native-form/shared/defaults'
import {
  applyNativeFormFieldFormValues,
  buildNativeFormFieldFormValues,
  findNativeFormNodeById,
  normalizeNativeFormStyleSize,
  updateNativeFormNodeById,
} from '@/native-form/shared/field-helpers'
import NativeFormFieldConfigForm from '@/native-form/designer/components/native-form-field-config-form'
import NativeFormLabeledItem from '@/native-form/designer/components/native-form-labeled-item'
import useSanitizeFormLabels from '@/native-form/designer/hooks/use-sanitize-form-labels'
import { NATIVE_FORM_SUBMIT_SENDER_EVENTS } from '@/native-form/runtime/native-form-renderer'
import {
  normalizeImportedNativeFormSchema,
  validateNativeFormSchema,
} from '@/native-form/shared/schema-validator'
import {
  buildBackgroundFormValues,
  buildWidgetTitleStyleFormValues,
  getDefaultGlobalThemeId,
  getGlobalThemeOptions,
  getGlobalThemeScheme,
  getInvalidGlobalThemeFallbackBackground,
  getInvalidGlobalThemeFallbackWidgetTitle,
  hasGlobalThemeScheme,
} from '@/utils/global-config'
import { normalizeNativeFormColorValue } from '@/native-form/shared/color-value'
import { keyValueListToObject, objectToKeyValueList } from '@/utils/widgetApi'
import '@/components/ConfigDialog/index.scss'
import './native-form-config-panel.scss'

interface NativeFormConfigPanelProps {
  widget: Widget
  onClose: () => void
  onRegisterSaveHandler?: (handler: (() => Promise<boolean>) | null) => void
}

const hasGridCellTruncationConflict = (
  prevField: ReturnType<typeof findNativeFormNodeById>,
  nextColumns: number,
) => {
  if (!prevField || prevField.type !== 'grid') {
    return false
  }

  const currentCells = Array.isArray(prevField.gridCells) ? prevField.gridCells : []
  return currentCells.slice(nextColumns).some(cell => Boolean(cell.node))
}

const buildHeaders = (headersList?: Array<{ key?: string; value?: string }>) => {
  if (!Array.isArray(headersList)) {
    return undefined
  }

  const headers = headersList.reduce<Record<string, string>>((result, item) => {
    const key = item?.key?.trim()
    if (key) {
      result[key] = item.value || ''
    }
    return result
  }, {})

  return Object.keys(headers).length ? headers : undefined
}

const normalizeNumberValue = (value: any, fallbackValue?: number) => {
  if (value === undefined || value === null || value === '') {
    return fallbackValue
  }

  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : fallbackValue
}

const normalizeLayoutColValue = (value: any, fallbackValue?: Record<string, any> | string) => {
  if (value === undefined || value === null || value === '') {
    return fallbackValue
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : fallbackValue
    } catch {
      return fallbackValue
    }
  }

  return typeof value === 'object' && !Array.isArray(value)
    ? value
    : fallbackValue
}

const NativeFormConfigPanel: React.FC<NativeFormConfigPanelProps> = ({
  widget,
  onClose,
  onRegisterSaveHandler,
}) => {
  const { message } = App.useApp()
  const [containerForm] = Form.useForm()
  const [fieldForm] = Form.useForm()
  const rootRef = useRef<HTMLDivElement>(null)
  const updateWidget = useStore(state => state.updateWidget)
  const widgets = useStore(state => state.widgets)
  const groups = useStore(state => state.groups)
  const floatingModules = useStore(state => state.floatingModules)
  const globalConfigDetail = useGlobalConfigStore(state => state.detail)
  const ensureGlobalConfigLoaded = useGlobalConfigStore(state => state.ensureLoaded)
  const selectedNodeId = useNativeFormDesignerStore(state => state.selectedNodeId)
  const setSelectedNodeId = useNativeFormDesignerStore(state => state.setSelectedNodeId)
  const normalizedConfig = useMemo(
    () => normalizeNativeFormConfig(widget.config as NativeFormWidgetConfig),
    [widget.config],
  )
  const { styleTokens } = useCanvasTheme()
  const submitMode = Form.useWatch('submitMode', containerForm) || 'api'
  const layoutMode = Form.useWatch('layoutMode', containerForm) || 'horizontal'
  const titleUseGlobalConfig = Form.useWatch('titleUseGlobalConfig', containerForm) ?? false
  const titleGlobalThemeId = Form.useWatch('titleGlobalThemeId', containerForm)
  const backgroundUseGlobalConfig = Form.useWatch('backgroundUseGlobalConfig', containerForm) ?? false
  const backgroundGlobalThemeId = Form.useWatch('backgroundGlobalThemeId', containerForm)
  const canvasTitleColor = styleTokens?.widget?.titleColor
  const globalThemeOptions = useMemo(
    () => getGlobalThemeOptions(globalConfigDetail),
    [globalConfigDetail],
  )

  useSanitizeFormLabels(rootRef)

  const resetTitleGlobalThemeReference = useCallback(() => {
    containerForm.setFieldsValue({
      titleUseGlobalConfig: false,
      titleGlobalThemeId: undefined,
      ...buildWidgetTitleStyleFormValues(getInvalidGlobalThemeFallbackWidgetTitle('nativeForm')),
    })
  }, [containerForm])

  const resetBackgroundGlobalThemeReference = useCallback(() => {
    containerForm.setFieldsValue({
      backgroundUseGlobalConfig: false,
      backgroundGlobalThemeId: undefined,
      ...buildBackgroundFormValues(getInvalidGlobalThemeFallbackBackground('widget')),
    })
  }, [containerForm])

  const selectedField = useMemo(
    () => findNativeFormNodeById(normalizedConfig.formSchema.children, selectedNodeId),
    [normalizedConfig.formSchema.children, selectedNodeId],
  )

  const updateNativeFormConfig = useCallback((nextConfig: NativeFormWidgetConfig) => {
    updateWidget(widget.id, {
      title: nextConfig.title || widget.title,
      config: nextConfig,
    })
  }, [updateWidget, widget.id, widget.title])

  const buildContainerConfigFromValues = useCallback((
    allValues: Record<string, any>,
  ): NativeFormWidgetConfig => ({
    ...normalizedConfig,
    title: allValues.title ?? normalizedConfig.title,
    showTitle: allValues.showTitle ?? normalizedConfig.showTitle,
    titleUseGlobalConfig:
      allValues.titleUseGlobalConfig ?? normalizedConfig.titleUseGlobalConfig,
    titleGlobalThemeId:
      allValues.titleGlobalThemeId ?? normalizedConfig.titleGlobalThemeId,
    titleColor: normalizeNativeFormColorValue(
      allValues.titleColor,
      normalizedConfig.titleColor,
    ),
    titleFontSize: normalizeNumberValue(
      allValues.titleFontSize,
      normalizedConfig.titleFontSize,
    ),
    titleFontWeight:
      allValues.titleFontWeight ?? normalizedConfig.titleFontWeight,
    contentPadding: normalizeNumberValue(
      allValues.contentPadding,
      normalizedConfig.contentPadding,
    ),
    backgroundUseGlobalConfig:
      allValues.backgroundUseGlobalConfig ?? normalizedConfig.backgroundUseGlobalConfig,
    backgroundGlobalThemeId:
      allValues.backgroundGlobalThemeId ?? normalizedConfig.backgroundGlobalThemeId,
    backgroundType: allValues.backgroundType ?? normalizedConfig.backgroundType,
    backgroundColor: normalizeNativeFormColorValue(
      allValues.backgroundColor,
      normalizedConfig.backgroundColor,
    ),
    backgroundImage:
      allValues.backgroundImage ?? normalizedConfig.backgroundImage,
    backgroundGradient:
      allValues.backgroundGradient ?? normalizedConfig.backgroundGradient,
    backgroundSize:
      allValues.backgroundSize ?? normalizedConfig.backgroundSize,
    backgroundRepeat:
      allValues.backgroundRepeat ?? normalizedConfig.backgroundRepeat,
    backgroundPosition:
      allValues.backgroundPosition ?? normalizedConfig.backgroundPosition,
    backdropBlur: normalizeNumberValue(
      allValues.backdropBlur,
      normalizedConfig.backdropBlur,
    ),
    boxShadow: allValues.boxShadow ?? normalizedConfig.boxShadow,
    formSchema: {
      ...normalizedConfig.formSchema,
      meta: {
        ...normalizedConfig.formSchema.meta,
        name: allValues.metaName ?? normalizedConfig.formSchema.meta?.name,
        description:
          allValues.metaDescription ?? normalizedConfig.formSchema.meta?.description,
      },
      layout: {
        ...normalizedConfig.formSchema.layout,
        mode: allValues.layoutMode ?? normalizedConfig.formSchema.layout.mode,
        labelWidth:
          allValues.labelWidth ?? normalizedConfig.formSchema.layout.labelWidth,
        labelCol: normalizeLayoutColValue(
          allValues.labelCol,
          normalizedConfig.formSchema.layout.labelCol,
        ),
        wrapperCol: normalizeLayoutColValue(
          allValues.wrapperCol,
          normalizedConfig.formSchema.layout.wrapperCol,
        ),
        fieldSpacing:
          allValues.fieldSpacing ?? normalizedConfig.formSchema.layout.fieldSpacing,
        labelAlign:
          allValues.labelAlign ?? normalizedConfig.formSchema.layout.labelAlign,
        colon:
          allValues.layoutColon ?? normalizedConfig.formSchema.layout.colon,
        size:
          allValues.layoutSize ?? normalizedConfig.formSchema.layout.size,
        variant:
          allValues.layoutVariant ?? normalizedConfig.formSchema.layout.variant,
      },
    },
    submitConfig: {
      ...normalizedConfig.submitConfig,
      mode: allValues.submitMode ?? normalizedConfig.submitConfig?.mode,
      submitButtonText:
        allValues.submitButtonText ?? normalizedConfig.submitConfig?.submitButtonText,
      apiMethod: allValues.apiMethod ?? normalizedConfig.submitConfig?.apiMethod,
      apiEndpoint: allValues.apiEndpoint ?? normalizedConfig.submitConfig?.apiEndpoint,
      apiHeaders: buildHeaders(allValues.apiHeadersList),
      apiQuery: keyValueListToObject(allValues.apiQueryList),
      apiBody: keyValueListToObject(allValues.apiBodyList),
      eventRoutes:
        allValues.eventRoutes ?? normalizedConfig.submitConfig?.eventRoutes ?? [],
      successMessage:
        allValues.successMessage ?? normalizedConfig.submitConfig?.successMessage,
      failureMessage:
        allValues.failureMessage ?? normalizedConfig.submitConfig?.failureMessage,
    },
    eventOutputs: normalizeEventOutputsForSave(allValues.eventOutputs || []),
    eventInputs: normalizeEventInputsForSave(allValues.eventInputs || []),
    appearance: {
      ...normalizedConfig.appearance,
      bordered: allValues.appearanceBordered ?? normalizedConfig.appearance?.bordered,
      padding: normalizeNativeFormStyleSize(
        allValues.appearancePadding ?? normalizedConfig.appearance?.padding,
      ),
      borderRadius:
        normalizeNativeFormStyleSize(
          allValues.appearanceBorderRadius ?? normalizedConfig.appearance?.borderRadius,
        ),
      backgroundColor: normalizeNativeFormColorValue(
        allValues.appearanceBackgroundColor,
        normalizedConfig.appearance?.backgroundColor,
      ),
      borderColor: normalizeNativeFormColorValue(
        allValues.appearanceBorderColor,
        normalizedConfig.appearance?.borderColor,
      ),
      boxShadow:
        allValues.appearanceBoxShadow ?? normalizedConfig.appearance?.boxShadow,
    },
  }), [normalizedConfig])

  const handleSave = useCallback(async () => {
    try {
      if (selectedField) {
        await fieldForm.validateFields()
        const fieldValues = fieldForm.getFieldsValue(true)
        if (
          selectedField.type === 'grid' &&
          hasGridCellTruncationConflict(
            selectedField,
            Math.max(1, Number(fieldValues.gridColumns ?? selectedField.columns ?? 1)),
          )
        ) {
          message.error('减少栅格列数前，请先移走将被移除格子中的字段')
          return false
        }

        const nextChildren = updateNativeFormNodeById(
          normalizedConfig.formSchema.children,
          selectedField.id,
          node => applyNativeFormFieldFormValues(node, fieldValues, {
            inheritLayoutColon: true,
          }),
        )

        const nextConfig = {
          ...normalizedConfig,
          formSchema: {
            ...normalizedConfig.formSchema,
            children: nextChildren,
          },
        }
        const validation = validateNativeFormSchema(nextConfig.formSchema)
        if (!validation.valid) {
          message.error(validation.errors[0] || '表单 schema 校验失败')
          return false
        }

        updateNativeFormConfig(nextConfig)
        setSelectedNodeId(selectedField.id)
      } else {
        await containerForm.validateFields()
        const containerValues = containerForm.getFieldsValue(true)
        const nextConfig = buildContainerConfigFromValues(containerValues)
        const validation = validateNativeFormSchema(nextConfig.formSchema)
        if (!validation.valid) {
          message.error(validation.errors[0] || '表单 schema 校验失败')
          return false
        }

        updateNativeFormConfig(nextConfig)
      }

      message.success('配置保存成功')
      return true
    } catch {
      message.error(
        selectedField
          ? '请先完善当前字段的必填配置项'
          : '请先完善表单配置中的必填项',
      )
      return false
    }
  }, [
    buildContainerConfigFromValues,
    containerForm,
    fieldForm,
    message,
    normalizedConfig,
    selectedField,
    setSelectedNodeId,
    updateNativeFormConfig,
  ])

  const handleExportSchema = useCallback(() => {
    try {
      const schemaText = JSON.stringify(normalizedConfig.formSchema, null, 2)
      const blob = new Blob([schemaText], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${(normalizedConfig.formSchema.meta?.name || widget.title || 'native-form').trim() || 'native-form'}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success('表单 schema 已导出')
    } catch {
      message.error('表单 schema 导出失败')
    }
  }, [message, normalizedConfig.formSchema, widget.title])

  const handleImportSchema = useCallback(() => {
    try {
      const text = window.prompt('请粘贴要导入的表单 schema JSON')
      if (!text?.trim()) {
        return
      }

      const parsed = JSON.parse(text)
      const nextSchema = normalizeImportedNativeFormSchema(parsed)
      updateNativeFormConfig({
        ...normalizedConfig,
        formSchema: nextSchema,
      })
      message.success('表单 schema 导入成功')
    } catch (error: any) {
      message.error(error?.message || '表单 schema 导入失败')
    }
  }, [message, normalizedConfig, updateNativeFormConfig])

  useEffect(() => {
    onRegisterSaveHandler?.(handleSave)
    return () => {
      onRegisterSaveHandler?.(null)
    }
  }, [handleSave, onRegisterSaveHandler])

  useEffect(() => {
    void ensureGlobalConfigLoaded()
  }, [ensureGlobalConfigLoaded])

  useEffect(() => {
    if (!globalConfigDetail || !titleUseGlobalConfig) {
      return
    }

    if (titleGlobalThemeId && !hasGlobalThemeScheme(globalConfigDetail, titleGlobalThemeId)) {
      resetTitleGlobalThemeReference()
      return
    }

    const nextThemeId = titleGlobalThemeId || getDefaultGlobalThemeId(globalConfigDetail)
    if (!titleGlobalThemeId && nextThemeId) {
      containerForm.setFieldValue('titleGlobalThemeId', nextThemeId)
      return
    }

    const theme = getGlobalThemeScheme(globalConfigDetail, nextThemeId)
    if (theme?.widgetTitle) {
      containerForm.setFieldsValue(buildWidgetTitleStyleFormValues(theme.widgetTitle))
    }
  }, [
    containerForm,
    globalConfigDetail,
    resetTitleGlobalThemeReference,
    titleGlobalThemeId,
    titleUseGlobalConfig,
  ])

  useEffect(() => {
    if (!globalConfigDetail || !backgroundUseGlobalConfig) {
      return
    }

    if (
      backgroundGlobalThemeId &&
      !hasGlobalThemeScheme(globalConfigDetail, backgroundGlobalThemeId)
    ) {
      resetBackgroundGlobalThemeReference()
      return
    }

    const nextThemeId = backgroundGlobalThemeId || getDefaultGlobalThemeId(globalConfigDetail)
    if (!backgroundGlobalThemeId && nextThemeId) {
      containerForm.setFieldValue('backgroundGlobalThemeId', nextThemeId)
      return
    }

    const theme = getGlobalThemeScheme(globalConfigDetail, nextThemeId)
    if (theme?.widgetBackground) {
      containerForm.setFieldsValue(buildBackgroundFormValues(theme.widgetBackground))
    }
  }, [
    backgroundGlobalThemeId,
    backgroundUseGlobalConfig,
    containerForm,
    globalConfigDetail,
    resetBackgroundGlobalThemeReference,
  ])

  useEffect(() => {
    containerForm.setFieldsValue({
      title: widget.title,
      titleUseGlobalConfig: normalizedConfig.titleUseGlobalConfig ?? false,
      titleGlobalThemeId: normalizedConfig.titleGlobalThemeId,
      showTitle: normalizedConfig.showTitle !== false,
      titleColor: normalizedConfig.titleColor,
      titleFontSize: normalizedConfig.titleFontSize,
      titleFontWeight: normalizedConfig.titleFontWeight,
      contentPadding: normalizedConfig.contentPadding,
      backgroundUseGlobalConfig: normalizedConfig.backgroundUseGlobalConfig ?? false,
      backgroundGlobalThemeId: normalizedConfig.backgroundGlobalThemeId,
      backgroundType: normalizedConfig.backgroundType || 'color',
      backgroundColor: normalizedConfig.backgroundColor,
      backgroundImage: normalizedConfig.backgroundImage,
      backgroundGradient: normalizedConfig.backgroundGradient,
      backgroundSize: normalizedConfig.backgroundSize,
      backgroundRepeat: normalizedConfig.backgroundRepeat,
      backgroundPosition: normalizedConfig.backgroundPosition,
      backdropBlur: normalizedConfig.backdropBlur,
      boxShadow: normalizedConfig.boxShadow,
      metaName: normalizedConfig.formSchema.meta?.name,
      metaDescription: normalizedConfig.formSchema.meta?.description,
      layoutMode: normalizedConfig.formSchema.layout.mode,
      labelWidth: normalizedConfig.formSchema.layout.labelWidth,
      labelCol: normalizeLayoutColValue(normalizedConfig.formSchema.layout.labelCol, { span: 6 }),
      wrapperCol: normalizeLayoutColValue(normalizedConfig.formSchema.layout.wrapperCol, { span: 12 }),
      fieldSpacing: normalizedConfig.formSchema.layout.fieldSpacing,
      labelAlign: normalizedConfig.formSchema.layout.labelAlign,
      layoutColon: normalizedConfig.formSchema.layout.colon,
      layoutSize: normalizedConfig.formSchema.layout.size,
      layoutVariant: normalizedConfig.formSchema.layout.variant,
      appearancePadding: normalizedConfig.appearance?.padding,
      appearanceBordered: normalizedConfig.appearance?.bordered,
      appearanceBorderRadius: normalizedConfig.appearance?.borderRadius,
      appearanceBackgroundColor: normalizedConfig.appearance?.backgroundColor,
      appearanceBorderColor: normalizedConfig.appearance?.borderColor,
      appearanceBoxShadow: normalizedConfig.appearance?.boxShadow,
      submitMode: normalizedConfig.submitConfig?.mode,
      submitButtonText: normalizedConfig.submitConfig?.submitButtonText,
      apiMethod: normalizedConfig.submitConfig?.apiMethod,
      apiEndpoint: normalizedConfig.submitConfig?.apiEndpoint,
      apiHeadersList: normalizedConfig.submitConfig?.apiHeaders
        ? Object.entries(normalizedConfig.submitConfig.apiHeaders).map(([key, value]) => ({
            key,
            value,
          }))
        : [],
      apiQueryList: objectToKeyValueList(normalizedConfig.submitConfig?.apiQuery),
      apiBodyList: objectToKeyValueList(normalizedConfig.submitConfig?.apiBody),
      eventRoutes: normalizedConfig.submitConfig?.eventRoutes || [],
      eventOutputs: normalizeEventOutputsForForm(normalizedConfig.eventOutputs || []),
      eventInputs: normalizeEventInputsForForm(normalizedConfig.eventInputs || []),
      successMessage: normalizedConfig.submitConfig?.successMessage,
      failureMessage: normalizedConfig.submitConfig?.failureMessage,
    })
  }, [containerForm, normalizedConfig, widget.title])

  useEffect(() => {
    fieldForm.setFieldsValue(buildNativeFormFieldFormValues(selectedField, {
      colon: normalizedConfig.formSchema.layout.colon,
    }))
  }, [fieldForm, normalizedConfig.formSchema.layout.colon, selectedField])

  const renderContainerConfig = () => (
    <Form form={containerForm} layout="vertical" className="native-form-config-panel__form">
      <Collapse
        bordered={false}
        defaultActiveKey={['meta']}
        className="native-form-config-panel__collapse"
        items={[
          {
            key: 'meta',
            label: '表单基础信息',
            children: (
              <>
                <NativeFormLabeledItem
                  name="title"
                  labelText="组件标题"
                  rules={[{ required: true, whitespace: true, message: '请输入组件标题' }]}
                >
                  <Input placeholder="请输入组件标题" />
                </NativeFormLabeledItem>

                <div className="native-form-config-panel__section-title">标题设置</div>
                <GlobalThemeReferenceFields
                  form={containerForm}
                  useFieldName="titleUseGlobalConfig"
                  themeIdFieldName="titleGlobalThemeId"
                  options={globalThemeOptions}
                  hint="开启后会自动填入全局主题中的组件标题设置，引用期间不可编辑。"
                />
                <WidgetTitleSettings disabled={titleUseGlobalConfig} defaultTitleColor={canvasTitleColor} />

                <NativeFormLabeledItem name="contentPadding" labelText="内容边距">
                  <InputNumber
                    min={0}
                    max={80}
                    precision={0}
                    style={{ width: '100%' }}
                    placeholder="0"
                  />
                </NativeFormLabeledItem>

                <NativeFormLabeledItem
                  name="metaName"
                  labelText="表单名称"
                  rules={[{ required: true, whitespace: true, message: '请输入表单名称' }]}
                >
                  <Input placeholder="请输入表单名称" />
                </NativeFormLabeledItem>

                <NativeFormLabeledItem name="metaDescription" labelText="表单描述">
                  <Input.TextArea rows={3} placeholder="请输入表单描述" />
                </NativeFormLabeledItem>
              </>
            ),
          },
          {
            key: 'widget-background',
            label: '组件背景设置',
            children: (
              <>
                <GlobalThemeReferenceFields
                  form={containerForm}
                  useFieldName="backgroundUseGlobalConfig"
                  themeIdFieldName="backgroundGlobalThemeId"
                  options={globalThemeOptions}
                  hint="开启后会自动填入全局主题中的组件背景设置，引用期间不可编辑。"
                />
                <BackgroundSettings
                  form={containerForm}
                  initialValues={normalizedConfig as any}
                  disabled={backgroundUseGlobalConfig}
                />
              </>
            ),
          },
          {
            key: 'layout',
            label: '布局配置',
            children: (
              <>
                <NativeFormLabeledItem name="layoutMode" labelText="布局模式">
                  <Select
                    options={[
                      { label: '纵向', value: 'vertical' },
                      { label: '横向', value: 'horizontal' },
                      { label: '行内', value: 'inline' },
                    ]}
                  />
                </NativeFormLabeledItem>

                {layoutMode === 'horizontal' ? (
                  <>
                    <NativeFormLabeledItem name={['labelCol', 'span']} labelText="标签栅格占比">
                      <InputNumber min={0} max={24} precision={0} style={{ width: '100%' }} />
                    </NativeFormLabeledItem>

                    <NativeFormLabeledItem name={['wrapperCol', 'span']} labelText="控件栅格占比">
                      <InputNumber min={0} max={24} precision={0} style={{ width: '100%' }} />
                    </NativeFormLabeledItem>
                  </>
                ) : null}

                <NativeFormLabeledItem name="fieldSpacing" labelText="字段间距">
                  <InputNumber min={0} max={64} style={{ width: '100%' }} />
                </NativeFormLabeledItem>

                <NativeFormLabeledItem name="labelAlign" labelText="标题对齐">
                  <Select
                    options={[
                      { label: '左对齐', value: 'left' },
                      { label: '右对齐', value: 'right' },
                    ]}
                  />
                </NativeFormLabeledItem>

                <div className="native-form-config-panel__field-block">
                  <Typography.Text>显示冒号</Typography.Text>
                  <Form.Item name="layoutColon" valuePropName="checked">
                    <Switch aria-label="显示冒号" />
                  </Form.Item>
                </div>

                <NativeFormLabeledItem name="layoutSize" labelText="控件尺寸">
                  <Select
                    options={[
                      { label: '小', value: 'small' },
                      { label: '中', value: 'middle' },
                      { label: '大', value: 'large' },
                    ]}
                  />
                </NativeFormLabeledItem>

                <NativeFormLabeledItem name="layoutVariant" labelText="控件风格">
                  <Select
                    options={[
                      { label: '默认', value: 'outlined' },
                      { label: '无边框', value: 'borderless' },
                      { label: '填充', value: 'filled' },
                    ]}
                  />
                </NativeFormLabeledItem>
              </>
            ),
          },
          {
            key: 'submit',
            label: '提交配置',
            children: (
              <>
                <div className="native-form-config-panel__field-block">
                  <Typography.Text>提交方式</Typography.Text>
                  <Form.Item name="submitMode">
                    <Radio.Group aria-label="表单提交方式">
                      <Radio.Button value="none">不提交</Radio.Button>
                      <Radio.Button value="api">API 接口</Radio.Button>
                      <Radio.Button value="eventRoute">事件路由</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </div>

                {submitMode === 'api' ? (
                  <>
                    <div className="native-form-config-panel__field-block widget-api-form-item">
                      <Typography.Text>接口地址</Typography.Text>
                      <div className="widget-api-endpoint-row">
                        <Form.Item name="apiMethod" noStyle initialValue="POST">
                          <Select
                            className="widget-api-endpoint-row__method"
                            options={[
                              { value: 'GET', label: 'GET' },
                              { value: 'POST', label: 'POST' },
                              { value: 'PUT', label: 'PUT' },
                              { value: 'PATCH', label: 'PATCH' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item
                          name="apiEndpoint"
                          noStyle
                          rules={[{ required: true, message: '请输入接口地址' }]}
                        >
                          <Input
                            className="widget-api-endpoint-row__input"
                            placeholder="/api/native-form-submit"
                          />
                        </Form.Item>
                      </div>
                    </div>

                    <div className="native-form-config-panel__field-block widget-api-form-item">
                      <Typography.Text>参数配置</Typography.Text>
                      <WidgetApiConfigTabs
                        form={containerForm}
                        methodName="apiMethod"
                        headersName="apiHeadersList"
                        queryName="apiQueryList"
                        bodyName="apiBodyList"
                        debugContent={
                          <WidgetApiDebugButton
                            form={containerForm}
                            buildConfig={formValues => ({
                              endpoint: formValues?.apiEndpoint,
                              method: formValues?.apiMethod || 'POST',
                              headers: buildHeaders(formValues?.apiHeadersList),
                              query: keyValueListToObject(formValues?.apiQueryList),
                              body: keyValueListToObject(formValues?.apiBodyList),
                            })}
                          />
                        }
                        debugHint="GET 请求仅使用 Query 参数，POST、PUT、PATCH 可同时配置 Body。"
                      />
                    </div>
                  </>
                ) : null}

                {submitMode === 'eventRoute' ? (
                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>事件路由</Typography.Text>
                    <Typography.Text type="secondary">
                      表单提交结果将通过 portal 事件总线发送给目标微应用。
                    </Typography.Text>
                    <Form.Item name="eventRoutes" noStyle>
                      <EventRouteConfig
                        currentWidgetId={widget.id}
                        senderEvents={NATIVE_FORM_SUBMIT_SENDER_EVENTS}
                      />
                    </Form.Item>
                  </div>
                ) : null}

                <div className="native-form-config-panel__grid">
                  <NativeFormLabeledItem name="successMessage" labelText="成功提示">
                    <Input placeholder="表单提交成功" />
                  </NativeFormLabeledItem>

                  <NativeFormLabeledItem name="failureMessage" labelText="失败提示">
                    <Input placeholder="表单提交失败，请稍后重试" />
                  </NativeFormLabeledItem>
                </div>
              </>
            ),
          },
          {
            key: 'event-linkage',
            label: '联动配置',
            children: (
              <EventLinkageConfig
                form={containerForm}
                widget={widget}
                widgets={widgets}
                groups={groups}
                floatingModules={floatingModules}
              />
            ),
          },
          {
            key: 'appearance',
            label: '外观配置',
            children: (
              <>
                <NativeFormLabeledItem name="appearancePadding" labelText="内边距">
                  <Input placeholder="如 16 或 16px" />
                </NativeFormLabeledItem>

                <NativeFormLabeledItem
                  name="appearanceBorderRadius"
                  labelText="圆角半径"
                >
                  <Input placeholder="如 12 或 12px" />
                </NativeFormLabeledItem>

                <NativeFormLabeledItem
                  name="appearanceBackgroundColor"
                  labelText="背景色"
                >
                  <ColorPicker showText allowClear />
                </NativeFormLabeledItem>

                <NativeFormLabeledItem name="appearanceBorderColor" labelText="边框色">
                  <ColorPicker showText allowClear />
                </NativeFormLabeledItem>

                <NativeFormLabeledItem name="appearanceBoxShadow" labelText="阴影">
                  <Input placeholder="例如 0 8px 24px rgba(0,0,0,0.08)" />
                </NativeFormLabeledItem>

                <div className="native-form-config-panel__field-block">
                  <Typography.Text>显示边框</Typography.Text>
                  <Form.Item name="appearanceBordered" valuePropName="checked">
                    <Switch aria-label="显示边框" />
                  </Form.Item>
                </div>
              </>
            ),
          },
        ]}
      />
    </Form>
  )

  const renderFieldOnlyConfig = () => (
    <NativeFormFieldConfigForm
      form={fieldForm}
      field={selectedField!}
      currentWidgetId={widget.id}
      hideItemColon
      onValuesChange={() => undefined}
    />
  )

  return (
    <div ref={rootRef} className="native-form-config-panel">
      <div className="native-form-config-panel__header">
        <div>
          <Typography.Title level={5}>
            {selectedField ? '字段配置' : '表单配置'}
          </Typography.Title>
          <Typography.Text type="secondary">
            {selectedField
              ? `当前正在编辑字段：${selectedField.label || selectedField.field || selectedField.type}`
              : '当前正在编辑表单容器配置'}
          </Typography.Text>
        </div>
        <Button type="text" onClick={onClose}>
          关闭
        </Button>
      </div>

      <div className="native-form-config-panel__body">
        {selectedField ? renderFieldOnlyConfig() : renderContainerConfig()}
      </div>

      <div className="native-form-config-panel__footer">
        {!selectedField ? (
          <>
            <Button onClick={handleImportSchema}>导入 JSON</Button>
            <Button onClick={handleExportSchema}>导出 JSON</Button>
          </>
        ) : null}
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={() => void handleSave()}>
          保存
        </Button>
      </div>
    </div>
  )
}

export default NativeFormConfigPanel
