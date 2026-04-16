import React from 'react';
import { Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import DataSourceSelect from '@/components/DataSourceSelect';
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs';
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton';
import type { DataSourceItem } from '@/services/dataSource';
import { keyValueListToObject } from '@/utils/widgetApi';
import type { WidgetApiFieldMeta } from '@/utils/widgetApiDefaults';
import {
  buildDataSourceSelectionFormValues,
  buildHeaderMap,
  UNIFIED_DATA_SOURCE_OPTIONS,
} from './dataSourceHelpers';

interface IndicatorCardDataConfigSectionProps {
  form: FormInstance;
  apiPlaceholder: string;
  apiFieldMeta?: WidgetApiFieldMeta;
}

const IndicatorCardDataConfigSection: React.FC<IndicatorCardDataConfigSectionProps> = ({
  form,
  apiPlaceholder,
  apiFieldMeta,
}) => {
  const dataSourceValue = Form.useWatch('dataSource', form) || 'static';

  const handleDataSourceSelect = (_id: string, dataSource: DataSourceItem) => {
    form.setFieldsValue(
      buildDataSourceSelectionFormValues(dataSource, {
        apiFieldName: apiFieldMeta?.name,
      }),
    );
  };

  return (
    <>
      <Form.Item
        name="dataSource"
        label="数据来源"
        initialValue="static"
        rules={[{ required: true, message: '请选择数据来源' }]}
      >
        <Select options={UNIFIED_DATA_SOURCE_OPTIONS as any} />
      </Form.Item>

      <Form.Item name="dataSourceId" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="timeout" hidden>
        <InputNumber />
      </Form.Item>

      {dataSourceValue === 'static' ? (
        <div className="form-row-2">
          <Form.Item
            name="staticValue"
            label="手动数值"
            rules={[{ required: true, message: '请输入数值内容' }]}
          >
            <Input placeholder="例如 22,522.75" />
          </Form.Item>
          <Form.Item name="staticDescription" label="手动描述">
            <Input placeholder="例如 总签约额" />
          </Form.Item>
        </div>
      ) : (
        <>
          {dataSourceValue === 'dataSource' ? (
            <Form.Item
              label="选择数据源接口"
              extra="支持按名称、接口地址、描述模糊检索，选择后会自动带入接口配置。"
            >
              <DataSourceSelect
                value={form.getFieldValue('dataSourceId')}
                onChange={handleDataSourceSelect}
                placeholder="请选择数据源接口"
              />
            </Form.Item>
          ) : null}

          <div className="empty-hint" style={{ marginBottom: 12 }}>
            接口返回示例：{`{ value: 22522.75, description: '总签约额' }`}
          </div>
          <Form.Item label="接口地址" required className="widget-api-form-item">
            <div className="widget-api-endpoint-row">
              <Form.Item name="apiMethod" noStyle initialValue="GET">
                <Select
                  className="widget-api-endpoint-row__method"
                  options={[
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="apiEndpoint"
                noStyle
                rules={[{ required: true, message: '请输入接口地址' }]}
              >
                <Input className="widget-api-endpoint-row__input" placeholder={apiPlaceholder} />
              </Form.Item>
            </div>
          </Form.Item>
          {apiFieldMeta ? (
            <Form.Item name={apiFieldMeta.name} label={apiFieldMeta.label} tooltip={apiFieldMeta.tooltip}>
              <Input placeholder={apiFieldMeta.placeholder} />
            </Form.Item>
          ) : null}
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
                    headers: buildHeaderMap(formValues.apiHeadersList),
                    query: keyValueListToObject(formValues.apiQueryList),
                    body: keyValueListToObject(formValues.apiBodyList),
                    timeout: formValues.timeout,
                    dataField:
                      apiFieldMeta?.name === 'apiDataField'
                        ? (formValues.apiDataField || apiFieldMeta.defaultValue)
                        : undefined,
                  })}
                />
              }
              debugHint="调试时会使用当前表单中的接口地址、参数配置和字段路径。"
            />
          </Form.Item>
          <div className="form-row-2">
            <Form.Item name="valueField" label="数值字段" initialValue="value">
              <Input placeholder="value" />
            </Form.Item>
            <Form.Item name="descriptionField" label="描述字段" initialValue="description">
              <Input placeholder="description" />
            </Form.Item>
          </div>
        </>
      )}
    </>
  );
};

export default IndicatorCardDataConfigSection;
