# 完整 JSON Schema 参考

## DashboardSnapshot（根结构）

发布到应用列表页时存储的完整数据结构。

```typescript
interface DashboardSnapshot {
  widgets: Widget[];           // 画布上的所有 widget
  groups: WidgetGroup[];       // widget 分组
  floatingModules: FloatingModule[]; // 悬浮模块
  dashboardConfig?: DashboardConfig; // 全局配置
}
```

## Widget

```typescript
interface Widget {
  id: string;          // UUID v4
  type: WidgetType;
  title: string;
  layout: {
    x: number;         // 列起始 (compact 0-36, standard 0-12)
    y: number;         // 行起始 (Infinity = 自动追加到底部)
    w: number;         // 宽度(列数)
    h: number;         // 高度(行数)
    minW?: number;
    minH?: number;
  };
  config: WidgetConfig;
}
```

## WidgetConfig（基础配置）

所有 widget 的 config 都继承此基础结构，并扩展各自特有的字段。

```typescript
interface WidgetConfig {
  // 标题配置
  title?: string;
  showTitle?: boolean;        // 默认: true
  titleColor?: string;        // 默认: '#222222'（必须有）
  contentPadding?: number;     // 默认: 12

  // 背景配置
  backgroundType?: 'color' | 'image' | 'gradient';
  backgroundColor?: string;    // 默认: '#FFFFFF'（必须有）
  backgroundImage?: string;
  backgroundGradient?: string;
  backgroundSize?: string;   // 默认: 'cover'
  backgroundRepeat?: string;   // 默认: 'no-repeat'
  backgroundPosition?: string; // 默认: 'center'

  // 数据配置
  refreshInterval?: number;   // 刷新间隔（秒），默认: 60
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST';
  apiQuery?: Record<string, any>;
  apiDataField?: string;
  apiListField?: string;
  paginationMode?: 'none' | 'pagination';
  paginationConfig?: {
    page?: number;
    pageSize?: number;
    pageParam?: string;    // 默认: 'page'
    pageSizeParam?: string; // 默认: 'pageSize'
    totalField?: string;  // 默认: 'total'
    currentField?: string; // 默认: 'current'
    showTotal?: boolean;
  };

  // 扩展字段
  [key: string]: any;
}
```

## Grid 规格说明

Portal Engine 支持两种 grid 密度：

| 规格 | 列数 | cellHeight | 适用场景 |
|---|---|---|---|
| `compact`（默认） | 36 列 | 30px | 编辑器拖拽（推荐） |
| `standard` | 12 列 | 120px | 预览/发布 |
| `spacious` | 8 列 | 150px | 大屏展示 |

**重要**: 布局值在不同密度间换算：
- `w_standard = round(w_compact × 12 / 36) = round(w_compact / 3)`
- `h_standard = h_compact × cellHeight_ratio`
- `y = Infinity` 表示自动追加到底部（推荐用于大多数场景）

**生成建议**: 使用 `compact` grid 的 w/h 值，y 设为 `Infinity`，让组件自动纵向排列，避免手动计算溢出。

---

## 各 Widget 完整默认配置

以下配置来自 `useStore.ts` 的 `getDefaultConfig` 函数，生成 JSON 时应以此为准。

### clock

```typescript
{
  title: 'Clock',
  showTitle: true,
  refreshInterval: 0,         // 时钟通常不需要刷新
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  contentPadding: 12
}
```

### stats

> ⚠️ ConfigDialog 中"数据与交互"→"数据来源"的选中状态由 `staticData` 字段决定（必须存在），渲染数据使用 `statsItems`。
> `dataSource: 'static'` 搭配 `staticData` 可使 ConfigDialog 正确选中"静态数据"。

```typescript
{
  title: 'Statistics',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 12,
  refreshInterval: 60,
  // ✅ 数据与交互 tab 选中"静态数据"的依据（ConfigDialog 据此判断）
  dataSource: 'static',
  staticData: [
    { key: 'revenue', label: '总收入', value: '¥1,234,567', trend: 'up', color: '#1890ff' },
    { key: 'orders', label: '订单数', value: '8,888', trend: 'up', color: '#36cfc9' },
    { key: 'users', label: '新增用户', value: '1,234', trend: 'down', color: '#f59e0b' }
  ],
  // ✅ 渲染使用的字段
  statsItems: [
    { key: 'revenue', label: '总收入', value: '¥1,234,567', trend: 'up', color: '#1890ff' },
    { key: 'orders', label: '订单数', value: '8,888', trend: 'up', color: '#36cfc9' },
    { key: 'users', label: '新增用户', value: '1,234', trend: 'down', color: '#f59e0b' }
  ]
}
```

### indicatorCard

```typescript
{
  title: '指标卡',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  contentPadding: 12,
  refreshInterval: 60,
  dataSource: 'static',
  staticValue: '0',          // 静态展示值
  staticDescription: '描述文字',
  valueField: 'value',
  descriptionField: 'description',
  indicatorValueFontSize: 38,
  indicatorDescriptionFontSize: 18,
  indicatorValueColor: '#1890ff',
  indicatorDescriptionColor: '#95de64',
  // 可选: chartType: 'gauge', indicatorType: 'currency'
}
```

### chart

```typescript
{
  title: '基础折线图',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  contentPadding: 12,
  refreshInterval: 60,
  chartPreset: 'basic-line',    // 图表预设类型
  chartType: 'basic-line',       // 图表类型
  dataSource: 'static',          // 数据来源
  staticData: [                 // 静态示例数据
    { name: '周一', value: 120 },
    { name: '周二', value: 168 },
    { name: '周三', value: 142 },
    { name: '周四', value: 186 },
    { name: '周五', value: 210 }
  ],
  chartTitle: '',
  chartSubTitle: '',
  gridTop: 60,
  gridBottom: 60,
  gridLeft: '10%',
  gridRight: '10%',
  categoryField: 'name',
  valueField: 'value',
  seriesField: undefined,
  smooth: true,
  showLegend: false,
  showTooltip: true,
  showLabel: false,
  showArea: false,
  areaOpacity: 20,
  lineWidth: 3,
  symbolSize: 10,
  showSplitLine: true,
  showAxisLabel: true,
  colors: ['#1677ff', '#36cfc9', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e']
}
```

### carousel

```typescript
{
  title: '轮播图',
  showTitle: false,
  titleColor: '#222222',
  backgroundColor: '#1677ff',
  contentPadding: 0,
  refreshInterval: 60,
  dataSourceType: 'static',
  autoplay: {
    enabled: true,
    delay: 5000,
    pauseOnMouseEnter: true,
    disableOnInteraction: false
  },
  pagination: { enabled: true, type: 'bullets', clickable: true },
  navigation: { enabled: true },
  slidesPerView: 1,
  slidesPerGroup: 1,
  spaceBetween: 16,
  loop: true,
  effect: 'slide',
  textAlign: 'left',
  overlayStyle: 'gradient',
  overlayColor: 'rgba(0, 0, 0, 0.45)',
  buttonType: 'primary',
  slides: [
    {
      id: 'slide-1',
      title: '标题1',
      description: '描述文字1',
      imageUrl: '/assets/placeholder.jpg',  // 内网图片路径
      buttonText: '立即查看',
      buttonLink: '#'
    },
    {
      id: 'slide-2',
      title: '标题2',
      description: '描述文字2',
      imageUrl: '/assets/placeholder.jpg',
      buttonText: '了解更多',
      buttonLink: '#'
    }
  ]
}
```

### search

> `submitMethod` 决定搜索的提交方式：`'eventRoute'`（事件路由，推荐）或 `'api'`（直接请求接口）。

```typescript
{
  title: '搜索框',
  showTitle: false,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 12,
  refreshInterval: 60,
  submitMethod: 'eventRoute',
  apiMethod: 'GET',
  apiEndpoint: '/api/search',
  apiQuery: {},
  apiHeaders: {},
  apiBody: {}
}
```

### headerBar

> `backgroundColor` 必须搭配 `backgroundType: 'color' | 'gradient' | 'image'` 才有效果。**标题文字颜色**使用 `textColor`（不是 `titleColor`）。

```typescript
{
  title: '导航栏',
  showTitle: false,
  titleColor: '#222222',           // 标题颜色（备用）
  textColor: '#FFFFFF',             // ✅ 标题文字颜色（必填，深色主题用 '#FFFFFF'）
  backgroundColor: '#0a1628',       // 需配合 backgroundType 使用
  backgroundType: 'color',         // 'gradient' | 'color' | 'image'（必填）
  backgroundGradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a6e 100%)',
  contentPadding: 0,
  refreshInterval: 60,
  headerTitle: '导航栏',
  headerFontSize: 24,
  fontFamily: 'YouSheBiaoTiHei',
  showNavMenu: false,
  navDataSource: 'static',
  navItems: [
    { id: 'nav-1', name: '首页', url: '/' },
    { id: 'nav-2', name: '工作台', url: '/dashboard' },
    { id: 'nav-3', name: '设置', url: '/settings' }
  ]
}
```

### typography

> ⚠️ 文字颜色使用 `color` 字段，**不是 `textColor`**。

```typescript
{
  title: '文本组件',
  showTitle: false,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',        // ⚠️ 必填，背景色才能生效
  contentPadding: 12,
  refreshInterval: 60,
  content: '这是一段文本',
  color: '#222222',               // ✅ 文字颜色（深色主题用 '#FFFFFF'）
  textAlign: 'left',              // 'left' | 'center' | 'right'
  fontSize: 16,
  fontWeight: 'normal',           // 'normal' | 'bold'
  linkUrl: '',                    // 点击文本跳转的链接（非必填）
  linkTarget: '_self'             // '_self' | '_blank'
}
```

### richText

> `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。
> ⚠️ 内容区文字颜色**必须在 `html` 的 style 里写死**才能生效，深色主题用白色文字，浅色主题用深色文字。

```typescript
{
  title: '富文本',
  showTitle: false,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',        // ⚠️ 必填，背景色才能生效
  contentPadding: 12,
  refreshInterval: 60,
  html: '<div style="color:#222222;line-height:1.8"><h2 style="color:#222222">标题</h2><p>正文内容...</p></div>',  // ✅ 深色主题换 'color:#FFFFFF'，浅色主题换 'color:#222222'
  placeholder: '请输入富文本内容',
  minHeight: 220,
  allowImageUpload: false
}
```

### myDocuments

> ⚠️ `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。

```typescript
{
  title: '我的文档',
  showTitle: false,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 0,
  refreshInterval: 60,
  btnColor: '#1677ff',
  btnTextColor: '#ffffff'
}
```

### microApp

> ⚠️ `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。

```typescript
{
  title: '微应用',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 12,
  refreshInterval: 60,
  systemId: '',       // 微应用系统ID（必须填写）
  moduleId: '',        // 模块ID（必须填写）
  sync: false,
  alive: true
}
```

### pageNavigator

> ⚠️ `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。
> `displayMode` 可选 `'text'`（文字）或 `'icon'`（图标）。

```typescript
{
  title: '页面切换',
  showTitle: false,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 12,
  refreshInterval: 60,
  displayMode: 'text',
  itemColor: '#222222',
  items: [
    { name: '页面1', path: '' },
    { name: '页面2', path: '' },
    { name: '页面3', path: '' }
  ]
}
```

### iconNav

> **重要**: `iconNav` 是**单图标** widget，每个 widget 只能配置一个图标。如需多图标导航，请使用 `navGroup` 组件。

```typescript
{
  title: '图标导航',
  showTitle: false,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  contentPadding: 16,
  refreshInterval: 60,
  icon: 'AppstoreOutlined',  // Antd 图标名，或 iconfont 名如 'icon-line_xia'
  url: '/dashboard',          // 点击后跳转的链接
  openInNew: false,           // 是否新标签页打开
  iconSize: 48,               // 图标大小（px）
  iconColor: '#1890ff'        // 图标颜色
}
```

**关于 iconNav 的多图标需求**:
- 方案 A: 使用 `navGroup` 组件（推荐，`staticItems` 数组支持多个导航项）
- 方案 B: 添加多个 `iconNav` widget 并排放置

### navGroup

> `navGroup` 是**多图标导航**组件，使用 `staticItems` 数组配置多个导航项。每个导航项使用 **iconfont 图标**（以 `icon-` 开头）。
> ⚠️ `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。

```typescript
{
  title: '导航组',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: 'rgba(255,255,255,0.06)',
  backgroundType: 'color',        // ⚠️ 必填，背景色才能生效
  contentPadding: 12,
  refreshInterval: 60,
  layout: 'grid',     // 布局方式: 'flex' | 'grid' | 'list' | 'text' | 'tag'
  columns: 4,         // 列数（grid 布局时生效）
  showLabel: true,    // 是否显示文字标签
  iconSize: 48,       // 图标大小
  itemGap: 12,        // 导航项间距
  staticItems: [
    {
      id: 'item-1',
      name: '数据看板',
      url: '/dashboard',
      icon: 'icon-line_xia',    // iconfont 图标名（必须以 'icon-' 开头）
      iconBgColor: '#e6f4ff',   // 图标背景色
      iconColor: '#1677ff',      // 图标颜色
      textColor: '#222222',      // 文字颜色
      description: '查看业务数据'
    },
    {
      id: 'item-2',
      name: '消息中心',
      url: '/notice',
      icon: 'icon-fill_shaixuan',
      iconBgColor: '#fff7e6',
      iconColor: '#fa8c16',
      textColor: '#222222'
    },
    {
      id: 'item-3',
      name: '快捷链接',
      url: '/link',
      icon: 'icon-line_shezhi',
      iconBgColor: '#f9f0ff',
      iconColor: '#722ed1',
      textColor: '#222222'
    }
  ]
}
```

### queryFilter

> ⚠️ `layoutCols` 是**控件级别**字段（每个字段在几列中展示），保存时会被从字段中剥离。应放在**顶层**而非每个 field 内部。
> `queryFields` 中每个字段的 `type` 可选：`'input' | 'checkboxGroup' | 'cascader' | 'datePicker' | 'inputNumber' | 'radioGroup' | 'select'`。
> `checkboxGroup`、`radioGroup`、`select` 类型的字段需要配置 `dataSourceType: 'manual'` + `manualOptions`（手动选项）或 `dataSourceType: 'request'` + `requestConfig`（接口获取）。
> `cascader` 类型支持 `dataMode: 'json'` + `jsonData`（内联 JSON）或 `dataMode: 'request'` + `requestConfig`（接口获取）。

```typescript
{
  title: '查询筛选',
  showTitle: false,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 12,
  refreshInterval: 60,
  formLayout: 'vertical',
  labelVerticalAlign: 'top',
  labelTextAlign: 'left',
  labelWidth: 96,
  layoutCols: 4,                     // ⚠️ 控件级别放在顶层，不要放在字段里
  submitButtonText: '查询',
  resetButtonText: '重置',
  showResetButton: true,
  buttonAlign: 'right',
  fieldSpacing: 16,
  submitMethod: 'eventRoute',
  apiMethod: 'GET',
  queryFields: [
    {
      id: 'query-field-keyword',
      type: 'input',
      label: '关键字',
      field: 'keyword',
      placeholder: '请输入关键字'
    },
    {
      id: 'query-field-status',
      type: 'select',
      label: '状态',
      field: 'status',
      placeholder: '请选择状态',
      dataSourceType: 'manual',
      manualOptions: [
        { label: '全部', value: '' },
        { label: '进行中', value: 'running' },
        { label: '已完成', value: 'done' }
      ]
    },
    {
      id: 'query-field-date',
      type: 'datePicker',
      label: '日期',
      field: 'date',
      pickerType: 'date',
      disablePastDates: false
    },
    {
      id: 'query-field-number',
      type: 'inputNumber',
      label: '数值',
      field: 'number',
      placeholder: '请输入数值',
      min: 0,
      max: 1000,
      precision: 0
    },
    {
      id: 'query-field-gender',
      type: 'radioGroup',
      label: '性别',
      field: 'gender',
      direction: 'horizontal',
      dataSourceType: 'manual',
      manualOptions: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' }
      ]
    },
    {
      id: 'query-field-checkbox',
      type: 'checkboxGroup',
      label: '标签',
      field: 'tags',
      direction: 'horizontal',
      dataSourceType: 'manual',
      manualOptions: [
        { label: '紧急', value: 'urgent' },
        { label: '重要', value: 'important' },
        { label: '已完成', value: 'done' }
      ]
    }
  ]
}
```

### dataTable

> ⚠️ ConfigDialog 中"数据与交互"→"数据来源"字段的选中状态由 `staticData` 是否存在决定：
> - `staticData` 有值 → 选中"静态数据"
> - 无 `staticData` 且无 `apiEndpoint` → 选中"自定义接口"（默认值）
> `dataSource` 字段不在此处使用，应为 `staticData` 或 `apiEndpoint` 二选一。

```typescript
{
  title: '数据列表',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 12,
  refreshInterval: 60,
  columns: [
    { title: '序号', dataIndex: 'id', width: 60, fixed: 'left' },
    { title: '标题', dataIndex: 'title', width: 200, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 100 },
    { title: '创建时间', dataIndex: 'createTime', width: 180 }
  ],
  // ✅ 静态数据使用 staticData 字段（ConfigDialog 据此自动选中"静态数据"）
  staticData: [
    { id: 1, title: '示例数据1', status: '进行中', createTime: '2026-04-01' },
    { id: 2, title: '示例数据2', status: '已完成', createTime: '2026-04-02' }
  ],
  // ✅ 接口模式使用 apiEndpoint（ConfigDialog 据此自动选中"自定义接口"）
  // apiEndpoint: '/api/list',
  paginationMode: 'pagination',
  paginationConfig: {
    page: 1,
    pageSize: 10,
    pageParam: 'page',
    pageSizeParam: 'pageSize',
    totalField: 'total',
    currentField: 'current',
    showTotal: true
  },
  apiMethod: 'GET',
  apiDataField: 'data',
  apiListField: 'list'
}
```

### topList

> ⚠️ `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。`dataSource` 是字符串 `'static' | 'api'`，**不是数组**。

```typescript
{
  title: '排行榜',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',         // ⚠️ 必填，背景色才能生效
  contentPadding: 12,
  refreshInterval: 60,
  rankingField: 'rank',
  labelField: 'name',
  valueField: 'value',
  showRank: true,
  showTrend: false,
  maxItems: 10,
  dataSource: 'static',           // ✅ 'static' | 'api'（字符串）
  apiEndpoint: '/api/topList',    // api 模式时填写
  staticData: [                   // ✅ 静态数据放在这里
    { name: '华东大区', value: 856000, rank: 1, trend: 'up' },
    { name: '华南大区', value: 723000, rank: 2, trend: 'up' },
    { name: '华北大区', value: 598000, rank: 3, trend: 'down' },
    { name: '华中大区', value: 456000, rank: 4, trend: 'up' },
    { name: '西南大区', value: 389000, rank: 5, trend: 'down' }
  ]
}
```

### news

> ⚠️ `dataSource` 是字符串 `'static' | 'api'`，**不是数组**。数据数组使用 `staticData` 字段。
> `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。

```typescript
{
  title: '新闻动态',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: 'rgba(255,255,255,0.06)',
  backgroundType: 'color',        // ⚠️ 必填，背景色才能生效
  contentPadding: 16,
  refreshInterval: 60,
  maxItems: 8,
  showDate: true,
  showSource: true,
  dataSource: 'static',           // ✅ 'static' | 'api'（字符串，不是数组）
  apiEndpoint: '/api/news',       // api 模式时填写
  staticData: [                   // ✅ 静态数据放在这里
    { title: '新闻标题1', date: '2026-04-08', source: '来源部门', url: '#' },
    { title: '新闻标题2', date: '2026-04-07', source: '来源部门', url: '#' }
  ]
}
```

### cardGrid

> ⚠️ `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。

```typescript
{
  title: '卡片网格',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',        // ⚠️ 必填，背景色才能生效
  contentPadding: 12,
  refreshInterval: 60
}
```

### link

> ⚠️ `backgroundColor` 必须搭配 `backgroundType: 'color'` 才有效果。
> `links` 数组中每个链接的 `systemId` 必须填写，否则 ConfigDialog 验证不通过。

```typescript
{
  title: '快捷链接',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 12,
  refreshInterval: 60,
  layout: 'button',
  buttonShape: 'circle',
  buttonSize: 'large',
  links: [
    {
      title: '数据看板',
      url: '/dashboard',
      systemId: '',                    // ⚠️ 必填，请选择所属系统
      icon: 'DashboardOutlined',      // Antd 图标名
      iconBgColor: '#1677ff',
      iconColor: '#ffffff',
      description: '查看业务数据'
    },
    {
      title: '消息中心',
      url: '/notice',
      systemId: '',
      icon: 'BellOutlined',
      iconBgColor: '#fa8c16',
      iconColor: '#ffffff',
      description: '查看最新消息'
    }
  ]
}
```

### customForm

> `fields` 数组中的每个字段 `type` 可选：`'text' | 'textarea' | 'number' | 'select' | 'radio' | 'date' | 'checkbox'`。
> `select` 和 `radio` 类型的字段需要 `options` 数组，格式为 `{ label: string; value: string | number }[]`。

```typescript
{
  title: '自定义表单',
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 12,
  refreshInterval: 60,
  layout: 'vertical',
  labelWidth: 96,
  fieldSpacing: 16,
  showResetButton: true,
  resetButtonText: '重置',
  buttonAlign: 'left',
  submitButtonText: '提交',
  submitButtonSize: 'middle',
  submitMethod: 'eventRoute',
  fields: [
    {
      id: 'field-1',
      type: 'text',
      label: '姓名',
      name: 'name',
      required: true,
      defaultValue: ''
    },
    {
      id: 'field-2',
      type: 'select',
      label: '部门',
      name: 'dept',
      required: false,
      options: [
        { label: '技术部', value: 'tech' },
        { label: '运营部', value: 'ops' },
        { label: '市场部', value: 'marketing' }
      ],
      defaultValue: undefined
    },
    {
      id: 'field-3',
      type: 'radio',
      label: '性别',
      name: 'gender',
      required: false,
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' }
      ],
      defaultValue: undefined
    },
    {
      id: 'field-4',
      type: 'inputNumber',
      label: '年龄',
      name: 'age',
      required: false
    },
    {
      id: 'field-5',
      type: 'date',
      label: '入职日期',
      name: 'joinDate',
      required: false
    },
    {
      id: 'field-6',
      type: 'textarea',
      label: '备注',
      name: 'remark',
      required: false
    },
    {
      id: 'field-7',
      type: 'checkbox',
      label: '我已阅读并同意相关协议',
      name: 'agree',
      required: true
    }
  ]
}
```

> `customForm` 提交方式 `submitMethod`： `'eventRoute'`（事件路由，推荐）或 `'api'`（直接请求后端）。

---

## 颜色默认值速查

| 字段 | 默认值 | 用途 |
|---|---|---|
| `titleColor` | `#222222` | 标题文字 |
| `backgroundColor` | `#FFFFFF` | 组件背景 |
| `backgroundColor`（group） | `rgba(0,0,0,0.02)` | 分组背景 |
| `textColor` | `#222222` | 正文文字 |
| `primaryColor` | `#1677ff` | 主色调 |
| `indicatorValueColor` | `#1890ff` | 指标卡数值色 |
| `indicatorDescriptionColor` | `#95de64` | 指标卡描述色 |
| `iconColor` | `#1890ff` | 图标默认色 |
| `chartColors[0]` | `#1677ff` | 图表色 1 |
| `chartColors[1]` | `#36cfc9` | 图表色 2 |
| `chartColors[2]` | `#f59e0b` | 图表色 3 |
| `chartColors[3]` | `#ef4444` | 图表色 4 |
| `chartColors[4]` | `#8b5cf6` | 图表色 5 |
| `chartColors[5]` | `#22c55e` | 图表色 6 |

---

## 发布 API 格式

```
POST /v1/dashboard/publish
Body: {
  "title": "我的看板",
  "dashboardConfig": JSON.stringify(snapshot),  // ← JSON 字符串化
  "status": 1,
  "cover_url": ""
}
```
