import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import axios from 'axios'
import dayjs from 'dayjs'
import WujieReact from 'wujie-react'
import {
  EventRouteConfig,
  MicroAppEventType,
  QueryFilterFieldConfig,
  QueryFilterWidgetConfig,
  Widget,
} from '@/types'
import { getValueByPath, parseJsonConfig } from '@/utils/widgetApi'
import {
  buildQueryFilterInitialValues,
  formatQueryFilterSubmitValues,
  hydrateQueryFilterFields,
  mapQueryFilterCascaderOptions,
  mapQueryFilterOptions,
  resolveQueryFilterOptionList,
} from '@/utils/queryFilter'
import './index.scss'

const { RangePicker } = DatePicker
const { bus } = WujieReact

interface QueryFilterWidgetProps {
  config?: QueryFilterWidgetConfig
  widget?: Widget
}

const getFieldPlaceholder = (field: QueryFilterFieldConfig) => {
  if (!['input', 'select', 'datePicker', 'inputNumber'].includes(field.type)) {
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

const getFieldWidthStyle = (layoutCols: number, gap: number): React.CSSProperties => {
  const cols = Math.min(Math.max(layoutCols || 4, 1), 4)
  const gapTotal = Math.max(cols - 1, 0) * gap
  const width = `calc((100% - ${gapTotal}px) / ${cols})`

  return {
    flex: `0 0 ${width}`,
    maxWidth: width,
  }
}

const getFormLayoutProps = (
  formLayout: 'horizontal' | 'vertical' | 'inline',
  labelWidth: number,
) => {
  if (formLayout !== 'horizontal') {
    return {}
  }

  return {
    labelCol: { flex: `0 0 ${labelWidth}px` },
    wrapperCol: { flex: '1 1 0' },
  }
}

const QueryFilterWidget: React.FC<QueryFilterWidgetProps> = ({ config, widget }) => {
  const [form] = Form.useForm()
  const queryFilterConfig = config as QueryFilterWidgetConfig
  const fields = useMemo(
    () => hydrateQueryFilterFields(queryFilterConfig?.queryFields),
    [queryFilterConfig?.queryFields],
  )
  const submitButtonText = queryFilterConfig?.submitButtonText || '查询'
  const resetButtonText = queryFilterConfig?.resetButtonText || '重置'
  const showResetButton = queryFilterConfig?.showResetButton ?? true
  const formLayout = queryFilterConfig?.formLayout || 'vertical'
  const isHorizontalLayout = formLayout === 'horizontal'
  const labelAlignSelf = queryFilterConfig?.labelVerticalAlign || 'top'
  const labelTextAlign = queryFilterConfig?.labelTextAlign || 'left'
  const labelWidth = queryFilterConfig?.labelWidth ?? 96
  const layoutCols = queryFilterConfig?.layoutCols || 4
  const buttonAlign = queryFilterConfig?.buttonAlign || 'right'
  const fieldSpacing = queryFilterConfig?.fieldSpacing ?? 16
  const submitMethod = queryFilterConfig?.submitMethod || 'eventRoute'
  const apiEndpoint = queryFilterConfig?.apiEndpoint
  const apiMethod = queryFilterConfig?.apiMethod || 'GET'
  const apiHeaders = queryFilterConfig?.apiHeaders
  const apiQuery = queryFilterConfig?.apiQuery
  const apiBody = queryFilterConfig?.apiBody
  const eventRoutes = queryFilterConfig?.eventRoutes || []
  const [fieldOptionsMap, setFieldOptionsMap] = useState<Record<string, any[]>>({})
  const formStyle = useMemo(() => {
    const alignSelfMap = {
      top: 'flex-start',
      center: 'center',
      bottom: 'flex-end',
    } as const
    const justifyContentMap = {
      left: 'flex-start',
      center: 'center',
      right: 'flex-end',
    } as const

    return {
      '--query-filter-label-align-self': isHorizontalLayout
        ? alignSelfMap[labelAlignSelf]
        : 'flex-start',
      '--query-filter-label-text-align': isHorizontalLayout
        ? labelTextAlign
        : 'left',
      '--query-filter-label-justify-content': isHorizontalLayout
        ? justifyContentMap[labelTextAlign]
        : 'flex-start',
    } as React.CSSProperties
  }, [isHorizontalLayout, labelAlignSelf, labelTextAlign])

  useEffect(() => {
    form.resetFields()
    form.setFieldsValue(buildQueryFilterInitialValues(fields))
  }, [fields, form])

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
            console.error('查询筛选字段请求数据失败:', error)
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
            console.error('查询筛选级联数据请求失败:', error)
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

  const emitSearchEvent = useCallback((searchParams: Record<string, any>) => {
    const enabledRoutes = eventRoutes.filter(route => route.enabled !== false)

    if (enabledRoutes.length === 0) {
      console.log('查询筛选参数:', searchParams)
      message.info('查询参数已提交，但未配置事件路由')
      return
    }

    const fromAppId = widget?.id || 'query-filter-widget'

    enabledRoutes.forEach((route: EventRouteConfig) => {
      const targetEventType = route.toEventType || route.eventType || MicroAppEventType.DATA_QUERY
      bus.$emit(targetEventType, {
        from: fromAppId,
        to: route.toAppId,
        type: targetEventType,
        payload: {
          action: 'search',
          data: searchParams,
        },
        timestamp: Date.now(),
      })
    })

    message.success('查询请求已发送')
  }, [eventRoutes, widget?.id])

  const buildApiQuery = useCallback((searchParams: Record<string, any>) => {
    const configuredQuery = parseJsonConfig(apiQuery)

    if (configuredQuery && typeof configuredQuery === 'object' && !Array.isArray(configuredQuery)) {
      return apiMethod === 'GET'
        ? {
            ...configuredQuery,
            ...searchParams,
          }
        : configuredQuery
    }

    return apiMethod === 'GET' ? searchParams : undefined
  }, [apiMethod, apiQuery])

  const buildApiPayload = useCallback((searchParams: Record<string, any>) => {
    const configuredBody = parseJsonConfig(apiBody)

    if (configuredBody && typeof configuredBody === 'object' && !Array.isArray(configuredBody)) {
      return {
        ...configuredBody,
        ...searchParams,
      }
    }

    return searchParams
  }, [apiBody])

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields()
      const searchParams = formatQueryFilterSubmitValues(fields, values)

      if (submitMethod === 'api') {
        if (!apiEndpoint) {
          message.warning('请先配置接口地址')
          return
        }

        const requestQuery = buildApiQuery(searchParams)
        const requestPayload = buildApiPayload(searchParams)
        await axios({
          method: apiMethod,
          url: apiEndpoint,
          ...(requestQuery ? { params: requestQuery } : {}),
          ...(apiMethod === 'GET' ? {} : { data: requestPayload }),
          ...(apiHeaders ? { headers: apiHeaders } : {}),
        })
        message.success('查询请求已发送')
        return
      }

      emitSearchEvent(searchParams)
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      message.error('查询请求失败')
      console.error('查询筛选提交失败:', error)
    }
  }, [apiEndpoint, apiHeaders, apiMethod, buildApiPayload, buildApiQuery, emitSearchEvent, fields, form, submitMethod])

  const handleReset = useCallback(() => {
    form.resetFields()
  }, [form])

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
            options={options}
            allowClear
          />
        )
      case 'datePicker':
        if (field.pickerType === 'range') {
          return (
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
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
            precision={field.precision}
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
            optionFilterProp="label"
            filterOption={(input, option) => {
              const labelText = String(option?.label ?? '').trim().toLowerCase()
              return labelText.includes(input.trim().toLowerCase())
            }}
            mode={field.mode === 'multiple' ? 'multiple' : undefined}
          />
        )
      default:
        return <Input placeholder={getFieldPlaceholder(field)} allowClear />
    }
  }

  return (
    <div className="query-filter-widget">
      <Form
        form={form}
        layout={formLayout === 'inline' ? 'inline' : formLayout}
        className={`query-filter-widget__form query-filter-widget__form--${formLayout}`}
        style={formStyle}
        {...getFormLayoutProps(formLayout, labelWidth)}
      >
        <div className="query-filter-widget__fields" style={{ gap: `${fieldSpacing}px` }}>
          {fields.map(field => (
            <div
              key={field.id}
              className={`query-filter-widget__field query-filter-widget__field--${formLayout}`}
              style={getFieldWidthStyle(layoutCols, fieldSpacing)}
            >
              <Form.Item
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
              >
                {renderField(field)}
              </Form.Item>
            </div>
          ))}
        </div>

        <Form.Item className={`query-filter-widget__actions query-filter-widget__actions--${buttonAlign}`}>
          <Space>
            <Button type="primary" onClick={() => void handleSubmit()}>
              {submitButtonText}
            </Button>
            {showResetButton && (
              <Button onClick={handleReset}>
                {resetButtonText}
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

export default QueryFilterWidget
