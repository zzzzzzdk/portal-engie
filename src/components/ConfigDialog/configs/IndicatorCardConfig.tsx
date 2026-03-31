import React from 'react'
import { ColorPicker, Divider, Form, InputNumber } from 'antd'
import { WidgetConfigProps } from './types'

const IndicatorCardConfig: React.FC<WidgetConfigProps> = () => (
  <>
    <Divider>样式属性</Divider>
    <div className="form-row-2">
      <Form.Item name="indicatorValueFontSize" label="数值字号" initialValue={38}>
        <InputNumber min={12} max={120} precision={0} style={{ width: '100%' }} suffix="px" />
      </Form.Item>
      <Form.Item name="indicatorDescriptionFontSize" label="描述字号" initialValue={18}>
        <InputNumber min={10} max={80} precision={0} style={{ width: '100%' }} suffix="px" />
      </Form.Item>
    </div>
    <div className="form-row-2">
      <Form.Item name="indicatorValueColor" label="数值颜色">
        <ColorPicker showText allowClear />
      </Form.Item>
      <Form.Item name="indicatorDescriptionColor" label="描述颜色">
        <ColorPicker showText allowClear />
      </Form.Item>
    </div>
  </>
)

export default IndicatorCardConfig
