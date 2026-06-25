import React from 'react'
import { ColorPicker, Divider, Form, InputNumber } from 'antd'
import { WidgetConfigProps } from './types'

const IndicatorCardListConfig: React.FC<WidgetConfigProps> = () => (
  <>
    <Divider>样式属性</Divider>
    <div className="form-row-3">
      <Form.Item name="columns" label="列数" initialValue={2}>
        <InputNumber min={1} max={4} precision={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="indicatorValueFontSize" label="数值字号" initialValue={38}>
        <InputNumber min={12} max={120} precision={0} style={{ width: '100%' }} suffix="px" />
      </Form.Item>
      <Form.Item name="indicatorDescriptionFontSize" label="文案字号" initialValue={18}>
        <InputNumber min={10} max={80} precision={0} style={{ width: '100%' }} suffix="px" />
      </Form.Item>
    </div>
    <div className="form-row-2">
      <Form.Item name="indicatorValueColor" label="数值颜色">
        <ColorPicker showText allowClear />
      </Form.Item>
      <Form.Item name="indicatorDescriptionColor" label="文案颜色">
        <ColorPicker showText allowClear />
      </Form.Item>
    </div>
  </>
)

export default IndicatorCardListConfig
