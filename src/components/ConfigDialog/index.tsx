import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch } from 'antd';
import { Widget } from '@/types';
import { useStore } from '@/store/useStore';
import FormFieldBuilder from '../FormFieldBuilder';
import './index.scss';

interface ConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget;
}

const ConfigDialog: React.FC<ConfigDialogProps> = ({ isOpen, onClose, widget }) => {
  const { updateWidget } = useStore();
  const [form] = Form.useForm();

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        title: widget.title,
        refreshInterval: widget.config.refreshInterval,
        apiEndpoint: widget.config.apiEndpoint,
        // showTitle 默认为 true，只有显式设置为 false 时才为 false
        showTitle: widget.config.showTitle !== false,
        ...widget.config,
      });
    }
  }, [isOpen, widget, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const { title, showTitle, refreshInterval, apiEndpoint, ...restConfig } = values;

      // Update generic widget props
      updateWidget(widget.id, {
        title,
        config: {
          ...widget.config,
          showTitle,
          refreshInterval,
          apiEndpoint,
          ...restConfig,
        },
      });

      onClose();
    });
  };

  return (
    <Modal
      title={`Configure ${widget.type} Widget`}
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
      className="config-dialog"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="showTitle"
          label="显示标题"
          valuePropName="checked"
          tooltip="关闭后小部件将不显示头部标题栏"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="refreshInterval"
          label="刷新间隔 (秒)"
          rules={[{ type: 'number', min: 0 }]}
        >
          <InputNumber />
        </Form.Item>

        {/* Add widget-specific configuration fields here based on widget.type */}
        {['chart', 'dataTable', 'stats', 'customForm'].includes(widget.type) && (
          <Form.Item name="apiEndpoint" label="API Endpoint">
            <Input placeholder="/api/data" />
          </Form.Item>
        )}

        {widget.type === 'customForm' && (
          <Form.Item name="fields" label="Form Fields">
             <FormFieldBuilder />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ConfigDialog;
