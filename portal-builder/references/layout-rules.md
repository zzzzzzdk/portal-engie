# 布局规则详细说明

## 生成基线

Portal Builder 输出给编辑器导入的 JSON，统一以 **`compact` 36 列** 作为生成基线：

| 维度 | 值 | 说明 |
|---|---|---|
| 列数 | 36 | 编辑器默认网格 |
| cellHeight | 30px | 编辑器默认 |
| `x` 范围 | `0-35` | 左到右 |
| `y` | 非负整数或 `Infinity` | `Infinity` 表示追加到末尾 |

### 重要约束

- 生成 JSON 时，**不要输出 `x + w > 36`**。
- 即使编辑器内部某些“新增组件默认尺寸”与 36 列规则不完全一致，**Skill 仍以可安全导入的 36 列快照为准**。
- `carousel`、`queryFilter`、`pageNavigator` 在生成页面时，优先按 **全宽组件** 处理。

## 推荐生成尺寸

以下是 **Skill 生成快照时的推荐尺寸**，用于稳定输出，不等同于“编辑器点击新增组件时的内部默认值”。

| WidgetType | 推荐 `w` | 推荐 `h` | 说明 |
|---|---:|---:|---|
| `headerBar` | 36 | 2 | 顶部整行导航 |
| `carousel` | 36 | 12 | 顶部 Banner |
| `queryFilter` | 36 | 5 | 顶部筛选器 |
| `pageNavigator` | 36 | 3 | 底部分页/切页 |
| `stats` | 10 | 6 | 多指标概览 |
| `indicatorCard` | 8 | 5 | 单指标卡 |
| `chart` | 8 | 9 | 图表主体 |
| `dataTable` | 10 | 8 | 明细表格 |
| `topList` | 5 | 9 | 排名列表 |
| `news` | 6 | 10 | 新闻动态 |
| `navGroup` | 10 | 10 | 多图标导航 |
| `iconNav` | 2 | 3 | 单图标入口 |
| `richText` | 8 | 6 | 公告/说明 |
| `cardGrid` | 8 | 6 | 仅在用户明确要求时使用 |

## 自动布局算法

默认按顺序排布，使用当前行最大高度推进 `y`，避免重叠。

```python
COLS = 36
current_x = 0
current_y = 0
row_max_h = 0

for widget in widgets:
    w = widget.layout.w
    h = widget.layout.h

    if current_x + w > COLS:
        current_x = 0
        current_y += row_max_h
        row_max_h = 0

    widget.layout.x = current_x
    widget.layout.y = current_y

    current_x += w
    row_max_h = max(row_max_h, h)
```

### 换行规则

- 判断条件是 `current_x + w > 36`。
- 新行的 `y` 增量使用上一行的 `row_max_h`，不是当前组件的 `h`。
- 单个全宽组件应独占一行。

## 位置语义映射

用户有明确位置描述时，优先覆盖自动布局：

| 描述 | `x` | `y` | `w` |
|---|---:|---:|---:|
| 顶部 | 0 | 0 | 36 |
| 底部 | 0 | `Infinity` | 36 |
| 左侧 | 0 | 自动 | 18 |
| 右侧 | 18 | 自动 | 18 |
| 左上 | 0 | 0 | 18 |
| 右上 | 18 | 0 | 18 |
| 单独一行 | 0 | `Infinity` | 36 |

## 典型页面模式

### 1. 数据看板

推荐组合：

```text
indicatorCard + indicatorCard + chart + topList/dataTable
```

推荐布局：

- 顶部放 2-4 个 `indicatorCard` / `stats`
- 中部放 1-2 个 `chart`
- 底部放 `topList`、`dataTable`

### 2. 企业门户 / 展示宣传页

推荐组合：

```text
headerBar + carousel + navGroup + news + richText
```

推荐布局：

- 顶部 `headerBar`
- 第二行 `carousel`
- 中部 `navGroup`
- 底部 `news` + `richText`

### 3. 管理后台

推荐组合：

```text
queryFilter + dataTable + pageNavigator
```

推荐布局：

- 顶部 `queryFilter`
- 中部 `dataTable`
- 底部 `pageNavigator`

## 特殊组件说明

### `navGroup`

- 多图标入口优先使用 `navGroup`
- `config.staticItems` 为主字段
- `staticItems[].icon` 优先使用 iconfont 名，必须以 `icon-` 开头
- 涉及具体 icon 名时先查 `references/icon-map.md`

### `iconNav`

- 只适合单个图标入口
- “快捷入口、4-8 个图标、门户入口宫格” 这类描述不要落到 `iconNav`
- `config.icon` 优先使用 `references/icon-map.md` 中的 Ant Design 白名单名

### `cardGrid`

- 当前项目中的 `cardGrid` 仍偏占位实现
- 没有用户明确要求时，不要把它作为门户页主内容模块的默认推荐

## 响应式与兼容性

- `minW`、`minH` 仍应保留，避免组件在编辑器中被压缩到不可用
- 图表建议 `minW >= 4`
- 表格建议 `minW >= 6`
- 生成时优先保证导入可用，再追求视觉丰满度
