# Design Tokens

当用户没有指定主题时，按页面意图选择一个 token 方向。

## business

适合企业门户和官网首页。

```json
{
  "dashboardConfig": {
    "backgroundType": "gradient",
    "backgroundGradient": "linear-gradient(180deg, #F4F7FB 0%, #EEF3F8 48%, #F7F9FC 100%)",
    "themeMode": "light",
    "styleMode": "minimal"
  },
  "surface": "#FFFFFF",
  "titleColor": "#102A4C",
  "bodyColor": "#1B2F46",
  "accent": "#1677FF"
}
```

## tech

适合数据看板、大屏、监控、驾驶舱。

```json
{
  "dashboardConfig": {
    "backgroundType": "gradient",
    "backgroundGradient": "linear-gradient(180deg, #030B14 0%, #071422 40%, #0A1B2F 100%)",
    "themeMode": "dark",
    "styleMode": "minimal"
  },
  "surface": "#070E1A",
  "titleColor": "#00E5FF",
  "bodyColor": "#D9F6FF",
  "accent": "#12B5CB"
}
```

## light-admin

适合管理后台、表格页、审批页。

```json
{
  "dashboardConfig": {
    "backgroundType": "gradient",
    "backgroundGradient": "linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 62%, #F2F6FB 100%)",
    "themeMode": "light",
    "styleMode": "minimal"
  },
  "surface": "#FFFFFF",
  "titleColor": "#1A3653",
  "bodyColor": "#223244",
  "accent": "#1677FF"
}
```

## Token Rules

- 页面背景写入 `dashboardConfig`。
- 组件背景写入各 widget `config.backgroundType/backgroundColor/backgroundGradient`。
- 富文本正文颜色必须写进 `config.html` 的内联 style。
- 深色主题下，图表、指标卡、排行列表不要使用白底卡片。
