import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import type {
  EventRouteConfig,
  NativeFormConditionMatchMode,
  NativeFormFieldCondition,
  NativeFormGridCell,
  NativeFormFieldRule,
  NativeFormNode,
  NativeFormNodePlacement,
  NativeFormOptionItem,
} from '@/types'
import { getNativeFormFieldManifest } from '@/native-form/manifests'
import { normalizeNativeFormColorValue } from '@/native-form/shared/color-value'
import { isNativeFormContainerField } from '@/native-form/shared/field-factory'
import { keyValueListToObject, objectToKeyValueList, parseJsonConfig } from '@/utils/widgetApi'

const FIELD_TYPE_LABEL_MAP: Record<NativeFormNode['type'], string> = {
  input: '单行输入框',
  password: '密码框',
  textarea: '多行文本域',
  inputNumber: '数字输入框',
  select: '下拉选择',
  transfer: '穿梭框',
  checkableTag: '可选标签',
  formPlate: '车牌组件',
  formVehicleModel: '车型组件',
  radioGroup: '单选组',
  checkboxGroup: '复选组',
  datePicker: '日期选择',
  dateRangePicker: '日期范围',
  timePicker: '时间选择',
  timeRangePicker: '时间范围',
  cascader: '级联选择',
  upload: '上传',
  switch: '开关',
  treeSelect: '树选择',
  colorPicker: '颜色选择',
  slider: '滑动输入',
  rate: '评分',
  flex: '弹性布局',
  group: '分组',
  grid: '栅格',
  subTable: '子表格',
  button: '按钮',
}

const SELECT_REQUIRED_MESSAGE_FIELD_TYPES: NativeFormNode['type'][] = [
  'select',
  'transfer',
  'checkableTag',
  'radioGroup',
  'checkboxGroup',
  'datePicker',
  'dateRangePicker',
  'timePicker',
  'timeRangePicker',
  'cascader',
  'treeSelect',
  'colorPicker',
  'formVehicleModel',
  'rate',
]

const SET_REQUIRED_MESSAGE_FIELD_TYPES: NativeFormNode['type'][] = ['switch', 'slider']

export const getNativeFormRequiredMessage = (
  type?: NativeFormNode['type'],
  label?: string,
) => {
  const normalizedLabel = label || '字段值'

  if (type === 'upload') {
    return `请上传${normalizedLabel}`
  }

  if (type && SET_REQUIRED_MESSAGE_FIELD_TYPES.includes(type)) {
    return `请设置${normalizedLabel}`
  }

  if (type && SELECT_REQUIRED_MESSAGE_FIELD_TYPES.includes(type)) {
    return `请选择${normalizedLabel}`
  }

  return `请输入${normalizedLabel}`
}

const isNativeFormGeneratedRequiredMessage = (message: string | undefined, label?: string) => {
  if (!message) {
    return true
  }

  const normalizedLabel = label || '字段值'
  return ['请输入', '请选择', '请上传', '请设置'].some(prefix => message === `${prefix}${normalizedLabel}`)
}

const normalizeUploadListType = (listType?: string): 'text' | 'picture' => (
  listType === 'picture' ? 'picture' : 'text'
)

const normalizeUploadButtonType = (
  buttonType?: string,
  legacyListType?: string,
): 'button' | 'picture-card' | 'picture-circle' => {
  if (buttonType === 'picture-card' || buttonType === 'picture-circle') {
    return buttonType
  }

  if (legacyListType === 'picture-card' || legacyListType === 'picture-circle') {
    return legacyListType
  }

  return 'button'
}

export const getNativeFormFieldTypeLabel = (type: NativeFormNode['type']) =>
  FIELD_TYPE_LABEL_MAP[type] || type

const isEmptyValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0)

export const parseNativeFormRegexPattern = (pattern?: string) => {
  const trimmedPattern = pattern?.trim()

  if (!trimmedPattern) {
    return undefined
  }

  const literalMatch = trimmedPattern.match(/^\/(.*)\/([dgimsuvy]*)$/)

  try {
    if (literalMatch) {
      return new RegExp(literalMatch[1], literalMatch[2])
    }

    return new RegExp(trimmedPattern)
  } catch {
    return undefined
  }
}

export const normalizeNativeFormStyleSize = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'number') {
    return `${value}px`
  }

  const trimmedValue = String(value).trim()

  if (!trimmedValue) {
    return undefined
  }

  return /^-?\d+(\.\d+)?$/.test(trimmedValue)
    ? `${trimmedValue}px`
    : trimmedValue
}

export const normalizeNativeFormMaxTagCount = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (value === 'responsive') {
    return 'responsive'
  }

  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(numericValue) ? undefined : numericValue
}

const normalizeNativeFormRuleNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

const normalizeNativeFormDatePicker = (value: unknown) => {
  if (value === 'month' || value === 'year') {
    return value
  }

  return 'date'
}

const normalizeRoutes = (routes?: EventRouteConfig[]) =>
  Array.isArray(routes) ? routes : []

const sanitizeRequestConfig = (requestConfig?: NativeFormNode['requestConfig']) => {
  if (!requestConfig) {
    return undefined
  }

  const nextConfig = {
    endpoint: requestConfig.endpoint?.trim(),
    method: requestConfig.method,
    headers:
      requestConfig.headers && Object.keys(requestConfig.headers).length > 0
        ? requestConfig.headers
        : undefined,
    query:
      requestConfig.query &&
      (!(typeof requestConfig.query === 'object') || Object.keys(requestConfig.query as Record<string, any>).length > 0)
        ? requestConfig.query
        : undefined,
    body:
      requestConfig.body &&
      (!(typeof requestConfig.body === 'object') || Object.keys(requestConfig.body as Record<string, any>).length > 0)
        ? requestConfig.body
        : undefined,
    listField: requestConfig.listField?.trim(),
    labelField: requestConfig.labelField?.trim(),
    valueField: requestConfig.valueField?.trim(),
    childrenField: requestConfig.childrenField?.trim(),
  }

  return Object.values(nextConfig).some(value => value !== undefined && value !== '')
    ? nextConfig
    : undefined
}

const sanitizeFieldCondition = (
  condition?: NativeFormFieldCondition,
): NativeFormFieldCondition | undefined => {
  if (!condition) {
    return undefined
  }

  const rawSourceField = condition.sourceField?.trim() || ''
  if (!rawSourceField) {
    return undefined
  }

  return {
    sourceField: rawSourceField,
    operator: condition.operator || 'equals',
    ...(condition.value !== undefined && condition.value !== '' ? { value: condition.value } : {}),
  }
}

export const isConditionListKey = (key: string) =>
  key === 'visibilityConditions' || key === 'disabledConditions'

const sanitizeFieldConditions = (
  conditions?: NativeFormFieldCondition[],
): NativeFormFieldCondition[] | undefined => {
  if (!Array.isArray(conditions)) {
    return undefined
  }

  const sanitized = conditions.map(item => sanitizeFieldCondition(item))
  const valid = sanitized.filter(Boolean) as NativeFormFieldCondition[]

  if (valid.length === sanitized.length) {
    return valid.length > 0 ? valid : undefined
  }

  // 存在尚未填写的空条件：按原数组长度保留空占位，避免用户点新增后被立刻吞掉
  return conditions.length > 0
    ? conditions.map((item) => sanitized[conditions.indexOf(item)] || {
        sourceField: '',
        operator: 'equals',
      })
    : undefined
}

const resolveConditionList = (
  conditions?: NativeFormFieldCondition[],
  condition?: NativeFormFieldCondition,
) => sanitizeFieldConditions(conditions) || (condition ? [condition] : undefined)

const sanitizeFieldOptions = (
  options?: NativeFormOptionItem[],
): NativeFormOptionItem[] | undefined => {
  if (!Array.isArray(options)) {
    return undefined
  }

  const nextOptions: NativeFormOptionItem[] = options
    .filter(item => item?.label || item?.value !== undefined && item?.value !== '')
    .map((item) => ({
      label: item.label || String(item.value ?? ''),
      value: item.value ?? item.label ?? '',
      text: item.text?.trim() || item.label || String(item.value ?? ''),
      disabled: item.disabled === true ? true : undefined,
      cancelOther: item.cancelOther,
      showStyle: item.showStyle,
      color: normalizeNativeFormColorValue(item.color),
      borderColor: normalizeNativeFormColorValue(item.borderColor),
      icon: item.icon?.trim() || undefined,
      children: sanitizeFieldOptions(item.children),
    }))

  return nextOptions.length > 0 ? nextOptions : undefined
}

const mapOptionToTreeFormValue = (item: NativeFormOptionItem): {
  label: string
  value: string
  children?: Array<{
    label: string
    value: string
    children?: any[]
  }>
} => ({
  label: item.label,
  value: String(item.value ?? ''),
  children: Array.isArray(item.children)
    ? item.children.map(mapOptionToTreeFormValue)
    : undefined,
})

const mapTreeFormValueToOption = (item: {
  label?: string
  value?: string
  children?: Array<any>
}): NativeFormOptionItem => ({
  label: item.label || item.value || '',
  value: item.value || item.label || '',
  children: Array.isArray(item.children)
    ? item.children
        .filter(child => child?.label || child?.value)
        .map(child => mapTreeFormValueToOption(child))
    : undefined,
})

const getContainerChildNodes = (node: NativeFormNode): NativeFormNode[] => {
  if (node.type === 'grid') {
    return (node.gridCells || [])
      .map(cell => cell.node || null)
      .filter(Boolean) as NativeFormNode[]
  }

  return Array.isArray(node.children) ? node.children : []
}

const mapContainerChildren = (
  node: NativeFormNode,
  mapper: (child: NativeFormNode) => NativeFormNode | null,
): NativeFormNode => {
  if (node.type === 'grid') {
    return {
      ...node,
      gridCells: (node.gridCells || []).map(cell => ({
        ...cell,
        node: cell.node ? mapper(cell.node) : null,
      })),
    }
  }

  return {
    ...node,
    children: (node.children || [])
      .map(mapper)
      .filter(Boolean) as NativeFormNode[],
  }
}

const sanitizeTableColumns = (field: NativeFormNode) => {
  if (field.type !== 'subTable' || !Array.isArray(field.tableColumns)) {
    return field.tableColumns
  }

  const nextColumns = field.tableColumns
    .filter(column => column?.label || column?.field)
    .map((column, index) => ({
      ...column,
      label: column.label || `列${index + 1}`,
      field: column.field || `field_${index + 1}`,
      required: Boolean(column.required),
      defaultValue: column.defaultValue,
      placeholder: column.placeholder?.trim() || undefined,
      readOnly: Boolean(column.readOnly),
      disabled: Boolean(column.disabled),
      width: column.width,
      componentProps: {
        ...(column.componentProps || {}),
        mode:
          column.componentProps?.mode === 'single'
            ? undefined
            : column.componentProps?.mode,
        showSearch: column.componentProps?.showSearch,
        searchPlaceholder: column.componentProps?.searchPlaceholder?.trim() || undefined,
        maxTagCount: normalizeNativeFormMaxTagCount(column.componentProps?.maxTagCount),
        format: column.componentProps?.format?.trim() || undefined,
        picker:
          column.type === 'datePicker' || column.type === 'dateRangePicker'
            ? normalizeNativeFormDatePicker(column.componentProps?.picker)
            : column.componentProps?.picker,
        showTime: column.componentProps?.showTime,
        disablePastDates: column.componentProps?.disablePastDates,
        use12Hours: column.componentProps?.use12Hours,
        hourStep: column.componentProps?.hourStep,
        minuteStep: column.componentProps?.minuteStep,
        secondStep: column.componentProps?.secondStep,
        readOnly: Boolean(column.readOnly),
        buttonText: column.componentProps?.buttonText?.trim() || undefined,
      },
      uploadConfig:
        column.type === 'upload'
          ? {
              action: column.uploadConfig?.action?.trim(),
              accept: column.uploadConfig?.accept?.trim(),
              multiple: column.uploadConfig?.multiple,
              listType: normalizeUploadListType(column.uploadConfig?.listType),
              buttonType: normalizeUploadButtonType(
                column.uploadConfig?.buttonType,
                column.uploadConfig?.listType,
              ),
              valueMode: column.uploadConfig?.valueMode,
              responseUrlField: column.uploadConfig?.responseUrlField?.trim(),
              maxSizeMb: column.uploadConfig?.maxSizeMb,
              draggable: column.uploadConfig?.draggable,
            }
          : undefined,
      rules: normalizeRules(column.rules, {
        id: column.id,
        type: column.type,
        label: column.label || `列${index + 1}`,
        field: column.field || `field_${index + 1}`,
        required: Boolean(column.required),
      } as NativeFormNode),
      dataSourceType: column.dataSourceType || 'manual',
      options:
        (column.dataSourceType || 'manual') === 'manual'
          ? sanitizeFieldOptions(column.options)
          : undefined,
      requestConfig:
        (column.dataSourceType || 'manual') === 'request'
          ? sanitizeRequestConfig(column.requestConfig)
          : undefined,
    }))

  return nextColumns.length > 0 ? nextColumns : []
}

const sanitizeGridCells = (field: NativeFormNode): NativeFormGridCell[] | undefined => {
  if (field.type !== 'grid') {
    return field.gridCells
  }

  const columnCount = Math.max(1, Number(field.columns || 1))
  const sourceCells = Array.isArray(field.gridCells) ? field.gridCells : []
  const nextCells = Array.from({ length: columnCount }, (_, index) => {
    const currentCell = sourceCells[index]
    return {
      id: currentCell?.id || `grid-cell-${field.id}-${index + 1}`,
      node: currentCell?.node ? sanitizeNativeFormNode(currentCell.node) : null,
    }
  })

  return nextCells
}

const normalizeRules = (rules?: NativeFormFieldRule[], field?: NativeFormNode): NativeFormFieldRule[] => {
  const nextRules = Array.isArray(rules) ? rules.filter(Boolean).map((item) => {
    if (
      field &&
      (item?.type === 'required' || item?.required) &&
      isNativeFormGeneratedRequiredMessage(item.message, field.label)
    ) {
      return {
        ...item,
        message: getNativeFormRequiredMessage(field.type, field.label),
      }
    }

    return item
  }) : []
  const hasRequiredRule = nextRules.some(item => item?.type === 'required' || item?.required)

  if (field?.required && !hasRequiredRule && !isNativeFormContainerField(field.type) && field.type !== 'button') {
    nextRules.unshift({
      type: 'required',
      required: true,
      message: getNativeFormRequiredMessage(field.type, field.label),
    })
  }

  return nextRules
}

export const buildNativeFormFieldRules = (field: NativeFormNode) => {
  if (field.type === 'button' || isNativeFormContainerField(field.type) || !field.field) {
    return []
  }

  return normalizeRules(field.rules, field)
}

export const evaluateFieldCondition = (
  condition: NativeFormFieldCondition | undefined,
  values: Record<string, any>,
): boolean => {
  if (!condition?.sourceField) {
    return false
  }

  const sourceValue = values[condition.sourceField]

  switch (condition.operator) {
    case 'equals':
      return String(sourceValue ?? '') === String(condition.value ?? '')
    case 'notEquals':
      return String(sourceValue ?? '') !== String(condition.value ?? '')
    case 'includes':
      return Array.isArray(sourceValue)
        ? sourceValue.map(String).includes(String(condition.value ?? ''))
        : String(sourceValue ?? '').includes(String(condition.value ?? ''))
    case 'notEmpty':
      return !isEmptyValue(sourceValue)
    case 'empty':
      return isEmptyValue(sourceValue)
    default:
      return false
  }
}

export const evaluateFieldConditions = (
  conditions: NativeFormFieldCondition[] | undefined,
  matchMode: NativeFormConditionMatchMode | undefined,
  values: Record<string, any>,
): boolean => {
  if (!conditions?.length) {
    return false
  }

  const normalizedMode = matchMode || 'all'
  const results = conditions.map(condition => evaluateFieldCondition(condition, values))

  return normalizedMode === 'any'
    ? results.some(Boolean)
    : results.every(Boolean)
}

export const ensureNativeFormFieldOptions = (
  field: NativeFormNode,
): NativeFormOptionItem[] | undefined => {
  if (!['select', 'transfer', 'checkableTag', 'radioGroup', 'checkboxGroup', 'cascader', 'treeSelect'].includes(field.type)) {
    return undefined
  }

  return (field.options || []).map((item) => ({
    label: item.label,
    value: item.value,
    text: item.text,
    disabled: item.disabled,
    cancelOther: item.cancelOther,
    showStyle: item.showStyle,
    color: item.color,
    borderColor: item.borderColor,
    icon: item.icon,
    children: item.children,
  }))
}

const normalizeTableColumns = (field: NativeFormNode, changedValues: Record<string, any>) => {
  const nextColumns = changedValues.subTableColumns
  if (!Array.isArray(nextColumns)) {
    return field.tableColumns
  }

  return nextColumns
    .filter((item: any) => item?.label || item?.field)
    .map((item: any, index: number) => ({
      id: item.id || `${field.id}-column-${index}`,
      label: item.label || `列${index + 1}`,
      field: item.field || `field_${index + 1}`,
      type: item.type || 'input',
      required: item.required ?? false,
      defaultValue: item.defaultValue,
      placeholder: item.placeholder,
      readOnly: item.readOnly ?? false,
      disabled: item.disabled ?? false,
      width:
        item.width !== undefined && item.width !== ''
          ? Number(item.width)
          : undefined,
      componentProps: {
        readOnly: item.readOnly ?? false,
        mode:
          item.componentMode === 'single'
            ? undefined
            : item.componentMode,
        showSearch: item.componentShowSearch,
        multiple: item.componentMultiple,
        changeOnSelect: item.componentChangeOnSelect,
        treeCheckable: item.componentTreeCheckable,
        treeDefaultExpandAll: item.componentTreeDefaultExpandAll,
        showCheckedStrategy: item.componentShowCheckedStrategy,
        searchPlaceholder: item.componentSearchPlaceholder,
        maxTagCount:
          item.componentMaxTagCount !== undefined && item.componentMaxTagCount !== ''
            ? normalizeNativeFormMaxTagCount(item.componentMaxTagCount)
            : undefined,
        format: item.componentFormat,
        picker:
          item.type === 'datePicker' || item.type === 'dateRangePicker'
            ? normalizeNativeFormDatePicker(item.componentPicker)
            : item.componentPicker,
        showTime: item.componentShowTime,
        disablePastDates: item.componentDisablePastDates,
        use12Hours: item.componentUse12Hours,
        hourStep:
          item.componentHourStep !== undefined && item.componentHourStep !== ''
            ? Number(item.componentHourStep)
            : undefined,
        minuteStep:
          item.componentMinuteStep !== undefined && item.componentMinuteStep !== ''
            ? Number(item.componentMinuteStep)
            : undefined,
        secondStep:
          item.componentSecondStep !== undefined && item.componentSecondStep !== ''
            ? Number(item.componentSecondStep)
            : undefined,
        buttonText: item.uploadButtonText,
      },
      uploadConfig: item.type === 'upload'
        ? {
            action: item.uploadAction,
            accept: item.uploadAccept,
            multiple: item.uploadMultiple ?? false,
            listType: normalizeUploadListType(item.uploadListType),
            buttonType: normalizeUploadButtonType(item.uploadButtonType, item.uploadListType),
            valueMode: item.uploadValueMode,
            responseUrlField: item.uploadResponseUrlField,
            maxSizeMb:
              item.uploadMaxSizeMb !== undefined && item.uploadMaxSizeMb !== ''
                ? Number(item.uploadMaxSizeMb)
                : undefined,
            draggable: item.uploadDraggable,
          }
        : undefined,
      rules: buildNativeFormRuleList(
        {
          required: item.required ?? false,
          pattern: item.validationPattern,
          patternMessage: item.validationPatternMessage,
          min: item.validationMin,
          max: item.validationMax,
          len: item.validationLen,
          message: item.validationMessage,
        },
        item.label || `列${index + 1}`,
        item.type,
      ),
      options: Array.isArray(item.options)
        ? (item.type === 'treeSelect' || item.type === 'cascader'
            ? item.options
                .filter((option: any) => option?.label || option?.value)
                .map((option: any) => mapTreeFormValueToOption(option))
            : item.options
                .filter((option: any) => option?.label || option?.value)
                .map((option: any) => ({
                  label: option.label || option.value || '',
                  value: option.value || option.label || '',
                  text: option.text || option.label || option.value || '',
                  disabled: option.disabled,
                })))
        : undefined,
      dataSourceType: item.dataSourceType || 'manual',
      requestConfig: item.dataSourceType === 'request'
        ? {
            endpoint: item.requestEndpoint,
            method: item.requestMethod,
            headers: keyValueListToObject(item.requestHeadersList),
            query: keyValueListToObject(item.requestQueryList),
            body: keyValueListToObject(item.requestBodyList),
            listField: item.requestListField,
            labelField: item.requestLabelField,
            valueField: item.requestValueField,
            childrenField: item.requestChildrenField,
          }
        : undefined,
    }))
}

export const parseNativeFormDefaultValue = (field: NativeFormNode) => {
  const raw = field.defaultValue

  if (field.type === 'slider' && field.componentProps?.range) {
    const parsed = parseJsonConfig(raw)
    const rangeValue = Array.isArray(parsed) ? parsed : Array.isArray(raw) ? raw : [raw, field.componentProps?.max]
    const min = normalizeNativeFormRuleNumber(field.componentProps?.min) ?? 0
    const max = normalizeNativeFormRuleNumber(field.componentProps?.max) ?? 100
    const nextValue = rangeValue.slice(0, 2).map(item => normalizeNativeFormRuleNumber(item))

    return [nextValue[0] ?? min, nextValue[1] ?? max]
  }

  if (raw == null || raw === '') {
    return raw
  }

  if (field.type === 'inputNumber' || field.type === 'slider' || field.type === 'rate') {
    const nextValue = typeof raw === 'number' ? raw : Number(raw)
    return Number.isNaN(nextValue) ? undefined : nextValue
  }

  if (field.type === 'switch') {
    return raw === true || raw === 'true' || raw === 1 || raw === '1'
  }

  if (
    ['checkboxGroup', 'transfer', 'checkableTag', 'cascader', 'upload', 'dateRangePicker', 'timeRangePicker'].includes(
      field.type,
    )
  ) {
    const parsed = parseJsonConfig(raw)
    return Array.isArray(parsed) ? parsed : []
  }

  if (
    (field.type === 'select' && field.componentProps?.mode === 'multiple') ||
    (field.type === 'treeSelect' &&
      (field.componentProps?.multiple || field.componentProps?.treeCheckable))
  ) {
    const parsed = parseJsonConfig(raw)
    return Array.isArray(parsed) ? parsed : []
  }

  if (field.type === 'datePicker') {
    const parsed = dayjs(String(raw))
    return parsed.isValid() ? parsed : raw
  }

  if (field.type === 'timePicker') {
    const parsed = dayjs(String(raw), 'HH:mm:ss')
    return parsed.isValid() ? parsed : raw
  }

  if (field.type === 'subTable') {
    const parsed = parseJsonConfig(raw)
    return Array.isArray(parsed) ? parsed : []
  }

  if (field.type === 'formPlate' || field.type === 'formVehicleModel') {
    const parsed = parseJsonConfig(raw)
    return parsed && typeof parsed === 'object' ? parsed : raw
  }

  return raw
}

export const buildNativeFormRuleList = (
  values: {
    required?: boolean
    pattern?: string
    patternMessage?: string
    min?: number | string | null
    max?: number | string | null
    len?: number | string | null
    message?: string
  },
  label?: string,
  type?: NativeFormNode['type'],
): NativeFormFieldRule[] => {
  const rules: NativeFormFieldRule[] = []
  const min = normalizeNativeFormRuleNumber(values.min)
  const max = normalizeNativeFormRuleNumber(values.max)
  const len = normalizeNativeFormRuleNumber(values.len)

  if (values.required) {
    rules.push({
      type: 'required',
      required: true,
      message: getNativeFormRequiredMessage(type, label),
    })
  }

  if (values.pattern) {
    rules.push({
      type: 'pattern',
      pattern: values.pattern,
      message: values.patternMessage || '格式不符合要求',
    })
  }

  if (min !== undefined) {
    rules.push({
      type: 'min',
      min,
      message: values.message || '值小于允许范围',
    })
  }

  if (max !== undefined) {
    rules.push({
      type: 'max',
      max,
      message: values.message || '值超出允许范围',
    })
  }

  if (len !== undefined) {
    rules.push({
      type: 'len',
      len,
      message: values.message || '长度不符合要求',
    })
  }

  return rules
}

export const sanitizeNativeFormNode = (field: NativeFormNode): NativeFormNode => {
  const manifest = getNativeFormFieldManifest(field.type)
  const supports = manifest?.supports || {}
  const visibilityConditions = resolveConditionList(field.visibilityConditions, sanitizeFieldCondition(field.visibilityCondition))
  const disabledConditions = resolveConditionList(field.disabledConditions, sanitizeFieldCondition(field.disabledCondition))

  const nextField: NativeFormNode = {
    ...field,
    label: field.label?.trim() || field.label,
    field: supports.fieldName ? (field.field?.trim() || field.field) : undefined,
    placeholder: supports.placeholder ? (field.placeholder?.trim() || field.placeholder) : undefined,
    required: supports.required ? Boolean(field.required) : false,
    disabled: Boolean(field.disabled),
    hidden: Boolean(field.hidden),
    itemProps: {
      showLabel: field.itemProps?.showLabel ?? true,
      tooltip: field.itemProps?.tooltip?.trim() || undefined,
      labelWidth: field.itemProps?.labelWidth,
      labelAlign: field.itemProps?.labelAlign,
      colon: field.itemProps?.colon,
      asterisk: supports.required ? Boolean(field.required) : false,
    },
    rules: normalizeRules(field.rules, field),
    visibilityCondition: visibilityConditions?.[0],
    visibilityConditions,
    visibilityMatchMode: field.visibilityMatchMode || 'all',
    disabledCondition: disabledConditions?.[0],
    disabledConditions,
    disabledMatchMode: field.disabledMatchMode || 'all',
    children: Array.isArray(field.children) && field.type !== 'grid'
      ? field.children.map(sanitizeNativeFormNode)
      : undefined,
    eventConfig: {
      changeRoutes: normalizeRoutes(field.eventConfig?.changeRoutes),
      clickRoutes: normalizeRoutes(field.eventConfig?.clickRoutes),
    },
    styleProps: {
      width: normalizeNativeFormStyleSize(field.styleProps?.width),
      height: normalizeNativeFormStyleSize(field.styleProps?.height),
      marginTop: normalizeNativeFormStyleSize(field.styleProps?.marginTop),
      marginBottom: normalizeNativeFormStyleSize(field.styleProps?.marginBottom),
    },
  }

  if (isNativeFormContainerField(field.type)) {
    nextField.componentProps = {
      ...nextField.componentProps,
      titleVisible: field.componentProps?.titleVisible ?? true,
      padding: normalizeNativeFormStyleSize(field.componentProps?.padding),
      backgroundColor: field.componentProps?.backgroundColor?.trim() || undefined,
      borderColor: field.componentProps?.borderColor?.trim() || undefined,
      borderStyle: field.componentProps?.borderStyle || undefined,
      borderRadius: normalizeNativeFormStyleSize(field.componentProps?.borderRadius),
      columnGap: normalizeNativeFormStyleSize(field.componentProps?.columnGap),
      rowGap: normalizeNativeFormStyleSize(field.componentProps?.rowGap),
    }
  }

  if (field.type === 'formPlate') {
    nextField.componentProps = {
      ...nextField.componentProps,
      isShowColor: field.componentProps?.isShowColor ?? true,
      isShowNoPlate: field.componentProps?.isShowNoPlate ?? false,
      isShowNoLimit: field.componentProps?.isShowNoLimit ?? true,
      allowClear: field.componentProps?.allowClear ?? true,
      accurate: field.componentProps?.accurate ?? false,
      province: field.componentProps?.province?.trim?.() || field.componentProps?.province || '京',
    }
  }

  if (field.type === 'formVehicleModel') {
    nextField.componentProps = {
      ...nextField.componentProps,
      mode: field.componentProps?.mode || 'single',
      allowClear: field.componentProps?.allowClear ?? true,
      bordered: field.componentProps?.bordered ?? true,
      separator: field.componentProps?.separator?.trim?.() || field.componentProps?.separator || '/',
      maxHeight: field.componentProps?.maxHeight,
      searchPlaceholder:
        field.componentProps?.searchPlaceholder?.trim?.()
          || field.componentProps?.searchPlaceholder
          || '搜索',
      hotBrands: Array.isArray(field.componentProps?.hotBrands)
        ? field.componentProps?.hotBrands
        : [],
    }
  }

  if (field.type === 'colorPicker') {
    nextField.componentProps = {
      ...nextField.componentProps,
      allowClear: undefined,
      showText: field.componentProps?.showText ?? true,
      format: field.componentProps?.format || 'hex',
    }
  }

  if (field.type === 'datePicker' || field.type === 'dateRangePicker') {
    nextField.componentProps = {
      ...nextField.componentProps,
      picker: normalizeNativeFormDatePicker(field.componentProps?.picker),
      showTime: field.componentProps?.showTime,
    }
  }

  if (['select', 'transfer', 'checkableTag', 'radioGroup', 'checkboxGroup', 'cascader', 'treeSelect'].includes(field.type)) {
    nextField.dataSourceType = field.dataSourceType || 'manual'
    nextField.options =
      (supports.options || supports.treeOptions) && nextField.dataSourceType === 'manual'
        ? sanitizeFieldOptions(field.options)
        : undefined
    nextField.requestConfig =
      (supports.options || supports.treeOptions) && nextField.dataSourceType === 'request'
        ? sanitizeRequestConfig(field.requestConfig)
        : undefined
  }

  if (field.type === 'subTable') {
    nextField.tableColumns = supports.subTableColumns ? sanitizeTableColumns(field) : undefined
  }

  if (field.type === 'grid') {
    nextField.gridCells = sanitizeGridCells(field)
  }

  if (supports.upload && field.type === 'upload' && field.uploadConfig) {
    nextField.uploadConfig = {
      ...field.uploadConfig,
      action: field.uploadConfig.action?.trim(),
      accept: field.uploadConfig.accept?.trim(),
      responseUrlField: field.uploadConfig.responseUrlField?.trim(),
    }
  } else if (!supports.upload) {
    nextField.uploadConfig = undefined
  }

  return nextField
}

export const sanitizeNativeFormSchema = (nodes: NativeFormNode[]): NativeFormNode[] =>
  nodes.map(sanitizeNativeFormNode)

export const buildNativeFormFieldFormValues = (
  field: NativeFormNode | null,
  fallbackOptions?: {
    colon?: boolean
  },
) => ({
  ...(() => {
    const manifest = field ? getNativeFormFieldManifest(field.type) : null
    const supports = manifest?.supports || {}
    return {
      fieldName: supports.fieldName ? field?.field : undefined,
      fieldRequired: supports.required ? field?.required : false,
      fieldPlaceholder: supports.placeholder ? field?.placeholder : undefined,
      fieldDefaultValue: supports.defaultValue
        ? typeof field?.defaultValue === 'string'
          ? field.defaultValue
          : field?.defaultValue == null
            ? field?.defaultValue
            : JSON.stringify(field.defaultValue)
        : undefined,
    }
  })(),
  fieldLabel: field?.label,
  fieldDisabled: field?.disabled,
  fieldHidden: field?.hidden,
  itemShowLabel: field?.itemProps?.showLabel,
  itemTooltip: field?.itemProps?.tooltip,
  itemLabelWidth: field?.itemProps?.labelWidth,
  itemLabelAlign: field?.itemProps?.labelAlign,
  itemColon: field?.itemProps?.colon ?? fallbackOptions?.colon,
  styleWidth: field?.styleProps?.width,
  styleHeight: field?.styleProps?.height,
  styleMarginTop: field?.styleProps?.marginTop,
  styleMarginBottom: field?.styleProps?.marginBottom,
  componentAllowClear: field?.componentProps?.allowClear,
  componentReadOnly: field?.componentProps?.readOnly,
  componentPassword: field?.componentProps?.password,
  componentVisibilityToggle: field?.componentProps?.visibilityToggle,
  componentShowCount: field?.componentProps?.showCount,
  componentRows: field?.componentProps?.rows,
  componentAutoSize: field?.componentProps?.autoSize,
  componentPrefix: field?.componentProps?.prefix,
  componentSuffix: field?.componentProps?.suffix,
  componentAddonBefore: field?.componentProps?.addonBefore,
  componentAddonAfter: field?.componentProps?.addonAfter,
  componentMin: field?.componentProps?.min,
  componentMax: field?.componentProps?.max,
  componentPrecision: field?.componentProps?.precision,
  componentStep: field?.componentProps?.step,
  componentControls: field?.componentProps?.controls,
  componentStringMode: field?.componentProps?.stringMode,
  componentMode: field?.componentProps?.mode || 'single',
  componentShowSearch: field?.componentProps?.showSearch,
  componentChangeOnSelect: field?.componentProps?.changeOnSelect,
  componentSearchPlaceholder: field?.componentProps?.searchPlaceholder,
  componentMaxTagCount: field?.componentProps?.maxTagCount,
  componentTransferOneWay: field?.componentProps?.oneWay,
  componentTransferTitles:
    field?.componentProps?.titles == null
      ? undefined
      : JSON.stringify(field.componentProps.titles),
  componentTransferOperations:
    field?.componentProps?.operations == null
      ? undefined
      : JSON.stringify(field.componentProps.operations),
  componentTagShowAsRadio: field?.componentProps?.showAsRadio,
  componentPlateShowColor: field?.componentProps?.isShowColor,
  componentPlateShowNoPlate: field?.componentProps?.isShowNoPlate,
  componentPlateShowNoLimit: field?.componentProps?.isShowNoLimit,
  componentPlateAccurate: field?.componentProps?.accurate,
  componentPlateProvince: field?.componentProps?.province,
  componentVehicleMode: field?.componentProps?.mode || 'single',
  componentVehicleBordered: field?.componentProps?.bordered,
  componentVehicleSeparator: field?.componentProps?.separator,
  componentVehicleMaxHeight: field?.componentProps?.maxHeight,
  componentVehicleSearchPlaceholder: field?.componentProps?.searchPlaceholder,
  componentVehicleHotBrands:
    field?.componentProps?.hotBrands == null
      ? undefined
      : JSON.stringify(field.componentProps.hotBrands),
  componentDirection: field?.componentProps?.direction ?? 'horizontal',
  componentFlexGap: field?.componentProps?.gap,
  componentFlexWrap: field?.componentProps?.wrap,
  componentFlexJustify: field?.componentProps?.justify,
  componentFlexAlign: field?.componentProps?.align,
  componentFormat: field?.componentProps?.format,
  componentPicker:
    field?.type === 'datePicker' || field?.type === 'dateRangePicker'
      ? normalizeNativeFormDatePicker(field?.componentProps?.picker)
      : field?.componentProps?.picker,
  componentShowTime: field?.componentProps?.showTime,
  componentRangeSeparator: field?.componentProps?.separator,
  componentRangePlaceholder:
    Array.isArray(field?.componentProps?.placeholder)
      ? JSON.stringify(field?.componentProps?.placeholder)
      : undefined,
  componentDisablePastDates: field?.componentProps?.disablePastDates,
  componentUse12Hours: field?.componentProps?.use12Hours,
  componentHourStep: field?.componentProps?.hourStep,
  componentMinuteStep: field?.componentProps?.minuteStep,
  componentSecondStep: field?.componentProps?.secondStep,
  componentMultiple: field?.componentProps?.multiple,
  componentTreeCheckable: field?.componentProps?.treeCheckable,
  componentTreeDefaultExpandAll: field?.componentProps?.treeDefaultExpandAll,
  componentShowCheckedStrategy: field?.componentProps?.showCheckedStrategy,
  componentFormatMode: field?.componentProps?.format,
  componentShowText: field?.componentProps?.showText,
  componentSliderRange: field?.componentProps?.range,
  componentSliderDots: field?.componentProps?.dots,
  componentSliderReverse: field?.componentProps?.reverse,
  componentSliderIncluded: field?.componentProps?.included,
  componentSliderMarks:
    field?.componentProps?.marks == null
      ? undefined
      : JSON.stringify(field.componentProps.marks),
  componentTooltipOpen: field?.componentProps?.tooltipOpen,
  componentRateCount: field?.componentProps?.count,
  componentRateAllowHalf: field?.componentProps?.allowHalf,
  componentRateTooltips:
    field?.componentProps?.tooltips == null
      ? undefined
      : JSON.stringify(field.componentProps.tooltips),
  componentCheckedChildren: field?.componentProps?.checkedChildren,
  componentUncheckedChildren: field?.componentProps?.unCheckedChildren,
  buttonText: field?.componentProps?.text,
  buttonType: field?.componentProps?.buttonType,
  buttonAlign: field?.componentProps?.buttonAlign || 'center',
  buttonActionType: field?.componentProps?.actionType || 'submit',
  uploadButtonText: field?.componentProps?.buttonText,
  fieldDescription: field?.componentProps?.description,
  componentTitleVisible: field?.componentProps?.titleVisible,
  componentPadding: field?.componentProps?.padding,
  componentBackgroundColor: field?.componentProps?.backgroundColor,
  componentBorderColor: field?.componentProps?.borderColor,
  componentBorderStyle: field?.componentProps?.borderStyle,
  componentBorderRadius: field?.componentProps?.borderRadius,
  gridColumns: field?.columns,
  gridColumnGap: field?.componentProps?.columnGap,
  gridRowGap: field?.componentProps?.rowGap,
  dataSourceType: field?.dataSourceType || 'manual',
  requestEndpoint: field?.requestConfig?.endpoint,
  requestMethod: field?.requestConfig?.method,
  requestListField: field?.requestConfig?.listField,
  requestLabelField: field?.requestConfig?.labelField,
  requestValueField: field?.requestConfig?.valueField,
  requestChildrenField: field?.requestConfig?.childrenField,
  requestHeadersList: objectToKeyValueList(field?.requestConfig?.headers),
  requestQueryList: objectToKeyValueList(field?.requestConfig?.query),
  requestBodyList: objectToKeyValueList(field?.requestConfig?.body),
  uploadAction: field?.uploadConfig?.action,
  uploadAccept: field?.uploadConfig?.accept,
  uploadMultiple: field?.uploadConfig?.multiple,
  uploadListType: normalizeUploadListType(field?.uploadConfig?.listType),
  uploadButtonType: normalizeUploadButtonType(
    field?.uploadConfig?.buttonType,
    field?.uploadConfig?.listType,
  ),
  uploadValueMode: field?.uploadConfig?.valueMode,
  uploadResponseUrlField: field?.uploadConfig?.responseUrlField,
  uploadMaxSizeMb: field?.uploadConfig?.maxSizeMb,
  uploadDraggable: field?.uploadConfig?.draggable,
  visibilitySourceField: field?.visibilityCondition?.sourceField,
  visibilityOperator: field?.visibilityCondition?.operator,
  visibilityValue: field?.visibilityCondition?.value,
  visibilityMatchMode: field?.visibilityMatchMode || 'all',
  visibilityConditions: (field?.visibilityConditions || (field?.visibilityCondition ? [field.visibilityCondition] : [])).map((item) => ({
    sourceField: item.sourceField,
    operator: item.operator,
    value: item.value,
  })),
  disabledSourceField: field?.disabledCondition?.sourceField,
  disabledOperator: field?.disabledCondition?.operator,
  disabledValue: field?.disabledCondition?.value,
  disabledMatchMode: field?.disabledMatchMode || 'all',
  disabledConditions: (field?.disabledConditions || (field?.disabledCondition ? [field.disabledCondition] : [])).map((item) => ({
    sourceField: item.sourceField,
    operator: item.operator,
    value: item.value,
  })),
  validationPattern: field?.rules?.find(item => item.type === 'pattern')?.pattern,
  validationPatternMessage: field?.rules?.find(item => item.type === 'pattern')?.message,
  validationMin: field?.rules?.find(item => item.type === 'min')?.min,
  validationMax: field?.rules?.find(item => item.type === 'max')?.max,
  validationLen: field?.rules?.find(item => item.type === 'len')?.len,
  validationMessage:
    field?.rules?.find(item => ['min', 'max', 'len'].includes(item.type || ''))?.message,
  changeRoutes: field?.eventConfig?.changeRoutes || [],
  clickRoutes: field?.eventConfig?.clickRoutes || [],
  fieldOptions: field?.options?.map((item) => ({
    label: item.label,
    value: String(item.value ?? ''),
    text: item.text,
    disabled: item.disabled,
    cancelOther: item.cancelOther,
    showStyle: item.showStyle,
    color: item.color,
    borderColor: item.borderColor,
    icon: item.icon,
  })),
  treeFieldOptions: field?.options?.map((item) => mapOptionToTreeFormValue(item)),
  subTableColumns: field?.tableColumns?.map((column) => ({
    id: column.id,
    label: column.label,
    field: column.field,
    type: column.type,
    required: column.required,
    defaultValue:
      typeof column.defaultValue === 'string'
        ? column.defaultValue
        : column.defaultValue == null
          ? column.defaultValue
          : JSON.stringify(column.defaultValue),
    placeholder: column.placeholder,
    readOnly: column.readOnly,
    disabled: column.disabled,
    width: column.width,
    componentMode: column.componentProps?.mode || 'single',
    componentShowSearch: column.componentProps?.showSearch,
    componentMultiple: column.componentProps?.multiple,
    componentChangeOnSelect: column.componentProps?.changeOnSelect,
    componentTreeCheckable: column.componentProps?.treeCheckable,
    componentTreeDefaultExpandAll: column.componentProps?.treeDefaultExpandAll,
    componentShowCheckedStrategy: column.componentProps?.showCheckedStrategy,
    componentSearchPlaceholder: column.componentProps?.searchPlaceholder,
    componentMaxTagCount: column.componentProps?.maxTagCount,
    componentFormat: column.componentProps?.format,
    componentPicker:
      column.type === 'datePicker' || column.type === 'dateRangePicker'
        ? normalizeNativeFormDatePicker(column.componentProps?.picker)
        : column.componentProps?.picker,
    componentShowTime: column.componentProps?.showTime,
    componentDisablePastDates: column.componentProps?.disablePastDates,
    componentUse12Hours: column.componentProps?.use12Hours,
    componentHourStep: column.componentProps?.hourStep,
    componentMinuteStep: column.componentProps?.minuteStep,
    componentSecondStep: column.componentProps?.secondStep,
    uploadButtonText: column.componentProps?.buttonText,
    uploadAction: column.uploadConfig?.action,
    uploadAccept: column.uploadConfig?.accept,
    uploadMultiple: column.uploadConfig?.multiple,
    uploadListType: normalizeUploadListType(column.uploadConfig?.listType),
    uploadButtonType: normalizeUploadButtonType(
      column.uploadConfig?.buttonType,
      column.uploadConfig?.listType,
    ),
    uploadValueMode: column.uploadConfig?.valueMode,
    uploadResponseUrlField: column.uploadConfig?.responseUrlField,
    uploadMaxSizeMb: column.uploadConfig?.maxSizeMb,
    uploadDraggable: column.uploadConfig?.draggable,
    validationPattern: column.rules?.find(item => item.type === 'pattern')?.pattern,
    validationPatternMessage: column.rules?.find(item => item.type === 'pattern')?.message,
    validationMin: column.rules?.find(item => item.type === 'min')?.min,
    validationMax: column.rules?.find(item => item.type === 'max')?.max,
    validationLen: column.rules?.find(item => item.type === 'len')?.len,
    validationMessage:
      column.rules?.find(item => ['min', 'max', 'len'].includes(item.type || ''))?.message,
    dataSourceType: column.dataSourceType || 'manual',
    options: column.options?.map((option) => (
      column.type === 'treeSelect' || column.type === 'cascader'
        ? mapOptionToTreeFormValue(option)
        : {
            label: option.label,
            value: String(option.value ?? ''),
            text: option.text,
            disabled: option.disabled,
          }
    )),
    requestEndpoint: column.requestConfig?.endpoint,
    requestMethod: column.requestConfig?.method,
    requestListField: column.requestConfig?.listField,
    requestLabelField: column.requestConfig?.labelField,
    requestValueField: column.requestConfig?.valueField,
    requestChildrenField: column.requestConfig?.childrenField,
    requestHeadersList: objectToKeyValueList(column.requestConfig?.headers),
    requestQueryList: objectToKeyValueList(column.requestConfig?.query),
    requestBodyList: objectToKeyValueList(column.requestConfig?.body),
  })),
})

export const applyNativeFormFieldFormValues = (
  field: NativeFormNode,
  changedValues: Record<string, any>,
  options?: {
    inheritLayoutColon?: boolean
  },
): NativeFormNode => {
  const manifest = getNativeFormFieldManifest(field.type)
  const supports = manifest?.supports || {}
  const traits = manifest?.traits || {}
  const parseJsonInput = (value: any) => {
    if (value == null || value === '') {
      return undefined
    }
    if (typeof value !== 'string') {
      return value
    }
    return parseJsonConfig(value)
  }
  const requestConfig =
    (supports.options || supports.treeOptions) &&
    ['select', 'transfer', 'checkableTag', 'radioGroup', 'checkboxGroup', 'cascader', 'treeSelect'].includes(field.type) &&
    (changedValues.dataSourceType ?? field.dataSourceType) === 'request'
      ? {
          endpoint: changedValues.requestEndpoint ?? field.requestConfig?.endpoint,
          method: changedValues.requestMethod ?? field.requestConfig?.method,
          headers: keyValueListToObject(changedValues.requestHeadersList) ?? field.requestConfig?.headers,
          query: keyValueListToObject(changedValues.requestQueryList) ?? field.requestConfig?.query,
          body: keyValueListToObject(changedValues.requestBodyList) ?? field.requestConfig?.body,
          listField: changedValues.requestListField ?? field.requestConfig?.listField,
          labelField: changedValues.requestLabelField ?? field.requestConfig?.labelField,
          valueField: changedValues.requestValueField ?? field.requestConfig?.valueField,
          childrenField: changedValues.requestChildrenField ?? field.requestConfig?.childrenField,
        }
      : undefined

  const nextRequired = supports.required ? Boolean(changedValues.fieldRequired ?? field.required) : false

  const rules: NativeFormFieldRule[] = []
  if (nextRequired) {
    rules.push({
      type: 'required',
      required: true,
      message: getNativeFormRequiredMessage(field.type, changedValues.fieldLabel ?? field.label),
    })
  }

  if (changedValues.validationPattern || field.rules?.some(item => item.type === 'pattern')) {
    const pattern = changedValues.validationPattern
    if (pattern) {
      rules.push({
        type: 'pattern',
        pattern,
        message: changedValues.validationPatternMessage || '格式不符合要求',
      })
    }
  }

  const validationMin = normalizeNativeFormRuleNumber(changedValues.validationMin)
  const validationMax = normalizeNativeFormRuleNumber(changedValues.validationMax)
  const validationLen = normalizeNativeFormRuleNumber(changedValues.validationLen)

  if (validationMin !== undefined) {
    rules.push({
      type: 'min',
      min: validationMin,
      message: changedValues.validationMessage || '值小于允许范围',
    })
  }

  if (validationMax !== undefined) {
    rules.push({
      type: 'max',
      max: validationMax,
      message: changedValues.validationMessage || '值超出允许范围',
    })
  }

  if (validationLen !== undefined) {
    rules.push({
      type: 'len',
      len: validationLen,
      message: changedValues.validationMessage || '长度不符合要求',
    })
  }

  const visibilityConditions = Array.isArray(changedValues.visibilityConditions)
    ? sanitizeFieldConditions(changedValues.visibilityConditions)
    : sanitizeFieldConditions(
        field.visibilityConditions || (field.visibilityCondition ? [field.visibilityCondition] : undefined),
      )

  const disabledConditions = Array.isArray(changedValues.disabledConditions)
    ? sanitizeFieldConditions(changedValues.disabledConditions)
    : sanitizeFieldConditions(
        field.disabledConditions || (field.disabledCondition ? [field.disabledCondition] : undefined),
      )
  const defaultValue = supports.defaultValue
    ? parseNativeFormDefaultValue({
        ...field,
        defaultValue: changedValues.fieldDefaultValue ?? field.defaultValue,
        componentProps: {
          ...(field.componentProps || {}),
          min: changedValues.componentMin ?? field.componentProps?.min,
          max: changedValues.componentMax ?? field.componentProps?.max,
          range: changedValues.componentSliderRange ?? field.componentProps?.range,
        },
      } as NativeFormNode)
    : undefined
  const uploadMultiple = changedValues.uploadMultiple ?? field.uploadConfig?.multiple

  const nextField: NativeFormNode = {
    ...field,
    label: changedValues.fieldLabel ?? field.label,
    field: supports.fieldName
      ? (changedValues.fieldName ?? field.field)
      : undefined,
    required: nextRequired,
    placeholder: supports.placeholder
      ? (changedValues.fieldPlaceholder ?? field.placeholder)
      : undefined,
    defaultValue: supports.defaultValue
      ? defaultValue
      : undefined,
    disabled: changedValues.fieldDisabled ?? field.disabled,
    hidden: changedValues.fieldHidden ?? field.hidden,
    itemProps: {
      ...(field.itemProps || {}),
      showLabel: changedValues.itemShowLabel ?? field.itemProps?.showLabel ?? true,
      tooltip: changedValues.itemTooltip ?? field.itemProps?.tooltip,
      labelWidth: changedValues.itemLabelWidth ?? field.itemProps?.labelWidth,
      labelAlign: changedValues.itemLabelAlign ?? field.itemProps?.labelAlign,
      colon: options?.inheritLayoutColon
        ? undefined
        : changedValues.itemColon ?? field.itemProps?.colon,
      asterisk: nextRequired,
    },
    columns: changedValues.gridColumns ?? field.columns,
    dataSourceType:
      (supports.options || supports.treeOptions) &&
      ['select', 'transfer', 'checkableTag', 'radioGroup', 'checkboxGroup', 'cascader', 'treeSelect'].includes(field.type)
        ? (changedValues.dataSourceType ?? field.dataSourceType ?? 'manual')
        : undefined,
    requestConfig,
    visibilityCondition: visibilityConditions?.[0],
    visibilityConditions,
    visibilityMatchMode: changedValues.visibilityMatchMode ?? field.visibilityMatchMode ?? 'all',
    disabledCondition: disabledConditions?.[0],
    disabledConditions,
    disabledMatchMode: changedValues.disabledMatchMode ?? field.disabledMatchMode ?? 'all',
    uploadConfig:
      supports.upload && field.type === 'upload'
        ? {
            action: changedValues.uploadAction ?? field.uploadConfig?.action,
            accept: changedValues.uploadAccept ?? field.uploadConfig?.accept,
            multiple: uploadMultiple,
            listType: normalizeUploadListType(
              changedValues.uploadListType ?? field.uploadConfig?.listType,
            ),
            buttonType: normalizeUploadButtonType(
              changedValues.uploadButtonType ?? field.uploadConfig?.buttonType,
              changedValues.uploadListType ?? field.uploadConfig?.listType,
            ),
            valueMode: changedValues.uploadValueMode ?? field.uploadConfig?.valueMode,
            responseUrlField: changedValues.uploadResponseUrlField ?? field.uploadConfig?.responseUrlField,
            maxSizeMb: changedValues.uploadMaxSizeMb ?? field.uploadConfig?.maxSizeMb,
            draggable: changedValues.uploadDraggable ?? field.uploadConfig?.draggable,
          }
        : undefined,
    tableColumns:
      supports.subTableColumns && field.type === 'subTable'
        ? normalizeTableColumns(field, changedValues)
        : undefined,
    componentProps: {
      ...(field.componentProps || {}),
      allowClear:
        traits.textInput
          ? (changedValues.componentAllowClear ?? field.componentProps?.allowClear)
          : undefined,
      readOnly:
        traits.textInput || field.type === 'inputNumber'
          ? (changedValues.componentReadOnly ?? field.componentProps?.readOnly)
          : undefined,
      password:
        field.type === 'input' || field.type === 'password'
          ? (changedValues.componentPassword ?? field.componentProps?.password)
          : undefined,
      visibilityToggle:
        field.type === 'password'
          ? (changedValues.componentVisibilityToggle ?? field.componentProps?.visibilityToggle)
          : undefined,
      maxLength: undefined,
      showCount: traits.textInput ? (changedValues.componentShowCount ?? field.componentProps?.showCount) : undefined,
      rows: field.type === 'textarea' ? (changedValues.componentRows ?? field.componentProps?.rows) : undefined,
      autoSize: field.type === 'textarea' ? (changedValues.componentAutoSize ?? field.componentProps?.autoSize) : undefined,
      prefix:
        field.type === 'input' || field.type === 'password'
          ? (changedValues.componentPrefix ?? field.componentProps?.prefix)
          : undefined,
      suffix:
        field.type === 'input' || field.type === 'password'
          ? (changedValues.componentSuffix ?? field.componentProps?.suffix)
          : undefined,
      addonBefore:
        field.type === 'input' || field.type === 'password'
          ? (changedValues.componentAddonBefore ?? field.componentProps?.addonBefore)
          : undefined,
      addonAfter:
        field.type === 'input' || field.type === 'password'
          ? (changedValues.componentAddonAfter ?? field.componentProps?.addonAfter)
          : undefined,
      min:
        traits.numericInput
          ? (changedValues.componentMin ?? field.componentProps?.min)
          : undefined,
      max:
        traits.numericInput
          ? (changedValues.componentMax ?? field.componentProps?.max)
          : undefined,
      precision: traits.numericInput ? (changedValues.componentPrecision ?? field.componentProps?.precision) : undefined,
      step:
        traits.numericInput || traits.sliderLike
          ? (changedValues.componentStep ?? field.componentProps?.step)
          : undefined,
      controls: traits.numericInput ? (changedValues.componentControls ?? field.componentProps?.controls) : undefined,
      stringMode: traits.numericInput ? (changedValues.componentStringMode ?? field.componentProps?.stringMode) : undefined,
      mode:
        traits.vehicleModelLike
          ? (changedValues.componentVehicleMode ?? field.componentProps?.mode)
          : traits.select
          ? (changedValues.componentMode !== undefined
              ? (changedValues.componentMode === 'single' ? undefined : changedValues.componentMode)
              : field.componentProps?.mode)
          : undefined,
      showSearch:
        traits.selectLike && !traits.vehicleModelLike
          ? (changedValues.componentShowSearch ?? field.componentProps?.showSearch)
          : undefined,
      searchPlaceholder:
        traits.vehicleModelLike
          ? (changedValues.componentVehicleSearchPlaceholder ?? field.componentProps?.searchPlaceholder)
          : traits.select || traits.transferLike
          ? (changedValues.componentSearchPlaceholder ?? field.componentProps?.searchPlaceholder)
          : undefined,
      maxTagCount: traits.select
        ? normalizeNativeFormMaxTagCount(changedValues.componentMaxTagCount ?? field.componentProps?.maxTagCount)
        : undefined,
      oneWay:
        traits.transferLike
          ? (changedValues.componentTransferOneWay ?? field.componentProps?.oneWay)
          : undefined,
      titles:
        traits.transferLike
          ? (parseJsonInput(changedValues.componentTransferTitles) ?? field.componentProps?.titles)
          : undefined,
      operations:
        traits.transferLike
          ? (parseJsonInput(changedValues.componentTransferOperations) ?? field.componentProps?.operations)
          : undefined,
      showAsRadio:
        traits.tagLike
          ? (changedValues.componentTagShowAsRadio ?? field.componentProps?.showAsRadio)
          : undefined,
      isShowColor:
        traits.plateLike
          ? (changedValues.componentPlateShowColor ?? field.componentProps?.isShowColor)
          : undefined,
      isShowNoPlate:
        traits.plateLike
          ? (changedValues.componentPlateShowNoPlate ?? field.componentProps?.isShowNoPlate)
          : undefined,
      isShowNoLimit:
        traits.plateLike
          ? (changedValues.componentPlateShowNoLimit ?? field.componentProps?.isShowNoLimit)
          : undefined,
      accurate:
        traits.plateLike
          ? (changedValues.componentPlateAccurate ?? field.componentProps?.accurate)
          : undefined,
      province:
        traits.plateLike
          ? (changedValues.componentPlateProvince ?? field.componentProps?.province)
          : undefined,
      multiple:
        traits.treeSelect || field.type === 'cascader'
          ? (changedValues.componentMultiple ?? field.componentProps?.multiple)
          : undefined,
      changeOnSelect:
        field.type === 'cascader'
          ? (changedValues.componentChangeOnSelect ?? field.componentProps?.changeOnSelect)
          : undefined,
      treeCheckable:
        traits.treeSelect
          ? (changedValues.componentTreeCheckable ?? field.componentProps?.treeCheckable)
          : undefined,
      treeDefaultExpandAll:
        traits.treeSelect
          ? (changedValues.componentTreeDefaultExpandAll ?? field.componentProps?.treeDefaultExpandAll)
          : undefined,
      showCheckedStrategy:
        traits.treeSelect
          ? (changedValues.componentShowCheckedStrategy ?? field.componentProps?.showCheckedStrategy)
          : undefined,
      direction:
        traits.choiceGroup || field.type === 'flex'
          ? (changedValues.componentDirection ?? field.componentProps?.direction ?? 'horizontal')
          : undefined,
      gap:
        field.type === 'flex'
          ? normalizeNativeFormStyleSize(changedValues.componentFlexGap ?? field.componentProps?.gap)
          : undefined,
      wrap:
        field.type === 'flex'
          ? (changedValues.componentFlexWrap ?? field.componentProps?.wrap)
          : undefined,
      justify:
        field.type === 'flex'
          ? (changedValues.componentFlexJustify ?? field.componentProps?.justify)
          : undefined,
      align:
        field.type === 'flex'
          ? (changedValues.componentFlexAlign ?? field.componentProps?.align)
          : undefined,
      format:
        traits.dateLike
          ? (changedValues.componentFormat ?? field.componentProps?.format)
          : traits.colorLike
          ? (changedValues.componentFormatMode ?? field.componentProps?.format)
          : undefined,
      picker:
        field.type === 'datePicker' || field.type === 'dateRangePicker'
          ? normalizeNativeFormDatePicker(changedValues.componentPicker ?? field.componentProps?.picker)
          : undefined,
      showTime:
        field.type === 'datePicker' || field.type === 'dateRangePicker'
          ? (changedValues.componentShowTime ?? field.componentProps?.showTime)
          : undefined,
      separator:
        traits.vehicleModelLike
          ? (changedValues.componentVehicleSeparator ?? field.componentProps?.separator)
          : field.type === 'dateRangePicker' || field.type === 'timeRangePicker'
          ? (changedValues.componentRangeSeparator ?? field.componentProps?.separator)
          : undefined,
      placeholder:
        field.type === 'dateRangePicker' || field.type === 'timeRangePicker'
          ? (parseJsonInput(changedValues.componentRangePlaceholder) ?? field.componentProps?.placeholder)
          : field.componentProps?.placeholder,
      disablePastDates:
        field.type === 'datePicker' || field.type === 'dateRangePicker'
          ? (changedValues.componentDisablePastDates ?? field.componentProps?.disablePastDates)
          : undefined,
      use12Hours:
        field.type === 'timePicker' || field.type === 'timeRangePicker'
          ? (changedValues.componentUse12Hours ?? field.componentProps?.use12Hours)
          : undefined,
      hourStep:
        field.type === 'timePicker' || field.type === 'timeRangePicker'
          ? (changedValues.componentHourStep ?? field.componentProps?.hourStep)
          : undefined,
      minuteStep:
        field.type === 'timePicker' || field.type === 'timeRangePicker'
          ? (changedValues.componentMinuteStep ?? field.componentProps?.minuteStep)
          : undefined,
      secondStep:
        field.type === 'timePicker' || field.type === 'timeRangePicker'
          ? (changedValues.componentSecondStep ?? field.componentProps?.secondStep)
          : undefined,
      showText:
        traits.colorLike
          ? (changedValues.componentShowText ?? field.componentProps?.showText)
          : undefined,
      range:
        traits.sliderLike
          ? (changedValues.componentSliderRange ?? field.componentProps?.range)
          : undefined,
      dots:
        traits.sliderLike
          ? (changedValues.componentSliderDots ?? field.componentProps?.dots)
          : undefined,
      reverse:
        traits.sliderLike
          ? (changedValues.componentSliderReverse ?? field.componentProps?.reverse)
          : undefined,
      vertical: undefined,
      included:
        traits.sliderLike
          ? (changedValues.componentSliderIncluded ?? field.componentProps?.included)
          : undefined,
      marks:
        traits.sliderLike
          ? (parseJsonInput(changedValues.componentSliderMarks) ?? field.componentProps?.marks)
          : undefined,
      tooltipOpen:
        traits.sliderLike
          ? (changedValues.componentTooltipOpen ?? field.componentProps?.tooltipOpen)
          : undefined,
      count:
        traits.rateLike
          ? (changedValues.componentRateCount ?? field.componentProps?.count)
          : undefined,
      allowHalf:
        traits.rateLike
          ? (changedValues.componentRateAllowHalf ?? field.componentProps?.allowHalf)
          : undefined,
      tooltips:
        traits.rateLike
          ? (parseJsonInput(changedValues.componentRateTooltips) ?? field.componentProps?.tooltips)
          : undefined,
      checkedChildren:
        traits.switch ? (changedValues.componentCheckedChildren ?? field.componentProps?.checkedChildren) : undefined,
      unCheckedChildren:
        traits.switch ? (changedValues.componentUncheckedChildren ?? field.componentProps?.unCheckedChildren) : undefined,
      bordered:
        traits.vehicleModelLike
          ? (changedValues.componentVehicleBordered ?? field.componentProps?.bordered)
          : undefined,
      maxHeight:
        traits.vehicleModelLike
          ? (changedValues.componentVehicleMaxHeight ?? field.componentProps?.maxHeight)
          : undefined,
      hotBrands:
        traits.vehicleModelLike
          ? (parseJsonInput(changedValues.componentVehicleHotBrands) ?? field.componentProps?.hotBrands)
          : undefined,
      description: changedValues.fieldDescription ?? field.componentProps?.description,
      titleVisible:
        changedValues.componentTitleVisible ?? field.componentProps?.titleVisible,
      padding: normalizeNativeFormStyleSize(changedValues.componentPadding ?? field.componentProps?.padding),
      backgroundColor:
        normalizeNativeFormColorValue(
          changedValues.componentBackgroundColor,
          field.componentProps?.backgroundColor,
        ),
      borderColor:
        normalizeNativeFormColorValue(
          changedValues.componentBorderColor,
          field.componentProps?.borderColor,
        ),
      borderStyle:
        changedValues.componentBorderStyle ?? field.componentProps?.borderStyle,
      borderRadius:
        normalizeNativeFormStyleSize(changedValues.componentBorderRadius ?? field.componentProps?.borderRadius),
      columnGap: normalizeNativeFormStyleSize(changedValues.gridColumnGap ?? field.componentProps?.columnGap),
      rowGap: normalizeNativeFormStyleSize(changedValues.gridRowGap ?? field.componentProps?.rowGap),
      buttonText: changedValues.uploadButtonText ?? field.componentProps?.buttonText,
      ...(field.type === 'button'
        ? {
            text: changedValues.buttonText ?? field.componentProps?.text,
            buttonType: changedValues.buttonType ?? field.componentProps?.buttonType,
            buttonAlign: changedValues.buttonAlign ?? field.componentProps?.buttonAlign ?? 'center',
            actionType: changedValues.buttonActionType ?? field.componentProps?.actionType ?? 'submit',
          }
        : {}),
    },
    styleProps: {
      ...(field.styleProps || {}),
      width: normalizeNativeFormStyleSize(changedValues.styleWidth ?? field.styleProps?.width),
      height: normalizeNativeFormStyleSize(changedValues.styleHeight ?? field.styleProps?.height),
      marginTop: normalizeNativeFormStyleSize(changedValues.styleMarginTop ?? field.styleProps?.marginTop),
      marginBottom: normalizeNativeFormStyleSize(changedValues.styleMarginBottom ?? field.styleProps?.marginBottom),
    },
    eventConfig: {
      changeRoutes:
        changedValues.changeRoutes !== undefined
          ? normalizeRoutes(changedValues.changeRoutes)
          : normalizeRoutes(field.eventConfig?.changeRoutes),
      clickRoutes:
        changedValues.clickRoutes !== undefined
          ? normalizeRoutes(changedValues.clickRoutes)
          : normalizeRoutes(field.eventConfig?.clickRoutes),
    },
    options:
      (supports.options || supports.treeOptions) &&
      (changedValues.fieldOptions || changedValues.treeFieldOptions) &&
      (changedValues.dataSourceType ?? field.dataSourceType ?? 'manual') === 'manual'
        ? (
            field.type === 'treeSelect' || field.type === 'cascader'
              ? (changedValues.treeFieldOptions || [])
              : (changedValues.fieldOptions || [])
          )
            .filter((item: {
              label?: string
              value?: string
              text?: string
              disabled?: boolean
              color?: string
              borderColor?: string
              icon?: string
            }) => item?.label || item?.value)
            .map((item: {
              label?: string
              value?: string
              text?: string
              disabled?: boolean
              cancelOther?: boolean
              showStyle?: string
              color?: string
              borderColor?: string
              icon?: string
              children?: Array<any>
            }) => (
              field.type === 'treeSelect' || field.type === 'cascader'
                ? mapTreeFormValueToOption(item)
                : {
                    label: item.label || item.value || '',
                    value: item.value || item.label || '',
                    text: item.text || item.label || item.value || '',
                    disabled: item.disabled,
                    cancelOther: item.cancelOther,
                    showStyle: item.showStyle,
                    color: item.color,
                    borderColor: item.borderColor,
                    icon: item.icon,
                  }
            ))
        : (supports.options || supports.treeOptions)
          ? ensureNativeFormFieldOptions(field)
          : undefined,
    rules,
  }

  if (field.type === 'grid') {
    const nextColumnCount = Math.max(1, Number(changedValues.gridColumns ?? field.columns ?? 1))
    const currentCells = Array.isArray(field.gridCells) ? field.gridCells : []
    nextField.gridCells = Array.from({ length: nextColumnCount }, (_, index) => {
      const currentCell = currentCells[index]
      return {
        id: currentCell?.id || uuidv4(),
        node: currentCell?.node || null,
      }
    })
  }

  nextField.rules = buildNativeFormFieldRules(nextField)
  return nextField
}

export const findNativeFormNodeById = (
  nodes: NativeFormNode[],
  nodeId: string | null | undefined,
): NativeFormNode | null => {
  if (!nodeId) {
    return null
  }

  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }

    const childNodes = getContainerChildNodes(node)
    if (childNodes.length > 0) {
      const child = findNativeFormNodeById(childNodes, nodeId)
      if (child) {
        return child
      }
    }
  }

  return null
}

export const nativeFormNodeContains = (
  node: NativeFormNode | null | undefined,
  targetNodeId: string | null | undefined,
): boolean => {
  if (!node || !targetNodeId) {
    return false
  }

  if (node.id === targetNodeId) {
    return true
  }

  return getContainerChildNodes(node).some(child => nativeFormNodeContains(child, targetNodeId))
}

export const collectNativeFormFieldCandidates = (
  nodes: NativeFormNode[],
  excludedNodeId?: string,
): Array<{ label: string; value: string }> => {
  const result: Array<{ label: string; value: string }> = []

  const traverse = (items: NativeFormNode[]) => {
    items.forEach((item) => {
      if (item.id !== excludedNodeId && item.field) {
        result.push({
          label: `${item.label || item.field} (${item.field})`,
          value: item.field,
        })
      }

      const childNodes = getContainerChildNodes(item)
      if (childNodes.length > 0) {
        traverse(childNodes)
      }
    })
  }

  traverse(nodes)
  return result
}

export const getNativeFormFieldItemLabel = (field: NativeFormNode) => {
  if (field.type === 'button' || field.itemProps?.showLabel === false) {
    return undefined
  }

  return field.label
}

export const getNativeFormFieldItemClassName = (
  baseClassName: string,
  field: NativeFormNode,
) => [
  baseClassName,
  !field.required ? `${baseClassName}--no-asterisk` : '',
  field.itemProps?.labelAlign ? `${baseClassName}--label-${field.itemProps.labelAlign}` : '',
]
  .filter(Boolean)
  .join(' ')

export const getNativeFormFieldItemStyle = (
  field: NativeFormNode,
): React.CSSProperties => ({
  marginTop: field.styleProps?.marginTop,
  marginBottom: field.styleProps?.marginBottom,
})

export const getNativeFormFieldControlStyle = (
  field: NativeFormNode,
): React.CSSProperties => {
  const buttonAlign = (field.componentProps?.buttonAlign || 'center') as 'left' | 'center' | 'right'

  return {
    width: field.styleProps?.width || undefined,
    height: field.styleProps?.height || undefined,
    display: field.type === 'button' ? 'flex' : undefined,
    justifyContent:
      field.type === 'button'
        ? ({
            left: 'flex-start',
            center: 'center',
            right: 'flex-end',
          }[buttonAlign])
        : undefined,
  }
}

export const getNativeFormFieldLabelLayout = (
  field: NativeFormNode,
  layoutMode?: 'vertical' | 'horizontal' | 'inline',
  fallbackLabelWidth?: number,
) => {
  if (layoutMode !== 'horizontal') {
    return {
      labelCol: undefined,
      wrapperCol: undefined,
    }
  }

  if (field.type === 'button') {
    return {
      labelCol: { span: 0 },
      wrapperCol: { span: 24 },
    }
  }

  const labelWidth = field.itemProps?.labelWidth ?? fallbackLabelWidth

  return {
    labelCol: labelWidth ? { flex: `0 0 ${labelWidth}px` } : undefined,
    wrapperCol: labelWidth ? { flex: '1 1 0' } : undefined,
  }
}

export const updateNativeFormNodeById = (
  nodes: NativeFormNode[],
  nodeId: string,
  updater: (node: NativeFormNode) => NativeFormNode,
): NativeFormNode[] =>
  nodes.map((node) => {
    if (node.id === nodeId) {
      return updater(node)
    }

    if (isNativeFormContainerField(node.type)) {
      return mapContainerChildren(node, child => (
        child.id === nodeId
          ? updater(child)
          : updateNativeFormNodeById([child], nodeId, updater)[0]
      ))
    }

    return node
  })

export const removeNativeFormNodeById = (
  nodes: NativeFormNode[],
  nodeId: string,
): NativeFormNode[] =>
  nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => {
      if (!isNativeFormContainerField(node.type)) {
        return node
      }

      return mapContainerChildren(node, child => (
        child.id === nodeId ? null : removeNativeFormNodeById([child], nodeId)[0] || null
      ))
    })

export const appendNativeFormNodeToTarget = (
  nodes: NativeFormNode[],
  targetNodeId: string | null,
  nextNode: NativeFormNode,
): NativeFormNode[] => {
  if (!targetNodeId) {
    return [...nodes, nextNode]
  }

  return nodes.map((node) => {
    if (node.id === targetNodeId && isNativeFormContainerField(node.type)) {
      if (node.type === 'grid') {
        const nextCells = [...(node.gridCells || [])]
        const emptyIndex = nextCells.findIndex(cell => !cell.node)
        if (emptyIndex >= 0) {
          nextCells[emptyIndex] = {
            ...nextCells[emptyIndex],
            node: nextNode,
          }
          return {
            ...node,
            gridCells: nextCells,
          }
        }

        return node
      }

      return {
        ...node,
        children: [...(node.children || []), nextNode],
      }
    }

    if (isNativeFormContainerField(node.type)) {
      return mapContainerChildren(node, child => (
        appendNativeFormNodeToTarget([child], targetNodeId, nextNode)[0]
      ))
    }

    return node
  })
}

const insertNodeIntoList = (
  nodes: NativeFormNode[],
  nextNode: NativeFormNode,
  beforeNodeId?: string | null,
) => {
  if (!beforeNodeId) {
    return [...nodes, nextNode]
  }

  const nextIndex = nodes.findIndex(item => item.id === beforeNodeId)
  if (nextIndex < 0) {
    return [...nodes, nextNode]
  }

  const nextNodes = [...nodes]
  nextNodes.splice(nextIndex, 0, nextNode)
  return nextNodes
}

const setGridCellNode = (
  cells: NativeFormGridCell[],
  targetCellId: string,
  nextNode: NativeFormNode,
) => cells.map(cell => (
  cell.id === targetCellId
    ? {
        ...cell,
        node: nextNode,
      }
    : cell
))

const getContainerSiblings = (
  nodes: NativeFormNode[],
  parentNodeId: string | null,
): NativeFormNode[] => {
  if (!parentNodeId) {
    return nodes
  }

  const parentNode = findNativeFormNodeById(nodes, parentNodeId)
  if (!parentNode) {
    return []
  }

  return getContainerChildNodes(parentNode)
}

export const insertNativeFormNodeAtPlacement = (
  nodes: NativeFormNode[],
  placement: NativeFormNodePlacement,
  nextNode: NativeFormNode,
): NativeFormNode[] => {
  if (!placement.parentNodeId) {
    return insertNodeIntoList(nodes, nextNode, placement.beforeNodeId)
  }

  return nodes.map((node) => {
    if (node.id === placement.parentNodeId && isNativeFormContainerField(node.type)) {
      if (node.type === 'grid' && placement.targetCellId) {
        return {
          ...node,
          gridCells: setGridCellNode(node.gridCells || [], placement.targetCellId, nextNode),
        }
      }

      return {
        ...node,
        children: insertNodeIntoList(node.children || [], nextNode, placement.beforeNodeId),
      }
    }

    if (isNativeFormContainerField(node.type)) {
      return mapContainerChildren(node, child => (
        insertNativeFormNodeAtPlacement([child], placement, nextNode)[0]
      ))
    }

    return node
  })
}

export const extractNativeFormNodeById = (
  nodes: NativeFormNode[],
  nodeId: string,
): { nextNodes: NativeFormNode[]; removedNode: NativeFormNode | null } => {
  let removedNode: NativeFormNode | null = null

  const removeRecursively = (items: NativeFormNode[]): NativeFormNode[] =>
    items.reduce<NativeFormNode[]>((result, item) => {
      if (item.id === nodeId) {
        removedNode = item
        return result
      }

      if (isNativeFormContainerField(item.type)) {
        result.push(mapContainerChildren(item, child => {
          if (child.id === nodeId) {
            removedNode = child
            return null
          }

          return removeRecursively([child])[0] || null
        }))
        return result
      }

      result.push(item)
      return result
    }, [])

  return {
    nextNodes: removeRecursively(nodes),
    removedNode,
  }
}

const getGridCellNodeAtPlacement = (
  nodes: NativeFormNode[],
  placement: NativeFormNodePlacement,
): NativeFormNode | null => {
  if (!placement.parentNodeId || !placement.targetCellId) {
    return null
  }

  const parentNode = findNativeFormNodeById(nodes, placement.parentNodeId)
  if (!parentNode || parentNode.type !== 'grid') {
    return null
  }

  const targetCell = (parentNode.gridCells || []).find(cell => cell.id === placement.targetCellId)
  return targetCell?.node || null
}

export const moveNativeFormNodeToPlacement = (
  nodes: NativeFormNode[],
  nodeId: string,
  placement: NativeFormNodePlacement,
): NativeFormNode[] => {
  const movingNode = findNativeFormNodeById(nodes, nodeId)
  if (!movingNode) {
    return nodes
  }

  if (placement.parentNodeId && nativeFormNodeContains(movingNode, placement.parentNodeId)) {
    return nodes
  }

  const currentPlacement = findNodePlacementById(nodes, nodeId)
  if (
    currentPlacement?.parentNodeId === placement.parentNodeId &&
    currentPlacement?.beforeNodeId === placement.beforeNodeId &&
    currentPlacement?.targetCellId === placement.targetCellId
  ) {
    return nodes
  }

  const targetNode = getGridCellNodeAtPlacement(nodes, placement)
  if (targetNode && targetNode.id !== movingNode.id) {
    if (!currentPlacement) {
      return nodes
    }

    const { nextNodes: extractedNodes, removedNode } = extractNativeFormNodeById(nodes, targetNode.id)
    if (!removedNode) {
      return nodes
    }

    const movedNodes = moveNativeFormNodeToPlacement(extractedNodes, nodeId, placement)
    return insertNativeFormNodeAtPlacement(movedNodes, currentPlacement, removedNode)
  }

  if (!placement.targetCellId && placement.beforeNodeId === nodeId) {
    return nodes
  }

  if (!placement.targetCellId && currentPlacement?.parentNodeId === placement.parentNodeId) {
    const siblings = getContainerSiblings(nodes, placement.parentNodeId)
    const sourceIndex = siblings.findIndex(item => item.id === nodeId)
    const targetIndex = placement.beforeNodeId
      ? siblings.findIndex(item => item.id === placement.beforeNodeId)
      : siblings.length

    if (sourceIndex >= 0 && targetIndex >= 0) {
      const normalizedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex
      if (normalizedTargetIndex === sourceIndex) {
        return nodes
      }
    }
  }

  const { nextNodes, removedNode } = extractNativeFormNodeById(nodes, nodeId)
  if (!removedNode) {
    return nodes
  }

  return insertNativeFormNodeAtPlacement(nextNodes, placement, removedNode)
}

export const findNodePlacementById = (
  nodes: NativeFormNode[],
  nodeId: string,
  currentParentId: string | null = null,
): NativeFormNodePlacement | null => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.id === nodeId) {
      return {
        parentNodeId: currentParentId,
        beforeNodeId: nodes[index + 1]?.id || null,
      }
    }

    if (node.type === 'grid' && Array.isArray(node.gridCells)) {
      for (const cell of node.gridCells) {
        if (cell.node?.id === nodeId) {
          return {
            parentNodeId: node.id,
            targetCellId: cell.id,
          }
        }

        if (cell.node) {
          const nestedInCell = findNodePlacementById([cell.node], nodeId, node.id)
          if (nestedInCell) {
            return nestedInCell
          }
        }
      }
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      const nested = findNodePlacementById(node.children, nodeId, node.id)
      if (nested) {
        return nested
      }
    }
  }

  return null
}
