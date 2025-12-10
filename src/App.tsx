import { useEffect, useState } from 'react'
import { HashRouter, useNavigate, useLocation } from 'react-router-dom'
import { Spin, Result, Button } from 'antd'
import APPRouter from '@/router'
import { useSystemStore } from '@/store'
import { useStore } from '@/store/useStore'
import { getToken } from '@/utils/cookie'
import { microAppCommunication } from '@/utils/microAppCommunication'
import { ThemeProvider } from '@/theme'
import '@/assets/css/index.scss'
import { isDevelopment } from './config/env'

/**
 * 登录状态检查组件
 * 检查 Cookie 中的 token，不存在时跳转登录页
 */
function LoginGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isLogin = useSystemStore((state) => state.isLogin)
  const sysConfig = useSystemStore((state) => state.sysConfig)

  useEffect(() => {
    // 获取当前路径
    const currentPath = location.pathname

    // 登录页和公开页面不需要检查
    const publicPaths = ['/login', '/403', '/404']
    if (publicPaths.includes(currentPath)) {
      return
    }

    // 检查 Cookie 中的 token
    const token = getToken()

    // token 不存在且不是登录页，跳转到登录页
    if (!token && !isLogin) {
      console.warn('未检测到登录凭证，跳转到登录页')
      const loginUrl = isDevelopment() ? '/login' : sysConfig?.login_url
      navigate(loginUrl || '', { replace: true })
    }
  }, [location.pathname, isLogin, navigate])

  return <>{children}</>
}

/**
 * 系统初始化包装组件
 * 在系统加载完成前显示加载状态
 * 同时初始化仪表盘数据
 */
function AppInitializer({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const initialized = useSystemStore((state) => state.initialized)
  const initError = useSystemStore((state) => state.initError)
  const isLogin = useSystemStore((state) => state.isLogin)
  const initializeSystem = useSystemStore((state) => state.initializeSystem)

  // 仪表盘初始化
  const { setEditMode, loadDashboard } = useStore()
  const [retryCount, setRetryCount] = useState(0)
  const [dashboardInitialized, setDashboardInitialized] = useState(false)

  // 检查是否是公开页面（不需要初始化系统）
  const publicPaths = ['/login', '/403', '/404']
  const isPublicPath = publicPaths.includes(location.pathname)

  // 系统初始化
  useEffect(() => {
    // 公开页面不需要初始化系统
    if (isPublicPath) {
      return
    }

    // 只有在已登录的情况下才初始化系统
    const token = getToken()
    if (token || isLogin) {
      initializeSystem()
    }
  }, [retryCount, isLogin, isPublicPath, initializeSystem])

  // 仪表盘数据初始化
  useEffect(() => {
    // 只在系统初始化完成且未初始化仪表盘时执行
    if (initialized && !isPublicPath && !dashboardInitialized) {
      loadDashboard()
      setEditMode(true)
      setDashboardInitialized(true)

      // 初始化微应用事件监听器
      setTimeout(() => {
        microAppCommunication.setupEventListeners()
      }, 500)
    }
  }, [initialized, isPublicPath, dashboardInitialized, loadDashboard, setEditMode])

  // 重试初始化
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  // 公开页面直接渲染，不需要等待系统初始化
  if (isPublicPath) {
    return <>{children}</>
  }

  // 初始化失败
  if (initError && !initialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5'
      }}>
        <Result
          status="error"
          title="系统初始化失败"
          subTitle={initError}
          extra={
            <Button type="primary" onClick={handleRetry}>
              重试
            </Button>
          }
        />
      </div>
    )
  }

  // 正在初始化
  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5'
      }}>
        <Spin size="large" tip="系统初始化中...">
          <div style={{ padding: 50 }} />
        </Spin>
        <p style={{ marginTop: 16, color: '#666' }}>正在加载系统配置和用户信息...</p>
      </div>
    )
  }

  // 初始化完成，渲染子组件
  return <>{children}</>
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <LoginGuard>
          <AppInitializer>
            <APPRouter />
          </AppInitializer>
        </LoginGuard>
      </ThemeProvider>
    </HashRouter>
  )
}

export default App
