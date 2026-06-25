import React from 'react'
import { Button, Divider, Form, Input, Switch } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { WidgetConfigProps } from './types'
import IconPicker from '@/components/IconPicker'

const RecognitionCardConfig: React.FC<WidgetConfigProps> = () => (
  <>
    <Divider>头部区域</Divider>
    <Form.Item name="showSimilarity" label="显示相似度" valuePropName="checked" initialValue>
      <Switch />
    </Form.Item>
    <Form.Item name="similarityField" label="相似度字段" initialValue="similarity">
      <Input placeholder="similarity" />
    </Form.Item>

    <Divider>主体区域</Divider>
    <Form.Item name="imageField" label="图片字段" initialValue="imageUrl">
      <Input placeholder="imageUrl" />
    </Form.Item>
    <div className="form-row-2">
      <Form.Item name="showPlateNo" label="显示车牌" valuePropName="checked" initialValue>
        <Switch />
      </Form.Item>
      <Form.Item name="plateNoField" label="车牌字段" initialValue="plateNo">
        <Input placeholder="plateNo" />
      </Form.Item>
    </div>
    <div className="form-row-2">
      <Form.Item name="showPersonName" label="显示姓名" valuePropName="checked" initialValue>
        <Switch />
      </Form.Item>
      <Form.Item name="personNameField" label="姓名字段" initialValue="personName">
        <Input placeholder="personName" />
      </Form.Item>
    </div>

    <Divider>信息项配置</Divider>
    <Form.List name="infoItems">
      {(fields, { add, remove }) => (
        <div className="config-list-container">
          {fields.map(({ key, name, ...restField }) => (
            <div key={key} className="config-item-card">
              <div className="card-content" style={{ padding: '12px', position: 'relative' }}>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(name)}
                  style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                />
                <div className="form-row-2">
                  <Form.Item
                    {...restField}
                    name={[name, 'icon']}
                    label="图标"
                    style={{ marginBottom: 0 }}
                  >
                    <IconPicker mode="simple" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'field']}
                    label="字段"
                    rules={[{ required: true, message: '请输入字段名' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="captureTime" />
                  </Form.Item>
                </div>
              </div>
            </div>
          ))}
          <Button
            type="dashed"
            onClick={() => add({ field: '', icon: 'ClockCircleOutlined' })}
            block
            icon={<PlusOutlined />}
          >
            添加信息项
          </Button>
        </div>
      )}
    </Form.List>

    <Divider>底部快捷链接</Divider>
    <Form.Item name="showQuickLinks" label="显示快捷链接" valuePropName="checked" initialValue>
      <Switch />
    </Form.Item>
    <div className="empty-hint">
      底部链接来自当前数据对象中的 <code>quickLinks</code> 数组，配置静态数据或接口返回时请保持该字段结构。
    </div>
  </>
)

export default RecognitionCardConfig
