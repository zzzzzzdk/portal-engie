import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Form } from 'antd'
import WujieReact from 'wujie-react'
import type {
  EventRouteConfig,
  NativeFormOptionItem,
  NativeFormFieldWidgetConfig,
  Widget,
  WidgetConfig,
} from '@/types'
import { normalizeNativeFormFieldConfig } from '@/native-form/shared/defaults'
import NativeFormFieldControl from '@/native-form/runtime/native-form-field-control'
import {
  buildNativeFormFieldRules,
  getNativeFormFieldControlStyle,
  getNativeFormFieldItemClassName,
  getNativeFormFieldItemLabel,
  getNativeFormFieldItemStyle,
  parseNativeFormDefaultValue,
  parseNativeFormRegexPattern,
} from '@/native-form/shared/field-helpers'
import { getValueByPath, parseJsonConfig } from '@/utils/widgetApi'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'
import './native-form-field-widget.scss'

const { bus } = WujieReact

interface NativeFormFieldWidgetProps {
  config: WidgetConfig
  widget?: Widget
  isEditMode?: boolean
}

const resolveRemoteOptions = (rawData: any, fieldConfig: NativeFormFieldWidgetConfig['field']): NativeFormOptionItem[] => {
  const listField = fieldConfig.requestConfig?.listField?.trim()
  const labelField = fieldConfig.requestConfig?.labelField?.trim()
  const valueField = fieldConfig.requestConfig?.valueField?.trim()
  const childrenField = fieldConfig.requestConfig?.childrenField?.trim()
  const rawList = listField ? getValueByPath(rawData, listField) : rawData

  if (!Array.isArray(rawList)) {
    return []
  }

  const mapItem = (item: any): NativeFormOptionItem => {
    const label = labelField ? item?.[labelField] : item?.label ?? item?.name ?? item?.title
    const value = valueField ? item?.[valueField] : item?.value ?? item?.id ?? item?.key
    const children = childrenField ? item?.[childrenField] : item?.children

    return {
      label: String(label ?? ''),
      value: value ?? '',
      children: Array.isArray(children) ? children.map(mapItem) : undefined,
    }
  }

  return rawList.map(mapItem)
}

const emitRoutes = (
  routes: EventRouteConfig[],
  values: Record<string, any>,
  options: {
    from: string
    action: 'change' | 'click'
    field: {
      id?: string
      type: string
      name?: string
      label?: string
      value?: any
    }
  },
) => {
  const enabledRoutes = routes.filter(route => route.enabled !== false)

  enabledRoutes.forEach(route => {
    const targetEventType =
      route.toEventType ||
      route.eventType ||
      (options.action === 'change' ? 'data:update' : 'user:action')

    bus.$emit(targetEventType, {
      from: options.from,
      to: route.toAppId,
      type: targetEventType,
      payload: {
        action: options.action,
        data: values,
        field: options.field,
      },
      timestamp: Date.now(),
    })
  })
}

const NativeFormFieldWidget: React.FC<NativeFormFieldWidgetProps> = ({
  config,
  widget,
  isEditMode = false,
}) => {
  const normalizedConfig = useMemo(
    () => normalizeNativeFormFieldConfig(config as NativeFormFieldWidgetConfig),
    [config],
  )
  const [form] = Form.useForm()
  const [remoteOptions, setRemoteOptions] = useState<NativeFormOptionItem[]>([])
  const emitWidgetEvent = useWidgetEventEmitter(widget)
  const initialValues = useMemo(
    () => (
      normalizedConfig.field.field
        ? { [normalizedConfig.field.field]: parseNativeFormDefaultValue(normalizedConfig.field) }
        : undefined
    ),
    [normalizedConfig.field],
  )

  useEffect(() => {
    form.resetFields()
    if (initialValues) {
      form.setFieldsValue(initialValues)
    }
  }, [form, initialValues])

  useEffect(() => {
    let cancelled = false

    const loadRemoteOptions = async () => {
      const fieldConfig = normalizedConfig.field
      if (
        !['select', 'transfer', 'checkableTag', 'radioGroup', 'checkboxGroup', 'cascader', 'treeSelect'].includes(fieldConfig.type) ||
        fieldConfig.dataSourceType !== 'request' ||
        !fieldConfig.requestConfig?.endpoint
      ) {
        setRemoteOptions([])
        return
      }

      try {
        const method = fieldConfig.requestConfig.method || 'GET'
        const response = await axios({
          method,
          url: fieldConfig.requestConfig.endpoint,
          headers: fieldConfig.requestConfig.headers,
          params: parseJsonConfig(fieldConfig.requestConfig.query),
          ...(method === 'GET' ? {} : { data: parseJsonConfig(fieldConfig.requestConfig.body) }),
        })

        if (!cancelled) {
          setRemoteOptions(resolveRemoteOptions(response.data, fieldConfig))
        }
      } catch (error) {
        console.error('原生表单独立字段远程选项加载失败:', error)
        if (!cancelled) {
          setRemoteOptions([])
        }
      }
    }

    void loadRemoteOptions()

    return () => {
      cancelled = true
    }
  }, [normalizedConfig.field])

  const triggerRoutes = useCallback((
    type: 'change' | 'click',
    value?: any,
  ) => {
    const routes =
      type === 'change'
        ? normalizedConfig.eventConfig?.changeRoutes || []
        : normalizedConfig.eventConfig?.clickRoutes || []

    if (!routes.length) {
      return
    }

    emitRoutes(routes, form.getFieldsValue(true), {
      from: widget?.id || 'native-form-field-widget',
      action: type,
      field: {
        id: normalizedConfig.field.id,
        type: normalizedConfig.field.type,
        name: normalizedConfig.field.field,
        label: normalizedConfig.field.label,
        value,
      },
    })
  }, [form, normalizedConfig.eventConfig?.changeRoutes, normalizedConfig.eventConfig?.clickRoutes, normalizedConfig.field.field, normalizedConfig.field.id, normalizedConfig.field.label, normalizedConfig.field.type, widget?.id])

  const handleValueChange = useCallback((value: any) => {
    if (!normalizedConfig.field.field) {
      return
    }

    form.setFieldValue(normalizedConfig.field.field, value)
    form.validateFields([normalizedConfig.field.field]).catch(() => undefined)

    if (normalizedConfig.runtime?.emitOnChange !== false) {
      triggerRoutes('change', value)
    }
    emitWidgetEvent('field.change', {
      field: normalizedConfig.field.field,
      value,
      fieldConfig: normalizedConfig.field,
    }, 'change')
  }, [emitWidgetEvent, form, normalizedConfig.field, normalizedConfig.field.field, normalizedConfig.runtime?.emitOnChange, triggerRoutes])

  useWidgetEventInputs(widget, {
    setValue: (params) => {
      const fieldName = normalizedConfig.field.field
      if (!fieldName) return
      form.setFieldValue(fieldName, params.value ?? params[fieldName])
    },
    clearValue: () => {
      const fieldName = normalizedConfig.field.field
      if (!fieldName) return
      form.setFieldValue(fieldName, undefined)
    },
    reset: () => {
      form.resetFields()
      if (initialValues) {
        form.setFieldsValue(initialValues)
      }
    },
  })

  return (
    <div className="native-form-field-widget">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        className="native-form-field-widget__form"
      >
        <Form.Item
          label={getNativeFormFieldItemLabel(normalizedConfig.field)}
          name={normalizedConfig.field.field}
          trigger="onValueChange"
          valuePropName={normalizedConfig.field.type === 'switch' ? 'checked' : 'value'}
          className={getNativeFormFieldItemClassName('native-form-field-widget__item', normalizedConfig.field)}
          style={getNativeFormFieldItemStyle(normalizedConfig.field)}
          tooltip={normalizedConfig.field.itemProps?.tooltip}
          labelAlign={normalizedConfig.field.itemProps?.labelAlign}
          colon={normalizedConfig.field.itemProps?.colon ?? true}
          required={normalizedConfig.field.required}
          rules={buildNativeFormFieldRules(normalizedConfig.field).map((rule) => (
            rule.type === 'pattern' && rule.pattern
              ? { pattern: parseNativeFormRegexPattern(rule.pattern) || /$a/, message: rule.message }
              : {
                  required: rule.required,
                  min: rule.min,
                  max: rule.max,
                  len: rule.len,
                  message: rule.message,
                }
          ))}
        >
          <div
            className="native-form-field-widget__control-wrap"
            style={getNativeFormFieldControlStyle(normalizedConfig.field)}
          >
            <NativeFormFieldControl
              field={normalizedConfig.field}
              value={normalizedConfig.field.field ? form.getFieldValue(normalizedConfig.field.field) : undefined}
              options={remoteOptions.length ? remoteOptions : normalizedConfig.field.options}
              onValueChange={handleValueChange}
              onClick={() => {
                triggerRoutes('click')
                emitWidgetEvent('field.click', {
                  field: normalizedConfig.field.field,
                  value: normalizedConfig.field.field ? form.getFieldValue(normalizedConfig.field.field) : undefined,
                  fieldConfig: normalizedConfig.field,
                }, 'click')
              }}
            />
          </div>
        </Form.Item>
      </Form>
    </div>
  )
}

export default NativeFormFieldWidget
