import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Result, Spin } from 'antd'

import { getCurrentHomepageDashboard, parseDashboardSnapshot, PublishedDashboard } from '@/services'
import sanitizeDashboardConfig from '@/utils/dashboardConfig'
import { useConfigStore } from '@/store/useConfigStore'
import { useStore } from '@/store/useStore'
import 'gridstack/dist/gridstack.min.css'
import '@/pages/DashboardGridStack/index.scss'
import '@/pages/DashboardPreview/index.scss'
import DashboardCanvasRenderer, { countDashboardMicroApps } from '@/pages/DashboardPreview/dashboard-preview-renderer'

const PortalHome: React.FC = () => {
  const navigate = useNavigate()
  const { setEditMode } = useStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<PublishedDashboard | null>(null)
  const exportMicroAppCount = useMemo(() => countDashboardMicroApps(dashboardData), [dashboardData])

  useEffect(() => {
    setEditMode(false)

    const fetchHomepage = async () => {
      try {
        setLoading(true)
        const res = await getCurrentHomepageDashboard()
        if (!res.data?.dashboardConfig) {
          setError('当前用户尚未设置门户首页')
          return
        }

        const snapshot = parseDashboardSnapshot(res.data.dashboardConfig)
        if (!snapshot) {
          setError('解析门户首页配置失败')
          return
        }

        const dashboardConfig = sanitizeDashboardConfig(snapshot.dashboardConfig || {})
        if (dashboardConfig.baseColors) {
          useConfigStore.setState({ baseColors: dashboardConfig.baseColors as any })
        }

        setDashboardData({
          id: res.data.id,
          title: res.data.title,
          publishTime: res.data.publishTime,
          widgets: snapshot.widgets,
          groups: snapshot.groups,
          floatingModules: snapshot.floatingModules,
          dashboardConfig,
        })
      } catch {
        setError('获取门户首页失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    void fetchHomepage()
  }, [setEditMode])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement
    root.dataset.exportPreviewState = loading ? 'loading' : error ? 'error' : 'ready'

    if (!loading && dashboardData) {
      root.dataset.exportExpectedMicroAppCount = String(exportMicroAppCount)
    } else {
      delete root.dataset.exportExpectedMicroAppCount
    }

    return () => {
      delete root.dataset.exportPreviewState
      delete root.dataset.exportExpectedMicroAppCount
    }
  }, [loading, error, dashboardData, exportMicroAppCount])

  if (loading) {
    return (
      <div className="dashboard-preview-loading">
        <Spin size="large" tip="正在加载门户首页..." />
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="dashboard-preview-error">
        <Result
          status="warning"
          title="暂无可用首页"
          subTitle={error || '未找到门户首页配置'}
          extra={[
            <Button key="list" type="primary" onClick={() => navigate('/publish-list')}>
              返回应用列表
            </Button>,
          ]}
        />
      </div>
    )
  }

  return <DashboardCanvasRenderer dashboardData={dashboardData} />
}

export default PortalHome
