import React, { useState, useEffect } from 'react'
import { Button } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import notFoundImage from '@/assets/images/404.png'
import './style.scss'

/**
 * 404页面组件
 * 当用户访问不存在的路由时显示
 */
const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [countdown, setCountdown] = useState(10)

  // 记录访问不存在页面的情况
  useEffect(() => {
    console.warn(`404 Error: Page not found at ${location.pathname}`)
    // 实际应用中可以发送错误日志到监控系统
  }, [location.pathname])

  // 倒计时自动跳转
  useEffect(() => {
    if (countdown === 0) {
      navigate('/')
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, navigate])

  // 返回上一页
  const handleGoBack = () => {
    navigate(-1)
  }

  // 返回首页
  const handleGoHome = () => {
    navigate('/')
  }

  return (
    <ErrorBoundary fallback="页面加载失败">
      <div className="error-page not-found-page">
        <div className="error-content">
          <img src={notFoundImage} alt="404 Not Found" className="error-image" />

          <div className="error-info">
            <h1 className="error-title">404</h1>
            <p className="error-subtitle">抱歉，您访问的页面不存在</p>
            <p className="error-path">请求路径: {location.pathname}</p>
            <p className="error-countdown">{countdown} 秒后自动返回首页</p>

            <div className="error-actions">
              <Button size="large" onClick={handleGoBack}>
                返回上一页
              </Button>
              <Button type="primary" size="large" onClick={handleGoHome}>
                立即返回首页
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default NotFoundPage
