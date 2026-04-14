import React from 'react'
import { Form, Select, Switch } from 'antd'
import type { FormInstance } from 'antd/es/form'
import type { NamePath } from 'antd/es/form/interface'
import './index.scss'

interface GlobalThemeReferenceFieldsProps {
  form: FormInstance
  useFieldName: NamePath
  themeIdFieldName: NamePath
  options: Array<{ label: string; value: string }>
  switchLabel?: string
  selectLabel?: string
  hint?: string
}

const GlobalThemeReferenceFields: React.FC<GlobalThemeReferenceFieldsProps> = ({
  form,
  useFieldName,
  themeIdFieldName,
  options,
  switchLabel = '引用全局配置',
  selectLabel = '主题方案',
  hint,
}) => {
  const useGlobalConfig = Form.useWatch(useFieldName, form) ?? false

  return (
    <div className="global-theme-reference-fields">
      <div className="global-theme-reference-fields__row">
        <Form.Item name={useFieldName} label={switchLabel} valuePropName="checked">
          <Switch disabled={!options.length} />
        </Form.Item>
        <Form.Item
          name={themeIdFieldName}
          label={selectLabel}
          rules={useGlobalConfig ? [{ required: true, message: '请选择主题方案' }] : undefined}
        >
          <Select
            placeholder={options.length ? '请选择主题方案' : '暂无可引用的主题方案'}
            options={options}
            disabled={!useGlobalConfig || !options.length}
            allowClear={!useGlobalConfig}
          />
        </Form.Item>
      </div>
      {hint ? <div className="global-theme-reference-fields__hint">{hint}</div> : null}
    </div>
  )
}

export default GlobalThemeReferenceFields
