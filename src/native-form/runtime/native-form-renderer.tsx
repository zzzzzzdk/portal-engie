import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Empty, Form, Space, Table, Typography, message } from 'antd'
import type { FormInstance } from 'antd'
import axios from 'axios'
import WujieReact from 'wujie-react'
import type {
  EmittableEvent,
  EventRouteConfig,
  NativeFormAppearanceConfig,
  NativeFormFieldRule,
  NativeFormNode,
  NativeFormOptionItem,
  NativeFormSubmitConfig,
  NativeFormWidgetConfig,
} from '@/types'
import { normalizeNativeFormConfig } from '@/native-form/shared/defaults'
import NativeFormFieldControl from '@/native-form/runtime/native-form-field-control'
import { useGlobalConfigStore } from '@/store/useGlobalConfigStore'
import { getGlobalMessageCopy } from '@/utils/global-config'
import { getValueByPath, parseJsonConfig } from '@/utils/widgetApi'
import { readWidgetEventPath } from '@/utils/widgetEventMapping'
import { isNativeFormContainerField } from '@/native-form/shared/field-factory'
import { uploadImage } from '@/services/upload'
import {
  buildNativeFormFieldRules,
  buildNativeFormRuleList,
  evaluateFieldConditions,
  getNativeFormFieldControlStyle,
  getNativeFormFieldItemClassName,
  getNativeFormFieldItemLabel,
  getNativeFormFieldItemStyle,
  getNativeFormFieldLabelLayout,
  parseNativeFormDefaultValue,
  parseNativeFormRegexPattern,
} from '@/native-form/shared/field-helpers'
import './native-form-renderer.scss'

const { bus } = WujieReact

const parseNativeFormLayoutCol = (value: unknown) => {
  const parsed = parseJsonConfig(value as any)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed
    : undefined
}

const resolveRequestConfigValue = (value: any, source: Record<string, any>): any => {
  if (Array.isArray(value)) {
    return value.map(item => resolveRequestConfigValue(item, source))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, any>>((result, [key, itemValue]) => {
      result[key] = resolveRequestConfigValue(itemValue, source)
      return result
    }, {})
  }

  if (typeof value !== 'string') {
    return value
  }

  if (!value.startsWith('formValues.') && !value.startsWith('runtimeParams.')) {
    return value
  }

  return readWidgetEventPath(source, value)
}

const getUploadResponseMessage = (response: any) => (
  response?.message ||
  response?.msg ||
  response?.error ||
  response?.detail ||
  response?.data?.message ||
  response?.data?.msg
)

const assertUploadResponseSuccess = (response: any) => {
  if (!response || typeof response !== 'object') {
    return
  }

  if (response.success === false || response.ok === false) {
    throw new Error(getUploadResponseMessage(response) || '文件上传失败')
  }

  const rawCode = response.code ?? response.statusCode
  if (rawCode === undefined || rawCode === null || rawCode === '') {
    return
  }

  const code = Number(rawCode)
  if ([0, 200, 20000].includes(code)) {
    return
  }

  throw new Error(getUploadResponseMessage(response) || `文件上传失败，错误码：${rawCode}`)
}

export const NATIVE_FORM_SUBMIT_SENDER_EVENTS: EmittableEvent[] = [
  { id: 'native-form-submit', type: 'data:submit', name: '表单提交' },
  { id: 'native-form-success', type: 'success', name: '提交成功' },
  { id: 'native-form-error', type: 'error', name: '提交失败' },
]

interface NativeFormRendererProps {
  config: NativeFormWidgetConfig
  widgetId?: string
  form?: FormInstance
  runtimeParams?: Record<string, any>
  formValueVersion?: number
  onFormSubmit?: (values: Record<string, any>, response?: any) => void
  onFormChange?: (
    changedValues: Record<string, any>,
    values: Record<string, any>,
    meta?: NativeFormChangeMeta,
  ) => void
  onFormReset?: (values: Record<string, any>, previousValues?: Record<string, any>) => void
  onFieldEvent?: (eventName: 'field.change' | 'field.click', payload: NativeFormFieldEventPayload) => void
}

export interface NativeFormChangeMeta {
  source?: 'user' | 'eventInput' | 'reset' | 'system'
  triggerEvent?: any
  shouldEmitOutput?: boolean
  shouldRunInternalLinkage?: boolean
}

export interface NativeFormFieldEventPayload {
  field?: string
  value?: any
  values: Record<string, any>
  fieldConfig: NativeFormNode
}

const getNodeChildren = (field: NativeFormNode): NativeFormNode[] => {
  if (field.type === 'grid') {
    return (field.gridCells || [])
      .map(cell => cell.node || null)
      .filter(Boolean) as NativeFormNode[]
  }

  return Array.isArray(field.children) ? field.children : []
}

const buildFieldInitialValues = (fields: NativeFormNode[]): Record<string, any> =>
  fields.reduce<Record<string, any>>((result, field) => {
    if (field.field) {
      result[field.field] = parseNativeFormDefaultValue(field)
    }

    const childNodes = getNodeChildren(field)
    if (childNodes.length > 0) {
      Object.assign(result, buildFieldInitialValues(childNodes))
    }

    return result
  }, {})

const emitRoutes = (
  routes: EventRouteConfig[],
  values: Record<string, any>,
  options: {
    from: string
    action: string
    eventType?: string
    extraPayload?: Record<string, any>
  },
) => {
  const enabledRoutes = routes.filter(route => route.enabled !== false)

  enabledRoutes.forEach(route => {
    const targetEventType = route.toEventType || route.eventType || options.eventType || 'custom'
    bus.$emit(targetEventType, {
      from: options.from,
      to: route.toAppId,
      type: targetEventType,
      payload: {
        action: options.action,
        data: values,
        ...(options.extraPayload || {}),
      },
      timestamp: Date.now(),
    })
  })
}

const isEmptyFieldValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0)

const resolveRemoteOptions = (rawData: any, field: NativeFormNode): NativeFormOptionItem[] => {
  const listField = field.requestConfig?.listField?.trim()
  const labelField = field.requestConfig?.labelField?.trim()
  const valueField = field.requestConfig?.valueField?.trim()
  const childrenField = field.requestConfig?.childrenField?.trim()
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

const buildSubTableColumnField = (
  parentField: NativeFormNode,
  column: NonNullable<NativeFormNode['tableColumns']>[number],
): NativeFormNode => ({
  id: column.id,
  type: column.type,
  label: column.label,
  field: `${parentField.field || parentField.id}.${column.field}`,
  required: column.required,
  defaultValue: column.defaultValue,
  placeholder: column.placeholder,
  disabled: column.disabled,
  rules: column.rules,
  options: column.options,
  dataSourceType: column.dataSourceType,
  requestConfig: column.requestConfig,
  componentProps: {
    ...(column.componentProps || {}),
    readOnly: column.readOnly,
  },
  uploadConfig: column.uploadConfig,
  styleProps: {
    width: column.width ? `${column.width}px` : undefined,
  },
})

const buildSubTableRowDefaults = (
  columns: NonNullable<NativeFormNode['tableColumns']> | undefined,
) => (columns || []).reduce<Record<string, any>>((result, column) => {
  result[column.field] = parseNativeFormDefaultValue({
    id: column.id,
    type: column.type,
    label: column.label,
    field: column.field,
    defaultValue: column.defaultValue,
    componentProps: {
      ...(column.componentProps || {}),
    },
  } as NativeFormNode)
  return result
}, {})

const validateSubTableRows = (fields: NativeFormNode[], values: Record<string, any>) => {
  const traverse = (nodes: NativeFormNode[]) => {
    nodes.forEach((field) => {
      if (field.type === 'subTable' && field.field) {
        const rows = Array.isArray(values[field.field]) ? values[field.field] : []
        const columns = field.tableColumns || []

        rows.forEach((row: Record<string, any>, rowIndex: number) => {
          columns.forEach((column) => {
            const columnField: NativeFormNode = {
              id: column.id,
              type: column.type,
              label: column.label,
              field: column.field,
              required: column.required,
              defaultValue: column.defaultValue,
              placeholder: column.placeholder,
              disabled: column.disabled,
              rules: column.rules || buildNativeFormRuleList(
                { required: column.required },
                column.label,
                column.type,
              ),
              options: column.options,
              dataSourceType: column.dataSourceType,
              requestConfig: column.requestConfig,
              componentProps: {
                ...(column.componentProps || {}),
                readOnly: column.readOnly,
              },
              uploadConfig: column.uploadConfig,
            }

            const antRules = buildAntRules(buildNativeFormFieldRules(columnField))
            const rawValue = row?.[column.field]
            const normalizedValue = parseNativeFormDefaultValue({
              ...columnField,
              defaultValue: rawValue,
            })

            antRules.forEach((rule) => {
              if (rule.required) {
                const isEmpty =
                  normalizedValue === undefined ||
                  normalizedValue === null ||
                  normalizedValue === '' ||
                  (Array.isArray(normalizedValue) && normalizedValue.length === 0)
                if (isEmpty) {
                  throw new Error(`子表格「${field.label || '子表格'}」第 ${rowIndex + 1} 行「${column.label}」为必填项`)
                }
              }

              if (rule.pattern && normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== '') {
                if (!rule.pattern.test(String(normalizedValue))) {
                  throw new Error(rule.message || `子表格列「${column.label}」格式不符合要求`)
                }
              }

              if (rule.len !== undefined && normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== '') {
                if (String(normalizedValue).length !== Number(rule.len)) {
                  throw new Error(rule.message || `子表格列「${column.label}」长度不符合要求`)
                }
              }

              if (rule.min !== undefined && normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== '') {
                const compareValue = typeof normalizedValue === 'number'
                  ? normalizedValue
                  : String(normalizedValue).length
                if (compareValue < Number(rule.min)) {
                  throw new Error(rule.message || `子表格列「${column.label}」小于允许范围`)
                }
              }

              if (rule.max !== undefined && normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== '') {
                const compareValue = typeof normalizedValue === 'number'
                  ? normalizedValue
                  : String(normalizedValue).length
                if (compareValue > Number(rule.max)) {
                  throw new Error(rule.message || `子表格列「${column.label}」超出允许范围`)
                }
              }
            })
          })
        })
      }

      const childNodes = getNodeChildren(field)
      if (childNodes.length > 0) {
        traverse(childNodes)
      }
    })
  }

  traverse(fields)
}

const formatNativeFormSubmitValues = (values: Record<string, any>, fields: NativeFormNode[]) => {
  const result = { ...values }

  const normalizeUploadSubmitValue = (uploadField: NativeFormNode, rawValue: any) => {
    if (!Array.isArray(rawValue)) {
      return rawValue
    }

    return rawValue.map((item: any) => {
      if (uploadField.uploadConfig?.valueMode === 'object') {
        return item
      }

      return item?.url || item?.response?.url || item?.filename || item?.name || item
    })
  }

  const traverse = (nodes: NativeFormNode[]) => {
    nodes.forEach((field) => {
      if (field.type === 'upload' && field.field && Array.isArray(result[field.field])) {
        result[field.field] = normalizeUploadSubmitValue(field, result[field.field])
      }

      if (field.type === 'subTable' && field.field) {
        const rows = Array.isArray(result[field.field]) ? result[field.field] : []
        result[field.field] = rows.map((row: Record<string, any>) => {
          const nextRow = { ...row }

          ;(field.tableColumns || []).forEach((column) => {
            if (column.type === 'upload' && column.field) {
              nextRow[column.field] = normalizeUploadSubmitValue(
                {
                  id: column.id,
                  type: column.type,
                  uploadConfig: column.uploadConfig,
                } as NativeFormNode,
                nextRow[column.field],
              )
            }
          })

          return nextRow
        })
      }

      const childNodes = getNodeChildren(field)
      if (childNodes.length > 0) {
        traverse(childNodes)
      }
    })
  }

  traverse(fields)
  return result
}

const buildAntRules = (rules: NativeFormFieldRule[]) =>
  rules.map((rule) => {
    if (rule.type === 'pattern' && rule.pattern) {
      const pattern = parseNativeFormRegexPattern(rule.pattern) || /$a/

      return {
        pattern,
        message: rule.message,
      }
    }

    return {
      required: rule.required,
      min: rule.min,
      max: rule.max,
      len: rule.len,
      message: rule.message,
    }
  })

const collectValidatableFieldNames = (nodes: NativeFormNode[]): string[] =>
  nodes.flatMap((field) => {
    const current =
      field.field && field.type !== 'button' && !isNativeFormContainerField(field.type)
        ? [field.field]
        : []
    const childNodes = getNodeChildren(field)
    const children = childNodes.length > 0
      ? collectValidatableFieldNames(childNodes)
      : []
    return [...current, ...children]
  })

const buildRendererBodyStyle = (
  appearance: NativeFormAppearanceConfig | undefined,
): React.CSSProperties => ({
  padding: appearance?.padding,
  borderRadius: appearance?.borderRadius,
  backgroundColor: appearance?.backgroundColor || undefined,
  borderColor:
    appearance?.bordered === false
      ? undefined
      : (appearance?.borderColor || 'var(--ant-color-border)'),
  boxShadow: appearance?.boxShadow || undefined,
  borderStyle: appearance?.bordered === false ? 'none' : 'solid',
  borderWidth: appearance?.bordered === false ? 0 : 1,
})

const buildContainerSectionStyle = (field: NativeFormNode): React.CSSProperties => ({
  padding: field.componentProps?.padding,
  backgroundColor: field.componentProps?.backgroundColor || undefined,
  borderColor: field.componentProps?.borderColor || undefined,
  borderStyle: field.componentProps?.borderStyle || undefined,
  borderRadius: field.componentProps?.borderRadius,
  width: field.styleProps?.width || undefined,
  height: field.styleProps?.height || undefined,
  marginTop: field.styleProps?.marginTop,
  marginBottom: field.styleProps?.marginBottom,
})

const buildContainerBodyStyle = (field: NativeFormNode): React.CSSProperties | undefined => {
  if (field.type === 'grid') {
    return {
      gridTemplateColumns: `repeat(${field.columns || 2}, minmax(0, 1fr))`,
      columnGap: field.componentProps?.columnGap,
      rowGap: field.componentProps?.rowGap,
    }
  }

  if (field.type === 'flex') {
    return {
      display: 'flex',
      flexDirection: field.componentProps?.direction === 'vertical' ? 'column' : 'row',
      gap: field.componentProps?.gap,
      flexWrap: field.componentProps?.wrap ? 'wrap' : 'nowrap',
      justifyContent: field.componentProps?.justify || 'flex-start',
      alignItems: field.componentProps?.align || 'stretch',
    }
  }

  return undefined
}

const NativeFormRenderer: React.FC<NativeFormRendererProps> = ({
  config,
  widgetId,
  form: externalForm,
  runtimeParams = {},
  formValueVersion,
  onFormSubmit,
  onFormChange,
  onFormReset,
  onFieldEvent,
}) => {
  const [internalForm] = Form.useForm()
  const form = externalForm || internalForm
  const normalizedConfig = useMemo(() => normalizeNativeFormConfig(config), [config])
  const layoutConfig = normalizedConfig.formSchema.layout
  const appearance = normalizedConfig.appearance
  const layoutLabelCol = useMemo(
    () => parseNativeFormLayoutCol(layoutConfig.labelCol),
    [layoutConfig.labelCol],
  )
  const layoutWrapperCol = useMemo(
    () => parseNativeFormLayoutCol(layoutConfig.wrapperCol),
    [layoutConfig.wrapperCol],
  )
  const fields = useMemo(
    () => normalizedConfig.formSchema.children.filter(item => !item.hidden),
    [normalizedConfig.formSchema.children],
  )
  const initialValues = useMemo(() => buildFieldInitialValues(fields), [fields])
  const [remoteOptionsMap, setRemoteOptionsMap] = useState<Record<string, NativeFormOptionItem[]>>({})
  const [formValues, setFormValues] = useState<Record<string, any>>(initialValues)
  const globalConfigDetail = useGlobalConfigStore(state => state.detail)
  const ensureGlobalConfigLoaded = useGlobalConfigStore(state => state.ensureLoaded)
  const submitConfig: NativeFormSubmitConfig = normalizedConfig.submitConfig || {}
  const linkageRuntime = normalizedConfig.linkageRuntime || {}
  const remoteOptionsRuntimeParams = linkageRuntime.reloadOptionsOnParamsChange === false ? undefined : runtimeParams
  const widgetSourceId = widgetId || 'native-form-widget'

  useEffect(() => {
    if (!submitConfig.successMessage || !submitConfig.failureMessage) {
      void ensureGlobalConfigLoaded()
    }
  }, [ensureGlobalConfigLoaded, submitConfig.failureMessage, submitConfig.successMessage])

  useEffect(() => {
    form.resetFields()
    form.setFieldsValue(initialValues)
    setFormValues(initialValues)
  }, [form, initialValues])

  useEffect(() => {
    if (formValueVersion === undefined) {
      return
    }

    setFormValues(form.getFieldsValue(true))
  }, [form, formValueVersion])

  // M6.1 联动：被隐藏的字段自动清空提交值，避免脏数据被表单带出去
  useEffect(() => {
    const traverse = (nodes: NativeFormNode[]) => {
      nodes.forEach((field) => {
        if (!field.field) {
          const childNodes = getNodeChildren(field)
          if (childNodes.length > 0) {
            traverse(childNodes)
          }
          return
        }
        const conditions = field.visibilityConditions
          || (field.visibilityCondition ? [field.visibilityCondition] : undefined)
        if (!conditions?.length) {
          const childNodes = getNodeChildren(field)
          if (childNodes.length > 0) {
            traverse(childNodes)
          }
          return
        }
        const isVisible = evaluateFieldConditions(conditions, field.visibilityMatchMode, formValues)
        if (!isVisible && form.getFieldValue(field.field) !== undefined) {
          form.setFieldValue(field.field, undefined)
        }
        const childNodes = getNodeChildren(field)
        if (childNodes.length > 0) {
          traverse(childNodes)
        }
      })
    }
    traverse(fields)
  }, [fields, form, formValues])

  useEffect(() => {
    let cancelled = false

    const collectRequestFields = (nodes: NativeFormNode[]): NativeFormNode[] =>
      nodes.flatMap((field) => {
        const current = (
          ['select', 'transfer', 'checkableTag', 'radioGroup', 'checkboxGroup', 'cascader', 'treeSelect'].includes(field.type) &&
          field.dataSourceType === 'request' &&
          field.requestConfig?.endpoint
        ) ? [field] : []
        const subTableColumns = field.type === 'subTable'
          ? (field.tableColumns || [])
              .filter(column =>
                ['select', 'transfer', 'checkableTag', 'radioGroup', 'checkboxGroup', 'cascader', 'treeSelect'].includes(column.type) &&
                column.dataSourceType === 'request' &&
                column.requestConfig?.endpoint,
              )
              .map(column => buildSubTableColumnField(field, column))
          : []
        const childNodes = getNodeChildren(field)
        const children = childNodes.length > 0 ? collectRequestFields(childNodes) : []
        return [...current, ...subTableColumns, ...children]
      })

    const loadOptions = async () => {
      const requestFields = collectRequestFields(fields)
      const nextMap: Record<string, NativeFormOptionItem[]> = {}
      const requestSource = { formValues, runtimeParams }

      for (const field of requestFields) {
        try {
          const method = field.requestConfig?.method || 'GET'
          const query = resolveRequestConfigValue(parseJsonConfig(field.requestConfig?.query), requestSource)
          const body = resolveRequestConfigValue(parseJsonConfig(field.requestConfig?.body), requestSource)
          const response = await axios({
            method,
            url: field.requestConfig?.endpoint,
            headers: field.requestConfig?.headers,
            params: query,
            ...(method === 'GET' ? {} : { data: body }),
          })
          nextMap[field.id] = resolveRemoteOptions(response.data, field)
        } catch (error) {
          console.error('原生表单字段远程选项加载失败:', error)
          nextMap[field.id] = []
        }
      }

      if (!cancelled) {
        setRemoteOptionsMap(nextMap)
      }
    }

    void loadOptions()

    return () => {
      cancelled = true
    }
  }, [fields, formValues, remoteOptionsRuntimeParams])

  const handleValuesChange = useCallback((
    changedValues: Record<string, any>,
    allValues: Record<string, any>,
    meta?: NativeFormChangeMeta,
  ) => {
    setFormValues(allValues)
    onFormChange?.(changedValues, allValues, meta)
  }, [onFormChange])

  const handleReset = useCallback((meta?: NativeFormChangeMeta) => {
    const previousValues = form.getFieldsValue(true)
    form.resetFields()
    form.setFieldsValue(initialValues)
    setFormValues(initialValues)
    onFormReset?.(initialValues, previousValues)
    onFormChange?.(initialValues, initialValues, {
      source: 'reset',
      shouldEmitOutput: false,
      ...meta,
    })
  }, [form, initialValues, onFormChange, onFormReset])

  const triggerFieldEvent = useCallback((
    field: NativeFormNode,
    type: 'change' | 'click',
    value?: any,
  ) => {
    const currentValues = form.getFieldsValue(true)
    onFieldEvent?.(`field.${type}` as 'field.change' | 'field.click', {
      field: field.field,
      value,
      values: currentValues,
      fieldConfig: field,
    })

    const routes =
      type === 'change'
        ? field.eventConfig?.changeRoutes || []
        : field.eventConfig?.clickRoutes || []

    if (!routes.length) {
      return
    }

    emitRoutes(routes, currentValues, {
      from: widgetSourceId,
      action: type,
      eventType: type === 'change' ? 'data:update' : 'user:action',
      extraPayload: {
        field: {
          id: field.id,
          type: field.type,
          name: field.field,
          label: field.label,
          value,
        },
      },
    })
  }, [form, onFieldEvent, widgetSourceId])

  const buildApiQuery = useCallback((
    values: Record<string, any>,
    submitProfile?: NativeFormSubmitConfig,
  ) => {
    const configuredQuery = parseJsonConfig(submitProfile?.apiQuery)

    if (configuredQuery && typeof configuredQuery === 'object' && !Array.isArray(configuredQuery)) {
      return submitProfile?.apiMethod === 'GET'
        ? {
            ...configuredQuery,
            ...values,
          }
        : configuredQuery
    }

    return submitProfile?.apiMethod === 'GET' ? values : undefined
  }, [])

  const buildApiPayload = useCallback((
    values: Record<string, any>,
    submitProfile?: NativeFormSubmitConfig,
  ) => {
    const configuredBody = parseJsonConfig(submitProfile?.apiBody)

    if (configuredBody && typeof configuredBody === 'object' && !Array.isArray(configuredBody)) {
      return {
        ...configuredBody,
        ...values,
      }
    }

    return values
  }, [])

  const handleUpload = useCallback(async (field: NativeFormNode, file: File) => {
    if (field.uploadConfig?.action) {
      const formData = new FormData()
      formData.append('file', file)
      const response = await axios.post(field.uploadConfig.action, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      assertUploadResponseSuccess(response.data)
      return response.data
    }

    const response = await uploadImage(file)
    assertUploadResponseSuccess(response)
    return response.data || response
  }, [])

  const handleSubTableChange = useCallback((field: NativeFormNode, nextValue: any[]) => {
    if (!field.field) {
      return
    }

    form.setFieldValue(field.field, nextValue)
    const nextValues = form.getFieldsValue(true)
    handleValuesChange({ [field.field]: nextValue }, nextValues, { source: 'user' })
    triggerFieldEvent(field, 'change', nextValue)
  }, [form, handleValuesChange, triggerFieldEvent])

  const renderSubTable = useCallback((field: NativeFormNode) => {
    const currentRows = form.getFieldValue(field.field || '') || []
    const columns = (field.tableColumns || []).map((column) => ({
      title: column.label,
      dataIndex: column.field,
      key: column.id,
      width: column.width,
      render: (_: any, record: any, rowIndex: number) => (
        <NativeFormFieldControl
          field={{
            id: column.id,
            type: column.type,
            label: column.label,
            field: column.field,
            required: column.required,
            defaultValue: column.defaultValue,
            placeholder: column.placeholder,
            disabled: column.disabled,
            rules: column.rules,
            options: column.options,
            dataSourceType: column.dataSourceType,
            requestConfig: column.requestConfig,
            componentProps: {
              ...(column.componentProps || {}),
              readOnly: column.readOnly,
            },
            uploadConfig: column.uploadConfig,
            styleProps: {
              width: column.width ? `${column.width}px` : undefined,
            },
          }}
          value={record?.[column.field]}
          onValueChange={(value) => {
            const nextRows = [...currentRows]
            nextRows[rowIndex] = {
              ...nextRows[rowIndex],
              [column.field]: value,
            }
            handleSubTableChange(field, nextRows)
          }}
          options={remoteOptionsMap[column.id] || column.options}
        />
      ),
    }))

    const actionColumn = {
      title: '操作',
      key: 'actions',
      width: 88,
      render: (_: any, __: any, rowIndex: number) => (
        <Button
          type="link"
          danger
          onClick={() => {
            const nextRows = currentRows.filter((_: any, index: number) => index !== rowIndex)
            handleSubTableChange(field, nextRows)
          }}
        >
          删除
        </Button>
      ),
    }

    return (
      <div className="native-form-renderer__sub-table-editor">
        <Space className="native-form-renderer__sub-table-toolbar">
          <Typography.Text strong>{field.label || '子表格'}</Typography.Text>
          <Button
            size="small"
            onClick={() => {
              const nextRows = [...currentRows, buildSubTableRowDefaults(field.tableColumns)]
              handleSubTableChange(field, nextRows)
            }}
          >
            新增行
          </Button>
        </Space>
        <Table
          rowKey={(_, index) => `${field.id}-${index}`}
          pagination={false}
          size="small"
          dataSource={currentRows}
          columns={[...columns, actionColumn]}
        />
      </div>
    )
  }, [form, handleSubTableChange])

  const handleSubmit = useCallback(async () => {
    try {
      const activeSubmitConfig = submitConfig

      const values = form.getFieldsValue(true)
      const fieldNames = collectValidatableFieldNames(fields)
      const fieldErrorMap = new Map<string, string[]>()

      const appendFieldError = (fieldName: string, messageText?: string) => {
        if (!messageText) {
          return
        }

        const currentErrors = fieldErrorMap.get(fieldName) || []
        if (!currentErrors.includes(messageText)) {
          fieldErrorMap.set(fieldName, [...currentErrors, messageText])
        }
      }

      const validateFieldNodes = (nodes: NativeFormNode[]) => {
        nodes.forEach((field) => {
          const visibilityConditions =
            field.visibilityConditions ||
            (field.visibilityCondition ? [field.visibilityCondition] : undefined)
          const isVisible = visibilityConditions
            ? evaluateFieldConditions(visibilityConditions, field.visibilityMatchMode, values)
            : true

          if (!isVisible) {
            return
          }

          const disabledConditions =
            field.disabledConditions ||
            (field.disabledCondition ? [field.disabledCondition] : undefined)
          const isDisabledByCondition = disabledConditions
            ? evaluateFieldConditions(disabledConditions, field.disabledMatchMode, values)
            : false
          const mergedField: NativeFormNode = {
            ...field,
            disabled: field.disabled || isDisabledByCondition,
          }

          if (isNativeFormContainerField(mergedField.type)) {
            validateFieldNodes(getNodeChildren(mergedField))
            return
          }

          if (
            mergedField.type === 'button' ||
            !mergedField.field ||
            mergedField.disabled
          ) {
            return
          }

          const normalizedValue = parseNativeFormDefaultValue({
            ...mergedField,
            defaultValue: values[mergedField.field],
          })

          buildAntRules(buildNativeFormFieldRules(mergedField)).forEach((rule) => {
            if (rule.required && isEmptyFieldValue(normalizedValue)) {
              appendFieldError(mergedField.field!, rule.message)
              return
            }

            if (isEmptyFieldValue(normalizedValue)) {
              return
            }

            if (rule.pattern && !rule.pattern.test(String(normalizedValue))) {
              appendFieldError(mergedField.field!, rule.message)
            }

            if (rule.len !== undefined && String(normalizedValue).length !== Number(rule.len)) {
              appendFieldError(mergedField.field!, rule.message)
            }

            if (rule.min !== undefined) {
              const compareValue =
                typeof normalizedValue === 'number'
                  ? normalizedValue
                  : String(normalizedValue).length
              if (compareValue < Number(rule.min)) {
                appendFieldError(mergedField.field!, rule.message)
              }
            }

            if (rule.max !== undefined) {
              const compareValue =
                typeof normalizedValue === 'number'
                  ? normalizedValue
                  : String(normalizedValue).length
              if (compareValue > Number(rule.max)) {
                appendFieldError(mergedField.field!, rule.message)
              }
            }
          })
        })
      }

      validateFieldNodes(fields)

      form.setFields(
        fieldNames.map((fieldName) => ({
          name: fieldName,
          errors: fieldErrorMap.get(fieldName) || [],
        })),
      )

      if (fieldErrorMap.size > 0) {
        return
      }

      validateSubTableRows(fields, values)
      const formattedValues = formatNativeFormSubmitValues(values, fields)
      let submitResponse: any
      const successMessage =
        activeSubmitConfig.successMessage || getGlobalMessageCopy(globalConfigDetail, 'form.success')
      const failureMessage =
        activeSubmitConfig.failureMessage || getGlobalMessageCopy(globalConfigDetail, 'form.error')

      if (activeSubmitConfig.mode === 'api') {
        if (!activeSubmitConfig.apiEndpoint) {
          message.warning('请先配置提交接口地址')
          return
        }

        const requestQuery = buildApiQuery(formattedValues, activeSubmitConfig)
        const requestPayload = buildApiPayload(formattedValues, activeSubmitConfig)

        const response = await axios({
          method: activeSubmitConfig.apiMethod || 'POST',
          url: activeSubmitConfig.apiEndpoint,
          ...(requestQuery ? { params: requestQuery } : {}),
          ...((activeSubmitConfig.apiMethod || 'POST') === 'GET' ? {} : { data: requestPayload }),
          ...(activeSubmitConfig.apiHeaders ? { headers: activeSubmitConfig.apiHeaders } : {}),
        })
        submitResponse = response?.data

        // 提交成功后，按 responseMapping 把响应字段回写到表单
        const mapping = activeSubmitConfig.responseMapping
        if (Array.isArray(mapping) && mapping.length > 0) {
          const responseData = response?.data
          const patch: Record<string, any> = {}
          mapping.forEach((item) => {
            if (!item?.source || !item?.target) {
              return
            }
            const value = getValueByPath(responseData, item.source)
            if (value !== undefined) {
              patch[item.target] = value
            }
          })
          if (Object.keys(patch).length > 0) {
            form.setFieldsValue(patch)
            setFormValues({ ...formattedValues, ...patch })
          }
        }
      }

      if (activeSubmitConfig.mode === 'eventRoute') {
        emitRoutes(activeSubmitConfig.eventRoutes || [], formattedValues, {
          from: widgetSourceId,
          action: 'submit',
          eventType: 'data:submit',
        })
      }

      onFormSubmit?.(formattedValues, submitResponse)
      if (activeSubmitConfig.mode !== 'none') {
        message.success(successMessage)
      }

      if (activeSubmitConfig.mode === 'eventRoute' && (activeSubmitConfig.eventRoutes || []).length > 0) {
        emitRoutes(activeSubmitConfig.eventRoutes || [], formattedValues, {
          from: widgetSourceId,
          action: 'success',
          eventType: 'success',
        })
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }

      const failureMessage =
        submitConfig.failureMessage || getGlobalMessageCopy(globalConfigDetail, 'form.error')
      message.error(failureMessage)

      if (submitConfig.mode === 'eventRoute' && (submitConfig.eventRoutes || []).length > 0) {
        const isAxiosError = axios.isAxiosError(error)
        emitRoutes(submitConfig.eventRoutes || [], form.getFieldsValue(true), {
          from: widgetSourceId,
          action: 'error',
          eventType: 'error',
          extraPayload: {
            errorMessage: error?.message || failureMessage,
            ...(isAxiosError
              ? {
                  status: error.response?.status,
                  url: error.config?.url,
                  method: error.config?.method?.toUpperCase?.(),
                  responseData: error.response?.data,
                }
              : {}),
          },
        })
      }

      console.error('原生表单提交失败:', error)
    }
  }, [
    buildApiPayload,
    buildApiQuery,
    fields,
    form,
    globalConfigDetail,
    submitConfig,
    widgetSourceId,
  ])

  const handleButtonClick = useCallback((field: NativeFormNode) => {
    triggerFieldEvent(field, 'click')

    const actionType = field.componentProps?.actionType || 'submit'
    if (actionType === 'submit') {
      void handleSubmit()
      return
    }

    if (actionType === 'reset') {
      handleReset()
      return
    }

    if (actionType === 'event' || actionType === 'none') {
      return
    }
  }, [handleReset, handleSubmit, triggerFieldEvent])

  const handleFieldValueChange = useCallback((field: NativeFormNode, value: any) => {
    if (!field.field) {
      return
    }

    form.setFieldValue(field.field, value)
    form.validateFields([field.field]).catch(() => undefined)
    const nextValues = {
      ...form.getFieldsValue(true),
      [field.field]: value,
    }
    handleValuesChange({ [field.field]: value }, nextValues, { source: 'user' })
    triggerFieldEvent(field, 'change', value)
  }, [form, handleValuesChange, triggerFieldEvent])

  const renderFieldNodes = useCallback((nodes: NativeFormNode[]): React.ReactNode =>
    nodes
      .filter((item) => !item.hidden)
      .map((field) => {
        const visibilityConditions =
          field.visibilityConditions ||
          (field.visibilityCondition ? [field.visibilityCondition] : undefined)
        const isVisible = visibilityConditions
          ? evaluateFieldConditions(visibilityConditions, field.visibilityMatchMode, formValues)
          : true

        if (!isVisible) {
          return null
        }

        const disabledConditions =
          field.disabledConditions ||
          (field.disabledCondition ? [field.disabledCondition] : undefined)
        const isDisabledByCondition = disabledConditions
          ? evaluateFieldConditions(disabledConditions, field.disabledMatchMode, formValues)
          : false
        const mergedField: NativeFormNode = {
          ...field,
          disabled: field.disabled || isDisabledByCondition,
        }

        if (field.type === 'subTable') {
          return (
            <div key={field.id} className="native-form-renderer__section">
              {renderSubTable(mergedField)}
            </div>
          )
        }

        if (isNativeFormContainerField(field.type)) {
          const childNodes = getNodeChildren(mergedField)

          return (
            <div
              key={field.id}
              className={`native-form-renderer__section native-form-renderer__section--${field.type}`}
              style={buildContainerSectionStyle(mergedField)}
            >
              {field.type === 'grid' ? (
                <div
                  className="native-form-renderer__section-body native-form-renderer__section-body--grid"
                  style={buildContainerBodyStyle(mergedField)}
                >
                  {(mergedField.gridCells || []).map((cell) => (
                    <div key={cell.id} className="native-form-renderer__grid-cell">
                      {cell.node ? renderFieldNodes([cell.node]) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`native-form-renderer__section-body ${field.type === 'flex' ? 'native-form-renderer__section-body--flex' : ''}`}
                  style={buildContainerBodyStyle(mergedField)}
                >
                  {renderFieldNodes(childNodes)}
                </div>
              )}
            </div>
          )
        }

        return (
          <Form.Item
            key={field.id}
            label={getNativeFormFieldItemLabel(mergedField)}
            name={field.field}
            trigger="onValueChange"
            valuePropName={field.type === 'switch' ? 'checked' : 'value'}
            rules={buildAntRules(buildNativeFormFieldRules(mergedField))}
            className={getNativeFormFieldItemClassName('native-form-renderer__item', mergedField)}
            style={getNativeFormFieldItemStyle(mergedField)}
            tooltip={mergedField.itemProps?.tooltip}
            labelAlign={mergedField.itemProps?.labelAlign}
            colon={layoutConfig.colon}
            required={mergedField.required}
            {...getNativeFormFieldLabelLayout(
              mergedField,
              layoutConfig.mode,
              layoutLabelCol ? undefined : layoutConfig.labelWidth,
            )}
          >
            <div
              className="native-form-renderer__control-wrap"
              style={getNativeFormFieldControlStyle(mergedField)}
            >
              <NativeFormFieldControl
                field={mergedField}
                value={field.field ? form.getFieldValue(field.field) : undefined}
                options={remoteOptionsMap[field.id] || field.options}
                onValueChange={(value) => handleFieldValueChange(field, value)}
                onUpload={(file) => handleUpload(field, file)}
                onClick={() => (
                  field.type === 'button'
                    ? handleButtonClick(field)
                    : triggerFieldEvent(field, 'click')
                )}
              />
            </div>
          </Form.Item>
        )
      }),
  [form, formValues, handleButtonClick, handleFieldValueChange, handleUpload, remoteOptionsMap, renderSubTable, triggerFieldEvent])

  const bodyStyle = useMemo(
    () => buildRendererBodyStyle(appearance),
    [appearance],
  )

  return (
    <div
      className="native-form-renderer"
      style={{
        '--native-form-field-gap': `${layoutConfig.fieldSpacing || 16}px`,
      } as React.CSSProperties}
    >
      <div className="native-form-renderer__body" style={bodyStyle}>
        {fields.length > 0 ? (
          <Form
            form={form}
            layout={layoutConfig.mode}
            initialValues={initialValues}
            onValuesChange={(changedValues, allValues) => {
              handleValuesChange(changedValues, allValues, { source: 'user' })
            }}
            labelAlign={layoutConfig.labelAlign}
            colon={layoutConfig.colon}
            size={layoutConfig.size}
            variant={layoutConfig.variant}
            labelCol={
              layoutConfig.mode === 'horizontal'
                ? layoutLabelCol || { span: 6 }
                : undefined
            }
            wrapperCol={
              layoutConfig.mode === 'horizontal'
                ? layoutWrapperCol || { span: 12 }
                : undefined
            }
            className="native-form-renderer__form"
          >
            {renderFieldNodes(fields)}
          </Form>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="表单暂未配置字段"
          />
        )}
      </div>
    </div>
  )
}

export default NativeFormRenderer
