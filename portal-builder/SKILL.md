---
name: portal-builder
description: >
  Generate Portal Engine dashboard/page JSON from natural-language page requests. Use when the user wants to create a portal homepage, dashboard, management page, data display page, Banner/news/quick-entry page, or any Portal Engine page that should be imported into the editor as DashboardSnapshot JSON. This skill maps user intent to existing Portal Engine widgets, applies compact 36-column layout rules, and outputs import-ready JSON plus a short recognition/layout summary.
---

# Portal Builder

按下面流程生成可直接导入 Portal Engine 编辑器的 `DashboardSnapshot` JSON。

## 先读参考文件

开始前必须先读：

- `references/widget-map.md`
- `references/layout-rules.md`
- `references/json-schema.md`

这三份文件分别负责：

- 关键词到组件映射
- 生成时的布局规则
- 运行时字段和示例结构

## 输出目标

输出必须是当前项目可以导入的 `DashboardSnapshot`：

```ts
interface DashboardSnapshot {
  widgets: Widget[]
  groups: WidgetGroup[]
  floatingModules: Widget[]
  dashboardConfig?: DashboardConfig
}
```

默认输出：

- `groups: []`
- `floatingModules: []`

除非用户明确要求分组或悬浮模块，否则不要生成这两类内容。

## 工作流

### 1. 判断是否需要追问

以下情况不要直接生成 JSON，先追问：

- 用户描述过于模糊
- 只识别出单个组件
- 组件类型有明显歧义
- 页面意图明显不完整

追问时优先给 2-3 个模板方向：

- 数据看板：指标卡 + 图表 + 排名/表格
- 企业门户：首页 Banner + 快捷入口 + 新闻/公告
- 管理后台：筛选器 + 表格 + 分页

### 2. 做意图识别

先识别页面属于哪一类：

- 数据看板
- 企业门户 / 展示宣传页
- 管理后台
- 混合页面

再从用户描述中抽取：

- 页面主题
- 核心组件
- 数据来源偏好
- 颜色/主题要求
- 是否有明确位置要求

### 3. 做组件映射

按 `references/widget-map.md` 选组件。

关键映射规则：

- 多图标快捷入口、门户入口宫格、多个图标导航 -> `navGroup`
- 单个图标按钮 -> `iconNav`
- Banner / 轮播 -> `carousel`
- 筛选 / 过滤 / 查询条件 -> `queryFilter`
- 表格 / 明细列表 -> `dataTable`
- 排名 / Top N -> `topList`
- 新闻 / 动态 / 公告列表 -> `news`
- 富文本公告 / 说明 -> `richText`

### 4. 选择安全布局

生成时统一按 **compact 36 列** 输出。

硬约束：

- 所有组件必须满足 `x + w <= 36`
- 不要把 12 列示意图直接翻译成最终 JSON
- `carousel`、`queryFilter`、`pageNavigator` 默认按全宽组件处理

推荐生成尺寸：

| WidgetType | 推荐 `w` | 推荐 `h` |
|---|---:|---:|
| `headerBar` | 36 | 2 |
| `carousel` | 36 | 12 |
| `queryFilter` | 36 | 5 |
| `pageNavigator` | 36 | 3 |
| `stats` | 10 | 6 |
| `indicatorCard` | 8 | 5 |
| `chart` | 8 | 9 |
| `dataTable` | 10 | 8 |
| `topList` | 5 | 9 |
| `news` | 6 | 10 |
| `navGroup` | 10 | 10 |
| `iconNav` | 2 | 3 |
| `richText` | 8 | 6 |
| `cardGrid` | 8 | 6 |

布局算法使用 `row_max_h` 换行，避免重叠。

### 5. 写运行时字段

生成字段时必须以当前项目运行时读取逻辑为准，而不是旧示例名。

#### `carousel`

使用：

- `dataSourceType`
- `autoplay.enabled`
- `slides[].imageUrl`

不要使用：

- `autoPlay`
- `interval`
- `slides[].image`

#### `navGroup`

必须使用：

- `config.staticItems`
- `staticItems[].icon`

多图标入口不要误生成成多个 `iconNav`，也不要把门户宫格入口落成单个 `iconNav`。

#### `queryFilter`

核心字段：

- `queryFields`
- `submitMethod`
- `layoutCols`

字段级配置：

- `select` / `radioGroup` / `checkboxGroup`
  - `dataSourceType: 'manual'` + `manualOptions`
  - 或 `dataSourceType: 'request'` + `requestConfig`
- `cascader`
  - `dataMode: 'json'` + `jsonData`
  - 或 `dataMode: 'request'` + `requestConfig`

#### `dataTable`

静态数据优先写：

- `staticData`

接口模式写：

- `apiEndpoint`
- `apiMethod`
- `apiDataField`
- `apiListField`

分页写：

- `paginationMode: 'pagination'`
- `paginationConfig`

#### `headerBar`

注意：

- 标题/正文视觉文本颜色优先使用 `textColor`
- 导航项字段用 `navItems`

#### `cardGrid`

当前项目里的 `cardGrid` 更偏占位组件，不是强数据驱动组件。

规则：

- 用户明确要求“卡片网格/图文卡片”时才使用
- 不要把它当作门户页的默认主内容模块

### 6. 做主题配色

如果用户没有明确指定，按场景选主题：

- 数据看板 -> 深色科技
- 企业门户 -> 蓝色商务
- 管理后台 -> 明亮轻量

页面背景写入 `dashboardConfig`，组件内统一写基础配色。

关键规则：

- 只要写了 `backgroundColor`，就同步写 `backgroundType: 'color'`
- `richText` 正文颜色要直接写在 `html` 的内联样式里

### 7. 输出结果

输出结构：

~~~md
## 生成的仪表盘配置

**标题**: ...
**组件数量**: ...

### 识别结果
| 组件 | 类型 | 置信度 | 说明 |
|---|---|---|---|

### 布局预览
| 位置 (x,y) | 尺寸 (w×h) | 类型 | 标题 |
|---|---|---|---|

### JSON 配置
```json
{ ...完整 DashboardSnapshot... }
```
~~~

## 强规则

### 布局

- 使用 compact 36 列
- 不输出 `x + w > 36`
- 自动换行时用上一行最大高度推进 `y`

### 组件选择

- 多图标入口优先 `navGroup`
- 单图标入口才用 `iconNav`
- 门户页优先 `headerBar + carousel + navGroup + news + richText`
- 管理页优先 `queryFilter + dataTable + pageNavigator`

### 字段

- `carousel` 用 `dataSourceType` / `autoplay` / `imageUrl`
- `navGroup` 用 `staticItems`
- `queryFilter` 用 `queryFields`
- `dataTable` 静态数据用 `staticData`
- `topList` / `news` 的 `dataSource` 是字符串 `'static' | 'api'`

### 质量

- 不要生成只有一个 `typography` 的敷衍页面
- 不要输出过时字段名
- 不要把占位组件 `cardGrid` 作为默认主内容
- 不要混用互相冲突的主题配色

## 常用模板

### 销售看板

```text
indicatorCard + indicatorCard + chart + topList + dataTable
```

### 企业门户首页

```text
headerBar + carousel + navGroup + news + richText
```

### 数据管理后台

```text
queryFilter + dataTable + pageNavigator
```

## 边界情况

### 用户只说“加个折线图”

识别：

- `chart`
- `chartType: 'basic-line'`

但不要直接生成最终页面，必须追问：

- 数据来源是接口还是静态数据
- 是否需要配套指标卡/表格/排行
- 图表主题是什么

### 用户只说“做个门户页”

追问是否更接近：

- 企业官网首页
- 内部门户工作台
- 宣传展示页

### 用户要求很多不常见组件

优先使用当前项目已有组件做最近似映射，并在识别说明里标注 `[推断]`。

## 参考文件

- `references/widget-map.md`
- `references/layout-rules.md`
- `references/json-schema.md`
