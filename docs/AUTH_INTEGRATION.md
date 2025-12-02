# 认证系统集成文档

## 概述

本项目已成功集成 Cookie-based 认证系统，通过 Mock API 实现用户登录和 Token 管理。

## 核心功能

### 1. Token 管理

使用 `js-cookie` 库管理客户端 Token：

- **Token 存储位置**：Cookie (`YSTOKEN`)
- **有效期**：24 小时
- **自动续期**：后端通过 Cookie 实现（Mock 接口模拟）

### 2. 认证流程

```
用户输入账号密码
    ↓
调用登录 API (/login)
    ↓
后端验证并设置 Cookie
    ↓
前端更新 Store 状态
    ↓
路由守卫检查 Token
    ↓
跳转到首页
```

## 文件结构

```
src/
├── api/
│   └── auth.ts                 # 登录 API 接口
├── utils/
│   ├── cookie.ts               # Cookie 操作工具（已存在）
│   └── axios.config.ts         # Axios 配置（已存在）
├── router/
│   ├── index.tsx               # 路由入口
│   ├── routes.config.tsx       # 路由配置
│   └── AuthGuard.tsx           # 路由守卫
├── store/
│   └── useStore.ts             # Zustand 状态管理
└── components/
    └── Login/
        └── index.tsx           # 登录组件
```

## 核心代码说明

### 1. API 接口 (src/api/auth.ts)

```typescript
export const loginApi = async (params: LoginParams): Promise<LoginResponse> => {
  const response = await ajax<LoginResponse>({
    method: 'post',
    url: '/login',
    data: params,
  });
  return response.data!;
};
```

### 2. Cookie 工具 (src/utils/cookie.ts)

项目已有完整的 Cookie 管理工具：

- `getToken()` - 获取 Token（支持从 Cookie 和 URL 获取）
- `setToken(token)` - 设置 Token
- `removeToken()` - 删除 Token

### 3. 路由守卫 (src/router/AuthGuard.tsx)

关键逻辑：

```typescript
const hasToken = !!getToken();

// 需要认证但没有 token
if (!hasToken && requiresAuth) {
  return <Navigate to="/login" />;
}

// 已登录访问登录页
if (hasToken && location.pathname === '/login') {
  return <Navigate to="/" />;
}
```

### 4. Store 状态管理 (src/store/useStore.ts)

```typescript
export interface AppState {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  login: (userInfo?: UserInfo) => void;
  logout: () => void;
  // ...
}

// 初始化时从 Cookie 检查
isAuthenticated: !!getToken(),

// 登录
login: (userInfo?) => set({
  isAuthenticated: true,
  userInfo
}),

// 登出
logout: () => {
  removeToken();
  set({
    isAuthenticated: false,
    userInfo: null
  });
}
```

### 5. 登录组件 (src/components/Login/index.tsx)

```typescript
const onFinish = async (values: any) => {
  try {
    // 调用登录接口
    const response = await loginApi({
      username: values.username,
      password: values.password,
    });

    // 后端已通过 Cookie 设置 token
    login(response.user_info);
    navigate('/');
  } catch (error) {
    message.error('登录失败');
  }
};
```

## Mock API 接口

### 登录接口

**URL**: `POST /login`

**请求参数**:
```json
{
  "username": "admin",
  "password": "123456"
}
```

**响应格式**:
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "mock-token-1701234567890",
    "user_info": {
      "id": "1",
      "username": "admin",
      "email": "admin@example.com",
      "roles": ["admin"],
      "avatar": "https://..."
    }
  }
}
```

**Cookie 设置**:
```javascript
res.cookie('YSTOKEN', token, {
  httpOnly: false,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
});
```

## 启动说明

### 同时启动前端和 Mock 服务器

```bash
npm start
```

### 单独启动

```bash
# 前端开发服务器 (http://localhost:3001)
npm run dev

# Mock 服务器 (http://localhost:3001)
cd mock && npm start
```

## 测试账号

- **用户名**: admin
- **密码**: 123456

任何其他账号密码组合将返回错误。

## 认证状态检查

1. **初始化检查**: 应用启动时从 Cookie 读取 Token
2. **路由拦截**: AuthGuard 检查每次路由跳转
3. **请求拦截**: Axios 自动在请求头中添加 Token

## 安全考虑

### 当前实现

- ✅ Token 存储在 Cookie 中
- ✅ 路由级别的权限控制
- ✅ 401 错误自动跳转登录页

### 生产环境建议

- 🔐 启用 `httpOnly: true`（防止 XSS）
- 🔐 启用 `secure: true`（仅 HTTPS）
- 🔐 启用 `sameSite: 'strict'`（防止 CSRF）
- 🔐 实现 Token 刷新机制
- 🔐 添加请求签名验证

## 扩展功能

### 1. 记住我功能

Login 组件已包含"记住我"复选框，可在 `onFinish` 中实现：

```typescript
if (values.remember) {
  setToken(response.token, 7); // 7 天
} else {
  setToken(response.token); // 默认过期时间
}
```

### 2. 自动刷新 Token

在 `axios.config.ts` 的响应拦截器中添加：

```typescript
axios.interceptors.response.use(
  response => {
    const newToken = response.headers['authorization'];
    if (newToken) {
      setToken(newToken);
    }
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/#/login';
    }
    return Promise.reject(error);
  }
);
```

### 3. 用户信息持久化

如需将用户信息保存到 localStorage：

```typescript
// 在 useStore.ts 的 persist 配置中
partialize: (state) => ({
  widgets: state.widgets,
  userInfo: state.userInfo, // 添加用户信息
}),
```

## 故障排查

### 问题：登录后仍然跳转到登录页

**检查**:
1. Cookie 是否成功设置（浏览器开发工具 → Application → Cookies）
2. `getToken()` 是否正确读取 Cookie
3. AuthGuard 的判断逻辑

### 问题：跨域请求失败

**解决**:
1. 检查 Vite 配置的代理设置
2. 确认 Mock 服务器已启动
3. 查看浏览器控制台的 CORS 错误

### 问题：Token 失效后没有自动跳转

**检查**:
1. axios.config.ts 的 401 错误处理
2. removeToken() 是否被正确调用

## 相关文档

- [路由系统说明](../src/router/README.md)
- [Cookie 工具文档](../src/utils/cookie.ts)
- [Axios 配置文档](../src/utils/axios.config.ts)
