import React from 'react'
import { ColorPicker, Form, InputNumber, Select, Switch } from 'antd'
import type { NamePath } from 'antd/es/form/interface'
import './index.scss'

interface WidgetTitleSettingsProps {
  showTitleName?: NamePath
  titleColorName?: NamePath
  titleFontSizeName?: NamePath
  titleFontWeightName?: NamePath
  hideShowTitle?: boolean
  disabled?: boolean
  disableShowTitle?: boolean
}

const WidgetTitleSettings: React.FC<WidgetTitleSettingsProps> = ({
  showTitleName = 'showTitle',
  titleColorName = 'titleColor',
  titleFontSizeName = 'titleFontSize',
  titleFontWeightName = 'titleFontWeight',
  hideShowTitle = false,
  disabled = false,
  disableShowTitle = false,
}) => {
  return (
    <div className="widget-title-settings">
      <div className="widget-title-settings__row">
        {hideShowTitle ? null : (
          <Form.Item name={showTitleName} label="显示标题" valuePropName="checked">
            <Switch disabled={disableShowTitle || disabled} />
          </Form.Item>
        )}
        <Form.Item name={titleColorName} label="标题颜色">
          <ColorPicker showText allowClear disabled={disabled} />
        </Form.Item>
      </div>

      <div className="widget-title-settings__row">
        <Form.Item name={titleFontSizeName} label="标题字号" rules={[{ type: 'number', min: 12 }]}>
          <InputNumber style={{ width: '100%' }} suffix="px" placeholder="14" disabled={disabled} />
        </Form.Item>
        <Form.Item name={titleFontWeightName} label="标题字重">
          <Select placeholder="500" disabled={disabled}>
            <Select.Option value={400}>常规 (400)</Select.Option>
            <Select.Option value={500}>中等 (500)</Select.Option>
            <Select.Option value={600}>半粗 (600)</Select.Option>
            <Select.Option value={700}>粗体 (700)</Select.Option>
          </Select>
        </Form.Item>
      </div>
    </div>
  )
}

export default WidgetTitleSettings
