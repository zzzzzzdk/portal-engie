import React from 'react';
import { Form, Input, InputNumber, Select, Switch } from 'antd';
import type { FormInstance } from 'antd';
import DataSourceSelect from '@/components/DataSourceSelect';
import WidgetApiConfigTabs from '@/components/WidgetApiConfigTabs';
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton';
import type { DataSourceItem } from '@/services/dataSource';
import { keyValueListToObject } from '@/utils/widgetApi';
import type { Widget } from '@/types';
import type { WidgetApiFieldMeta } from '@/utils/widgetApiDefaults';
import {
  buildDataSourceSelectionFormValues,
  buildHeaderMap,
  UNIFIED_DATA_SOURCE_OPTIONS,
  validateJson,
} from './dataSourceHelpers';

interface StaticDataEditorMeta {
  placeholder: string;
  extra: string;
}

interface StaticDataPreview {
  title: string;
  content: string;
}

interface PaginationDefaults {
  pageParam?: string;
  pageSizeParam?: string;
  totalField?: string;
  currentField?: string;
  pageSizeField?: string;
}

interface CommonWidgetDataConfigSectionProps {
  form: FormInstance;
  widget: Widget;
  apiPlaceholder: string;
  apiFieldMeta?: WidgetApiFieldMeta;
  paginationDefaults?: PaginationDefaults;
  staticDataEditorMeta: StaticDataEditorMeta;
  staticDataPreview: StaticDataPreview;
}

const CommonWidgetDataConfigSection: React.FC<CommonWidgetDataConfigSectionProps> = ({
  form,
  widget,
  apiPlaceholder,
  apiFieldMeta,
  paginationDefaults,
  staticDataEditorMeta,
  staticDataPreview,
}) => {
  const dataSourceValue = Form.useWatch('dataSource', form) || 'customApi';

  const handleDataSourceSelect = (_id: string, dataSource: DataSourceItem) => {
    form.setFieldsValue(
      buildDataSourceSelectionFormValues(dataSource, {
        apiFieldName: apiFieldMeta?.name,
        includePagination: widget.type === 'dataTable',
      }),
    );
  };

  return (
    <>
      <Form.Item
        name="dataSource"
        label="数据来源"
        initialValue="customApi"
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
        <>
          <Form.Item
            name="staticData"
            label="手动配置"
            rules={[
              { required: true, message: '请输入手动配置内容' },
              { validator: validateJson },
            ]}
            extra={staticDataEditorMeta.extra}
            className="static-data-editor"
          >
            <Input.TextArea
              rows={10}
              placeholder={staticDataEditorMeta.placeholder}
              autoSize={{ minRows: 6, maxRows: 16 }}
            />
          </Form.Item>
          <div className="static-data-preview">
            <div className="static-data-preview__summary">{staticDataPreview.title}</div>
            <pre className="static-data-preview__content">{staticDataPreview.content}</pre>
          </div>
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

          <Form.Item
            label="接口地址"
            required
            extra={
              widget.type === 'news'
                ? '接口返回需包含新闻列表，以及标题、摘要、链接等映射字段。'
                : widget.type === 'topList'
                  ? '接口返回需包含排行列表，以及名称、数值、变化等映射字段。'
                  : undefined
            }
            className="widget-api-form-item"
          >
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
                    listField:
                      apiFieldMeta?.name === 'apiListField'
                        ? (formValues.apiListField || apiFieldMeta.defaultValue)
                        : undefined,
                    pagination:
                      widget.type === 'dataTable' && formValues.paginationMode === 'pagination'
                        ? {
                          mode: 'pagination',
                          pageParam: formValues.paginationConfig?.pageParam || paginationDefaults?.pageParam,
                          pageSizeParam:
                            formValues.paginationConfig?.pageSizeParam || paginationDefaults?.pageSizeParam,
                          totalField: formValues.paginationConfig?.totalField || paginationDefaults?.totalField,
                          currentField:
                            formValues.paginationConfig?.currentField || paginationDefaults?.currentField,
                          pageSizeField:
                            formValues.paginationConfig?.pageSizeField || paginationDefaults?.pageSizeField,
                        }
                        : undefined,
                  })}
                  buildPageState={formValues =>
                    widget.type === 'dataTable' && formValues.paginationMode === 'pagination'
                      ? {
                        current: formValues.paginationConfig?.page || 1,
                        pageSize: formValues.paginationConfig?.pageSize || 10,
                      }
                      : undefined
                  }
                />
              }
              debugHint="调试时会使用当前表单中的接口地址、参数配置和字段路径。"
            />
          </Form.Item>
        </>
      )}

      {widget.type === 'dataTable' ? (
        <>
          <Form.Item name="paginationMode" label="分页模式" initialValue="none">
            <Select
              options={[
                { label: '不分页', value: 'none' },
                { label: '分页', value: 'pagination' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paginationMode !== cur.paginationMode}>
            {({ getFieldValue }) => {
              if (getFieldValue('paginationMode') !== 'pagination') {
                return null;
              }

              return (
                <>
                  <div className="form-row-3">
                    <Form.Item name={['paginationConfig', 'page']} label="初始页码" initialValue={1}>
                      <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={['paginationConfig', 'pageSize']} label="每页条数" initialValue={10}>
                      <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name={['paginationConfig', 'showTotal']}
                      label="显示总数"
                      valuePropName="checked"
                      initialValue={false}
                    >
                      <Switch />
                    </Form.Item>
                  </div>
                  <div className="form-row-2">
                    <Form.Item name={['paginationConfig', 'pageParam']} label="页码参数名">
                      <Input placeholder={paginationDefaults?.pageParam || 'page'} />
                    </Form.Item>
                    <Form.Item name={['paginationConfig', 'pageSizeParam']} label="每页条数参数名">
                      <Input placeholder={paginationDefaults?.pageSizeParam || 'page_size'} />
                    </Form.Item>
                  </div>
                  <div className="form-row-3">
                    <Form.Item name={['paginationConfig', 'totalField']} label="总数字段路径">
                      <Input placeholder={paginationDefaults?.totalField || 'data.total'} />
                    </Form.Item>
                    <Form.Item name={['paginationConfig', 'currentField']} label="当前页字段路径">
                      <Input placeholder={paginationDefaults?.currentField || 'data.page'} />
                    </Form.Item>
                    <Form.Item name={['paginationConfig', 'pageSizeField']} label="每页条数字段路径">
                      <Input placeholder={paginationDefaults?.pageSizeField || 'data.page_size'} />
                    </Form.Item>
                  </div>
                </>
              );
            }}
          </Form.Item>
        </>
      ) : null}
    </>
  );
};

export default CommonWidgetDataConfigSection;
