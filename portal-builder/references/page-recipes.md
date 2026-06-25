# Page Recipes

生成时优先选择下面的页面配方，再根据用户需求增删组件。

## 企业门户首页

组件顺序：

```text
headerBar -> carousel -> navGroup -> news -> richText
```

布局建议：

- `headerBar`: 36 x 2
- `carousel`: 36 x 12
- `navGroup`: 10 x 10，可与 `news`、`richText` 同行
- `news`: 6 x 10
- `richText`: 8 x 6 或 10 x 10

适合：企业官网、门户首页、品牌展示、公告新闻、快捷入口。

## 运营数据看板

组件顺序：

```text
headerBar -> indicatorCard/stats -> chart -> topList -> dataTable
```

布局建议：

- 2-4 个 `indicatorCard` 组成指标区。
- 1-2 个 `chart` 表达趋势或结构。
- `topList` 表达排行。
- `dataTable` 表达明细。

适合：运营看板、业务监控、销售分析、区域态势、数据大屏。

## 管理后台列表页

组件顺序：

```text
queryFilter -> dataTable -> pageNavigator
```

布局建议：

- `queryFilter`: 36 x 5
- `dataTable`: 可全宽或 24-36 列，视页面复杂度决定。
- `pageNavigator`: 36 x 3

适合：用户管理、订单管理、审批列表、资源列表、CRUD 页面。

## 混合门户看板

组件顺序：

```text
headerBar -> stats/indicatorCard -> chart -> navGroup -> news
```

适合：既要门户入口，又要展示关键业务数据的首页。
