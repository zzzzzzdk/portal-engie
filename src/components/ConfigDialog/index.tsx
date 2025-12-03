import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch } from 'antd';
import { Widget, MicroAppModule } from '@/types';
import { useStore } from '@/store/useStore';
import { microAppCommunication } from '@/utils/microAppCommunication';
import FormFieldBuilder from '../FormFieldBuilder';
import MicroAppSelector from '../MicroAppSelector';
import EventRouteConfig from '../EventRouteConfig';
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
      // 对于微应用类型,需要特殊处理配置
      if (widget.type === 'microApp') {
        form.setFieldsValue({
          title: widget.title,
          showTitle: widget.config.showTitle !== false,
          refreshInterval: widget.config.refreshInterval,
          systemId: widget.config.systemId,
          moduleId: widget.config.moduleId,
          sync: widget.config.sync !== false,
          alive: widget.config.alive !== false,
          eventRoutes: widget.config.eventRoutes || [],
        });
      } else {
        form.setFieldsValue({
          title: widget.title,
          refreshInterval: widget.config.refreshInterval,
          apiEndpoint: widget.config.apiEndpoint,
          showTitle: widget.config.showTitle !== false,
          ...widget.config,
        });
      }
    }
  }, [isOpen, widget, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      if (widget.type === 'microApp') {
        // 微应用配置
        const { title, showTitle, refreshInterval, systemId, moduleId, sync, alive, eventRoutes } = values;
        updateWidget(widget.id, {
          title,
          config: {
            ...widget.config,
            showTitle,
            refreshInterval,
            systemId,
            moduleId,
            sync,
            alive,
            eventRoutes: eventRoutes || [],
          },
        });

        // 重新设置事件监听器
        setTimeout(() => {
          microAppCommunication.setupEventListeners();
        }, 100);
      } else {
        // 其他小部件配置
        const { title, showTitle, refreshInterval, apiEndpoint, ...restConfig } = values;
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
      }

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

        {/* 微应用特定配置 */}
        {widget.type === 'microApp' && (
          <>
            <Form.Item
              name="microAppSelector"
              label="微应用配置"
              rules={[
                {
                  validator: async () => {
                    const systemId = form.getFieldValue('systemId');
                    const moduleId = form.getFieldValue('moduleId');
                    if (!systemId || !moduleId) {
                      return Promise.reject(new Error('请选择系统和模块'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <MicroAppSelector
                systemId={widget.config.systemId}
                moduleId={widget.config.moduleId}
                onChange={(config: { systemId: string; moduleId: string; module: MicroAppModule | null }) => {
                  form.setFieldsValue({
                    systemId: config.systemId,
                    moduleId: config.moduleId,
                  });
                  // 触发表单验证
                  form.validateFields(['microAppSelector']);
                }}
              />
            </Form.Item>

            <Form.Item name="systemId" hidden>
              <Input />
            </Form.Item>

            <Form.Item name="moduleId" hidden>
              <Input />
            </Form.Item>

            <Form.Item
              name="sync"
              label="同步路由"
              valuePropName="checked"
              tooltip="是否同步主应用路由到微应用"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="alive"
              label="保持存活"
              valuePropName="checked"
              tooltip="切换到其他页面时是否保持微应用状态"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="eventRoutes"
              label="事件路由配置"
            >
              <EventRouteConfig
                currentWidgetId={widget.id}
                currentSystemId={widget.config.systemId}
                currentModuleId={widget.config.moduleId}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ConfigDialog;
