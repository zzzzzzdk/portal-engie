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
import {
  buildHeaderMap,
  isDataSourceSelectionLocked,
  UNIFIED_DATA_SOURCE_OPTIONS,
} from './dataSourceHelpers';

interface HeaderBarNavDataConfigSectionProps {
  form: FormInstance;
}

const buildHeaderDataSourceFormValues = (dataSource: DataSourceItem) => ({
  navDataSourceId: dataSource.id,
  navApiEndpoint: dataSource.url,
  navApiMethod: dataSource.method,
  navApiHeadersList: (dataSource.requestConfig?.headersList || []).map(item => ({
    key: item?.key || '',
    value: item?.value || '',
  })),
  navApiQueryList: (dataSource.requestConfig?.queryList || []).map(item => ({
    key: item?.key || '',
    value: item?.value || '',
  })),
  navApiBodyList: (dataSource.requestConfig?.bodyList || []).map(item => ({
    key: item?.key || '',
    value: item?.value || '',
  })),
  navApiListField: dataSource.listField || '',
  navTimeout: dataSource.timeout,
});

const HeaderBarNavDataConfigSection: React.FC<HeaderBarNavDataConfigSectionProps> = ({ form }) => {
  const showNavMenu = Form.useWatch('showNavMenu', form) ?? false;
  const navDataSource = Form.useWatch('navDataSource', form) || 'customApi';
  const navDataSourceId = Form.useWatch('navDataSourceId', form);
  const isSelectedDataSourceLocked = isDataSourceSelectionLocked(navDataSource, navDataSourceId);

  const handleDataSourceSelect = (_id: string, dataSource: DataSourceItem) => {
    form.setFieldsValue(buildHeaderDataSourceFormValues(dataSource));
  };

  if (!showNavMenu) {
    return <div className="empty-hint">请先在“组件配置”中开启“显示导航区域”开关</div>;
  }

  return (
    <>
      <Form.Item name="navDataSource" label="数据来源" initialValue="customApi">
        <Select options={UNIFIED_DATA_SOURCE_OPTIONS as any} />
      </Form.Item>

      <Form.Item name="navTextColor" label="文字颜色">
        <ColorPicker showText allowClear />
      </Form.Item>

      <Form.Item name="navDataSourceId" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="navTimeout" hidden>
        <InputNumber />
      </Form.Item>

      {navDataSource === 'static' ? (
        <>
          <Divider style={{ margin: '12px 0' }}>手动配置</Divider>
          <Form.List name="navItems">
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
                          name={[name, 'name']}
                          label="导航名称"
                          rules={[{ required: true, message: '请输入导航名称' }]}
                        >
                          <Input placeholder="例如：工作台" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'icon']} label="图标">
                          <IconPicker mode="simple" />
                        </Form.Item>
                      </div>
                      <div className="form-row-2">
                        <Form.Item
                          {...restField}
                          name={[name, 'url']}
                          label="跳转地址"
                          rules={[{ required: true, message: '请输入跳转地址' }]}
                        >
                          <Input placeholder="/dashboard 或 https://example.com" />
                        </Form.Item>
                        {/* 暂时停用所属系统配置，保留实现以便后续恢复
                        <Form.Item {...restField} name={[name, 'systemId']} label="所属系统">
                          <Select placeholder="请选择所属系统" options={JUMP_SYSTEM_OPTIONS} allowClear />
                        </Form.Item>
                        */}
                      </div>
                      <Form.Item {...restField} name={[name, 'openInNew']} label="打开方式" initialValue={false}>
                        <Select
                          options={[
                            { label: '当前页打开', value: false },
                            { label: '新窗口打开', value: true },
                          ]}
                        />
                      </Form.Item>
                    </div>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add({ openInNew: false })} block icon={<PlusOutlined />}>
                  添加导航项
                </Button>
              </div>
            )}
          </Form.List>
        </>
      ) : (
        <>
          {navDataSource === 'dataSource' ? (
            <Form.Item
              label="选择数据源接口"
              extra="支持按名称模糊搜索，选择后会自动带入接口配置。"
            >
              <DataSourceSelect
                value={form.getFieldValue('navDataSourceId')}
                onChange={handleDataSourceSelect}
                placeholder="请选择数据源接口"
              />
            </Form.Item>
          ) : null}

          <Form.Item label="接口地址" required className="widget-api-form-item">
            <div className="widget-api-endpoint-row">
              <Form.Item name="navApiMethod" noStyle initialValue="GET">
                <Select
                  className="widget-api-endpoint-row__method"
                  disabled={isSelectedDataSourceLocked}
                  options={[
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="navApiEndpoint"
                noStyle
                rules={[{ required: true, message: '请输入接口地址' }]}
              >
                <Input
                  className="widget-api-endpoint-row__input"
                  placeholder="/api/header-nav"
                  disabled={isSelectedDataSourceLocked}
                />
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item
            name="navApiListField"
            label="列表字段"
            tooltip="可填写接口返回中的导航列表字段路径，例如 data.list。留空时会自动尝试常见结构。"
          >
            <Input placeholder="例如：data.list" disabled={isSelectedDataSourceLocked} />
          </Form.Item>

          <Form.Item label="参数配置" className="widget-api-form-item">
            <WidgetApiConfigTabs
              form={form}
              methodName="navApiMethod"
              headersName="navApiHeadersList"
              queryName="navApiQueryList"
              bodyName="navApiBodyList"
              debugContent={
                <WidgetApiDebugButton
                  form={form}
                  buildConfig={formValues => ({
                    endpoint: formValues.navApiEndpoint,
                    method: formValues.navApiMethod || 'GET',
                    headers: buildHeaderMap(formValues.navApiHeadersList),
                    query: keyValueListToObject(formValues.navApiQueryList),
                    body: keyValueListToObject(formValues.navApiBodyList),
                    timeout: formValues.navTimeout,
                    listField: formValues.navApiListField || undefined,
                  })}
                />
              }
              debugHint="调试时会使用当前表单中的接口地址、参数配置和列表字段。"
            />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }}>字段映射</Divider>
          <div className="form-row-3">
            <Form.Item name={['navFieldMapping', 'name']} label="名称字段">
              <Input placeholder="name" />
            </Form.Item>
            <Form.Item name={['navFieldMapping', 'url']} label="链接字段">
              <Input placeholder="url" />
            </Form.Item>
            <Form.Item name={['navFieldMapping', 'icon']} label="图标字段">
              <Input placeholder="icon" />
            </Form.Item>
          </div>
        </>
      )}
    </>
  );
};

export default HeaderBarNavDataConfigSection;
