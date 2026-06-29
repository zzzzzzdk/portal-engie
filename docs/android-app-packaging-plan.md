# 发布应用打包 Android App 方案

## 目标

在应用列表页的已发布应用上增加“打包 Android App”能力。用户点击后，系统将当前发布应用打包成一个可安装的 Android APK，下载到本地后可安装到手机。

该能力不建议在浏览器前端直接完成。APK 构建依赖 Android SDK、Gradle、签名证书和构建环境，应由后端构建服务或 CI 服务完成。前端只负责提交构建任务、展示进度和下载产物。

## 推荐方案

优先实现“在线壳 APK”。

APK 内置 Portal Engine 移动端运行时，启动后打开指定发布应用的移动预览路由：

```text
#/mobile-preview/:id
```

例如：

```text
#/mobile-preview/pub_2
```

如果需要草稿版或微应用 live 模式，可扩展为：

```text
#/mobile-preview/pub_2?version=draft
#/mobile-preview/pub_2?microAppMode=live
```

默认建议使用 `microAppMode=degrade`，避免 Wujie 微前端在 Android WebView 中出现兼容性问题。

## 用户操作流程

1. 用户进入应用列表页。
2. 已发布应用显示“打包 Android App”按钮。
3. 点击按钮后打开打包配置弹窗。
4. 用户确认 App 名称、包名、版本号、图标和微应用模式。
5. 前端提交构建任务。
6. 后端异步构建 APK。
7. 前端轮询构建状态。
8. 构建完成后显示下载按钮。
9. 用户下载 APK 并安装到 Android 手机。

## 前端弹窗配置

建议字段：

```text
App 名称：默认使用发布应用标题
包名：默认 com.portalengine.generated.{dashboardId}
版本名称：默认 1.0.0
版本号：默认 1
图标：默认使用系统图标，后续可支持上传或使用封面
微应用模式：degrade / live，默认 degrade
打包方式：在线 App，后续可支持离线快照 App
```

包名需要符合 Android `applicationId` 规则，不建议包含中文、短横线或随机字符。示例：

```text
com.portalengine.generated.pub2
```

## 前端接口设计

提交构建任务：

```http
POST /v1/dashboard/publish/:id/android-build
```

请求示例：

```json
{
  "appName": "销售驾驶舱",
  "packageName": "com.portalengine.generated.pub2",
  "versionName": "1.0.0",
  "versionCode": 1,
  "iconUrl": "",
  "microAppMode": "degrade",
  "buildType": "online"
}
```

响应示例：

```json
{
  "code": 20000,
  "data": {
    "jobId": "android_build_20260625_001",
    "status": "queued"
  }
}
```

查询构建状态：

```http
GET /v1/android-build/jobs/:jobId
```

响应示例：

```json
{
  "code": 20000,
  "data": {
    "jobId": "android_build_20260625_001",
    "status": "running",
    "progress": 70,
    "phase": "building",
    "message": "正在构建 APK"
  }
}
```

下载构建产物：

```http
GET /v1/android-build/jobs/:jobId/artifact
```

或者返回可下载 URL：

```json
{
  "code": 20000,
  "data": {
    "artifactUrl": "https://files.example.com/android-build/pub_2.apk"
  }
}
```

## 后端构建服务

建议新增独立服务：`android-build-service`。

职责：

```text
接收构建任务
校验发布应用是否存在
复制 Android App 模板
注入应用配置
替换 App 名称、包名、版本号和图标
执行 Capacitor/Gradle 构建
签名 APK
上传 APK 到文件服务
记录构建状态
清理临时目录
```

构建任务状态：

```text
queued
running
success
failed
cancelled
```

构建阶段建议：

```text
prepare：准备配置
template：复制模板
assets：生成资源
sync：同步 Capacitor
building：构建 APK
signing：签名 APK
uploading：上传产物
done：完成
error：失败
```

## 构建模板

推荐使用 Capacitor Android 模板。

模板目录示例：

```text
android-app-template/
  capacitor.config.ts
  package.json
  android/
  web/
    index.html
    static/
```

每次构建时复制模板到临时目录：

```text
/tmp/android-build/{jobId}/
```

然后注入运行配置：

```js
window.__APP_CONFIG__ = {
  API_BASE_URL: "https://api.example.com/api",
  START_HASH: "#/mobile-preview/pub_2?microAppMode=degrade",
  DASHBOARD_ID: "pub_2",
  APP_NAME: "销售驾驶舱"
}
```

App 启动后读取 `START_HASH` 并跳转到对应移动端预览路由。

## APK 运行流程

```text
Android App 启动
  -> Capacitor WebView 加载本地前端运行时
  -> 读取 START_HASH
  -> 跳转到 #/mobile-preview/:id
  -> 请求 /v1/dashboard/publish 获取 dashboardConfig
  -> 渲染移动端工作台
```

## 服务依赖

在线壳 APK 正常运行依赖以下条件：

```text
API_BASE_URL 必须是手机可访问的真实 HTTPS 地址
/v1/dashboard/publish 必须可访问
组件内配置的接口必须可访问
文件服务、MinIO、图片资源必须可访问
微应用 URL 必须可访问
登录态/token 必须能在 App WebView 中正常传递
```

不能依赖：

```text
localhost
开发机 IP
Vite dev server proxy
只在办公电脑可访问的本地服务
```

如果企业内网才能访问，需要配合 VPN、专线、移动网关或企业 MDM 网络策略。

## 微应用策略

默认使用：

```text
microAppMode=degrade
```

原因：

```text
Wujie 对 Proxy、CustomElementRegistry、iframe、沙箱和跨域能力有要求
Android WebView 与桌面 Chrome 行为不完全一致
微应用自身可能依赖桌面端尺寸、cookie、CORS、CSP 或登录上下文
```

如果选择：

```text
microAppMode=live
```

需要逐个验证：

```text
微应用是否能在 Android WebView 加载
token 是否能传递
CORS/CSP 是否允许
iframe 是否可嵌入
路由同步是否正常
事件通信是否正常
文件上传、下载、定位、摄像头等能力是否正常
```

## 离线快照 APK

离线快照 APK 可以作为第二阶段能力。

方案：

```text
复用 export-runtime
将 dashboard 快照和运行时写入 APK 本地资源
App 启动后直接读取本地 dashboard-data.js
```

优点：

```text
无网络时也可以展示基础页面
适合演示、归档、巡检
```

缺点：

```text
动态接口无法离线
微应用无法完整离线
远程图片、文件预览、OnlyOffice 等能力无法保证
发布应用更新后 APK 不会自动更新
```

因此第一版不建议做离线 APK，优先实现在线壳 APK。

## 数据表建议

构建任务表：

```text
android_build_job
  id
  dashboard_id
  app_name
  package_name
  version_name
  version_code
  icon_url
  micro_app_mode
  build_type
  status
  progress
  phase
  message
  artifact_url
  error_message
  created_by
  created_at
  updated_at
```

## 安全与运维

签名证书：

```text
APK 必须签名后才能安装
同一个包名后续升级必须使用同一套签名证书
keystore 必须放在安全位置，不应进入代码仓库
```

构建隔离：

```text
每个任务使用独立临时目录
构建完成后清理临时文件
限制并发构建数量
限制 App 名称、包名、图标大小和上传文件类型
```

产物管理：

```text
APK 上传到文件服务
设置下载权限和过期策略
保留构建日志用于排错
失败任务记录 error_message
```

## 推荐实施阶段

第一阶段：

```text
应用列表增加“打包 Android App”入口
新增打包配置弹窗
后端实现在线壳 APK 构建
构建完成后下载 APK
默认 microAppMode=degrade
```

第二阶段：

```text
支持自定义图标
支持构建历史
支持重新下载
支持构建失败日志查看
支持二维码下载
```

第三阶段：

```text
支持离线快照 APK
支持批量构建
支持企业内部分发页
支持 Android App 自动更新检测
```

## MVP 边界

第一版只承诺：

```text
生成可安装 Android APK
APK 打开指定发布应用的移动端预览页
基础组件可以在线展示
接口和微应用依赖手机网络可访问
```

第一版不承诺：

```text
完全离线运行
微应用 live 模式 100% 兼容
自动上架应用商店
自动更新 APK
每个业务系统接口都自动适配移动端网络
```
