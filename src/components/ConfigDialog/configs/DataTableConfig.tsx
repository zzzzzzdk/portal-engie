import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Switch, Divider, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import { WidgetConfigProps } from './types';
import '../index.scss';

/**
 * 数据表格组件配置
 */
const DataTableConfig: React.FC<WidgetConfigProps> = () => {
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  const toggleExpand = (index: number) => {
    setExpandedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <>
      <div className="form-row-2">
         <Form.Item
           name="apiEndpoint"
           label="数据接口"
           tooltip="配置后将从接口获取数据"
         >
           <Input placeholder="/api/table-data" />
         </Form.Item>
         <Form.Item
           name="rowKey"
           label="行Key字段"
           tooltip="数据中的唯一标识字段名"
           initialValue="key"
         >
           <Input placeholder="key" />
         </Form.Item>
      </div>

      <div className="form-row-2">
        <Form.Item
          name="size"
          label="表格尺寸"
          initialValue="small"
        >
          <Select>
            <Select.Option value="small">紧凑</Select.Option>
            <Select.Option value="middle">中等</Select.Option>
            <Select.Option value="large">宽松</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          name="bordered"
          label="显示边框"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </div>

      <div className="form-row-2">
        <Form.Item
          name="scrollY"
          label="纵向滚动高度"
          initialValue={240}
        >
          <InputNumber min={100} style={{ width: '100%' }} suffix="px" />
        </Form.Item>
        <Form.Item
          name="scrollX"
          label="横向滚动宽度"
        >
          <InputNumber min={100} style={{ width: '100%' }} suffix="px" />
        </Form.Item>
      </div>

      <Divider>列置</Divider>

      <Form.List name="columns">
        {(fields, { add, remove }) => (
          <div className="config-list-container">
            {fields.map(({ key, name, ...restField }, index) => {
               const isExpanded = expandedIndices.includes(index);
               return (
                  <div key={key} className={`config-item-card ${isExpanded ? 'expanded' : ''}`}>
                     <div className="card-header" onClick={() => toggleExpand(index)}>
                        <div className="header-icon">
                           {isExpanded ? <DownOutlined /> : <RightOutlined />}
                        </div>
                        <div className="header-content">
                           <Form.Item
                              {...restField}
                              name={[name, 'title']}
                              noStyle
                              rules={[{ required: true, message: '请输入列标题' }]}
                           >
                              <Input 
                                 className="header-title-input" 
                                 placeholder="列标题" 
                                 onClick={e => e.stopPropagation()} 
                                 bordered={false}
                              />
                           </Form.Item>
                           <Form.Item shouldUpdate noStyle>
                              {({ getFieldValue }) => {
                                 const dataIndex = getFieldValue(['columns', name, 'dataIndex']);
                                 const width = getFieldValue(['columns', name, 'width']);
                                 return (
                                    <>
                                       {dataIndex && <div className="preview-tag">{dataIndex}</div>}
                                       {width && <div className="preview-tag">{width}px</div>}
                                    </>
                                 )
                              }}
                           </Form.Item>
                        </div>
                        <div className="header-actions">
                           <Tooltip title="删除">
                              <Button 
                                 type="text" 
                                 danger 
                                 size="small"
                                 icon={<DeleteOutlined />} 
                                 className="action-btn delete-btn"
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    remove(name);
                                 }}
                              />
                           </Tooltip>
                        </div>
                     </div>
                     
                     <div className="card-body">
                        <div className="body-content">
                           <div className="form-row-2">
                              <Form.Item
                                 {...restField}
                                 name={[name, 'dataIndex']}
                                 label="数据字段"
                                 rules={[{ required: true, message: '请输入数据字段' }]}
                              >
                                 <Input placeholder="dataIndex" />
                              </Form.Item>
                              <Form.Item
                                 {...restField}
                                 name={[name, 'type']}
                                 label="列类型"
                                 initialValue="text"
                              >
                                 <Select placeholder="列类型">
                                    <Select.Option value="text">文本</Select.Option>
                                    <Select.Option value="number">数字</Select.Option>
                                    <Select.Option value="tag">标签</Select.Option>
                                    <Select.Option value="date">日期</Select.Option>
                                    <Select.Option value="status">状态</Select.Option>
                                 </Select>
                              </Form.Item>
                           </div>
                           
                           <div className="form-row-2">
                              <Form.Item
                                 {...restField}
                                 name={[name, 'width']}
                                 label="列宽"
                              >
                                 <InputNumber placeholder="px" min={50} style={{ width: '100%' }} />
                              </Form.Item>
                              <Form.Item
                                 {...restField}
                                 name={[name, 'align']}
                                 label="对齐方式"
                                 initialValue="left"
                              >
                                 <Select>
                                    <Select.Option value="left">左对齐</Select.Option>
                                    <Select.Option value="center">居中</Select.Option>
                                    <Select.Option value="right">右对齐</Select.Option>
                                 </Select>
                              </Form.Item>
                           </div>

                           <div className="form-row-2">
                              <Form.Item
                                 {...restField}
                                 name={[name, 'ellipsis']}
                                 label="文本超长省略"
                                 valuePropName="checked"
                              >
                                 <Switch />
                              </Form.Item>
                              <Form.Item
                                 {...restField}
                                 name={[name, 'sorter']}
                                 label="允许排序"
                                 valuePropName="checked"
                              >
                                 <Switch />
                              </Form.Item>
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })}
            <Button
              type="dashed"
              onClick={() => {
                 add({
                   key: Date.now().toString(),
                   dataIndex: '',
                   title: '新列',
                   type: 'text',
                   align: 'left',
                 });
                 setExpandedIndices(prev => [...prev, fields.length]);
              }}
              block
              icon={<PlusOutlined />}
            >
              添加列
            </Button>
          </div>
        )}
      </Form.List>
    </>
  );
};

export default DataTableConfig;
