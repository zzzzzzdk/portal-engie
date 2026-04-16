# 数据源选择组件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在组件配置中新增"数据源"选项，允许用户从已保存的数据源列表中选择，支持模糊检索和配置覆盖。

**Architecture:** 新建 `DataSourceSelect` 通用组件 → 在 `ConfigDialog` 中替换 `Select` 选项 → 各 widget 组件适配数据源加载逻辑。

**Tech Stack:** React, Ant Design Select, TypeScript

---

## 文件结构概览

```
src/components/DataSourceSelect/
├── index.tsx          # 核心组件
└── index.scss         # 样式

src/types/index.ts     # 新增 dataSourceId 字段

src/components/ConfigDialog/index.tsx  # 接入 DataSourceSelect
```

---

## Task 1: 新建 DataSourceSelect 组件

**Files:**
- Create: `src/components/DataSourceSelect/index.tsx`
- Create: `src/components/DataSourceSelect/index.scss`

- [ ] **Step 1: 创建 DataSourceSelect 组件**

```tsx
// src/components/DataSourceSelect/index.tsx
import React, { useMemo } from 'react';
import { Select, Tag } from 'antd';
import { getDataSourceList } from '@/services/dataSource';
import type { DataSourceItem, DataSourceMethod } from '@/services/dataSource';
import './index.scss';

interface DataSourceSelectProps {
  value?: string;
  onChange?: (id: string, dataSource: DataSourceItem) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: number | string;
}

const METHOD_COLORS: Record<DataSourceMethod, string> = {
  GET: '#52c41a',
  POST: '#1677ff',
};

const METHOD_LABELS: Record<DataSourceMethod, string> = {
  GET: 'GET',
  POST: 'POST',
};

const DataSourceSelect: React.FC<DataSourceSelectProps> = ({
  value,
  onChange,
  placeholder = '请选择数据源',
  disabled = false,
  width,
}) => {
  const [dataSources, setDataSources] = React.useState<DataSourceItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    getDataSourceList({ page: 1, page_size: 999 })
      .then(res => {
        if (res.data?.list) {
          setDataSources(res.data.list);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const options = useMemo(() =>
    dataSources.map(ds => ({
      value: ds.id,
      label: ds.name,
      searchText: ds.name,  // 用于模糊匹配
      method: ds.method,
    })),
    [dataSources]
  );

  const handleChange = (id: string) => {
    const selected = dataSources.find(ds => ds.id === id);
    if (selected && onChange) {
      onChange(id, selected);
    }
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
      showSearch
      filterOption={(input, option) =>
        (option?.searchText as string)?.toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: width ?? '100%' }}
      options={options}
      optionLabelRender={(option) => (
        <div className="data-source-option">
          <Tag color={METHOD_COLORS[option.method as DataSourceMethod]}>
            {METHOD_LABELS[option.method as DataSourceMethod]}
          </Tag>
          <span>{option.label}</span>
        </div>
      )}
    />
  );
};

export default DataSourceSelect;
```

- [ ] **Step 2: 创建组件样式**

```scss
// src/components/DataSourceSelect/index.scss
.data-source-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

- [ ] **Step 3: 验证组件可正常编译**

Run: `npx tsc --noEmit`
Expected: 无编译错误

---

## Task 2: 在 ConfigDialog 中接入数据源选择

**Files:**
- Modify: `src/components/ConfigDialog/index.tsx` (约行 2830-2843)

当前代码（第 2830-2843 行）：
```tsx
<Form.Item
  name="dataSource"
  label="数据来源"
  initialValue="customApi"
  rules={[{ required: true, message: '请选择数据来源' }]}
>
  <Select
    options={[
      { label: '自定义接口', value: 'customApi' },
      { label: '静态数据', value: 'static' },
    ]}
  />
</Form.Item>
```

- [ ] **Step 1: 导入 DataSourceSelect 组件**

在文件顶部找到 import 语句，添加：
```tsx
import DataSourceSelect from '@/components/DataSourceSelect';
```

- [ ] **Step 2: 替换 Select options 并增加数据源选项**

修改 `options` 数组：
```tsx
<Select
  options={[
    { label: '自定义接口', value: 'customApi' },
    { label: '静态数据', value: 'static' },
    { label: '数据源', value: 'dataSource' },
  ]}
>
```

- [ ] **Step 3: 在 `customApi` 分支中添加 DataSourceSelect（当选择数据源时）**

找到第 2867 行附近的分支（`genericDataSourceValue === 'static'` 的 else 分支），修改为：

```tsx
) : genericDataSourceValue === 'dataSource' ? (
  <>
    <Form.Item
      name="dataSourceId"
      label="选择数据源"
      rules={[{ required: true, message: '请选择数据源' }]}
    >
      <DataSourceSelect
        placeholder="搜索并选择数据源..."
        onChange={(id, dataSource) => {
          // 选择数据源后，自动填充接口配置
          form.setFieldsValue({
            apiEndpoint: dataSource.url,
            apiMethod: dataSource.method,
            apiListField: dataSource.listField || '',
            // requestConfig 的填充在保存时处理
          });
        }}
      />
    </Form.Item>
    <Form.Item
      name="apiListField"
      label="列表字段路径"
      extra="可覆盖数据源中的列表字段配置"
    >
      <Input placeholder="如: data.list" />
    </Form.Item>
  </>
) : (
  // original customApi fields
```

- [ ] **Step 4: 监听 dataSource 切换，清空配置**

在 `genericDataSourceValue` 的 `useEffect` 或通过 `shouldUpdate` 处理清空逻辑。找到约第 355 行附近已有 `genericDataSourceValue` 定义，确保切换时清空：

```tsx
// 在 Form.Item 中添加 shouldUpdate
<Form.Item noStyle shouldUpdate={(prev, cur) => prev.dataSource !== cur.dataSource}>
  {({ getFieldValue }) => {
    const currentDataSource = getFieldValue('dataSource');
    if (currentDataSource === 'dataSource') {
      // 渲染数据源选择 UI
    } else if (currentDataSource === 'static') {
      // 渲染静态数据 UI
    } else {
      // 渲染自定义接口 UI
    }
  }}
</Form.Item>
```

**注意**：完整实现需要将整个数据来源分支包裹在 `shouldUpdate` 中，确保切换时正确渲染对应 UI。

---

## Task 3: 数据保存逻辑适配

**Files:**
- Modify: `src/components/ConfigDialog/index.tsx` (约行 1560-1570)

- [ ] **Step 1: 在保存逻辑中添加 dataSourceId 处理**

找到 `if (dataSource === 'static')` 的处理逻辑附近，添加 `dataSource` 分支处理：

```tsx
if (dataSource === 'dataSource') {
  // 数据源模式：保留 dataSourceId，清除其他接口配置（除非有覆盖）
  normalizedRestConfig.dataSource = 'dataSource';
  normalizedRestConfig.dataSourceId = normalizedRestConfig.dataSourceId;
  // 如果用户没有手动填写，则清除接口字段
  if (!normalizedRestConfig._apiEndpointModified) {
    normalizedRestConfig.apiEndpoint = undefined;
    normalizedRestConfig.apiMethod = undefined;
  }
} else if (dataSource === 'static') {
  normalizedRestConfig.staticData = staticDataText ? JSON.parse(staticDataText) : undefined;
  normalizedRestConfig.apiEndpoint = undefined;
  normalizedRestConfig.apiMethod = undefined;
  normalizedRestConfig.dataSourceId = undefined;
} else {
  // customApi 模式
  normalizedRestConfig.dataSourceId = undefined;
}
```

**注意**：`normalizedRestConfig` 是从表单值拷贝的对象，需要确认实际字段名。

---

## Task 4: 数据源不存在时的降级处理

**Files:**
- Modify: `src/components/ConfigDialog/index.tsx`

- [ ] **Step 1: 在组件挂载时检查 dataSourceId 是否有效**

在 `useEffect` 中添加（约在 `useEffect` 列表末尾）：

```tsx
React.useEffect(() => {
  if (widget.config.dataSource === 'dataSource' && widget.config.dataSourceId) {
    getDataSourceDetail({ id: widget.config.dataSourceId })
      .then(res => {
        if (!res.data) {
          message.warning({
            content: '所选数据源已不存在，已自动切换为静态数据模式',
            duration: 3,
          });
          form.setFieldsValue({ dataSource: 'static' });
          updateWidget(widget.id, {
            config: {
              ...widget.config,
              dataSource: 'static',
              dataSourceId: undefined,
            }
          });
        }
      })
      .catch(() => {
        message.warning({
          content: '数据源加载失败，已自动切换为静态数据模式',
          duration: 3,
        });
        form.setFieldsValue({ dataSource: 'static' });
      });
  }
}, [widget.config.dataSourceId]);
```

**注意**：需要导入 `getDataSourceDetail` 和 `message`。

---

## Task 5: 类型定义更新

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 在 WidgetConfig 中新增 dataSourceId 字段**

找到 `WidgetConfig` 接口（约行 52-93），在合适位置添加：

```tsx
export interface WidgetConfig {
  // ... existing fields ...
  apiListField?: string;
  dataSourceId?: string;    // 新增：选中的数据源 ID
  dataSource?: string;      // 新增/更新：数据来源类型 (static | customApi | dataSource)
  // ...
}
```

**注意**：某些 widget 类型已使用 `dataSource` 字段（如 `indicatorCard`、`navGroup`），需确保类型兼容性。

---

## Task 6: Mock 接口支持全量返回

**Files:**
- Modify: `mock/routes/data-source.js`

- [ ] **Step 1: 检查并确认 getDataSourceList 支持 page_size=999 全量返回**

查看 mock 实现，确认分页逻辑。当前 mock 通常支持 `page_size` 参数，如果不支持则修改：

```javascript
router.get('/v1/data-sources/list', async (req, res) => {
  await req.sleep(0.1);
  const { page = 1, page_size = 10, keyword } = req.query;

  let list = [...DATA_SOURCES];

  // 关键字过滤
  if (keyword) {
    list = list.filter(item =>
      item.name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // 全量返回支持
  const total = list.length;
  const actualSize = parseInt(page_size) === 999 ? total : parseInt(page_size);
  const start = (parseInt(page) - 1) * actualSize;
  const paginatedList = list.slice(start, start + actualSize);

  res.json({
    code: 0,
    message: 'success',
    data: {
      list: paginatedList,
      total,
      page: parseInt(page),
      page_size: actualSize,
    }
  });
});
```

---

## 验证清单

- [ ] DataSourceSelect 组件可正常渲染
- [ ] 下拉框支持按名称模糊检索
- [ ] 选择数据源后自动填充接口地址和方法
- [ ] 切换数据源类型时 UI 正确切换
- [ ] 保存后 widget.config 包含正确的 dataSourceId
- [ ] 数据源被删除后降级为静态模式并提示
- [ ] TypeScript 编译无错误
