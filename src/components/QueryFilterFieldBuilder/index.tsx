import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Checkbox,
  Collapse,
  Divider,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
} from 'antd'
import type { FormInstance, MenuProps } from 'antd'
import type { NamePath } from 'antd/es/form/interface'
import {
  CaretRightOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import OptionListEditor from '@/components/OptionListEditor'
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs'
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton'
import type {
  QueryFilterFieldConfig,
  QueryFilterFieldType,
  QueryFilterOptionItem,
} from '@/types'
import {
  hydrateQueryFilterFields,
  QUERY_FILTER_FIELD_NAME_MAX_LENGTH,
  QUERY_FILTER_INPUT_NUMBER_MAX_PRECISION,
} from '@/utils/queryFilter'
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
  field: QueryFilterFieldConfig
  remove: (index: number) => void
  notifyChange: () => void
  duplicateFieldNames: Set<string>
}

const FIELD_TYPE_OPTIONS: Array<{ label: string; value: QueryFilterFieldType }> = [
  { label: '输入框', value: 'input' },
  { label: '多选按钮组', value: 'checkboxGroup' },
  { label: '级联选择器', value: 'cascader' },
  { label: '日期选择器', value: 'datePicker' },
  { label: '数字输入框', value: 'inputNumber' },
  { label: '单选按钮组', value: 'radioGroup' },
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

const SELECT_MAX_TAG_COUNT_OPTIONS = [
  { value: 'responsive', label: '自适应' },
  { value: 1, label: '1 个标签' },
  { value: 2, label: '2 个标签' },
  { value: 3, label: '3 个标签' },
  { value: 4, label: '4 个标签' },
  { value: 5, label: '5 个标签' },
]

const PLACEHOLDER_FIELD_TYPES: QueryFilterFieldType[] = [
  'input',
  'select',
  'datePicker',
  'inputNumber',
]

const DEFAULT_FIELD_BY_TYPE: Record<QueryFilterFieldType, Partial<QueryFilterFieldConfig>> = {
  input: {
    label: '输入框',
    field: 'input_field',
    type: 'input',
  },
  checkboxGroup: {
    label: '多选按钮组',
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
    label: '日期选择器',
    field: 'date_field',
    type: 'datePicker',
    pickerType: 'date',
  },
  inputNumber: {
    label: '数字输入框',
    field: 'number_field',
    type: 'inputNumber',
  },
  radioGroup: {
    label: '单选按钮组',
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
    maxTagCount: 'responsive',
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

  return hasInvalidItem ? '请完善手动数据项的显示名和值' : undefined
}

const QueryFilterFieldCard: React.FC<QueryFilterFieldCardProps> = ({
  form,
  baseName,
  fieldIndex,
  field,
  remove,
  notifyChange,
  duplicateFieldNames,
}) => {
  const fieldPath = useMemo(() => buildPath(baseName, fieldIndex), [baseName, fieldIndex])
  const watchedFieldValue = Form.useWatch(fieldPath, form)
  const watchedLabel = Form.useWatch(buildPath(fieldPath, 'label'), form)
  const watchedFieldName = Form.useWatch(buildPath(fieldPath, 'field'), form)
  const watchedType = Form.useWatch(buildPath(fieldPath, 'type'), form)
  const watchedMode = Form.useWatch(buildPath(fieldPath, 'mode'), form)
  const watchedPickerType = Form.useWatch(buildPath(fieldPath, 'pickerType'), form)
  const watchedDataSourceType = Form.useWatch(buildPath(fieldPath, 'dataSourceType'), form)
  const watchedDataMode = Form.useWatch(buildPath(fieldPath, 'dataMode'), form)
  const watchedManualOptions = Form.useWatch(buildPath(fieldPath, 'manualOptions'), form)

  const currentField = useMemo(() => {
    const [nextField] = hydrateQueryFilterFields([
      (watchedFieldValue || field) as QueryFilterFieldConfig,
    ])

    return nextField || field
  }, [field, watchedFieldValue])

  const currentType = ((watchedType || currentField?.type || 'input') as QueryFilterFieldType)
  const fieldNameError = !watchedFieldName?.trim()
    ? 'field 名不能为空'
    : duplicateFieldNames.has(watchedFieldName.trim())
      ? 'field 名称重复'
      : undefined
  const trimmedFieldName = watchedFieldName?.trim()
  const fieldNameValidationError = trimmedFieldName
    && trimmedFieldName.length > QUERY_FILTER_FIELD_NAME_MAX_LENGTH
    ? `field 名称不能超过 ${QUERY_FILTER_FIELD_NAME_MAX_LENGTH} 个字符`
    : fieldNameError
  const selectMode = watchedMode || currentField?.mode || 'single'
  const pickerType = watchedPickerType || currentField?.pickerType || 'date'
  const showPlaceholder = PLACEHOLDER_FIELD_TYPES.includes(currentType)
    && !(currentType === 'datePicker' && pickerType === 'range')
  const isArrayDefault =
    ['checkboxGroup', 'cascader'].includes(currentType) ||
    (currentType === 'select' && selectMode === 'multiple') ||
    (currentType === 'datePicker' && pickerType === 'range')
  const sourceType = watchedDataSourceType || currentField?.dataSourceType || 'manual'
  const dataMode = watchedDataMode || currentField?.dataMode || 'json'
  const manualOptions = Array.isArray(watchedManualOptions)
    ? watchedManualOptions
    : (currentField?.manualOptions || [])
  const panelKey = currentField?.id || String(fieldIndex)
  const [isExpanded, setIsExpanded] = useState(fieldIndex === 0)
  const hasTypeConfig = (
    currentType === 'input'
    || currentType === 'inputNumber'
    || currentType === 'datePicker'
    || currentType === 'select'
    || ['checkboxGroup', 'radioGroup'].includes(currentType)
  )

  useEffect(() => {
    setIsExpanded(previous => previous || !field?.id)
  }, [field?.id])

  const updateCurrentField = (updater: (
    previousValue: QueryFilterFieldConfig,
  ) => QueryFilterFieldConfig) => {
    const previousValue = (
      form.getFieldValue(fieldPath) ||
      currentField ||
      {}
    ) as QueryFilterFieldConfig

    form.setFieldValue(fieldPath, updater(previousValue))
    notifyChange()
  }

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
    updateCurrentField(previousValue => ({
      ...previousValue,
      ...nextDefaults,
      type: nextType,
      id: previousValue.id || uuidv4(),
      label: previousValue.label || nextDefaults.label || '',
      field: previousValue.field || nextDefaults.field || '',
    }))
  }

  const handleManualOptionsChange = (nextValue: QueryFilterOptionItem[]) => {
    updateCurrentField(previousValue => ({
      ...previousValue,
      manualOptions: nextValue,
    }))
  }

  const renderRequestConfig = (options: {
    endpointPlaceholder: string
    listFieldLabel?: string
    listFieldPlaceholder?: string
    childrenFieldLabel?: string
    childrenFieldPlaceholder?: string
    debugHint: string
    twoColumnLayout?: boolean
  }) => {
    const useTwoColumnLayout = options.twoColumnLayout || !!options.childrenFieldLabel

    return (
      <>
        <Form.Item label="接口地址" required className="widget-api-form-item">
          <div className="widget-api-endpoint-row">
            <Form.Item
              name={buildPath(fieldPath, 'requestConfig', 'method')}
              noStyle
              initialValue={currentField?.requestConfig?.method || 'GET'}
            >
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

        {useTwoColumnLayout ? (
          <>
            <div className="form-row-2">
              <Form.Item
                name={buildPath(fieldPath, 'requestConfig', 'listField')}
                label={options.listFieldLabel || '列表字段路径'}
              >
                <Input placeholder={options.listFieldPlaceholder || 'data.list'} />
              </Form.Item>
              <Form.Item
                name={buildPath(fieldPath, 'requestConfig', 'labelField')}
                label="标签字段"
              >
                <Input placeholder="label" />
              </Form.Item>
            </div>
            <div className="form-row-2">
              <Form.Item
                name={buildPath(fieldPath, 'requestConfig', 'valueField')}
                label="取值字段"
              >
                <Input placeholder="value" />
              </Form.Item>
              {options.childrenFieldLabel ? (
                <Form.Item
                  name={buildPath(fieldPath, 'requestConfig', 'childrenField')}
                  label={options.childrenFieldLabel}
                >
                  <Input placeholder={options.childrenFieldPlaceholder || 'children'} />
                </Form.Item>
              ) : (
                <div />
              )}
            </div>
          </>
        ) : (
          <div className={options.childrenFieldLabel ? 'form-row-4' : 'form-row-3'}>
            <Form.Item
              name={buildPath(fieldPath, 'requestConfig', 'listField')}
              label={options.listFieldLabel || '列表字段路径'}
            >
              <Input placeholder={options.listFieldPlaceholder || 'data.list'} />
            </Form.Item>
            <Form.Item
              name={buildPath(fieldPath, 'requestConfig', 'labelField')}
              label="标签字段"
            >
              <Input placeholder="label" />
            </Form.Item>
            <Form.Item
              name={buildPath(fieldPath, 'requestConfig', 'valueField')}
              label="取值字段"
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
        )}

        <Form.Item label="参数配置" className="widget-api-form-item">
          <WidgetApiConfigTabs
            form={form}
            methodName={buildPath(fieldPath, 'requestConfig', 'method')}
            headersName={buildPath(fieldPath, 'requestConfig', 'headersList')}
            queryName={buildPath(fieldPath, 'requestConfig', 'queryList')}
            bodyName={buildPath(fieldPath, 'requestConfig', 'bodyList')}
            debugContent={(
              <WidgetApiDebugButton
                form={form}
                buildConfig={buildRequestDebugConfig}
              />
            )}
            debugHint={options.debugHint}
          />
        </Form.Item>
      </>
    )
  }

  return (
    <Collapse
      className="query-filter-field-builder__collapse-item"
      activeKey={isExpanded ? [panelKey] : []}
      onChange={activeKeys => {
        const nextActiveKeys = Array.isArray(activeKeys) ? activeKeys : [activeKeys]
        setIsExpanded(nextActiveKeys.includes(panelKey))
      }}
      items={[
        {
          key: panelKey,
          forceRender: true,
          label: (
            <div className="query-filter-field-builder__header">
              <span>{watchedLabel}</span>
              <span
                className="query-filter-field-builder__meta"
                title={`${watchedFieldName || ''} / ${FIELD_TYPE_LABELS[currentType] || currentType}`}
              >
                {watchedFieldName} / {FIELD_TYPE_LABELS[currentType] || currentType}
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
                  normalize={value => (
                    typeof value === 'string'
                      ? value.slice(0, QUERY_FILTER_FIELD_NAME_MAX_LENGTH)
                      : value
                  )}
                  validateStatus={fieldNameValidationError ? 'error' : undefined}
                  help={fieldNameValidationError}
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

              {showPlaceholder ? (
                <div className="form-row-2">
                  <Form.Item
                    name={buildPath(fieldPath, 'placeholder')}
                    label="占位提示"
                  >
                    <Input placeholder="请输入 placeholder" />
                  </Form.Item>
                  <div />
                </div>
              ) : (
                <div />
              )}

              {pickerType === 'range' && (
                <div className="form-row-2">
                  <Form.Item
                    name={buildPath(fieldPath, 'rangeStartPlaceholder')}
                    label="开始占位提示"
                  >
                    <Input placeholder="请输入开始占位提示" />
                  </Form.Item>
                  <Form.Item
                    name={buildPath(fieldPath, 'rangeEndPlaceholder')}
                    label="结束占位提示"
                  >
                    <Input placeholder="请输入结束占位提示" />
                  </Form.Item>
                </div>
              )}

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

              {hasTypeConfig && (
                <Divider style={{ margin: '12px 0' }}>类型配置</Divider>
              )}

              {currentType === 'input' && (
                <div className="form-row-3">
                  <Form.Item name={buildPath(fieldPath, 'maxLength')} label="最大长度">
                    <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'addonBefore')} label="前置内容">
                    <Input placeholder="例如：ID" />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'addonAfter')} label="后置内容">
                    <Input placeholder="例如：单位" />
                  </Form.Item>
                </div>
              )}

              {currentType === 'inputNumber' && (
                <div className="form-row-2">
                  <Form.Item name={buildPath(fieldPath, 'min')} label="最小值">
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'max')} label="最大值">
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'precision')} label="小数位">
                    <InputNumber
                      min={0}
                      max={QUERY_FILTER_INPUT_NUMBER_MAX_PRECISION}
                      precision={0}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item name={buildPath(fieldPath, 'unit')} label="单位">
                    <Input placeholder="例如：件" />
                  </Form.Item>
                </div>
              )}

              {currentType === 'datePicker' && (
                <>
                  <div className="form-row-2">
                    <Form.Item name={buildPath(fieldPath, 'pickerType')} label="选择类型">
                      <Radio.Group>
                        <Radio.Button value="date">日期</Radio.Button>
                        <Radio.Button value="range">日期区间</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item
                      name={buildPath(fieldPath, 'disablePastDates')}
                      label="禁用过去日期"
                      valuePropName="checked"
                    >
                      <Checkbox>禁用过去日期</Checkbox>
                    </Form.Item>
                  </div>


                </>
              )}

              {currentType === 'select' && (
                <div className="form-row-3">
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
                  {/* {selectMode === 'multiple' ? (
                    <Form.Item
                      name={buildPath(fieldPath, 'maxTagCount')}
                      label="标签展示数量"
                      tooltip="多选时超出数量会折叠，避免画布中的选项标签超出组件区域"
                    >
                      <Select
                        options={SELECT_MAX_TAG_COUNT_OPTIONS}
                        placeholder="默认自适应"
                        allowClear
                      />
                    </Form.Item>
                  ) : (
                    <div />
                  )} */}
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
                        onChange={handleManualOptionsChange}
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
                  <div className="form-row-2">
                    <Form.Item name={buildPath(fieldPath, 'dataMode')} label="数据方式">
                      <Radio.Group>
                        <Radio.Button value="json">静态数据</Radio.Button>
                        <Radio.Button value="request">请求数据</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                    <div />
                  </div>

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
                      childrenFieldLabel: '子节点字段',
                      childrenFieldPlaceholder: 'children',
                      debugHint: '调试时将使用当前字段的接口地址、参数和级联字段路径。',
                      twoColumnLayout: true,
                    })
                  )}
                </>
              )}
            </div>
          ),
        },
      ]}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
    />
  )
}

const QueryFilterFieldBuilder: React.FC<QueryFilterFieldBuilderProps> = ({ form, name }) => {
  const baseName = useMemo(() => ensurePathArray(name), [name])
  const [listVersion, setListVersion] = useState(0)
  const formSnapshot = Form.useWatch([], form)
  void formSnapshot
  void listVersion

  const formListValue = form.getFieldValue(baseName)
  const rawListValue = Array.isArray(formListValue) ? formListValue : []
  const listValue = useMemo(
    () => hydrateQueryFilterFields(rawListValue),
    [rawListValue],
  )

  const duplicateFieldNames = useMemo(() => {
    const counts: Record<string, number> = {}

    listValue.forEach(item => {
      const fieldName = item?.field?.trim()
      if (fieldName) {
        counts[fieldName] = (counts[fieldName] || 0) + 1
      }
    })

    return new Set(Object.keys(counts).filter(key => counts[key] > 1))
  }, [listValue])

  const handleAdd = (type: QueryFilterFieldType) => {
    const nextIndex = listValue.length + 1
    form.setFieldValue(baseName, [...listValue, createFieldConfig(type, nextIndex)])
    setListVersion(version => version + 1)
  }

  const handleRemove = (index: number) => {
    const nextValue = [...listValue]
    nextValue.splice(index, 1)
    form.setFieldValue(baseName, nextValue)
    setListVersion(version => version + 1)
  }

  const notifyChange = () => {
    setListVersion(version => version + 1)
  }

  const quickAddMenuItems = useMemo<MenuProps['items']>(() => (
    FIELD_TYPE_OPTIONS.map(option => ({
      key: option.value,
      label: `新增${option.label}`,
    }))
  ), [])

  return (
    <div className="query-filter-field-builder">
      <div className="query-filter-field-builder__collapse">
        {listValue.map((item, index) => (
          <QueryFilterFieldCard
            key={item.id || `${item.type}-${index}`}
            form={form}
            baseName={baseName}
            fieldIndex={index}
            field={item}
            remove={handleRemove}
            notifyChange={notifyChange}
            duplicateFieldNames={duplicateFieldNames}
          />
        ))}
      </div>

      <Space.Compact block className="query-filter-field-builder__actions">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="query-filter-field-builder__add-button"
          onClick={() => handleAdd('input')}
        >
          添加字段
        </Button>

        <Dropdown
          trigger={['click']}
          menu={{
            items: quickAddMenuItems,
            onClick: ({ key }) => handleAdd(key as QueryFilterFieldType),
          }}
        >
          <Button
            className="query-filter-field-builder__quick-trigger"
            icon={<EllipsisOutlined />}
            type="primary"
          />
        </Dropdown>
      </Space.Compact>
    </div>
  )
}

export default QueryFilterFieldBuilder
