import React from 'react'
import { Button, Empty, Form, Input, Select, Tabs, Typography } from 'antd'
import type { FormInstance } from 'antd'
import type { NamePath } from 'antd/es/form/interface'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

export interface WidgetApiConfigTabOption {
  label: string
  value: string
}

interface WidgetApiConfigTabsProps {
  form: FormInstance
  methodName: NamePath
  headersName: NamePath
  queryName: NamePath
  bodyName: NamePath
  debugContent: React.ReactNode
  debugHint?: React.ReactNode
  showQueryTab?: boolean
  showBodyTab?: boolean
  headerKeyOptions?: WidgetApiConfigTabOption[]
}

const renderKeyValueList = (
  name: NamePath,
  keyOptions?: WidgetApiConfigTabOption[],
) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <div className="widget-api-config-tabs__list">
        {fields.map(({ key, name: fieldName, ...restField }) => (
          <div key={key} className="widget-api-config-tabs__row">
            <Form.Item
              {...restField}
              name={[fieldName, 'key']}
              noStyle
              rules={[{ required: true, message: '' }]}
            >
              {keyOptions?.length ? (
                <Select
                  placeholder="请选择请求头"
                  options={keyOptions}
                  showSearch
                  optionFilterProp="label"
                  className="widget-api-config-tabs__select"
                />
              ) : (
                <Input placeholder="请输入参数名" />
              )}
            </Form.Item>
            <Form.Item {...restField} name={[fieldName, 'value']} noStyle>
              <Input placeholder="请输入参数值" />
            </Form.Item>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => remove(fieldName)}
              className="widget-api-config-tabs__remove"
            />
          </div>
        ))}
        <Button type="link" icon={<PlusOutlined />} onClick={() => add()} className="widget-api-config-tabs__add">
          添加参数
        </Button>
      </div>
    )}
  </Form.List>
)

const WidgetApiConfigTabs: React.FC<WidgetApiConfigTabsProps> = ({
  form,
  methodName,
  headersName,
  queryName,
  bodyName,
  debugContent,
  debugHint,
  showQueryTab = true,
  showBodyTab = true,
  headerKeyOptions,
}) => {
  const apiMethod = (Form.useWatch(methodName, form) || 'GET').toUpperCase()
  const canUseBody = ['POST', 'PUT', 'PATCH'].includes(apiMethod)

  const items = [
    {
      key: 'headers',
      label: '请求头',
      children: renderKeyValueList(headersName, headerKeyOptions),
    },
    ...(showQueryTab
      ? [
          {
            key: 'query',
            label: 'Query 参数',
            children: renderKeyValueList(queryName),
          },
        ]
      : []),
    ...(showBodyTab
      ? [
          {
            key: 'body',
            label: 'Body 参数',
            disabled: !canUseBody,
            children: canUseBody ? (
              renderKeyValueList(bodyName)
            ) : (
              <div className="widget-api-config-tabs__empty">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="POST、PUT、PATCH 请求时可配置 Body 参数"
                />
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'debug',
      label: '调试',
      children: (
        <div className="widget-api-config-tabs__debug">
          {debugContent}
          {debugHint ? <Typography.Text type="secondary">{debugHint}</Typography.Text> : null}
        </div>
      ),
    },
  ]

  return (
    <div className="widget-api-config-tabs">
      <Tabs items={items} className="widget-api-config-tabs__tabs" />
    </div>
  )
}

export default WidgetApiConfigTabs
