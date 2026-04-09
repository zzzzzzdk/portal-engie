---
name: portal-builder
description: >
  Portal Engine 仪表盘智能生成助手 — 这是你创建页面的首选 Skill。当用户说"做一个看板"、"帮我生成页面"、
  "创建数据展示页"、"生成包含图表的仪表盘"、"生成一个管理页面"或类似任何涉及创建仪表盘、
  页面编排、自然语言生成 UI 布局的请求时，必须激活此 Skill。
  支持 KPI/指标卡、折线图/柱线图/柱状图/饼图/仪表盘等 20+ 图表类型、数据表格、排行榜、
  轮播 Banner、图标导航、筛选查询、新闻动态等全部 Portal Engine 组件。
  输出为可直接粘贴到 Portal Engine 编辑器的标准 DashboardSnapshot JSON 格式。
  触发优先级：即使用户没有提到"看板"、"组件"等词，只要暗示了想要一个数据展示/管理/宣传类页面，
  也应激活此 Skill。
---

## 工作流程（必须按顺序执行）

### 第 1 步 — 读取参考文件（必须）

在开始之前，先读取以下参考文件以确保映射和输出格式完全正确：

- `references/widget-map.md` — 完整的关键词→组件映射表（含所有图表类型和配置示例）
- `references/json-schema.md` — 完整的 TypeScript 类型定义和各组件 config 结构

**跳过此步骤将导致输出格式错误。**

### 第 2 步 — 多意图拆分与组件映射

将用户描述拆分为独立的意图片段，然后逐段映射：

```
用户描述
  ↓
拆分为意图片段（按标点/连接词分割）
  ↓
每个片段独立关键词扫描（参考 widget-map.md）
  ↓
意图聚合（检测是否涉及多个组件类别）
  ↓
生成候选组件列表（含置信度标记）
```

**置信度标记说明：**

| 标记 | 含义 | 处理方式 |
|---|---|---|
| `[精确]` | 关键词直接匹配（如"折线图"→`chart basic-line`） | 直接采用 |
| `[推断]` | 从意图推断（如"数据监控"→`stats`+`chart`+`dataTable`） | 生成后注明 |
| `[模糊]` | 无法确定（如用户只说"加个图"） | 主动追问或默认 basic-line |

### 第 3 步 — 歧义处理与追问策略

当识别到以下情况时，**必须主动追问**（不要自行猜测）：

1. **意图模糊** — 用户描述过于简单（如"做一个好看的页面"），列出 2-3 个典型模板供选择：
   > 我识别到你需要一个 **[展示型/数据型]** 页面。以下是推荐模板：
   > - 📊 **数据监控看板**：KPI + 图表 + 明细表格
   > - 🏢 **企业门户首页**：Banner + 快捷入口 + 新闻动态
   > - 📋 **数据管理后台**：筛选 + 表格 + 分页
   > 请确认或补充具体需求。

2. **组件歧义** — "图"可以指折线图/柱状图/饼图，"列表"可以指 dataTable/topList/news`，要求用户明确：
   > 我识别到你需要一个"图/列表"，请确认具体类型：
   > - 趋势数据 → 折线图 / 柱状图
   > - 占比数据 → 饼图 / 环形图
   > - 对比排名 → 条形图 / 排行榜

3. **遗漏检测** — 已识别出 1-2 个组件但明显不完整（如只提到"图表"没提到数据来源）时：
   > 你需要展示图表数据，数据来源是：
   > - ✅ 已有 API 接口（请提供接口地址）
   > - ✅ 静态示例数据（我将使用占位数据）
   > - 🔲 暂不确定，先生成模板

4. **单组件独立场景** — **只要最终只识别出 1 个 widget，就必须追问**（不要直接生成）。追问内容：
   > 我识别到你只需要一个 **「{组件名}」** 组件。为了生成更完整的页面，请确认：
   >
   > **① 数据来源是什么？**
   > - ✅ 已有 API 接口 → 请提供接口地址（可选）
   > - ✅ 静态占位数据 → 我将使用示例数据，你之后替换
   >
   > **② 还需要其他组件配合吗？**（可选）
   > - 例如：加了图表 → 是否需要 KPI 指标卡展示汇总？
   > - 例如：加了表格 → 是否需要顶部筛选条件？
   > - 例如：加了轮播 → 是否需要底部快捷入口图标导航？
   >
   > **③ 这个组件在整个页面中的角色？**
   > - 🔲 单独一页 / 全屏展示
   > - 🔲 作为某个大页面的一个模块（告诉我这个页面还包含什么）
   >
   > 如果你只需要这一个组件（不需要配套），直接回复「不需要」，我会生成完整配置。

### 第 4 步 — 布局推断与坐标计算

基于聚合后的组件列表，按照布局算法分配网格坐标。

### 第 5 步 — 生成 DashboardSnapshot JSON

构造完整的 `DashboardSnapshot` 结构，参考 `references/json-schema.md`。

### 第 6 步 — 输出结果

以规定格式输出，包含预览说明、置信度注释和可操作的使用指引。

---

## 核心概念

### DashboardSnapshot 结构

发布到应用列表页时整个对象被 `JSON.stringify` 存储：

```typescript
interface DashboardSnapshot {
  widgets: Widget[];
  groups: WidgetGroup[];
  floatingModules: FloatingModule[];
  dashboardConfig?: DashboardConfig;
}

interface Widget {
  id: string;          // UUID v4
  type: WidgetType;
  title: string;
  layout: {            // react-grid-layout 布局（compact 36 列 grid）
    x: number;         // 列起始位置 (0-35)
    y: number;         // 行起始位置 (Infinity=自动追加到底部)
    w: number;         // 宽度(列数)，满宽 = 36
    h: number;         // 高度(行数)
    minW?: number;
    minH?: number;
  };
  config: WidgetConfig;
}
```

### Grid 规格（重要）

编辑器使用 `compact` grid（`useStore.ts` 中 `gridDensity` 默认值）：

| 密度 | 列数 | cellHeight | 适用场景 |
|---|---|---|---|
| `compact`（默认） | 36 列 | 30px | **编辑器默认** |
| `standard` | 12 列 | 120px | 预览/发布 |
| `spacious` | 8 列 | 150px | 大屏展示 |

以下 Widget 默认尺寸**严格对应** `useStore.ts` 中 `WIDGET_DEFAULT_LAYOUTS` 和对应常量定义，`x + w ≤ 36`。

### Widget 默认尺寸（WIDGET_DEFAULT_LAYOUTS，对应 useStore.ts）

**来源说明**：
- 表格中列出的类型 → 取自 `WIDGET_DEFAULT_LAYOUTS`
- `headerBar`、`pageNavigator`、`iconNav`、`navGroup` → 取自 useStore 中单独定义的常量
- 未列出的类型 → 使用兜底值 `{ w: 4, h: 3, minW: 1, minH: 1 }`

| WidgetType | 默认 w | 默认 h | minW | minH | 说明 |
|---|---|---|---|---|---|
| `clock` | 4 | 6 | 2 | 3 | |
| `stats` | 10 | 6 | 4 | 3 | 多指标横排 |
| `indicatorCard` | 8 | 5 | 2 | 2 | |
| `chart` | 8 | 9 | 4 | 4 | |
| `carousel` | 36 | 12 | 4 | 3 | 全宽 Banner（满 36 列） |
| `dataTable` | 10 | 8 | 6 | 4 | |
| `topList` | 5 | 9 | 3 | 4 | |
| `news` | 6 | 10 | 4 | 4 | |
| `search` | 8 | 4 | 4 | 2 | |
| `queryFilter` | 36 | 5 | 6 | 3 | 全宽筛选器（满 36 列） |
| `customForm` | 8 | 11 | 4 | 4 | |
| `typography` | 4 | 3 | 2 | 1 | |
| `richText` | 8 | 6 | 4 | 3 | |
| `cardGrid` | 8 | 6 | 4 | 3 | |
| `link` | 5 | 5 | 2 | 2 | |
| `headerBar` | 4 | 2 | 1 | 1 | |
| `pageNavigator` | 36 | 3 | 2 | 1 | 全宽 Tab（满 36 列） |
| `iconNav` | 2 | 3 | 1 | 1 | |
| `navGroup` | 10 | 10 | 4 | 4 | |
| `microApp` | 6 | 6 | 2 | 2 | |
| `myDocuments` | 4 | 3 | 2 | 1 | |
| （兜底） | 4 | 3 | 1 | 1 | 未知类型 |

---

## 组件映射规则

### 关键词 → WidgetType 映射表

按类别分组阅读，匹配时取**最长匹配优先**：

**指标/统计类**
| 关键词模式 | WidgetType | 说明 |
|---|---|---|
| KPI、指标卡、指标卡片、数值展示 | `indicatorCard` | 单值+趋势箭头 |
| 统计卡片、汇总、总计、合计 | `stats` | 多指标横排展示 |
| 数字、计数、总量、访问量 | `indicatorCard` | 配合"趋势"用 stats |

**图表类**（需要额外配置 `chartType`）
| 关键词模式 | chartType | 说明 |
|---|---|---|
| 趋势、走势、变化、波动 | `basic-line` | 折线图 |
| 折线、折线图 | `basic-line` | 折线图 |
| 柱状、柱形、柱图、对比 | `grouped-bar` | 分组柱状图 |
| 堆叠、累计、构成 | `stacked-bar` | 堆叠柱状图 |
| 占比、比例、份额、饼图 | `pie` | 饼图 |
| 环形、甜甜圈 | `donut` | 环形图 |
| 排行、排名、Top、列表排名 | `basic-horizontal-bar` | 横向条形图 |
| 仪表盘、进度、达成率 | `gauge` | 仪表盘 |
| 雷达、综合评价 | `radar` | 雷达图 |
| 散点、分布 | `scatter` | 散点图 |
| 漏斗、流程 | `funnel` | 漏斗图 |
| 地图、区域、地理 | `area-map` | 区域地图 |

**数据展示类**
| 关键词模式 | WidgetType | 说明 |
|---|---|---|
| 表格、数据表格、明细列表 | `dataTable` | 带分页数据表 |
| 列表、排行、排名、Top N | `topList` | 排序列表 |
| 新闻、动态、资讯、公告 | `news` | 新闻列表 |
| 卡片网格、图片卡片 | `cardGrid` | 网格卡片 |
| 富文本、文章、内容 | `richText` | 富文本内容 |

**导航/操作类**
| 关键词模式 | WidgetType | 说明 |
|---|---|---|
| 轮播、Banner、幻灯片 | `carousel` | 图片轮播 |
| 快捷入口、快捷方式、图标导航（多个图标） | `navGroup` | 多图标导航网格（`staticItems` 数组） |
| 快捷入口（单个图标按钮） | `iconNav` | 单图标导航（`icon` 字段） |
| 导航栏、导航、菜单 | `navGroup` | 导航组 |
| 搜索 | `search` | 搜索框 |
| 筛选、过滤、查询条件 | `queryFilter` | 筛选表单 |
| 页面切换、Tab 切换 | `pageNavigator` | 页面切换器 |

**装饰/工具类**
| 关键词模式 | WidgetType | 说明 |
|---|---|---|
| 时钟、时间、日期 | `clock` | 数字时钟 |
| 标题、文本、说明文字 | `typography` | 纯文本展示 |
| 快捷链接、外链 | `link` | 快捷链接 |
| 表单、录入、收集 | `customForm` | 自定义表单 |
| 文档、文件、附件 | `myDocuments` | 文档管理 |

---

## 意图推断规则

当描述中没有明确组件关键词时，从整体意图推断：

### 数据监控看板
**特征**: 提到"监控"、"实时"、"数据"、"报表"、"仪表盘"、"KPI"、"分析"
**推断组件**: `stats`（顶部 KPI） + `chart`（中部核心图表）+ `dataTable` / `topList`（下部明细）
**典型布局**: 顶部 2-3 个 stats/indicatorCard → 中部 1-2 个 chart → 底部 dataTable
**配色建议**: 深色科技风（背景 #0d1b3e，组件半透明白色背景）

### 展示宣传页
**特征**: 提到"展示"、"宣传"、"首页"、"门户"、"Banner"、"轮播"
**推断组件**: `carousel`（顶部 Banner）+ `iconNav`（快捷入口）+ `news`（动态）
**典型布局**: 顶部 carousel → 中部 iconNav → 底部 news/richText
**配色建议**: 深色科技风（与数据监控类似，统一深色主题）

### 数据管理页
**特征**: 提到"管理"、"列表"、"表格"、"CRUD"、"编辑"
**推断组件**: `queryFilter`（顶部筛选）+ `dataTable`（中部列表）
**典型布局**: 顶部 queryFilter → 中部 dataTable → 底部分页
**配色建议**: 明亮轻量风（背景 #f0f2f5，白色组件，#222222 深色文字）

### 混合型页面
**特征**: 多种需求混合，或未明确分类
**策略**: 根据关键词数量均衡选择，保持 widget 数量在 3-8 个之间

---

## 页面主题自动检测

生成配置前，先从用户描述中检测关键词判断页面主题，决定全局配色方案。

### 主题判断规则

| 主题 | 关键词（命中任一即判定） | 推荐场景 |
|---|---|---|
| **深色科技** | 科技、技术、数据大屏、监控、仪表盘、分析、看板、运维、实时监控、BI | 数据监控/技术展示类页面 |
| **蓝色商务** | 门户、企业、官网、首页、宣传、展示、Banner、公司、集团 | 展示宣传/企业门户类页面 |
| **明亮轻量** | 管理、后台、办公、列表、表格、编辑、表单、轻量、简洁 | 管理后台/办公操作类页面 |
| **默认深色** | 上述均不匹配时 | 兜底，倾向深色科技风 |

> **注意**: 用户明确指定颜色（如"白色背景"、"深色主题"）时，以用户指定为准，忽略自动检测结果。

### 主题色值对照表

| 颜色角色 | 深色科技 / 蓝色商务 | 明亮轻量 |
|---|---|---|
| 页面背景 | `#0d1b3e` / `#0a1628` | `#f0f2f5` |
| 组件背景（默认） | `rgba(255,255,255,0.06)` | `#FFFFFF` |
| 组件背景（hover） | `rgba(255,255,255,0.10)` | `#fafafa` |
| 主文字色 | `#FFFFFF` | `#222222` |
| 次要文字色 | `rgba(255,255,255,0.65)` | `rgba(0,0,0,0.45)` |
| 标题文字 | `#FFFFFF` | `#222222` |
| 主色调 / 强调色 | `#4facfe` | `#1677ff` |
| 图表色板（深色主题） | `['#4facfe','#00f2fe','#a855f7','#f59e0b','#36cfc9','#22c55e']` | `['#1677ff', '#36cfc9', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e']` |
| richText 富文本文字 | `rgba(255,255,255,0.85)` | `#222222` |

**深色科技 / 蓝色商务示例背景**:
```json
"dashboardConfig": {
  "backgroundType": "gradient",
  "backgroundGradient": "linear-gradient(135deg, #0a1628 0%, #1a3a6e 40%, #0d1b3e 70%, #0a0e1a 100%)"
}
```

**明亮轻量示例背景**:
```json
"dashboardConfig": {
  "backgroundType": "color",
  "backgroundColor": "#f0f2f5"
}
```

### per-widget 配色应用规则

检测到主题后，**统一应用**，不要让单个组件随机配色：

#### 深色科技 / 蓝色商务主题
```typescript
// 每个 widget 的 config
{
  titleColor: "#FFFFFF",
  backgroundColor: "rgba(255,255,255,0.06)",  // 半透明白色（区别于渐变背景，又有层次）
  backgroundType: "color",                   // ⚠️ 必填，否则 backgroundColor 不生效
  // chart widget
  colors: ['#4facfe', '#00f2fe', '#a855f7', '#f59e0b', '#36cfc9', '#22c55e'],
  // indicatorCard
  indicatorValueColor: '#4facfe',
  indicatorDescriptionColor: '#36cfc9',
  // typography（文字组件）
  color: 'rgba(255,255,255,0.85)',          // ✅ 文字颜色
  // iconNav/navGroup items
  iconBgColor: 'rgba(255,255,255,0.08)',
  iconColor: '#4facfe',
  textColor: 'rgba(255,255,255,0.85)'
}
```

#### 明亮轻量主题
```typescript
{
  titleColor: "#222222",
  backgroundColor: "#FFFFFF",
  backgroundType: "color",                   // ⚠️ 必填，否则 backgroundColor 不生效
  colors: ['#1677ff', '#36cfc9', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e'],
  indicatorValueColor: '#1677ff',
  indicatorDescriptionColor: '#52c41a',
  // typography（文字组件）
  color: '#222222',                          // ✅ 文字颜色
  iconBgColor: '#e6f4ff',
  iconColor: '#1677ff',
  textColor: '#222222'
}
```

> **关键原则**: 同一页面内，所有组件使用同一套配色方案，不混用。
> ⚠️ **重要**：`backgroundColor` 必须搭配 `backgroundType: 'color'` 才会在页面上生效（由 WidgetWrapper 统一应用）。`dataSource` 字段对于 topList/news 等组件是**字符串** `'static' | 'api'`，不是数组。

---

## 布局算法

### 自动布局分配（compact grid，36列）

按 compact grid（36列，cellHeight=30px）自动计算每个 widget 的位置。**所有 w/h 值必须严格使用 `useStore.ts` 中 `WIDGET_DEFAULT_LAYOUTS` 的值，不得自行估算。**

```python
# 自动布局算法 — compact grid 36列
COLS = 36
current_x = 0
current_y = 0
row_max_h = 0          # 追踪当前行最大高度

for widget in widgets:
    # 使用 WIDGET_DEFAULT_LAYOUTS 中的精确值
    w = widget.default_w
    h = widget.default_h

    # 如果当前 widget 超出当前行，换到下一行
    if current_x + w > COLS:
        current_x = 0
        current_y += row_max_h   # 累加上一行的最大高度
        row_max_h = 0

    widget.layout = {
        x: current_x,
        y: current_y,
        w: w,
        h: h,
        minW: widget.minW,
        minH: widget.minH
    }

    row_max_h = max(row_max_h, h)
    current_x += w
```

**关键点**: `current_y` 累加的是 `row_max_h`（上一行的最大高度），而非当前 widget 的高度。这样才能保证不同高度的 widget 换行时不会重叠。

**合理尺寸建议**（基于 compact grid 36列）：
- `w < 10` 的 widget 视为窄组件，适合与宽组件并排（如 topList w=5、news w=6）
- `w ≥ 10` 的 widget 视为宽组件，适合独立占一行或与窄组件并排（如 stats w=10、dataTable w=10）
- `carousel`（w=36）全宽独占一行
- `queryFilter`（w=36）和 `pageNavigator`（w=36）全宽独占一行
- 窄组件并排时注意行高匹配：`row_max_h` 确保同行动态对齐

### 手动位置覆盖

用户描述中有明确位置时（如"左上角"、"顶部"、"底部"），优先使用用户指定（compact grid，36列）：

| 描述 | x | y | w | h |
|---|---|---|---|---|
| 顶部 | 0 | 0 | 36 | 按组件 |
| 左侧 / 左边 | 0 | - | 18 | - |
| 右侧 / 右边 | 18 | - | 18 | - |
| 底部 | 0 | Infinity | 36 | 按组件 |
| 左上 | 0 | 0 | 18 | - |
| 右下 | 18 | Infinity | 18 | - |
| 单独一行 | 0 | Infinity | 36 | 按组件 |

---

## JSON 生成规则

### ID 生成

每个 widget 的 `id` 使用 UUID v4 格式：
```
xxxx-xxxx-xxxx-xxxx（标准 UUID）
```

### 标题生成

从用户描述和组件类型自动生成语义化标题：
- `stats` → "关键指标" / "业务概览"
- `chart` → "趋势分析" / "{数据主题}图表"
- `dataTable` → "数据明细" / "{主题}列表"
- `iconNav` → "快捷入口" / "导航"
- `carousel` → "资讯轮播" / "{主题}Banner"

### config 默认值（重要）

**所有颜色字段必须提供默认值**，否则 ConfigDialog 中的 ColorPicker 无法正常工作。

**配色来源**: 先检测页面主题（见「页面主题自动检测」章节），统一应用该主题的配色方案，**不要让单个组件随机配色**。

```typescript
// 深色科技 / 蓝色商务 主题示例
const darkConfig: WidgetConfig = {
  showTitle: true,
  titleColor: '#FFFFFF',          // 白色标题
  title: '...',
  contentPadding: 12,
  backgroundColor: 'rgba(255,255,255,0.06)',  // 半透明白色
};

// 明亮轻量 主题示例
const lightConfig: WidgetConfig = {
  showTitle: true,
  titleColor: '#222222',          // 深色标题
  title: '...',
  contentPadding: 12,
  backgroundColor: '#FFFFFF',    // 白色背景
};
```

### 图标配置规范（重要）

项目支持两套图标库：**Antd 图标**和 **iconfont 图标**。

**Antd 图标**（推荐用于 `iconNav` 单图标组件）：
- 直接使用图标名称字符串，如 `'DashboardOutlined'`、`'AppstoreOutlined'`
- 常用图标：`DashboardOutlined`、`AppstoreOutlined`、`HomeOutlined`、`UserOutlined`、`SettingOutlined`、`SearchOutlined`、`BellOutlined`、`BarChartOutlined`、`TeamOutlined`、`MailOutlined`
-Filled 版本：`HomeFilled`、`SettingFilled`、`StarFilled`、`BellFilled`、`FireFilled`、`CrownFilled`

**iconfont 图标**（推荐用于 `navGroup` 导航项）：
- 图标名以 `icon-` 开头，如 `'icon-line_xia'`、`'icon-fill_shaixuan'`
- 常用 iconfont：`icon-line_xia`、`icon-line_bianji`、`icon-line_shuaxin`、`icon-line_shezhi`、`icon-line_yonghu`、`icon-fill_shaixuan`、`icon-fill_gongzuotai`、`icon-fill_shouye`、`icon-fill_bushuguanli`、`icon-fill_moxingguanli`

**图标值格式判断**（由 `IconRenderer` 自动处理）：
| 值格式 | 类型 | 存储方式 |
|---|---|---|
| `'DashboardOutlined'` | Antd 图标 | 直接存储名称 |
| `'icon-line_xia'` | iconfont | 带 `icon-` 前缀 |
| `'<svg...'` | SVG 代码 | 直接存储 |
| `'https://...'` | 图片 URL | 直接存储 |

> **禁止使用 emoji 作为图标值**。所有图标必须是 Antd 图标名或 iconfont 图标名。

**图标组件选择指引**：
- **单图标按钮**（如"加一个仪表盘图标"）→ `iconNav`，`icon` 字段填 Antd 图标名
- **多图标网格导航**（如"快捷入口，4-8个图标"）→ `navGroup`，`staticItems[].icon` 填 iconfont 名
- **单个跳转链接** → `link` 或 `iconNav`

### chart widget 特殊配置

chart widget 的 config 需要包含 ECharts 完整配置：

```typescript
{
  type: 'chart',
  title: '收入趋势',
  layout: { x: 0, y: 0, w: 8, h: 9 },
  config: {
    showTitle: true,
    titleColor: '#222222',
    backgroundColor: '#FFFFFF',
    backgroundType: 'color',     // ⚠️ 必填
    chartType: 'basic-line',
    chartData: [...],           // 静态示例数据（来自 presets 中的 staticDataExample）
    categoryField: 'name',
    valueField: 'value',
    smooth: true,
    showLegend: false,
    colors: ['#1677ff', '#36cfc9', '#f59e0b', '#ef4444', '#8b5cf6'],
  }
}
```

### richText widget HTML 生成规范

生成 `richText` 组件的 `html` 字段时：
- **必须**在 HTML 的 style 里写死文字颜色，否则不生效
- `titleColor` 字段用于标题栏颜色，与内容区颜色无关
- 内容区颜色需根据页面主题手动设置：
  - **深色主题**：文字 `color: rgba(255,255,255,0.85)`，子标题/强调色 `color: #4facfe`
  - **浅色主题**：文字 `color: #222222`，子标题/强调色 `color: #1677ff`

**正确示范（深色主题）**：
```json
"html": "<div style=\"color:rgba(255,255,255,0.85);line-height:1.8\"><h2 style=\"color:#4facfe\">联系我们</h2><p>地址：北京市海淀区</p><p>电话：400-888-8888</p></div>"
```

**错误示范（不要这样做）**：
```json
"html": "<div>...</div>"  // 没有写 color，内容显示异常
```

### topList / news 数据配置规范

- `dataSource` 是**字符串**：`'static'` 或 `'api'`，**不是数组**
- 静态数据放在 **`staticData`** 字段（数组）
- `apiEndpoint` 是接口地址（`dataSource: 'api'` 时填写）
- 示例：`{ "dataSource": "static", "staticData": [{ "name": "华东", "value": 856 }] }`

### 完整生成示例

**输入**: "帮我做一个销售数据看板，包含收入趋势图、各区域销售排名和今日销售额指标"

**输出 JSON**（深色科技风配色，所有组件统一应用）:

```json
{
  "widgets": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "type": "indicatorCard",
      "title": "今日销售额",
      "layout": { "x": 0, "y": 0, "w": 8, "h": 5, "minW": 2, "minH": 2 },
      "config": {
        "showTitle": true,
        "titleColor": "#FFFFFF",
        "backgroundColor": "rgba(255,255,255,0.06)",
        "backgroundType": "color",
        "contentPadding": 12,
        "indicatorValueColor": "#4facfe",
        "indicatorDescriptionColor": "#36cfc9",
        "chartType": "gauge",
        "indicatorType": "currency"
      }
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "type": "chart",
      "title": "收入趋势",
      "layout": { "x": 8, "y": 0, "w": 8, "h": 9, "minW": 4, "minH": 4 },
      "config": {
        "showTitle": true,
        "titleColor": "#FFFFFF",
        "backgroundColor": "rgba(255,255,255,0.06)",
        "backgroundType": "color",
        "contentPadding": 12,
        "chartType": "basic-line",
        "chartData": [
          { "name": "周一", "value": 120 },
          { "name": "周二", "value": 168 },
          { "name": "周三", "value": 142 },
          { "name": "周四", "value": 186 },
          { "name": "周五", "value": 210 }
        ],
        "categoryField": "name",
        "valueField": "value",
        "smooth": true,
        "showLegend": false,
        "colors": ["#4facfe", "#00f2fe", "#a855f7", "#f59e0b", "#36cfc9", "#22c55e"]
      }
    },
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "type": "topList",
      "title": "区域销售排名",
      "layout": { "x": 0, "y": 9, "w": 5, "h": 9, "minW": 3, "minH": 4 },
      "config": {
        "showTitle": true,
        "titleColor": "#FFFFFF",
        "backgroundColor": "rgba(255,255,255,0.06)",
        "backgroundType": "color",
        "contentPadding": 12,
        "dataSource": "static",
        "staticData": [
          { "name": "华东大区", "value": 856000, "rank": 1, "trend": "up" },
          { "name": "华南大区", "value": 723000, "rank": 2, "trend": "up" },
          { "name": "华北大区", "value": 598000, "rank": 3, "trend": "down" }
        ]
      }
    }
  ],
  "groups": [],
  "floatingModules": [],
  "dashboardConfig": {
    "title": "销售数据看板",
    "backgroundType": "gradient",
    "backgroundGradient": "linear-gradient(135deg, #0a1628 0%, #1a3a6e 40%, #0d1b3e 70%, #0a0e1a 100%)"
  }
}
```

---

## 输出格式

生成完成后，以如下格式输出：

```markdown
## 生成的仪表盘配置

**标题**: {dashboardConfig.title}
**组件数量**: {widgets.length} 个组件

### 识别结果

| 组件 | 类型 | 置信度 | 说明 |
|---|---|---|---|
| 今日销售额 | indicatorCard | [精确] | 关键词"KPI指标"直接匹配 |
| 收入趋势 | chart | [精确] | 关键词"趋势图"直接匹配 |
| 区域排名 | topList | [推断] | 从"排名"关键词 + 上下文推断 |

### 布局预览

| 位置 (x,y) | 尺寸 (w×h) | 组件 | 标题 |
|---|---|---|---|
| (0, 0) | 8×5 | indicatorCard | 今日销售额 |
| (8, 0) | 8×9 | chart | 收入趋势 |
| (0, 9) | 5×9 | topList | 区域排名 |

### JSON 配置

```json
{完整 JSON}
```

### 使用方式

1. **复制 JSON**：上方代码块即为完整的 DashboardSnapshot 配置
2. **导入 Portal Engine**：
   - **方式 A**：打开 Dashboard 编辑器 → 点击右上角「导入配置」→ 粘贴 JSON
   - **方式 B**：通过发布 API 保存到应用列表：
     ```
     POST /v1/dashboard/publish
     Body: { "title": "销售数据看板", "dashboardConfig": "<粘贴上方JSON>" }
     ```
3. **后续调整**：在编辑器中拖拽调整布局，通过组件的 ConfigDialog 修改配置
4. **数据填充**：chart/dataTable 等组件的 `apiEndpoint` 字段需要替换为真实接口地址
```

---

## 常见模式参考

### 销售管理看板
```
indicatorCard (KPI) + indicatorCard (KPI) + chart (趋势) + topList (排名) + dataTable (明细)
```

### 运营监控大屏
```
headerBar (导航) + stats (指标) + stats (指标) + stats (指标) + chart (折线) + chart (饼图) + carousel (动态)
```

### 企业门户首页
```
carousel (Banner) + navGroup (快捷入口) + news (新闻) + richText (公告)
```

### 数据管理后台
```
queryFilter (筛选) + dataTable (表格) + pageNavigator (分页)
```

---

## 边界情况处理

1. **组件过多（>10个）**: 自动分组，建议拆分为多个页面，并在输出中注明
2. **无法识别的描述（完全模糊）**: 主动追问（见第 3 步条件 1），不要自行生成配置，更不要降级为 typography
3. **单组件场景（只识别出 1 个 widget）**: **必须追问，不得直接生成 JSON**。追问内容见第 3 步条件 4。禁止绕过追问直接生成配置。
4. **部分识别（只识别出 2 个）**: 生成已有组件，并在末尾追问"你还需要什么组件？"
5. **布局冲突（x+w>36）**: 自动换行重排（使用正确的 row_max_h 算法）
6. **缺少数据主题**: 使用占位符如 `"{主题}趋势"` 并在输出中用 ⚠️ 标注，提示用户填写 `apiEndpoint`
7. **图表类型模糊（只说"图"）**: 默认使用 `basic-line`，在置信度列标注 `[模糊]`，注明可调整为其他类型
8. **用户指定了不存在的组件类型**: 忽略该项，使用最接近的默认组件并注明

---

## 参考文件

此 Skill 依赖以下参考文件（**必须读取**）：

- `references/widget-map.md` — 完整的关键词→组件映射表（含所有图表类型和 config 示例）
- `references/layout-rules.md` — 详细布局规则和算法说明
- `references/json-schema.md` — 完整的 TypeScript 类型定义和各组件 config 扩展字段
