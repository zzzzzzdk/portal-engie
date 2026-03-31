import React from 'react'
import { Button, Input } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { QueryFilterOptionItem } from '@/types'
import './index.scss'

interface OptionListEditorProps {
  value?: QueryFilterOptionItem[]
  onChange?: (value: QueryFilterOptionItem[]) => void
  addButtonText?: string
}

const cloneOptions = (value?: QueryFilterOptionItem[]) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(item => ({
    label: item?.label ?? '',
    value: item?.value ?? '',
  }))
}

const OptionListEditor: React.FC<OptionListEditorProps> = ({
  value = [],
  onChange,
  addButtonText = '添加数据项',
}) => {
  const safeValue = cloneOptions(value)

  const handleItemChange = (index: number, key: 'label' | 'value', nextValue: string) => {
    const nextList = safeValue.map((item, itemIndex) => {
      if (itemIndex === index) {
        return {
          ...item,
          [key]: nextValue,
        }
      }

      return {
        ...item,
      }
    })

    onChange?.(nextList)
  }

  const handleAdd = () => {
    onChange?.([
      ...safeValue,
      {
        label: '',
        value: '',
      },
    ])
  }

  const handleRemove = (index: number) => {
    onChange?.(safeValue.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="option-list-editor">
      {safeValue.map((item, index) => (
        <div key={index} className="option-list-editor__row">
          <Input
            className="option-list-editor__item"
            placeholder="字段名"
            value={item?.label}
            onChange={event => handleItemChange(index, 'label', event.target.value)}
          />
          <Input
            className="option-list-editor__item"
            placeholder="字段值"
            value={
              typeof item?.value === 'string' || typeof item?.value === 'number'
                ? String(item.value)
                : ''
            }
            onChange={event => handleItemChange(index, 'value', event.target.value)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(index)}
          />
        </div>
      ))}

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAdd}
        block
      >
        {addButtonText}
      </Button>
    </div>
  )
}

export default OptionListEditor
