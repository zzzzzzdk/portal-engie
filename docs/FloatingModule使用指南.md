# FloatingModule 悬浮模块使用指南

## 概述

FloatingModule 是一个支持拖拽、调整大小的悬浮模块系统，可以嵌入微应用或本地组件。

## 功能特性

- ✅ 支持微应用嵌入（通过 Wujie）
- ✅ 支持本地组件嵌入（聊天、通知等）
- ✅ 支持拖拽移动位置
- ✅ 支持调整大小
- ✅ 支持展开/折叠
- ✅ 支持自定义主题
- ✅ 支持多个悬浮模块同时存在

## 快速开始

### 通过界面添加悬浮模块

在应用顶部菜单中，点击"添加小部件"按钮，在下拉菜单的"悬浮模块"分组中可以找到：

1. **在线客服** - 添加聊天机器人悬浮窗口
2. **通知中心** - 添加通知列表悬浮窗口
3. **微应用（悬浮）** - 从微应用市场选择微应用，以悬浮模式添加

这是最简单的使用方式，无需编写任何代码！

## 使用方法

### 1. 添加微应用类型的悬浮模块

```typescript
import { useStore } from '@/store/useStore';

const MyComponent = () => {
  const { addFloatingModuleMicroApp } = useStore();

  const handleAddChatBot = () => {
    addFloatingModuleMicroApp(
      'system-id',      // 系统ID
      'module-id',      // 模块ID
      {
        name: '智能客服',
        url: 'http://localhost:3001',
        entry: 'http://localhost:3001/index.html',
      },
      {
        // 可选的自定义配置
        width: 400,
        height: 600,
        defaultPosition: 'bottom-right',
      }
    );
  };

  return (
    <button onClick={handleAddChatBot}>添加智能客服</button>
  );
};
```

### 2. 添加本地组件类型的悬浮模块

#### 2.1 添加聊天组件

```typescript
import { useStore } from '@/store/useStore';

const MyComponent = () => {
  const { addFloatingModuleLocal } = useStore();

  const handleAddChat = () => {
    addFloatingModuleLocal(
      'chat',           // 组件类型
      '在线客服',        // 标题
      {
        // 组件的 props
        botName: '小助手',
        welcomeMessage: '您好！有什么可以帮您？',
        onSendMessage: async (message: string) => {
          // 处理发送消息
          console.log('用户消息:', message);
          return '这是机器人的回复';
        }
      },
      {
        // 可选的自定义配置
        width: 380,
        height: 600,
        defaultPosition: 'bottom-right',
      }
    );
  };

  return (
    <button onClick={handleAddChat}>添加在线客服</button>
  );
};
```

#### 2.2 添加通知中心组件

```typescript
const handleAddNotification = () => {
  addFloatingModuleLocal(
    'notification',   // 组件类型
    '通知中心',        // 标题
    {
      // 组件的 props
      notifications: [
        {
          id: '1',
          type: 'info',
          title: '系统通知',
          content: '欢迎使用通知中心',
          time: new Date(),
          read: false,
        }
      ],
      onNotificationClick: (notification) => {
        console.log('点击通知:', notification);
      },
      onMarkAllRead: () => {
        console.log('标记全部已读');
      }
    },
    {
      width: 400,
      height: 600,
      defaultPosition: 'top-right',
    }
  );
};
```

### 3. 管理悬浮模块

```typescript
const {
  floatingModules,              // 获取所有悬浮模块
  removeFloatingModule,         // 移除悬浮模块
  updateFloatingModuleConfig,   // 更新配置
  updateFloatingModulePosition, // 更新位置
  updateFloatingModuleSize,     // 更新尺寸
  toggleFloatingModuleExpanded, // 切换展开/折叠
} = useStore();

// 移除悬浮模块
const handleRemove = (id: string) => {
  removeFloatingModule(id);
};

// 更新配置
const handleUpdateConfig = (id: string) => {
  updateFloatingModuleConfig(id, {
    theme: 'dark',
    borderRadius: 16,
  });
};

// 更新位置
const handleUpdatePosition = (id: string) => {
  updateFloatingModulePosition(id, { x: 100, y: 100 });
};

// 更新尺寸
const handleUpdateSize = (id: string) => {
  updateFloatingModuleSize(id, { width: 500, height: 700 });
};

// 切换展开/折叠
const handleToggle = (id: string) => {
  toggleFloatingModuleExpanded(id);
};
```

## 配置选项

### FloatingModuleConfig 接口

```typescript
interface FloatingModuleConfig {
  // 内容类型
  contentType: 'microApp' | 'localComponent';

  // 微应用配置（当 contentType 为 'microApp' 时）
  microApp?: {
    systemId: string;
    moduleId: string;
    url: string;
    entry: string;
    props?: Record<string, any>;
    sync?: boolean;
    alive?: boolean;
  };

  // 本地组件配置（当 contentType 为 'localComponent' 时）
  localComponent?: {
    componentType: LocalComponentType;
    componentProps?: Record<string, any>;
  };

  // 位置相关
  position?: { x: number; y: number };
  defaultPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

  // 尺寸相关
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;

  // 行为相关
  isExpanded?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  collapsible?: boolean;
  closable?: boolean;

  // 样式相关
  showHeader?: boolean;
  theme?: 'light' | 'dark';
  headerColor?: string;
  borderRadius?: number;
  zIndex?: number;
  icon?: React.ReactNode;

  // 折叠状态尺寸
  collapsedWidth?: number;
  collapsedHeight?: number;
}
```

### LocalComponentType 枚举

```typescript
type LocalComponentType =
  | 'chat'           // 聊天组件
  | 'notification'   // 通知中心
  | 'help'           // 帮助文档（待开发）
  | 'calendar'       // 日历（待开发）
  | 'notes'          // 笔记（待开发）
  | 'custom';        // 自定义组件（待开发）
```

## 在 Layout 中添加菜单项

如果你想在顶部菜单中添加快捷按钮来创建悬浮模块，可以在 [Layout/index.tsx](../src/components/Layout/index.tsx) 中添加：

```typescript
// 在 Layout 组件中导入
import { useStore } from '@/store/useStore';

const Layout = () => {
  const { addFloatingModuleLocal } = useStore();

  // 添加菜单项
  const floatingModuleItems: MenuProps['items'] = [
    {
      label: '在线客服',
      key: 'chat',
      onClick: () => {
        addFloatingModuleLocal('chat', '在线客服', {
          botName: '智能助手',
          welcomeMessage: '您好！有什么可以帮您？',
        });
      }
    },
    {
      label: '通知中心',
      key: 'notification',
      onClick: () => {
        addFloatingModuleLocal('notification', '通知中心', {
          notifications: []
        });
      }
    },
  ];

  // 在 Header 中添加下拉菜单
  return (
    <Header>
      <Dropdown menu={{ items: floatingModuleItems }}>
        <Button>悬浮模块</Button>
      </Dropdown>
    </Header>
  );
};
```

## 示例：完整的聊天机器人集成

```typescript
import React from 'react';
import { Button } from 'antd';
import { useStore } from '@/store/useStore';

const ChatBotButton: React.FC = () => {
  const { addFloatingModuleLocal } = useStore();

  const handleAddChatBot = () => {
    addFloatingModuleLocal(
      'chat',
      '智能客服',
      {
        botName: 'AI 助手',
        welcomeMessage: '您好！我是 AI 智能助手，有什么可以帮您的吗？',
        onSendMessage: async (message: string) => {
          try {
            // 调用后端 API 获取机器人回复
            const response = await fetch('/api/chatbot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message }),
            });
            const data = await response.json();
            return data.reply;
          } catch (error) {
            console.error('发送消息失败:', error);
            return '抱歉，服务暂时不可用，请稍后再试。';
          }
        },
      },
      {
        width: 380,
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
    <Button type="primary" onClick={handleAddChatBot}>
      打开智能客服
    </Button>
  );
};

export default ChatBotButton;
```

## 注意事项

1. **编辑模式**: 在编辑模式下，悬浮模块始终可以拖拽和调整大小
2. **非编辑模式**: 在非编辑模式下，只有配置了 `draggable: true` 的模块才能拖拽
3. **Z-Index**: 默认 z-index 为 9999，确保悬浮模块在最上层
4. **位置持久化**: 位置和尺寸会自动保存到 store 中
5. **性能**: 多个悬浮模块可能会影响性能，建议合理控制数量

## 扩展开发

### 添加新的本地组件

1. 创建组件文件: `src/components/FloatingModule/components/YourComponent/index.tsx`
2. 在 `src/types/index.ts` 中添加类型到 `LocalComponentType`
3. 在 `src/components/FloatingModule/components/index.ts` 中注册组件

示例：

```typescript
// 1. 创建组件
// src/components/FloatingModule/components/TodoComponent/index.tsx
import React from 'react';

interface TodoComponentProps {
  tasks?: string[];
  onAddTask?: (task: string) => void;
}

const TodoComponent: React.FC<TodoComponentProps> = ({ tasks = [], onAddTask }) => {
  return (
    <div className="todo-component">
      {/* 你的待办事项组件实现 */}
    </div>
  );
};

export default TodoComponent;

// 2. 在 types/index.ts 中添加类型
export type LocalComponentType =
  | 'chat'
  | 'notification'
  | 'todo'        // 新增
  | 'help'
  | 'calendar'
  | 'notes'
  | 'custom';

// 3. 在 components/index.ts 中注册
import TodoComponent from './TodoComponent';

export const LocalComponentRegistry: Record<LocalComponentType, React.ComponentType<any>> = {
  chat: ChatComponent,
  notification: NotificationComponent,
  todo: TodoComponent,  // 新增
  // ...
};
```

## 故障排查

### 悬浮模块不显示
- 检查 `floatingModules` 数组是否有数据
- 检查 Dashboard 组件是否正确渲染 FloatingModule
- 检查 z-index 是否被其他元素遮挡

### 拖拽不工作
- 确认在编辑模式下或配置了 `draggable: true`
- 检查 react-draggable 是否正确安装

### 微应用不加载
- 检查微应用 URL 和 entry 是否正确
- 检查网络请求是否成功
- 查看浏览器控制台是否有 Wujie 相关错误

## 相关文件

- 类型定义: [src/types/index.ts](../src/types/index.ts)
- Store 管理: [src/store/useStore.ts](../src/store/useStore.ts)
- 主组件: [src/components/FloatingModule/index.tsx](../src/components/FloatingModule/index.tsx)
- 聊天组件: [src/components/FloatingModule/components/ChatComponent/index.tsx](../src/components/FloatingModule/components/ChatComponent/index.tsx)
- 通知组件: [src/components/FloatingModule/components/NotificationComponent/index.tsx](../src/components/FloatingModule/components/NotificationComponent/index.tsx)
- 组件注册表: [src/components/FloatingModule/components/index.ts](../src/components/FloatingModule/components/index.ts)
