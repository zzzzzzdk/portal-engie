import React from 'react';
import { Form, Input, Select, Switch, Radio, Divider, Button, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import EventRouteConfig from '@/components/EventRouteConfig';
import { WidgetConfigProps } from './types';

/**
 * 自定义表单组件配置 - 数据与交互 Tab
 */
const CustomFormConfig: React.FC<WidgetConfigProps> = ({ widget }) => {
  const form = Form.useFormInstance();
  const submitMethod = Form.useWatch('submitMethod', form) || 'eventRoute';

  return (
    <>
      <Divider>数据交互</Divider>
      <Form.Item name="submitMethod" label="提交方式">
        <Radio.Group>
          <Radio.Button value="api">API接口</Radio.Button>
          <Radio.Button value="eventRoute">事件路由</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {submitMethod === 'api' && (
        <>
          <div className="form-row-2">
            <Form.Item name="apiEndpoint" label="API地址" rules={[{ required: true }]}>
              <Input placeholder="/api/form-submit" />
            </Form.Item>
            <Form.Item name="apiMethod" label="请求方式">
              <Select placeholder="POST">
                <Select.Option value="POST">POST</Select.Option>
                <Select.Option value="PUT">PUT</Select.Option>
                <Select.Option value="PATCH">PATCH</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item label="请求头" tooltip="自定义 HTTP 请求头，如 Authorization、Content-Type 等">
            <Form.List name="apiHeadersList">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item {...restField} name={[name, 'key']} noStyle rules={[{ required: true, message: '请输入Key' }]}>
                        <Input placeholder="Header Key" style={{ width: 160 }} />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'value']} noStyle rules={[{ required: true, message: '请输入Value' }]}>
                        <Input placeholder="Header Value" style={{ width: 200 }} />
                      </Form.Item>
                      <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                    添加请求头
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        </>
      )}

      {submitMethod === 'eventRoute' && (
        <Form.Item name="eventRoutes" label="事件路由" tooltip="配置表单提交结果发送到哪个微应用">
          <EventRouteConfig
            currentWidgetId={widget.id}
            currentSystemId={undefined}
            currentModuleId={undefined}
          />
        </Form.Item>
      )}

      <Divider>提交反馈</Divider>
      <div className="form-row-2">
        <Form.Item name="successMessage" label="成功提示">
          <Input placeholder="提交成功" />
        </Form.Item>
        <Form.Item name="failureMessage" label="失败提示">
          <Input placeholder="提交失败" />
        </Form.Item>
      </div>
      <Form.Item name="successResetForm" label="成功后重置表单" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );
};

export default CustomFormConfig;
