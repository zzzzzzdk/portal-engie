import React, { useCallback } from 'react';
import { Form, Input, Button, Select, Checkbox, DatePicker, InputNumber, message, Space } from 'antd';
import WujieReact from 'wujie-react';
import { WidgetConfig, FormConfig, FormField, Widget, EventRouteConfig, MicroAppEventType } from '@/types';

const { bus } = WujieReact;

/**
 * 自定义表单组件配置
 */
interface CustomFormWidgetConfig extends FormConfig {
  eventRoutes?: EventRouteConfig[];  // 事件路由配置
  submitButtonText?: string;         // 提交按钮文字
  resetButtonText?: string;          // 重置按钮文字
  showResetButton?: boolean;         // 是否显示重置按钮
  layout?: 'horizontal' | 'vertical' | 'inline';  // 表单布局
  labelWidth?: number;               // 标签宽度
}

interface CustomFormWidgetProps {
  config: WidgetConfig;
  widget?: Widget;
}

// 默认表单字段
const DEFAULT_FIELDS: FormField[] = [
  { id: '1', type: 'text', label: '姓名', name: 'name', required: true },
  { id: '2', type: 'select', label: '角色', name: 'role', options: [{ label: '管理员', value: 'admin' }, { label: '用户', value: 'user' }] },
];

const CustomFormWidget: React.FC<CustomFormWidgetProps> = ({ config, widget }) => {
  const [form] = Form.useForm();

  // 获取配置
  const formConfig = config as CustomFormWidgetConfig;
  const fields = formConfig.fields || DEFAULT_FIELDS;
  const eventRoutes = formConfig.eventRoutes || [];
  const submitButtonText = formConfig.submitButtonText || '提交';
  const resetButtonText = formConfig.resetButtonText || '重置';
  const showResetButton = formConfig.showResetButton ?? true;
  const layout = formConfig.layout || 'vertical';
  const labelWidth = formConfig.labelWidth;

  // 发送表单数据到微应用
  const emitFormEvent = useCallback((values: Record<string, any>) => {
    const enabledRoutes = eventRoutes.filter(route => route.enabled !== false);

    if (enabledRoutes.length === 0) {
      console.log('表单数据:', values);
      message.info('表单数据已收集（未配置事件路由）');
      return;
    }

    // 组件ID作为发送方
    const fromAppId = widget?.id || 'custom-form-widget';

    enabledRoutes.forEach(route => {
      const targetEventType = route.toEventType || route.eventType || MicroAppEventType.DATA_SUBMIT;

      console.log('发送表单事件:', {
        from: fromAppId,
        to: route.toAppId,
        eventType: targetEventType,
        payload: values,
      });

      // 通过 Wujie bus 发送事件
      bus.$emit(targetEventType, {
        from: fromAppId,
        to: route.toAppId,
        type: targetEventType,
        payload: {
          action: 'submit',
          data: values,
        },
        timestamp: Date.now(),
      });
    });

    message.success('表单数据已发送');
  }, [eventRoutes, widget?.id]);

  // 提交表单
  const onFinish = async (values: Record<string, any>) => {
    console.log('表单提交数据:', values);

    // 如果配置了 API 接口
    if (formConfig.apiEndpoint) {
      try {
        // 实际项目中取消注释以下代码
        // const response = await axios.post(formConfig.apiEndpoint, values);
        // if (response.data.success) {
        //   message.success('表单提交成功');
        // }
        console.log(`提交到接口 ${formConfig.apiEndpoint}:`, values);
        message.success(`表单已提交到 ${formConfig.apiEndpoint}`);
      } catch (error) {
        message.error('表单提交失败');
        console.error(error);
        return;
      }
    }

    // 发送到微应用
    emitFormEvent(values);
  };

  // 提交失败
  const onFinishFailed = (errorInfo: any) => {
    console.log('表单验证失败:', errorInfo);
    message.warning('请检查表单填写是否完整');
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    message.info('表单已重置');
  };

  // 渲染表单字段
  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return <Input placeholder={`请输入${field.label}`} />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} placeholder={`请输入${field.label}`} />;
      case 'select':
        return (
          <Select
            options={field.options}
            placeholder={`请选择${field.label}`}
            allowClear
          />
        );
      case 'date':
        return <DatePicker style={{ width: '100%' }} placeholder={`请选择${field.label}`} />;
      case 'checkbox':
        return <Checkbox>{field.label}</Checkbox>;
      default:
        return <Input placeholder={`请输入${field.label}`} />;
    }
  };

  // 获取表单布局属性
  const getFormLayout = () => {
    if (layout === 'horizontal') {
      return {
        labelCol: { span: labelWidth || 6 },
        wrapperCol: { span: 24 - (labelWidth || 6) },
      };
    }
    return {};
  };

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <Form
        form={form}
        layout={layout}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        {...getFormLayout()}
      >
        {fields.map((field) => (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.type === 'checkbox' ? undefined : field.label}
            rules={[{ required: field.required, message: `请输入${field.label}` }]}
            valuePropName={field.type === 'checkbox' ? 'checked' : 'value'}
            initialValue={field.defaultValue}
          >
            {renderField(field)}
          </Form.Item>
        ))}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" >
              {submitButtonText}
            </Button>
            {showResetButton && (
              <Button onClick={handleReset}>
                {resetButtonText}
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CustomFormWidget;
