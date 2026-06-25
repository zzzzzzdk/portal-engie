import React from 'react';
import { Button, ColorPicker, Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { Widget } from '@/types';
import EventRouteConfig from '@/components/EventRouteConfig';
import CarouselDataConfig from './CarouselDataConfig';
import ChartDataConfig from './ChartDataConfig';
import CommonWidgetDataConfigSection from './CommonWidgetDataConfigSection';
import CustomFormConfig from './CustomFormConfig';
import HeaderBarNavDataConfigSection from './HeaderBarNavDataConfigSection';
import IndicatorCardDataConfigSection from './IndicatorCardDataConfigSection';
import IndicatorCardListDataConfigSection from './IndicatorCardListDataConfigSection';
import NavGroupDataConfigSection from './NavGroupDataConfigSection';
import QueryFilterDataConfig from './QueryFilterDataConfig';
import SearchConfig from './SearchConfig';

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

interface ApiFieldMeta {
  name: 'apiDataField' | 'apiListField';
  label: string;
  defaultValue: string;
  placeholder: string;
  tooltip: string;
}

interface ConfigDialogDataTabProps {
  form: FormInstance;
  widget: Widget;
  apiPlaceholder: string;
  apiFieldMeta?: ApiFieldMeta;
  paginationDefaults?: PaginationDefaults;
  staticDataEditorMeta: StaticDataEditorMeta;
  staticDataPreview: StaticDataPreview;
}

const DEFAULT_STATS_ITEMS = [
  { key: 'activeUsers', label: '活跃用户' },
  { key: 'idleRate', label: '空闲率' },
];

const ConfigDialogDataTab: React.FC<ConfigDialogDataTabProps> = ({
  form,
  widget,
  apiPlaceholder,
  apiFieldMeta,
  paginationDefaults,
  staticDataEditorMeta,
  staticDataPreview,
}) => {
  const statsItemsValue = Form.useWatch('statsItems', form);
  const statsFieldPreview = (Array.isArray(statsItemsValue) && statsItemsValue.length > 0
    ? statsItemsValue
    : DEFAULT_STATS_ITEMS)
    .map((item: any) => item?.key)
    .filter(Boolean)
    .join(', ');

  return (
    <>
      {['chart', 'stats', 'recognitionCard', 'dataTable', 'news', 'topList'].includes(widget.type) && (
        <CommonWidgetDataConfigSection
          form={form}
          widget={widget}
          apiPlaceholder={apiPlaceholder}
          apiFieldMeta={apiFieldMeta}
          paginationDefaults={paginationDefaults}
          staticDataEditorMeta={staticDataEditorMeta}
          staticDataPreview={staticDataPreview}
        />
      )}

      {widget.type === 'stats' && (
        <>
          <div className="empty-hint" style={{ marginBottom: 12 }}>
            {`接口建议返回对象格式。当前指标字段：${statsFieldPreview || 'activeUsers, idleRate'}`}
          </div>
          <Form.List name="statsItems">
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
                          name={[name, 'label']}
                          label="显示名称"
                          rules={[{ required: true, message: '请输入显示名称' }]}
                        >
                          <Input placeholder="例如：活跃用户" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'key']}
                          label="数据字段"
                          rules={[{ required: true, message: '请输入数据字段名' }]}
                          tooltip="接口响应对象中的字段名"
                        >
                          <Input placeholder="activeUsers" />
                        </Form.Item>
                      </div>
                      <div className="form-row-3">
                        <Form.Item {...restField} name={[name, 'precision']} label="小数位数">
                          <InputNumber min={0} max={6} precision={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'suffix']} label="数值后缀">
                          <Input placeholder="例如 %" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'trend']} label="趋势方向">
                          <Select
                            allowClear
                            placeholder="自动"
                            options={[
                              { label: '上升', value: 'up' },
                              { label: '下降', value: 'down' },
                              { label: '不显示', value: 'none' },
                            ]}
                          />
                        </Form.Item>
                      </div>
                      <Form.Item {...restField} name={[name, 'color']} label="自定义颜色">
                        <ColorPicker showText allowClear />
                      </Form.Item>
                    </div>
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ key: `metric_${fields.length + 1}`, label: 'New Metric' })}
                  block
                  icon={<PlusOutlined />}
                >
                  添加指标
                </Button>
              </div>
            )}
          </Form.List>
        </>
      )}

      {widget.type === 'chart' && <ChartDataConfig form={form} widget={widget} />}

      {widget.type === 'indicatorCard' && (
        <IndicatorCardDataConfigSection
          form={form}
          apiPlaceholder={apiPlaceholder}
          apiFieldMeta={apiFieldMeta}
        />
      )}

      {widget.type === 'indicatorCardList' && (
        <IndicatorCardListDataConfigSection
          form={form}
          apiPlaceholder={apiPlaceholder}
          apiFieldMeta={apiFieldMeta}
        />
      )}

      {widget.type === 'news' && (
        <>
          <div className="form-row-2">
            <Form.Item name="maxItems" label="最大条数" initialValue={10}>
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="avatarField" label="封面字段" initialValue="avatar">
              <Input placeholder="avatar" />
            </Form.Item>
          </div>
          <div className="form-row-2">
            <Form.Item name="titleField" label="标题字段" initialValue="title">
              <Input placeholder="title" />
            </Form.Item>
            <Form.Item name="descriptionField" label="摘要字段" initialValue="description">
              <Input placeholder="description" />
            </Form.Item>
          </div>
          <div className="form-row-2">
            <Form.Item name="urlField" label="链接字段" initialValue="url">
              <Input placeholder="url" />
            </Form.Item>
            <div />
          </div>
        </>
      )}

      {widget.type === 'topList' && (
        <>
          <div className="form-row-2">
            <Form.Item name="nameField" label="名称字段" initialValue="name">
              <Input placeholder="name" />
            </Form.Item>
            <Form.Item name="valueField" label="数值字段" initialValue="value">
              <Input placeholder="value" />
            </Form.Item>
          </div>
          <div className="form-row-2">
            <Form.Item name="changeField" label="变化字段" initialValue="change">
              <Input placeholder="change" />
            </Form.Item>
            <Form.Item name="unitField" label="单位字段" initialValue="unit">
              <Input placeholder="unit" />
            </Form.Item>
          </div>
          <div className="form-row-2">
            <Form.Item name="maxItems" label="显示条数" initialValue={10}>
              <InputNumber min={1} max={50} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="highlightTop" label="高亮前几名" initialValue={3}>
              <InputNumber min={0} max={10} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div className="form-row-2">
            <Form.Item name="listTitle" label="列表标题">
              <Input placeholder="例如：月度排行榜" />
            </Form.Item>
            <div />
          </div>
        </>
      )}

      {widget.type === 'navGroup' && <NavGroupDataConfigSection form={form} />}

      {widget.type === 'headerBar' && <HeaderBarNavDataConfigSection form={form} />}

      {widget.type === 'carousel' && <CarouselDataConfig form={form} widget={widget} />}

      {widget.type === 'microApp' && (
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.systemId !== curr.systemId || prev.moduleId !== curr.moduleId}
        >
          {({ getFieldValue }) => (
            <Form.Item name="eventRoutes" label="事件路由">
              <EventRouteConfig
                currentWidgetId={widget.id}
                currentSystemId={getFieldValue('systemId')}
                currentModuleId={getFieldValue('moduleId')}
              />
            </Form.Item>
          )}
        </Form.Item>
      )}

      {widget.type === 'search' && <SearchConfig form={form} widget={widget} />}
      {widget.type === 'queryFilter' && <QueryFilterDataConfig form={form} widget={widget} />}
      {widget.type === 'customForm' && <CustomFormConfig form={form} widget={widget} />}
    </>
  );
};

export default ConfigDialogDataTab;
