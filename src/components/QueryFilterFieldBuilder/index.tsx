import React, { useMemo } from 'react'
import {
  Button,
  Checkbox,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
} from 'antd'
import type { FormInstance } from 'antd'
import type { NamePath } from 'antd/es/form/interface'
import { CaretRightOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import OptionListEditor from '@/components/OptionListEditor'
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs'
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton'
import type { QueryFilterFieldConfig, QueryFilterFieldType } from '@/types'
import { keyValueListToObject } from '@/utils/widgetApi'
import './index.scss'

interface QueryFilterFieldBuilderProps {
  form: FormInstance
  name: NamePath
}

interface QueryFilterFieldCardProps {
  form: FormInstance
  baseName: Array<string | number>
  fieldIndex: number
  fieldKey: React.Key
  remove: (index: number) => void
  duplicateFieldNames: Set<string>
}

const FIELD_TYPE_OPTIONS: Array<{ label: string; value: QueryFilterFieldType }> = [
  { label: '输入框', value: 'input' },
  { label: '复选按钮组', value: 'checkboxGroup' },
  { label: '级联选择器', value: 'cascader' },
  { label: '日期选择框', value: 'datePicker' },
  { label: '数字表单项', value: 'inputNumber' },
  { label: '单选框组', value: 'radioGroup' },
  { label: '下拉选择器', value: 'select' },
]

const FIELD_TYPE_LABELS = FIELD_TYPE_OPTIONS.reduce<Record<string, string>>((result, item) => {
  result[item.value] = item.label
  return result
}, {})

const REQUEST_METHOD_OPTIONS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
]

const PLACEHOLDER_FIELD_TYPES: QueryFilterFieldType[] = ['input', 'select', 'datePicker', 'inputNumber']

const DEFAULT_FIELD_BY_TYPE: Record<QueryFilterFieldType, Partial<QueryFilterFieldConfig>> = {
  input: {
    label: '输入框',
    field: 'input_field',
    type: 'input',
  },
  checkboxGroup: {
    label: '复选按钮组',
    field: 'checkbox_group',
    type: 'checkboxGroup',
    direction: 'horizontal',
    dataSourceType: 'manual',
  },
  cascader: {
    label: '级联选择器',
    field: 'cascader_field',
    type: 'cascader',
    dataMode: 'json',
  },
  datePicker: {
    label: '日期选择框',
    field: 'date_field',
    type: 'datePicker',
    pickerType: 'date',
  },
  inputNumber: {
    label: '数字表单项',
    field: 'number_field',
    type: 'inputNumber',
  },
  radioGroup: {
    label: '单选框组',
    field: 'radio_group',
    type: 'radioGroup',
    direction: 'horizontal',
    dataSourceType: 'manual',
  },
  select: {
    label: '下拉选择器',
    field: 'select_field',
    type: 'select',
    mode: 'single',
    showSearch: false,
    dataSourceType: 'manual',
  },
}

const ensurePathArray = (name: NamePath): Array<string | number> => (
  Array.isArray(name) ? name : [name]
)

const buildPath = (baseName: Array<string | number>, ...parts: Array<string | number>) => [
  ...baseName,
  ...parts,
]

const cloneFieldDefaults = (type: QueryFilterFieldType): Partial<QueryFilterFieldConfig> => ({
  ...DEFAULT_FIELD_BY_TYPE[type],
})

const createFieldConfig = (type: QueryFilterFieldType, index: number): QueryFilterFieldConfig => {
  const defaults = cloneFieldDefaults(type)
  const labelPrefix = defaults.label || FIELD_TYPE_LABELS[type] || '字段'
  const fieldPrefix = defaults.field || 'field'

  return {
    id: uuidv4(),
    type,
    ...defaults,
    label: `${labelPrefix}${index}`,
    field: `${fieldPrefix}_${index}`,
  } as QueryFilterFieldConfig
}

const validateJson = (_: unknown, value?: string) => {
  if (!value?.trim()) {
    return Promise.resolve()
  }

  try {
    JSON.parse(value)
    return Promise.resolve()
  } catch {
    return Promise.reject(new Error('请输入合法的 JSON'))
  }
}

const getManualOptionsError = (value?: Array<{ label?: string; value?: string | number }>) => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined
  }

  const hasInvalidItem = value.some(item => {
    const label = item?.label?.trim()
    const optionValue = item?.value
    return !label || optionValue === undefined || optionValue === null || String(optionValue).trim() === ''
  })

  return hasInvalidItem ? '请完善手动数据项的字段名和字段值' : undefined
}

const QueryFilterFieldCard: React.FC<QueryFilterFieldCardProps> = ({
  form,
  baseName,
  fieldIndex,
  fieldKey,
  remove,
  duplicateFieldNames,
}) => {
  const fieldPath = useMemo(() => buildPath(baseName, fieldIndex), [baseName, fieldIndex])
  const currentField = Form.useWatch(fieldPath, form) || {}
  const currentLabel = currentField?.label || `字段 ${fieldIndex + 1}`
  const currentType = (currentField?.type || 'input') as QueryFilterFieldType
  const currentFieldName = currentField?.field || ''
  const fieldNameError = !currentFieldName?.trim()
    ? 'field 名不能为空'
    : duplicateFieldNames.has(currentFieldName.trim())
      ? 'field 名称重复'
      : undefined
  const showPlaceholder = PLACEHOLDER_FIELD_TYPES.includes(currentType)
  const selectMode = currentField?.mode || 'single'
  const pickerType = currentField?.pickerType || 'date'
  const isArrayDefault =
    ['checkboxGroup', 'cascader'].includes(currentType) ||
    (currentType === 'select' && selectMode === 'multiple') ||
    (currentType === 'datePicker' && pickerType === 'range')
  const sourceType = currentField?.dataSourceType || 'manual'
  const dataMode = currentField?.dataMode || 'json'
  const manualOptions = currentField?.manualOptions || []

  const getRequestConfig = () => form.getFieldValue(buildPath(fieldPath, 'requestConfig')) || {}

  const buildRequestDebugConfig = () => {
    const requestConfig = getRequestConfig()
    return {
      endpoint: requestConfig.endpoint,
      method: requestConfig.method || 'GET',
      headers: keyValueListToObject(requestConfig.headersList),
      query: keyValueListToObject(requestConfig.queryList),
      body: keyValueListToObject(requestConfig.bodyList),
      listField: requestConfig.listField,
    }
  }

  const handleTypeChange = (nextType: QueryFilterFieldType) => {
    const nextDefaults = cloneFieldDefaults(nextType)
    const previousValue = form.getFieldValue(fieldPath) || {}

    form.setFieldValue(fieldPath, {
      ...previousValue,
      ...nextDefaults,
      type: nextType,
      id: previousValue.id || uuidv4(),
      label: previousValue.label || nextDefaults.label,
      field: previousValue.field || nextDefaults.field,
    })
  }

  const renderRequestConfig = (options: {
    endpointPlaceholder: string
    listFieldLabel?: string
    listFieldPlaceholder?: string
    childrenFieldLabel?: string
    childrenFieldPlaceholder?: string
    debugHint: string
  }) => (
    <>
      <Form.Item label="接口地址" required className="widget-api-form-item">
        <div className="widget-api-endpoint-row">
          <Form.Item name={buildPath(fieldPath, 'requestConfig', 'method')} noStyle>
            <Select
              className="widget-api-endpoint-row__method"
              options={REQUEST_METHOD_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            name={buildPath(fieldPath, 'requestConfig', 'endpoint')}
            noStyle
            rules={[{ required: true, message: '请输入接口地址' }]}
          >
            <Input
              className="widget-api-endpoint-row__input"
              placeholder={options.endpointPlaceholder}
            />
          </Form.Item>
        </div>
      </Form.Item>

      <div className={options.childrenFieldLabel ? 'form-row-4' : 'form-row-3'}>
        <Form.Item
          name={buildPath(fieldPath, 'requestConfig', 'listField')}
          label={options.listFieldLabel || '列表字段路径'}
        >
          <Input placeholder={options.listFieldPlaceholder || 'data.list'} />
        </Form.Item>
        <Form.Item
          name={buildPath(fieldPath, 'requestConfig', 'labelField')}
          label="字段名映射"
        >
          <Input placeholder="label" />
        </Form.Item>
        <Form.Item
          name={buildPath(fieldPath, 'requestConfig', 'valueField')}
          label="字段值映射"
        >
          <Input placeholder="value" />
        </Form.Item>
        {options.childrenFieldLabel && (
          <Form.Item
            name={buildPath(fieldPath, 'requestConfig', 'childrenField')}
            label={options.childrenFieldLabel}
          >
            <Input placeholder={options.childrenFieldPlaceholder || 'children'} />
          </Form.Item>
        )}
      </div>

      <Form.Item label="参数配置" className="widget-api-form-item">
        <WidgetApiConfigTabs
          form={form}
          methodName={buildPath(fieldPath, 'requestConfig', 'method')}
          headersName={buildPath(fieldPath, 'requestConfig', 'headersList')}
          queryName={buildPath(fieldPath, 'requestConfig', 'queryList')}
          bodyName={buildPath(fieldPath, 'requestConfig', 'bodyList')}
          debugContent={
            <WidgetApiDebugButton
              form={form}
              buildConfig={buildRequestDebugConfig}
            />
          }
          debugHint={options.debugHint}
        />
      </Form.Item>
    </>
  )

  return (
    <Collapse
      className="query-filter-field-builder__collapse-item"
      items={[
        {
          key: String(fieldKey),
          forceRender: true,
          label: (
            <div className="query-filter-field-builder__header">
              <span>{currentLabel}</span>
              <span className="query-filter-field-builder__meta">
                {currentFieldName || '未设置 field'} / {FIELD_TYPE_LABELS[currentType] || currentType}
              </span>
            </div>
          ),
          extra: (
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={event => {
                event.stopPropagation()
                remove(fieldIndex)
              }}
            />
          ),
          children: (
            <div className="query-filter-field-builder__body">
              <div className="form-row-2">
                <Form.Item
                  name={buildPath(fieldPath, 'label')}
                  label="Label 名称"
                  rules={[{ required: true, message: '请输入 Label 名称' }]}
                >
                  <Input placeholder="例如：关键字" />
                </Form.Item>
                <Form.Item
                  name={buildPath(fieldPath, 'field')}
                  label="Field 名称"
                  rules={[{ required: true, message: '请输入 Field 名称' }]}
                  validateStatus={fieldNameError ? 'error' : undefined}
                  help={fieldNameError}
                >
                  <Input placeholder="例如：keyword" />
                </Form.Item>
              </div>

              <div className="form-row-2">
                <Form.Item
                  name={buildPath(fieldPath, 'type')}
                  label="字段类型"
                  rules={[{ required: true, message: '请选择字段类型' }]}
                >
                  <Select
                    options={FIELD_TYPE_OPTIONS}
                    onChange={handleTypeChange}
                  />
                </Form.Item>
                <div />
              </div>

              <div className="form-row-2">
                {showPlaceholder ? (
                  <Form.Item
                    name={buildPath(fieldPath, 'placeholder')}
                    label="占位提示"
                  >
                    <Input placeholder="请输入 placeholder" />
                  </Form.Item>
                ) : (
                  <div />
                )}

                <Form.Item
                  name={buildPath(fieldPath, 'required')}
                  label="是否必填"
                  valuePropName="checked"
                >
                  <Checkbox>必填</Checkbox>
                </Form.Item>
              </div>

              <Form.Item
                name={buildPath(fieldPath, 'defaultValue')}
                label="默认值"
                rules={isArrayDefault ? [{ validator: validateJson }] : undefined}
                extra={isArrayDefault ? '数组类型默认值请使用 JSON 数组格式' : undefined}
              >
                {currentType === 'inputNumber' ? (
                  <InputNumber style={{ width: '100%' }} />
                ) : (
                  <Input.TextArea
                    rows={isArrayDefault ? 3 : 2}
                    placeholder={isArrayDefault ? '["A", "B"]' : '请输入默认值'}
                  />
                )}
              </Form.Item>

              <Divider style={{ margin: '12px 0' }}>类型配置</Divider>

              {currentType === 'input' && (
                <div className="form-row-3">
                  <Form.Item name={buildPath(fieldPath, 'maxLength')} label="最大长度">
                    <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'addonBefore')} label="前附加内容">
                    <Input placeholder="例如：ID" />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'addonAfter')} label="后附加内容">
                    <Input placeholder="例如：单位" />
                  </Form.Item>
                </div>
              )}

              {currentType === 'inputNumber' && (
                <div className="form-row-4">
                  <Form.Item name={buildPath(fieldPath, 'min')} label="最小值">
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'max')} label="最大值">
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'precision')} label="小数位">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'unit')} label="单位">
                    <Input placeholder="例如：件" />
                  </Form.Item>
                </div>
              )}

              {currentType === 'datePicker' && (
                <div className="form-row-2">
                  <Form.Item name={buildPath(fieldPath, 'pickerType')} label="选择类型">
                    <Radio.Group>
                      <Radio.Button value="date">日期</Radio.Button>
                      <Radio.Button value="range">日期区间</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item
                    name={buildPath(fieldPath, 'disablePastDates')}
                    label="禁用之前日期"
                    valuePropName="checked"
                  >
                    <Checkbox>禁用之前日期</Checkbox>
                  </Form.Item>
                </div>
              )}

              {currentType === 'select' && (
                <div className="form-row-2">
                  <Form.Item name={buildPath(fieldPath, 'mode')} label="选择模式">
                    <Radio.Group>
                      <Radio.Button value="single">单选</Radio.Button>
                      <Radio.Button value="multiple">多选</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item
                    name={buildPath(fieldPath, 'showSearch')}
                    label="允许搜索"
                    valuePropName="checked"
                  >
                    <Checkbox>允许搜索</Checkbox>
                  </Form.Item>
                </div>
              )}

              {['checkboxGroup', 'radioGroup'].includes(currentType) && (
                <Form.Item name={buildPath(fieldPath, 'direction')} label="排列方式">
                  <Radio.Group>
                    <Radio.Button value="horizontal">水平排列</Radio.Button>
                    <Radio.Button value="vertical">垂直排列</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )}

              {['checkboxGroup', 'radioGroup', 'select'].includes(currentType) && (
                <>
                  <Divider style={{ margin: '12px 0' }}>数据配置</Divider>
                  <Form.Item name={buildPath(fieldPath, 'dataSourceType')} label="数据来源">
                    <Radio.Group>
                      <Radio.Button value="manual">手动配置</Radio.Button>
                      <Radio.Button value="request">请求数据</Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {sourceType === 'manual' ? (
                    <Form.Item
                      label="手动数据项"
                      validateStatus={getManualOptionsError(manualOptions) ? 'error' : undefined}
                      help={getManualOptionsError(manualOptions)}
                    >
                      <OptionListEditor
                        value={manualOptions}
                        onChange={nextValue => {
                          form.setFieldValue(buildPath(fieldPath, 'manualOptions'), nextValue)
                        }}
                        addButtonText="添加数据项"
                      />
                    </Form.Item>
                  ) : (
                    renderRequestConfig({
                      endpointPlaceholder: '/api/options',
                      debugHint: '调试时将使用当前字段的接口地址、参数和列表字段路径。',
                    })
                  )}
                </>
              )}

              {currentType === 'cascader' && (
                <>
                  <Divider style={{ margin: '12px 0' }}>数据配置</Divider>
                  <Form.Item name={buildPath(fieldPath, 'dataMode')} label="数据方式">
                    <Radio.Group>
                      <Radio.Button value="json">静态数据</Radio.Button>
                      <Radio.Button value="request">请求数据</Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {dataMode === 'json' ? (
                    <Form.Item
                      name={buildPath(fieldPath, 'jsonData')}
                      label="级联 JSON"
                      rules={[{ validator: validateJson }]}
                    >
                      <Input.TextArea
                        rows={6}
                        placeholder='[{"label":"浙江省","value":"zj","children":[{"label":"杭州市","value":"hz"}]}]'
                      />
                    </Form.Item>
                  ) : (
                    renderRequestConfig({
                      endpointPlaceholder: '/api/cascader',
                      childrenFieldLabel: '子节点字段映射',
                      childrenFieldPlaceholder: 'children',
                      debugHint: '调试时将使用当前字段的接口地址、参数和级联字段路径。',
                    })
                  )}
                </>
              )}
            </div>
          ),
        },
      ]}
      defaultActiveKey={[String(fieldKey)]}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
    />
  )
}

const QueryFilterFieldBuilder: React.FC<QueryFilterFieldBuilderProps> = ({ form, name }) => {
  const baseName = useMemo(() => ensurePathArray(name), [name])
  const watchedListValue = Form.useWatch(baseName, form)
  const listValue = Array.isArray(watchedListValue) ? watchedListValue : []

  const duplicateFieldNames = useMemo(() => {
    const counts: Record<string, number> = {}

    listValue.forEach((item: QueryFilterFieldConfig) => {
      const field = item?.field?.trim()
      if (field) {
        counts[field] = (counts[field] || 0) + 1
      }
    })

    return new Set(Object.keys(counts).filter(key => counts[key] > 1))
  }, [listValue])

  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <div className="query-filter-field-builder">
          <div className="query-filter-field-builder__collapse">
            {fields.map(field => (
              <QueryFilterFieldCard
                key={field.key}
                form={form}
                baseName={baseName}
                fieldIndex={field.name}
                fieldKey={field.key}
                remove={remove}
                duplicateFieldNames={duplicateFieldNames}
              />
            ))}
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            onClick={() => {
              const nextIndex = fields.length + 1
              add(createFieldConfig('input', nextIndex))
            }}
          >
            添加字段
          </Button>

          <Space wrap className="query-filter-field-builder__quick-add">
            {FIELD_TYPE_OPTIONS.map(option => (
              <Button
                key={option.value}
                size="small"
                onClick={() => {
                  const nextIndex = fields.length + 1
                  add(createFieldConfig(option.value, nextIndex))
                }}
              >
                {`新增${option.label}`}
              </Button>
            ))}
          </Space>
        </div>
      )}
    </Form.List>
  )
}

export default QueryFilterFieldBuilder
