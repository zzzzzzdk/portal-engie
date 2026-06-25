import React, { useMemo } from 'react'
import { Cascader, Select, Space, Tag } from 'antd'
import type { NativeFormVehicleModelValue } from '@/types'

interface NativeFormVehicleModelProps {
  value?: NativeFormVehicleModelValue
  disabled?: boolean
  readOnly?: boolean
  allowClear?: boolean
  bordered?: boolean
  placeholder?: string
  searchPlaceholder?: string
  separator?: string
  maxHeight?: number
  hotBrands?: Array<string | number>
  mode?: 'single' | 'multiple'
  style?: React.CSSProperties
  onChange?: (value: NativeFormVehicleModelValue) => void
}

type VehicleValue = string
type VehicleCascaderValue = VehicleValue[]
type VehicleSelectValue = string[]

const VEHICLE_OPTIONS = [
  {
    label: '大众',
    value: 'vw',
    children: [
      {
        label: '迈腾',
        value: 'magotan',
        children: [
          { label: '2024款', value: '2024' },
          { label: '2025款', value: '2025' },
        ],
      },
      {
        label: '帕萨特',
        value: 'passat',
        children: [
          { label: '2024款', value: '2024' },
          { label: '2025款', value: '2025' },
        ],
      },
    ],
  },
  {
    label: '比亚迪',
    value: 'byd',
    children: [
      {
        label: '汉',
        value: 'han',
        children: [
          { label: 'EV 2024款', value: 'ev-2024' },
          { label: 'DM-i 2025款', value: 'dmi-2025' },
        ],
      },
      {
        label: '宋PLUS',
        value: 'song-plus',
        children: [
          { label: 'EV 2024款', value: 'ev-2024' },
          { label: 'DM-i 2025款', value: 'dmi-2025' },
        ],
      },
    ],
  },
  {
    label: '特斯拉',
    value: 'tesla',
    children: [
      {
        label: 'Model 3',
        value: 'model-3',
        children: [
          { label: '后驱版', value: 'rwd' },
          { label: '长续航版', value: 'long-range' },
        ],
      },
      {
        label: 'Model Y',
        value: 'model-y',
        children: [
          { label: '后驱版', value: 'rwd' },
          { label: '长续航版', value: 'long-range' },
        ],
      },
    ],
  },
]

const findBrandOption = (brandValue?: string | number) =>
  VEHICLE_OPTIONS.find(item => item.value === brandValue)

const findModelOption = (brandValue?: string | number, modelValue?: string | number) =>
  findBrandOption(brandValue)?.children?.find(item => item.value === modelValue)

const normalizeValue = (
  value: NativeFormVehicleModelValue | undefined,
): NativeFormVehicleModelValue => ({
  brandValue: value?.brandValue,
  modelValue: Array.isArray(value?.modelValue) ? value.modelValue : [],
  yearValue: Array.isArray(value?.yearValue) ? value.yearValue : [],
})

const normalizeMultipleValue = (
  value: NativeFormVehicleModelValue | undefined,
): VehicleSelectValue => {
  const normalizedValue = normalizeValue(value)
  const brandValues = Array.isArray(normalizedValue.brandValue)
    ? normalizedValue.brandValue
    : normalizedValue.brandValue != null
      ? [normalizedValue.brandValue]
      : []
  const modelValues = normalizedValue.modelValue
  const yearValues = normalizedValue.yearValue
  const maxLength = Math.max(brandValues.length, modelValues.length, yearValues.length)

  return Array.from({ length: maxLength }).reduce<VehicleSelectValue>((result, _, index) => {
    const brandValue = brandValues[index]
    const modelValue = modelValues[index]
    const yearValue = yearValues[index]

    if (brandValue == null || modelValue == null || yearValue == null) {
      return result
    }

    result.push(`${String(brandValue)}|${String(modelValue)}|${String(yearValue)}`)
    return result
  }, [])
}

const toCascaderValue = (value: NativeFormVehicleModelValue | undefined): VehicleCascaderValue => {
  const normalizedValue = normalizeValue(value)
  const brandValue = Array.isArray(normalizedValue.brandValue)
    ? normalizedValue.brandValue[0]
    : normalizedValue.brandValue
  return [
    brandValue,
    normalizedValue.modelValue[0],
    normalizedValue.yearValue[0],
  ].filter(item => item !== undefined) as VehicleCascaderValue
}

const NativeFormVehicleModel: React.FC<NativeFormVehicleModelProps> = ({
  value,
  disabled,
  readOnly,
  allowClear = true,
  bordered = true,
  placeholder,
  separator = '/',
  maxHeight = 540,
  hotBrands = [],
  mode = 'single',
  style,
  onChange,
}) => {
  const cascaderValue = useMemo(() => toCascaderValue(value), [value])
  const multipleValue = useMemo(() => normalizeMultipleValue(value), [value])

  const mergedStyle = {
    ...style,
    width: style?.width || '100%',
  }

  const hotBrandOptions = hotBrands
    .map(item => findBrandOption(item))
    .filter(Boolean)

  const displayText = useMemo(() => {
    const normalizedValue = normalizeValue(value)
    const brandValue = Array.isArray(normalizedValue.brandValue)
      ? normalizedValue.brandValue[0]
      : normalizedValue.brandValue
    const brand = findBrandOption(brandValue)?.label
    const model = findModelOption(brandValue, normalizedValue.modelValue[0])?.label
    const year = findModelOption(brandValue, normalizedValue.modelValue[0])
      ?.children?.find(item => item.value === normalizedValue.yearValue[0])?.label

    return [brand, model, year].filter(Boolean).join(separator)
  }, [separator, value])

  return (
    <div style={mergedStyle}>
      {hotBrandOptions.length > 0 ? (
        <Space size={[8, 8]} wrap style={{ marginBottom: 8 }}>
          {hotBrandOptions.map(item => (
            <Tag key={String(item!.value)} color="blue">
              {item!.label}
            </Tag>
          ))}
        </Space>
      ) : null}

      {mode === 'multiple' ? (
        <Select
          mode="multiple"
          disabled={disabled || readOnly}
          allowClear={allowClear}
          variant={bordered ? 'outlined' : 'borderless'}
          placeholder={placeholder || '请选择品牌/车型/年款'}
          style={{ width: '100%' }}
          maxTagCount="responsive"
          options={VEHICLE_OPTIONS.flatMap(brand =>
            (brand.children || []).flatMap(model =>
              (model.children || []).map(year => ({
                label: `${brand.label}${separator}${model.label}${separator}${year.label}`,
                value: `${brand.value}|${model.value}|${year.value}`,
              })),
            ),
          )}
          value={multipleValue}
          onChange={(nextValues) => {
            if (!Array.isArray(nextValues) || nextValues.length === 0) {
              onChange?.({
                brandValue: undefined,
                modelValue: [],
                yearValue: [],
              })
              return
            }

            const parsedValues = nextValues
              .filter((item): item is string => typeof item === 'string')
              .map(item => item.split('|'))
              .filter(item => item.length === 3)

            onChange?.({
              brandValue: parsedValues.map(item => item[0]),
              modelValue: parsedValues.map(item => item[1]),
              yearValue: parsedValues.map(item => item[2]),
            })
          }}
        />
      ) : (
        <Cascader
          disabled={disabled || readOnly}
          allowClear={allowClear}
          options={VEHICLE_OPTIONS}
          value={cascaderValue}
          placeholder={placeholder || '请选择品牌/车型/年款'}
          showSearch
          style={{ width: '100%' }}
          popupMenuColumnStyle={{ maxHeight }}
          variant={bordered ? 'outlined' : 'borderless'}
          onChange={(nextValue) => {
            const [brandValue, modelValue, yearValue] = (nextValue || []) as VehicleCascaderValue
            onChange?.({
              brandValue,
              modelValue: modelValue ? [modelValue] : [],
              yearValue: yearValue ? [yearValue] : [],
            })
          }}
        />
      )}
    </div>
  )
}

export default NativeFormVehicleModel
