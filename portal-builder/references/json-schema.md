# JSON Schema 参考

本文件用于 Portal Builder 生成与当前项目运行时一致的 `DashboardSnapshot` JSON。

## 根结构

```ts
interface DashboardSnapshot {
  widgets: Widget[]
  groups: WidgetGroup[]
  floatingModules: Widget[]
  dashboardConfig?: DashboardConfig
}
```

默认输出：

```json
{
  "widgets": [],
  "groups": [],
  "floatingModules": []
}
```

## Widget 基础结构

```ts
interface Widget {
  id: string
  type: WidgetType
  title: string
  layout: {
    x: number
    y: number
    w: number
    h: number
    minW?: number
    minH?: number
  }
  config: WidgetConfig
}
```

## 基础配置字段

```ts
interface WidgetConfig {
  title?: string
  showTitle?: boolean
  titleColor?: string
  contentPadding?: number
  refreshInterval?: number

  backgroundType?: 'color' | 'image' | 'gradient'
  backgroundColor?: string
  backgroundImage?: string
  backgroundGradient?: string

  apiEndpoint?: string
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  apiHeaders?: Record<string, string>
  apiQuery?: Record<string, any> | string
  apiBody?: Record<string, any> | string
  apiDataField?: string
  apiListField?: string

  paginationMode?: 'none' | 'pagination'
  paginationConfig?: {
    page?: number
    pageSize?: number
    pageParam?: string
    pageSizeParam?: string
    totalField?: string
    currentField?: string
    pageSizeField?: string
    showTotal?: boolean
  }

  [key: string]: any
}
```

## 布局基线

Portal Builder 生成时统一以 **compact 36 列** 为准。

| 模式 | 列数 | cellHeight | 说明 |
|---|---|---|---|
| `compact` | 36 | 30px | 编辑器导入与编辑 |
| `standard` | 12 | 120px | 预览 / 发布参考 |
| `spacious` | 8 | 150px | 大屏参考 |

### 生成约束

- 所有组件必须满足 `x + w <= 36`
- `y = Infinity` 可用于顺序追加到底部
- Skill 生成快照时优先输出 36 列布局，不直接输出 12 列示意布局
- `carousel`、`queryFilter`、`pageNavigator` 生成时可直接使用全宽布局

## 推荐生成尺寸

| WidgetType | `w` | `h` |
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

## 关键组件字段

### `stats`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60,
  "dataSource": "static",
  "staticData": [
    { "key": "revenue", "label": "总收入", "value": "1,234,567", "trend": "up", "color": "#1890ff" }
  ],
  "statsItems": [
    { "key": "revenue", "label": "总收入", "value": "1,234,567", "trend": "up", "color": "#1890ff" }
  ]
}
```

### `indicatorCard`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60,
  "dataSource": "static",
  "staticValue": "22522.75",
  "staticDescription": "今日销售额",
  "valueField": "value",
  "descriptionField": "description",
  "indicatorValueFontSize": 38,
  "indicatorDescriptionFontSize": 18,
  "indicatorValueColor": "#1890ff",
  "indicatorDescriptionColor": "#95de64"
}
```

### `chart`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60,
  "chartPreset": "basic-line",
  "chartType": "basic-line",
  "dataSource": "static",
  "staticData": [
    { "name": "周一", "value": 120 },
    { "name": "周二", "value": 168 }
  ],
  "categoryField": "name",
  "valueField": "value",
  "smooth": true,
  "showLegend": false,
  "showTooltip": true,
  "colors": ["#1677ff", "#36cfc9", "#f59e0b", "#ef4444", "#8b5cf6", "#22c55e"]
}
```

### `carousel`

使用当前运行时字段，不要使用旧字段名。

```json
{
  "showTitle": false,
  "titleColor": "#222222",
  "backgroundColor": "#1677ff",
  "backgroundType": "color",
  "contentPadding": 0,
  "refreshInterval": 60,
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

### `headerBar`

```json
{
  "showTitle": false,
  "titleColor": "#222222",
  "textColor": "#FFFFFF",
  "backgroundColor": "#0a1628",
  "backgroundType": "color",
  "backgroundGradient": "linear-gradient(135deg, #0a1628 0%, #1a3a6e 100%)",
  "contentPadding": 0,
  "headerTitle": "Enterprise Portal",
  "headerFontSize": 24,
  "fontFamily": "YouSheBiaoTiHei",
  "showNavMenu": true,
  "navDataSource": "static",
  "navItems": [
    { "id": "nav-1", "name": "首页", "url": "/" },
    { "id": "nav-2", "name": "关于我们", "url": "/about" }
  ]
}
```

### `richText`

`html` 内联样式里必须直接写文字颜色。

```json
{
  "showTitle": false,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "html": "<div style=\"color:#222222;line-height:1.8\"><h2 style=\"color:#1677ff\">公告</h2><p>正文内容</p></div>",
  "placeholder": "请输入富文本内容",
  "minHeight": 220,
  "allowImageUpload": false
}
```

### `pageNavigator`

```json
{
  "showTitle": false,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "displayMode": "text",
  "itemColor": "#222222",
  "items": [
    { "name": "页面1", "path": "" },
    { "name": "页面2", "path": "" }
  ]
}
```

### `iconNav`

只适合单图标入口。

```json
{
  "showTitle": false,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 16,
  "icon": "AppstoreOutlined",
  "url": "/dashboard",
  "openInNew": false,
  "iconSize": 48,
  "iconColor": "#1677ff"
}
```

### `navGroup`

多图标入口优先使用这个组件。

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
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60,
  "formLayout": "vertical",
  "labelVerticalAlign": "top",
  "labelTextAlign": "left",
  "labelWidth": 96,
  "layoutCols": 4,
  "submitButtonText": "查询",
  "resetButtonText": "重置",
  "showResetButton": true,
  "buttonAlign": "right",
  "fieldSpacing": 16,
  "submitMethod": "eventRoute",
  "apiMethod": "GET",
  "queryFields": [
    {
      "id": "query-field-status",
      "type": "select",
      "label": "状态",
      "field": "status",
      "placeholder": "请选择状态",
      "dataSourceType": "manual",
      "manualOptions": [
        { "label": "全部", "value": "" },
        { "label": "进行中", "value": "running" },
        { "label": "已完成", "value": "done" }
      ]
    },
    {
      "id": "query-field-date",
      "type": "datePicker",
      "label": "日期",
      "field": "date",
      "pickerType": "date"
    }
  ]
}
```

### `dataTable`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60,
  "columns": [
    { "title": "名称", "dataIndex": "name", "width": 200 },
    { "title": "状态", "dataIndex": "status", "width": 120 }
  ],
  "staticData": [
    { "key": "1", "name": "示例数据1", "status": "进行中" }
  ],
  "paginationMode": "pagination",
  "paginationConfig": {
    "page": 1,
    "pageSize": 10,
    "pageParam": "page",
    "pageSizeParam": "pageSize",
    "totalField": "total",
    "currentField": "current",
    "showTotal": true
  },
  "apiMethod": "GET",
  "apiDataField": "data",
  "apiListField": "list"
}
```

### `topList`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60,
  "rankingField": "rank",
  "labelField": "name",
  "valueField": "value",
  "showRank": true,
  "showTrend": false,
  "maxItems": 10,
  "dataSource": "static",
  "staticData": [
    { "name": "华东大区", "value": 856000, "rank": 1, "trend": "up" }
  ]
}
```

### `news`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 16,
  "refreshInterval": 60,
  "maxItems": 8,
  "showDate": true,
  "showSource": true,
  "dataSource": "static",
  "staticData": [
    { "title": "新闻标题", "date": "2026-04-08", "source": "企业新闻", "url": "#" }
  ]
}
```

### `cardGrid`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60
}
```

注意：

- 当前项目中的 `cardGrid` 仍偏占位实现
- 除非用户明确要求，不要把它当作门户页的默认核心模块

### `link`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60,
  "layout": "button",
  "buttonShape": "circle",
  "buttonSize": "large",
  "links": [
    {
      "title": "数据看板",
      "url": "/dashboard",
      "systemId": "",
      "icon": "DashboardOutlined",
      "iconBgColor": "#1677ff",
      "iconColor": "#ffffff",
      "description": "查看业务数据"
    }
  ]
}
```

### `customForm`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60,
  "fields": [
    {
      "id": "field-1",
      "type": "text",
      "label": "姓名",
      "name": "name",
      "required": true
    }
  ],
  "submitMethod": "eventRoute"
}
```

### `myDocuments`

```json
{
  "showTitle": false,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 0,
  "refreshInterval": 60,
  "btnColor": "#1677ff",
  "btnTextColor": "#ffffff"
}
```

### `microApp`

```json
{
  "showTitle": true,
  "titleColor": "#222222",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "color",
  "contentPadding": 12,
  "refreshInterval": 60,
  "systemId": "",
  "moduleId": "",
  "sync": false,
  "alive": true
}
```

## 页面级配置

```json
{
  "dashboardConfig": {
    "title": "企业门户首页",
    "backgroundType": "gradient",
    "backgroundGradient": "linear-gradient(135deg, #0a1628 0%, #1a3a6e 40%, #0d1b3e 70%, #0a0e1a 100%)"
  }
}
```

## 关键提醒

- 写 `backgroundColor` 时同步写 `backgroundType: 'color'`
- `carousel` 用 `imageUrl`，不是 `image`
- 多图标入口用 `navGroup`
- `queryFilter` 用 `queryFields`
- `dataTable` 静态数据用 `staticData`
- `topList` 和 `news` 的 `dataSource` 是字符串，不是数组
