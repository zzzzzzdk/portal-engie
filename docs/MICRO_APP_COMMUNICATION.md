# 微应用通信指南

## 概述

Portal Engine 使用基于配置的事件路由机制实现微应用间通信。子应用使用 Wujie 官方的 `bus.$emit()` 发送事件，主应用根据配置动态监听并转发到目标子应用。

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                主应用 (Portal Engine)                    │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │    MicroAppCommunicationManager                   │  │
│  │    - 根据配置动态监听发送方事件                      │  │
│  │    - 自动转发到配置的接收方                         │  │
│  │    - 支持事件类型转换                               │  │
│  └──────────────────────────────────────────────────┘  │
│           ↑  bus.$on(eventType)     bus.$emit()  ↓      │
│  ┌──────────┐              ┌──────────┐                │
│  │ 发送方应用 │              │ 接收方应用 │                │
│  │(input-only)│             │(table-only)│               │
│  └──────────┘              └──────────┘                │
└─────────────────────────────────────────────────────────┘
```

## 配置方式

### 1. 定义应用可发送的事件

在 `public/config/micro-apps.json` 中为发送方模块定义 `emittableEvents`：

```json
{
  "id": "input-only",
  "name": "表单",
  "emittableEvents": [
    {
      "type": "data:submit:input-only",
      "name": "数据提交",
      "description": "提���融合数据到其他系统"
    }
  ]
}
```

### 2. 定义应用可监听的事件

为接收方模块定义 `listenableEvents`：

```json
{
  "id": "table-only",
  "name": "结果页",
  "listenableEvents": [
    {
      "type": "data:submit:table-only",
      "name": "数据提交",
      "description": "接收数据提交事件"
    }
  ]
}
```

### 3. 在主应用中配置事件路由

打开发送方微应用的设置 → 事件路由配置：
1. 选择发送事件（从 emittableEvents）
2. 选择接收方应用
3. 选择接收事件类型（从接收方的 listenableEvents）
4. 启用路由

配置保存后，主应用会自动设置相应的监听器。

## 子应用集成

### 发送方子应用

使用 Wujie 官方 API 发送事件：

```typescript
// 获取 Wujie bus
const bus = window.$wujie?.bus;

// 发送事件
bus?.$emit('data:submit:input-only', {
  name: '张三',
  age: 30,
  department: '技术部'
});
```

### 接收方子应用

监听来自主应用的转发消息：

```typescript
// 接收方应用ID格式: systemId-moduleId
const appId = 'system-finance-table-only';

// 监听转发的事件
window.$wujie?.bus.$on('data:submit:table-only', (message) => {
  console.log('收到转发消息:', message);
  // message.from: 发送方 appId
  // message.type: 事件类型
  // message.payload: 原始数据
  // message.timestamp: 时间戳

  // 处理接收到的数据
  handleReceivedData(message);
});
```

## 完整示例

### 示例：表单提交到表格展示

#### 1. 配置 (micro-apps.json)

```json
{
  "apps": [
    {
      "id": "system-fusion",
      "modules": [
        {
          "id": "input-only",
          "name": "表单",
          "emittableEvents": [
            {
              "type": "data:submit:input-only",
              "name": "数据提交"
            }
          ]
        }
      ]
    },
    {
      "id": "system-finance",
      "modules": [
        {
          "id": "table-only",
          "name": "结果页",
          "listenableEvents": [
            {
              "type": "data:submit:table-only",
              "name": "数据提交"
            }
          ]
        }
      ]
    }
  ]
}
```

#### 2. 主应用配置路由

在表单小部件设置中配置：
- 发送事件: `data:submit:input-only`
- 接收方: `system-finance-table-only`
- 接收事件: `data:submit:table-only`
- 启用: ✓

#### 3. 发送方代码 (input-only 子应用)

```typescript
const handleSubmit = (formData: any) => {
  // 发送数据
  window.$wujie?.bus.$emit('data:submit:input-only', {
    id: Date.now(),
    name: formData.name,
    age: formData.age,
    department: formData.department,
    timestamp: new Date().toISOString()
  });

  message.success('数据已提交');
};
```

#### 4. 接收方代码 (table-only 子应用)

```typescript
import { useEffect, useState } from 'react';

const TableComponent = () => {
  const [dataSource, setDataSource] = useState([]);

  useEffect(() => {
    // 监听事件
    const handler = (message: any) => {
      console.log('收到数据:', message);

      // 添加到表格
      setDataSource(prev => [...prev, message]);
    };

    window.$wujie?.bus.$on('data:submit:table-only', handler);

    // 清理监听器
    return () => {
      window.$wujie?.bus.$off('data:submit:table-only', handler);
    };
  }, []);

  return <Table dataSource={dataSource} />;
};
```

## 调试

### 浏览器控制台

主应用会输出详细的调试日志：

```
[MicroAppCommunication] Setting up event listeners based on current routes
[MicroAppCommunication] Setting up listener: {fromAppId: "system-fusion-input-only", eventType: "data:submit:input-only", ...}
[MicroAppCommunication] Total listeners registered: 1

[MicroAppCommunication] Received event from subapp: {from: "system-fusion-input-only", eventType: "data:submit:input-only", ...}
[MicroAppCommunication] Forwarding to receiver: {toAppId: "system-finance-table-only", targetEventType: "data:submit:table-only", ...}
```

### 调试工具

在浏览器控制台可用：

```javascript
// 查看所有配置的路由
window.__microAppCommunication.debugGetAllRoutes()

// 重新设置监听器（配置更新后）
window.__microAppCommunication.setupEventListeners()

// 测试发送事件
window.__microAppCommunication.testSend('data:submit:input-only', {test: 'data'})
```

## 最佳实践

1. **事件类型命名**: 使用 `{action}:{entity}:{appId}` 格式，如 `data:submit:input-only`
2. **清理监听器**: 组件卸载时务必清理 `bus.$off()`
3. **错误处理**: 接收方应妥善处理异常数据
4. **调试模式**: 开发时查看控制台日志确认事件流转
5. **类型安全**: 发送和接收方约定好数据结构

## 常见问题

### Q: 配置后没有收到消息？

检查以下几点：
1. 确认路由配置已保存
2. 确认事件类型完全匹配
3. 查看浏览器控制台的调试日志
4. 使用 `debugGetAllRoutes()` 查看当前配置

### Q: 如何支持一对多转发？

在发送方配置中添加多条路由，每条指向不同的接收方。

### Q: 能否动态修改路由？

可以，修改小部件配置并保存后，监听器会自动重新设置。

## 与旧方案的区别

**旧方案**（已废弃）:
- 子应用调用 `communication.send()` 方法
- 主应用监听统一的 `microapp:event` 事件

**新方案**（当前）:
- 子应用使用 Wujie 官方 `bus.$emit(eventType, payload)`
- 主应用根据配置动态监听具体的事件类型
- 通过 UI 配置事件路由，无需编程
