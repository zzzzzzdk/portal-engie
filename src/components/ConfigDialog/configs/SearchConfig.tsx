import React from 'react';
import { Form, Input, Select, Radio, Divider, Button, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import EventRouteConfig from '@/components/EventRouteConfig';
import { MicroAppEventType } from '@/types';
import { WidgetConfigProps } from './types';

const SEARCH_SENDER_EVENTS = [
  { id: 'search-submit', type: MicroAppEventType.DATA_SUBMIT, name: '搜索提交' },
];

// 验证 JSON 格式
const validateJson = (_: any, value: string) => {
  if (!value) {
    return Promise.resolve();
  }
  try {
    JSON.parse(value);
    return Promise.resolve();
  } catch {
    return Promise.reject('请输入合法的 JSON 格式');
  }
};

/**
 * 搜索组件配置 - 数据交互
 */
const SearchConfig: React.FC<WidgetConfigProps> = ({ widget }) => {
  const form = Form.useFormInstance();
  const submitMethod = Form.useWatch('submitMethod', form) || 'eventRoute';
  const apiMethod = Form.useWatch('apiMethod', form) || 'GET';

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
              <Input placeholder="/api/search" />
            </Form.Item>
            <Form.Item name="apiMethod" label="请求方式">
              <Select placeholder="GET">
                <Select.Option value="GET">GET</Select.Option>
                <Select.Option value="POST">POST</Select.Option>
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
          {apiMethod === 'POST' && (
            <Form.Item
              name="apiBody"
              label="请求参数(JSON)"
              tooltip="POST 请求体，请输入合法的 JSON 格式"
              rules={[{ validator: validateJson }]}
            >
              <Input.TextArea
                rows={4}
                placeholder='{"key": "value"}'
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          )}
        </>
      )}

      {submitMethod === 'eventRoute' && (
        <Form.Item
          name="eventRoutes"
          label="事件路由"
          tooltip="配置搜索结果发送到哪个微应用"
        >
          <EventRouteConfig
            currentWidgetId={widget.id}
            currentSystemId={undefined}
            currentModuleId={undefined}
            senderEvents={SEARCH_SENDER_EVENTS}
          />
        </Form.Item>
      )}
    </>
  );
};

export default SearchConfig;
