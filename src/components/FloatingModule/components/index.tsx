import React from 'react';
import ChatComponent from './ChatComponent';
import NotificationComponent from './NotificationComponent';
import AssistantHubComponent from './AssistantHubComponent';
import type { LocalComponentType } from '@/types';

// 本地组件注册表
export const LocalComponentRegistry: Record<LocalComponentType, React.ComponentType<any>> = {
  chat: ChatComponent,
  notification: NotificationComponent,
  assistantHub: AssistantHubComponent,
  // 以下组件可以后续添加
  help: () => <div>帮助文档组件(待开发)</div>,
  calendar: () => <div>日历组件(待开发)</div>,
  notes: () => <div>笔记组件(待开发)</div>,
  custom: () => <div>自定义组件(待开发)</div>,
};

// 导出组件类型
export type { LocalComponentType } from '@/types';
export type { Notification } from './NotificationComponent';
