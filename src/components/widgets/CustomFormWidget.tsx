import React from 'react';
import { Form, Input, Button, Select, Checkbox, DatePicker, InputNumber, message } from 'antd';
import { WidgetConfig, FormConfig, FormField } from '@/types';

interface CustomFormWidgetProps {
  config: WidgetConfig;
}

const CustomFormWidget: React.FC<CustomFormWidgetProps> = ({ config }) => {
  const formConfig = config as FormConfig;
  const fields = formConfig.fields || [
    // Default example fields
    { id: '1', type: 'text', label: 'Name', name: 'name', required: true },
    { id: '2', type: 'select', label: 'Role', name: 'role', options: [{ label: 'Admin', value: 'admin' }, { label: 'User', value: 'user' }] }
  ] as FormField[];

  const onFinish = async (values: any) => {
    console.log('Form values:', values);
    if (formConfig.apiEndpoint) {
      try {
        // Simulate API call if needed or perform actual fetch
        // const response = await fetch(formConfig.apiEndpoint, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(values),
        // });
        // if (!response.ok) throw new Error('Submission failed');
        
        // For demonstration/mock purposes, we'll just show a success message
        // In a real app, uncomment the fetch logic above
        console.log(`Submitting to ${formConfig.apiEndpoint} with data:`, values);
        message.success(`Form submitted to ${formConfig.apiEndpoint}`);
      } catch (error) {
        message.error('Failed to submit form');
        console.error(error);
      }
    } else {
      message.info('Form data collected (No API endpoint configured)');
    }
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return <Input />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} />;
      case 'select':
        return <Select options={field.options} />;
      case 'date':
        return <DatePicker style={{ width: '100%' }} />;
      case 'checkbox':
        return <Checkbox />;
      default:
        return <Input />;
    }
  };

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <Form layout="vertical" onFinish={onFinish}>
        {fields.map((field) => (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.label}
            rules={[{ required: field.required, message: `Please input ${field.label}!` }]}
            valuePropName={field.type === 'checkbox' ? 'checked' : 'value'}
          >
            {renderField(field)}
          </Form.Item>
        ))}
        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            Submit
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CustomFormWidget;
