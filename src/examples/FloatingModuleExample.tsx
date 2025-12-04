/**
 * FloatingModule 使用示例
 *
 * 这个文件展示了如何使用 FloatingModule 功能
 * 可以在任何页面中导入并使用这些示例按钮
 */

import React from 'react';
import { Button, Space, Card } from 'antd';
import { MessageOutlined, BellOutlined, RobotOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import type { Notification } from '@/components/FloatingModule/components';

const FloatingModuleExample: React.FC = () => {
  const { addFloatingModuleLocal, addFloatingModuleMicroApp } = useStore();

  // 示例1: 添加聊天组件
  const handleAddChat = () => {
    addFloatingModuleLocal(
      'chat',
      '在线客服',
      {
        botName: 'AI 智能助手',
        welcomeMessage: '您好！我是 AI 智能助手，有什么可以帮您的吗？',
        onSendMessage: async (message: string) => {
          // 模拟 API 调用
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 简单的回复逻辑
          if (message.includes('你好') || message.includes('您好')) {
            return '您好！很高兴为您服务！';
          } else if (message.includes('帮助')) {
            return '我可以帮您解答问题、提供建议等。请告诉我您需要什么帮助？';
          } else {
            return `收到您的消息："${message}"。我会尽快为您处理！`;
          }
        },
      },
      {
        width: 380,
        height: 400,
        defaultPosition: 'bottom-right',
        theme: 'light',
        borderRadius: 12,
        resizable: true,
        collapsible: true,
        closable: true,
      }
    );
  };

  // 示例2: 添加通知中心
  const handleAddNotification = () => {
    // 模拟通知数据
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'info',
        title: '系统更新',
        content: 'Portal Engine 已更新到 v2.0.0，新增悬浮模块功能！',
        time: new Date(Date.now() - 1000 * 60 * 5), // 5分钟前
        read: false,
      },
      {
        id: '2',
        type: 'message',
        title: '新消息',
        content: '您有一条来自管理员的新消息，请及时查看。',
        time: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前
        read: false,
      },
      {
        id: '3',
        type: 'warning',
        title: '安全提醒',
        content: '检测到异常登录行为，请确认是否为本人操作。',
        time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小时前
        read: true,
      },
      {
        id: '4',
        type: 'info',
        title: '维护通知',
        content: '系统将在今晚 22:00-24:00 进行维护，请提前保存数据。',
        time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1天前
        read: true,
      },
    ];

    addFloatingModuleLocal(
      'notification',
      '通知中心',
      {
        notifications: mockNotifications,
        onNotificationClick: (notification: Notification) => {
          console.log('点击通知:', notification);
          alert(`通知详情：\n标题: ${notification.title}\n内容: ${notification.content}`);
        },
        onMarkAllRead: () => {
          console.log('标记全部已读');
          alert('所有通知已标记为已读');
        },
      },
      {
        width: 400,
        height: 400,
        defaultPosition: 'top-right',
        theme: 'light',
        borderRadius: 12,
        resizable: true,
        collapsible: true,
        closable: true,
      }
    );
  };

  // 示例3: 添加微应用（如果你有微应用的话）
  const handleAddMicroApp = () => {
    // 注意：这需要你有一个实际运行的微应用
    // 这里使用假设的 URL，需要替换为实际的微应用地址
    addFloatingModuleMicroApp(
      'demo-system',
      'chatbot-module',
      {
        id: 'chatbot-module',
        name: '智能客服机器人',
        url: 'http://192.168.13.31:3001',
        entry: 'http://192.168.13.31:3001/index.html',
        defaultSize: { w: 6, h: 4 },
      },
      {
        width: 400,
        height: 600,
        defaultPosition: 'bottom-right',
        theme: 'light',
        borderRadius: 12,
        resizable: true,
        collapsible: true,
        closable: true,
      }
    );
  };

  return (
    <Card title="FloatingModule 功能示例" style={{ maxWidth: 600, margin: '20px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <h3>本地组件示例</h3>
          <Space wrap>
            <Button
              type="primary"
              icon={<MessageOutlined />}
              onClick={handleAddChat}
            >
              打开在线客服
            </Button>

            <Button
              type="default"
              icon={<BellOutlined />}
              onClick={handleAddNotification}
            >
              打开通知中心
            </Button>
          </Space>
        </div>

        <div>
          <h3>微应用示例</h3>
          <Button
            type="dashed"
            icon={<RobotOutlined />}
            onClick={handleAddMicroApp}
          >
            打开微应用机器人
          </Button>
          <p style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            注意：需要有实际运行的微应用才能使用
          </p>
        </div>

        <div>
          <h3>使用说明</h3>
          <ul style={{ fontSize: 14, lineHeight: 1.8 }}>
            <li>点击按钮后，悬浮模块会出现在屏幕上</li>
            <li>在<strong>编辑模式</strong>下，可以拖拽和调整大小</li>
            <li>点击头部的图标可以展开/折叠模块</li>
            <li>点击关闭按钮可以移除模块</li>
            <li>多个模块可以同时存在</li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};

export default FloatingModuleExample;
