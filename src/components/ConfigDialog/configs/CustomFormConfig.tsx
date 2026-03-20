import React from 'react';
import { Form, Input, Select, Switch, Radio, Divider } from 'antd';
import EventRouteConfig from '@/components/EventRouteConfig';
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton';
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs';
import { keyValueListToObject } from '@/utils/widgetApi';
import { MicroAppEventType } from '@/types';
import { WidgetConfigProps } from './types';

const FORM_SENDER_EVENTS = [
  { id: 'form-submit', type: MicroAppEventType.DATA_SUBMIT, name: '表单提交' },
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
          <Radio.Button value="api">API 接口</Radio.Button>
          <Radio.Button value="eventRoute">事件路由</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {submitMethod === 'api' && (
        <>
          <Form.Item label="接口地址" required className="widget-api-form-item">
            <div className="widget-api-endpoint-row">
              <Form.Item name="apiMethod" noStyle initialValue="POST">
                <Select
                  className="widget-api-endpoint-row__method"
                  options={[
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
                <Input className="widget-api-endpoint-row__input" placeholder="/api/form-submit" />
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
              showQueryTab={false}
              debugContent={
                <WidgetApiDebugButton
                  form={form}
                  buildConfig={formValues => ({
                    endpoint: formValues.apiEndpoint,
                    method: formValues.apiMethod || 'POST',
                    headers: buildHeaders(formValues.apiHeadersList),
                    body: keyValueListToObject(formValues.apiBodyList),
                  })}
                />
              }
              debugHint="调试时将使用当前提交接口地址、请求头和 Body 参数。"
            />
          </Form.Item>
        </>
      )}

      {submitMethod === 'eventRoute' && (
        <Form.Item name="eventRoutes" label="事件路由" tooltip="配置表单提交结果发送到哪个微应用">
          <EventRouteConfig
            currentWidgetId={widget.id}
            currentSystemId={undefined}
            currentModuleId={undefined}
            senderEvents={FORM_SENDER_EVENTS}
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
