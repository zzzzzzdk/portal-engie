import React from 'react';
import { Button, Input, Select, Checkbox, Space, Card, Form } from 'antd';
import { MinusCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FormField } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface FormFieldBuilderProps {
  value?: FormField[];
  onChange?: (value: FormField[]) => void;
}

const FormFieldBuilder: React.FC<FormFieldBuilderProps> = ({ value = [], onChange }) => {
  const handleAdd = () => {
    const newField: FormField = {
      id: uuidv4(),
      type: 'text',
      label: 'New Field',
      name: `field_${value.length + 1}`,
      required: false,
    };
    onChange?.([...value, newField]);
  };

  const handleRemove = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange?.(newValue);
  };

  const handleChange = (index: number, updates: Partial<FormField>) => {
    const newValue = [...value];
    newValue[index] = { ...newValue[index], ...updates };
    onChange?.(newValue);
  };

  const handleOptionChange = (fieldIndex: number, optionIndex: number, key: 'label' | 'value', val: string) => {
    const newValue = [...value];
    const field = newValue[fieldIndex];
    if (field.options) {
      const newOptions = [...field.options];
      newOptions[optionIndex] = { ...newOptions[optionIndex], [key]: val };
      field.options = newOptions;
      onChange?.(newValue);
    }
  };

  const handleAddOption = (fieldIndex: number) => {
    const newValue = [...value];
    const field = newValue[fieldIndex];
    const newOption = { label: 'Option', value: 'value' };
    field.options = field.options ? [...field.options, newOption] : [newOption];
    onChange?.(newValue);
  };

  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    const newValue = [...value];
    const field = newValue[fieldIndex];
    if (field.options) {
      const newOptions = [...field.options];
      newOptions.splice(optionIndex, 1);
      field.options = newOptions;
      onChange?.(newValue);
    }
  };

  return (
    <div className="form-field-builder">
      {value.map((field, index) => (
        <Card size="small" title={`Field ${index + 1}`} key={field.id} extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(index)} />} style={{ marginBottom: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space style={{ width: '100%' }} align="start">
              <Form.Item label="Label" style={{ marginBottom: 0, flex: 1 }}>
                <Input value={field.label} onChange={(e) => handleChange(index, { label: e.target.value })} />
              </Form.Item>
              <Form.Item label="Name" style={{ marginBottom: 0, flex: 1 }}>
                <Input value={field.name} onChange={(e) => handleChange(index, { name: e.target.value })} />
              </Form.Item>
            </Space>
            
            <Space style={{ width: '100%' }} align="start">
              <Form.Item label="Type" style={{ marginBottom: 0, flex: 1 }}>
                <Select value={field.type} onChange={(val) => handleChange(index, { type: val })} style={{ width: '100%' }}>
                  <Select.Option value="text">Text</Select.Option>
                  <Select.Option value="number">Number</Select.Option>
                  <Select.Option value="select">Select</Select.Option>
                  <Select.Option value="date">Date</Select.Option>
                  <Select.Option value="checkbox">Checkbox</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label="Required" valuePropName="checked" style={{ marginBottom: 0, flex: 0, minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 30 }}>
                 <Checkbox checked={field.required} onChange={(e) => handleChange(index, { required: e.target.checked })}>Required</Checkbox>
              </Form.Item>
            </Space>

            {field.type === 'select' && (
              <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Options:</div>
                {field.options?.map((option, optIndex) => (
                  <Space key={optIndex} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Input placeholder="Label" value={option.label} onChange={(e) => handleOptionChange(index, optIndex, 'label', e.target.value)} />
                    <Input placeholder="Value" value={String(option.value)} onChange={(e) => handleOptionChange(index, optIndex, 'value', e.target.value)} />
                    <MinusCircleOutlined onClick={() => handleRemoveOption(index, optIndex)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => handleAddOption(index)} block icon={<PlusOutlined />}>
                  Add Option
                </Button>
              </div>
            )}
          </Space>
        </Card>
      ))}
      <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
        Add Field
      </Button>
    </div>
  );
};

export default FormFieldBuilder;
