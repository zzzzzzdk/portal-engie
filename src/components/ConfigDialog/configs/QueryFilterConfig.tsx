import React from 'react';
import { Divider, Form, Input, InputNumber, Radio, Switch } from 'antd';
import QueryFilterFieldBuilder from '@/components/QueryFilterFieldBuilder';
import { WidgetConfigProps } from './types';

const QueryFilterConfig: React.FC<WidgetConfigProps> = ({ form }) => {
  const showResetButton = Form.useWatch('showResetButton', form) ?? true;

  return (
    <>
      <Divider>筛选字段</Divider>
      <QueryFilterFieldBuilder form={form} name="queryFields" />

      <Divider>按钮配置</Divider>
      <Form.Item name="submitButtonText" label="查询按钮文案">
        <Input placeholder="查询" />
      </Form.Item>
      <Form.Item name="showResetButton" label="显示重置按钮" valuePropName="checked">
        <Switch />
      </Form.Item>
      {showResetButton && (
        <Form.Item name="resetButtonText" label="重置按钮文案">
          <Input placeholder="重置" />
        </Form.Item>
      )}

      <Divider>布局配置</Divider>
      <div className="form-row-2">
        <Form.Item name="layoutCols" label="布局方式" initialValue={4}>
          <Radio.Group>
            <Radio.Button value={1}>一列</Radio.Button>
            <Radio.Button value={2}>二列</Radio.Button>
            <Radio.Button value={3}>三列</Radio.Button>
            <Radio.Button value={4}>四列</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <div />
      </div>
      <div className="form-row-2">
        <Form.Item name="buttonAlign" label="按钮对齐" initialValue="right">
          <Radio.Group>
            <Radio.Button value="left">左对齐</Radio.Button>
            <Radio.Button value="center">居中</Radio.Button>
            <Radio.Button value="right">右对齐</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="fieldSpacing" label="字段间距(px)" initialValue={16}>
          <InputNumber min={0} max={48} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </div>
    </>
  );
};

export default QueryFilterConfig;
