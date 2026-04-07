import React, { useEffect } from 'react'
import { Divider, Form, Input, InputNumber, Radio, Switch } from 'antd'
import QueryFilterFieldBuilder from '@/components/QueryFilterFieldBuilder'
import { hydrateQueryFilterFields } from '@/utils/queryFilter'
import { WidgetConfigProps } from './types'

const QueryFilterConfig: React.FC<WidgetConfigProps> = ({ form, widget }) => {
  const showResetButton = Form.useWatch('showResetButton', form) ?? true
  const formLayout = Form.useWatch('formLayout', form) || 'vertical'
  const isHorizontalLayout = formLayout === 'horizontal'

  useEffect(() => {
    const currentFields = form.getFieldValue('queryFields')
    if (Array.isArray(currentFields) && currentFields.length > 0) {
      return
    }

    const defaultFields = hydrateQueryFilterFields(widget.config?.queryFields)
    if (defaultFields.length > 0) {
      form.setFieldValue('queryFields', defaultFields)
    }
  }, [form, widget.config?.queryFields])

  return (
    <>
      <Divider>表单项</Divider>
      <QueryFilterFieldBuilder form={form} name="queryFields" />

      <Divider>按钮配置</Divider>
      <Form.Item name="submitButtonText" label="查询按钮文案">
        <Input placeholder="查询" />
      </Form.Item>
      <Form.Item name="showResetButton" label="显示重置按钮" valuePropName="checked">
        <Switch />
      </Form.Item>
      {showResetButton && (
        <Form.Item name="resetButtonText" label="重置按钮文案">
          <Input placeholder="重置" />
        </Form.Item>
      )}

      <Divider>布局配置</Divider>
      <div className="form-row-2">
        <Form.Item name="formLayout" label="表单布局" initialValue="vertical">
          <Radio.Group>
            <Radio.Button value="vertical">纵向</Radio.Button>
            <Radio.Button value="horizontal">横向</Radio.Button>
            <Radio.Button value="inline">内联</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {formLayout === 'horizontal' ? (
          <Form.Item name="labelWidth" label="标签宽度(px)" initialValue={96}>
            <InputNumber min={60} max={180} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        ) : (
          <div />
        )}
      </div>
      <div className="form-row-2">
        {isHorizontalLayout ? (
          <Form.Item name="labelVerticalAlign" label="标签垂直对齐" initialValue="top">
            <Radio.Group>
              <Radio.Button value="top">顶部</Radio.Button>
              <Radio.Button value="center">居中</Radio.Button>
              <Radio.Button value="bottom">底部</Radio.Button>
            </Radio.Group>
          </Form.Item>
        ) : (
          <div />
        )}
        {isHorizontalLayout ? (
          <Form.Item name="labelTextAlign" label="标签文字对齐" initialValue="left">
            <Radio.Group>
              <Radio.Button value="left">左对齐</Radio.Button>
              <Radio.Button value="center">居中</Radio.Button>
              <Radio.Button value="right">右对齐</Radio.Button>
            </Radio.Group>
          </Form.Item>
        ) : (
          <div />
        )}
      </div>
      <div className="form-row-2">
        <Form.Item name="layoutCols" label="字段列数" initialValue={4}>
          <Radio.Group>
            <Radio.Button value={1}>一列</Radio.Button>
            <Radio.Button value={2}>两列</Radio.Button>
            <Radio.Button value={3}>三列</Radio.Button>
            <Radio.Button value={4}>四列</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="buttonAlign" label="按钮对齐" initialValue="right">
          <Radio.Group>
            <Radio.Button value="left">左对齐</Radio.Button>
            <Radio.Button value="center">居中</Radio.Button>
            <Radio.Button value="right">右对齐</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </div>
      <div className="form-row-2">
        <Form.Item name="fieldSpacing" label="字段间距(px)" initialValue={16}>
          <InputNumber min={0} max={48} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <div />
      </div>
    </>
  )
}

export default QueryFilterConfig
