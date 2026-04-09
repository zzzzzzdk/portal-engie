# 布局规则详细说明

## Grid 规格

| 参数 | 值 | 说明 |
|---|---|---|
| 列数 | 12 | 12-column responsive grid |
| 行高 | 120px | 每行高度（标准密度） |
| 边距 | 10px | widget 间距 |
| 碰撞策略 | preventCollision: true | 不自动紧凑排列 |
| compactType | null | 不自动上下压缩 |

**坐标系**: 原点 (0,0) 在左上角，x 向右递增，y 向下递增。

## 布局行计算

标准行高 120px + 边距 10px = 每行 130px。

布局中 y=Infinity 表示追加到当前网格末尾（自动计算真实 y 值）。

## 组件优先级规则

当多个组件竞争同一行空间时，按以下优先级排列：

```
导航类(headerBar, iconNav, navGroup) > 指标类(stats, indicatorCard) > 图表类(chart) > 列表类(dataTable, topList, news) > 工具类(search, queryFilter)
```

## 典型布局模式

### 1. 数据监控看板（KPI + 图表 + 明细）

```
+------+----------+
| KPI1 |  KPI2    |  ← stats / indicatorCard (y=0, 各占4列/6列)
+------+----------+
| KPI3 |  KPI4    |  ← stats (y=1)
+------+----------+
|       CHART      |  ← chart (y=2, 跨12列或8+4列)
+------+-----------+
| topList  | dataTable | ← y=3 同行分列
+------------------------
```

**布局策略**:
- 顶部 KPI: 2-4 个 indicatorCard/stats，横向排列
- 中部图表: 1-2 个 chart，根据数据维度选择类型
- 下部明细: topList + dataTable 或 dataTable 单独占 12 列

### 2. 展示宣传页（Banner + 入口 + 动态）

```
+------------------------+
|      CAROUSEL         | ← carousel (y=0, 12列, h=4)
+------------------------+
|  ICON1 | ICON2 | ICON3 | ← iconNav (y=4, 12列或4+4+4)
|  ICON4 | ICON5 | ICON6 |
+------------------------+
| NEWS      | RICH_TEXT  | ← news + richText (y=7, 6+6列)
+------------------------+
```

### 3. 数据管理页（筛选 + 表格）

```
+------------------------+
|     QUERY_FILTER       | ← queryFilter (y=0, 12列)
+------------------------+
|      DATA_TABLE        | ← dataTable (y=1, 12列)
+------------------------+
|    PAGE_NAVIGATOR      | ← pageNavigator (y=2, 12列, 可选)
+------------------------+
```

### 4. 运营大屏（多指标 + 多图表）

```
+--------+------+------+
| KPI1   | KPI2 | KPI3 |  ← stats (y=0, 4+4+4)
+--------+------+------+
| KPI4   | KPI5 | KPI6 |
+--------+------+------+
|   LINE_CHART   | PIE |  ← chart (y=2, 8+4)
+--------+--------+------+
| BAR_CHART  | TOP_LIST |  ← chart + topList (y=3)
+-------------------------+
|       DATA_TABLE        |  ← dataTable (y=4, 12列)
+-------------------------+
```

## 尺寸调整规则

### 基于重要性的尺寸调整

| 重要性 | w 调整 | h 调整 |
|---|---|---|
| 核心（主图表/KPI） | +2 或 12（全宽）| +2 |
| 次要（辅助图表） | 保持默认 | 保持默认 |
| 补充（列表/明细） | 保持默认或-2 | 保持默认 |

### 用户指定尺寸

如果用户在描述中指定了尺寸（如"大图表"、"小卡片"），按以下规则映射：

| 描述 | w | h |
|---|---|---|
| 全宽 / 大 / 大屏 | 12 | 默认+2 |
| 中等 / 标准 | 默认 | 默认 |
| 小 / 紧凑 / 迷你 | 减半 | 减半 |

## 布局冲突处理

当计算出的 `x + w > 12` 时，自动换行：

```python
def layout_widgets(widgets):
    current_x = 0
    current_y = 0

    for w in widgets:
        if current_x + w.default_w > 12:
            current_x = 0
            current_y += w.default_h

        w.layout = { x: current_x, y: current_y, w: w.default_w, h: w.default_h }
        current_x += w.default_w

    return widgets
```

## 位置语义映射

将用户的自然语言位置描述转换为坐标：

| 描述 | x | y | w |
|---|---|---|---|
| 顶部 | 0 | 0 | 满宽(12)或默认 |
| 左侧 | 0 | - | 半宽(6)或默认 |
| 右边/右侧 | 6 | - | 半宽(6)或默认 |
| 底部 | 0 | Infinity | 满宽(12)或默认 |
| 左上 | 0 | 0 | 半宽(6) |
| 右下 | 6 | Infinity | 半宽(6) |
| 中央/中间 | 3 | - | 满宽(12)或默认 |
| 单独一行 | 0 | Infinity | 满宽(12) |

## 响应式注意事项

- `minW` 和 `minH` 确保 widget 不会缩小到无法正常使用
- 图表类 (`chart`) `minW: 4` 确保 ECharts 有足够渲染空间
- 表格类 (`dataTable`) `minW: 6` 确保列不会被压缩
