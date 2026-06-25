import React, { useState } from 'react';
import { List, Badge, Tabs, Empty, Tag } from 'antd';
import { MessageOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import './index.scss';

export interface Notification {
  id: string;
  type: 'info' | 'message' | 'warning';
  title: string;
  content: string;
  time: Date;
  read: boolean;
}

interface NotificationComponentProps {
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  emitWidgetEvent?: (eventName: string, payload: Record<string, any>, trigger?: 'click' | 'change' | 'submit' | 'reset' | 'system') => void;
}

const NotificationComponent: React.FC<NotificationComponentProps> = ({
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
  emitWidgetEvent
}) => {
  const [activeTab, setActiveTab] = useState('all');

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageOutlined style={{ color: '#1890ff' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'message':
        return <Tag color="blue">消息</Tag>;
      case 'warning':
        return <Tag color="orange">警告</Tag>;
      default:
        return <Tag color="green">系统</Tag>;
    }
  };

  const filteredNotifications = activeTab === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeTab);

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (time: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(time).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return time.toLocaleDateString('zh-CN');
  };

  return (
    <div className="notification-component">
      <div className="notification-header">
        <h3>通知中心</h3>
        <div className="header-actions">
          {unreadCount > 0 && <Badge count={unreadCount} />}
          {unreadCount > 0 && (
            <a onClick={() => {
              emitWidgetEvent?.('notification.read', { all: true }, 'click');
              onMarkAllRead?.();
            }}>全部已读</a>
          )}
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'all', label: `全部 (${notifications.length})` },
          { key: 'info', label: '系统' },
          { key: 'message', label: '消息' },
          { key: 'warning', label: '警告' },
        ]}
      />

      <div className="notification-list">
        {filteredNotifications.length > 0 ? (
          <List
            dataSource={filteredNotifications}
            renderItem={item => (
              <List.Item
                className={item.read ? 'read' : 'unread'}
                onClick={() => {
                  emitWidgetEvent?.('notification.click', { notification: item }, 'click');
                  if (!item.read) {
                    emitWidgetEvent?.('notification.read', { id: item.id, notification: item }, 'click');
                  }
                  onNotificationClick?.(item);
                }}
              >
                <div className="notification-item">
                  <div className="icon">{getIcon(item.type)}</div>
                  <div className="content">
                    <div className="header-row">
                      <div className="title">{item.title}</div>
                      {getTypeLabel(item.type)}
                    </div>
                    <div className="text">{item.content}</div>
                    <div className="time">{formatTime(item.time)}</div>
                  </div>
                  {!item.read && <Badge dot className="unread-badge" />}
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty
            description="暂无通知"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    </div>
  );
};

export default NotificationComponent;
