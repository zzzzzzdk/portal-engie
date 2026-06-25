import React, { useMemo } from 'react'
import classNames from 'classnames'
import { Tag } from 'antd'
import type { NativeFormOptionItem } from '@/types'
import IconRenderer from '@/components/IconRenderer'
import { normalizeNativeFormColorValue } from '@/native-form/shared/color-value'

interface NativeFormCheckableTagProps {
  value?: Array<string | number | boolean>
  options?: NativeFormOptionItem[]
  disabled?: boolean
  showAsRadio?: boolean
  onChange?: (value: Array<string | number | boolean>) => void
}

const toArrayValue = (value: unknown): Array<string | number | boolean> =>
  Array.isArray(value) ? value : []

const isGradientColor = (value?: string) =>
  Boolean(value && value.includes('gradient'))

const getReadableCheckedTextColor = (color?: string) =>
  color?.toUpperCase() === '#FFFFFF' ? '#22619c' : '#fff'

const NativeFormCheckableTag: React.FC<NativeFormCheckableTagProps> = ({
  value,
  options,
  disabled,
  showAsRadio,
  onChange,
}) => {
  const mergedValue = useMemo(() => toArrayValue(value), [value])
  const mergedOptions = options || []
  const cancelOtherValues = mergedOptions
    .filter(item => item.cancelOther)
    .map(item => item.value)

  const handleToggle = (option: NativeFormOptionItem) => {
    if (disabled) {
      return
    }

    const currentValues = toArrayValue(mergedValue)
    const isChecked = currentValues.includes(option.value)

    if (showAsRadio) {
      onChange?.([option.value])
      return
    }

    if (option.cancelOther) {
      onChange?.([option.value])
      return
    }

    const withoutCancelOther = currentValues.filter(item => !cancelOtherValues.includes(item))

    if (isChecked) {
      const nextValues = withoutCancelOther.filter(item => item !== option.value)
      if (nextValues.length === 0 && cancelOtherValues.length > 0) {
        onChange?.([cancelOtherValues[0]])
        return
      }
      onChange?.(nextValues)
      return
    }

    onChange?.([...withoutCancelOther, option.value])
  }

  const renderLabel = (option: NativeFormOptionItem, checked: boolean) => {
    if (option.showStyle === 'icon' && option.icon) {
      return (
        <span className="native-form-checkable-tag__content native-form-checkable-tag__content--icon-only">
          <IconRenderer
            value={option.icon}
            size={16}
            className="native-form-checkable-tag__icon"
            fallbackText={option.text || option.label}
          />
        </span>
      )
    }

    if (option.showStyle === 'colorBlock') {
      return <span className="native-form-checkable-tag__content">{option.text || option.label}</span>
    }

    return <span className="native-form-checkable-tag__content">{option.text || option.label}</span>
  }

  return (
    <div className="native-form-checkable-tag">
      {mergedOptions.map(option => {
        const checked = mergedValue.includes(option.value)
        const color = normalizeNativeFormColorValue(option.color)
        const borderColor = normalizeNativeFormColorValue(option.borderColor) || color
        const usesColorStyle = option.showStyle === 'colorBlock' || option.showStyle === 'icon'
        const tagStyle: React.CSSProperties | undefined = usesColorStyle
          ? checked
            ? {
                color: getReadableCheckedTextColor(color),
                borderColor,
                backgroundColor: color && !isGradientColor(color) ? color : undefined,
                backgroundImage: color && isGradientColor(color) ? color : undefined,
              }
            : {
                color: color?.toUpperCase() === '#FFFFFF' ? undefined : color || undefined,
                borderColor: borderColor || undefined,
                backgroundColor: '#fff',
              }
          : checked
          ? {
              color: '#1677ff',
              borderColor: '#1677ff',
              backgroundColor: '#fff',
            }
          : {
            borderColor: '#d9d9d9',
          }

        return (
          <Tag.CheckableTag
            key={String(option.value)}
            checked={checked}
            onChange={() => handleToggle(option)}
            style={tagStyle}
            className={classNames('native-form-checkable-tag__tag', {
              'native-form-checkable-tag__tag--checked': checked,
              'native-form-checkable-tag__tag--disabled': disabled,
              'native-form-checkable-tag__tag--icon-only': option.showStyle === 'icon' && Boolean(option.icon),
              'native-form-checkable-tag__tag--block': option.showStyle === 'colorBlock',
              'native-form-checkable-tag__tag--text': option.showStyle !== 'colorBlock' && option.showStyle !== 'icon'
            })}
          >
            {renderLabel(option, checked)}
          </Tag.CheckableTag>
        )
      })}
    </div>
  )
}

export default NativeFormCheckableTag
