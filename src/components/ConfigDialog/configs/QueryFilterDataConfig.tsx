import React from 'react';
import { Divider, Form, Input, Radio, Select } from 'antd';
import EventRouteConfig from '@/components/EventRouteConfig';
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton';
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs';
import { keyValueListToObject } from '@/utils/widgetApi';
import { MicroAppEventType } from '@/types';
import { WidgetConfigProps } from './types';

const QUERY_FILTER_SENDER_EVENTS = [
  { id: 'query-filter-submit', type: MicroAppEventType.DATA_SUBMIT, name: '查询筛选提交' },
];

const buildHeaders = (headersList?: Array<{ key?: string; value?: string }>) => {
  if (!Array.isArray(headersList)) {
    return undefined;
  }

  const headers = headersList.reduce<Record<string, string>>((result, item) => {
    const key = item?.key?.trim();
    if (key) {
      result[key] = item.value || '';
    }
    return result;
  }, {});

  return Object.keys(headers).length ? headers : undefined;
};

const QueryFilterDataConfig: React.FC<WidgetConfigProps> = ({ widget }) => {
  const form = Form.useFormInstance();
  const submitMethod = Form.useWatch('submitMethod', form) || 'eventRoute';

  return (
    <>
      <Divider>数据交互</Divider>
      <Form.Item
        name="submitMethod"
        label="提交方式"
        layout="horizontal"
        colon={false}
      >
        <Radio.Group>
          <Radio.Button value="api">API 接口</Radio.Button>
          <Radio.Button value="eventRoute">事件路由</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {submitMethod === 'api' && (
        <>
          <Form.Item label="接口地址" required className="widget-api-form-item">
            <div className="widget-api-endpoint-row">
              <Form.Item name="apiMethod" noStyle initialValue="GET">
                <Select
                  className="widget-api-endpoint-row__method"
                  options={[
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'PATCH', label: 'PATCH' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="apiEndpoint"
                noStyle
                rules={[{ required: true, message: '请输入接口地址' }]}
              >
                <Input className="widget-api-endpoint-row__input" placeholder="/api/query-filter" />
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item label="参数配置" className="widget-api-form-item">
            <WidgetApiConfigTabs
              form={form}
              methodName="apiMethod"
              headersName="apiHeadersList"
              queryName="apiQueryList"
              bodyName="apiBodyList"
              debugContent={
                <WidgetApiDebugButton
                  form={form}
                  buildConfig={formValues => ({
                    endpoint: formValues.apiEndpoint,
                    method: formValues.apiMethod || 'GET',
                    headers: buildHeaders(formValues.apiHeadersList),
                    query: keyValueListToObject(formValues.apiQueryList),
                    body: keyValueListToObject(formValues.apiBodyList),
                  })}
                />
              }
              debugHint="GET 请求只允许配置 Query 参数，Body 配置将被禁用。"
            />
          </Form.Item>
        </>
      )}

      {submitMethod === 'eventRoute' && (
        <Form.Item
          name="eventRoutes"
          label="事件路由"
          tooltip="查询筛选提交时，将按旧搜索组件结构发送事件。"
        >
          <EventRouteConfig
            currentWidgetId={widget.id}
            currentSystemId={undefined}
            currentModuleId={undefined}
            senderEvents={QUERY_FILTER_SENDER_EVENTS}
          />
        </Form.Item>
      )}
    </>
  );
};

export default QueryFilterDataConfig;
