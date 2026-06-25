# 前端组件事件联动规划

## 目标

为工作台画布中的系统组件、图表组件、悬浮模块本地组件建立统一的事件处理与传递机制，使组件可以通过配置完成联动，例如搜索组件提交关键词后驱动数据表格、图表、指标卡等组件刷新数据。

本规划不包含微应用嵌入组件的内部能力设计。微应用通信继续使用现有 Wujie 通信机制，画布内部前端组件联动使用项目内部事件系统。

## 设计原则

- 联动目标只能选择当前工作台画布上已经存在的组件，未添加到画布的组件不作为发送方或接收方。
- 内部组件联动使用 `src/utils/eventBus.ts`，不要直接复用 Wujie `bus.$emit`，避免微应用通信和看板组件联动耦合。
- 所有组件复用统一配置字段，不为每个组件新增私有事件配置字段。
- 组件只声明可发送事件、可响应动作和可注入变量，由配置面板负责路由和参数映射。
- 请求类组件统一支持运行时参数注入，避免搜索、表格、图表分别实现不同的参数合并逻辑。
- 输入变化类事件默认不实时触发联动，实时联动需要显式配置防抖时间。
- 参数映射优先支持路径表达式，例如 `payload.keyword`、`payload.filters.status`，不在第一阶段支持任意 JS 表达式。

## 范围

### 包含

- 系统组件：搜索、查询筛选、表格、指标卡、导航、新闻、排行、表单等。
- 图表组件：所有图表预设共用同一套 `chart` 事件能力。
- 悬浮模块：仅包含本地悬浮组件和悬浮容器行为。
- 本地组件模板：模板实例添加到画布后，按其实际 widget 类型参与联动。

### 不包含

- 未添加到当前画布的组件。
- 微应用内部事件能力。
- 微应用嵌入组件内部自定义事件清单。
- 任意脚本表达式执行能力。

## 画布组件过滤规则

联动配置面板中的发送方和接收方必须从当前画布状态读取。

### 组件来源

- 普通 widget：来自 `useStore().widgets`。
- 分组内 widget：仍来自 `useStore().widgets`，通过 `groupId` 标识归属。
- 悬浮模块：来自 `useStore().floatingModules`，仅纳入 `contentType === 'localComponent'` 的模块。
- 分组容器：来自 `useStore().groups`，只支持容器级事件和动作。

### 目标过滤

- 当前正在配置的组件不能默认选择自身作为接收方，除非动作明确支持自触发，例如 `setValue`、`reload`。
- 接收方列表只展示已存在且具备对应响应能力的组件。
- 发送事件选择后，目标组件列表应按能力过滤，例如 `search.submit` 默认只展示支持 `setParamsAndReload` 或 `setValue` 的组件。
- 已删除组件对应的事件路由应在加载配置时标记失效，不自动静默删除，方便用户确认。
- 画布中组件标题重复时，选择器展示 `标题 + 类型 + 短 ID`，避免误选。

## 核心事件协议

```ts
interface WidgetEventMessage<TPayload = Record<string, any>> {
  id: string;
  name: string;
  sourceWidgetId: string;
  sourceWidgetType: WidgetType | 'widgetGroup' | 'floatingModule';
  targetWidgetId?: string | string[];
  payload: TPayload;
  meta?: {
    trigger?: 'click' | 'change' | 'submit' | 'reset' | 'system';
    sourceTitle?: string;
    targetTitle?: string;
    version?: 1;
    [key: string]: any;
  };
  timestamp: number;
}
```

## 事件命名规范

事件名采用 `领域.动作` 格式。

| 领域 | 示例 |
| --- | --- |
| 表单/查询 | `form.change`、`form.submit`、`form.reset` |
| 搜索 | `search.change`、`search.submit` |
| 数据 | `data.loaded`、`data.error`、`data.select` |
| 表格 | `table.rowClick`、`table.selectionChange`、`table.pageChange` |
| 图表 | `chart.click`、`chart.legendChange`、`chart.dataZoom` |
| 导航 | `nav.click`、`page.change` |
| 轮播 | `carousel.change`、`carousel.click` |
| 悬浮模块 | `floating.open`、`floating.close`、`floating.expand` |
| 状态 | `widget.refresh`、`widget.show`、`widget.hide` |

## 统一配置模型

建议扩展 `WidgetConfig`，使用统一事件字段。

```ts
interface WidgetEventOutputConfig {
  id: string;
  enabled: boolean;
  eventName: string;
  targetWidgetIds: string[];
  payloadMapping?: Record<string, string>;
  condition?: WidgetEventCondition;
  debounce?: number;
  description?: string;
}

interface WidgetEventInputConfig {
  id: string;
  enabled: boolean;
  listenWidgetId: string;
  listenEventName: string;
  action: WidgetEventAction;
  paramMapping?: Record<string, string>;
  mergeMode?: 'merge' | 'replace' | 'clearThenMerge';
  autoRun?: boolean;
  debounce?: number;
  condition?: WidgetEventCondition;
}

interface WidgetVariableBindingConfig {
  id: string;
  target: 'query' | 'body' | 'headers' | 'localState';
  key: string;
  source: string;
  defaultValue?: any;
  transform?: 'string' | 'number' | 'boolean' | 'array' | 'dateRange';
}
```

字段挂载建议：

```ts
interface WidgetConfig {
  eventOutputs?: WidgetEventOutputConfig[];
  eventInputs?: WidgetEventInputConfig[];
  variableBindings?: WidgetVariableBindingConfig[];
}
```

## 通用响应动作

| action | 适用组件 | 说明 |
| --- | --- | --- |
| `reload` | 请求类组件 | 使用当前参数重新请求 |
| `setParams` | 请求类组件 | 设置运行时参数，不立即请求 |
| `setParamsAndReload` | 请求类组件 | 设置运行时参数并立即请求 |
| `clearParams` | 请求类组件 | 清空运行时参数 |
| `setValue` | 表单/查询/输入类 | 设置字段值 |
| `clearValue` | 表单/查询/输入类 | 清空字段值 |
| `reset` | 表单/查询类 | 重置组件内部状态 |
| `select` | 表格/图表/导航/列表类 | 设置选中项 |
| `clearSelection` | 表格/图表/列表类 | 清空选中项 |
| `show` | 可视组件 | 显示组件 |
| `hide` | 可视组件 | 隐藏组件 |
| `open` | 悬浮模块/弹窗类 | 打开 |
| `close` | 悬浮模块/弹窗类 | 关闭 |
| `expand` | 悬浮模块/分组类 | 展开 |
| `collapse` | 悬浮模块/分组类 | 折叠 |
| `setTitle` | 通用组件 | 修改运行时标题，不直接持久化 |
| `setTheme` | 图表/卡片/悬浮模块 | 切换运行时主题或样式 |

## 请求变量注入

请求类组件统一维护运行时参数 `runtimeParams`。事件触发后，接收组件根据 `paramMapping` 写入 `runtimeParams`，再由请求工具合并到实际请求。

### 支持位置

| 配置位置 | 示例 | 说明 |
| --- | --- | --- |
| `apiQuery` | `{ "keyword": "${runtime.keyword}" }` | GET 参数 |
| `apiBody` | `{ "filters": "${runtime.filters}" }` | POST/PUT/PATCH 请求体 |
| `apiHeaders` | `{ "X-Tenant": "${runtime.tenantId}" }` | 请求头 |
| `apiEndpoint` | `/api/users/${runtime.orgId}` | 动态路径，需谨慎校验 |
| `pagination` | `{ "page": "${runtime.page}" }` | 分页参数 |

### 合并优先级

| 优先级 | 来源 |
| --- | --- |
| 1 | 事件写入的 `runtimeParams` |
| 2 | 组件静态配置 `apiQuery`、`apiBody`、`apiHeaders` |
| 3 | 分页参数 |
| 4 | 组件默认值 |

## 组件能力分层

| 能力 | 组件 |
| --- | --- |
| `emitsChange` | `search`、`queryFilter`、`customForm`、`nativeForm`、`nativeFormField` |
| `emitsSubmit` | `search`、`queryFilter`、`customForm`、`nativeForm` |
| `emitsSelect` | `dataTable`、`chart`、`navGroup`、`iconNav`、`carousel`、`topList` |
| `requestable` | `dataTable`、`chart`、`indicatorCard`、`indicatorCardList`、`news`、`topList`、`navGroup`、`recognitionCard` |
| `controllable` | 大部分可视组件 |
| `floatingControllable` | 本地悬浮模块 |
| `formControllable` | 搜索、查询筛选、表单、字段 |

## 系统组件事件清单

| 组件 | 可发送事件 | payload | 可响应动作 |
| --- | --- | --- | --- |
| 查询筛选 `queryFilter` | `form.change` | `{ values, changedField, changedValue }` | `setValue`、`clearValue`、`reset` |
| 查询筛选 `queryFilter` | `form.submit` | `{ values, filters }` | `setValue`、`clearValue`、`reset` |
| 查询筛选 `queryFilter` | `form.reset` | `{}` | `setValue`、`clearValue`、`reset` |
| 搜索 `search` | `search.change` | `{ keyword }` | `setValue`、`clearValue`、`focus` |
| 搜索 `search` | `search.submit` | `{ keyword }` | `setValue`、`clearValue`、`focus` |
| 数据表格 `dataTable` | `data.loaded` | `{ rows, total, page, pageSize }` | `reload`、`setParams`、`setParamsAndReload`、`clearParams` |
| 数据表格 `dataTable` | `data.error` | `{ message, error }` | `reload` |
| 数据表格 `dataTable` | `table.rowClick` | `{ row, rowKey, index }` | `select`、`clearSelection` |
| 数据表格 `dataTable` | `table.selectionChange` | `{ selectedRowKeys, selectedRows }` | `select`、`clearSelection` |
| 数据表格 `dataTable` | `table.pageChange` | `{ page, pageSize }` | `setParamsAndReload` |
| 指标卡片 `indicatorCard` | `card.click` | `{ value, description, data }` | `reload`、`setParamsAndReload`、`setValue` |
| 指标列表卡片 `indicatorCardList` | `card.itemClick` | `{ item, index, value, description }` | `reload`、`setParamsAndReload` |
| 统计卡片 `stats` | `stats.itemClick` | `{ item, index, value, label }` | `reload`、`setParamsAndReload` |
| 识别卡片 `recognitionCard` | `recognition.click` | `{ data }` | `reload`、`setParamsAndReload` |
| 识别卡片 `recognitionCard` | `recognition.quickLinkClick` | `{ link, data }` | `reload`、`setParamsAndReload` |
| 新闻动态 `news` | `news.itemClick` | `{ item, index }` | `reload`、`setParamsAndReload` |
| 排行榜 `topList` | `ranking.itemClick` | `{ item, rank, index }` | `reload`、`setParamsAndReload` |
| 快捷链接 `link` | `link.click` | `{ item, url, index }` | `reload`、`setParamsAndReload` |
| 图标导航 `iconNav` | `nav.click` | `{ url, icon, title }` | `setParamsAndReload`、`select` |
| 导航组 `navGroup` | `nav.itemClick` | `{ item, index, systemId, url }` | `reload`、`setParamsAndReload`、`select` |
| 页面切换器 `pageNavigator` | `page.change` | `{ item, path, index }` | `select` |
| 导航栏 `headerBar` | `nav.click` | `{ item, index, url }` | `setParamsAndReload`、`select` |
| 轮播图 `carousel` | `carousel.change` | `{ slide, index }` | `select`、`next`、`prev`、`goTo` |
| 轮播图 `carousel` | `carousel.click` | `{ slide, index }` | `select`、`goTo` |
| 文本 `typography` | `text.click` | `{ content }` | `setValue`、`setText`、`show`、`hide` |
| 富文本 `richText` | `richText.click` | `{ html }` | `setValue`、`setHtml`、`show`、`hide` |
| 我的文档 `myDocuments` | `document.open` | `{ file }` | `reload`、`setParamsAndReload` |
| 我的文档 `myDocuments` | `document.select` | `{ file }` | `reload`、`setParamsAndReload` |
| 自定义表单 `customForm` | `form.change` | `{ values, changedField, changedValue }` | `setValue`、`clearValue`、`reset` |
| 自定义表单 `customForm` | `form.submit` | `{ values }` | `setValue`、`clearValue`、`reset` |
| 原生表单 `nativeForm` | `form.change` | `{ values, changedField, changedValue }` | `setValue`、`clearValue`、`reset` |
| 原生表单 `nativeForm` | `form.submit` | `{ values, response }` | `setValue`、`clearValue`、`reset` |
| 原生字段 `nativeFormField` | `field.change` | `{ field, value }` | `setValue`、`clearValue`、`setDisabled` |
| 原生字段 `nativeFormField` | `field.click` | `{ field, value }` | `setValue`、`clearValue`、`setDisabled` |

## 图表组件事件清单

所有图表预设共用同一套 `chart` 事件。不同图表只在 payload 中携带不同数据字段，不为每个预设重复实现事件系统。

| 图表类型 | 可发送事件 | payload | 可响应动作 |
| --- | --- | --- | --- |
| 全部图表 | `chart.click` | `{ name, value, seriesName, data, dataIndex }` | `reload`、`setParamsAndReload`、`highlight`、`clearHighlight` |
| 全部图表 | `chart.dataLoaded` | `{ data, raw, total? }` | `reload`、`setParamsAndReload` |
| 全部图表 | `chart.dataError` | `{ message, error }` | `reload` |
| 折线/柱状/条形/双轴 | `chart.axisClick` | `{ axisValue, seriesName, data }` | `setParamsAndReload`、`highlight` |
| 饼图/环形图 | `chart.sliceClick` | `{ name, value, percent, data }` | `setParamsAndReload`、`highlight` |
| 雷达图 | `chart.indicatorClick` | `{ indicator, value, seriesName }` | `setParamsAndReload`、`highlight` |
| 地图 | `chart.regionClick` | `{ name, value, region, data }` | `setParamsAndReload`、`highlight` |
| 流向地图 | `chart.flowClick` | `{ source, target, value, data }` | `setParamsAndReload`、`highlight` |
| 漏斗图 | `chart.stageClick` | `{ name, value, dataIndex }` | `setParamsAndReload`、`highlight` |
| 散点图 | `chart.pointClick` | `{ x, y, size, name, data }` | `setParamsAndReload`、`highlight` |
| 支持 legend 的图表 | `chart.legendChange` | `{ selected, name }` | `setParamsAndReload` |
| 支持缩放的图表 | `chart.dataZoom` | `{ start, end, startValue, endValue }` | `setParamsAndReload` |

### ECharts 事件桥接

| ECharts 事件 | 内部事件 |
| --- | --- |
| `click` | `chart.click`，再根据 preset 派生语义事件 |
| `legendselectchanged` | `chart.legendChange` |
| `datazoom` | `chart.dataZoom` |
| 请求成功 | `chart.dataLoaded` |
| 请求失败 | `chart.dataError` |

## 悬浮模块事件清单

仅包含本地悬浮组件和悬浮容器行为，不包含微应用嵌入组件。

| 对象 | 可发送事件 | payload | 可响应动作 |
| --- | --- | --- | --- |
| 悬浮模块容器 | `floating.open` | `{ moduleId }` | `open` |
| 悬浮模块容器 | `floating.close` | `{ moduleId }` | `close` |
| 悬浮模块容器 | `floating.expand` | `{ moduleId, position, size }` | `expand` |
| 悬浮模块容器 | `floating.collapse` | `{ moduleId, position }` | `collapse` |
| 悬浮模块容器 | `floating.moveEnd` | `{ moduleId, position }` | `setPosition` |
| 悬浮模块容器 | `floating.resizeEnd` | `{ moduleId, size }` | `setSize` |
| 聊天组件 `chat` | `chat.send` | `{ message, conversationId }` | `setParams`、`open`、`close` |
| 聊天组件 `chat` | `chat.receive` | `{ message, conversationId }` | `open`、`setParams` |
| 通知组件 `notification` | `notification.click` | `{ notification }` | `open`、`setParams` |
| 通知组件 `notification` | `notification.read` | `{ id, notification }` | `setParams` |
| 助手中心 `assistantHub` | `assistant.openEntry` | `{ entry }` | `open`、`setParams` |
| 助手中心 `assistantHub` | `assistant.select` | `{ item }` | `open`、`setParams` |
| 帮助/日历/笔记/自定义 | `local.action` | `{ action, data }` | `open`、`close`、`setParams` |

## 联动配置示例

### 搜索框联动表格

| 配置项 | 值 |
| --- | --- |
| 发送组件 | 当前画布中的搜索组件 `search` |
| 发送事件 | `search.submit` |
| payload | `{ "keyword": "${state.keyword}" }` |
| 接收组件 | 当前画布中的数据表格 `dataTable` |
| 接收动作 | `setParamsAndReload` |
| 参数映射 | `{ "keyword": "payload.keyword", "page": 1 }` |
| 表格请求 query | `{ "keyword": "${runtime.keyword}", "page": "${runtime.page}" }` |

### 查询筛选联动图表和表格

| 配置项 | 值 |
| --- | --- |
| 发送组件 | 当前画布中的查询筛选组件 `queryFilter` |
| 发送事件 | `form.submit` |
| payload | `{ "filters": "${values}" }` |
| 接收组件 | 当前画布中的表格、图表 |
| 接收动作 | `setParamsAndReload` |
| 参数映射 | `{ "filters": "payload.filters" }` |

### 图表点击联动表格

| 配置项 | 值 |
| --- | --- |
| 发送组件 | 当前画布中的图表组件 `chart` |
| 发送事件 | `chart.click` |
| payload | `{ "category": "${data.name}", "series": "${seriesName}" }` |
| 接收组件 | 当前画布中的数据表格 |
| 接收动作 | `setParamsAndReload` |
| 参数映射 | `{ "category": "payload.category", "series": "payload.series", "page": 1 }` |

### 表格行点击联动详情组件

| 配置项 | 值 |
| --- | --- |
| 发送组件 | 当前画布中的数据表格 |
| 发送事件 | `table.rowClick` |
| payload | `{ "row": "${row}", "id": "${row.id}" }` |
| 接收组件 | 当前画布中的指标卡片、识别卡片、图表 |
| 接收动作 | `setParamsAndReload` |
| 参数映射 | `{ "id": "payload.id" }` |

### 导航组点击联动多个组件

| 配置项 | 值 |
| --- | --- |
| 发送组件 | 当前画布中的导航组 `navGroup` |
| 发送事件 | `nav.itemClick` |
| payload | `{ "systemId": "${item.systemId}", "name": "${item.name}" }` |
| 接收组件 | 当前画布中的图表、表格、指标卡 |
| 接收动作 | `setParamsAndReload` |
| 参数映射 | `{ "systemId": "payload.systemId" }` |

## 配置面板规划

建议在 `ConfigDialog` 中新增统一的“联动”Tab。

| 区块 | 功能 |
| --- | --- |
| 可发送事件 | 展示当前组件支持的事件，勾选启用 |
| 事件路由 | 选择当前画布中已存在的目标组件和目标动作 |
| 参数映射 | 配置 payload 到目标参数的映射 |
| 可监听事件 | 配置监听当前画布中已存在的来源组件、事件和动作 |
| 请求变量 | 配置 runtime 参数如何注入 API query/body/header |
| 调试 | 展示最近事件、payload 预览和目标组件执行结果 |

### 组件选择器展示规则

| 展示字段 | 说明 |
| --- | --- |
| 组件标题 | 优先展示 `config.title` 或 `widget.title` |
| 组件类型 | 展示 `WidgetType` 中文名 |
| 组件位置 | 可选展示分组名称或悬浮模块标识 |
| 短 ID | 展示 ID 后 6 位，避免同名组件误选 |
| 能力标签 | 展示 `可请求`、`可选择`、`可控制` 等能力 |

## 最小实现路径

1. 定义统一类型：`WidgetEventMessage`、`WidgetEventOutputConfig`、`WidgetEventInputConfig`、`WidgetVariableBindingConfig`、`WidgetEventAction`。
2. 封装内部事件工具：`emitWidgetEvent()`、`useWidgetEvent()`、`useWidgetRuntimeParams()`。
3. 实现画布组件能力注册表，根据当前 `widgets`、`groups`、`floatingModules` 动态生成可选联动目标。
4. 改造请求工具，让 `DataTableWidget` 和 `ChartWidget` 先支持 `runtimeParams` 注入。
5. 给 `search`、`queryFilter` 增加标准事件发送：`search.submit`、`form.submit`、`form.change`。
6. 给 `dataTable` 增加监听动作：`setParamsAndReload`，并发送 `table.rowClick`、`table.selectionChange`、`table.pageChange`。
7. 给 `ChartWidget` 增加 ECharts 事件桥接，并支持监听参数刷新。
8. 扩展 `ConfigDialog` 的统一“联动”Tab，首批只支持搜索/查询筛选联动表格和图表。
9. 再逐步覆盖指标卡、导航、排行、新闻、表单、悬浮模块本地组件。

## 不建议实现

- 不为每个组件新增私有事件字段，例如 `tableEventRoutes`、`chartEventRoutes`、`searchEventRoutes`。
- 不让组件之间直接互相 import 或直接调用对方 store 方法。
- 不把 Wujie 微应用事件和内部 widget 事件混用。
- 不默认开启输入实时联动，避免高频请求。
- 不在第一阶段支持任意 JS 表达式，避免安全和调试成本失控。
- 不把未添加到画布的组件展示为可选接收方。

## 开发计划

### 阶段 0：现状对齐与约束确认

目标：明确事件联动只服务当前工作台画布中的已存在组件，并确认不影响现有微应用通信、组件配置和数据请求逻辑。

改动范围：

- 梳理现有 `WidgetConfig`、`WidgetType`、`FloatingModuleConfig`、`QueryFilterWidgetConfig`、`NativeFormFieldEventConfig` 中已有事件字段。
- 确认 `queryFilter` 当前基于 Wujie bus 的 `eventRoutes` 仅作为兼容逻辑保留，不作为内部组件联动的新实现基础。
- 确认首批联动场景：搜索/查询筛选 -> 表格、查询筛选 -> 图表、图表点击 -> 表格、表格行点击 -> 指标卡。

验收标准：

- 明确首批支持组件和不支持组件。
- 明确不破坏现有 `eventRoutes` 配置和微应用通信。
- 明确联动配置目标只能来自当前画布实例。

### 阶段 1：类型与能力注册表

目标：建立统一事件类型、动作类型、能力声明和当前画布可联动组件列表。

建议新增/调整文件：

- `src/types/widget-event.ts`：定义事件协议、输入配置、输出配置、变量绑定、动作枚举。
- `src/utils/widgetEventCapabilities.ts`：声明每类组件的可发送事件、可响应动作、能力标签。
- `src/utils/widgetEventCanvas.ts`：根据当前 `widgets`、`groups`、`floatingModules` 生成可选联动组件列表。
- `src/types/index.ts`：导出事件相关类型，扩展 `WidgetConfig` 的统一字段。

关键任务：

- 定义 `WidgetEventMessage`、`WidgetEventOutputConfig`、`WidgetEventInputConfig`、`WidgetVariableBindingConfig`。
- 定义 `WidgetEventAction`，覆盖 `reload`、`setParams`、`setParamsAndReload`、`clearParams`、`setValue`、`clearValue`、`reset`、`select` 等。
- 建立 `WIDGET_EVENT_CAPABILITIES`，避免在配置面板和组件运行时散落 `if widget.type === 'xxx'`。
- 实现画布组件过滤，排除未添加组件和微应用嵌入组件，悬浮模块仅纳入 `localComponent`。

验收标准：

- 类型检查通过。
- 能根据当前画布数据返回可发送/可接收组件列表。
- 删除或不存在的组件路由可以被识别为失效。

### 阶段 2：事件运行时基础设施

目标：封装内部事件发送、监听、运行时参数管理和路径映射能力。

建议新增/调整文件：

- `src/utils/widgetEventBus.ts`：基于现有 `eventBus` 封装 widget 事件协议。
- `src/hooks/useWidgetEventEmitter.ts`：组件发送事件 Hook。
- `src/hooks/useWidgetEventInputs.ts`：组件监听事件并执行动作 Hook。
- `src/hooks/useWidgetRuntimeParams.ts`：维护组件运行时参数。
- `src/utils/widgetEventMapping.ts`：路径取值、参数映射、默认值和简单类型转换。

关键任务：

- 实现 `emitWidgetEvent(message)`，统一补齐 `id`、`timestamp`、`sourceWidgetId`。
- 实现 `useWidgetEventInputs(widget, handlers)`，按当前组件配置订阅来源事件。
- 实现 `applyParamMapping(payload, mapping)`，支持 `payload.xxx`、`meta.xxx`、常量值。
- 实现 debounce 处理，防止输入变化类事件高频触发。
- 实现运行时参数 merge 策略：`merge`、`replace`、`clearThenMerge`。

验收标准：

- 组件可以通过统一 API 发送和接收内部事件。
- 监听来源、事件名、目标组件 ID 均可正确过滤。
- 高频事件支持配置防抖。
- 路径映射错误不会导致组件崩溃。

### 阶段 3：请求变量注入

目标：请求类组件统一支持事件参数注入，先接入表格和图表。

建议调整文件：

- `src/utils/widgetApi.ts`
- `src/components/widgets/DataTableWidget.tsx`
- `src/components/widgets/ChartWidget/index..tsx`
- `src/utils/widgetApiDefaults.ts`

关键任务：

- 扩展请求构建能力，支持把 `runtimeParams` 合并进 `query`、`body`、`headers`。
- 支持 `${runtime.xxx}` 变量解析。
- 表格接入 `setParams`、`setParamsAndReload`、`clearParams`、`reload`。
- 图表接入 `setParams`、`setParamsAndReload`、`clearParams`、`reload`。
- 请求成功后发送 `data.loaded` 或 `chart.dataLoaded`。
- 请求失败后发送 `data.error` 或 `chart.dataError`。

验收标准：

- 搜索或查询事件可以驱动表格带参数重新请求。
- 查询事件可以驱动图表带参数重新请求。
- 分页参数和事件参数合并后请求结构符合预期。
- 静态数据模式不因事件参数注入报错。

### 阶段 4：首批发送组件接入

目标：让搜索、查询筛选具备标准内部事件发送能力。

建议调整文件：

- `src/components/widgets/SearchWidget.tsx`
- `src/components/widgets/QueryFilterWidget/index.tsx`
- `src/components/widgets/CustomFormWidget.tsx`，可放入后续小步接入。

关键任务：

- `search` 发送 `search.submit`。
- `search` 可选发送 `search.change`，默认不启用实时联动，启用时必须使用 debounce。
- `queryFilter` 发送 `form.submit`。
- `queryFilter` 可选发送 `form.change` 和 `form.reset`。
- 保留现有 `submitMethod === 'api'` 和 Wujie `eventRoute` 行为，新增内部事件不破坏旧逻辑。

验收标准：

- 搜索提交能触发配置的目标组件动作。
- 查询筛选提交能触发表格/图表刷新。
- 未配置联动时，组件现有行为不变。
- 旧的微应用事件路由仍可工作。

### 阶段 5：首批接收与反馈组件接入

目标：让数据表格、图表、指标卡完成基础联动闭环。

建议调整文件：

- `src/components/widgets/DataTableWidget.tsx`
- `src/components/widgets/ChartWidget/index..tsx`
- `src/components/widgets/IndicatorCardWidget/index.tsx`
- `src/components/widgets/IndicatorCardListWidget/index.tsx`

关键任务：

- 表格发送 `table.rowClick`、`table.selectionChange`、`table.pageChange`。
- 图表桥接 ECharts `click` -> `chart.click`。
- 根据图表预设派生 `chart.sliceClick`、`chart.regionClick`、`chart.axisClick` 等语义事件。
- 指标卡支持 `setParamsAndReload`，并发送 `card.click`。
- 指标列表卡支持 `setParamsAndReload`，并发送 `card.itemClick`。

验收标准：

- 图表点击能联动表格刷新。
- 表格行点击能联动指标卡刷新。
- 表格分页变化能作为事件输出。
- 图表请求成功/失败事件可用于调试观察。

### 阶段 6：配置面板联动 Tab

目标：让用户可以通过 UI 配置组件联动，不需要手写 JSON。

建议新增/调整文件：

- `src/components/ConfigDialog/index.tsx`
- `src/components/ConfigDialog/configs/EventLinkageConfig.tsx`
- `src/components/ConfigDialog/configs/EventPayloadMappingEditor.tsx`
- `src/components/ConfigDialog/configs/WidgetEventTargetSelect.tsx`

关键任务：

- 新增“联动”Tab。
- 展示当前组件可发送事件。
- 目标组件选择器只展示当前画布中已存在且能力匹配的组件。
- 支持选择目标动作。
- 支持配置参数映射。
- 支持启用/禁用、debounce、mergeMode、autoRun。
- 对已删除目标组件显示失效提示。

验收标准：

- 用户可以完成“搜索 -> 表格”的配置闭环。
- 用户可以完成“查询筛选 -> 图表 + 表格”的配置闭环。
- 组件删除后，再打开配置面板能看到失效路由提示。
- 配置保存后刷新页面仍能恢复联动配置。

### 阶段 7：扩展系统组件覆盖

目标：逐步覆盖更多系统组件，避免一次性大改造成风险。

建议接入顺序：

1. `topList`、`news`、`link`：点击类事件简单，收益高。
2. `navGroup`、`iconNav`、`headerBar`、`pageNavigator`：导航类组件统一输出 `nav.click` 或 `page.change`。
3. `carousel`：输出 `carousel.change`、`carousel.click`。
4. `recognitionCard`、`stats`：输出详情点击事件并支持参数刷新。
5. `customForm`、`nativeForm`、`nativeFormField`：统一表单事件，兼容现有字段级事件配置。
6. `typography`、`richText`、`myDocuments`：按需补充轻量事件。

验收标准：

- 每次只接入一组组件，保证已有联动场景不回归。
- 所有新增事件都能在联动 Tab 中被发现和配置。
- 未配置事件的组件行为与当前版本一致。

### 阶段 8：悬浮模块本地组件接入

目标：让本地悬浮模块支持打开、关闭、展开、折叠和局部业务事件。

建议调整文件：

- `src/components/FloatingModule/index.tsx`
- `src/components/FloatingModule/components/ChatComponent/index.tsx`
- `src/components/FloatingModule/components/NotificationComponent/index.tsx`
- `src/components/FloatingModule/components/AssistantHubComponent/index.tsx`

关键任务：

- 悬浮模块容器发送 `floating.open`、`floating.close`、`floating.expand`、`floating.collapse`。
- 悬浮模块容器响应 `open`、`close`、`expand`、`collapse`、`setPosition`、`setSize`。
- 聊天组件发送 `chat.send`、`chat.receive`。
- 通知组件发送 `notification.click`、`notification.read`。
- 助手中心发送 `assistant.openEntry`、`assistant.select`。

验收标准：

- 当前画布中的系统组件可以打开/关闭本地悬浮模块。
- 本地悬浮模块事件可以联动当前画布中的请求类组件。
- 微应用悬浮模块不纳入本阶段联动配置。

### 阶段 9：调试、稳定性和体验优化

目标：降低配置和排错成本，避免事件链路失控。

建议新增/调整文件：

- `src/components/ConfigDialog/configs/EventDebugPanel.tsx`
- `src/utils/widgetEventLogger.ts`

关键任务：

- 增加最近事件日志，仅在编辑模式或调试开关开启时记录。
- 展示事件名称、来源组件、目标组件、payload、执行动作和错误信息。
- 增加循环触发保护，例如同一事件链路最大深度限制。
- 增加无目标、目标失效、映射失败、请求失败的友好提示。
- 增加导入旧数据时的配置校验和降级逻辑。

验收标准：

- 配置错误可以在 UI 中定位。
- 循环联动不会导致页面卡死。
- 事件调试关闭时不影响预览性能。

### 阶段 10：测试与验收场景

目标：用最小但覆盖关键链路的测试保障后续迭代。

建议测试范围：

- 单元测试：参数映射、变量解析、能力过滤、运行时参数合并。
- 组件测试：搜索提交、查询筛选提交、表格行点击、图表点击。
- 集成测试：搜索 -> 表格、查询筛选 -> 表格 + 图表、图表 -> 表格、表格 -> 指标卡。
- 回归测试：未配置联动时组件行为不变，微应用事件路由不受影响。

验收标准：

- `npm run build` 通过。
- `npx tsc --noEmit` 通过。
- 核心联动场景手工验证通过。
- 无新增未清理的事件监听和定时器。

## 推荐里程碑

| 里程碑 | 覆盖阶段 | 交付内容 |
| --- | --- | --- |
| M1：事件基础能力 | 阶段 1-2 | 类型、能力注册表、事件 Hook、运行时参数基础能力 |
| M2：首个闭环联动 | 阶段 3-4 | 搜索/查询筛选可以驱动表格和图表刷新 |
| M3：配置化联动 | 阶段 5-6 | 用户可通过联动 Tab 配置首批联动场景 |
| M4：系统组件扩展 | 阶段 7 | 导航、排行、新闻、指标卡等组件事件覆盖 |
| M5：悬浮模块联动 | 阶段 8 | 本地悬浮模块参与画布组件联动 |
| M6：稳定性验收 | 阶段 9-10 | 调试面板、循环保护、核心测试和构建验收 |

## 首批建议交付范围

首批不要一次性覆盖全部组件，建议只完成最常用的数据联动闭环。

必须包含：

- `search.submit` -> `dataTable.setParamsAndReload`
- `queryFilter.form.submit` -> `dataTable.setParamsAndReload`
- `queryFilter.form.submit` -> `chart.setParamsAndReload`
- `chart.click` -> `dataTable.setParamsAndReload`
- `dataTable.table.rowClick` -> `indicatorCard.setParamsAndReload`
- 联动 Tab 中只展示当前画布已存在且能力匹配的组件

暂缓包含：

- 所有悬浮模块业务事件
- 所有表单字段级事件
- 图表 brush、复杂 dataZoom 联动
- 任意 JS 表达式映射
- 微应用嵌入组件事件联动
