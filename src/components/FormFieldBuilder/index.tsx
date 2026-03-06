import React, { useMemo, useState } from 'react';
import { Button, Input, Select, Checkbox, Space, Form, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, CaretRightOutlined } from '@ant-design/icons';
import { FormField } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface FormFieldBuilderProps {
  value?: FormField[];
  onChange?: (value: FormField[]) => void;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  select: '下拉选择',
  radio: '单选框',
  date: '日期',
  checkbox: '复选框',
};

const FormFieldBuilder: React.FC<FormFieldBuilderProps> = ({ value = [], onChange }) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 计算字段名重复集合
  const duplicateNames = useMemo(() => {
    const counts: Record<string, number> = {};
    value.forEach(f => { if (f.name) counts[f.name] = (counts[f.name] || 0) + 1; });
    return new Set(Object.keys(counts).filter(k => counts[k] > 1));
  }, [value]);

  // 获取字段名校验状态
  const getNameError = (field: FormField): string | undefined => {
    if (!field.name || !field.name.trim()) return '字段名不能为空';
    if (duplicateNames.has(field.name)) return '字段名重复';
    return undefined;
  };

  // 获取选项 value 校验状态
  const getOptionValueError = (field: FormField, optIndex: number): string | undefined => {
    const option = field.options?.[optIndex];
    if (!option) return undefined;
    const val = String(option.value);
    if (!val || !val.trim()) return '值不能为空';
    const hasDuplicate = field.options!.some((o, i) => i !== optIndex && String(o.value) === val);
    if (hasDuplicate) return '值重复';
    return undefined;
  };

  const handleAdd = () => {
    const newField: FormField = {
      id: uuidv4(),
      type: 'text',
      label: '新字段',
      name: `field_${value.length + 1}`,
      required: false,
    };
    const newValue = [...value, newField];
    onChange?.(newValue);
    setExpandedKeys(prev => [...prev, newField.id]);
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
    const newOption = { label: '选项', value: 'value' };
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

  const hasOptions = (type: string) => ['select', 'radio'].includes(type);

  const collapseItems = value.map((field, index) => ({
    key: field.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span>{field.label || '未命名'} <span style={{ color: '#999', fontSize: 12 }}>({FIELD_TYPE_LABELS[field.type] || field.type})</span></span>
      </div>
    ),
    extra: (
      <Button
        type="text"
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={(e) => { e.stopPropagation(); handleRemove(index); }}
      />
    ),
    children: (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space style={{ width: '100%' }} align="start">
          <Form.Item label="标签" style={{ marginBottom: 0, flex: 1 }}>
            <Input value={field.label} onChange={(e) => handleChange(index, { label: e.target.value })} />
          </Form.Item>
          <Form.Item
            label="字段名"
            style={{ marginBottom: 0, flex: 1 }}
            validateStatus={getNameError(field) ? 'error' : undefined}
            help={getNameError(field)}
          >
            <Input value={field.name} onChange={(e) => handleChange(index, { name: e.target.value })} />
          </Form.Item>
        </Space>

        <Space style={{ width: '100%' }} align="start">
          <Form.Item label="类型" style={{ marginBottom: 0, flex: 1 }}>
            <Select
              value={field.type}
              onChange={(val) => handleChange(index, { type: val })}
              style={{ width: '175px' }}
            >
              <Select.Option value="text">单行文本</Select.Option>
              <Select.Option value="textarea">多行文本</Select.Option>
              <Select.Option value="number">数字</Select.Option>
              <Select.Option value="select">下拉选择</Select.Option>
              <Select.Option value="radio">单选框</Select.Option>
              <Select.Option value="date">日期</Select.Option>
              <Select.Option value="checkbox">复选框</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="必填" valuePropName="checked" style={{ marginBottom: 0, flex: 1 }}>
            <Checkbox checked={field.required} onChange={(e) => handleChange(index, { required: e.target.checked })}>必填</Checkbox>
          </Form.Item>
        </Space>

        {hasOptions(field.type) && (
          <div style={{ padding: 8, borderRadius: 4 }}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>选项列表:</div>
            {field.options?.map((option, optIndex) => {
              const optValErr = getOptionValueError(field, optIndex);
              return (
                <Space key={optIndex} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Input placeholder="显示文本" value={option.label} onChange={(e) => handleOptionChange(index, optIndex, 'label', e.target.value)} />
                  <Form.Item
                    style={{ marginBottom: 0 }}
                    validateStatus={optValErr ? 'error' : undefined}
                    help={optValErr}
                  >
                    <Input placeholder="值" value={String(option.value)} onChange={(e) => handleOptionChange(index, optIndex, 'value', e.target.value)} />
                  </Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveOption(index, optIndex)} />
                </Space>
              );
            })}
            <Button type="dashed" onClick={() => handleAddOption(index)} block icon={<PlusOutlined />}>
              添加选项
            </Button>
          </div>
        )}
      </Space>
    ),
  }));

  return (
    <div className="form-field-builder">
      <Collapse
        accordion={false}
        activeKey={expandedKeys}
        onChange={(keys) => setExpandedKeys(keys as string[])}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        items={collapseItems}
        size="small"
        style={{ marginBottom: 8 }}
      />
      <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />}>
        添加字段
      </Button>
    </div>
  );
};

export default FormFieldBuilder;
