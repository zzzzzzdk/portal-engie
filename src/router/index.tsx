import React, { lazy, Suspense, useMemo, useCallback } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { useSystemStore } from '@/store/useSystemStore'
import { getToken } from '@/utils/cookie'
import routeConfig, { type RouteConfig } from './router.config'
import WaterMark from './WaterMark'

/**
 * 加载提示组件
 */
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  }}>
    加载中...
  </div>
)

const INTERNAL_AUTH_ROUTES = ['/portal-home']

/**
 * 路由渲染器
 */
function APPRouter() {
  // 获取用户权限路由 - 使用稳定的引用避免无限循环
  const userRoutes = useSystemStore((state) => state.userInfo?.route)
  const isLogin = useSystemStore((state) => state.isLogin)

  // 获取系统配置用于水印
  const sysConfig = useSystemStore((state) => state.sysConfig)
  const userInfo = useSystemStore((state) => state.userInfo)

  // 生成水印文本
  const waterMarkText = useMemo(() => {
    const systemName = sysConfig?.sys_text || '门户引擎'
    const userName = userInfo?.user_info?.name || ''
    return userName ? `${systemName} - ${userName}` : systemName
  }, [sysConfig, userInfo])

  // 是否显示水印（从系统配置读取）
  const showWaterMark = sysConfig?.water_mark !== false

  /**
   * 检查路由权限
   * @param route 路由配置
   * @returns 是否有权限访问
   */
  const hasPermission = useCallback((route: RouteConfig): boolean => {
    // 不需要权限验证的路由（如登录页、404、403）
    if (!route.meta?.requiresAuth) return true

    // 优先检查 cookie 中的 token，避免状态延迟问题
    const token = getToken()

    // 需要登录但未登录（cookie 中没有 token 且状态也未登录）
    if (!token && !isLogin) return false

    // 已登录，检查用户路由权限
    // 只有在 userRoutes 数组中的路径，用户才有权限访问
    const routePath = route.path?.startsWith('/') ? route.path : `/${route.path}`

    if (routePath && INTERNAL_AUTH_ROUTES.includes(routePath)) {
      return true
    }

    // 严格权限验证：路径必须在用户的 route 数组中
    const hasRoutePermission = userRoutes?.includes(routePath) ?? false

    return hasRoutePermission
  }, [isLogin, userRoutes])

  /**
   * 动态加载组件
   */
  const loadComponent = useCallback((
    element: RouteConfig['element']
  ): React.ReactNode => {
    if (!element) return null

    const LazyComponent = lazy(element as () => Promise<{ default: React.ComponentType<any> }>)

    return (
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent />
      </Suspense>
    )
  }, [])

  /**
   * 渲染单个路由
   */
  const renderRoute = useCallback((route: RouteConfig, parentPath = ''): React.ReactElement | null => {
    const { path, redirect, index, element, children } = route
    const fullPath = path ? (path.startsWith('/') ? path : `${parentPath}/${path}`) : parentPath
    const key = fullPath || 'index'

    // 处理重定向
    if (redirect) {
      return (
        <Route
          key={key}
          path={path}
          index={index}
          element={<Navigate to={redirect} replace />}
        />
      )
    }

    // 处理子路由 - Layout 或其他容器组件
    if (children && children.length > 0) {
      // 如果有 component，加载它作为容器
      const ContainerComponent = element ? loadComponent(element) : null

      return (
        <Route key={key} path={path} element={ContainerComponent}>
          {children.map((child) => renderRoute(child, fullPath))}
        </Route>
      )
    }

    // 处理叶子路由
    if (!element) return null

    // 权限检查
    if (!hasPermission(route)) {
      return (
        <Route
          key={key}
          path={path}
          index={index}
          element={<Navigate to="/403" replace />}
        />
      )
    }

    // 渲染页面组件
    const PageComponent = loadComponent(element)

    return (
      <Route
        key={key}
        path={path}
        index={index}
        element={PageComponent}
      />
    )
  }, [hasPermission, loadComponent])

  /**
   * 渲染所有路由
   */
  const renderRoutes = useCallback((routes: RouteConfig[]): React.ReactElement[] => {
    return routes.map((route) => renderRoute(route) || <></>).filter(Boolean)
  }, [renderRoute])

  return (
    <WaterMark text={waterMarkText} visible={showWaterMark}>
      <Routes>{renderRoutes(routeConfig)}</Routes>
    </WaterMark>
  )
}

export default APPRouter
