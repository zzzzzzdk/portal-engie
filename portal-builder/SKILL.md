---
name: portal-builder
description: >
  根据自然语言页面需求生成可直接导入 Portal Engine 编辑器的 DashboardSnapshot JSON。
  当用户希望创建门户首页、数据看板、管理页面、Banner/新闻/快捷入口页面或其他
  Portal Engine 页面时使用。该 skill 负责将用户意图映射到现有组件，应用紧凑
  36 列布局规则，并输出可导入 JSON 与简短的识别/布局说明。
---

# Portal Builder

按下面流程生成可直接导入 Portal Engine 编辑器的 `DashboardSnapshot` JSON。

## 先读参考文件

开始前必须先读：

- `references/widget-map.md`
- `references/layout-rules.md`
- `references/json-schema.md`
- `references/visual-rules.md`
- `references/page-recipes.md`
- `references/design-tokens.md`
- 涉及图标时再读 `references/icon-map.md`

这些文件分别负责：

- 关键词到组件的映射
- 生成时的布局规则
- 运行时字段和示例结构
- 图标语义到真实 icon 名称的映射
- 视觉层级、页面配方和主题 token

## 输出目标

输出必须是当前项目可导入的 `DashboardSnapshot`：

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
- 组件类型存在明显歧义
- 页面意图明显不完整

追问时优先给 2-3 个方向：

- 数据看板：指标卡 + 图表 + 排名/表格
- 企业门户：首页 Banner + 快捷入口 + 新闻/公告
- 管理后台：筛选器 + 表格 + 分页

### 2. 识别页面意图和操作类型

先识别页面属于哪一类：

- 数据看板
- 企业门户 / 展示宣传页
- 管理后台
- 混合页面

再从用户描述中提取：

- 页面主题
- 核心组件
- 数据来源偏好
- 颜色/主题要求
- 是否有明确位置要求

同时识别当前请求属于哪种操作：

- 编辑当前页面内容
- 创建新页面
- 清空当前页面

状态规则：

- 明确出现“新建页面 / 创建新页面 / 重新创建一个页面 / 从空白开始做一个页面 / new page / create a new page”时，按“创建新页面”处理
- “创建新页面”不是在当前快照底部继续追加组件，而是先清空旧页面，再生成完整的 `DashboardSnapshot`
- 新页面生成后，布局从空白页开始计算，第一个组件从顶部开始排布，不继承旧组件坐标

### 3. 标题规则

标题是硬约束，必须严格遵守：

- 创建模式：
- 如果用户明确指定标题，必须直接使用该标题
- 只有用户没有明确给标题时，才允许推断标题

- 编辑模式：
- 如果 `currentSnapshot.dashboardConfig.title` 有真实值，默认必须保留原标题
- 只有用户明确要求“改标题 / 重命名 / 页面名改成 xxx / 标题改为 xxx”时，才允许修改标题
- 用户只是要求改主题、改布局、增删组件、调整数据、优化样式时，不得顺带改标题

- 一致性：
- `summary.title`
- `snapshot.dashboardConfig.title`
- `headerBar.title`
- `headerBar.config.headerTitle`

以上标题字段必须保持一致。

- 可视为“没有真实标题”的情况包括：
- 空字符串
- 全空白
- `undefined`
- `null`
- `未命名`
- `未定义`

只有在当前页面标题缺失或明显是占位值时，才可以自动生成新标题。

### 4. 做组件映射

按 `references/widget-map.md` 选组件。

关键映射规则：

- 多图标快捷入口、门户入口宫格、多入口导航 -> `navGroup`
- 单个图标按钮 -> `iconNav`
- Banner / 轮播 -> `carousel`
- 筛选 / 过滤 / 查询条件 -> `queryFilter`
- 表格 / 明细列表 -> `dataTable`
- 排名 / Top N -> `topList`
- 新闻 / 动态 / 公告列表 -> `news`
- 富文本公告 / 说明 -> `richText`

### 5. 选择安全布局

生成时统一按 **compact 36 列** 输出。

硬约束：

- 所有组件必须满足 `x + w <= 36`
- 不要把 12 列示意图直接翻译成最终 JSON
- `carousel`、`queryFilter`、`pageNavigator` 默认按全宽组件处理

推荐尺寸：

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

### 6. 写运行时字段

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

图标规则：

- `staticItems[].icon` 只用 iconfont 白名单名，且必须带 `icon-` 前缀
- 不要输出 `line_xia`、`fill_shouye` 这种未加前缀的名称
- 不要臆造不存在的 icon 名称；拿不准时去读 `references/icon-map.md`
- 仍然拿不准时默认用 `icon-line_duixiang`

多图标入口不要误生成为多个 `iconNav`，也不要把门户宫格入口落成单个 `iconNav`。

#### `iconNav`

图标规则：

- `config.icon` 优先使用 Ant Design Outlined 图标名
- 只从 `references/icon-map.md` 给出的常用白名单里选
- 不要给 `iconNav` 写 iconfont 名
- 仍然拿不准时默认用 `AppstoreOutlined`

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

- 用户明确要求“卡片网格 / 图文卡片”时才使用
- 不要把它当作门户页的默认主内容模块

### 7. 主题配色

如果用户没有明确指定，按场景选主题：

- 数据看板 -> 深色科技
- 企业门户 -> 蓝色商务
- 管理后台 -> 明亮轻量

页面背景写入 `dashboardConfig`，组件内统一写基础配色。

关键规则：

- 只要写了 `backgroundColor`，就同步写 `backgroundType: 'color'`
- `richText` 正文颜色要直接写在 `html` 的内联样式里

### 8. 输出结果

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

### 图标

- 涉及图标时必须读 `references/icon-map.md`
- `navGroup.staticItems[].icon` 只允许输出带 `icon-` 前缀的 iconfont 白名单名
- `iconNav.config.icon` 只允许输出白名单中的 Ant Design 图标名
- 不要输出不存在的名字，如 `UserFill`、`SettingLine`、`icon-home`
- 语义不明确时优先使用稳定兜底：`navGroup -> icon-line_duixiang`，`iconNav -> AppstoreOutlined`

### 标题

- 编辑现有页面时，若当前页面已有真实标题，不得无故改名
- 只有用户明确要求改名时，才允许修改标题
- 改标题时必须同步更新 `summary.title`、`snapshot.dashboardConfig.title` 和 `headerBar` 标题

### 质量

- 不要生成只有一个 `typography` 的敷衍页面
- 不要输出过时字段名
- 不要把占位组件 `cardGrid` 作为默认主内容
- 不要混用互相冲突的主题配色
- 明确是“创建新页面”时，不要沿用旧页面组件和旧布局继续追加

### 页面状态

- 编辑当前页时，默认保留当前页面结构，并在其基础上增删改
- 但如果用户明确要求“创建新页面”，则先丢弃旧 `widgets/groups/floatingModules/dashboardConfig`，再从空白快照生成
- “创建新页面”场景下，输出应表现为一个全新的完整页面，而不是“在当前页面最下方新增几个组件”
- 若当前页面标题已有真实值，则编辑时保持不变；若标题只是占位值，则可按新需求生成标题

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

### 用户只说“加一个折线图”

识别：

- `chart`
- `chartType: 'basic-line'`

但不要直接生成最终页面，必须追问：

- 数据来源是接口还是静态数据
- 是否需要配套指标卡/表格/排名
- 图表主题是什么

### 用户只说“做一个门户页”

追问更接近哪类：

- 企业官网首页
- 内部门户工作台
- 宣传展示页

### 用户说“新建一个页面，做成 xx”

处理规则：

- 先清空之前的页面配置
- 再按新需求生成完整页面
- 不要保留旧页面组件
- 不要沿用旧页面坐标继续往下排

### 用户编辑现有页面，但当前标题已经是正式名称

处理规则：

- 保留原有页面标题
- 除非用户明确要求“改名 / 重命名 / 标题改成 xxx”，否则不要修改标题

### 用户要求很多不常见组件

优先使用当前项目已有组件做最近似映射，并在识别说明里标注 `[推断]`。

## 参考文件

- `references/widget-map.md`
- `references/layout-rules.md`
- `references/json-schema.md`
- `references/icon-map.md`
