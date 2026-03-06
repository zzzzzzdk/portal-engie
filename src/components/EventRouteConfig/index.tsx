import React, { useState, useEffect } from 'react';
import { Button, Select, Switch, message, Empty, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { EventRouteConfig, MicroAppWidgetConfig, EmittableEvent } from '@/types';
import { useStore } from '@/store/useStore';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import './index.scss';

interface EventRouteConfigComponentProps {
  value?: EventRouteConfig[];
  onChange?: (value: EventRouteConfig[]) => void;
  currentWidgetId: string; // 当前微应用小部件ID
  currentSystemId?: string; // 当前微应用的systemId
  currentModuleId?: string; // 当前微应用的moduleId
  senderEvents?: EmittableEvent[]; // 非微应用组件可直接传入发送事件列表
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
  senderEvents,
}) => {
  const { widgets } = useStore();
  const routes = value; // 直接使用受控值，不维护内部状态
  const [receiverApps, setReceiverApps] = useState<ReceiverApp[]>([]);
  const [currentAppEvents, setCurrentAppEvents] = useState<EmittableEvent[]>([]);
  const [microAppMetadata, setMicroAppMetadata] = useState<any>(null);
  const [receiverListenableEvents, setReceiverListenableEvents] = useState<Map<string, EmittableEvent[]>>(new Map());

  // 加载微应用配置元数据 - 使用统一的 microAppConfigLoader
  useEffect(() => {
    microAppConfigLoader.loadMetadata()
      .then(data => {
        setMicroAppMetadata(data);
      })
      .catch(err => {
        console.error('Failed to load micro-apps config:', err);
        message.error('加载微应用配置失败');
      });
  }, []);

  // 从metadata中获取当前应用可以发送的事件（非微应用组件直接使用 senderEvents）
  useEffect(() => {
    if (senderEvents && senderEvents.length > 0) {
      setCurrentAppEvents(senderEvents);
      return;
    }

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
  }, [microAppMetadata, currentSystemId, currentModuleId, senderEvents]);

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

  // 通知父组件更新（受控模式，由 Form 管理状态）
  const triggerChange = (newRoutes: EventRouteConfig[]) => {
    onChange?.(newRoutes);
  };

  // 添加新路由
  const handleAddRoute = () => {
    if (currentAppEvents.length === 0) {
      message.warning('当前组件没有配置可发送的事件');
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

  return (
    <div className="event-route-config">
       <div className="event-route-header">
          {/* <div className="title">事件路由</div> */}
          <div className="subtitle">配置事件流向，将当前微应用的事件分发给其他应用</div>
       </div>

       <div className="route-list">
          {routes.length === 0 ? (
             <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="暂无事件路由配置" 
                style={{margin: '24px 0'}}
             />
          ) : (
             routes.map((route, index) => {
                const receiverEvents = receiverListenableEvents.get(route.toAppId) || [];
                const hasReceiverEvents = receiverEvents.length > 0;
                
                return (
                   <div key={`${route.eventType}-${route.toAppId}-${index}`} className="route-card">
                      <div className="route-flow-row">
                         <div className="flow-node sender">
                            <span className="node-label">发送事件</span>
                            <Select
                               placeholder="选择要发送的事件"
                               value={route.eventType || undefined}
                               onChange={val => handleUpdateRoute(index, { eventType: val })}
                               options={currentAppEvents.map(e => ({label: `${e.name} (${e.type})`, value: e.type}))}
                               style={{width: '100%'}}
                               bordered={false}
                               className="node-select"
                            />
                         </div>
                         <div className="flow-arrow">
                            <ArrowRightOutlined />
                         </div>
                         <div className="flow-node receiver">
                            <span className="node-label">接收方应用</span>
                            <Select
                               placeholder="选择接收方"
                               value={route.toAppId || undefined}
                               onChange={val => handleSelectReceiverApp(index, val)}
                               options={receiverApps.map(a => ({label: a.appName, value: a.appId}))}
                               style={{width: '100%'}}
                               bordered={false}
                               className="node-select"
                            />
                         </div>
                      </div>
                      
                      <div className="route-action-row">
                         <div className="action-item event-type">
                            <span className="label">目标动作:</span>
                            <Select
                               placeholder={!route.toAppId ? '请先选择接收方' : !hasReceiverEvents ? '接收方无可监听事件' : '选择触发动作'}
                               value={route.toEventType || undefined}
                               disabled={!route.toAppId || !hasReceiverEvents}
                               onChange={val => handleUpdateRoute(index, { toEventType: val })}
                               options={receiverEvents.map(e => ({label: `${e.name} (${e.type})`, value: e.type}))}
                               className="action-select"
                               size="small"
                               allowClear
                            />
                         </div>
                         <div className="action-right">
                            <div className="action-item switch">
                               <span className="label">启用</span>
                               <Switch 
                                  size="small"
                                  checked={route.enabled !== false}
                                  onChange={checked => handleUpdateRoute(index, { enabled: checked })}
                               />
                            </div>
                            <Tooltip title="删除路由">
                               <Button 
                                  type="text" 
                                  danger 
                                  icon={<DeleteOutlined />} 
                                  onClick={() => handleDeleteRoute(index)}
                                  size="small"
                               />
                            </Tooltip>
                         </div>
                      </div>
                   </div>
                );
             })
          )}
       </div>

       <div className="event-route-footer">
          <Button 
             type="dashed" 
             block 
             icon={<PlusOutlined />} 
             onClick={handleAddRoute}
             disabled={currentAppEvents.length === 0 || receiverApps.length === 0}
          >
             添加事件路由
          </Button>
          
          {currentAppEvents.length === 0 && (
            <div style={{color: '#faad14', fontSize: 12, marginTop: 8}}>
              提示: 当前组件没有配置可发送的事件
            </div>
          )}
          {currentAppEvents.length > 0 && receiverApps.length === 0 && (
            <div style={{color: '#faad14', fontSize: 12, marginTop: 8}}>
              提示: 画布中没有其他微应用可作为接收方
            </div>
          )}
       </div>
    </div>
  );
};

export default EventRouteConfigComponent;
