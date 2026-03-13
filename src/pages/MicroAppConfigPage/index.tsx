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
  Typography,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  LinkOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getMicroAppList,
  saveApp,
  saveModule,
  saveEvent,
  deleteMicroAppItem,
  importMicroAppConfig,
  exportMicroAppConfig,
  downloadMicroAppConfig,
} from '@/services/microApp';
import { microAppConfigLoader, MICRO_APP_CONFIG_CHANGED_EVENT, MicroAppConfigChangeDetail } from '@/utils/microAppConfig';
import type { EmittableEvent, MicroAppModule, MicroAppSystem, MicroAppMetadata } from '@/types';
import IconPicker from '@/components/IconPicker';
import { getIconValueType } from '@/components/IconPicker/types';
import { useTableScroll } from '@/hooks/useTableScroll';
import './index.scss';

// 使用 MicroAppMetadata 作为 MicroAppConfig 的别名
type MicroAppConfig = MicroAppMetadata;

const MicroAppConfigPage: React.FC = () => {
  const [config, setConfig] = useState<MicroAppConfig>({ version: '1.0.0', apps: [] });
  const { scrollY } = useTableScroll({ headerHeight: 191, footerHeight: 44 })

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

  // 加载配置 - 使用API接口
  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await getMicroAppList();
      if (res.code === 20000 && res.data) {
        updateConfigState(res.data);
      } else {
        message.error(res.message || '加载配置失败');
      }
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

  // 导出配置
  const handleExport = async () => {
    const hide = message.loading('正在导出配置...', 0);
    try {
      const res = await exportMicroAppConfig();
      if (res.code !== 20000 || !res.data?.download_url) {
        throw new Error(res.message || '导出链接获取失败');
      }
      const downloadRes = await downloadMicroAppConfig(res.data.download_url);
      const blob = downloadRes.data;
      if (!(blob instanceof Blob)) {
        throw new Error('导出数据异常');
      }
      let filename = 'micro-apps-config.json';
      const headerAccessor = downloadRes.headers as (Record<string, string | undefined> & {
        get?: (name: string) => string | null;
      });
      const disposition = headerAccessor?.get
        ? headerAccessor.get('content-disposition') || headerAccessor.get('Content-Disposition') || undefined
        : headerAccessor?.['content-disposition'] || headerAccessor?.['Content-Disposition'];
      if (disposition) {
        const matched = disposition.match(/filename="?([^"]+)"?/i);
        if (matched?.[1]) {
          filename = decodeURIComponent(matched[1]);
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('配置已导出');
    } catch (error) {
      console.error(error);
      message.error(error instanceof Error ? error.message : '导出配置失败');
    } finally {
      hide();
    }
  };

  // 导入配置 - 调用导入接口并刷新配置
  const handleImport = async (file: File) => {
    // 前端校验：仅允许 .json 文件
    if (!file.name.endsWith('.json')) {
      message.error('仅支持导入 .json 格式的配置文件');
      return false;
    }

    // 前端校验：读取文件内容并验证 JSON 格式
    try {
      const text = await file.text();
      JSON.parse(text);
    } catch {
      message.error('文件内容不是有效的 JSON 格式，请检查文件');
      return false;
    }

    const hide = message.loading('正在导入配置...', 0);
    try {
      const res = await importMicroAppConfig(file);
      if (res.code === 20000) {
        const stats = res.data;
        message.success(`导入成功`);
        await loadConfig();
      } else {
        message.error(res.message || '导入配置失败');
      }
    } catch (error) {
      console.error(error);
      // message.error('导入配置失败');
    } finally {
      hide();
    }
    return false; // 阻止 Upload 自动上传
  };

  // 添加/编辑系统 - 使用saveApp API
  const handleSaveSystem = async () => {
    try {
      const values = await systemForm.validateFields();
      setSaving(true);
      const res = await saveApp({
        id: editingSystem?.id, // 数据库ID（编辑时携带）
        systemId: editingSystem ? editingSystem.systemId || editingSystem.id : values.systemId, // 编辑时优先用systemId，没有则用id；新增时用用户输入
        name: values.name,
        description: values.description,
        icon: values.icon,
        category: values.category,
      });
      console.log(res)

      if (res.code === 20000) {
        message.success(editingSystem ? '系统已更新' : '系统已添加');
        setSystemModalOpen(false);
        systemForm.resetFields();
        setEditingSystem(null);
        // 刷新列表
        await loadConfig();
      } else {
        message.error(res.message || '保存失败');
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单校验错误
        return;
      }
      message.error('保存失败: ' + (error.message || '未知错误'));
      console.error('Save system error:', error);
    } finally {
      setSaving(false);
    }
  };

  // 删除系统 - 使用deleteMicroAppItem API
  const handleDeleteSystem = async (systemId: string) => {
    try {
      const res = await deleteMicroAppItem({ id: systemId, type: 'app' });
      if (res.code === 20000) {
        message.success('系统已删除');
        // 刷新列表
        await loadConfig();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error: any) {
      message.error('删除失败: ' + (error.message || '未知错误'));
      console.error('Delete system error:', error);
    }
  };

  // 添加/编辑微应用 - 使用saveModule API
  const handleSaveModule = async () => {
    try {
      const values = await moduleForm.validateFields();
      setSaving(true);

      // 根据图标值类型分别存储到 icon 或 iconSvg
      const iconType = getIconValueType(values.icon);
      const icon = iconType === 'svg' ? '' : (values.icon || '');
      const iconSvg = iconType === 'svg' ? values.icon?.trim() : '';

      const module = editingModule?.module;
      const res = await saveModule({
        id: module?.id, // 数据库ID（编辑时携带）
        moduleId: module ? module.moduleId || module.id : values.moduleId, // 编辑时优先用moduleId，没有则用id；新增时用用户输入
        systemId: editingModule?.systemId || '', // 所属系统ID
        name: values.name,
        description: values.description,
        url: values.url,
        entry: values.entry,
        icon,
        defaultSize: values.defaultSize || { w: 6, h: 4 },
        forceIconOnly: !!values.forceIconOnly,
        iconSvg: iconSvg || undefined,
      });

      if (res.code === 20000) {
        message.success(editingModule?.module ? '微应用已更新' : '微应用已添加');
        setModuleModalOpen(false);
        moduleForm.resetFields();
        setEditingModule(undefined);
        // 刷新列表
        await loadConfig();
      } else {
        message.error(res.message || '保存失败');
      }
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error('保存失败: ' + (error.message || '未知错误'));
      console.error('Save module error:', error);
    } finally {
      setSaving(false);
    }
  };

  // 删除微应用 - 使用deleteMicroAppItem API
  const handleDeleteModule = async (moduleId: string) => {
    try {
      const res = await deleteMicroAppItem({ id: moduleId, type: 'module' });
      if (res.code === 20000) {
        message.success('微应用已删除');
        // 刷新列表
        await loadConfig();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error: any) {
      message.error('删除失败: ' + (error.message || '未知错误'));
      console.error('Delete module error:', error);
    }
  };

  // 添加/编辑事件 - 使用saveEvent API
  const handleSaveEvent = async () => {
    try {
      const values = await eventForm.validateFields();
      setSaving(true);

      const eventType = editingEvent?.eventType === 'emittable'
        ? 'emittableEvents'
        : 'listenableEvents';

      const res = await saveEvent({
        id: editingEvent?.event?.id, // 数据库ID（编辑时携带）
        moduleId: editingEvent?.moduleId || '', // 所属微应用ID
        event_type: eventType,
        type: values.type,
        name: values.name,
        description: values.description,
      });

      if (res.code === 20000) {
        message.success(editingEvent?.event ? '事件已更新' : '事件已添加');
        setEventModalOpen(false);
        eventForm.resetFields();
        setEditingEvent(undefined);
        // 刷新列表
        await loadConfig();
      } else {
        message.error(res.message || '保存失败');
      }
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error('保存失败: ' + (error.message || '未知错误'));
      console.error('Save event error:', error);
    } finally {
      setSaving(false);
    }
  };

  // 删除事件 - 使用deleteMicroAppItem API
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await deleteMicroAppItem({ id: eventId, type: 'event' });
      if (res.code === 20000) {
        message.success('事件已删除');
        // 刷新列表
        await loadConfig();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error: any) {
      message.error('删除失败: ' + (error.message || '未知错误'));
      console.error('Delete event error:', error);
    }
  };

  const systemColumns: ColumnsType<MicroAppSystem> = [
    {
      title: '系统名称',
      key: 'systemId',
      width: 180,
      render: (_text, record) => (
        <div className="system-id-cell">
          <div className="system-id-cell__name">{record.name}</div>
          <div className="system-id-cell__id">{record.systemId || record.id}</div>
        </div>
      ),
    },
    // { title: '名称', dataIndex: 'name', key: 'name', responsive: ['lg'] },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    // { title: '图标', dataIndex: 'icon', key: 'icon', width: 140 },
    { title: '分类', dataIndex: 'category', key: 'category', width: 120 },
    {
      title: '微应用数量',
      key: 'moduleCount',
      render: (_text, record) => <Tag color="blue">{record.modules.length}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
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
            description="删除后该系统下的所有微应用和事件也将被删除"
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

  const renderModules = (system: MicroAppSystem) => {
    return (
      <div className="modules-section">
        <div className="modules-header">
          <div>
            <h3>微应用列表</h3>
            <p className="modules-header__desc">围绕 {system.name} 的业务微应用</p>
          </div>
          <Button
            type="primary"
            className="modules-header__add"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingModule({ systemId: system.id, module: null });
              moduleForm.resetFields();
              setModuleModalOpen(true);
            }}
          >
            添加微应用
          </Button>
        </div>
        <div className="modules-grid">
          {system.modules.map((module) => (
            <Card
              key={module.id}
              size="small"
              className="module-card"
            >
              <div className="module-card__header">
                <div>
                  <div className="module-card__title">{module.name}</div>
                  <div className="module-card__meta">ID: {module.moduleId || module.id}</div>
                </div>
                <Space size={8}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingModule({ systemId: system.id, module });
                      moduleForm.setFieldsValue({
                        ...module,
                        icon: module.iconSvg || module.icon,
                      });
                      setModuleModalOpen(true);
                    }}
                  />
                  <Popconfirm
                    title="确定删除此微应用吗？"
                    description="删除后该微应用下的所有事件也将被删除"
                    onConfirm={() => handleDeleteModule(module.id)}
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
              <div className="module-card__body">
                <Typography.Paragraph type="secondary">
                  描述：<Typography.Text type="secondary">{module.description || '无'}</Typography.Text>
                </Typography.Paragraph>
                <Typography.Paragraph className="module-card__link">
                  <LinkOutlined />
                  <a href={module.url} target="_blank" rel="noreferrer">{module.url}</a>
                </Typography.Paragraph>
                <Typography.Paragraph>
                  <Typography.Text type="secondary">Entry：</Typography.Text>
                  {module.entry || '无'}
                </Typography.Paragraph>
                <Typography.Paragraph>
                  <Typography.Text type="secondary">默认尺寸：</Typography.Text>
                  {module.defaultSize?.w || 6} × {module.defaultSize?.h || 4}
                </Typography.Paragraph>
                {module.forceIconOnly && (
                  <Tag color="purple">图标模式</Tag>
                )}
              </div>

              <Tabs
                size="small"
                className="module-card__tabs"
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
                            onClose={(e) => {
                              e.preventDefault();
                              handleDeleteEvent(event.id);
                            }}
                            title={`${event.name} (${event.type})`}
                          >
                            <span className="event-tag-text">{event.name} ({event.type})</span>
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
                            onClose={(e) => {
                              e.preventDefault();
                              handleDeleteEvent(event.id);
                            }}
                            title={`${event.name} (${event.type})`}
                          >
                            <span className="event-tag-text">{event.name} ({event.type})</span>
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
      <div className="page-toolbar">
        <Space size={12}>
          <Button icon={<ReloadOutlined />} onClick={loadConfig} loading={loading}>
            刷新
          </Button>
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".json">
            <Button icon={<UploadOutlined />}>导入配置</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出配置
          </Button>
        </Space>
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
      </div>

      <Table
        bordered
        columns={systemColumns}
        dataSource={config.apps}
        rowKey="id"
        loading={loading}
        expandable={{
          expandedRowRender: renderModules,
        }}
        pagination={false}
        className="system-table"
        scroll={{
          y: scrollY
        }}
      />

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
        confirmLoading={saving}
        width={600}
      >
        <Form form={systemForm} layout="vertical">
          <Form.Item
            name="systemId"
            label="系统ID"
            rules={[{ required: !editingSystem, message: '请输入系统ID' }]}
            hidden={!!editingSystem}
          >
            <Input placeholder="例如: system-finance" maxLength={64} showCount />
          </Form.Item>
          <Form.Item
            name="name"
            label="系统名称"
            rules={[{ required: true, message: '请输入系统名称' }]}
          >
            <Input placeholder="例如: 财务系统" maxLength={50} showCount />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="系统描述信息" rows={3} maxLength={200} showCount />
          </Form.Item>
          {/* <Form.Item
            name="icon"
            label="图标"
          >
            <IconPicker mode="simple" placeholder="选择系统图标" />
          </Form.Item> */}
          <Form.Item
            name="category"
            label="分类"
          // rules={[{ required: true, message: '请输入分类' }]}
          >
            <Input placeholder="例如: 业务系统" maxLength={30} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 微应用编辑对话框 */}
      <Modal
        title={editingModule?.module ? '编辑微应用' : '添加微应用'}
        open={moduleModalOpen}
        onOk={handleSaveModule}
        onCancel={() => {
          setModuleModalOpen(false);
          moduleForm.resetFields();
          setEditingModule(undefined);
        }}
        confirmLoading={saving}
        width={700}
      >
        <Form form={moduleForm} layout="vertical">
          <Form.Item
            name="moduleId"
            label="微应用ID"
            rules={[{ required: !editingModule?.module, message: '请输入微应用ID' }]}
            hidden={!!editingModule?.module}
          >
            <Input placeholder="例如: finance-report" maxLength={64} showCount />
          </Form.Item>
          <Form.Item
            name="name"
            label="微应用名称"
            rules={[{ required: true, message: '请输入微应用名称' }]}
          >
            <Input placeholder="例如: 财务报表" maxLength={50} showCount />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="微应用描述信息" rows={2} maxLength={200} showCount />
          </Form.Item>
          <Form.Item
            name="url"
            label="微应用URL"
            rules={[
              { required: true, message: '请输入微应用URL' },
              { type: 'url', message: '请输入有效的URL地址' },
            ]}
          >
            <Input placeholder="例如: http://192.168.13.31:3001/#/report" />
          </Form.Item>
          <Form.Item
            name="entry"
            label={"入口地址"}
            tooltip="入口地址用于微前端运行时拉取资源，应指向部署目录或 remoteEntry.js 所在路径；上面的「微应用URL」仅用于门户内打开页面时的默认路由。"
            rules={[
              { required: true, message: '请输入入口地址' },
              { type: 'url', message: '请输入有效的URL地址' },
            ]}
          >
            <Input placeholder="例如: http://192.168.13.31:3001/" />
          </Form.Item>
          <Form.Item
            name="icon"
            label="图标"
            tooltip="支持选择内置图标、输入URL、上传图片或粘贴SVG代码"
          >
            <IconPicker mode="full" placeholder="选择或上传微应用图标" />
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
          <Form.Item label="默认尺寸" required>
            <Space>
              <Form.Item name={['defaultSize', 'w']} noStyle initialValue={6} rules={[{ required: true, message: '请输入宽度' }]}>
                <InputNumber min={1} max={12} placeholder="宽度" />
              </Form.Item>
              <span>x</span>
              <Form.Item name={['defaultSize', 'h']} noStyle initialValue={4} rules={[{ required: true, message: '请输入高度' }]}>
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
        confirmLoading={saving}
        width={600}
      >
        <Form form={eventForm} layout="vertical">
          <Form.Item
            name="type"
            label="事件类型"
            rules={[{ required: true, message: '请输入事件类型' }]}
          >
            <Input placeholder="例如: data:submit" disabled={!!editingEvent?.event} maxLength={64} showCount />
          </Form.Item>
          <Form.Item
            name="name"
            label="事件名称"
            rules={[{ required: true, message: '请输入事件名称' }]}
          >
            <Input placeholder="例如: 数据提交" maxLength={50} showCount />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="事件描述信息" rows={3} maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MicroAppConfigPage;
