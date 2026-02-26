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
 * 系统初始化包装组件
 * 在系统加载完成前显示加载状态
 * 同时初始化工作台数据
 */
function AppInitializer({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const initialized = useSystemStore((state) => state.initialized)
  const initError = useSystemStore((state) => state.initError)
  const sysConfig = useSystemStore((state) => state.sysConfig)
  const initializeSystem = useSystemStore((state) => state.initializeSystem)

  // 工作台初始化
  const { setEditMode, loadDashboard } = useStore()
  const [retryCount, setRetryCount] = useState(0)
  const [dashboardInitialized, setDashboardInitialized] = useState(false)

  // 检查是否是公开页面（不需要登录验证）
  const publicPaths = ['/login', '/403', '/404']
  const isPublicPath = publicPaths.includes(location.pathname)

  // 系统初始化 - 始终执行，不依赖 token
  // fetchSysConfig 不需要 token
  // fetchUserInfo 只在有 token 时获取（由 initializeSystem 内部判断）
  useEffect(() => {
    initializeSystem()
  }, [retryCount, initializeSystem])

  // 系统配置获取成功后，检查 token，未登录则跳转登录页
  useEffect(() => {
    // 公开页面不需要检查登录状态
    if (isPublicPath) return
    // 系统配置未获取到时不检查
    if (!sysConfig) return

    const token = getToken()
    if (!token) {
      // 未登录，跳转到系统配置的登录地址或本地登录页
      const loginUrl = isDevelopment() ? '/login' : sysConfig?.login_url
      if (loginUrl) {
        console.warn('未检测到登录凭证，跳转到登录页')
        if (isDevelopment()) {
          navigate(loginUrl, { replace: true })
        } else {
          window.location.href = loginUrl
        }
      }
    }
  }, [sysConfig, isPublicPath, navigate])

  // 工作台数据初始化
  useEffect(() => {
    // 只在系统初始化完成、有 token、且未初始化工作台时执行
    const token = getToken()
    if (initialized && !isPublicPath && !dashboardInitialized && token) {
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
        {/* LoginGuard 已移除，登录检查逻辑已合并到 AppInitializer 中 */}
        <AppInitializer>
          <APPRouter />
        </AppInitializer>
      </ThemeProvider>
    </HashRouter>
  )
}

export default App
