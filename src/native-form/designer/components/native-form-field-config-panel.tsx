import React, { useEffect, useMemo, useRef } from 'react'
import { App, Button, Form, Input, InputNumber, Switch, Tabs, Typography } from 'antd'
import BackgroundSettings from '@/components/BackgroundSettings'
import EventLinkageConfig from '@/components/ConfigDialog/configs/EventLinkageConfig'
import {
  normalizeEventInputsForForm,
  normalizeEventInputsForSave,
  normalizeEventOutputsForForm,
  normalizeEventOutputsForSave,
} from '@/components/ConfigDialog'
import GlobalThemeReferenceFields from '@/components/GlobalThemeReferenceFields'
import WidgetTitleSettings from '@/components/WidgetTitleSettings'
import { useCanvasTheme } from '@/hooks/useCanvasTheme'
import type { NativeFormFieldWidgetConfig, Widget } from '@/types'
import { useStore } from '@/store/useStore'
import { useGlobalConfigStore } from '@/store/useGlobalConfigStore'
import { normalizeNativeFormFieldConfig } from '@/native-form/shared/defaults'
import {
  applyNativeFormFieldFormValues,
  buildNativeFormFieldFormValues,
} from '@/native-form/shared/field-helpers'
import NativeFormFieldConfigForm from '@/native-form/designer/components/native-form-field-config-form'
import NativeFormLabeledItem from '@/native-form/designer/components/native-form-labeled-item'
import useSanitizeFormLabels from '@/native-form/designer/hooks/use-sanitize-form-labels'
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
import { validateNativeFormSchema } from '@/native-form/shared/schema-validator'
import '@/components/ConfigDialog/index.scss'
import './native-form-config-panel.scss'

interface NativeFormFieldConfigPanelProps {
  widget: Widget
  onClose: () => void
  onRegisterSaveHandler?: (handler: (() => Promise<boolean>) | null) => void
}

const NativeFormFieldConfigPanel: React.FC<NativeFormFieldConfigPanelProps> = ({
  widget,
  onClose,
  onRegisterSaveHandler,
}) => {
  const { message } = App.useApp()
  const [baseForm] = Form.useForm()
  const [fieldForm] = Form.useForm()
  const rootRef = useRef<HTMLDivElement>(null)
  const updateWidget = useStore(state => state.updateWidget)
  const widgets = useStore(state => state.widgets)
  const groups = useStore(state => state.groups)
  const floatingModules = useStore(state => state.floatingModules)
  const globalConfigDetail = useGlobalConfigStore(state => state.detail)
  const ensureGlobalConfigLoaded = useGlobalConfigStore(state => state.ensureLoaded)
  const normalizedConfig = useMemo(
    () => normalizeNativeFormFieldConfig(widget.config as NativeFormFieldWidgetConfig),
    [widget.config],
  )
  const { styleTokens } = useCanvasTheme()
  const titleUseGlobalConfig = Form.useWatch('titleUseGlobalConfig', baseForm) ?? false
  const titleGlobalThemeId = Form.useWatch('titleGlobalThemeId', baseForm)
  const backgroundUseGlobalConfig = Form.useWatch('backgroundUseGlobalConfig', baseForm) ?? false
  const backgroundGlobalThemeId = Form.useWatch('backgroundGlobalThemeId', baseForm)
  const canvasTitleColor = styleTokens?.widget?.titleColor
  const globalThemeOptions = useMemo(
    () => getGlobalThemeOptions(globalConfigDetail),
    [globalConfigDetail],
  )

  useSanitizeFormLabels(rootRef)

  const resetTitleGlobalThemeReference = () => {
    baseForm.setFieldsValue({
      titleUseGlobalConfig: false,
      titleGlobalThemeId: undefined,
      ...buildWidgetTitleStyleFormValues(getInvalidGlobalThemeFallbackWidgetTitle('nativeFormField')),
    })
  }

  const resetBackgroundGlobalThemeReference = () => {
    baseForm.setFieldsValue({
      backgroundUseGlobalConfig: false,
      backgroundGlobalThemeId: undefined,
      ...buildBackgroundFormValues(getInvalidGlobalThemeFallbackBackground('widget')),
    })
  }

  const handleSave = async () => {
    try {
      await baseForm.validateFields()
      await fieldForm.validateFields()

      const baseValues = baseForm.getFieldsValue(true)
      const fieldValues = fieldForm.getFieldsValue(true)
      const nextField = applyNativeFormFieldFormValues(normalizedConfig.field, fieldValues)
      const validation = validateNativeFormSchema({
        version: 1,
        meta: { name: '字段组件校验', description: '' },
        layout: {
          mode: 'vertical',
          labelWidth: 96,
          fieldSpacing: 16,
          labelAlign: 'right',
          colon: true,
          size: 'middle',
          variant: 'outlined',
        },
        children: [nextField],
      })
      if (!validation.valid) {
        message.error(validation.errors[0] || '字段 schema 校验失败')
        return false
      }
      const nextTitle = baseValues.title ?? widget.title

      updateWidget(widget.id, {
        title: nextTitle,
        config: {
          ...normalizedConfig,
          title: nextTitle,
          showTitle: baseValues.showTitle ?? normalizedConfig.showTitle,
          titleUseGlobalConfig:
            baseValues.titleUseGlobalConfig ?? normalizedConfig.titleUseGlobalConfig,
          titleGlobalThemeId:
            baseValues.titleGlobalThemeId ?? normalizedConfig.titleGlobalThemeId,
          titleColor: normalizeNativeFormColorValue(
            baseValues.titleColor,
            normalizedConfig.titleColor,
          ),
          titleFontSize: baseValues.titleFontSize ?? normalizedConfig.titleFontSize,
          titleFontWeight: baseValues.titleFontWeight ?? normalizedConfig.titleFontWeight,
          backgroundUseGlobalConfig:
            baseValues.backgroundUseGlobalConfig ?? normalizedConfig.backgroundUseGlobalConfig,
          backgroundGlobalThemeId:
            baseValues.backgroundGlobalThemeId ?? normalizedConfig.backgroundGlobalThemeId,
          backgroundType: baseValues.backgroundType ?? normalizedConfig.backgroundType,
          backgroundColor: normalizeNativeFormColorValue(
            baseValues.backgroundColor,
            normalizedConfig.backgroundColor,
          ),
          backgroundImage: baseValues.backgroundImage ?? normalizedConfig.backgroundImage,
          backgroundGradient: baseValues.backgroundGradient ?? normalizedConfig.backgroundGradient,
          backgroundSize: baseValues.backgroundSize ?? normalizedConfig.backgroundSize,
          backgroundRepeat: baseValues.backgroundRepeat ?? normalizedConfig.backgroundRepeat,
          backgroundPosition: baseValues.backgroundPosition ?? normalizedConfig.backgroundPosition,
          backdropBlur: baseValues.backdropBlur ?? normalizedConfig.backdropBlur,
          boxShadow: baseValues.boxShadow ?? normalizedConfig.boxShadow,
          contentPadding: baseValues.contentPadding ?? normalizedConfig.contentPadding,
          runtime: {
            ...normalizedConfig.runtime,
            emitOnChange:
              baseValues.emitOnChange ?? normalizedConfig.runtime?.emitOnChange,
          },
          eventOutputs: normalizeEventOutputsForSave(baseValues.eventOutputs || []),
          eventInputs: normalizeEventInputsForSave(baseValues.eventInputs || []),
          field: nextField,
        },
      })

      message.success('配置保存成功')
      return true
    } catch {
      return false
    }
  }

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
      baseForm.setFieldValue('titleGlobalThemeId', nextThemeId)
      return
    }

    const theme = getGlobalThemeScheme(globalConfigDetail, nextThemeId)
    if (theme?.widgetTitle) {
      baseForm.setFieldsValue(buildWidgetTitleStyleFormValues(theme.widgetTitle))
    }
  }, [baseForm, globalConfigDetail, titleGlobalThemeId, titleUseGlobalConfig])

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
      baseForm.setFieldValue('backgroundGlobalThemeId', nextThemeId)
      return
    }

    const theme = getGlobalThemeScheme(globalConfigDetail, nextThemeId)
    if (theme?.widgetBackground) {
      baseForm.setFieldsValue(buildBackgroundFormValues(theme.widgetBackground))
    }
  }, [backgroundGlobalThemeId, backgroundUseGlobalConfig, baseForm, globalConfigDetail])

  useEffect(() => {
    baseForm.setFieldsValue({
      title: widget.title,
      titleUseGlobalConfig: normalizedConfig.titleUseGlobalConfig ?? false,
      titleGlobalThemeId: normalizedConfig.titleGlobalThemeId,
      backgroundUseGlobalConfig: normalizedConfig.backgroundUseGlobalConfig ?? false,
      backgroundGlobalThemeId: normalizedConfig.backgroundGlobalThemeId,
      ...buildWidgetTitleStyleFormValues(normalizedConfig),
      ...buildBackgroundFormValues(normalizedConfig),
      contentPadding: normalizedConfig.contentPadding,
      emitOnChange: normalizedConfig.runtime?.emitOnChange,
      eventOutputs: normalizeEventOutputsForForm(normalizedConfig.eventOutputs || []),
      eventInputs: normalizeEventInputsForForm(normalizedConfig.eventInputs || []),
    })
  }, [baseForm, normalizedConfig, widget.title])

  useEffect(() => {
    fieldForm.setFieldsValue(buildNativeFormFieldFormValues(normalizedConfig.field, {
      colon: true,
    }))
  }, [fieldForm, normalizedConfig.field])

  return (
    <div ref={rootRef} className="native-form-config-panel">
      <div className="native-form-config-panel__header">
        <div>
          <Typography.Title level={5}>字段组件配置</Typography.Title>
          <Typography.Text type="secondary">
            独立字段组件与表单容器内字段共用同一套字段模型与配置逻辑。
          </Typography.Text>
        </div>
        <Button type="text" onClick={onClose}>
          关闭
        </Button>
      </div>

      <div className="native-form-config-panel__body">
        <Tabs
          defaultActiveKey="widget-base"
          className="native-form-config-panel__tabs"
          items={[
            {
              key: 'widget-base',
              label: '组件基础属性',
              children: (
                <Form form={baseForm} layout="vertical" className="native-form-config-panel__form">
                  <Form.Item
                    name="title"
                    label="组件标题"
                    rules={[{ required: true, whitespace: true, message: '请输入组件标题' }]}
                  >
                    <Input placeholder="请输入组件标题" />
                  </Form.Item>
                  <div className="native-form-config-panel__section-title">标题设置</div>
                  <GlobalThemeReferenceFields
                    form={baseForm}
                    useFieldName="titleUseGlobalConfig"
                    themeIdFieldName="titleGlobalThemeId"
                    options={globalThemeOptions}
                    hint="开启后会自动填充全局主题中的组件标题设置，引用期间不可编辑。"
                  />
                  <WidgetTitleSettings disabled={titleUseGlobalConfig} defaultTitleColor={canvasTitleColor} />

                  <div className="native-form-config-panel__section-title">背景设置</div>
                  <GlobalThemeReferenceFields
                    form={baseForm}
                    useFieldName="backgroundUseGlobalConfig"
                    themeIdFieldName="backgroundGlobalThemeId"
                    options={globalThemeOptions}
                    hint="开启后会自动填充全局主题中的组件背景设置，引用期间不可编辑。"
                  />
                  <BackgroundSettings
                    form={baseForm}
                    initialValues={normalizedConfig}
                    disabled={backgroundUseGlobalConfig}
                  />
                  <Form.Item name="contentPadding" label="内容内边距">
                    <InputNumber min={0} max={64} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="emitOnChange" label="值变化时触发事件" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'field-config',
              label: '字段配置',
              children: (
                <NativeFormFieldConfigForm
                  form={fieldForm}
                  field={normalizedConfig.field}
                  currentWidgetId={widget.id}
                  onValuesChange={() => undefined}
                />
              ),
            },
            {
              key: 'event-linkage',
              label: '联动',
              children: (
                <Form form={baseForm} layout="vertical" className="native-form-config-panel__form">
                  <EventLinkageConfig
                    form={baseForm}
                    widget={widget}
                    widgets={widgets}
                    groups={groups}
                    floatingModules={floatingModules}
                  />
                </Form>
              ),
            },
          ]}
        />
      </div>

      <div className="native-form-config-panel__footer">
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={() => void handleSave()}>
          保存
        </Button>
      </div>
    </div>
  )
}

export default NativeFormFieldConfigPanel
