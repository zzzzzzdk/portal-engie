import React from 'react';
import { Button, ColorPicker, Divider, Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import DataSourceSelect from '@/components/DataSourceSelect';
import IconPicker from '@/components/IconPicker';
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs';
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton';
import type { DataSourceItem } from '@/services/dataSource';
import { JUMP_SYSTEM_OPTIONS } from '@/constants/jumpSystem';
import { keyValueListToObject } from '@/utils/widgetApi';
import { DEFAULT_NAV_GROUP_LIST_FIELD } from '@/utils/widgetApiDefaults';
import {
  buildDataSourceSelectionFormValues,
  buildHeaderMap,
  UNIFIED_DATA_SOURCE_OPTIONS,
} from './dataSourceHelpers';

interface NavGroupDataConfigSectionProps {
  form: FormInstance;
}

const NavGroupDataConfigSection: React.FC<NavGroupDataConfigSectionProps> = ({ form }) => {
  const dataSourceValue = Form.useWatch('dataSource', form) || 'customApi';

  const handleDataSourceSelect = (_id: string, dataSource: DataSourceItem) => {
    form.setFieldsValue(
      buildDataSourceSelectionFormValues(dataSource, {
        apiFieldName: 'apiListField',
      }),
    );
  };

  return (
    <>
      <Form.Item name="dataSource" label="数据来源" initialValue="customApi">
        <Select options={UNIFIED_DATA_SOURCE_OPTIONS as any} />
      </Form.Item>

      <Form.Item name="dataSourceId" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="timeout" hidden>
        <InputNumber />
      </Form.Item>

      {dataSourceValue === 'static' ? (
        <>
          <Divider style={{ margin: '12px 0' }}>手动配置项</Divider>
          <Form.List name="staticItems">
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
                      <div className="form-row-2" style={{ marginBottom: 8 }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label="名称"
                          rules={[{ required: true, message: '请输入名称' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="导航名称" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'icon']}
                          label="图标"
                          style={{ marginBottom: 0 }}
                        >
                          <IconPicker mode="simple" />
                        </Form.Item>
                      </div>
                      <Form.Item
                        {...restField}
                        name={[name, 'url']}
                        label="链接地址"
                        rules={[{ required: true, message: '请输入链接地址' }]}
                        style={{ marginBottom: 8 }}
                      >
                        <Input placeholder="例如 /dashboard 或 https://example.com" />
                      </Form.Item>
                      <div className="form-row-2" style={{ marginBottom: 8 }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'iconBgColor']}
                          label="图标背景"
                          style={{ marginBottom: 0 }}
                        >
                          <ColorPicker showText allowClear />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'iconColor']}
                          label="图标颜色"
                          style={{ marginBottom: 0 }}
                        >
                          <ColorPicker showText allowClear />
                        </Form.Item>
                      </div>
                      <div className="form-row-2" style={{ marginBottom: 8 }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'textColor']}
                          label="文字颜色"
                          style={{ marginBottom: 0 }}
                        >
                          <ColorPicker showText allowClear />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'systemId']}
                          label="所属系统"
                          style={{ marginBottom: 0 }}
                        >
                          <Select placeholder="请选择所属系统" options={JUMP_SYSTEM_OPTIONS} />
                        </Form.Item>
                      </div>
                      <Form.Item
                        {...restField}
                        name={[name, 'openInNew']}
                        label="打开方式"
                        initialValue={true}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          options={[
                            { label: '新窗口', value: true },
                            { label: '当前页', value: false },
                          ]}
                        />
                      </Form.Item>
                    </div>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加配置项
                </Button>
              </div>
            )}
          </Form.List>
        </>
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
                <Input className="widget-api-endpoint-row__input" placeholder="/api/nav-group" />
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item
            name="apiListField"
            label="列表字段"
            tooltip="默认使用 payload.groups.list，修改后将严格按填写的字段路径解析。"
          >
            <Input placeholder={DEFAULT_NAV_GROUP_LIST_FIELD} />
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
                    headers: buildHeaderMap(formValues.apiHeadersList),
                    query: keyValueListToObject(formValues.apiQueryList),
                    body: keyValueListToObject(formValues.apiBodyList),
                    timeout: formValues.timeout,
                    listField: formValues.apiListField || DEFAULT_NAV_GROUP_LIST_FIELD,
                  })}
                />
              }
              debugHint="调试时会使用当前表单中的接口地址、参数配置和列表字段路径。"
            />
          </Form.Item>
          <div className="empty-hint" style={{ marginTop: 8 }}>
            导航列表默认读取 `payload.groups.list`，修改后会按你配置的字段路径解析。
          </div>
        </>
      )}
    </>
  );
};

export default NavGroupDataConfigSection;
