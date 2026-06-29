# 发布应用移动端展示实施开发流程

## 目标

让发布后的工作台应用可以在手机浏览器、企业移动容器或后续 Capacitor App 中展示。

第一阶段目标不是生成原生应用，而是先补齐可稳定复用的移动端发布运行时：

```text
桌面预览：#/preview/:id
移动预览：#/mobile-preview/:id
草稿移动预览：#/mobile-preview/:id?version=draft
微应用 live 验证入口：#/mobile-preview/:id?microAppMode=live
```

当前源码中只有桌面预览路由，旧文档 `docs/mobile-app-runtime-plan.md` 标注为废弃且描述的移动路由尚未在源码落地。后续开发以本文档为准。

## 总体方案

采用“移动端运行时 + 自动转换兜底 + 可选 mobile 设计模式”的渐进方案。

1. 先新增移动端运行时，复用已发布的 `DashboardSnapshot` 数据。
2. 没有移动端配置时，根据桌面布局自动转换为手机单列流。
3. 再增加 mobile 设计模式，让用户可以单独调整手机端顺序、高度、显示方式。
4. 最后按分发需求接入 PWA、Capacitor 宿主 App 或 Android 打包服务。

不采用第一阶段直接原生重写，也不采用纯 CSS 缩放桌面工作台。

## MVP 边界

第一版必须支持：

- 手机端打开已发布应用。
- 基础系统组件、图表、新闻、快捷入口、表单、查询、导航、列表可以在线展示。
- 桌面布局自动转换为移动端单列卡片。
- 悬浮模块转为页面内卡片区，不使用 fixed 拖拽。
- 微应用默认降级展示，避免 Wujie 在移动 WebView 中的不确定性。
- 应用列表提供移动端预览入口或二维码入口。

第一版不承诺：

- 完全离线运行。
- 微应用 live 模式 100% 兼容。
- 复杂大表格在手机上保持桌面体验。
- OnlyOffice、Monaco、复杂文件预览完全适配手机。
- 每个发布应用自动生成独立 APK。

## 阶段拆分

### 阶段 1：移动端运行时

目标：实现 `#/mobile-preview/:id`，手机上能打开发布应用。

开发任务：

1. 新增页面目录：

```text
src/pages/MobileDashboardPreview/
  index.tsx
  index.scss
  mobile-layout.ts
  MobileWidgetAdapter.tsx
  MobileFloatingModuleSection.tsx
```

2. 路由新增：

```ts
{
  path: '/mobile-preview/:id',
  element: () => import('@/pages/MobileDashboardPreview'),
  meta: {
    requiresAuth: false,
    title: '移动端预览 - Portal Engine',
  },
}
```

3. 复用 `getPublishedDashboard`、`parseDashboardSnapshot` 获取发布数据。

4. 复用现有组件渲染能力，但不复用 `DashboardCanvasRenderer` 的 GridStack 布局。

5. 使用 `PortalRuntimeProvider` 包裹移动运行时：

```tsx
<PortalRuntimeProvider value={{ mode: 'mobile-runtime', microAppMode }}>
  ...
</PortalRuntimeProvider>
```

需要同步扩展：

```ts
export type PortalRuntimeMode = 'app' | 'export-runtime' | 'mobile-runtime'
```

6. 新增桌面布局到移动布局的转换函数：

```ts
export interface MobileLayoutItem {
  widgetId: string
  order: number
  visible: boolean
  height?: number | 'auto'
  display?: 'card' | 'compact' | 'full'
}
```

默认排序规则：

```text
先按 layout.y 升序
再按 layout.x 升序
同坐标按原数组顺序
过滤被分组内部重复渲染的组件
```

默认高度规则：

```text
chart/dataTable/microApp/nativeForm：320-420px
stats/indicatorCard/navGroup/news/topList：auto
carousel：220px
unknown：auto
```

7. 悬浮模块在移动端渲染为普通卡片区：

```text
页面主内容
  -> 普通组件列表
  -> 悬浮模块列表
```

8. 页面容器样式遵循手机 Web：

```text
max-width: 480px
min-height: 100dvh
padding: 12px
safe-area inset
overflow-y: auto
```

### 阶段 2：发布列表入口

目标：让用户能从应用列表找到移动入口。

开发任务：

1. `src/pages/PublishList/index.tsx` 新增构造函数：

```ts
const buildMobilePreviewUrl = (record: PublishListItem) => {
  const statusMeta = getStatusMeta(record)
  const versionQuery = statusMeta.previewVersion === 'draft' ? '?version=draft' : ''
  return `${window.location.origin + window.location.pathname}#/mobile-preview/${record.id}${versionQuery}`
}
```

2. 列表操作区新增“手机预览”按钮。

3. 分享弹窗增加移动端 URL。

4. 可选增加二维码展示。二维码不进入 MVP 阻塞项。

### 阶段 3：组件移动适配

目标：让核心组件在手机端看起来可用，而不是桌面组件硬塞进去。

优先级：

1. `WidgetWrapper` 或移动专用 wrapper：去掉桌面 hover 操作、拖拽、resize、右键菜单。
2. 图表：监听容器宽度变化并 resize。
3. 表单：统一单列、按钮全宽或底部固定。
4. 查询筛选：字段纵向排列，操作按钮贴底或换行。
5. 表格：提供卡片模式；复杂表格先允许横向滚动。
6. 快捷入口/导航：宫格布局，最小触控尺寸不小于 44px。
7. 文档/文件预览：图片、PDF 优先；Office/Monaco 标记为高风险组件。
8. 微应用：默认 degrade，live 模式作为兼容性验收项。

微应用策略：

```text
默认：microAppMode=degrade
可选：microAppMode=live
```

`MicroAppWidget` 当前根据 localStorage、Proxy、CustomElementRegistry 推断 degrade。移动运行时应改为优先读取 `usePortalRuntime().microAppMode`。

建议逻辑：

```ts
const runtime = usePortalRuntime()
const degrade =
  runtime.microAppMode === 'degrade' ||
  window.localStorage.getItem('degrade') === 'true' ||
  !window.Proxy ||
  !window.CustomElementRegistry
```

### 阶段 4：mobile 设计模式

目标：允许用户单独编辑手机端布局。

数据结构建议放入 `dashboardConfig.mobile`，避免破坏现有 `widgets` 和 `layout`。

```ts
export interface DashboardMobileConfig {
  enabled?: boolean
  layoutMode?: 'auto' | 'custom'
  items?: MobileLayoutItem[]
  floatingModules?: MobileLayoutItem[]
  themeOverrides?: {
    backgroundType?: DashboardConfig['backgroundType']
    backgroundColor?: string
    backgroundImage?: string
    backgroundGradient?: string
  }
}
```

发布快照仍保持：

```ts
export interface DashboardSnapshot {
  widgets: Widget[]
  groups: WidgetGroup[]
  floatingModules: Widget[]
  dashboardConfig?: DashboardConfig
}
```

编辑器改动：

1. 顶部新增 `桌面 / 手机` 模式切换。
2. 手机模式中只编辑 `dashboardConfig.mobile.items`。
3. 支持调整顺序、隐藏组件、设置展示高度、选择卡片/紧凑/全宽。
4. 新增组件时自动同步追加 mobile item。
5. 删除组件时清理对应 mobile item。
6. 未配置时继续走自动转换。

### 阶段 5：移动宿主和打包

该阶段依赖 `#/mobile-preview/:id` 稳定后再做。

推荐顺序：

1. PWA：轻量支持添加到主屏幕。
2. Capacitor 统一宿主 App：企业内部移动端容器。
3. Android 在线壳 APK：按 `docs/android-app-packaging-plan.md` 实施。

不要在移动运行时完成前先做 APK，否则 APK 只是把桌面页面装进 WebView，体验问题仍然存在。

## 文件改动建议

核心新增：

```text
src/pages/MobileDashboardPreview/index.tsx
src/pages/MobileDashboardPreview/index.scss
src/pages/MobileDashboardPreview/mobile-layout.ts
src/pages/MobileDashboardPreview/MobileWidgetAdapter.tsx
src/pages/MobileDashboardPreview/MobileFloatingModuleSection.tsx
```

核心修改：

```text
src/router/router.config.tsx
src/runtime/portal-runtime-context.tsx
src/pages/PublishList/index.tsx
src/components/widgets/MicroAppWidget/index.tsx
src/components/FloatingModule/index.tsx
src/types/index.ts
```

可能需要适配：

```text
src/components/widgets/ChartWidget*
src/components/widgets/DataTableWidget*
src/components/widgets/CustomFormWidget*
src/components/widgets/QueryFilterWidget*
src/components/widgets/NativeFormWidget*
src/components/widgets/MyDocumentsWidget*
```

## 开发顺序

建议按以下顺序提交，便于回归：

1. 增加 runtime mode、移动路由和空页面。
2. 接入发布数据获取和错误/加载态。
3. 实现 `mobile-layout.ts` 自动转换。
4. 实现移动组件列表渲染。
5. 实现悬浮模块移动端卡片区。
6. 接入 `PortalRuntimeProvider` 的 `microAppMode=degrade`。
7. 应用列表新增移动预览入口。
8. 核心组件逐个适配移动端。
9. 增加 mobile 设计模式和数据结构。
10. 增加端到端测试和真机验收清单。

## 验收清单

基础验收：

- 已发布应用可通过 `#/mobile-preview/:id` 打开。
- 草稿可通过 `?version=draft` 打开。
- 没有 mobile 配置时，桌面组件按 y/x 顺序渲染。
- 页面无横向整体滚动。
- 手机宽度 360px、390px、430px、768px 下无明显遮挡。
- 图表、列表、表单、导航基本可读可操作。
- 悬浮模块不再 fixed 覆盖主内容。
- 微应用默认降级，不阻塞页面其他组件渲染。
- 接口失败时展示组件级错误，不导致整页白屏。

兼容性验收：

- Chrome Android。
- Android System WebView。
- iOS Safari。
- iOS WKWebView。
- 企业微信/微信内置浏览器，如业务需要。

高风险专项：

- Wujie live 模式。
- iframe 微应用登录态。
- 文件上传/下载。
- PDF/Word/Excel/OnlyOffice 预览。
- 大数据表格。
- 地图、摄像头、定位等浏览器权限能力。

## 测试建议

新增 Playwright 用例：

```text
tests/mobile-preview.spec.ts
```

覆盖：

1. `#/mobile-preview/:id` 正常加载。
2. 移动 viewport 下无整体横向滚动。
3. 至少 3 类组件渲染成功。
4. 微应用降级模式下不白屏。
5. 草稿 query 参数传递正确。

手工测试必须包含真机或真实 WebView。桌面浏览器移动模拟只能作为第一层验证。

## 服务和部署要求

移动端正常展示的前提：

```text
API_BASE_URL 是手机可访问的真实 HTTPS 地址
/v1/dashboard/publish 可访问
组件内配置 endpoint 可访问
文件服务、图片、MinIO、OnlyOffice 可访问
微应用 URL 可访问
token 能在手机浏览器或 WebView 中传递
```

不能依赖：

```text
localhost
Vite dev server proxy
开发机 IP
只在桌面办公网络可访问的服务
```

如果业务接口只在内网可访问，需要配合 VPN、移动网关、企业 MDM 或统一 API 网关。

## 风险和决策

1. GridStack 不进入移动运行时。移动端只使用发布快照，不使用桌面拖拽布局引擎。
2. 自动转换只是兜底。长期体验依赖 mobile 设计模式。
3. 微应用 live 模式不能默认开启。需要逐个微应用验收。
4. App 打包不是第一阶段目标。移动 Web 路由稳定后再接 Capacitor 或 Android 构建服务。
5. 离线能力只能覆盖静态快照，不能保证动态接口和微应用完整运行。
