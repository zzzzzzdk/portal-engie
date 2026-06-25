import React from 'react'
import { Button, ColorPicker, Form, Input, InputNumber, Select } from 'antd'
import type { FormInstance } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import DataSourceSelect from '@/components/DataSourceSelect'
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs'
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton'
import type { DataSourceItem } from '@/services/dataSource'
import { keyValueListToObject } from '@/utils/widgetApi'
import type { WidgetApiFieldMeta } from '@/utils/widgetApiDefaults'
import {
  buildDataSourceSelectionFormValues,
  buildHeaderMap,
  isDataSourceSelectionLocked,
  UNIFIED_DATA_SOURCE_OPTIONS,
} from './dataSourceHelpers'

interface IndicatorCardListDataConfigSectionProps {
  form: FormInstance
  apiPlaceholder: string
  apiFieldMeta?: WidgetApiFieldMeta
}

const IndicatorCardListDataConfigSection: React.FC<IndicatorCardListDataConfigSectionProps> = ({
  form,
  apiPlaceholder,
  apiFieldMeta,
}) => {
  const dataSourceValue = Form.useWatch('dataSource', form) || 'static'
  const dataSourceIdValue = Form.useWatch('dataSourceId', form)
  const indicatorValueColorValue = Form.useWatch('indicatorValueColor', form)
  const indicatorDescriptionColorValue = Form.useWatch('indicatorDescriptionColor', form)
  const isSelectedDataSourceLocked = isDataSourceSelectionLocked(dataSourceValue, dataSourceIdValue)

  const handleDataSourceSelect = (_id: string, dataSource: DataSourceItem) => {
    form.setFieldsValue(
      buildDataSourceSelectionFormValues(dataSource, {
        apiFieldName: apiFieldMeta?.name,
      }),
    )
  }

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
                    <div className="form-row-2">
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        label="数值内容"
                        rules={[{ required: true, message: '请输入数值内容' }]}
                      >
                        <Input placeholder="例如 22,522.75" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'description']} label="文案内容">
                        <Input placeholder="例如 总签约额" />
                      </Form.Item>
                    </div>
                    <div className="form-row-2">
                      <Form.Item
                        {...restField}
                        name={[name, 'valueColor']}
                        label="数值颜色"
                        tooltip="留空时继承样式属性中的数值颜色"
                        getValueProps={value => ({
                          value: value ?? indicatorValueColorValue,
                        })}
                      >
                        <ColorPicker showText allowClear />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'descriptionColor']}
                        label="文案颜色"
                        tooltip="留空时继承样式属性中的文案颜色"
                        getValueProps={value => ({
                          value: value ?? indicatorDescriptionColorValue,
                        })}
                      >
                        <ColorPicker showText allowClear />
                      </Form.Item>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="dashed"
                onClick={() =>
                  add({
                    value: '',
                    description: '',
                    valueColor: undefined,
                    descriptionColor: undefined,
                  })
                }
                block
                icon={<PlusOutlined />}
              >
                添加指标项
              </Button>
            </div>
          )}
        </Form.List>
      ) : (
        <>
          {dataSourceValue === 'dataSource' ? (
            <Form.Item
              label="选择数据源接口"
              extra="支持按名称模糊检索，选择后会自动带入接口配置。"
            >
              <DataSourceSelect
                value={form.getFieldValue('dataSourceId')}
                onChange={handleDataSourceSelect}
                placeholder="请选择数据源接口"
              />
            </Form.Item>
          ) : null}

          <div className="empty-hint" style={{ marginBottom: 12 }}>
            接口返回示例：`[{'{'} value: 22522.75, description: '总签约额', valueColor: '#1677ff',
            descriptionColor: '#52c41a' {'}'}]`
          </div>
          <Form.Item label="接口地址" required className="widget-api-form-item">
            <div className="widget-api-endpoint-row">
              <Form.Item name="apiMethod" noStyle initialValue="GET">
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
                name="apiEndpoint"
                noStyle
                rules={[{ required: true, message: '请输入接口地址' }]}
              >
                <Input
                  className="widget-api-endpoint-row__input"
                  placeholder={apiPlaceholder}
                  disabled={isSelectedDataSourceLocked}
                />
              </Form.Item>
            </div>
          </Form.Item>
          {apiFieldMeta ? (
            <Form.Item
              name={apiFieldMeta.name}
              label={apiFieldMeta.label}
              tooltip={apiFieldMeta.tooltip}
            >
              <Input
                placeholder={apiFieldMeta.placeholder}
                disabled={isSelectedDataSourceLocked}
              />
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
                    listField:
                      apiFieldMeta?.name === 'apiListField'
                        ? (formValues.apiListField || apiFieldMeta.defaultValue)
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
            <Form.Item name="descriptionField" label="文案字段" initialValue="description">
              <Input placeholder="description" />
            </Form.Item>
          </div>
        </>
      )}
    </>
  )
}

export default IndicatorCardListDataConfigSection
