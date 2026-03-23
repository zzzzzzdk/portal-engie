import React, { useCallback } from 'react';
import { Form, Input, Button, Select, Checkbox, DatePicker, InputNumber, Radio, message, Space } from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';
import WujieReact from 'wujie-react';
import { WidgetConfig, FormConfig, FormField, Widget, EventRouteConfig, MicroAppEventType } from '@/types';
import { parseJsonConfig } from '@/utils/widgetApi';

const { bus } = WujieReact;

/**
 * 自定义表单组件配置
 */
interface CustomFormWidgetConfig extends FormConfig {
  eventRoutes?: EventRouteConfig[];
  submitButtonText?: string;
  resetButtonText?: string;
  showResetButton?: boolean;
  layout?: 'horizontal' | 'vertical' | 'inline';
  labelWidth?: number;
  submitButtonColor?: string;
  submitButtonTextColor?: string;
  submitButtonSize?: 'small' | 'middle' | 'large';
  resetButtonColor?: string;
  resetButtonTextColor?: string;
  buttonAlign?: 'left' | 'center' | 'right';
  borderRadius?: number;
  fieldSpacing?: number;
  submitMethod?: 'api' | 'eventRoute';
  apiMethod?: 'POST' | 'PUT' | 'PATCH';
  apiHeaders?: Record<string, string>;
  successMessage?: string;
  failureMessage?: string;
  successAction?: 'none' | 'resetForm';
  failureAction?: 'none' | 'resetForm';
  successResetForm?: boolean;
}

interface CustomFormWidgetProps {
  config: WidgetConfig;
  widget?: Widget;
}

const DEFAULT_FIELDS: FormField[] = [
  { id: '1', type: 'text', label: '姓名', name: 'name', required: true },
  {
    id: '2',
    type: 'select',
    label: '角色',
    name: 'role',
    options: [
      { label: '管理员', value: 'admin' },
      { label: '用户', value: 'user' },
    ],
  },
];

const CustomFormWidget: React.FC<CustomFormWidgetProps> = ({ config, widget }) => {
  const [form] = Form.useForm();

  const formConfig = config as CustomFormWidgetConfig;
  const fields = formConfig.fields || DEFAULT_FIELDS;
  const eventRoutes = formConfig.eventRoutes || [];
  const submitButtonText = formConfig.submitButtonText || '提交';
  const resetButtonText = formConfig.resetButtonText || '重置';
  const showResetButton = formConfig.showResetButton ?? true;
  const layout = formConfig.layout || 'vertical';
  const labelWidth = formConfig.labelWidth;
  const submitButtonColor = formConfig.submitButtonColor;
  const submitButtonTextColor = formConfig.submitButtonTextColor;
  const submitButtonSize = formConfig.submitButtonSize || 'middle';
  const resetButtonColor = formConfig.resetButtonColor;
  const resetButtonTextColor = formConfig.resetButtonTextColor;
  const buttonAlign = formConfig.buttonAlign || 'left';
  const borderRadius = formConfig.borderRadius;
  const fieldSpacing = formConfig.fieldSpacing;
  const submitMethod = formConfig.submitMethod || 'eventRoute';
  const apiMethod = formConfig.apiMethod || 'POST';
  const apiHeaders = formConfig.apiHeaders;
  const successMessage = formConfig.successMessage || '提交成功';
  const failureMessage = formConfig.failureMessage || '提交失败';
  const successAction =
    formConfig.successAction || (formConfig.successResetForm ? 'resetForm' : 'none');
  const failureAction = formConfig.failureAction || 'none';

  const emitRoutes = useCallback((routes: EventRouteConfig[], values: Record<string, any>) => {
    const enabledRoutes = routes.filter(route => route.enabled !== false);
    if (enabledRoutes.length === 0) return;

    const fromAppId = widget?.id || 'custom-form-widget';
    enabledRoutes.forEach(route => {
      const targetEventType = route.toEventType || route.eventType || MicroAppEventType.DATA_SUBMIT;
      bus.$emit(targetEventType, {
        from: fromAppId,
        to: route.toAppId,
        type: targetEventType,
        payload: { action: 'submit', data: values },
        timestamp: Date.now(),
      });
    });
  }, [widget?.id]);

  const buildApiPayload = useCallback((formValues: Record<string, any>) => {
    const configuredBody = parseJsonConfig(formConfig.apiBody);

    if (configuredBody && typeof configuredBody === 'object' && !Array.isArray(configuredBody)) {
      return {
        ...configuredBody,
        ...formValues,
      };
    }

    return formValues;
  }, [formConfig.apiBody]);

  const onFinish = async (values: Record<string, any>) => {
    const formattedValues = { ...values };
    for (const key in formattedValues) {
      if (dayjs.isDayjs(formattedValues[key])) {
        formattedValues[key] = formattedValues[key].format('YYYY-MM-DD');
      }
    }

    try {
      if (submitMethod === 'api' && formConfig.apiEndpoint) {
        const requestPayload = buildApiPayload(formattedValues);

        await axios({
          method: apiMethod,
          url: formConfig.apiEndpoint,
          data: requestPayload,
          ...(apiHeaders ? { headers: apiHeaders } : {}),
        });
      }
      if (submitMethod === 'eventRoute') {
        emitRoutes(eventRoutes, formattedValues);
      }
      message.success(successMessage);
      if (successAction === 'resetForm') {
        form.resetFields();
      }
    } catch (error) {
      message.error(failureMessage);
      if (failureAction === 'resetForm') {
        form.resetFields();
      }
      console.error('表单提交失败:', error);
    }
  };

  const onFinishFailed = () => {
    message.warning('请检查表单填写是否完整');
  };

  const handleReset = () => {
    form.resetFields();
    message.info('表单已重置');
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return <Input placeholder={`请输入${field.label}`} />;
      case 'textarea':
        return <Input.TextArea rows={3} placeholder={`请输入${field.label}`} />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} placeholder={`请输入${field.label}`} />;
      case 'select':
        return <Select options={field.options} placeholder={`请选择${field.label}`} allowClear />;
      case 'radio':
        return <Radio.Group options={field.options} />;
      case 'date':
        return <DatePicker style={{ width: '100%' }} placeholder={`请选择${field.label}`} />;
      case 'checkbox':
        return <Checkbox>{field.label}</Checkbox>;
      default:
        return <Input placeholder={`请输入${field.label}`} />;
    }
  };

  const getFormLayout = () => {
    if (layout === 'horizontal') {
      return {
        labelCol: { span: labelWidth || 6 },
        wrapperCol: { span: 24 - (labelWidth || 6) },
      };
    }
    return {};
  };

  const buttonAlignStyle: React.CSSProperties = {
    textAlign: buttonAlign,
  };

  const submitBtnStyle: React.CSSProperties | undefined = (submitButtonColor || submitButtonTextColor)
    ? {
        ...(submitButtonColor ? { backgroundColor: submitButtonColor, borderColor: submitButtonColor } : {}),
        color: submitButtonTextColor || '#fff',
      }
    : undefined;

  const resetBtnStyle: React.CSSProperties | undefined = (resetButtonColor || resetButtonTextColor)
    ? {
        ...(resetButtonColor ? { backgroundColor: resetButtonColor, borderColor: resetButtonColor } : {}),
        color: resetButtonTextColor || undefined,
      }
    : undefined;

  return (
    <div style={{
      padding: '16px',
      height: '100%',
      overflow: 'auto',
      ...(borderRadius !== undefined ? { borderRadius } : {}),
    }}>
      <Form
        form={form}
        layout={layout}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        {...getFormLayout()}
      >
        {fields.map(field => (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.type === 'checkbox' ? undefined : field.label}
            rules={[{ required: field.required, message: `请输入${field.label}` }]}
            valuePropName={field.type === 'checkbox' ? 'checked' : 'value'}
            initialValue={field.defaultValue}
            style={fieldSpacing !== undefined ? { marginBottom: fieldSpacing } : undefined}
          >
            {renderField(field)}
          </Form.Item>
        ))}
        <Form.Item style={buttonAlignStyle}>
          <Space>
            <Button
              htmlType="submit"
              type={submitButtonColor ? 'default' : 'primary'}
              size={submitButtonSize}
              style={submitBtnStyle}
            >
              {submitButtonText}
            </Button>
            {showResetButton && (
              <Button
                onClick={handleReset}
                size={submitButtonSize}
                type={resetButtonColor ? 'default' : undefined}
                style={resetBtnStyle}
              >
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
