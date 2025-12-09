import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Select, Divider, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { Widget, MicroAppModule } from '@/types';
import { useStore } from '@/store/useStore';
import { microAppCommunication } from '@/utils/microAppCommunication';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import FormFieldBuilder from '../FormFieldBuilder';
import MicroAppSelector from '../MicroAppSelector';
import EventRouteConfig from '../EventRouteConfig';
import BackgroundSettings from '@/components/BackgroundSettings';
import './index.scss';

interface ConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget;
}

const ConfigDialog: React.FC<ConfigDialogProps> = ({ isOpen, onClose, widget }) => {
  const { updateWidget, updateFloatingModule, updateFloatingModuleConfig, floatingModules } = useStore();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [iconFileList, setIconFileList] = useState<any[]>([]);

  // 判断是否为悬浮模块
  const isFloatingModule = floatingModules.some(m => m.id === widget.id);

  const updateIconPreview = useCallback((value?: string) => {
    if (value && (value.startsWith('http') || value.startsWith('data:'))) {
      setIconFileList([
        {
          uid: '-icon',
          name: 'icon.png',
          status: 'done',
          url: value,
        },
      ]);
    } else {
      setIconFileList([]);
    }
  }, []);

  const syncModuleIcon = useCallback(
    async (systemId?: string, moduleId?: string, icon?: string) => {
      if (!systemId || !moduleId) {
        return;
      }
      try {
        await microAppConfigLoader.updateModuleConfig(systemId, moduleId, { icon: icon || '' });
      } catch (error) {
        console.error('Failed to sync micro app icon:', error);
        message.error('同步微应用图标失败，请稍后重试');
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      // 初始化背景图片上传列表
      if (widget.config.backgroundImage) {
        setFileList([
          {
            uid: '-1',
            name: 'current-bg.png',
            status: 'done',
            url: widget.config.backgroundImage,
          },
        ]);
      } else {
        setFileList([]);
      }

      // 对于微应用类型,需要特殊处理配置
      if (widget.type === 'microApp') {
        const initialValues = {
          title: widget.title,
          showTitle: widget.config.showTitle !== false,
          refreshInterval: widget.config.refreshInterval,
          systemId: widget.config.systemId,
          moduleId: widget.config.moduleId,
          sync: widget.config.sync !== false,
          alive: widget.config.alive !== false,
          eventRoutes: widget.config.eventRoutes || [],
          icon: widget.config.icon || '',
        };
        form.setFieldsValue(initialValues);
        updateIconPreview(initialValues.icon);

        if ((!widget.config.icon || widget.config.icon.length === 0) && widget.config.systemId && widget.config.moduleId) {
          microAppConfigLoader
            .getModule(widget.config.systemId, widget.config.moduleId)
            .then(module => {
              if (!module) return;
              form.setFieldsValue({ icon: module.icon || '' });
              updateIconPreview(module.icon);
            })
            .catch(error => console.warn('Failed to load module for icon:', error));
        }
      } else {
        form.setFieldsValue({
          title: widget.title,
          refreshInterval: widget.config.refreshInterval,
          apiEndpoint: widget.config.apiEndpoint,
          showTitle: widget.config.showTitle !== false,
          backgroundType: widget.config.backgroundType || 'color',
          backgroundColor: widget.config.backgroundColor,
          backgroundImage: widget.config.backgroundImage,
          backgroundGradient: widget.config.backgroundGradient,
          ...widget.config,
        });
        updateIconPreview('');
      }

      // 如果是悬浮模块，添加悬浮模块特有的配置
      if (isFloatingModule) {
        form.setFieldsValue({
          // 尺寸配置
          width: widget.config.width || 380,
          height: widget.config.height || 400,
          minWidth: widget.config.minWidth || 300,
          minHeight: widget.config.minHeight || 200,
          maxWidth: widget.config.maxWidth || 800,
          maxHeight: widget.config.maxHeight || 900,
          // 行为配置
          collapsible: widget.config.collapsible !== false,
          closable: widget.config.closable !== false,
          showHeader: widget.config.showHeader !== false,
          // 样式配置
          theme: widget.config.theme || 'auto',
          borderRadius: widget.config.borderRadius || 12,
          zIndex: widget.config.zIndex || 9999,
          // 折叠状态尺寸
          collapsedWidth: widget.config.collapsedWidth || 60,
          collapsedHeight: widget.config.collapsedHeight || 60,
        });
      }
    }
  }, [isOpen, widget, form, isFloatingModule, updateIconPreview]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (isFloatingModule) {
        // 悬浮模块配置
        const {
          title,
          showTitle,
          refreshInterval,
          // 尺寸配置
          width,
          height,
          minWidth,
          minHeight,
          maxWidth,
          maxHeight,
          // 行为配置
          collapsible,
          closable,
          // 样式配置
          theme,
          borderRadius,
          zIndex,
          // 折叠状态尺寸
          collapsedWidth,
          collapsedHeight,
          // 微应用特定字段
          systemId,
          moduleId,
          sync,
          alive,
          eventRoutes,
          icon,
          ...restConfig
        } = values;

        updateFloatingModule(widget.id, { title }); // 更新 title

        if (widget.type === 'microApp') {
          // 微应用类型的悬浮模块
          updateFloatingModuleConfig(widget.id, {
            ...widget.config,
            showTitle,
            refreshInterval,
            // 尺寸配置
            width,
            height,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            // 行为配置
            collapsible,
            closable,
            showHeader: showTitle, // showHeader 使用 showTitle 的值
            // 样式配置
            theme,
            borderRadius,
            zIndex,
            // 折叠状态尺寸
            collapsedWidth,
            collapsedHeight,
            // 微应用配置
            microApp: {
              ...widget.config.microApp,
              systemId,
              moduleId,
              sync,
              alive,
              icon,
            },
            eventRoutes: eventRoutes || [],
            icon,
          });

          // 重新设置事件监听器
          setTimeout(() => {
            microAppCommunication.setupEventListeners();
          }, 100);

          await syncModuleIcon(systemId, moduleId, icon);
        } else {
          // 本地组件类型的悬浮模块
          updateFloatingModuleConfig(widget.id, {
            ...widget.config,
            showTitle,
            refreshInterval,
            // 尺寸配置
            width,
            height,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            // 行为配置
            collapsible,
            closable,
            showHeader: showTitle, // showHeader 使用 showTitle 的值
            // 样式配置
            theme,
            borderRadius,
            zIndex,
            // 折叠状态尺寸
            collapsedWidth,
            collapsedHeight,
            ...restConfig,
          });
        }
      } else {
        // 普通小部件配置
        if (widget.type === 'microApp') {
          // 微应用配置
          const { title, showTitle, refreshInterval, systemId, moduleId, sync, alive, eventRoutes, icon } = values;
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
              icon,
              eventRoutes: eventRoutes || [],
            },
          });

          // 重新设置事件监听器
          setTimeout(() => {
            microAppCommunication.setupEventListeners();
          }, 100);

          await syncModuleIcon(systemId, moduleId, icon);
        } else {
          // 其他小部件配置
          const { title, showTitle, refreshInterval, apiEndpoint, backgroundType, backgroundColor, backgroundImage, backgroundGradient, ...restConfig } = values;
          
          // Normalize color
          let normalizedColor = backgroundColor;
          if (typeof normalizedColor === 'object' && normalizedColor?.toHexString) {
            normalizedColor = normalizedColor.toHexString();
          }

          updateWidget(widget.id, {
            title,
            config: {
              ...widget.config,
              showTitle,
              refreshInterval,
              apiEndpoint,
              backgroundType,
              backgroundColor: normalizedColor,
              backgroundImage,
              backgroundGradient,
              ...restConfig,
            },
          });
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to save widget config:', error);
    }
  };

  return (
    <Modal
      title={isFloatingModule ? `配置悬浮模块: ${widget.title}` : `配置小部件: ${widget.title}`}
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
      className="config-dialog"
      width={600}
      style={{ top: 40 }}
      styles={{ body: { maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingTop: 16 } }}
    >
      <Form form={form} layout="vertical" size="small">
        <Form.Item
          name="title"
          label="文案"
          // rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="showTitle"
          label="显示标题"
          valuePropName="checked"
          tooltip={
            isFloatingModule
              ? "关闭后将显示透明拖拽条，编辑模式下仍可进行操作"
              : "关闭后小部件将不显示头部标题栏"
          }
        >
          <Switch />
        </Form.Item>

        {/* 仅在特定小部件类型显示刷新间隔 */}
        {['clock', 'stats', 'chart', 'news', 'topList', 'dataTable', 'microApp'].includes(widget.type) && (
          <Form.Item
            name="refreshInterval"
            label="刷新间隔 (秒)"
            rules={[{ type: 'number', min: 0 }]}
          >
            <InputNumber />
          </Form.Item>
        )}

        <Divider>背景设置</Divider>
        <BackgroundSettings 
          form={form} 
          initialValues={widget.config as any} 
        />
        <Divider />

        {/* 分组标题特定配置 */}
        {widget.type === 'groupTitle' && (
          <>
            <Form.Item
              name="icon"
              label="图标"
              tooltip="输入 Ant Design 图标名称 (如: FolderOpenOutlined) 或iconfont自定义图标名称 (如: icon-home中的home)"
            >
              <Input placeholder="FolderOpenOutlined 或 home" />
            </Form.Item>
            <Form.Item
              name="backgroundImage"
              label="背景图片"
              tooltip="输入图片URL或上传本地图片"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Input placeholder="https://example.com/bg.png" />
                <Upload
                  listType="picture"
                  maxCount={1}
                  fileList={fileList}
                  beforeUpload={(file) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                      const base64 = reader.result as string;
                      form.setFieldValue('backgroundImage', base64);
                      setFileList([
                        {
                          uid: file.uid,
                          name: file.name,
                          status: 'done',
                          url: base64,
                        },
                      ]);
                    };
                    return false; // 阻止自动上传
                  }}
                  onRemove={() => {
                    setFileList([]);
                    form.setFieldValue('backgroundImage', '');
                  }}
                >
                  <Button icon={<UploadOutlined />}>上传图片</Button>
                </Upload>
              </div>
            </Form.Item>
          </>
        )}

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
                    icon: config.module?.icon || '',
                  });
                  updateIconPreview(config.module?.icon || '');
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
              name="icon"
              label="图标"
              tooltip="支持图片 URL 或上传图片，将同步到微应用配置"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Input placeholder="https://example.com/icon.png 或 data:image/png;base64,..." />
                <Upload
                  listType="picture"
                  maxCount={1}
                  fileList={iconFileList}
                  beforeUpload={(file) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                      const base64 = reader.result as string;
                      form.setFieldValue('icon', base64);
                      setIconFileList([
                        {
                          uid: file.uid,
                          name: file.name,
                          status: 'done',
                          url: base64,
                        },
                      ]);
                    };
                    return false;
                  }}
                  onRemove={() => {
                    setIconFileList([]);
                    form.setFieldValue('icon', '');
                  }}
                >
                  <Button icon={<UploadOutlined />}>上传图标</Button>
                </Upload>
              </div>
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

        {/* 悬浮模块特定配置 */}
        {isFloatingModule && (
          <>
            <Divider>悬浮模块配置</Divider>

            {/* 当前尺寸配置 */}
            <Form.Item label="当前尺寸" tooltip="悬浮模块当前的宽度和高度">
              <div style={{ display: 'flex', gap: '8px' }}>
                <Form.Item
                  name="width"
                  noStyle
                  rules={[{ type: 'number', min: 100, message: '宽度至少100px' }]}
                >
                  <InputNumber
                    style={{ width: '50%' }}
                    placeholder="宽度"
                    suffix="px"
                  />
                </Form.Item>
                <Form.Item
                  name="height"
                  noStyle
                  rules={[{ type: 'number', min: 100, message: '高度至少为100px' }]}
                >
                  <InputNumber
                    style={{ width: '50%' }}
                    placeholder="高度"
                    suffix="px"
                  />
                </Form.Item>
              </div>
            </Form.Item>

            <Form.Item label="最小尺寸">
              <div style={{ display: 'flex', gap: '8px' }}>
                <Form.Item
                  name="minWidth"
                  noStyle
                  rules={[{ type: 'number', min: 100 }]}
                >
                  <InputNumber
                    style={{ width: '50%' }}
                    placeholder="最小宽度"
                    suffix="px"
                  />
                </Form.Item>
                <Form.Item
                  name="minHeight"
                  noStyle
                  rules={[{ type: 'number', min: 100 }]}
                >
                  <InputNumber
                    style={{ width: '50%' }}
                    placeholder="最小高度"
                    suffix="px"
                  />
                </Form.Item>
              </div>
            </Form.Item>

            <Form.Item label="最大尺寸">
              <div style={{ display: 'flex', gap: '8px' }}>
                <Form.Item
                  name="maxWidth"
                  noStyle
                  rules={[{ type: 'number', min: 200 }]}
                >
                  <InputNumber
                    style={{ width: '50%' }}
                    placeholder="最大宽度"
                    suffix="px"
                  />
                </Form.Item>
                <Form.Item
                  name="maxHeight"
                  noStyle
                  rules={[{ type: 'number', min: 200 }]}
                >
                  <InputNumber
                    style={{ width: '50%' }}
                    placeholder="最大高度"
                    suffix="px"
                  />
                </Form.Item>
              </div>
            </Form.Item>

            {/* 行为配置 */}
            <Form.Item
              name="collapsible"
              label="允许折叠"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="closable"
              label="允许关闭"
              valuePropName="checked"
              tooltip="非编辑模式下是否显示关闭按钮"
            >
              <Switch />
            </Form.Item>

            {/* 样式配置 */}
            <Form.Item
              name="theme"
              label="主题"
              tooltip="选择跟随主应用时,悬浮模块会自动跟随主应用的主题设置"
            >
              <Select>
                <Select.Option value="auto">跟随主应用</Select.Option>
                <Select.Option value="light">浅色</Select.Option>
                <Select.Option value="dark">暗色</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="borderRadius"
              label="角大小"
              rules={[{ type: 'number', min: 0, max: 50 }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                suffix="px"
              />
            </Form.Item>

            <Form.Item
              name="zIndex"
              label="层级"
              tooltip="控制悬浮模块的显示层级"
              rules={[{ type: 'number', min: 1 }]}
            >
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>

            {/* 折叠状态尺寸 */}
            <Form.Item label="折叠时尺寸">
              <div style={{ display: 'flex', gap: '8px' }}>
                <Form.Item
                  name="collapsedWidth"
                  noStyle
                  rules={[{ type: 'number', min: 40, max: 100 }]}
                >
                  <InputNumber
                    style={{ width: '50%' }}
                    placeholder="折叠宽度"
                    suffix="px"
                  />
                </Form.Item>
                <Form.Item
                  name="collapsedHeight"
                  noStyle
                  rules={[{ type: 'number', min: 40, max: 100 }]}
                >
                  <InputNumber
                    style={{ width: '50%' }}
                    placeholder="折叠高度"
                    suffix="px"
                  />
                </Form.Item>
              </div>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ConfigDialog;
