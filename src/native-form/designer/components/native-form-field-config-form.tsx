import React, { useMemo } from 'react'
import {
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
import type { FormInstance } from 'antd'
import type { NamePath } from 'antd/es/form/interface'
import type {
  NativeFormFieldCondition,
  NativeFormNode,
  NativeFormWidgetConfig,
} from '@/types'
import EventRouteConfig from '@/components/EventRouteConfig'
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs'
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton'
import IconPicker from '@/components/IconPicker'
import NativeFormLabeledItem from '@/native-form/designer/components/native-form-labeled-item'
import { getNativeFormFieldManifest } from '@/native-form/manifests'
import { normalizeNativeFormConfig } from '@/native-form/shared/defaults'
import { collectNativeFormFieldCandidates } from '@/native-form/shared/field-helpers'
import { useStore } from '@/store/useStore'
import { keyValueListToObject } from '@/utils/widgetApi'

interface NativeFormFieldConfigFormProps {
  form: FormInstance
  field: NativeFormNode
  currentWidgetId?: string
  hideItemColon?: boolean
  onValuesChange: (changedValues: Record<string, any>) => void
}

interface NativeFormConditionEditorProps {
  fieldId: string
  title: string
  matchModeName: 'visibilityMatchMode' | 'disabledMatchMode'
  conditionsName: 'visibilityConditions' | 'disabledConditions'
  fieldOptions: Array<{ label: string; value: string }>
}

interface NativeFormTreeOptionEditorProps {
  name: NamePath
  itemPrefix: string
  level?: number
}

const REMOTE_OPTION_FIELD_TYPES = [
  'select',
  'transfer',
  'checkableTag',
  'radioGroup',
  'checkboxGroup',
  'cascader',
  'treeSelect',
]

const SUB_TABLE_COLUMN_TYPE_OPTIONS = [
  { label: '输入框', value: 'input' },
  { label: '数字输入', value: 'inputNumber' },
  { label: '下拉框', value: 'select' },
  { label: '单选组', value: 'radioGroup' },
  { label: '复选组', value: 'checkboxGroup' },
  { label: '日期', value: 'datePicker' },
  { label: '时间', value: 'timePicker' },
  { label: '级联', value: 'cascader' },
  { label: '树选择', value: 'treeSelect' },
  { label: '上传', value: 'upload' },
  { label: '开关', value: 'switch' },
]

const CONDITION_OPERATOR_OPTIONS = [
  { label: '等于', value: 'equals' },
  { label: '不等于', value: 'notEquals' },
  { label: '包含', value: 'includes' },
  { label: '非空', value: 'notEmpty' },
  { label: '为空', value: 'empty' },
]

const BUTTON_TYPE_OPTIONS = [
  { label: '主按钮', value: 'primary' },
  { label: '默认按钮', value: 'default' },
  { label: '虚线按钮', value: 'dashed' },
]

const ALIGN_OPTIONS = [
  { label: '左对齐', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右对齐', value: 'right' },
]

const FLEX_JUSTIFY_OPTIONS = [
  { label: '起点', value: 'flex-start' },
  { label: '终点', value: 'flex-end' },
  { label: '居中', value: 'center' },
  { label: '两端分布', value: 'space-between' },
  { label: '环绕分布', value: 'space-around' },
  { label: '均匀分布', value: 'space-evenly' },
]

const FLEX_ALIGN_OPTIONS = [
  { label: '起点对齐', value: 'flex-start' },
  { label: '终点对齐', value: 'flex-end' },
  { label: '居中对齐', value: 'center' },
  { label: '拉伸', value: 'stretch' },
  { label: '基线对齐', value: 'baseline' },
]

const LABEL_ALIGN_OPTIONS = [
  { label: '左对齐', value: 'left' },
  { label: '右对齐', value: 'right' },
]

const DIRECTION_OPTIONS = [
  { label: '横向', value: 'horizontal' },
  { label: '纵向', value: 'vertical' },
]

const BORDER_STYLE_OPTIONS = [
  { label: '实线', value: 'solid' },
  { label: '虚线', value: 'dashed' },
  { label: '无边框', value: 'none' },
]

const DATE_PICKER_OPTIONS = [
  { label: '日期', value: 'date' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]

const COLOR_FORMAT_OPTIONS = [
  { label: 'HEX', value: 'hex' },
  { label: 'RGB', value: 'rgb' },
  { label: 'HSB', value: 'hsb' },
  { label: 'HSL', value: 'hsl' },
]

const TREE_SHOW_CHECKED_STRATEGY_OPTIONS = [
  { label: '显示全部节点', value: 'SHOW_ALL' },
  { label: '仅显示父节点', value: 'SHOW_PARENT' },
  { label: '仅显示子节点', value: 'SHOW_CHILD' },
]

const UPLOAD_LIST_TYPE_OPTIONS = [
  { label: '文本', value: 'text' },
  { label: '图片', value: 'picture' },
]

const UPLOAD_BUTTON_TYPE_OPTIONS = [
  { label: '普通按钮', value: 'button' },
  { label: '图片卡片', value: 'picture-card' },
  { label: '圆形图片', value: 'picture-circle' },
]

const UPLOAD_VALUE_MODE_OPTIONS = [
  { label: 'URL', value: 'url' },
  { label: '完整对象', value: 'object' },
]

const REQUEST_METHOD_OPTIONS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
]

const TAG_SHOW_STYLE_OPTIONS = [
  { label: '文本', value: '' },
  { label: '色块', value: 'colorBlock' },
  { label: '图标', value: 'icon' },
]

const createEmptyCondition = (): NativeFormFieldCondition => ({
  sourceField: '',
  operator: 'equals',
  value: '',
})

const createEmptyOption = () => ({
  label: '',
  value: '',
  text: '',
  disabled: false,
})

const createEmptyTreeOption = () => ({
  label: '',
  value: '',
  children: [],
})

const createEmptySubTableColumn = () => ({
  label: '',
  field: '',
  type: 'input',
  required: false,
  defaultValue: '',
  placeholder: '',
  readOnly: false,
  disabled: false,
  width: undefined,
})

const renderGrid = (...items: Array<React.ReactNode | null | false | undefined>) => {
  const visibleItems = items.filter(item => item !== null && item !== false && item !== undefined)
  if (!visibleItems.length) {
    return null
  }

  return (
    <div className="native-form-config-panel__grid">
      {React.Children.toArray(visibleItems)}
    </div>
  )
}

const renderColorPicker = () => <ColorPicker showText allowClear />

const NativeFormConditionEditor: React.FC<NativeFormConditionEditorProps> = ({
  fieldId,
  title,
  matchModeName,
  conditionsName,
  fieldOptions,
}) => {
  const conditionType = conditionsName === 'visibilityConditions' ? 'visibility' : 'disabled'

  return (
    <div className="native-form-config-panel__condition-block">
      <Typography.Text strong>{title}</Typography.Text>

      <div className="native-form-config-panel__field-block">
        <Typography.Text>匹配方式</Typography.Text>
        <Form.Item name={matchModeName} initialValue="all" noStyle>
          <Radio.Group
            name={`${fieldId}-${conditionType}-match-mode`}
            aria-label={`${title}匹配方式`}
          >
            <Radio.Button value="all">全部满足</Radio.Button>
            <Radio.Button value="any">任意满足</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </div>

      <Form.List name={conditionsName}>
        {(fields, { add, remove }) => (
          <div className="native-form-config-panel__condition-list">
            <div className="native-form-config-panel__condition-actions">
              <Button type="link" size="small" onClick={() => add(createEmptyCondition())}>
                新增{title}
              </Button>
            </div>

            {fields.map((fieldItem) => (
              <div key={fieldItem.key} className="native-form-config-panel__condition-item">
                <div className="native-form-config-panel__grid">
                  <NativeFormLabeledItem
                    name={[fieldItem.name, 'sourceField']}
                    labelText="来源字段"
                  >
                    <Select
                      allowClear
                      options={fieldOptions}
                      placeholder="请选择来源字段"
                      aria-label={`${title}来源字段`}
                    />
                  </NativeFormLabeledItem>

                  <NativeFormLabeledItem
                    name={[fieldItem.name, 'operator']}
                    labelText="比较方式"
                  >
                    <Select
                      allowClear
                      options={CONDITION_OPERATOR_OPTIONS}
                      placeholder="请选择比较方式"
                      aria-label={`${title}比较方式`}
                    />
                  </NativeFormLabeledItem>
                </div>

                <Form.Item
                  noStyle
                  shouldUpdate={(prev, curr) => {
                    const prevOperator = prev?.[conditionsName]?.[fieldItem.name]?.operator
                    const currOperator = curr?.[conditionsName]?.[fieldItem.name]?.operator
                    return prevOperator !== currOperator
                  }}
                >
                  {({ getFieldValue }) => {
                    const operator = getFieldValue([conditionsName, fieldItem.name, 'operator'])

                    if (operator === 'notEmpty' || operator === 'empty') {
                      return null
                    }

                    return (
                      <NativeFormLabeledItem
                        name={[fieldItem.name, 'value']}
                        labelText="比较值"
                      >
                        <Input
                          name={`${fieldId}-${conditionType}-${fieldItem.name}-value`}
                          placeholder="请输入比较值"
                          aria-label={`${title}比较值`}
                        />
                      </NativeFormLabeledItem>
                    )
                  }}
                </Form.Item>

                <Button type="text" danger onClick={() => remove(fieldItem.name)}>
                  删除条件
                </Button>
              </div>
            ))}
          </div>
        )}
      </Form.List>
    </div>
  )
}

const NativeFormTreeOptionEditor: React.FC<NativeFormTreeOptionEditorProps> = ({
  name,
  itemPrefix,
  level = 0,
}) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <div className="native-form-config-panel__option-list">
        <div className="native-form-config-panel__option-header">
          <Typography.Text strong>
            {level === 0 ? `${itemPrefix}树形选项` : '子节点'}
          </Typography.Text>
          <Button type="link" size="small" onClick={() => add(createEmptyTreeOption())}>
            {level === 0 ? '新增节点' : '新增子节点'}
          </Button>
        </div>

        {fields.map((optionField) => (
          <div key={optionField.key} className="native-form-config-panel__condition-item">
            <div className="native-form-config-panel__option-row">
              <Form.Item
                name={[optionField.name, 'label']}
                className="native-form-config-panel__option-item"
              >
                <Input
                  placeholder={level === 0 ? '节点标题' : '子节点标题'}
                  aria-label={`${itemPrefix}${optionField.name + 1}标题`}
                />
              </Form.Item>

              <Form.Item
                name={[optionField.name, 'value']}
                className="native-form-config-panel__option-item"
              >
                <Input
                  placeholder={level === 0 ? '节点值' : '子节点值'}
                  aria-label={`${itemPrefix}${optionField.name + 1}值`}
                />
              </Form.Item>

              <Button type="text" danger onClick={() => remove(optionField.name)}>
                删除
              </Button>
            </div>

            <NativeFormTreeOptionEditor
              name={[optionField.name, 'children']}
              itemPrefix={itemPrefix}
              level={level + 1}
            />
          </div>
        ))}
      </div>
    )}
  </Form.List>
)

const renderOptionList = (
  name: NamePath,
  itemPrefix: string,
  options?: {
    withText?: boolean
    withDisabled?: boolean
  },
) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <div className="native-form-config-panel__option-list">
        <div className="native-form-config-panel__option-header">
          <Typography.Text strong>{itemPrefix}选项配置</Typography.Text>
          <Button type="link" size="small" onClick={() => add(createEmptyOption())}>
            新增选项
          </Button>
        </div>

        {fields.map((optionField) => (
          <div key={optionField.key} className="native-form-config-panel__condition-item">
            <div className="native-form-config-panel__option-row">
              <Form.Item
                name={[optionField.name, 'label']}
                className="native-form-config-panel__option-item"
              >
                <Input placeholder="标签" aria-label={`${itemPrefix}${optionField.name + 1}标签`} />
              </Form.Item>

              <Form.Item
                name={[optionField.name, 'value']}
                className="native-form-config-panel__option-item"
              >
                <Input placeholder="值" aria-label={`${itemPrefix}${optionField.name + 1}值`} />
              </Form.Item>

              <Button type="text" danger onClick={() => remove(optionField.name)}>
                删除
              </Button>
            </div>

            {options?.withText || options?.withDisabled
              ? renderGrid(
                options.withText ? (
                  <NativeFormLabeledItem
                    name={[optionField.name, 'text']}
                    labelText="描述文本"
                  >
                    <Input placeholder="展示描述" />
                  </NativeFormLabeledItem>
                ) : null,
                options.withDisabled ? (
                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>禁用该选项</Typography.Text>
                    <Form.Item name={[optionField.name, 'disabled']} valuePropName="checked">
                      <Switch aria-label={`${itemPrefix}${optionField.name + 1}禁用`} />
                    </Form.Item>
                  </div>
                ) : null,
              )
              : null}
          </div>
        ))}
      </div>
    )}
  </Form.List>
)

const renderTreeOptionList = (name: NamePath, itemPrefix: string) => (
  <NativeFormTreeOptionEditor name={name} itemPrefix={itemPrefix} />
)

const renderCheckableTagOptionList = (name: NamePath, itemPrefix: string) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <div className="native-form-config-panel__option-list">
        <div className="native-form-config-panel__option-header">
          <Typography.Text strong>{itemPrefix}标签选项</Typography.Text>
          <Button
            type="link"
            size="small"
            onClick={() =>
              add({
                label: '',
                value: '',
                text: '',
                showStyle: '',
                color: undefined,
                borderColor: undefined,
                icon: '',
                cancelOther: false,
              })
            }
          >
            新增标签
          </Button>
        </div>

        {fields.map((optionField) => (
          <Collapse
            key={optionField.key}
            bordered={false}
            className="native-form-config-panel__option-collapse"
            defaultActiveKey={[String(optionField.key)]}
            items={[
              {
                key: String(optionField.key),
                label: `${itemPrefix}标签选项 ${optionField.name + 1}`,
                extra: (
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation()
                      remove(optionField.name)
                    }}
                  >
                    删除
                  </Button>
                ),
                children: (
                  <div className="native-form-config-panel__option-card">
                    {renderGrid(
                      <NativeFormLabeledItem
                        name={[optionField.name, 'label']}
                        labelText="选项标签"
                      >
                        <Input placeholder="请输入选项标签" />
                      </NativeFormLabeledItem>,
                      <NativeFormLabeledItem
                        name={[optionField.name, 'value']}
                        labelText="选项值"
                      >
                        <Input placeholder="请输入提交值" />
                      </NativeFormLabeledItem>,
                    )}

                    {renderGrid(
                      <NativeFormLabeledItem
                        name={[optionField.name, 'text']}
                        labelText="辅助说明"
                      >
                        <Input placeholder="请输入辅助说明" />
                      </NativeFormLabeledItem>,
                      <NativeFormLabeledItem
                        name={[optionField.name, 'showStyle']}
                        labelText="展示样式"
                      >
                        <Select options={TAG_SHOW_STYLE_OPTIONS} placeholder="请选择展示样式" allowClear />
                      </NativeFormLabeledItem>,
                    )}

                    {renderGrid(
                      <NativeFormLabeledItem name={[optionField.name, 'color']} labelText="前景/填充色">
                        {renderColorPicker()}
                      </NativeFormLabeledItem>,
                      <NativeFormLabeledItem
                        name={[optionField.name, 'borderColor']}
                        labelText="边框色"
                      >
                        {renderColorPicker()}
                      </NativeFormLabeledItem>,
                    )}

                    {renderGrid(
                      <NativeFormLabeledItem
                        name={[optionField.name, 'icon']}
                        labelText="标签图标"
                      >
                        <IconPicker mode="simple" placeholder="选择图标" />
                      </NativeFormLabeledItem>,
                    )}

                    {renderGrid(
                      <div className="native-form-config-panel__field-block">
                        <Typography.Text>选中后清空其他</Typography.Text>
                        <Form.Item name={[optionField.name, 'cancelOther']} valuePropName="checked">
                          <Switch aria-label={`${itemPrefix}${optionField.name + 1}清空其他`} />
                        </Form.Item>
                      </div>,
                    )}
                  </div>
                ),
              },
            ]}
          />
        ))}
      </div>
    )}
  </Form.List>
)

const NativeFormFieldConfigForm: React.FC<NativeFormFieldConfigFormProps> = ({
  form,
  field,
  currentWidgetId,
  hideItemColon = false,
  onValuesChange,
}) => {
  const widgets = useStore(state => state.widgets)
  const currentWidget = useMemo(
    () => widgets.find(item => item.id === currentWidgetId),
    [currentWidgetId, widgets],
  )

  const formFieldOptions = useMemo(() => {
    if (!currentWidget || currentWidget.type !== 'nativeForm') {
      return []
    }

    const config = normalizeNativeFormConfig(currentWidget.config as NativeFormWidgetConfig)
    return collectNativeFormFieldCandidates(config.formSchema.children, field.id)
  }, [currentWidget, field.id])

  const manifest = useMemo(() => getNativeFormFieldManifest(field.type), [field.type])
  const manifestGroups = manifest?.groups || []
  const manifestSupports = manifest?.supports || {}
  const manifestTraits = manifest?.traits || {}
  const hasGroup = (group: string) => manifestGroups.includes(group as any)

  const isButton = field.type === 'button'
  const isUpload = field.type === 'upload'
  const isSubTable = Boolean(manifestSupports.subTableColumns)
  const isTextInput = Boolean(manifestTraits.textInput)
  const canShowValidationRules = field.type === 'input' || field.type === 'textarea'
  const isNumericInput = Boolean(manifestTraits.numericInput)
  const isSelect = Boolean(manifestTraits.select)
  const isSelectLike = Boolean(manifestTraits.selectLike)
  const isTransferLike = Boolean(manifestTraits.transferLike)
  const isTagLike = Boolean(manifestTraits.tagLike)
  const isPlateLike = Boolean(manifestTraits.plateLike)
  const isVehicleModelLike = Boolean(manifestTraits.vehicleModelLike)
  const isTreeSelect = Boolean(manifestTraits.treeSelect)
  const isChoiceGroup = Boolean(manifestTraits.choiceGroup)
  const isDateLike = Boolean(manifestTraits.dateLike)
  const isRangeValue = Boolean(manifestTraits.rangeValue)
  const isSwitch = Boolean(manifestTraits.switch)
  const isColorLike = Boolean(manifestTraits.colorLike)
  const isSliderLike = Boolean(manifestTraits.sliderLike)
  const isRateLike = Boolean(manifestTraits.rateLike)
  const isFlexContainer = field.type === 'flex'
  const supportsOptions = Boolean(manifestSupports.options || manifestSupports.treeOptions)
  const dataSourceType = Form.useWatch('dataSourceType', form) || 'manual'
  const subTableColumns = Form.useWatch('subTableColumns', form) || []
  const flexDirection = Form.useWatch('componentDirection', form) || 'row'

  const renderLabeledItem = (
    name: NamePath,
    labelText: string,
    child: React.ReactNode,
    options?: {
      rules?: Array<Record<string, any>>
      className?: string
      hint?: React.ReactNode
    },
  ) => (
    <NativeFormLabeledItem
      name={name}
      labelText={labelText}
      rules={options?.rules}
      className={options?.className}
      hint={options?.hint}
    >
      {child}
    </NativeFormLabeledItem>
  )

  const renderTransferConfig = () => (
    <>
      <div className="native-form-config-panel__field-block">
        <Typography.Text>单向模式</Typography.Text>
        <Form.Item name="componentTransferOneWay" valuePropName="checked">
          <Switch aria-label="单向模式" />
        </Form.Item>
      </div>

      {renderLabeledItem(
        'componentSearchPlaceholder',
        '搜索占位文案',
        <Input placeholder="请输入搜索关键字" />,
      )}

      {renderLabeledItem(
        'componentTransferTitles',
        '列表标题',
        <Input placeholder='JSON 数组，如 ["待选","已选"]' />,
      )}

      {renderLabeledItem(
        'componentTransferOperations',
        '操作文案',
        <Input placeholder='JSON 数组，如 ["添加","移除"]' />,
      )}
    </>
  )

  const renderCascaderConfig = (prefix?: NamePath) => {
    const name = (key: string) => (prefix ? [prefix as any, key] : key)

    return (
      <>
        <div className="native-form-config-panel__field-block">
          <Typography.Text>支持搜索</Typography.Text>
          <Form.Item name={name('componentShowSearch')} valuePropName="checked">
            <Switch aria-label="支持搜索" />
          </Form.Item>
        </div>

        <div className="native-form-config-panel__grid">
          <div className="native-form-config-panel__field-block">
            <Typography.Text>多选模式</Typography.Text>
            <Form.Item name={name('componentMultiple')} valuePropName="checked">
              <Switch aria-label="多选模式" />
            </Form.Item>
          </div>

          <div className="native-form-config-panel__field-block">
            <Typography.Text>任意层级可选</Typography.Text>
            <Form.Item name={name('componentChangeOnSelect')} valuePropName="checked">
              <Switch aria-label="任意层级可选" />
            </Form.Item>
          </div>
        </div>
      </>
    )
  }

  const renderTreeSelectConfig = (prefix?: NamePath) => {
    const name = (key: string) => (prefix ? [prefix as any, key] : key)

    return (
      <>
        <div className="native-form-config-panel__field-block">
          <Typography.Text>支持搜索</Typography.Text>
          <Form.Item name={name('componentShowSearch')} valuePropName="checked">
            <Switch aria-label="支持搜索" />
          </Form.Item>
        </div>

        <div className="native-form-config-panel__grid">
          <div className="native-form-config-panel__field-block">
            <Typography.Text>多选</Typography.Text>
            <Form.Item name={name('componentMultiple')} valuePropName="checked">
              <Switch aria-label="多选" />
            </Form.Item>
          </div>

          <div className="native-form-config-panel__field-block">
            <Typography.Text>复选树</Typography.Text>
            <Form.Item name={name('componentTreeCheckable')} valuePropName="checked">
              <Switch aria-label="复选树" />
            </Form.Item>
          </div>
        </div>

        <div className="native-form-config-panel__grid">
          <div className="native-form-config-panel__field-block">
            <Typography.Text>默认展开全部</Typography.Text>
            <Form.Item name={name('componentTreeDefaultExpandAll')} valuePropName="checked">
              <Switch aria-label="默认展开全部" />
            </Form.Item>
          </div>

          {renderLabeledItem(
            name('componentShowCheckedStrategy'),
            '勾选展示策略',
            <Select options={TREE_SHOW_CHECKED_STRATEGY_OPTIONS} />,
          )}
        </div>
      </>
    )
  }

  const renderUploadConfig = (prefix?: NamePath) => {
    const name = (key: string) => (prefix ? [prefix as any, key] : key)

    return (
      <>
        {renderLabeledItem(name('uploadButtonText'), '上传按钮文案', <Input placeholder="点击上传" />)}
        {renderLabeledItem(name('uploadAction'), '上传地址', <Input placeholder="/api/upload" />)}

        <div className="native-form-config-panel__grid">
          {renderLabeledItem(name('uploadAccept'), '允许格式', <Input placeholder=".jpg,.png,.pdf" />)}
          <div />
        </div>

        <div className="native-form-config-panel__grid">
          <div className="native-form-config-panel__field-block">
            <Typography.Text>允许多选</Typography.Text>
            <Form.Item name={name('uploadMultiple')} valuePropName="checked">
              <Switch aria-label="允许多选" />
            </Form.Item>
          </div>

          <div className="native-form-config-panel__field-block">
            <Typography.Text>拖拽上传</Typography.Text>
            <Form.Item name={name('uploadDraggable')} valuePropName="checked">
              <Switch aria-label="拖拽上传" />
            </Form.Item>
          </div>
        </div>

        <div className="native-form-config-panel__grid">
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => (
              getFieldValue(name('uploadDraggable'))
                ? <div />
                : renderLabeledItem(name('uploadButtonType'), '按钮样式', <Select options={UPLOAD_BUTTON_TYPE_OPTIONS} />)
            )}
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => (
              getFieldValue(name('uploadDraggable'))
                ? <div />
                : renderLabeledItem(name('uploadListType'), '列表样式', <Select options={UPLOAD_LIST_TYPE_OPTIONS} />)
            )}
          </Form.Item>
        </div>

        <div className="native-form-config-panel__grid">
          {renderLabeledItem(name('uploadValueMode'), '提交值格式', <Select options={UPLOAD_VALUE_MODE_OPTIONS} />)}
          {renderLabeledItem(
            name('uploadMaxSizeMb'),
            '单文件大小限制(MB)',
            <InputNumber min={1} max={1024} style={{ width: '100%' }} />,
          )}
        </div>

        {renderLabeledItem(
          name('uploadResponseUrlField'),
          '图片路径字段',
          <Input placeholder="url 或 data.url" />,
        )}


      </>
    )
  }

  const collapseItemOrder = [
    'basic',
    'item',
    'component',
    'options',
    'sub-table',
    'validation',
    'linkage',
    'style',
    'events',
  ]

  const collapseItems = [
    hasGroup('basic')
      ? {
        key: 'basic',
        label: '基础属性',
        children: (
          <>
            {renderGrid(
              renderLabeledItem(
                'fieldLabel',
                '字段标题',
                <Input placeholder="请输入字段标题" />,
                {
                  rules: [{ required: true, whitespace: true, message: '请输入字段标题' }],
                },
              ),
              manifestSupports.fieldName
                ? renderLabeledItem(
                  'fieldName',
                  '字段名',
                  <Input placeholder="field_name" />,
                  {
                    rules: [{ required: true, whitespace: true, message: '请输入字段名' }],
                  },
                )
                : null,
            )}

            {renderGrid(
              manifestSupports.placeholder
                ? renderLabeledItem(
                  'fieldPlaceholder',
                  '占位提示',
                  <Input placeholder="请输入占位提示" />,
                )
                : null,
              manifestSupports.defaultValue
                ? renderLabeledItem(
                  'fieldDefaultValue',
                  '默认值',
                  <Input placeholder="数组或对象请使用 JSON" />,
                )
                : null,
            )}

            {renderGrid(
              manifestSupports.required ? (
                <div className="native-form-config-panel__field-block">
                  <Typography.Text>是否必填</Typography.Text>
                  <Form.Item name="fieldRequired" valuePropName="checked">
                    <Switch aria-label="是否必填" />
                  </Form.Item>
                </div>
              ) : null,
              <div className="native-form-config-panel__field-block">
                <Typography.Text>显示字段标题</Typography.Text>
                <Form.Item name="itemShowLabel" valuePropName="checked">
                  <Switch aria-label="显示字段标题" />
                </Form.Item>
              </div>,
              <div className="native-form-config-panel__field-block">
                <Typography.Text>默认禁用</Typography.Text>
                <Form.Item name="fieldDisabled" valuePropName="checked">
                  <Switch aria-label="默认禁用" />
                </Form.Item>
              </div>,
              <div className="native-form-config-panel__field-block">
                <Typography.Text>默认隐藏</Typography.Text>
                <Form.Item name="fieldHidden" valuePropName="checked">
                  <Switch aria-label="默认隐藏" />
                </Form.Item>
              </div>,
            )}


          </>
        ),
      }
      : null,
    hasGroup('item')
      ? {
        key: 'item',
        label: '字段项',
        children: (
          <>
            {!hideItemColon ? renderGrid(
              <div className="native-form-config-panel__field-block">
                <Typography.Text>显示冒号</Typography.Text>
                <Form.Item name="itemColon" valuePropName="checked">
                  <Switch aria-label="显示冒号" />
                </Form.Item>
              </div>,
            ) : null}

            {renderGrid(
              renderLabeledItem(
                'itemLabelAlign',
                '标题对齐（针对横向布局）',
                <Select options={LABEL_ALIGN_OPTIONS} allowClear />,
              ),
            )}

            {renderGrid(
              renderLabeledItem(
                'itemLabelWidth',
                '标题宽度',
                <InputNumber min={40} max={320} style={{ width: '100%' }} />,
              ),
            )}

            {renderLabeledItem(
              'itemTooltip',
              '提示文案',
              <Input placeholder="鼠标移入时展示的提示" />,
            )}
          </>
        ),
      }
      : null,
    hasGroup('component')
      ? {
        key: 'component',
        label: '组件属性',
        children: (
          <>
            {isTextInput ? renderGrid(
              <div className="native-form-config-panel__field-block">
                <Typography.Text>允许清空</Typography.Text>
                <Form.Item name="componentAllowClear" valuePropName="checked">
                  <Switch aria-label="允许清空" />
                </Form.Item>
              </div>,
              <div className="native-form-config-panel__field-block">
                <Typography.Text>只读</Typography.Text>
                <Form.Item name="componentReadOnly" valuePropName="checked">
                  <Switch aria-label="只读" />
                </Form.Item>
              </div>,
              <div className="native-form-config-panel__field-block">
                <Typography.Text>显示字数统计</Typography.Text>
                <Form.Item name="componentShowCount" valuePropName="checked">
                  <Switch aria-label="显示字数统计" />
                </Form.Item>
              </div>,
              field.type === 'password' ? (
                <div className="native-form-config-panel__field-block">
                  <Typography.Text>显示密码显隐按钮</Typography.Text>
                  <Form.Item name="componentVisibilityToggle" valuePropName="checked">
                    <Switch aria-label="显示密码显隐按钮" />
                  </Form.Item>
                </div>
              ) : null,
            ) : null}

            {isNumericInput ? (
              <div className="native-form-config-panel__field-block">
                <Typography.Text>只读</Typography.Text>
                <Form.Item name="componentReadOnly" valuePropName="checked">
                  <Switch aria-label="只读" />
                </Form.Item>
              </div>
            ) : null}

            {isTextInput ? (
              <>
                {field.type === 'textarea' ? (
                  <div className="native-form-config-panel__grid">
                    {renderLabeledItem(
                      'componentRows',
                      '默认行数',
                      <InputNumber min={2} max={20} style={{ width: '100%' }} />,
                    )}

                    <div className="native-form-config-panel__field-block">
                      <Typography.Text>自动高度</Typography.Text>
                      <Form.Item name="componentAutoSize" valuePropName="checked">
                        <Switch aria-label="自动高度" />
                      </Form.Item>
                    </div>
                  </div>
                ) : null}

                {field.type === 'input' ? (
                  <div className="native-form-config-panel__grid">
                    {renderLabeledItem('componentPrefix', '前缀', <Input placeholder="前缀内容" />)}
                    {renderLabeledItem('componentSuffix', '后缀', <Input placeholder="后缀内容" />)}
                  </div>
                ) : null}
              </>
            ) : null}

            {isNumericInput ? (
              <>
                <div className="native-form-config-panel__grid">
                  {renderLabeledItem('componentMin', '最小值', <InputNumber style={{ width: '100%' }} />)}
                  {renderLabeledItem('componentMax', '最大值', <InputNumber style={{ width: '100%' }} />)}
                </div>

                <div className="native-form-config-panel__grid">
                  {renderLabeledItem(
                    'componentStep',
                    '步长',
                    <InputNumber min={0} style={{ width: '100%' }} />,
                  )}

                  {field.type === 'inputNumber'
                    ? renderLabeledItem(
                      'componentPrecision',
                      '精度',
                      <InputNumber min={0} max={10} style={{ width: '100%' }} />,
                    )
                    : <div />}
                </div>

                {field.type === 'inputNumber' ? (
                  <div className="native-form-config-panel__grid">
                    <div className="native-form-config-panel__field-block">
                      <Typography.Text>显示增减按钮</Typography.Text>
                      <Form.Item name="componentControls" valuePropName="checked">
                        <Switch aria-label="显示增减按钮" />
                      </Form.Item>
                    </div>

                    <div className="native-form-config-panel__field-block">
                      <Typography.Text>字符串模式</Typography.Text>
                      <Form.Item name="componentStringMode" valuePropName="checked">
                        <Switch aria-label="字符串模式" />
                      </Form.Item>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {isSelect ? (
              <>
                {renderLabeledItem(
                  'componentMode',
                  '选择模式',
                  <Select
                    options={[
                      { label: '单选', value: 'single' },
                      { label: '多选', value: 'multiple' },
                    ]}
                  />,
                )}

                <div className="native-form-config-panel__grid">
                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>支持搜索</Typography.Text>
                    <Form.Item name="componentShowSearch" valuePropName="checked">
                      <Switch aria-label="支持搜索" />
                    </Form.Item>
                  </div>

                  {renderLabeledItem(
                    'componentMaxTagCount',
                    '标签显示数量',
                    <Input placeholder="如 3 或 responsive" />,
                  )}
                </div>

                {renderLabeledItem(
                  'componentSearchPlaceholder',
                  '搜索空态文案',
                  <Input placeholder="没有匹配到选项" />,
                )}
              </>
            ) : null}

            {isTransferLike ? renderTransferConfig() : null}
            {field.type === 'cascader' ? renderCascaderConfig() : null}
            {isTreeSelect ? renderTreeSelectConfig() : null}

            {isTagLike ? (
              <div className="native-form-config-panel__field-block">
                <Typography.Text>单选模式</Typography.Text>
                <Form.Item name="componentTagShowAsRadio" valuePropName="checked">
                  <Switch aria-label="单选模式" />
                </Form.Item>
              </div>
            ) : null}

            {isPlateLike ? (
              <>
                <div className="native-form-config-panel__grid">
                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>显示车牌颜色</Typography.Text>
                    <Form.Item name="componentPlateShowColor" valuePropName="checked">
                      <Switch aria-label="显示车牌颜色" />
                    </Form.Item>
                  </div>

                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>显示无牌选项</Typography.Text>
                    <Form.Item name="componentPlateShowNoPlate" valuePropName="checked">
                      <Switch aria-label="显示无牌选项" />
                    </Form.Item>
                  </div>
                </div>

                <div className="native-form-config-panel__grid">
                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>显示不限颜色</Typography.Text>
                    <Form.Item name="componentPlateShowNoLimit" valuePropName="checked">
                      <Switch aria-label="显示不限颜色" />
                    </Form.Item>
                  </div>

                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>精确车牌模式</Typography.Text>
                    <Form.Item name="componentPlateAccurate" valuePropName="checked">
                      <Switch aria-label="精确车牌模式" />
                    </Form.Item>
                  </div>
                </div>

                {renderLabeledItem(
                  'componentPlateProvince',
                  '默认省份',
                  <Input placeholder="如 京" maxLength={2} />,
                )}
              </>
            ) : null}

            {isVehicleModelLike ? (
              <>
                {renderLabeledItem(
                  'componentVehicleMode',
                  '选择模式',
                  <Select
                    options={[
                      { label: '单选', value: 'single' },
                      { label: '多选', value: 'multiple' },
                    ]}
                  />,
                )}

                <div className="native-form-config-panel__grid">
                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>显示边框</Typography.Text>
                    <Form.Item name="componentVehicleBordered" valuePropName="checked">
                      <Switch aria-label="显示边框" />
                    </Form.Item>
                  </div>

                  {renderLabeledItem(
                    'componentVehicleSeparator',
                    '显示分隔符',
                    <Input placeholder="/" maxLength={4} />,
                  )}
                </div>

                <div className="native-form-config-panel__grid">
                  {renderLabeledItem(
                    'componentVehicleMaxHeight',
                    '弹层最大高度',
                    <InputNumber min={240} max={960} style={{ width: '100%' }} />,
                  )}
                  {renderLabeledItem(
                    'componentVehicleSearchPlaceholder',
                    '搜索占位文案',
                    <Input placeholder="搜索" />,
                  )}
                </div>

                {renderLabeledItem(
                  'componentVehicleHotBrands',
                  '热门品牌',
                  <Input placeholder='JSON 数组，如 ["audi","bmw"]' />,
                )}
              </>
            ) : null}

            {isChoiceGroup
              ? renderLabeledItem(
                'componentDirection',
                '排列方向',
                <Select options={DIRECTION_OPTIONS} />,
              )
              : null}

            {isDateLike ? (
              <>
                {renderLabeledItem(
                  'componentFormat',
                  '显示格式',
                  <Input
                    placeholder={
                      field.type === 'datePicker' || field.type === 'dateRangePicker'
                        ? 'YYYY-MM-DD'
                        : 'HH:mm:ss'
                    }
                  />,
                )}

                {field.type === 'datePicker' || field.type === 'dateRangePicker' ? (
                  <>
                    {renderLabeledItem(
                      'componentPicker',
                      '日期类型',
                      <Select options={DATE_PICKER_OPTIONS} />,
                    )}

                    {renderGrid(
                      <div className="native-form-config-panel__field-block">
                        <Typography.Text>可选时间</Typography.Text>
                        <Form.Item name="componentShowTime" valuePropName="checked">
                          <Switch aria-label="可选时间" />
                        </Form.Item>
                      </div>,
                      <div className="native-form-config-panel__field-block">
                        <Typography.Text>禁用过去日期</Typography.Text>
                        <Form.Item name="componentDisablePastDates" valuePropName="checked">
                          <Switch aria-label="禁用过去日期" />
                        </Form.Item>
                      </div>,
                    )}
                  </>
                ) : (
                  <>
                    <div className="native-form-config-panel__field-block">
                      <Typography.Text>12 小时制</Typography.Text>
                      <Form.Item name="componentUse12Hours" valuePropName="checked">
                        <Switch aria-label="12 小时制" />
                      </Form.Item>
                    </div>

                    <div className="native-form-config-panel__grid">
                      {renderLabeledItem(
                        'componentHourStep',
                        '小时步进',
                        <InputNumber min={1} max={23} style={{ width: '100%' }} />,
                      )}
                      {renderLabeledItem(
                        'componentMinuteStep',
                        '分钟步进',
                        <InputNumber min={1} max={59} style={{ width: '100%' }} />,
                      )}
                    </div>

                    {renderLabeledItem(
                      'componentSecondStep',
                      '秒步进',
                      <InputNumber min={1} max={59} style={{ width: '100%' }} />,
                    )}
                  </>
                )}

                {isRangeValue ? (
                  <>
                    {renderLabeledItem(
                      'componentRangeSeparator',
                      '范围分隔符',
                      <Input placeholder="~" />,
                    )}
                    {renderLabeledItem(
                      'componentRangePlaceholder',
                      '范围占位文案',
                      <Input placeholder='JSON 数组，如 ["开始","结束"]' />,
                    )}
                  </>
                ) : null}
              </>
            ) : null}

            {isColorLike ? (
              <>
                {renderLabeledItem(
                  'componentFormatMode',
                  '颜色格式',
                  <Select options={COLOR_FORMAT_OPTIONS} />,
                )}

                <div className="native-form-config-panel__field-block">
                  <Typography.Text>显示颜色文本</Typography.Text>
                  <Form.Item name="componentShowText" valuePropName="checked">
                    <Switch aria-label="显示颜色文本" />
                  </Form.Item>
                </div>
              </>
            ) : null}

            {isSliderLike ? (
              <>
                <div className="native-form-config-panel__grid">
                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>范围模式</Typography.Text>
                    <Form.Item name="componentSliderRange" valuePropName="checked">
                      <Switch aria-label="范围模式" />
                    </Form.Item>
                  </div>

                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>显示刻度点</Typography.Text>
                    <Form.Item name="componentSliderDots" valuePropName="checked">
                      <Switch aria-label="显示刻度点" />
                    </Form.Item>
                  </div>
                </div>

                <div className="native-form-config-panel__grid">
                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>反向</Typography.Text>
                    <Form.Item name="componentSliderReverse" valuePropName="checked">
                      <Switch aria-label="反向" />
                    </Form.Item>
                  </div>
                </div>

                <div className="native-form-config-panel__field-block">
                  <Typography.Text>高亮已选区间</Typography.Text>
                  <Form.Item name="componentSliderIncluded" valuePropName="checked">
                    <Switch aria-label="高亮已选区间" />
                  </Form.Item>
                </div>

                {renderLabeledItem(
                  'componentSliderMarks',
                  '刻度标记',
                  <Input placeholder='JSON 对象，如 {"0":"低","100":"高"}' />,
                )}

                <div className="native-form-config-panel__field-block">
                  <Typography.Text>常显 Tooltip</Typography.Text>
                  <Form.Item name="componentTooltipOpen" valuePropName="checked">
                    <Switch aria-label="常显 Tooltip" />
                  </Form.Item>
                </div>
              </>
            ) : null}

            {isRateLike ? (
              <>
                {renderLabeledItem(
                  'componentRateCount',
                  '总星数',
                  <InputNumber min={1} max={20} style={{ width: '100%' }} />,
                )}

                <div className="native-form-config-panel__grid">
                  <div className="native-form-config-panel__field-block">
                    <Typography.Text>允许半星</Typography.Text>
                    <Form.Item name="componentRateAllowHalf" valuePropName="checked">
                      <Switch aria-label="允许半星" />
                    </Form.Item>
                  </div>

                </div>

                {renderLabeledItem(
                  'componentRateTooltips',
                  '提示文案',
                  <Input placeholder='JSON 数组，如 ["差","中","优"]' />,
                )}
              </>
            ) : null}

            {isSwitch ? (
              <div className="native-form-config-panel__grid">
                {renderLabeledItem(
                  'componentCheckedChildren',
                  '选中内容',
                  <Input placeholder="开" />,
                )}
                {renderLabeledItem(
                  'componentUncheckedChildren',
                  '未选中内容',
                  <Input placeholder="关" />,
                )}
              </div>
            ) : null}

            {isUpload ? renderUploadConfig() : null}

            {isButton ? (
              <>
                {renderLabeledItem('buttonText', '按钮文案', <Input placeholder="请输入按钮文案" />)}
                {renderLabeledItem('buttonType', '按钮类型', <Select options={BUTTON_TYPE_OPTIONS} />)}
                {renderLabeledItem('buttonAlign', '对齐方式', <Select options={ALIGN_OPTIONS} />)}
              </>
            ) : null}

            {field.type === 'grid' ? (
              <>
                {renderLabeledItem(
                  'gridColumns',
                  '栅格列数',
                  <InputNumber min={1} max={4} style={{ width: '100%' }} />,
                )}
                <div className="native-form-config-panel__grid">
                  {renderLabeledItem(
                    'gridColumnGap',
                    '列间距',
                    <Input placeholder="如 12 或 12px" />,
                  )}
                  {renderLabeledItem(
                    'gridRowGap',
                    '行间距',
                    <Input placeholder="如 12 或 12px" />,
                  )}
                </div>
              </>
            ) : null}

            {isFlexContainer ? (
              <>
                {renderGrid(
                  renderLabeledItem(
                    'componentDirection',
                    '排列方向',
                    <Select
                      options={[
                        { label: '横向', value: 'row' },
                        { label: '纵向', value: 'vertical' },
                      ]}
                    />,
                  ),
                  renderLabeledItem(
                    'componentFlexGap',
                    '组件间距',
                    <Input placeholder="如 12 或 12px" />,
                  ),
                )}

                {renderGrid(
                  renderLabeledItem(
                    'componentFlexJustify',
                    flexDirection === 'vertical' ? '纵向分布' : '横向分布',
                    <Select options={FLEX_JUSTIFY_OPTIONS} />,
                  ),
                  renderLabeledItem(
                    'componentFlexAlign',
                    flexDirection === 'vertical' ? '横向对齐' : '纵向对齐',
                    <Select options={FLEX_ALIGN_OPTIONS} />,
                  ),
                )}

                <div className="native-form-config-panel__field-block">
                  <Typography.Text>允许换行</Typography.Text>
                  <Form.Item name="componentFlexWrap" valuePropName="checked">
                    <Switch aria-label="允许换行" />
                  </Form.Item>
                </div>
              </>
            ) : null}
          </>
        ),
      }
      : null,
    hasGroup('dataSource') && supportsOptions
      ? {
        key: 'options',
        label: '选项数据源',
        children: (
          <>
            <div className="native-form-config-panel__field-block">
              <Typography.Text>数据源类型</Typography.Text>
              <Form.Item name="dataSourceType">
                <Radio.Group
                  name={`${field.id}-data-source-type`}
                  aria-label="数据源类型"
                >
                  <Radio.Button value="manual">静态选项</Radio.Button>
                  <Radio.Button value="request">远程请求</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </div>

            {dataSourceType === 'manual' ? (
              field.type === 'checkableTag'
                ? renderCheckableTagOptionList('fieldOptions', '字段')
                : (field.type === 'treeSelect' || field.type === 'cascader')
                  ? renderTreeOptionList('treeFieldOptions', '字段')
                  : renderOptionList('fieldOptions', '字段', {
                    withText: field.type === 'transfer',
                    withDisabled: field.type === 'transfer',
                  })
            ) : (
              <>
                {renderLabeledItem(
                  'requestEndpoint',
                  '接口地址',
                  <Input placeholder="/api/options" />,
                  {
                    rules: [{ required: true, whitespace: true, message: '请输入接口地址' }],
                  },
                )}

                {renderLabeledItem(
                  'requestMethod',
                  '请求方法',
                  <Select options={REQUEST_METHOD_OPTIONS} />,
                )}

                <div className="native-form-config-panel__grid">
                  {renderLabeledItem(
                    'requestListField',
                    '列表字段路径',
                    <Input placeholder="data.list" />,
                  )}
                  {renderLabeledItem(
                    'requestLabelField',
                    '标签字段',
                    <Input placeholder="label" />,
                  )}
                </div>

                <div className="native-form-config-panel__grid">
                  {renderLabeledItem(
                    'requestValueField',
                    '值字段',
                    <Input placeholder="value" />,
                  )}
                  {(field.type === 'cascader' || field.type === 'treeSelect')
                    ? renderLabeledItem(
                      'requestChildrenField',
                      '子级字段',
                      <Input placeholder="children" />,
                    )
                    : <div />}
                </div>

                <div className="native-form-config-panel__field-block widget-api-form-item">
                  <Typography.Text>请求参数配置</Typography.Text>
                  <WidgetApiConfigTabs
                    form={form}
                    methodName="requestMethod"
                    headersName="requestHeadersList"
                    queryName="requestQueryList"
                    bodyName="requestBodyList"
                    debugContent={
                      <WidgetApiDebugButton
                        form={form}
                        buildConfig={formValues => ({
                          endpoint: formValues.requestEndpoint,
                          method: formValues.requestMethod || 'GET',
                          headers: keyValueListToObject(formValues.requestHeadersList),
                          query: keyValueListToObject(formValues.requestQueryList),
                          body: keyValueListToObject(formValues.requestBodyList),
                          listField: formValues.requestListField,
                          dataField: formValues.requestListField,
                        })}
                      />
                    }
                  // debugHint="调试时会使用当前字段的接口地址、请求参数和列表字段路径。"
                  />
                </div>
              </>
            )}
          </>
        ),
      }
      : null,
    hasGroup('component') && isSubTable
      ? {
        key: 'sub-table',
        label: '子表格列配置',
        children: (
          <Form.List name="subTableColumns">
            {(fields, { add, remove }) => (
              <div className="native-form-config-panel__option-list">
                <div className="native-form-config-panel__option-header">
                  <Typography.Text strong>列清单</Typography.Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => add(createEmptySubTableColumn())}
                  >
                    新增列
                  </Button>
                </div>

                {fields.map((columnField) => {
                  const columnType = subTableColumns?.[columnField.name]?.type
                  const canShowColumnValidationRules = columnType === 'input'
                  const columnDataSourceType =
                    subTableColumns?.[columnField.name]?.dataSourceType || 'manual'
                  const isTreeOptionColumn =
                    columnType === 'cascader' || columnType === 'treeSelect'

                  return (
                    <div
                      key={columnField.key}
                      className="native-form-config-panel__sub-table-column"
                    >
                      <div className="native-form-config-panel__sub-table-grid">
                        <NativeFormLabeledItem
                          name={[columnField.name, 'label']}
                          labelText="列名"
                          rules={[{ required: true, whitespace: true, message: '请输入列名' }]}
                        >
                          <Input placeholder="列名" />
                        </NativeFormLabeledItem>

                        <NativeFormLabeledItem
                          name={[columnField.name, 'field']}
                          labelText="字段名"
                          rules={[{ required: true, whitespace: true, message: '请输入字段名' }]}
                        >
                          <Input placeholder="field_name" />
                        </NativeFormLabeledItem>

                        <NativeFormLabeledItem
                          name={[columnField.name, 'type']}
                          labelText="列类型"
                        >
                          <Select options={SUB_TABLE_COLUMN_TYPE_OPTIONS} />
                        </NativeFormLabeledItem>

                        <div className="native-form-config-panel__field-block">
                          <Typography.Text>是否必填</Typography.Text>
                          <Form.Item name={[columnField.name, 'required']} valuePropName="checked">
                            <Switch aria-label={`子表格列${columnField.name + 1}是否必填`} />
                          </Form.Item>
                        </div>
                      </div>

                      <div className="native-form-config-panel__sub-table-grid">
                        <NativeFormLabeledItem
                          name={[columnField.name, 'defaultValue']}
                          labelText="默认值"
                        >
                          <Input placeholder="数组或对象请使用 JSON" />
                        </NativeFormLabeledItem>

                        <NativeFormLabeledItem
                          name={[columnField.name, 'placeholder']}
                          labelText="占位提示"
                        >
                          <Input placeholder="请输入占位提示" />
                        </NativeFormLabeledItem>

                        <NativeFormLabeledItem
                          name={[columnField.name, 'width']}
                          labelText="列宽"
                        >
                          <InputNumber min={80} max={480} style={{ width: '100%' }} />
                        </NativeFormLabeledItem>
                      </div>

                      <div className="native-form-config-panel__sub-table-grid">
                        <div className="native-form-config-panel__field-block">
                          <Typography.Text>只读</Typography.Text>
                          <Form.Item name={[columnField.name, 'readOnly']} valuePropName="checked">
                            <Switch aria-label={`子表格列${columnField.name + 1}只读`} />
                          </Form.Item>
                        </div>

                        <div className="native-form-config-panel__field-block">
                          <Typography.Text>禁用</Typography.Text>
                          <Form.Item name={[columnField.name, 'disabled']} valuePropName="checked">
                            <Switch aria-label={`子表格列${columnField.name + 1}禁用`} />
                          </Form.Item>
                        </div>
                      </div>

                      {columnType === 'select' ? (
                        <>
                          <div className="native-form-config-panel__sub-table-grid">
                            <NativeFormLabeledItem
                              name={[columnField.name, 'componentMode']}
                              labelText="选择模式"
                            >
                              <Select
                                options={[
                                  { label: '单选', value: 'single' },
                                  { label: '多选', value: 'multiple' },
                                ]}
                              />
                            </NativeFormLabeledItem>

                            <div className="native-form-config-panel__field-block">
                              <Typography.Text>支持搜索</Typography.Text>
                              <Form.Item
                                name={[columnField.name, 'componentShowSearch']}
                                valuePropName="checked"
                              >
                                <Switch aria-label={`子表格列${columnField.name + 1}支持搜索`} />
                              </Form.Item>
                            </div>
                          </div>

                          <div className="native-form-config-panel__sub-table-grid">
                            <NativeFormLabeledItem
                              name={[columnField.name, 'componentMaxTagCount']}
                              labelText="标签显示数量"
                            >
                              <Input placeholder="如 3 或 responsive" />
                            </NativeFormLabeledItem>

                            <NativeFormLabeledItem
                              name={[columnField.name, 'componentSearchPlaceholder']}
                              labelText="搜索空态文案"
                            >
                              <Input placeholder="没有匹配到选项" />
                            </NativeFormLabeledItem>
                          </div>
                        </>
                      ) : null}

                      {columnType === 'cascader' ? renderCascaderConfig(columnField.name) : null}
                      {columnType === 'treeSelect' ? renderTreeSelectConfig(columnField.name) : null}

                      {columnType === 'datePicker' ? (
                        <>
                          <div className="native-form-config-panel__sub-table-grid">
                            <NativeFormLabeledItem
                              name={[columnField.name, 'componentFormat']}
                              labelText="显示格式"
                            >
                              <Input placeholder="YYYY-MM-DD" />
                            </NativeFormLabeledItem>

                            <NativeFormLabeledItem
                              name={[columnField.name, 'componentPicker']}
                              labelText="日期类型"
                            >
                              <Select options={DATE_PICKER_OPTIONS} />
                            </NativeFormLabeledItem>
                          </div>

                          <div className="native-form-config-panel__field-block">
                            <Typography.Text>禁用过去日期</Typography.Text>
                            <Form.Item
                              name={[columnField.name, 'componentDisablePastDates']}
                              valuePropName="checked"
                            >
                              <Switch aria-label={`子表格列${columnField.name + 1}禁用过去日期`} />
                            </Form.Item>
                          </div>

                          <div className="native-form-config-panel__field-block">
                            <Typography.Text>可选时间</Typography.Text>
                            <Form.Item
                              name={[columnField.name, 'componentShowTime']}
                              valuePropName="checked"
                            >
                              <Switch aria-label={`子表格列${columnField.name + 1}可选时间`} />
                            </Form.Item>
                          </div>
                        </>
                      ) : null}

                      {columnType === 'timePicker' ? (
                        <>
                          <NativeFormLabeledItem
                            name={[columnField.name, 'componentFormat']}
                            labelText="显示格式"
                          >
                            <Input placeholder="HH:mm:ss" />
                          </NativeFormLabeledItem>

                          <div className="native-form-config-panel__field-block">
                            <Typography.Text>12 小时制</Typography.Text>
                            <Form.Item
                              name={[columnField.name, 'componentUse12Hours']}
                              valuePropName="checked"
                            >
                              <Switch aria-label={`子表格列${columnField.name + 1}12小时制`} />
                            </Form.Item>
                          </div>

                          <div className="native-form-config-panel__sub-table-grid">
                            <NativeFormLabeledItem
                              name={[columnField.name, 'componentHourStep']}
                              labelText="小时步进"
                            >
                              <InputNumber min={1} max={23} style={{ width: '100%' }} />
                            </NativeFormLabeledItem>

                            <NativeFormLabeledItem
                              name={[columnField.name, 'componentMinuteStep']}
                              labelText="分钟步进"
                            >
                              <InputNumber min={1} max={59} style={{ width: '100%' }} />
                            </NativeFormLabeledItem>

                            <NativeFormLabeledItem
                              name={[columnField.name, 'componentSecondStep']}
                              labelText="秒步进"
                            >
                              <InputNumber min={1} max={59} style={{ width: '100%' }} />
                            </NativeFormLabeledItem>
                          </div>
                        </>
                      ) : null}

                      {canShowColumnValidationRules ? (
                        <>
                          <div className="native-form-config-panel__sub-table-grid">
                            <NativeFormLabeledItem
                              name={[columnField.name, 'validationPattern']}
                              labelText="正则表达式"
                            >
                              <Input placeholder="如 ^1\\d{10}$" />
                            </NativeFormLabeledItem>

                            <NativeFormLabeledItem
                              name={[columnField.name, 'validationPatternMessage']}
                              labelText="正则提示"
                            >
                              <Input placeholder="格式不符合要求" />
                            </NativeFormLabeledItem>
                          </div>

                          <div className="native-form-config-panel__sub-table-grid">
                            <NativeFormLabeledItem
                              name={[columnField.name, 'validationMin']}
                              labelText="最小值/最小长度"
                            >
                              <InputNumber style={{ width: '100%' }} />
                            </NativeFormLabeledItem>

                            <NativeFormLabeledItem
                              name={[columnField.name, 'validationMax']}
                              labelText="最大值/最大长度"
                            >
                              <InputNumber style={{ width: '100%' }} />
                            </NativeFormLabeledItem>
                          </div>

                          <div className="native-form-config-panel__sub-table-grid">
                            <NativeFormLabeledItem
                              name={[columnField.name, 'validationLen']}
                              labelText="固定长度"
                            >
                              <InputNumber style={{ width: '100%' }} />
                            </NativeFormLabeledItem>

                            <NativeFormLabeledItem
                              name={[columnField.name, 'validationMessage']}
                              labelText="范围提示"
                            >
                              <Input placeholder="长度或范围不符合要求" />
                            </NativeFormLabeledItem>
                          </div>
                        </>
                      ) : null}

                      {REMOTE_OPTION_FIELD_TYPES.includes(columnType) ? (
                        <>
                          <div className="native-form-config-panel__field-block">
                            <Typography.Text>选项数据源</Typography.Text>
                            <Form.Item name={[columnField.name, 'dataSourceType']}>
                              <Radio.Group
                                name={`${field.id}-sub-table-${columnField.name}-data-source-type`}
                                aria-label={`子表格列${columnField.name + 1}选项数据源`}
                              >
                                <Radio.Button value="manual">静态选项</Radio.Button>
                                <Radio.Button value="request">远程请求</Radio.Button>
                              </Radio.Group>
                            </Form.Item>
                          </div>

                          {columnDataSourceType === 'manual' ? (
                            isTreeOptionColumn
                              ? renderTreeOptionList([columnField.name, 'options'], '列')
                              : renderOptionList([columnField.name, 'options'], '列', {
                                withText: columnType === 'transfer',
                                withDisabled: columnType === 'transfer',
                              })
                          ) : (
                            <>
                              <NativeFormLabeledItem
                                name={[columnField.name, 'requestEndpoint']}
                                labelText="接口地址"
                              >
                                <Input placeholder="/api/options" />
                              </NativeFormLabeledItem>

                              <NativeFormLabeledItem
                                name={[columnField.name, 'requestMethod']}
                                labelText="请求方法"
                              >
                                <Select options={REQUEST_METHOD_OPTIONS} />
                              </NativeFormLabeledItem>

                              <div className="native-form-config-panel__sub-table-grid">
                                <NativeFormLabeledItem
                                  name={[columnField.name, 'requestListField']}
                                  labelText="列表字段路径"
                                >
                                  <Input placeholder="data.list" />
                                </NativeFormLabeledItem>

                                <NativeFormLabeledItem
                                  name={[columnField.name, 'requestLabelField']}
                                  labelText="标签字段"
                                >
                                  <Input placeholder="label" />
                                </NativeFormLabeledItem>

                                <NativeFormLabeledItem
                                  name={[columnField.name, 'requestValueField']}
                                  labelText="值字段"
                                >
                                  <Input placeholder="value" />
                                </NativeFormLabeledItem>

                                {isTreeOptionColumn ? (
                                  <NativeFormLabeledItem
                                    name={[columnField.name, 'requestChildrenField']}
                                    labelText="子级字段"
                                  >
                                    <Input placeholder="children" />
                                  </NativeFormLabeledItem>
                                ) : null}
                              </div>

                              <div className="native-form-config-panel__field-block widget-api-form-item">
                                <Typography.Text>请求参数配置</Typography.Text>
                                <WidgetApiConfigTabs
                                  form={form}
                                  methodName={['subTableColumns', columnField.name, 'requestMethod']}
                                  headersName={['subTableColumns', columnField.name, 'requestHeadersList']}
                                  queryName={['subTableColumns', columnField.name, 'requestQueryList']}
                                  bodyName={['subTableColumns', columnField.name, 'requestBodyList']}
                                  debugContent={
                                    <WidgetApiDebugButton
                                      form={form}
                                      buildConfig={(formValues) => {
                                        const columnValues = formValues.subTableColumns?.[columnField.name] || {}
                                        return {
                                          endpoint: columnValues.requestEndpoint,
                                          method: columnValues.requestMethod || 'GET',
                                          headers: keyValueListToObject(columnValues.requestHeadersList),
                                          query: keyValueListToObject(columnValues.requestQueryList),
                                          body: keyValueListToObject(columnValues.requestBodyList),
                                          listField: columnValues.requestListField,
                                          dataField: columnValues.requestListField,
                                        }
                                      }}
                                    />
                                  }
                                  debugHint="调试时会使用当前子表格列的接口地址、请求参数和列表字段路径。"
                                />
                              </div>
                            </>
                          )}
                        </>
                      ) : null}

                      {columnType === 'upload' ? renderUploadConfig(columnField.name) : null}

                      <Button type="text" danger onClick={() => remove(columnField.name)}>
                        删除列
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </Form.List>
        ),
      }
      : null,
    hasGroup('validation') && canShowValidationRules
      ? {
        key: 'validation',
        label: '校验规则',
        children: (
          <>
            {renderGrid(
              renderLabeledItem(
                'validationPattern',
                '正则表达式',
                <Input placeholder="如 ^1\\d{10}$" />,
              ),
              renderLabeledItem(
                'validationPatternMessage',
                '正则提示',
                <Input placeholder="格式不符合要求" />,
              ),
            )}

            {renderGrid(
              renderLabeledItem(
                'validationMin',
                '最小值/最小长度',
                <InputNumber style={{ width: '100%' }} />,
              ),
              renderLabeledItem(
                'validationMax',
                '最大值/最大长度',
                <InputNumber style={{ width: '100%' }} />,
              ),
            )}

            {renderGrid(
              renderLabeledItem(
                'validationLen',
                '固定长度',
                <InputNumber style={{ width: '100%' }} />,
              ),
              renderLabeledItem(
                'validationMessage',
                '范围提示',
                <Input placeholder="长度或范围不符合要求" />,
              ),
            )}
          </>
        ),
      }
      : null,
    hasGroup('linkage')
      ? {
        key: 'linkage',
        label: '联动规则',
        children: (
          <>
            <NativeFormConditionEditor
              fieldId={field.id}
              title="显示条件"
              matchModeName="visibilityMatchMode"
              conditionsName="visibilityConditions"
              fieldOptions={formFieldOptions}
            />
            <NativeFormConditionEditor
              fieldId={field.id}
              title="禁用条件"
              matchModeName="disabledMatchMode"
              conditionsName="disabledConditions"
              fieldOptions={formFieldOptions}
            />
          </>
        ),
      }
      : null,
    hasGroup('style')
      ? {
        key: 'style',
        label: '样式属性',
        children: (
          <>
            <div className="native-form-config-panel__grid">
              {renderLabeledItem(
                'styleWidth',
                '组件宽度',
                <Input placeholder="如 100%、320px" />,
              )}
              {renderLabeledItem(
                'styleHeight',
                '组件高度',
                <Input placeholder="如 40px" />,
              )}
            </div>

            <div className="native-form-config-panel__grid">
              {renderLabeledItem(
                'styleMarginTop',
                '上边距',
                <Input placeholder="如 12 或 12px" />,
              )}
              {renderLabeledItem(
                'styleMarginBottom',
                '下边距',
                <Input placeholder="如 12 或 12px" />,
              )}
            </div>

            {(field.type === 'group' || field.type === 'grid') ? (
              <>
                {renderLabeledItem(
                  'componentPadding',
                  '内边距',
                  <Input placeholder="如 16px 或 12px 16px" />,
                )}

                <div className="native-form-config-panel__grid">
                  <NativeFormLabeledItem
                    name="componentBackgroundColor"
                    labelText="背景色"
                  >
                    {renderColorPicker()}
                  </NativeFormLabeledItem>

                  <NativeFormLabeledItem
                    name="componentBorderColor"
                    labelText="边框色"
                  >
                    {renderColorPicker()}
                  </NativeFormLabeledItem>
                </div>

                <div className="native-form-config-panel__grid">
                  {renderLabeledItem(
                    'componentBorderStyle',
                    '边框样式',
                    <Select options={BORDER_STYLE_OPTIONS} />,
                  )}
                  {renderLabeledItem(
                    'componentBorderRadius',
                    '圆角',
                    <Input placeholder="如 8 或 8px" />,
                  )}
                </div>
              </>
            ) : null}
          </>
        ),
      }
      : null,
    hasGroup('events') && currentWidgetId
      ? {
        key: 'events',
        label: '字段事件',
        children: (
          <>
            <div className="native-form-config-panel__field-block">
              <Typography.Text>值变化事件</Typography.Text>
              <Typography.Text type="secondary">
                字段值变化时触发，用于联动其他微应用或组件。
              </Typography.Text>
              <Form.Item name="changeRoutes" noStyle>
                <EventRouteConfig
                  currentWidgetId={currentWidgetId}
                  senderEvents={[
                    {
                      id: 'native-form-field-change',
                      type: 'data:update',
                      name: '字段值变化',
                    },
                  ]}
                />
              </Form.Item>
            </div>

            <div className="native-form-config-panel__field-block">
              <Typography.Text>点击事件</Typography.Text>
              <Typography.Text type="secondary">
                字段点击时触发，按钮字段优先使用该事件。
              </Typography.Text>
              <Form.Item name="clickRoutes" noStyle>
                <EventRouteConfig
                  currentWidgetId={currentWidgetId}
                  senderEvents={[
                    {
                      id: 'native-form-field-click',
                      type: 'user:action',
                      name: '字段点击',
                    },
                  ]}
                />
              </Form.Item>
            </div>
          </>
        ),
      }
      : null,
  ].filter(Boolean) as Array<{
    key: string
    label: React.ReactNode
    children: React.ReactNode
  }>

  const orderedCollapseItems = [...collapseItems].sort((left, right) => {
    const leftIndex = collapseItemOrder.indexOf(left.key)
    const rightIndex = collapseItemOrder.indexOf(right.key)
    return leftIndex - rightIndex
  })

  return (
    <Form
      form={form}
      layout="vertical"
      className="native-form-config-panel__form native-form-config-panel__form--field"
      onValuesChange={onValuesChange}
    >
      <Collapse
        bordered={false}
        defaultActiveKey={orderedCollapseItems.length ? [orderedCollapseItems[0].key] : []}
        className="native-form-config-panel__collapse"
        items={orderedCollapseItems}
      />
    </Form>
  )
}

export default NativeFormFieldConfigForm
