# Portal Engine 前端

基于 React + TypeScript + Vite 构建的企业级仪表盘应用，用户可以通过拖放配置创建个性化的数据展示面板。

## 技术栈

- **框架**: React 18+
- **构建工具**: Vite 5
- **开发语言**: TypeScript 5+
- **UI 组件库**: Ant Design 6
- **状态管理**: Zustand
- **网格布局**: React Grid Layout
- **图表库**: ECharts for React
- **图标库**: Lucide React
- **路由**: React Router DOM v7

## 核心功能

### 📊 小部件系统
支持 10 种可配置的小部件类型：
- **时钟 (Clock)** - 实时时间显示
- **统计卡片 (Statistics)** - 数据统计展示
- **图表 (Charts)** - 可视化数据图表
- **快捷链接 (Quick Links)** - 常用链接导航
- **新闻动态 (News Feed)** - 信息流展示
- **排行榜 (Top Lists)** - 数据排名展示
- **搜索 (Search)** - 搜索功能组件
- **数据表格 (Data Tables)** - 表格数据展示
- **卡片网格 (Card Grids)** - 卡片式布局
- **自定义表单 (Custom Forms)** - 可配置表单

### ✨ 交互功能

- **拖放布局** 🎯
  - 12 列响应式网格系统
  - 自由拖拽调整位置
  - 实时调整大小
  - 防碰撞自动布局

- **灵活配置** ⚙️
  - 每个小部件可单独配置
  - 支持显示/隐藏标题
  - 自定义刷新间隔
  - API 端点配置

- **右键菜单** 🖱️
  - 快速访问小部件操作
  - 刷新、设置、删除功能
  - 上下文菜单支持

- **编辑模式** ✏️
  - 一键切换编辑/预览模式
  - 编辑模式显示操作按钮
  - 预览模式纯净展示

- **数据持久化** 💾
  - 布局自动保存到 localStorage
  - 配置自动同步
  - 支持导入/导出（规划中）

- **全屏模式** 🖥️
  - 单击切换全屏显示
  - 沉浸式浏览体验

- **错误边界** 🛡️
  - 全局错误拦截
  - 单个小部件错误隔离
  - 友好的错误提示

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 同时启动开发服务器和 Mock 服务器（推荐）
npm start

# 或单独启动开发服务器
npm run dev

# 单独启动 Mock 服务器
npm run mock
```

应用将在 `http://localhost:3000` 运行，Mock API 在 `http://localhost:3001`。

### 生产构建

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览生产构建

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

### TypeScript 类型检查

```bash
npx tsc --noEmit
```

## 项目结构

```
portal-engine/
├── src/
│   ├── components/          # 组件目录
│   │   ├── Dashboard/       # 仪表盘主组件
│   │   ├── WidgetWrapper/   # 小部件包装器
│   │   ├── ConfigDialog/    # 配置对话框
│   │   ├── ErrorBoundary.tsx    # 全局错误边界
│   │   ├── WidgetErrorBoundary.tsx  # 小部件错误边界
│   │   └── widgets/         # 小部件组件
│   │       ├── ClockWidget.tsx
│   │       ├── StatsWidget.tsx
│   │       ├── ChartWidget.tsx
│   │       └── ...
│   ├── store/              # Zustand 状态管理
│   │   └── useStore.ts
│   ├── types/              # TypeScript 类型定义
│   │   └── index.ts
│   ├── assets/             # 静态资源
│   │   └── css/            # 样式文件
│   ├── App.tsx             # 应用主组件
│   └── main.tsx            # 应用入口
├── mock/                   # Mock 服务器
│   ├── routes/             # Mock API 路由
│   └── app.js              # Express 服务器配置
├── public/                 # 公共资源
└── index.html              # HTML 入口
```

## 使用指南

### 基础操作

1. **添加小部件**
   - 点击顶部 **"添加小部件"** 按钮
   - 从下拉菜单选择小部件类型
   - 新小部件将自动添加到布局底部

2. **编辑模式切换**
   - 点击 **"编辑模式"** 开关启用/禁用编辑
   - 编辑模式下可拖拽和调整大小
   - 关闭编辑模式锁定布局

3. **拖拽小部件**
   - 在编辑模式下，点击小部件头部拖拽
   - 拖拽至目标位置释放
   - 网格会自动调整避免重叠

4. **调整大小**
   - 在编辑模式下，拖拽小部件右下角
   - 实时预览调整效果
   - 支持最小尺寸限制

5. **小部件操作**
   - **悬停操作**：鼠标悬停显示操作按钮
   - **右键菜单**：右键点击小部件打开菜单
     - 🔄 刷新 - 重新加载小部件数据
     - ⚙️ 设置 - 打开配置对话框
     - 🗑️ 删除 - 删除小部件

6. **配置小部件**
   - 点击设置按钮或右键选择 "设置"
   - 修改标题、刷新间隔等配置
   - 开关 **"显示标题"** 可隐藏头部
   - 点击确定保存配置

7. **保存布局**
   - 点击 **"保存"** 按钮
   - 布局自动保存到本地存储
   - 下次打开自动恢复

8. **预览模式**
   - 点击 **"预览"** 按钮
   - 在新窗口打开纯净视图
   - 无编辑控件，专注内容展示

9. **全屏模式**
   - 点击全屏按钮进入全屏
   - 点击浮动退出按钮或按 ESC 退出

### 高级功能

#### 隐藏小部件标题

当你希望小部件内容占满整个空间时（如图表、图片等）：

1. 右键点击小部件，选择 "设置"
2. 关闭 **"显示标题"** 开关
3. 点击确定

**编辑模式**：会显示半透明的拖拽条，方便操作
**预览模式**：完全隐藏标题，内容全屏显示

#### Mock API 开发

项目内置 Express Mock 服务器，方便前端开发：

```javascript
// mock/routes/example.js
router.get('/api/example/data', async (req, res) => {
  await req.sleep(0.3); // 模拟网络延迟
  req.json.data = {
    // 你的数据
  };
  res.json(req.json);
});
```

## 开发规范

- **文件命名**：PascalCase（如 `ClockWidget.tsx`）
- **组件类型**：使用函数组件 + Hooks
- **状态管理**：统一使用 Zustand store
- **样式方案**：SCSS + BEM 命名规范
- **类型定义**：所有新代码必须使用 TypeScript

## 浏览器支持

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## 许可证

MIT License
