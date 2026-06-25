import { v4 as uuidv4 } from 'uuid'
import type {
  NativeFormFieldType,
  NativeFormGridCell,
  NativeFormNode,
  NativeFormOptionItem,
} from '@/types'

const DEFAULT_OPTIONS: NativeFormOptionItem[] = [
  { label: '选项一', value: 'option-1' },
  { label: '选项二', value: 'option-2' },
]

const DEFAULT_CHECKABLE_TAG_OPTIONS: NativeFormOptionItem[] = [
  {
    label: '标签一',
    text: '标签一',
    value: 'tag-1',
    showStyle: 'colorBlock',
    color: '#1677ff',
    borderColor: '#1677ff',
  },
  {
    label: '标签二',
    text: '标签二',
    value: 'tag-2',
    showStyle: 'colorBlock',
    color: '#52c41a',
    borderColor: '#52c41a',
  },
]

const DEFAULT_CASCADER_OPTIONS: NativeFormOptionItem[] = [
  {
    label: '一级选项',
    value: 'level-1',
    children: [
      { label: '二级选项 A', value: 'level-1-a' },
      { label: '二级选项 B', value: 'level-1-b' },
    ],
  },
]

const DEFAULT_TREE_SELECT_OPTIONS: NativeFormOptionItem[] = [
  {
    label: '一级节点',
    value: 'node-1',
    children: [
      { label: '二级节点 A', value: 'node-1-1' },
      { label: '二级节点 B', value: 'node-1-2' },
    ],
  },
]

const DEFAULT_SUB_TABLE_COLUMNS = [
  {
    id: uuidv4(),
    label: '名称',
    field: 'name',
    type: 'input' as const,
    required: true,
    defaultValue: '',
    placeholder: '请输入名称',
    width: 180,
  },
  {
    id: uuidv4(),
    label: '数量',
    field: 'amount',
    type: 'inputNumber' as const,
    required: false,
    defaultValue: 0,
    width: 140,
  },
]

const FIELD_LABEL_MAP: Record<NativeFormFieldType, string> = {
  input: '输入框',
  password: '密码框',
  textarea: '文本域',
  inputNumber: '数字输入',
  select: '下拉框',
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

const FIELD_NAME_MAP: Record<NativeFormFieldType, string> = {
  input: 'inputField',
  password: 'passwordField',
  textarea: 'textareaField',
  inputNumber: 'numberField',
  select: 'selectField',
  transfer: 'transferField',
  checkableTag: 'checkableTagField',
  formPlate: 'plateField',
  formVehicleModel: 'vehicleModelField',
  radioGroup: 'radioField',
  checkboxGroup: 'checkboxField',
  datePicker: 'dateField',
  dateRangePicker: 'dateRangeField',
  timePicker: 'timeField',
  timeRangePicker: 'timeRangeField',
  cascader: 'cascaderField',
  upload: 'uploadField',
  switch: 'switchField',
  treeSelect: 'treeSelectField',
  colorPicker: 'colorField',
  slider: 'sliderField',
  rate: 'rateField',
  flex: 'flexField',
  group: 'groupField',
  grid: 'gridField',
  subTable: 'subTableField',
  button: 'buttonField',
}

const FIELD_TYPES_WITHOUT_PLACEHOLDER: NativeFormFieldType[] = [
  'button',
  'switch',
  'checkboxGroup',
  'radioGroup',
  'transfer',
  'checkableTag',
  'slider',
  'rate',
  'flex',
  'group',
  'grid',
  'subTable',
]

const CONTAINER_FIELD_TYPES: NativeFormFieldType[] = ['group', 'grid', 'flex', 'subTable']

const createGridCells = (count: number): NativeFormGridCell[] =>
  Array.from({ length: Math.max(1, count) }, () => ({
    id: uuidv4(),
    node: null,
  }))

const createFieldName = (type: NativeFormFieldType) =>
  `${FIELD_NAME_MAP[type]}_${Date.now().toString(36)}`

const createBaseNode = (type: NativeFormFieldType): NativeFormNode => ({
  id: uuidv4(),
  type,
  label: FIELD_LABEL_MAP[type],
  field: createFieldName(type),
  required: false,
  disabled: false,
  hidden: false,
  placeholder: FIELD_TYPES_WITHOUT_PLACEHOLDER.includes(type)
    ? undefined
    : `请输入${FIELD_LABEL_MAP[type]}`,
  itemProps: {
    showLabel: true,
    asterisk: true,
  },
  componentProps: {},
  styleProps: {},
  rules: [],
  visibilityCondition: undefined,
  disabledCondition: undefined,
  eventConfig: {
    changeRoutes: [],
    clickRoutes: [],
  },
  children: CONTAINER_FIELD_TYPES.includes(type) ? [] : undefined,
})

export const isNativeFormContainerField = (type: NativeFormFieldType) =>
  CONTAINER_FIELD_TYPES.includes(type)

export const createNativeFormFieldNode = (
  type: NativeFormFieldType,
): NativeFormNode => {
  const baseNode = createBaseNode(type)

  switch (type) {
    case 'password':
      return {
        ...baseNode,
        componentProps: {
          allowClear: true,
          visibilityToggle: true,
        },
      }
    case 'textarea':
      return {
        ...baseNode,
        componentProps: {
          rows: 4,
        },
      }
    case 'inputNumber':
      return {
        ...baseNode,
        placeholder: undefined,
        defaultValue: undefined,
        componentProps: {
          min: 0,
          step: 1,
          controls: true,
        },
      }
    case 'select':
    case 'transfer':
    case 'radioGroup':
    case 'checkboxGroup':
      return {
        ...baseNode,
        dataSourceType: 'manual',
        options: DEFAULT_OPTIONS.map(item => ({ ...item })),
        placeholder: type === 'select' ? '请选择' : undefined,
        defaultValue: type === 'transfer' ? [] : baseNode.defaultValue,
        componentProps: type === 'transfer'
          ? {
            showSearch: true,
            oneWay: false,
            titles: ['待选列表', '已选列表'],
            operations: ['添加', '移除'],
          }
          : type === 'radioGroup' || type === 'checkboxGroup'
          ? {
            direction: 'horizontal',
          }
          : baseNode.componentProps,
      }
    case 'checkableTag':
      return {
        ...baseNode,
        placeholder: undefined,
        defaultValue: [],
        dataSourceType: 'manual',
        options: DEFAULT_CHECKABLE_TAG_OPTIONS.map(item => ({ ...item })),
        componentProps: {
          allowClear: false,
          showAsRadio: false,
        },
      }
    case 'formPlate':
      return {
        ...baseNode,
        defaultValue: {
          plateTypeId: -1,
          plateNumber: '',
          noplate: '',
        },
        componentProps: {
          isShowColor: true,
          isShowNoPlate: false,
          isShowNoLimit: true,
          allowClear: true,
          accurate: false,
          province: '京',
        },
      }
    case 'formVehicleModel':
      return {
        ...baseNode,
        placeholder: '请选择品牌/车型/年款',
        defaultValue: {
          brandValue: undefined,
          modelValue: [],
          yearValue: [],
        },
        componentProps: {
          mode: 'single',
          allowClear: true,
          bordered: true,
          separator: '/',
          maxHeight: 540,
          searchPlaceholder: '搜索',
          hotBrands: [],
        },
      }
    case 'cascader':
      return {
        ...baseNode,
        dataSourceType: 'manual',
        options: DEFAULT_CASCADER_OPTIONS.map(item => ({ ...item })),
        placeholder: '请选择级联选项',
        componentProps: {
          allowClear: true,
          showSearch: false,
          multiple: false,
          changeOnSelect: false,
        },
      }
    case 'treeSelect':
      return {
        ...baseNode,
        dataSourceType: 'manual',
        options: DEFAULT_TREE_SELECT_OPTIONS.map(item => ({ ...item })),
        placeholder: '请选择树节点',
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          showSearch: true,
          multiple: false,
          treeCheckable: false,
          treeDefaultExpandAll: true,
          showCheckedStrategy: 'SHOW_CHILD',
        },
      }
    case 'datePicker':
      return {
        ...baseNode,
        placeholder: '请选择日期',
        componentProps: {
          picker: 'date',
          showTime: false,
        },
      }
    case 'dateRangePicker':
      return {
        ...baseNode,
        placeholder: undefined,
        defaultValue: [],
        componentProps: {
          placeholder: ['开始日期', '结束日期'],
          picker: 'date',
          showTime: false,
          separator: '~',
        },
      }
    case 'timePicker':
      return {
        ...baseNode,
        placeholder: '请选择时间',
      }
    case 'timeRangePicker':
      return {
        ...baseNode,
        placeholder: undefined,
        defaultValue: [],
        componentProps: {
          placeholder: ['开始时间', '结束时间'],
          format: 'HH:mm:ss',
          separator: '~',
        },
      }
    case 'upload':
      return {
        ...baseNode,
        placeholder: undefined,
        uploadConfig: {
          action: '',
          accept: '',
          multiple: false,
          listType: 'text',
          buttonType: 'button',
          valueMode: 'url',
          responseUrlField: 'url',
          maxSizeMb: undefined,
          draggable: false,
        },
        componentProps: {
          buttonText: '点击上传',
        },
      }
    case 'switch':
      return {
        ...baseNode,
        defaultValue: false,
      }
    case 'colorPicker':
      return {
        ...baseNode,
        placeholder: undefined,
        defaultValue: '#1677ff',
        componentProps: {
          showText: true,
          format: 'hex',
        },
      }
    case 'slider':
      return {
        ...baseNode,
        placeholder: undefined,
        defaultValue: 0,
        componentProps: {
          min: 0,
          max: 100,
          step: 1,
          dots: false,
          reverse: false,
          included: true,
          tooltipOpen: false,
        },
      }
    case 'rate':
      return {
        ...baseNode,
        placeholder: undefined,
        defaultValue: 0,
        componentProps: {
          count: 5,
          allowHalf: false,
        },
      }
    case 'group':
      return {
        ...baseNode,
        field: undefined,
        placeholder: undefined,
        componentProps: {
          titleVisible: true,
          description: '用于承载一组关联字段',
          padding: 16,
          backgroundColor: '',
          borderColor: '',
          borderStyle: 'solid',
          borderRadius: 12,
        },
      }
    case 'flex':
      return {
        ...baseNode,
        field: undefined,
        placeholder: undefined,
        componentProps: {
          titleVisible: true,
          description: '用于按弹性方式组合字段',
          padding: 16,
          backgroundColor: '',
          borderColor: '',
          borderStyle: 'solid',
          borderRadius: 12,
          direction: 'row',
          gap: 16,
          wrap: true,
          justify: 'flex-start',
          align: 'stretch',
        },
      }
    case 'grid':
      return {
        ...baseNode,
        field: undefined,
        placeholder: undefined,
        columns: 2,
        children: undefined,
        gridCells: createGridCells(2),
        componentProps: {
          titleVisible: true,
          description: '按列组织字段布局',
          padding: 16,
          backgroundColor: '',
          borderColor: '',
          borderStyle: 'solid',
          borderRadius: 12,
          columnGap: 16,
          rowGap: 16,
        },
      }
    case 'subTable':
      return {
        ...baseNode,
        placeholder: undefined,
        defaultValue: [],
        tableColumns: DEFAULT_SUB_TABLE_COLUMNS.map(item => ({ ...item })),
        componentProps: {
          titleVisible: true,
          description: '用于录入多行结构化数据',
        },
      }
    case 'button':
      return {
        ...baseNode,
        field: undefined,
        label: '按钮',
        placeholder: undefined,
        componentProps: {
          text: '提交',
          buttonType: 'primary',
          buttonAlign: 'center',
          actionType: 'submit',
        },
      }
    default:
      return baseNode
  }
}
