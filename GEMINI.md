# Portal Engine Frontend Project Guide

This `GEMINI.md` file provides context and instructions for interacting with the `portal-engine-frontend` project. It is based on the project's current architecture and configuration.

## 技术栈

- **框架**：React 19+（函数组件 + Hooks）
- **路由**：react-router-dom v7+
- **状态管理**：Zustand（轻量级、无需 Provider）
- **构建工具**：Vite 5+（支持 TypeScript、JSX、SCSS）
- **UI 组件库**：Ant Design v6+（使用 ConfigProvider 全局配置主题）
- **语言**：TypeScript 5+（所有新代码必须使用 TS）
- **样式**：SCSS（所有新代码必须使用 SCSS，文件名采用短横线分隔法）
- **HTTP 客户端**：Axios（统一拦截器处理）
- **加密工具**：crypto-js、jsencrypt
- **图表库**：echarts

## 常用命令

```bash
# 安装依赖
npm install

# 启动开发环境（同时启动 mock 服务器和开发服务器）
npm start

# 单独启动 mock 服务器（端口 3001）
npm run mock

# 单独启动开发服务器（端口 3000）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# TypeScript 类型检查
npx tsc --noEmit
```

**默认登录凭证**：
- 用户名：`admin`
- 密码：`123456`

## 项目架构

### 目录结构
```
portal/
├── public/                 # 静态资源
├── src/
│   ├── components/         # 组件目录
│   │   ├── ConfigDialog.tsx    # 配置对话框组件
│   │   ├── Dashboard.tsx        # 仪表盘主组件
│   │   ├── WidgetWrapper.tsx    # 小部件包装器
│   │   └── widgets/             # 小部件组件目录
│   ├── store/              # 状态管理
│   │   └── useStore.ts         # Zustand 状态管理
│   ├── types/              # 类型定义
│   │   └── index.ts            # 应用类型定义
│   ├── App.tsx             # 应用主组件
│   └── main.tsx            # 应用入口点
├── package.json            # 项目依赖和脚本
└── README.md               # 项目说明
```

### 核心架构说明

#### 1. 系统初始化流程

应用启动时遵循严格的初始化顺序（`src/App.tsx`）：

1. **验证认证**：检查 Cookie 中的 token
2. **获取系统配置**：`GET /api/common/get-sys-config`
   - 系统信息（名称、Logo、描述）
3. **获取用户信息**：`GET /api/iam-api/user/get-user-info`
   - 用户详情和权限
   - 动态菜单结构
   - 路由访问权限
4. **渲染应用**：仅在两个配置都成功加载后

**关键**：应用在初始化完成前不会渲染，所有配置存储在 `useSystemStore` 中。

#### 2. 状态管理（Zustand）

**核心 Store Hooks**：`src/store/`

管理四个关键领域：
- **useSystemStore** - 系统配置、用户信息、认证状态、当前路由
- **useConfigStore** - 主题配置、界面配置
- **useCommonStore** - 通用状态（加载、通知、弹窗等）

使用示例：
```typescript
import { useSystemStore } from '@/store'

const MyComponent = () => {
  const sysConfig = useSystemStore((state) => state.sysConfig)
  const userInfo = useSystemStore((state) => state.userInfo)
  const currentRoute = useSystemStore((state) => state.currentRoute)
  const fetchSysConfig = useSystemStore((state) => state.fetchSysConfig)
  const logout = useSystemStore((state) => state.logout)

  // 刷新系统配置
  await fetchSysConfig()

  // 登出
  logout()
}
```

**状态持久化**：
- Token 存储在 HTTP-only cookies 中（`src/utils/cookie.ts`）
- 主题配置存储在 localStorage
- 系统配置和用户信息在每次启动时从服务器获取

#### 3. 路由系统和面包屑

**路由配置**（`src/router/router.config.ts`）：

```typescript
{
  path: 'material-library',
  component: () => import('@/pages/MaterialLibrary'),
  name: 'MaterialLibrary',
  icon: 'picture',
  meta: {
    title: '素材库',
    auth: true,              // 需要认证
    layout: true,
    breadcrumb: ['样本管理', '素材库']  // 面包屑数组
  }
}
```

**路由监听机制**：
- `src/hooks/useRouteListener.ts`：自动监听路由变化
- 从路由配置中提取元数据（path、name、title、breadcrumb、icon 等）
- 自动更新 Zustand store 中的 `currentRoute`
- Layout 组件从 store 读取 `currentRoute.breadcrumb` 渲染面包屑

**关键原则**：
- ✅ 在 `router.config.ts` 中定义路由的 `meta.breadcrumb`
- ✅ `useRouteListener` 自动同步路由状态到 Zustand
- ✅ Layout 从 Zustand store 读取面包屑数据
- ❌ 永远不要维护单独的面包屑映射

#### 4. API 配置

**开发环境**：
- Vite proxy 自动转发 `/api/*` 到 `localhost:3001`
- Mock 服务器使用 Express，端口 3001

**生产环境**：
- 修改 `index.html` 中的 `window.__APP_CONFIG__.API_BASE_URL`
- 无需重新构建即可切换 API 地址

```html
<script>
  window.__APP_CONFIG__ = {
    API_BASE_URL: 'https://api.yourdomain.com/api'
  }
</script>
```

**Axios 拦截器**（`src/utils/axios.config.ts`）：
- 请求拦截：自动附加 Cookie 中的 JWT token
- 响应拦截：统一处理 401/403，自动重定向到登录页
- 错误统一处理

#### 5. 主题系统

**位置**：`src/theme/`

**特性**：
- 支持亮色/暗色模式切换
- 内置预设：light、dark、blue、purple
- 自定义主题配置器（ThemeCustomizer 组件）
- 主题状态持久化到 localStorage

**主题切换器可见性**：
- 仅在开发环境显示（`import.meta.env.DEV` 或 `isDevelopment()`）
- 生产环境自动隐藏

使用示例：
```typescript
import { useTheme } from '@/theme'

const MyComponent = () => {
  const theme = useTheme()

  // 切换预设主题
  theme.applyPreset('dark', true)

  // 自定义主题
  theme.updateTheme({
    colorPrimary: '#1890ff'
  })
}
```

#### 6. Mock 服务器

**结构**：
```
mock/
├── routes/
│   ├── common.js           # 系统配置、文件上传
│   ├── user.js             # 登录、用户信息
│   ├── home.js             # 首页数据
│   └── system-settings.js  # 系统设置 CRUD
├── bin/www                 # 服务器启动
└── app.js                  # Express 配置
```

**添加 Mock 接口**：
1. 在 `mock/routes/` 中创建/编辑文件
2. 定义 Express 路由处理器
3. 使用 `req.sleep(seconds)` 模拟网络延迟
4. 使用 `req.json` 对象构建响应
5. 在 `mock/app.js` 中导入（如果是新文件）

示例：
```javascript
router.get('/api/example/list', async (req, res) => {
  await req.sleep(0.3) // 模拟 300ms 延迟
  req.json.data = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ]
  res.json(req.json)
})
```

#### 7. 组件开发模式


**错误页面**（`_403/`、`_404/`）：
- 使用 `src/assets/images/` 中的本地图片
- 包含 10 秒自动重定向倒计时
- 自定义渐变背景
- 响应式布局

**页面结构**：
```
src/pages/PageName/
├── index.tsx          # 主组件
├── style.scss         # 页面样式
└── components/        # 页面子组件（可选）
```

#### 8. 样式系统（SCSS）

**全局样式**：
- `assets/css/index.scss`：样式入口
- `assets/css/mixin.scss`：混合宏和变量
- `assets/css/variables.scss`：样式变量

**SCSS 自动导入**：
- Vite 配置自动导入 `mixin.scss` 到所有 SCSS 文件
- 可以直接使用混合宏，无需手动导入

**命名规范**：
- 使用 BEM 命名规范
- 类名使用短横线分隔法（kebab-case）

#### 9. TypeScript 规范

**类型命名**：
- 接口：`PascalCase`，可选前缀 `I`（如 `IUserInfo` 或 `UserInfo`）
- 类型别名：`PascalCase`（如 `ThemeType`）
- 变量/函数：`camelCase`
- 常量：`UPPER_SNAKE_CASE`

**路径别名**：
- 使用 `@/` 代替 `src/`（在 `vite.config.ts` 和 `tsconfig.json` 中配置）

## 开发规范

### 1. 命名规范

- **文件名**：kebab-case（如 `user-profile.tsx`、`user-profile.scss`）
- **组件名**：PascalCase（如 `UserProfile`）
- **变量和函数**：camelCase（如 `getUserInfo`）
- **常量**：UPPER_SNAKE_CASE（如 `API_BASE_URL`）
- **接口/类型**：PascalCase，接口可选前缀 `I`

### 2. 代码风格

- **缩进**：2 个空格
- **引号**：单引号
- **分号**：不强制要求（根据 ESLint 配置）
- **行宽**：建议最大 100 字符
- **箭头函数**：单参数可省略括号

### 3. 组件开发

- 优先使用函数组件 + Hooks
- 使用 `React.FC<Props>` 类型定义组件
- Props 接口命名：`I{ComponentName}Props` 或 `{ComponentName}Props`
- 每个组件都有对应的 `.scss` 样式文件

组件模板：
```typescript
import React from 'react'
import './ComponentName.scss'

interface IComponentNameProps {
  title: string
  onSubmit?: () => void
}

const ComponentName: React.FC<IComponentNameProps> = ({ title, onSubmit }) => {
  return (
    <div className="component-name">
      {/* 组件内容 */}
    </div>
  )
}

export default ComponentName
```

### 4. 关键开发模式

**避免过度工程**：
- 不要添加请求之外的功能
- 不要为不可能的场景添加错误处理
- 保持解决方案简单和专注
- 信任框架和内部代码

**完全删除未使用代码**：
- 不要重命名为 `_unused`
- 不要添加 `// removed` 注释
- 不要为兼容性保留代码
- 如果未使用，就完全删除

**并行 vs 顺序操作**：
- 并行：独立操作（多个读取、多个 API 调用）
- 顺序：依赖操作（先写后提交、先创建后使用）
- 使用 `&&` 连接顺序操作

### 5. 常见开发任务

**添加新页面**：
1. 在 `src/pages/NewPage/` 创建目录
2. 添加 `index.tsx` 和 `style.scss`
3. 在 `src/router/router.config.ts` 注册路由
4. 设置 `meta.auth: true`（如需认证）
5. 添加面包屑：`breadcrumb: ['父级', '页面']`

**添加 Mock API**：
1. 在 `mock/routes/` 中编辑或创建文件
2. 定义 Express 路由
3. 使用 `req.sleep()` 模拟延迟
4. 在 `mock/app.js` 中导入（如果是新文件）

## 语言与输出规范

- 回复、注释与文档一律使用中文
- 引用英文专有名词时补充中文解释
- 保持项目既有命名风格
- 审慎处理用户指令冲突或环境异常，先沟通再执行

## 交互策略

- 复杂需求至少提供两个可行方案，说明优缺点
- 对复杂概念给出原理解析
- 关键决策说明理由和替代方案
- 存在不确定性时明确假设并询问确认

## 重要提醒

1. **编辑前必须读取文件**：永远不要在未读取文件的情况下修改代码
2. **路由状态自动管理**：`useRouteListener` 自动处理，无需手动更新
3. **系统配置刷新**：所有配置变更后必须调用 `fetchSysConfig()`
4. **面包屑从 Router 配置**：在 `router.config.ts` 中定义，Layout 自动读取
5. **主题按钮仅开发环境**：使用 `import.meta.env.DEV` 控制可见性
6. **错误页面带倒计时**：403 和 404 页面包含 10 秒自动跳转
