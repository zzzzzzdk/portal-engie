# 发布应用移动端运行方案(废弃，已撤回)

## 当前实现

本项目已经提供移动端预览运行时：

- 桌面端预览：`#/preview/:id`
- 移动端预览：`#/mobile-preview/:id`
- 草稿版本：`#/mobile-preview/:id?version=draft`
- 移动端强制启用微应用 live 模式：`#/mobile-preview/:id?microAppMode=live`

移动端预览复用发布应用的 `dashboardConfig` 数据结构和现有组件渲染器，但不再使用桌面端 GridStack 绝对布局，而是按桌面布局坐标从上到下、从左到右转换为单列卡片列表。

默认策略：

- 系统组件、表单组件、图表、列表等继续使用现有 Web 组件。
- 微应用默认使用降级模式，避免 Wujie 在移动 WebView 中的兼容性风险。
- 悬浮模块在移动端转换为页面中的“悬浮模块”卡片区，不再使用桌面端固定定位和拖拽交互。

## 推荐移动 App 宿主方案

推荐使用 Capacitor 建一个统一移动端宿主 App，而不是每个发布应用生成一个独立 App。

宿主 App 的职责：

- 登录和保存 token。
- 展示发布应用列表。
- 根据应用 ID 打开 `#/mobile-preview/:id`。
- 配置生产环境 `window.__APP_CONFIG__.API_BASE_URL`。
- 可选：下载离线交互包并在本地 WebView 中展示。

发布应用仍由 Portal Engine 后端管理；移动 App 只是统一运行容器。

## 服务依赖

移动端能够正常展示的前提：

- `/v1/dashboard/publish` 在手机网络或 App WebView 中可访问。
- 组件内配置的接口 endpoint 可访问，建议统一走后端代理或 API 网关。
- MinIO/文件预览/OnlyOffice/图片资源必须是 HTTPS 且证书可信。
- 微应用 URL 必须允许移动端访问，并处理好 CORS、CSP、cookie、token 透传。

手机不能访问开发机 `localhost`，也不能依赖 Vite dev server 的 proxy。生产环境必须使用真实后端地址。

## 微应用策略

移动端默认 `microAppMode=degrade`：

- 普通微应用组件渲染为 iframe 降级卡。
- 悬浮微应用模块渲染为移动卡片中的 iframe。
- 若需要完整 Wujie 微前端能力，可通过 `microAppMode=live` 开启，但必须逐个验证 iOS WKWebView、Android WebView、跨域、沙箱和 token 通信。

建议将移动端微应用兼容性作为单独验收项，不与基础工作台移动展示绑定。

## 后续开发清单

1. 新增 Capacitor 工程，宿主加载 Web 构建产物。
2. 在宿主中配置生产 API 地址和登录态同步。
3. 给发布列表增加二维码或移动端打开入口。
4. 增加移动端组件兼容性测试清单。
5. 对高风险组件单独适配：文档预览、OnlyOffice、文件上传、复杂表格、微应用。
6. 如需离线能力，复用 `export-runtime`，但明确微应用和实时接口无法保证离线完整运行。
