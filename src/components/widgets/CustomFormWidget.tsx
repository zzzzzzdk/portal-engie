import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Cascader,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  message,
} from 'antd'
import dayjs from 'dayjs'
import axios from 'axios'
import WujieReact from 'wujie-react'
import {
  EventRouteConfig,
  FormConfig,
  MicroAppEventType,
  QueryFilterFieldConfig,
  Widget,
  WidgetConfig,
} from '@/types'
import { getGlobalMessageCopy } from '@/utils/global-config'
import {
  buildQueryFilterInitialValues,
  formatQueryFilterSubmitValues,
  getUnifiedFormFields,
  mapQueryFilterCascaderOptions,
  mapQueryFilterOptions,
  QUERY_FILTER_INPUT_NUMBER_MAX_PRECISION,
  resolveQueryFilterOptionList,
} from '@/utils/queryFilter'
import { useGlobalConfigStore } from '@/store/useGlobalConfigStore'
import { getValueByPath, parseJsonConfig } from '@/utils/widgetApi'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'

const { RangePicker } = DatePicker
const { bus } = WujieReact

interface CustomFormWidgetConfig extends FormConfig {
  eventRoutes?: EventRouteConfig[]
  submitButtonText?: string
  resetButtonText?: string
  showResetButton?: boolean
  layout?: 'horizontal' | 'vertical' | 'inline'
  labelWidth?: number
  submitButtonColor?: string
  submitButtonTextColor?: string
  submitButtonSize?: 'small' | 'middle' | 'large'
  resetButtonColor?: string
  resetButtonTextColor?: string
  buttonAlign?: 'left' | 'center' | 'right'
  borderRadius?: number
  fieldSpacing?: number
  submitMethod?: 'api' | 'eventRoute'
  apiMethod?: 'POST' | 'PUT' | 'PATCH'
  apiHeaders?: Record<string, string>
  successMessage?: string
  failureMessage?: string
  successAction?: 'none' | 'resetForm'
  failureAction?: 'none' | 'resetForm'
  successResetForm?: boolean
}

interface CustomFormWidgetProps {
  config: WidgetConfig
  widget?: Widget
}

const DEFAULT_FIELDS: QueryFilterFieldConfig[] = [
  {
    id: 'custom-form-name',
    type: 'input',
    label: '姓名',
    field: 'name',
    required: true,
    placeholder: '请输入姓名',
  },
  {
    id: 'custom-form-role',
    type: 'select',
    label: '角色',
    field: 'role',
    placeholder: '请选择角色',
    dataSourceType: 'manual',
    manualOptions: [
      { label: '管理员', value: 'admin' },
      { label: '用户', value: 'user' },
    ],
  },
]

const getFieldPlaceholder = (field: QueryFilterFieldConfig) => {
  if (!['input', 'textarea', 'select', 'datePicker', 'inputNumber'].includes(field.type)) {
    return undefined
  }

  if (field.placeholder) {
    return field.placeholder
  }

  if (['select', 'datePicker'].includes(field.type)) {
    return `请选择${field.label}`
  }

  return `请输入${field.label}`
}

const getLayoutProps = (
  layout: 'horizontal' | 'vertical' | 'inline',
  labelWidth?: number,
) => {
  if (layout !== 'horizontal') {
    return {}
  }

  return {
    labelCol: { flex: `0 0 ${labelWidth || 96}px` },
    wrapperCol: { flex: '1 1 0' },
  }
}

const CustomFormWidget: React.FC<CustomFormWidgetProps> = ({ config, widget }) => {
  const [form] = Form.useForm()
  const formConfig = config as CustomFormWidgetConfig
  const fields = useMemo(() => {
    const nextFields = getUnifiedFormFields(formConfig.fields)
    return nextFields.length > 0 ? nextFields : DEFAULT_FIELDS
  }, [formConfig.fields])
  const [fieldOptionsMap, setFieldOptionsMap] = useState<Record<string, any[]>>({})
  const fieldsJsonRef = useRef<string>('')
  const eventRoutes = formConfig.eventRoutes || []
  const submitButtonText = formConfig.submitButtonText || '提交'
  const resetButtonText = formConfig.resetButtonText || '重置'
  const showResetButton = formConfig.showResetButton ?? true
  const layout = formConfig.layout || 'vertical'
  const labelWidth = formConfig.labelWidth
  const submitButtonColor = formConfig.submitButtonColor
  const submitButtonTextColor = formConfig.submitButtonTextColor
  const submitButtonSize = formConfig.submitButtonSize || 'middle'
  const resetButtonColor = formConfig.resetButtonColor
  const resetButtonTextColor = formConfig.resetButtonTextColor
  const buttonAlign = formConfig.buttonAlign || 'left'
  const borderRadius = formConfig.borderRadius
  const fieldSpacing = formConfig.fieldSpacing
  const submitMethod = formConfig.submitMethod || 'eventRoute'
  const apiMethod = formConfig.apiMethod || 'POST'
  const apiHeaders = formConfig.apiHeaders
  const globalConfigDetail = useGlobalConfigStore(state => state.detail)
  const ensureGlobalConfigLoaded = useGlobalConfigStore(state => state.ensureLoaded)
  const successMessage =
    formConfig.successMessage || getGlobalMessageCopy(globalConfigDetail, 'form.success')
  const failureMessage =
    formConfig.failureMessage || getGlobalMessageCopy(globalConfigDetail, 'form.error')
  const successAction =
    formConfig.successAction || (formConfig.successResetForm ? 'resetForm' : 'none')
  const failureAction = formConfig.failureAction || 'none'
  const emitWidgetEvent = useWidgetEventEmitter(widget)

  useEffect(() => {
    const nextFieldsJson = JSON.stringify(fields)
    if (nextFieldsJson === fieldsJsonRef.current) {
      return
    }
    fieldsJsonRef.current = nextFieldsJson
    form.resetFields()
    form.setFieldsValue(buildQueryFilterInitialValues(fields))
  }, [fields, form])

  useEffect(() => {
    if (!formConfig.successMessage || !formConfig.failureMessage) {
      void ensureGlobalConfigLoaded()
    }
  }, [ensureGlobalConfigLoaded, formConfig.failureMessage, formConfig.successMessage])

  useEffect(() => {
    let cancelled = false

    const loadFieldOptions = async () => {
      const nextOptionsMap: Record<string, any[]> = {}

      for (const field of fields) {
        if (['checkboxGroup', 'radioGroup', 'select'].includes(field.type)) {
          if (field.dataSourceType === 'manual') {
            nextOptionsMap[field.id] = field.manualOptions || []
            continue
          }

          if (!field.requestConfig?.endpoint) {
            nextOptionsMap[field.id] = []
            continue
          }

          try {
            const method = field.requestConfig.method || 'GET'
            const response = await axios({
              method,
              url: field.requestConfig.endpoint,
              headers: field.requestConfig.headers,
              params: parseJsonConfig(field.requestConfig.query),
              ...(method === 'GET'
                ? {}
                : { data: parseJsonConfig(field.requestConfig.body) }),
            })
            const rawData = resolveQueryFilterOptionList(response.data, field.requestConfig)
            nextOptionsMap[field.id] = Array.isArray(rawData)
              ? mapQueryFilterOptions(rawData, field.requestConfig)
              : []
          } catch (error) {
            console.error('自定义表单字段选项请求失败:', error)
            nextOptionsMap[field.id] = []
          }

          continue
        }

        if (field.type === 'cascader') {
          if (field.dataMode === 'json') {
            const jsonOptions = parseJsonConfig(field.jsonData)
            nextOptionsMap[field.id] = Array.isArray(jsonOptions) ? jsonOptions : []
            continue
          }

          if (!field.requestConfig?.endpoint) {
            nextOptionsMap[field.id] = []
            continue
          }

          try {
            const method = field.requestConfig.method || 'GET'
            const response = await axios({
              method,
              url: field.requestConfig.endpoint,
              headers: field.requestConfig.headers,
              params: parseJsonConfig(field.requestConfig.query),
              ...(method === 'GET'
                ? {}
                : { data: parseJsonConfig(field.requestConfig.body) }),
            })
            const rawData = field.requestConfig.listField
              ? getValueByPath(response.data, field.requestConfig.listField)
              : response.data

            nextOptionsMap[field.id] = Array.isArray(rawData)
              ? mapQueryFilterCascaderOptions(rawData, field.requestConfig)
              : []
          } catch (error) {
            console.error('自定义表单级联字段数据请求失败:', error)
            nextOptionsMap[field.id] = []
          }
        }
      }

      if (!cancelled) {
        setFieldOptionsMap(nextOptionsMap)
      }
    }

    void loadFieldOptions()

    return () => {
      cancelled = true
    }
  }, [fields])

  const emitRoutes = useCallback((routes: EventRouteConfig[], values: Record<string, any>) => {
    const enabledRoutes = routes.filter(route => route.enabled !== false)
    if (enabledRoutes.length === 0) {
      return
    }

    const fromAppId = widget?.id || 'custom-form-widget'
    enabledRoutes.forEach(route => {
      const targetEventType = route.toEventType || route.eventType || MicroAppEventType.DATA_SUBMIT
      bus.$emit(targetEventType, {
        from: fromAppId,
        to: route.toAppId,
        type: targetEventType,
        payload: { action: 'submit', data: values },
        timestamp: Date.now(),
      })
    })
  }, [widget?.id])

  const buildApiPayload = useCallback((formValues: Record<string, any>) => {
    const configuredBody = parseJsonConfig(formConfig.apiBody)

    if (configuredBody && typeof configuredBody === 'object' && !Array.isArray(configuredBody)) {
      return {
        ...configuredBody,
        ...formValues,
      }
    }

    return formValues
  }, [formConfig.apiBody])

  const onFinish = async (values: Record<string, any>) => {
    const formattedValues = formatQueryFilterSubmitValues(fields, values)
    emitWidgetEvent('form.submit', { values: formattedValues }, 'submit')

    try {
      if (submitMethod === 'api' && formConfig.apiEndpoint) {
        const requestPayload = buildApiPayload(formattedValues)

        await axios({
          method: apiMethod,
          url: formConfig.apiEndpoint,
          data: requestPayload,
          ...(apiHeaders ? { headers: apiHeaders } : {}),
        })
      }

      if (submitMethod === 'eventRoute') {
        emitRoutes(eventRoutes, formattedValues)
      }

      message.success(successMessage)
      if (successAction === 'resetForm') {
        form.resetFields()
        form.setFieldsValue(buildQueryFilterInitialValues(fields))
      }
    } catch (error) {
      message.error(failureMessage)
      if (failureAction === 'resetForm') {
        form.resetFields()
        form.setFieldsValue(buildQueryFilterInitialValues(fields))
      }
      console.error('表单提交失败:', error)
    }
  }

  const onFinishFailed = () => {
    message.warning('请检查表单填写是否完整')
  }

  const handleReset = () => {
    form.resetFields()
    form.setFieldsValue(buildQueryFilterInitialValues(fields))
    emitWidgetEvent('form.reset', {}, 'reset')
    message.info('表单已重置')
  }

  useWidgetEventInputs(widget, {
    setValue: (params) => {
      form.setFieldsValue(params)
    },
    clearValue: (params) => {
      const keys = Object.keys(params || {})
      if (keys.length > 0) {
        form.setFieldsValue(keys.reduce<Record<string, undefined>>((result, key) => {
          result[key] = undefined
          return result
        }, {}))
        return
      }
      form.resetFields()
      form.setFieldsValue(buildQueryFilterInitialValues(fields))
    },
    reset: () => {
      form.resetFields()
      form.setFieldsValue(buildQueryFilterInitialValues(fields))
    },
  })

  const selectFilterOption = (input: string, option: any) => {
    const labelText = String(option?.label ?? '').trim().toLowerCase()
    return labelText.includes(input.trim().toLowerCase())
  }

  const renderField = (field: QueryFilterFieldConfig) => {
    const options = fieldOptionsMap[field.id] || []

    switch (field.type) {
      case 'input':
        return (
          <Input
            placeholder={getFieldPlaceholder(field)}
            maxLength={field.maxLength}
            addonBefore={field.addonBefore}
            addonAfter={field.addonAfter}
            allowClear
          />
        )
      case 'textarea':
        return (
          <Input.TextArea
            rows={4}
            placeholder={getFieldPlaceholder(field)}
            maxLength={field.maxLength}
            allowClear
          />
        )
      case 'checkboxGroup':
        return (
          <Checkbox.Group
            className={`query-filter-widget__group query-filter-widget__group--${field.direction || 'horizontal'}`}
            options={options}
          />
        )
      case 'cascader':
        return (
          <Cascader
            style={{ width: '100%' }}
            options={options}
            placeholder={field.placeholder || `请选择${field.label}`}
            allowClear
          />
        )
      case 'datePicker':
        if (field.pickerType === 'range') {
          return (
            <RangePicker
              style={{ width: '100%' }}
              placeholder={[
                field.rangeStartPlaceholder || field.placeholder || '开始日期',
                field.rangeEndPlaceholder || field.placeholder || '结束日期',
              ]}
              disabledDate={field.disablePastDates
                ? current => !!current && current < dayjs().startOf('day')
                : undefined}
            />
          )
        }

        return (
          <DatePicker
            style={{ width: '100%' }}
            placeholder={getFieldPlaceholder(field)}
            disabledDate={field.disablePastDates
              ? current => !!current && current < dayjs().startOf('day')
              : undefined}
          />
        )
      case 'inputNumber':
        return (
          <InputNumber
            style={{ width: '100%' }}
            placeholder={getFieldPlaceholder(field)}
            min={field.min}
            max={field.max}
            precision={Math.min(field.precision ?? 0, QUERY_FILTER_INPUT_NUMBER_MAX_PRECISION)}
            addonAfter={field.unit}
          />
        )
      case 'radioGroup':
        return (
          <Radio.Group
            className={`query-filter-widget__group query-filter-widget__group--${field.direction || 'horizontal'}`}
            options={options}
          />
        )
      case 'select':
        return (
          <Select
            options={options}
            placeholder={getFieldPlaceholder(field)}
            allowClear
            showSearch={field.showSearch}
            filterOption={selectFilterOption as any}
            mode={field.mode === 'multiple' ? 'multiple' : undefined}
          />
        )
      default:
        return <Input placeholder={getFieldPlaceholder(field)} allowClear />
    }
  }

  const buttonAlignStyle: React.CSSProperties = {
    textAlign: buttonAlign,
  }

  const submitBtnStyle: React.CSSProperties | undefined = (submitButtonColor || submitButtonTextColor)
    ? {
        ...(submitButtonColor
          ? { backgroundColor: submitButtonColor, borderColor: submitButtonColor }
          : {}),
        color: submitButtonTextColor || '#fff',
      }
    : undefined

  const resetBtnStyle: React.CSSProperties | undefined = (resetButtonColor || resetButtonTextColor)
    ? {
        ...(resetButtonColor
          ? { backgroundColor: resetButtonColor, borderColor: resetButtonColor }
          : {}),
        color: resetButtonTextColor || undefined,
      }
    : undefined

  return (
    <div
      style={{
        padding: '16px',
        height: '100%',
        overflow: 'auto',
        ...(borderRadius !== undefined ? { borderRadius } : {}),
      }}
    >
      <Form
        form={form}
        layout={layout === 'inline' ? 'inline' : layout}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        onValuesChange={(changedValues, values) => {
          const changeOutputEnabled = formConfig.eventOutputs?.some(item => item.enabled !== false && item.eventName === 'form.change')
          if (!changeOutputEnabled) return
          const changedField = Object.keys(changedValues)[0]
          emitWidgetEvent('form.change', {
            values: formatQueryFilterSubmitValues(fields, values),
            changedField,
            changedValue: changedValues[changedField],
          }, 'change')
        }}
        {...getLayoutProps(layout, labelWidth)}
      >
        {fields.map(field => (
          <Form.Item
            key={field.id}
            name={field.field}
            label={field.label}
            rules={[
              {
                required: field.required,
                message: ['select', 'cascader', 'datePicker'].includes(field.type)
                  ? `请选择${field.label}`
                  : `请输入${field.label}`,
              },
            ]}
            style={fieldSpacing !== undefined ? { marginBottom: fieldSpacing } : undefined}
          >
            {renderField(field)}
          </Form.Item>
        ))}

        <Form.Item style={buttonAlignStyle}>
          <Space>
            <Button
              htmlType="submit"
              type={submitButtonColor ? 'default' : 'primary'}
              size={submitButtonSize}
              style={submitBtnStyle}
            >
              {submitButtonText}
            </Button>
            {showResetButton && (
              <Button
                onClick={handleReset}
                size={submitButtonSize}
                type={resetButtonColor ? 'default' : undefined}
                style={resetBtnStyle}
              >
                {resetButtonText}
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

export default CustomFormWidget
