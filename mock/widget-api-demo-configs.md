# 组件接口演示 Mock 配置

以下配置可直接用于当前项目组件配置面板，配合新增的接口调试按钮一起验证。

## 表格组件

支持 `GET + query + 服务端分页`，返回结构为 `data.list`。

```json
{
  "title": "任务列表演示",
  "apiEndpoint": "/api/demo/table",
  "apiMethod": "GET",
  "apiQuery": {
    "keyword": "巡检",
    "status": "运行中",
    "category": "巡检"
  },
  "paginationMode": "pagination",
  "paginationConfig": {
    "page": 1,
    "pageSize": 5,
    "pageParam": "page",
    "pageSizeParam": "page_size",
    "totalField": "data.total",
    "currentField": "data.page",
    "pageSizeField": "data.page_size",
    "showTotal": true
  },
  "rowKey": "id",
  "columns": [
    { "key": "name", "title": "任务名称", "dataIndex": "name", "ellipsis": true },
    { "key": "owner", "title": "所属部门", "dataIndex": "owner" },
    {
      "key": "status",
      "title": "状态",
      "dataIndex": "status",
      "type": "status",
      "statusConfig": {
        "success": ["运行中", "已完成"],
        "warning": ["待处理"],
        "error": ["离线"]
      }
    },
    { "key": "score", "title": "评分", "dataIndex": "score", "type": "number" },
    { "key": "updateTime", "title": "更新时间", "dataIndex": "updateTime" }
  ]
}
```

## 新闻动态组件

支持 `POST + body + 服务端分页`，返回结构为 `data.records`。

```json
{
  "title": "新闻动态演示",
  "apiEndpoint": "/api/demo/news",
  "apiMethod": "POST",
  "apiBody": {
    "keyword": "演示",
    "category": "技术"
  },
  "apiListField": "data.records",
  "paginationMode": "pagination",
  "paginationConfig": {
    "page": 1,
    "pageSize": 4,
    "pageParam": "page",
    "pageSizeParam": "page_size",
    "totalField": "data.total",
    "currentField": "data.page",
    "pageSizeField": "data.page_size",
    "showTotal": true
  },
  "titleField": "title",
  "descriptionField": "description",
  "urlField": "url",
  "maxItems": 8
}
```

## 排行榜组件

支持 `GET + query + 服务端分页`，返回结构为 `data.rows`。

```json
{
  "title": "告警排行演示",
  "apiEndpoint": "/api/demo/top-list",
  "apiMethod": "GET",
  "apiQuery": {
    "category": "告警"
  },
  "apiListField": "data.rows",
  "paginationMode": "pagination",
  "paginationConfig": {
    "page": 1,
    "pageSize": 5,
    "pageParam": "page",
    "pageSizeParam": "page_size",
    "totalField": "data.total",
    "currentField": "data.current",
    "pageSizeField": "data.pageSize",
    "showTotal": true
  },
  "nameField": "name",
  "valueField": "value",
  "changeField": "change",
  "unitField": "unit",
  "valueLabel": "次数",
  "changeLabel": "环比"
}
```

## 轮播图组件

支持 `POST + body + 嵌套列表字段`，返回结构为 `data.carousel.items`。

```json
{
  "title": "轮播图演示",
  "dataSourceType": "api",
  "refreshInterval": 60,
  "apiConfig": {
    "endpoint": "/api/demo/carousel",
    "method": "POST",
    "body": {
      "scene": "portal"
    },
    "listField": "data.carousel.items",
    "mapping": {
      "idField": "id",
      "titleField": "title",
      "subtitleField": "subtitle",
      "descriptionField": "description",
      "imageField": "imageUrl",
      "linkField": "link",
      "buttonTextField": "buttonText",
      "badgeField": "badge"
    }
  },
  "pagination": {
    "enabled": true,
    "type": "bullets",
    "clickable": true
  },
  "navigation": {
    "enabled": true
  },
  "autoplay": {
    "enabled": true,
    "delay": 5000
  }
}
```

## 导航分组组件

支持 `GET + query + 跨根节点嵌套列表字段`，返回结构为 `payload.groups.list`。

```json
{
  "title": "导航分组演示",
  "layout": "grid",
  "columns": 4,
  "showLabel": true,
  "apiEndpoint": "/api/demo/nav-group",
  "apiMethod": "GET",
  "apiQuery": {
    "groupType": "portal"
  },
  "apiListField": "payload.groups.list"
}
```

## 统计卡片组件

支持 `GET + query + 嵌套对象字段`，返回结构为 `payload.metrics`。

```json
{
  "title": "统计卡片演示",
  "apiEndpoint": "/api/demo/stats",
  "apiMethod": "GET",
  "apiQuery": {
    "scope": "today"
  },
  "apiDataField": "payload.metrics",
  "layout": "horizontal",
  "statsItems": [
    { "key": "activeUsers", "label": "活跃用户", "precision": 0, "trend": "up", "suffix": "人" },
    { "key": "idleRate", "label": "空闲率", "precision": 1, "trend": "down", "suffix": "%" },
    { "key": "alertCount", "label": "告警数量", "precision": 0, "trend": "up", "suffix": "条" },
    { "key": "successRate", "label": "处置成功率", "precision": 1, "trend": "up", "suffix": "%" }
  ]
}
```

## 图表组件

支持 `POST + body + 嵌套对象字段`，返回结构为 `result.chart`。

```json
{
  "title": "图表演示",
  "apiEndpoint": "/api/demo/chart",
  "apiMethod": "POST",
  "apiBody": {
    "period": "week"
  },
  "apiDataField": "result.chart",
  "chartType": "line",
  "chartTitle": "近一周任务趋势",
  "xAxisField": "xAxis",
  "yAxisField": "series",
  "smooth": true,
  "showLegend": false
}
```

## 调试建议

- `GET` 示例优先看 `表格 / 排行榜 / 导航分组 / 统计卡片`
- `POST` 示例优先看 `新闻动态 / 轮播图 / 图表`
- 分页模式优先看 `表格 / 新闻动态 / 排行榜`
- 嵌套路径优先看 `轮播图 / 导航分组 / 统计卡片 / 图表`
- 组件配置完成后，可直接使用面板中的“接口调试”按钮验证请求参数、解析结果和原始响应
