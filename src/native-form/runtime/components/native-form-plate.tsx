import React, { useMemo } from 'react'
import { Checkbox, Input, Select, Space } from 'antd'
import type { NativeFormPlateTypeId, NativeFormPlateValue } from '@/types'

interface NativeFormPlateProps {
  value?: NativeFormPlateValue
  disabled?: boolean
  readOnly?: boolean
  allowClear?: boolean
  placeholder?: string
  province?: string
  isShowColor?: boolean
  isShowNoPlate?: boolean
  isShowNoLimit?: boolean
  accurate?: boolean
  style?: React.CSSProperties
  onChange?: (value: NativeFormPlateValue) => void
}

const PLATE_TYPE_OPTIONS: Array<{ label: string; value: NativeFormPlateTypeId }> = [
  { label: '不限', value: -1 },
  { label: '蓝牌', value: 1 },
  { label: '黄牌', value: 2 },
  { label: '警牌', value: 5 },
  { label: '使馆', value: 6 },
  { label: '新能源', value: 9 },
  { label: '港澳', value: 15 },
  { label: '教练', value: 16 },
]

const PLATE_PROVINCE_OPTIONS = [
  '京', '津', '沪', '渝', '冀', '豫', '云', '辽', '黑', '湘', '皖', '鲁',
  '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋', '蒙', '陕', '吉', '闽',
  '贵', '粤', '青', '藏', '川', '宁', '琼',
].map(item => ({
  label: item,
  value: item,
}))

const createDefaultValue = (province?: string): NativeFormPlateValue => ({
  plateTypeId: -1,
  plateNumber: province || '',
  noplate: '',
})

const normalizeValue = (
  value: NativeFormPlateValue | undefined,
  province?: string,
): NativeFormPlateValue => ({
  ...createDefaultValue(province),
  ...(value || {}),
})

const NativeFormPlate: React.FC<NativeFormPlateProps> = ({
  value,
  disabled,
  readOnly,
  allowClear = true,
  placeholder,
  province = '京',
  isShowColor = true,
  isShowNoPlate = false,
  isShowNoLimit = true,
  accurate = false,
  style,
  onChange,
}) => {
  const mergedValue = useMemo(
    () => normalizeValue(value, province),
    [province, value],
  )

  const emitChange = (patch: Partial<NativeFormPlateValue>) => {
    onChange?.({
      ...mergedValue,
      ...patch,
    })
  }

  const handlePlateNumberChange = (nextValue: string) => {
    const normalizedValue = accurate ? nextValue.toUpperCase() : nextValue.toUpperCase().replace(/\s+/g, '')
    emitChange({
      plateNumber: normalizedValue,
    })
  }

  const plateTypeOptions = isShowNoLimit
    ? PLATE_TYPE_OPTIONS
    : PLATE_TYPE_OPTIONS.filter(item => item.value !== -1)

  return (
    <Space.Compact style={style}>
      {isShowColor ? (
        <Select
          style={{ width: 108 }}
          value={mergedValue.plateTypeId}
          disabled={disabled || readOnly}
          options={plateTypeOptions}
          onChange={(nextValue: NativeFormPlateTypeId) => {
            emitChange({
              plateTypeId: nextValue,
            })
          }}
        />
      ) : null}

      <Select
        style={{ width: 76 }}
        value={mergedValue.plateNumber.slice(0, 1) || province}
        disabled={disabled || readOnly}
        options={PLATE_PROVINCE_OPTIONS}
        onChange={(nextProvince) => {
          const current = mergedValue.plateNumber || ''
          const suffix = current.length > 1 ? current.slice(1) : ''
          emitChange({
            plateNumber: `${nextProvince}${suffix}`.toUpperCase(),
          })
        }}
      />

      <Input
        value={mergedValue.plateNumber.length > 0 ? mergedValue.plateNumber.slice(1) : ''}
        disabled={disabled || readOnly || mergedValue.noplate === 'noplate'}
        allowClear={allowClear}
        placeholder={placeholder || '请输入车牌号'}
        onChange={(event) => {
          const prefix = mergedValue.plateNumber.slice(0, 1) || province
          handlePlateNumberChange(`${prefix}${event.target.value}`)
        }}
        onClear={() => {
          emitChange({
            plateNumber: province,
          })
        }}
      />

      {isShowNoPlate ? (
        <Checkbox
          checked={mergedValue.noplate === 'noplate'}
          disabled={disabled || readOnly}
          onChange={(event) => {
            emitChange({
              noplate: event.target.checked ? 'noplate' : '',
            })
          }}
        >
          无牌
        </Checkbox>
      ) : null}
    </Space.Compact>
  )
}

export default NativeFormPlate
