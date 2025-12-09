import React, { useState, useEffect } from 'react';
import { Button, Select, Table, Switch, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { EventRouteConfig, MicroAppWidgetConfig, EmittableEvent } from '@/types';
import { useStore } from '@/store/useStore';
import './index.scss';

interface EventRouteConfigComponentProps {
  value?: EventRouteConfig[];
  onChange?: (value: EventRouteConfig[]) => void;
  currentWidgetId: string; // 当前微应用小部件ID
  currentSystemId?: string; // 当前微应用的systemId
  currentModuleId?: string; // 当前微应用的moduleId
}

interface ReceiverApp {
  appId: string;
  appName: string;
  systemId: string;
  moduleId: string;
}

/**
 * 事件路由配置组件
 * 用于配置当前微应用(发送方)的事件要转发给哪些接收方微应用
 */
const EventRouteConfigComponent: React.FC<EventRouteConfigComponentProps> = ({
  value = [],
  onChange,
  currentWidgetId,
  currentSystemId,
  currentModuleId,
}) => {
  const { widgets } = useStore();
  const [routes, setRoutes] = useState<EventRouteConfig[]>(value);
  const [receiverApps, setReceiverApps] = useState<ReceiverApp[]>([]);
  const [currentAppEvents, setCurrentAppEvents] = useState<EmittableEvent[]>([]);
  const [microAppMetadata, setMicroAppMetadata] = useState<any>(null);
  const [receiverListenableEvents, setReceiverListenableEvents] = useState<Map<string, EmittableEvent[]>>(new Map());

  // 加载微应用配置元数据
  useEffect(() => {
    fetch('/config/micro-apps.json')
      .then(res => res.json())
      .then(data => {
        setMicroAppMetadata(data);
      })
      .catch(err => {
        console.error('Failed to load micro-apps config:', err);
        message.error('加载微应用配置失败');
      });
  }, []);

  // 从metadata中获取当前应用可以发送的事件
  useEffect(() => {
    if (!microAppMetadata || !currentSystemId || !currentModuleId) {
      setCurrentAppEvents([]);
      return;
    }

    const system = microAppMetadata.apps?.find((app: any) => app.id === currentSystemId);
    if (!system) {
      setCurrentAppEvents([]);
      return;
    }

    const module = system.modules?.find((mod: any) => mod.id === currentModuleId);
    if (!module || !module.emittableEvents) {
      setCurrentAppEvents([]);
      return;
    }

    setCurrentAppEvents(module.emittableEvents || []);
  }, [microAppMetadata, currentSystemId, currentModuleId]);

  // 从widgets中提取所有可作为接收方的微应用
  useEffect(() => {
    const receivers: ReceiverApp[] = [];

    widgets.forEach(widget => {
      if (widget.type !== 'microApp') return;
      if (widget.id === currentWidgetId) return; // 排除自己

      const config = widget.config as MicroAppWidgetConfig;
      if (!config.systemId || !config.moduleId) return;

      const appId = `${config.systemId}-${config.moduleId}`;

      receivers.push({
        appId,
        appName: widget.title || `${config.systemId}-${config.moduleId}`,
        systemId: config.systemId,
        moduleId: config.moduleId,
      });
    });

    setReceiverApps(receivers);
  }, [widgets, currentWidgetId]);

  // 加载每个接收方的可监听事件
  useEffect(() => {
    if (!microAppMetadata || receiverApps.length === 0) {
      setReceiverListenableEvents(new Map());
      return;
    }

    const eventMap = new Map<string, EmittableEvent[]>();

    receiverApps.forEach(receiver => {
      const system = microAppMetadata.apps?.find((app: any) => app.id === receiver.systemId);
      if (!system) return;

      const module = system.modules?.find((mod: any) => mod.id === receiver.moduleId);
      if (!module) return;

      if (module.listenableEvents && module.listenableEvents.length > 0) {
        eventMap.set(receiver.appId, module.listenableEvents);
      }
    });

    setReceiverListenableEvents(eventMap);
  }, [microAppMetadata, receiverApps]);

  // 同步value变化
  useEffect(() => {
    setRoutes(value);
  }, [value]);

  // 通知父组件更新
  const triggerChange = (newRoutes: EventRouteConfig[]) => {
    setRoutes(newRoutes);
    onChange?.(newRoutes);
  };

  // 添加新路由
  const handleAddRoute = () => {
    if (currentAppEvents.length === 0) {
      message.warning('当前微应用没有配置可发送的事件');
      return;
    }

    if (receiverApps.length === 0) {
      message.warning('当前没有其他微应用可作为接收方');
      return;
    }

    const newRoute: EventRouteConfig = {
      eventType: '',
      toAppId: '',
      toAppName: '',
      enabled: true,
    };

    triggerChange([...routes, newRoute]);
  };

  // 删除路由
  const handleDeleteRoute = (index: number) => {
    const newRoutes = routes.filter((_, i) => i !== index);
    triggerChange(newRoutes);
  };

  // 更新路由
  const handleUpdateRoute = (index: number, updates: Partial<EventRouteConfig>) => {
    const newRoutes = [...routes];
    newRoutes[index] = { ...newRoutes[index], ...updates };
    triggerChange(newRoutes);
  };

  // 选择接收方应用时触发
  const handleSelectReceiverApp = (index: number, appId: string) => {
    const receiver = receiverApps.find(r => r.appId === appId);
    if (!receiver) return;

    handleUpdateRoute(index, {
      toAppId: appId,
      toAppName: receiver.appName,
    });
  };

  // Table列定义
  const columns = [
    {
      title: '发送事件',
      dataIndex: 'eventType',
      key: 'eventType',
      width: '25%',
      render: (eventType: string, _record: EventRouteConfig, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="选择要发送的事件"
          value={eventType || undefined}
          onChange={(value) => handleUpdateRoute(index, { eventType: value })}
          options={currentAppEvents.map(event => ({
            label: `${event.name}`,
            value: event.type,
          }))}
        />
      ),
    },
    {
      title: '接收方应用',
      dataIndex: 'toAppId',
      key: 'toAppId',
      width: '25%',
      render: (toAppId: string, _record: EventRouteConfig, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="选择接收方"
          value={toAppId || undefined}
          onChange={(value) => handleSelectReceiverApp(index, value)}
          options={receiverApps.map(app => ({
            label: app.appName,
            value: app.appId,
          }))}
        />
      ),
    },
    {
      title: '接收事件',
      dataIndex: 'toEventType',
      key: 'toEventType',
      width: '25%',
      render: (toEventType: string, record: EventRouteConfig, index: number) => {
        const receiverEvents = receiverListenableEvents.get(record.toAppId) || [];
        const hasReceiverEvents = receiverEvents.length > 0;

        return (
          <Select
            style={{ width: '100%' }}
            placeholder={
              !record.toAppId
                ? '请先选择接收方'
                : !hasReceiverEvents
                ? '接收方无可监听事件'
                : '选择接收事件类型'
            }
            value={toEventType || undefined}
            allowClear
            disabled={!record.toAppId || !hasReceiverEvents}
            onChange={(value) => handleUpdateRoute(index, { toEventType: value })}
            options={receiverEvents.map(event => ({
              label: `${event.name} (${event.type})`,
              value: event.type,
            }))}
          />
        );
      },
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: '10%',
      align: 'center' as const,
      render: (enabled: boolean, _record: EventRouteConfig, index: number) => (
        <Switch
          checked={enabled !== false}
          onChange={(checked) => handleUpdateRoute(index, { enabled: checked })}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: '15%',
      align: 'center' as const,
      render: (_: any, _record: EventRouteConfig, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteRoute(index)}
        />
      ),
    },
  ];

  return (
    <div className="event-route-config">
      <div className="event-route-config-header">
        {/* <div className="event-route-config-title">事件路由配置</div> */}
        <div className="event-route-config-description">
          配置当前微应用发送的事件要转发给哪些接收方
        </div>
      </div>

      <Table
        dataSource={routes}
        columns={columns}
        rowKey={(record, index) => `${record.eventType}-${record.toAppId}-${index}`}
        pagination={false}
        size="small"
        locale={{
          emptyText: '暂无事件路由配置',
        }}
      />

      <div className="event-route-config-footer">
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddRoute}
          block
          disabled={currentAppEvents.length === 0 || receiverApps.length === 0}
        >
          添加事件路由
        </Button>
        {currentAppEvents.length === 0 && (
          <div className="event-route-config-hint">
            提示: 当前微应用没有配置可发送的事件
          </div>
        )}
        {currentAppEvents.length > 0 && receiverApps.length === 0 && (
          <div className="event-route-config-hint">
            提示: 需要先添加其他微应用小部件作为接收方
          </div>
        )}
      </div>
    </div>
  );
};

export default EventRouteConfigComponent;
