import React from 'react';
import { Form, Input, Switch, Radio, InputNumber, ColorPicker, Divider } from 'antd';
import { WidgetConfigProps } from './types';

/**
 * 自定义表单组件配置 - 组件配置 Tab（按钮样式 + 布局）
 */
const CustomFormStyleConfig: React.FC<WidgetConfigProps> = () => {
  const form = Form.useFormInstance();
  const showResetButton = Form.useWatch('showResetButton', form) ?? true;

  return (
    <>
      {/* 提交按钮设置 */}
      <Divider>提交按钮</Divider>
      <div className="form-row-2">
        <Form.Item name="submitButtonText" label="按钮文字">
          <Input placeholder="提交" />
        </Form.Item>
        <Form.Item name="submitButtonSize" label="按钮大小">
          <Radio.Group>
            <Radio.Button value="small">小</Radio.Button>
            <Radio.Button value="middle">中</Radio.Button>
            <Radio.Button value="large">大</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </div>
      <div className="form-row-2">
        <Form.Item name="submitButtonColor" label="按钮颜色">
          <ColorPicker showText allowClear />
        </Form.Item>
        <Form.Item name="submitButtonTextColor" label="文字颜色">
          <ColorPicker showText allowClear />
        </Form.Item>
      </div>

      {/* 重置按钮设置 */}
      <Divider>重置按钮</Divider>
      <Form.Item name="showResetButton" label="显示重置按钮" valuePropName="checked">
        <Switch />
      </Form.Item>
      {showResetButton && (
        <>
          <Form.Item name="resetButtonText" label="按钮文字">
            <Input placeholder="重置" />
          </Form.Item>
          <div className="form-row-2">
            <Form.Item name="resetButtonColor" label="按钮颜色">
              <ColorPicker showText allowClear />
            </Form.Item>
            <Form.Item name="resetButtonTextColor" label="文字颜色">
              <ColorPicker showText allowClear />
            </Form.Item>
          </div>
        </>
      )}

      {/* 布局设置 */}
      <Divider>布局设置</Divider>
      <div className="form-row-2">
        <Form.Item name="buttonAlign" label="按钮对齐">
          <Radio.Group>
            <Radio.Button value="left">左</Radio.Button>
            <Radio.Button value="center">中</Radio.Button>
            <Radio.Button value="right">右</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </div>
      <Form.Item name="fieldSpacing" label="字段间距(px)">
        <InputNumber min={0} max={60} style={{ width: '100%' }} placeholder="默认24" />
      </Form.Item>
    </>
  );
};

export default CustomFormStyleConfig;
