# 数据源选择组件设计方案

## 需求背景

当前工作台组件配置中，数据获取方式仅有「静态数据」和「API 接口」两种。用户希望新增第三种方式：直接从已保存的数据源列表中选择，预填充接口配置并支持局部覆盖。

## 需求总结

1. **新增数据源模式**：在下拉菜单中增加"数据源"选项
2. **数据源选择**：下拉框支持模糊检索（仅匹配名称），展示「名称 + HTTP 方法」，用颜色区分 GET/POST
3. **可覆盖**：选择数据源后预填充配置，但仍可在组件中局部覆盖
4. **安全降级**：引用的数据源被删除时，自动降级为静态模式并弹窗提示
5. **切换清空**：切换数据源类型时清空配置

## 一、组件设计

### 组件位置

`src/components/DataSourceSelect/index.tsx`

### Props 接口

```typescript
interface DataSourceSelectProps {
  value?: string          // 选中的数据源 ID
  onChange?: (id: string, dataSource: DataSourceItem) => void
  placeholder?: string
  disabled?: boolean
  width?: number | string
  mode?: 'single' | 'multiple'  // 扩展预留，当前仅 single
}
```

### 组件内部结构

- 使用 Ant Design `Select` 组件
- `showSearch` 开启模糊检索
- `filterOption` 仅匹配 `name` 字段
- 自定义 option labelRender：展示「方法标签 + 名称」

### 方法颜色

- GET → 绿色（`#52c41a`）
- POST → 蓝色（`#1677ff`）

### 请求来源

直接调用 `getDataSourceList({ page: 1, page_size: 999 })` 获取全量列表（后端支持不分页全量返回）

## 二、数据流与配置存储

### 组件配置数据结构

新增 `dataSourceId` 字段到 widget 的 `apiConfig` 配置中：

```typescript
// ApiConfig 新增字段
interface ApiConfig {
  // ... 现有字段
  dataSourceId?: string   // 选中的数据源 ID
}
```

### 数据源加载与配置合并流程

```
用户选择数据源 ID
    ↓
getDataSourceDetail({ id }) → 获取数据源完整配置
    ↓
合并配置：{ ...dataSource配置, ...当前组件覆盖配置 }
    ↓
requestWidgetApi(合并后配置) → 发起请求
```

### ConfigDialog 中的交互

```
┌─ 数据源类型下拉 ─────────────────────┐
│ ○ 静态数据                            │
│ ○ API 接口                            │
│ ● 数据源    ←────── 选中后展开下方组件  │
└───────────────────────────────────────┘
┌─ DataSourceSelect 下拉（仅在"数据源"模式下显示）─┐
│ 🔍 搜索数据源...                              │
│ ─────────────────────────────────────────── │
│ 🟢 GET  ds_001 - 任务列表演示               │
│ 🟢 GET  ds_002 - 新闻动态演示               │
│ 🔵 POST ds_003 - 告警排行演示               │
└─────────────────────────────────────────────┘
┌─ 覆盖配置（可选） ───────────────────────────┐
│ □ 覆盖 URL     □ 覆盖请求参数               │
│ □ 覆盖列表字段 □ 覆盖分页配置               │
└─────────────────────────────────────────────┘
```

## 三、错误处理与降级策略

### 数据源不存在时的降级流程

```
组件挂载 / 页面加载
    ↓
检查 dataSourceId 是否存在
    ↓
是 → getDataSourceDetail({ id })
    ↓
结果：
├─ 找到 → 加载数据源配置，正常渲染
└─ 找不到（404/网络错误）→ 弹出 warning 提示
    │
    ├─ 清空 dataSourceId
    ├─ 切换为静态数据模式
    └─ 保留其他静态配置内容
```

### 实现位置

| 场景 | 实现位置 |
|------|---------|
| ConfigDialog 编辑时检测 | `ConfigDialog/index.tsx` 的 `useEffect` |
| Widget 运行时请求前检测 | widget 组件内 |
| 全局数据源列表接口错误 | `DataSourceSelect` 组件内 |

## 四、受影响的文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/DataSourceSelect/index.tsx` | 数据源选择通用组件 |
| `src/components/DataSourceSelect/index.scss` | 组件样式 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/types/index.ts` | `ApiConfig` 新增 `dataSourceId` 字段 |
| `src/components/ConfigDialog/index.tsx` | 增加数据源类型选项和 `DataSourceSelect` |
| `src/services/dataSource.ts` | `getDataSourceList` 增加全量返回支持 |
| `src/components/widgets/*` | 各 widget 组件适配 `dataSourceId` 加载逻辑 |

## 五、实现优先级

1. **P0**：新增 DataSourceSelect 组件
2. **P0**：ConfigDialog 接入 DataSourceSelect
3. **P0**：数据源不存在时的降级处理
4. **P1**：各 widget 组件适配 dataSourceId
