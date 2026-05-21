/**
 * DashboardPreview - 工作台预览页面
 *
 * 根据 URL 中的 ID 获取发布的工作台数据并只读展示
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Spin, Result, Button } from 'antd'
import { getPublishedDashboard, parseDashboardSnapshot, PublishedDashboard } from '@/services'
import sanitizeDashboardConfig from '@/utils/dashboardConfig'
import { useConfigStore } from '@/store/useConfigStore'
import { useStore } from '@/store/useStore'
import 'gridstack/dist/gridstack.min.css'
import '@/pages/DashboardGridStack/index.scss'
import './index.scss'
import DashboardCanvasRenderer, { countDashboardMicroApps } from './dashboard-preview-renderer'

const DashboardPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setEditMode } = useStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<PublishedDashboard | null>(null)
  const exportMicroAppCount = useMemo(() => countDashboardMicroApps(dashboardData), [dashboardData])

  const version = searchParams.get('version') === 'draft' ? 'draft' : 'published'

  useEffect(() => {
    if (!id) {
      setError('缺少工作台 ID')
      setLoading(false)
      return
    }

    setEditMode(false)

    const fetchDashboard = async () => {
      try {
        setLoading(true)
        const res = await getPublishedDashboard({ id, version })
        if (res.data) {
          const snapshot = parseDashboardSnapshot(res.data.dashboardConfig)
          if (!snapshot) {
            setError('解析工作台配置失败')
            return
          }

          const dashboardConfig = sanitizeDashboardConfig(snapshot.dashboardConfig || {})
          const globalUpdate: Record<string, unknown> = {}

          if (dashboardConfig.baseColors) {
            globalUpdate.baseColors = dashboardConfig.baseColors
          }

          if (Object.keys(globalUpdate).length > 0) {
            useConfigStore.setState(globalUpdate)
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
        } else {
          setError(res.message || '获取工作台数据失败')
        }
      } catch {
        setError('获取工作台数据失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [id, setEditMode, version])

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
        <Spin size="large" tip="正在加载工作台..." />
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="dashboard-preview-error">
        <Result
          status="error"
          title="加载失败"
          subTitle={error || '未找到工作台数据'}
          extra={[
            <Button key="back" onClick={() => navigate(-1)}>
              返回
            </Button>,
            <Button key="home" type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>,
          ]}
        />
      </div>
    )
  }

  return <DashboardCanvasRenderer dashboardData={dashboardData} />
}

export default DashboardPreview
