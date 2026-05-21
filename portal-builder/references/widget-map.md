# Widget 映射参考

本文档用于 Portal Builder 在“自然语言描述 -> 组件选择 -> 运行时字段”之间做稳定映射。

## 完整 WidgetType 列表

```text
clock | stats | indicatorCard | chart | carousel | link
news | topList | search | queryFilter | dataTable | cardGrid
customForm | headerBar | typography | richText | microApp
floatingModule | pageNavigator | iconNav | navGroup | myDocuments
```

## 关键词映射

### 指标 / 统计

| 关键词 | WidgetType | 备注 |
|---|---|---|
| KPI、指标卡、指标卡片、数值展示 | `indicatorCard` | 单值展示 |
| 统计卡片、汇总、总计、合计、业务概览 | `stats` | 多指标概览 |

### 图表

| 关键词 | WidgetType | `chartType` |
|---|---|---|
| 趋势、走势、变化、折线图 | `chart` | `basic-line` |
| 柱状图、柱形图、对比 | `chart` | `grouped-bar` |
| 堆叠、累计、构成 | `chart` | `stacked-bar` |
| 占比、比例、饼图 | `chart` | `pie` |
| 环形图 | `chart` | `donut` |
| 排名图、横向对比 | `chart` | `basic-horizontal-bar` |
| 仪表盘、达成率、完成率 | `chart` | `gauge` |
| 雷达 | `chart` | `radar` |
| 散点、分布 | `chart` | `scatter` |
| 漏斗、流程转化 | `chart` | `funnel` |
| 地图、区域地图 | `chart` | `area-map` |

### 数据展示

| 关键词 | WidgetType | 备注 |
|---|---|---|
| 表格、数据表格、明细列表 | `dataTable` | 后台/列表页优先 |
| 排行、排名、Top N、排行榜 | `topList` | 轻量排行 |
| 新闻、动态、资讯、公告 | `news` | 门户/首页常用 |
| 富文本、文章、公告内容 | `richText` | 公告说明 |
| 卡片网格、图片卡片、图文卡片 | `cardGrid` | 仅用户明确要求时使用 |

### 导航 / 入口 / 操作

| 关键词 | WidgetType | 备注 |
|---|---|---|
| 轮播、Banner、幻灯片 | `carousel` | 门户头图 |
| 快捷入口、图标导航、入口宫格、多个图标入口 | `navGroup` | 多图标入口默认选它 |
| 单个图标入口、单按钮入口 | `iconNav` | 单个图标才用 |
| 导航栏、页头导航 | `headerBar` | 顶部整行导航 |
| 导航、菜单 | `navGroup` | 未明确是页头时优先 navGroup |
| 搜索、搜索框 | `search` | 独立搜索 |
| 筛选、过滤、查询条件 | `queryFilter` | 表单式筛选 |
| Tab、页面切换、标签页 | `pageNavigator` | 底部切页 / 顶部切页 |

### 装饰 / 工具

| 关键词 | WidgetType |
|---|---|
| 时钟、时间 | `clock` |
| 标题、文本、说明文字 | `typography` |
| 快捷链接、外链 | `link` |
| 表单、录入、收集 | `customForm` |
| 文档、文件、附件 | `myDocuments` |

## 意图推断

### 数据看板

触发词：

```text
监控 + 数据 / KPI + 图表 / 报表 + 分析 / 实时 + 指标
```

推荐组合：

```text
indicatorCard | stats + chart + topList | dataTable
```

### 企业门户 / 展示宣传页

触发词：

```text
门户 + 首页 / 展示 + Banner / 公司 + 新闻 / 官网 + 快捷入口
```

推荐组合：

```text
headerBar + carousel + navGroup + news + richText
```

### 管理后台

触发词：

```text
管理 + 表格 / 后台 + 列表 / CRUD + 查询 / 过滤 + 分页
```

推荐组合：

```text
queryFilter + dataTable + pageNavigator
```

## 运行时配置示例

### `carousel`

当前项目运行时字段以 [`src/components/widgets/CarouselWidget/index.tsx`](e:/demo/portalengie_frontend/src/components/widgets/CarouselWidget/index.tsx) 为准：

```json
{
  "showTitle": false,
  "backgroundColor": "#1677ff",
  "contentPadding": 0,
  "dataSourceType": "static",
  "autoplay": {
    "enabled": true,
    "delay": 5000,
    "pauseOnMouseEnter": true,
    "disableOnInteraction": false
  },
  "pagination": { "enabled": true, "type": "bullets", "clickable": true },
  "navigation": { "enabled": true },
  "slidesPerView": 1,
  "slidesPerGroup": 1,
  "spaceBetween": 16,
  "loop": true,
  "effect": "slide",
  "textAlign": "left",
  "overlayStyle": "gradient",
  "overlayColor": "rgba(0, 0, 0, 0.45)",
  "buttonType": "primary",
  "slides": [
    {
      "id": "slide-1",
      "title": "企业标题",
      "description": "描述文案",
      "imageUrl": "/assets/banner-placeholder.jpg",
      "buttonText": "立即查看",
      "buttonLink": "/about"
    }
  ]
}
```

### `iconNav`

图标规则：

- `config.icon` 优先使用 Ant Design Outlined 图标名
- 只从 `references/icon-map.md` 的白名单里选
- 不要给 `iconNav` 写 iconfont 名

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

### `navGroup`

图标规则：

- `staticItems[].icon` 只用 iconfont 名
- 必须带 `icon-` 前缀
- 只从 `references/icon-map.md` 的白名单里选
- 拿不准时用 `icon-line_duixiang`

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
    }
  ]
}
```

### `queryFilter`

```json
{
  "showTitle": false,
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "layoutCols": 4,
  "submitMethod": "eventRoute",
  "queryFields": [
    {
      "id": "field-status",
      "type": "select",
      "label": "状态",
      "field": "status",
      "dataSourceType": "manual",
      "manualOptions": [
        { "label": "全部", "value": "" },
        { "label": "进行中", "value": "running" }
      ]
    }
  ]
}
```

### `dataTable`

```json
{
  "showTitle": true,
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "columns": [
    { "title": "名称", "dataIndex": "name", "width": 200 }
  ],
  "staticData": [
    { "key": "1", "name": "示例数据" }
  ],
  "paginationMode": "pagination",
  "paginationConfig": {
    "page": 1,
    "pageSize": 10,
    "showTotal": true
  }
}
```

## 使用提醒

- 多图标门户入口优先使用 `navGroup`，不是 `iconNav`
- `carousel` 使用 `slides[].imageUrl`，不是 `image`
- `carousel` 使用 `autoplay.enabled`，不是 `autoPlay`
- `cardGrid` 当前更像占位组件，不要把它当成门户页面的默认核心内容
- 涉及图标时先读 `references/icon-map.md`
- 不要输出不存在的图标名或未加前缀的 iconfont 名
