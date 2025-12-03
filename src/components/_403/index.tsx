import React, { useState, useEffect } from 'react'
import { Button } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import forbiddenImage from '@/assets/images/403.png'
import './style.scss'

/**
 * 403页面组件
 * 当用户没有权限访问某个页面时显示
 */
const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [countdown, setCountdown] = useState(10)

  // 记录访问被禁止页面的情况
  useEffect(() => {
    console.warn(`403 Error: Access forbidden at ${location.pathname}`)
    // 实际应用中可以发送访问日志到监控系统
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

  // 返回首页
  const handleGoHome = () => {
    navigate('/')
  }

  // 联系管理员
  const handleContactAdmin = () => {
    // 实际应用中可以打开联系方式或发送通知给管理员
    alert('请联系系统管理员获取访问权限')
  }

  return (
    <ErrorBoundary fallback="页面加载失败">
      <div className="error-page forbidden-page">
        <div className="error-content">
          <img src={forbiddenImage} alt="403 Forbidden" className="error-image" />

          <div className="error-info">
            <h1 className="error-title">403</h1>
            <p className="error-subtitle">抱歉，您没有权限访问该页面</p>
            <p className="error-path">请求路径: {location.pathname}</p>
            <p className="error-countdown">{countdown} 秒后自动返回首页</p>

            <div className="error-actions">
              <Button type="primary" size="large" onClick={handleGoHome}>
                立即返回首页
              </Button>
              <Button size="large" onClick={handleContactAdmin}>
                联系管理员
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default ForbiddenPage
