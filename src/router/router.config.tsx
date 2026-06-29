export interface RouteConfig {
  path?: string;
  index?: boolean;
  redirect?: string;
  element?: React.LazyExoticComponent<React.ComponentType<any>> | (() => Promise<{ default: React.ComponentType<any> }>);
  children?: RouteConfig[];
  meta?: {
    requiresAuth?: boolean;
    title?: string;
  };
}

/**
 * 路由配置
 * - requiresAuth: 是否需要登录认证
 * - title: 页面标题
 *
 * 路由层级说明：
 * - Layout: 页面布局层（Header、导航、页面框架等）
 * - Page: 具体页面内容层
 */
const routeConfig: RouteConfig[] = [
  {
    path: '/login',
    element: () => import('@/pages/Login'),
    meta: {
      requiresAuth: false,
      title: '登录 - Portal Engine',
    },
  },
  {
    path: '/',
    element: () => import('@/pages/Layout'),
    meta: {
      requiresAuth: true,
      title: 'Portal Engine',
    },
    children: [
      {
        index: true,
        redirect: '/publish-list',
      },
      {
        path: 'dashboard',
        element: () => import('@/pages/Dashboard'),
        meta: {
          requiresAuth: false,
          title: '工作台 - Portal Engine',
        },
      },
      {
        path: 'dashboard-gridstack',
        element: () => import('@/pages/DashboardGridStack'),
        meta: {
          requiresAuth: false,
          title: '工作台 (GridStack) - Portal Engine',
        },
      },
      {
        path: 'micro-app-config',
        element: () => import('@/pages/MicroAppConfigPage'),
        meta: {
          requiresAuth: false,
          title: '微应用配置 - Portal Engine',
        },
      },
      {
        path: 'data-source',
        element: () => import('@/pages/DataSourcePage'),
        meta: {
          requiresAuth: false,
          title: '数据源 - Portal Engine',
        },
      },
      {
        path: 'global-config',
        element: () => import('@/pages/GlobalConfigPage'),
        meta: {
          requiresAuth: false,
          title: '全局配置 - Portal Engine',
        },
      },
      {
        path: 'publish-list',
        element: () => import('@/pages/PublishList'),
        meta: {
          requiresAuth: false,
          title: '应用列表 - Portal Engine',
        },
      },
    ],
  },
  {
    path: '/preview/:id',
    element: () => import('@/pages/DashboardPreview'),
    meta: {
      requiresAuth: false,
      title: '工作台预览 - Portal Engine',
    },
  },
  {
    path: '/mobile-preview/:id',
    element: () => import('@/pages/MobileDashboardPreview'),
    meta: {
      requiresAuth: false,
      title: '移动端预览 - Portal Engine',
    },
  },
  {
    path: '/portal-home',
    element: () => import('@/pages/PortalHome'),
    meta: {
      requiresAuth: true,
      title: '门户首页 - Portal Engine',
    },
  },
  {
    path: '/404',
    element: () => import('@/pages/_404'),
    meta: {
      title: '页面不存在',
      // layout: false,
    },
  },
  // 403 页面
  {
    path: '/403',
    element: () => import('@/pages/_403'),
    meta: {
      title: '无权限访问',
      // layout: false,
    },
  },
  // 匹配所有未定义的路由到 404
  {
    path: '*',
    redirect: '/404',
  },
];

export default routeConfig;
