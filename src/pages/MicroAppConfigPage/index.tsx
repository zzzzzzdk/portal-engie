import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Table,
  Form,
  Input,
  Modal,
  Space,
  message,
  Popconfirm,
  InputNumber,
  Tag,
  Upload,
  Tabs,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  AppstoreOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { saveMicroAppConfig } from '@/services/microApp';
import { microAppConfigLoader, MICRO_APP_CONFIG_CHANGED_EVENT, MicroAppConfigChangeDetail } from '@/utils/microAppConfig';
import type { EmittableEvent, MicroAppModule, MicroAppSystem, MicroAppMetadata } from '@/types';
import './index.scss';

// 使用 MicroAppMetadata 作为 MicroAppConfig 的别名
type MicroAppConfig = MicroAppMetadata;

const MicroAppConfigPage: React.FC = () => {
  const [config, setConfig] = useState<MicroAppConfig>({ version: '1.0.0', apps: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<MicroAppSystem | null>(null);
  const [editingModule, setEditingModule] = useState<{ systemId: string; module: MicroAppModule | null }>();
  const [editingEvent, setEditingEvent] = useState<{
    systemId: string;
    moduleId: string;
    eventType: 'emittable' | 'listenable';
    event: EmittableEvent | null;
  }>();

  const [systemForm] = Form.useForm();
  const [moduleForm] = Form.useForm();
  const [eventForm] = Form.useForm();

  const updateConfigState = useCallback((nextConfig: MicroAppConfig) => {
    setConfig(nextConfig);
    microAppConfigLoader.setMetadata(nextConfig);
  }, []);

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('./config/micro-apps.json');
      const data = await response.json();
      updateConfigState(data);
    } catch (error) {
      message.error('加载配置失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleExternalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<MicroAppConfigChangeDetail>).detail;
      if (!detail) {
        return;
      }
      setConfig((prev) => {
        const nextApps = prev.apps.map((system) => {
          if (system.id !== detail.systemId) {
            return system;
          }
          return {
            ...system,
            modules: system.modules.map((module) =>
              module.id === detail.moduleId ? { ...module, ...detail.updates } : module
            ),
          };
        });
        return { ...prev, apps: nextApps };
      });
    };

    window.addEventListener(
      MICRO_APP_CONFIG_CHANGED_EVENT,
      handleExternalUpdate as EventListener
    );
    return () =>
      window.removeEventListener(
        MICRO_APP_CONFIG_CHANGED_EVENT,
        handleExternalUpdate as EventListener
      );
  }, []);

  // 保存配置到服务器
  const handleSaveToServer = async () => {
    setSaving(true);
    try {
      await saveMicroAppConfig(config);
      message.success('配置已保存到服务器');
    } catch (error: any) {
      message.error('保存失败: ' + (error.message || '未知错误'));
      console.error('Save config error:', error);
    } finally {
      setSaving(false);
    }
  };

  // 导出配置
  const handleExport = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'micro-apps.json';
    link.click();
    URL.revokeObjectURL(url);
    message.success('配置已导出');
  };

  // 导入配置
  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        updateConfigState(importedConfig);
        message.success('配置已导入');
      } catch (error) {
        message.error('配置文件格式错误');
      }
    };
    reader.readAsText(file);
    return false; // 阻止自动上传
  };

  // 添加/编辑系统
  const handleSaveSystem = async () => {
    try {
      const values = await systemForm.validateFields();
      const newApps = [...config.apps];

      if (editingSystem) {
        // 编辑现有系统
        const index = newApps.findIndex(app => app.id === editingSystem.id);
        if (index !== -1) {
          newApps[index] = { ...newApps[index], ...values };
        }
      } else {
        // 添加新系统
        newApps.push({
          ...values,
          modules: [],
        });
      }

      updateConfigState({ ...config, apps: newApps });
      setSystemModalOpen(false);
      systemForm.resetFields();
      setEditingSystem(null);
      message.success(editingSystem ? '系统已更新' : '系统已添加');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 删除系统
  const handleDeleteSystem = (systemId: string) => {
    const newApps = config.apps.filter(app => app.id !== systemId);
    updateConfigState({ ...config, apps: newApps });
    message.success('系统已删除');
  };

  // 添加/编辑模块
  const handleSaveModule = async () => {
    try {
      const values = await moduleForm.validateFields();
      const normalizedValues = {
        ...values,
        forceIconOnly: !!values.forceIconOnly,
        iconSvg: values.iconSvg?.trim() ? values.iconSvg : undefined,
      };
      const newApps = [...config.apps];
      const systemIndex = newApps.findIndex(app => app.id === editingModule?.systemId);

      if (systemIndex !== -1) {
        const system = newApps[systemIndex];

        if (editingModule?.module) {
          // 编辑现有模块
          const moduleIndex = system.modules.findIndex(m => m.id === editingModule.module!.id);
          if (moduleIndex !== -1) {
            system.modules[moduleIndex] = {
              ...system.modules[moduleIndex],
              ...normalizedValues,
              defaultSize: normalizedValues.defaultSize || { w: 6, h: 4 },
            };
          }
        } else {
          // 添加新模块
          system.modules.push({
            ...normalizedValues,
            defaultSize: normalizedValues.defaultSize || { w: 6, h: 4 },
            emittableEvents: [],
            listenableEvents: [],
          });
        }
      }

      updateConfigState({ ...config, apps: newApps });
      setModuleModalOpen(false);
      moduleForm.resetFields();
      setEditingModule(undefined);
      message.success(editingModule?.module ? '模块已更新' : '模块已添加');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 删除模块
  const handleDeleteModule = (systemId: string, moduleId: string) => {
    const newApps = [...config.apps];
    const system = newApps.find(app => app.id === systemId);
    if (system) {
      system.modules = system.modules.filter(m => m.id !== moduleId);
      updateConfigState({ ...config, apps: newApps });
      message.success('模块已删除');
    }
  };

  // 添加/编辑事件
  const handleSaveEvent = async () => {
    try {
      const values = await eventForm.validateFields();
      const newApps = [...config.apps];
      const system = newApps.find(app => app.id === editingEvent?.systemId);

      if (system) {
        const module = system.modules.find(m => m.id === editingEvent?.moduleId);
        if (module) {
          const eventList = editingEvent?.eventType === 'emittable'
            ? (module.emittableEvents || [])
            : (module.listenableEvents || []);

          if (editingEvent?.event) {
            // 编辑现有事件
            const eventIndex = eventList.findIndex(e => e.type === editingEvent.event!.type);
            if (eventIndex !== -1) {
              eventList[eventIndex] = values;
            }
          } else {
            // 添加新事件
            eventList.push(values);
          }

          if (editingEvent?.eventType === 'emittable') {
            module.emittableEvents = eventList;
          } else {
            module.listenableEvents = eventList;
          }
        }
      }

      updateConfigState({ ...config, apps: newApps });
      setEventModalOpen(false);
      eventForm.resetFields();
      setEditingEvent(undefined);
      message.success(editingEvent?.event ? '事件已更新' : '事件已添加');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 删除事件
  const handleDeleteEvent = (
    systemId: string,
    moduleId: string,
    eventType: 'emittable' | 'listenable',
    eventTypeValue: string
  ) => {
    const newApps = [...config.apps];
    const system = newApps.find(app => app.id === systemId);
    if (system) {
      const module = system.modules.find(m => m.id === moduleId);
      if (module) {
        if (eventType === 'emittable') {
          module.emittableEvents = (module.emittableEvents || []).filter(e => e.type !== eventTypeValue);
        } else {
          module.listenableEvents = (module.listenableEvents || []).filter(e => e.type !== eventTypeValue);
        }
        updateConfigState({ ...config, apps: newApps });
        message.success('事件已删除');
      }
    }
  };

  // 系统表格列
  const systemColumns: ColumnsType<MicroAppSystem> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 150 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '图标', dataIndex: 'icon', key: 'icon' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    {
      title: '模块数量',
      key: 'moduleCount',
      render: (_text, record) => <Tag color="blue">{record.modules.length}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_text, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingSystem(record);
              systemForm.setFieldsValue(record);
              setSystemModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此系统吗？"
            onConfirm={() => handleDeleteSystem(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 渲染模块卡片
  const renderModules = (system: MicroAppSystem) => {
    return (
      <div className="modules-section">
        <div className="modules-header">
          <h3>模块列表</h3>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingModule({ systemId: system.id, module: null });
              moduleForm.resetFields();
              setModuleModalOpen(true);
            }}
          >
            添加模块
          </Button>
        </div>
        <div className="modules-grid">
          {system.modules.map((module) => (
            <Card
              key={module.id}
              size="small"
              className="module-card"
              title={module.name}
              extra={
                <Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingModule({ systemId: system.id, module });
                      moduleForm.setFieldsValue(module);
                      setModuleModalOpen(true);
                    }}
                  />
                  <Popconfirm
                    title="确定删除此模块吗？"
                    onConfirm={() => handleDeleteModule(system.id, module.id)}
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              }
            >
              <p><strong>ID:</strong> {module.id}</p>
              <p><strong>描述:</strong> {module.description}</p>
              <p><strong>URL:</strong> {module.url}</p>
              <p><strong>Entry:</strong> {module.entry}</p>
              <p>
                <strong>默认尺寸:</strong> {module.defaultSize?.w || 6} x {module.defaultSize?.h || 4}
              </p>
              {module.forceIconOnly && (
                <Tag color="purple">图标模式</Tag>
              )}

              {/* 事件管理 */}
              <Tabs
                size="small"
                items={[
                  {
                    key: 'emittable',
                    label: `可发送事件 (${(module.emittableEvents || []).length})`,
                    children: (
                      <div className="events-list">
                        <Button
                          type="dashed"
                          size="small"
                          block
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setEditingEvent({
                              systemId: system.id,
                              moduleId: module.id,
                              eventType: 'emittable',
                              event: null,
                            });
                            eventForm.resetFields();
                            setEventModalOpen(true);
                          }}
                        >
                          添加可发送事件
                        </Button>
                        {(module.emittableEvents || []).map((event) => (
                          <Tag
                            key={event.type}
                            closable
                            onClose={() => handleDeleteEvent(system.id, module.id, 'emittable', event.type)}
                          >
                            {event.name} ({event.type})
                          </Tag>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: 'listenable',
                    label: `可监听事件 (${(module.listenableEvents || []).length})`,
                    children: (
                      <div className="events-list">
                        <Button
                          type="dashed"
                          size="small"
                          block
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setEditingEvent({
                              systemId: system.id,
                              moduleId: module.id,
                              eventType: 'listenable',
                              event: null,
                            });
                            eventForm.resetFields();
                            setEventModalOpen(true);
                          }}
                        >
                          添加可监听事件
                        </Button>
                        {(module.listenableEvents || []).map((event) => (
                          <Tag
                            key={event.type}
                            closable
                            onClose={() => handleDeleteEvent(system.id, module.id, 'listenable', event.type)}
                          >
                            {event.name} ({event.type})
                          </Tag>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="micro-app-config-page">
      <Card
        title={
          <Space>
            <AppstoreOutlined />
            微应用配置管理
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveToServer}
              loading={saving}
            >
              保存
            </Button>
            <Upload beforeUpload={handleImport} showUploadList={false}>
              <Button icon={<UploadOutlined />}>导入配置</Button>
            </Upload>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出配置
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingSystem(null);
                systemForm.resetFields();
                setSystemModalOpen(true);
              }}
            >
              添加系统
            </Button>
          </Space>
        }
      >
        <Table
          columns={systemColumns}
          dataSource={config.apps}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender: renderModules,
          }}
          pagination={false}
        />
      </Card>

      {/* 系统编辑对话框 */}
      <Modal
        title={editingSystem ? '编辑系统' : '添加系统'}
        open={systemModalOpen}
        onOk={handleSaveSystem}
        onCancel={() => {
          setSystemModalOpen(false);
          systemForm.resetFields();
          setEditingSystem(null);
        }}
        width={600}
      >
        <Form form={systemForm} layout="vertical">
          <Form.Item
            name="id"
            label="系统ID"
            rules={[{ required: true, message: '请输入系统ID' }]}
          >
            <Input placeholder="例如: system-finance" disabled={!!editingSystem} />
          </Form.Item>
          <Form.Item
            name="name"
            label="系统名称"
            rules={[{ required: true, message: '请输入系统名称' }]}
          >
            <Input placeholder="例如: 财务系统" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input.TextArea placeholder="系统描述信息" rows={3} />
          </Form.Item>
          <Form.Item
            name="icon"
            label="图标"
            rules={[{ required: true, message: '请输入图标' }]}
          >
            <Input placeholder="例如: AccountBookOutlined" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请输入分类' }]}
          >
            <Input placeholder="例如: 业务系统" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 模块编辑对话框 */}
      <Modal
        title={editingModule?.module ? '编辑模块' : '添加模块'}
        open={moduleModalOpen}
        onOk={handleSaveModule}
        onCancel={() => {
          setModuleModalOpen(false);
          moduleForm.resetFields();
          setEditingModule(undefined);
        }}
        width={700}
      >
        <Form form={moduleForm} layout="vertical">
          <Form.Item
            name="id"
            label="模块ID"
            rules={[{ required: true, message: '请输入模块ID' }]}
          >
            <Input placeholder="例如: finance-report" disabled={!!editingModule?.module} />
          </Form.Item>
          <Form.Item
            name="name"
            label="模块名称"
            rules={[{ required: true, message: '请输入模块名称' }]}
          >
            <Input placeholder="例如: 财务报表" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input.TextArea placeholder="模块描述信息" rows={2} />
          </Form.Item>
          <Form.Item
            name="url"
            label="访问URL"
            rules={[{ required: true, message: '请输入访问URL' }]}
          >
            <Input placeholder="例如: http://192.168.13.31:3001/#/report" />
          </Form.Item>
          <Form.Item
            name="entry"
            label="入口地址"
            rules={[{ required: true, message: '请输入入口地址' }]}
          >
            <Input placeholder="例如: http://192.168.13.31:3001/" />
          </Form.Item>
          <Form.Item name="icon" label="图标URL">
            <Input placeholder="模块图标地址（可选）" />
          </Form.Item>
          <Form.Item
            name="forceIconOnly"
            label="强制图标显示"
            valuePropName="checked"
            tooltip="启用后，小部件将始终以图标形式展示"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="iconSvg"
            label="SVG 图标"
            tooltip="可粘贴完整的 <svg>...</svg> 代码，优先于图标 URL"
          >
            <Input.TextArea rows={3} placeholder="<svg viewBox='0 0 24 24'>...</svg>" />
          </Form.Item>
          <Form.Item label="默认尺寸">
            <Space>
              <Form.Item name={['defaultSize', 'w']} noStyle initialValue={6}>
                <InputNumber min={1} max={12} placeholder="宽度" />
              </Form.Item>
              <span>x</span>
              <Form.Item name={['defaultSize', 'h']} noStyle initialValue={4}>
                <InputNumber min={1} placeholder="高度" />
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 事件编辑对话框 */}
      <Modal
        title={editingEvent?.event ? '编辑事件' : '添加事件'}
        open={eventModalOpen}
        onOk={handleSaveEvent}
        onCancel={() => {
          setEventModalOpen(false);
          eventForm.resetFields();
          setEditingEvent(undefined);
        }}
        width={600}
      >
        <Form form={eventForm} layout="vertical">
          <Form.Item
            name="type"
            label="事件类型"
            rules={[{ required: true, message: '请输入事件类型' }]}
          >
            <Input placeholder="例如: data:submit" disabled={!!editingEvent?.event} />
          </Form.Item>
          <Form.Item
            name="name"
            label="事件名称"
            rules={[{ required: true, message: '请输入事件名称' }]}
          >
            <Input placeholder="例如: 数据提交" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input.TextArea placeholder="事件描述信息" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MicroAppConfigPage;
