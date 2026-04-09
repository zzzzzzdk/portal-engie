# Widget 完整映射表

本文档是 SKILL.md 的参考补充，包含完整的关键词到组件映射。

## 完整 WidgetType 列表

```
clock | stats | indicatorCard | chart | carousel | link |
news | topList | search | queryFilter | dataTable | cardGrid |
customForm | headerBar | typography | richText | microApp |
floatingModule | pageNavigator | iconNav | navGroup | myDocuments
```

## search 配置

```json
{
  "submitMethod": "eventRoute",
  "apiMethod": "GET",
  "apiEndpoint": "/api/search",
  "apiQuery": {},
  "apiHeaders": {},
  "apiBody": {}
}
```

## 图表类型（Chart Presets）

所有图表都通过 `type: 'chart'` + `config.chartType` 指定：

```
basic-line      基础折线图
stacked-line    堆叠折线图
basic-bar       基础柱状图
stacked-bar     堆叠柱状图
percent-bar     百分比柱状图
grouped-bar     分组柱状图
basic-horizontal-bar    横向条形图
stacked-horizontal-bar  堆叠横向条形图
progress-bar    进度条
gauge           仪表盘
pie             饼图
donut           环形图
radar           雷达图
area-map        区域地图
flow-map        流向地图
funnel          漏斗图
scatter         散点图
dual-axis       双轴图
grouped-dual-axis  分组双轴图
```

## 图表示例数据（来自 presets.ts）

每个图表类型的默认静态数据，生成 JSON 时直接使用：

**basic-line**:
```json
[{"name":"周一","value":120},{"name":"周二","value":168},{"name":"周三","value":142},{"name":"周四","value":186},{"name":"周五","value":210}]
```

**grouped-bar**:
```json
[{"category":"一季度","series":"今年","value":320},{"category":"一季度","series":"去年","value":280},{"category":"二季度","series":"今年","value":356},{"category":"二季度","series":"去年","value":310}]
```

**pie**:
```json
[{"name":"华东","value":320},{"name":"华南","value":280},{"name":"华北","value":350},{"name":"西部","value":180}]
```

**gauge**:
```json
[{"name":"完成率","value":78}]
```

**topList / basic-horizontal-bar**:
```json
[{"name":"事项 A","value":420},{"name":"事项 B","value":360},{"name":"事项 C","value":300},{"name":"事项 D","value":240}]
```

## 完整关键词映射

### 指标/KPI 类

| 关键词 | 映射类型 | 图表类型 |
|---|---|---|
| KPI | indicatorCard | gauge |
| 指标卡 | indicatorCard | - |
| 指标卡片 | indicatorCard | - |
| 数值展示 | indicatorCard | - |
| 单值 | indicatorCard | - |
| 数字 | indicatorCard | - |
| 计数 | indicatorCard | - |
| 总量 | indicatorCard | - |
| 总计 | stats | - |
| 合计 | stats | - |
| 汇总 | stats | - |
| 统计卡片 | stats | - |
| 业务概览 | stats | - |
| 关键指标 | stats | - |

### 图表类

| 关键词 | 映射类型 | chartType |
|---|---|---|
| 趋势图 | chart | basic-line |
| 趋势 | chart | basic-line |
| 走势 | chart | basic-line |
| 变化 | chart | basic-line |
| 波动 | chart | basic-line |
| 折线图 | chart | basic-line |
| 折线 | chart | basic-line |
| 单系列趋势 | chart | basic-line |
| 堆叠折线 | chart | stacked-line |
| 累计趋势 | chart | stacked-line |
| 柱状图 | chart | grouped-bar |
| 柱形图 | chart | grouped-bar |
| 柱图 | chart | grouped-bar |
| 对比 | chart | grouped-bar |
| 多系列对比 | chart | grouped-bar |
| 同比环比 | chart | grouped-bar |
| 分组柱状 | chart | grouped-bar |
| 堆叠柱状 | chart | stacked-bar |
| 累计柱状 | chart | stacked-bar |
| 构成 | chart | stacked-bar |
| 占比 | chart | pie |
| 比例 | chart | pie |
| 份额 | chart | pie |
| 饼图 | chart | pie |
| 环形 | chart | donut |
| 甜甜圈 | chart | donut |
| 进度 | chart | progress-bar |
| 达成率 | chart | gauge |
| 仪表盘 | chart | gauge |
| 完成率 | chart | gauge |
| 排名 | chart | basic-horizontal-bar |
| 排行 | topList 或 chart | basic-horizontal-bar |
| Top N | topList | - |
| 排行榜 | topList | - |
| 雷达 | chart | radar |
| 综合评价 | chart | radar |
| 散点 | chart | scatter |
| 分布 | chart | scatter |
| 漏斗 | chart | funnel |
| 流程 | chart | funnel |
| 双轴 | chart | dual-axis |
| 多Y轴 | chart | dual-axis |

### 数据展示类

| 关键词 | 映射类型 |
|---|---|
| 表格 | dataTable |
| 数据表格 | dataTable |
| 明细列表 | dataTable |
| 明细 | dataTable |
| 数据列表 | dataTable |
| 列表 | topList 或 dataTable |
| 排行 | topList |
| 排名 | topList |
| Top N | topList |
| 排行榜 | topList |
| 新闻 | news |
| 动态 | news |
| 资讯 | news |
| 公告 | news |
| 卡片网格 | cardGrid |
| 图片卡片 | cardGrid |
| 图文卡片 | cardGrid |
| 富文本 | richText |
| 文章 | richText |
| 内容 | richText |

### 导航/操作类

| 关键词 | 映射类型 |
|---|---|
| 轮播 | carousel |
| Banner | carousel |
| 幻灯片 | carousel |
| 图片轮播 | carousel |
| 快捷入口 | iconNav |
| 快捷方式 | iconNav |
| 图标导航 | iconNav |
| 图标 | iconNav |
| 导航栏 | navGroup 或 headerBar |
| 导航 | navGroup |
| 菜单 | navGroup |
| 搜索框 | search |
| 搜索 | search |
| 筛选 | queryFilter |
| 过滤 | queryFilter |
| 查询条件 | queryFilter |
| Tab | pageNavigator |
| 页面切换 | pageNavigator |
| 标签页 | pageNavigator |

### 装饰/工具类

| 关键词 | 映射类型 |
|---|---|
| 时钟 | clock |
| 时间 | clock |
| 标题 | typography |
| 文本 | typography |
| 说明文字 | typography |
| 快捷链接 | link |
| 外链 | link |
| 表单 | customForm |
| 录入 | customForm |
| 收集 | customForm |
| 文档 | myDocuments |
| 文件 | myDocuments |
| 附件 | myDocuments |

### 意图推断关键词

| 关键词组合 | 推断场景 |
|---|---|
| 监控 + 数据 | 数据监控看板 |
| 实时 + 数据 | 数据监控看板 |
| 报表 + 指标 | 数据监控看板 |
| 仪表盘 + KPI | 数据监控看板 |
| 分析 + 图表 | 数据监控看板 |
| 展示 + 首页 | 展示宣传页 |
| 宣传 + Banner | 展示宣传页 |
| 门户 + 入口 | 展示宣传页 |
| 管理 + 表格 | 数据管理页 |
| CRUD + 列表 | 数据管理页 |
| 后台 + 列表 | 数据管理页 |

## 配置示例

### indicatorCard 配置
```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "contentPadding": 12,
  "chartType": "gauge",
  "indicatorType": "currency",
  "value": 123456
}
```

### stats 配置
```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "dataSource": "static",
  "staticData": [
    { "key": "revenue", "label": "总收入", "value": "¥1,234,567", "trend": "up" },
    { "key": "orders", "label": "订单数", "value": "8,888", "trend": "up" },
    { "key": "users", "label": "新增用户", "value": "1,234", "trend": "down" }
  ],
  "statsItems": [
    { "key": "revenue", "label": "总收入", "value": "¥1,234,567", "trend": "up" },
    { "key": "orders", "label": "订单数", "value": "8,888", "trend": "up" },
    { "key": "users", "label": "新增用户", "value": "1,234", "trend": "down" }
  ]
}
```

### dataTable 配置
```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "columns": [
    { "title": "序号", "dataIndex": "id", "width": 60 },
    { "title": "名称", "dataIndex": "name", "width": 200 },
    { "title": "状态", "dataIndex": "status", "width": 100 }
  ],
  "staticData": [
    { "id": 1, "name": "示例数据1", "status": "进行中" },
    { "id": 2, "name": "示例数据2", "status": "已完成" }
  ],
  "paginationMode": "pagination",
  "paginationConfig": {
    "page": 1,
    "pageSize": 10,
    "showTotal": true
  }
}
```

### carousel 配置
```json
{
  "showTitle": false,
  "backgroundColor": "#FFFFFF",
  "autoPlay": true,
  "interval": 3000,
  "height": 200,
  "slides": [
    { "image": "/assets/banner1.jpg", "link": "#" },
    { "image": "/assets/banner2.jpg", "link": "#" }
  ]
}
```

### iconNav 配置

> **重要**: `iconNav` 是单图标组件，每个 widget 只能配置一个图标。如需多图标导航，请使用 `navGroup` 组件。
> ⚠️ `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。

```json
{
  "showTitle": false,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 16,
  "icon": "DashboardOutlined",
  "url": "/dashboard",
  "openInNew": false,
  "iconSize": 48,
  "iconColor": "#1677ff"
}
```

### navGroup 配置（多图标导航，推荐）

> `navGroup` 使用 `staticItems` 数组支持多个导航项，每个导航项的 `icon` 使用 iconfont 格式（`icon-` 开头）。
> ⚠️ `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "layout": "grid",
  "columns": 4,
  "showLabel": true,
  "iconSize": 48,
  "itemGap": 12,
  "staticItems": [
    {
      "id": "item-1",
      "name": "数据看板",
      "url": "/dashboard",
      "icon": "icon-line_xia",
      "iconBgColor": "#e6f4ff",
      "iconColor": "#1677ff",
      "textColor": "#222222"
    },
    {
      "id": "item-2",
      "name": "消息中心",
      "url": "/notice",
      "icon": "icon-fill_shaixuan",
      "iconBgColor": "#fff7e6",
      "iconColor": "#fa8c16",
      "textColor": "#222222"
    },
    {
      "id": "item-3",
      "name": "快捷链接",
      "url": "/link",
      "icon": "icon-line_shezhi",
      "iconBgColor": "#f9f0ff",
      "iconColor": "#722ed1",
      "textColor": "#222222"
    }
  ]
}
```
