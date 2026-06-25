import React, { useState } from 'react';
import { Form, Input, Select, Button, InputNumber, Divider, Tooltip, ColorPicker } from 'antd';
import { PlusOutlined, DeleteOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import { WidgetConfigProps } from './types';
import IconRenderer from '@/components/IconRenderer';
import IconPicker from '@/components/IconPicker';
import { JUMP_SYSTEM_OPTIONS } from '@/constants/jumpSystem';
import '../index.scss';

/**
 * 链接组件配置
 */
const LinkConfig: React.FC<WidgetConfigProps> = () => {
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
          name="layout"
          label="布局方式"
          initialValue="button"
        >
          <Select>
            <Select.Option value="button">按钮布局</Select.Option>
            <Select.Option value="list">列表布局</Select.Option>
            <Select.Option value="card">卡片布局</Select.Option>
          </Select>
        </Form.Item>
      </div>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => prevValues.layout !== currentValues.layout}
      >
        {({ getFieldValue }) => {
          const layout = getFieldValue('layout');
          return (
            <div className="form-row-2">
              {layout === 'button' && (
                <>
                  <Form.Item
                    name="buttonShape"
                    label="按钮形状"
                    initialValue="circle"
                  >
                    <Select>
                      <Select.Option value="circle">圆形</Select.Option>
                      <Select.Option value="default">默认</Select.Option>
                      <Select.Option value="round">圆角</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="buttonSize"
                    label="按钮大小"
                    initialValue="large"
                  >
                    <Select>
                      <Select.Option value="small">小</Select.Option>
                      <Select.Option value="middle">中</Select.Option>
                      <Select.Option value="large">大</Select.Option>
                    </Select>
                  </Form.Item>
                </>
              )}
              {layout === 'card' && (
                <Form.Item
                  name="columns"
                  label="列数"
                  initialValue={4}
                >
                  <InputNumber min={1} max={6} style={{ width: '100%' }} />
                </Form.Item>
              )}
            </div>
          );
        }}
      </Form.Item>

      <Divider>链接列表</Divider>

      <Form.List name="links">
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
                          rules={[{ required: true, message: '请输入标题' }]}
                       >
                          <Input 
                             className="header-title-input" 
                             placeholder="链接标题" 
                             onClick={e => e.stopPropagation()} 
                             bordered={false}
                          />
                       </Form.Item>

                       <Form.Item shouldUpdate noStyle>
                          {({ getFieldValue }) => {
                             const icon = getFieldValue(['links', name, 'icon']);
                             return (
                                <>
                                   {icon && (
                                      <div className="preview-tag">
                                         <IconRenderer value={icon} size={14} />
                                         <span>{icon}</span>
                                      </div>
                                   )}
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
                       <Form.Item
                          {...restField}
                          name={[name, 'url']}
                          label="链接地址"
                          rules={[{ required: true, message: '请输入链接地址' }]}
                       >
                          <Input placeholder="/dashboard" />
                       </Form.Item>

                       {/* 暂时停用所属系统配置，保留实现以便后续恢复
                       <Form.Item
                          {...restField}
                          name={[name, 'systemId']}
                          label="所属系统"
                          rules={[{ required: true, message: '请选择所属系统' }]}
                       >
                          <Select placeholder="请选择所属系统" options={JUMP_SYSTEM_OPTIONS} />
                       </Form.Item>
                       */}

                       <Form.Item
                          {...restField}
                          name={[name, 'icon']}
                          label="图标"
                       >
                          <IconPicker mode="simple" placeholder="选择图标" />
                       </Form.Item>
                       <div className="form-row-2">
                          <Form.Item
                             {...restField}
                             name={[name, 'iconBgColor']}
                             label="图标背景色"
                          >
                             <ColorPicker showText allowClear />
                          </Form.Item>
                          <Form.Item
                             {...restField}
                             name={[name, 'iconColor']}
                             label="图标颜色"
                          >
                             <ColorPicker showText allowClear />
                          </Form.Item>
                       </div>

                       <Form.Item
                          {...restField}
                          name={[name, 'description']}
                          label="描述"
                       >
                          <Input placeholder="描述 (可选)" />
                       </Form.Item>
                    </div>
                  </div>
                </div>
              );
            })}
            <Button
              type="dashed"
              onClick={() => {
                 add({ title: '新链接', url: '', icon: 'LinkOutlined', iconBgColor: '#1890ff', iconColor: '#ffffff' });
                 setExpandedIndices(prev => [...prev, fields.length]);
              }}
              block
              icon={<PlusOutlined />}
            >
              添加链接
            </Button>
          </div>
        )}
      </Form.List>
    </>
  );
};

export default LinkConfig;
