import React, { useEffect } from 'react';
import { Modal, Form, message } from 'antd';
import { useStore } from '@/store/useStore';
import { DashboardConfig } from '@/types';
import BackgroundSettings from '@/components/BackgroundSettings';

interface DashboardConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DashboardConfigDialog: React.FC<DashboardConfigDialogProps> = ({ isOpen, onClose }) => {
  const { dashboardConfig, updateDashboardConfig } = useStore();
  const [form] = Form.useForm();

  useEffect(() => {
    if (isOpen && dashboardConfig) {
      form.setFieldsValue({
        backgroundType: dashboardConfig.backgroundType || 'color',
        backgroundColor: dashboardConfig.backgroundColor || '#f5f5f5',
        backgroundImage: dashboardConfig.backgroundImage,
        backgroundGradient: dashboardConfig.backgroundGradient,
      });
    }
  }, [isOpen, dashboardConfig, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Normalize color value from ColorPicker
      let backgroundColor = values.backgroundColor;
      if (typeof backgroundColor === 'object' && backgroundColor.toHexString) {
        backgroundColor = backgroundColor.toHexString();
      } else if (typeof backgroundColor === 'string') {
          // Keep as string
      } else {
          backgroundColor = '#f5f5f5';
      }

      const config: Partial<DashboardConfig> = {
        backgroundType: values.backgroundType,
        backgroundColor: backgroundColor,
        backgroundImage: values.backgroundImage,
        backgroundGradient: values.backgroundGradient,
      };

      updateDashboardConfig(config);
      message.success('背景设置已更新');
      onClose();
    } catch (error) {
      console.error('Failed to update dashboard config:', error);
    }
  };

  return (
    <Modal
      title="页面背景设置"
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      width={500}
    >
      <Form form={form} layout="vertical">
        <BackgroundSettings 
          form={form} 
          initialValues={dashboardConfig} 
        />
      </Form>
    </Modal>
  );
};

export default DashboardConfigDialog;
