import React, { useEffect, useMemo, useState } from 'react'
import { Button, Result, Spin } from 'antd'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getPublishedDashboard, parseDashboardSnapshot, type PublishedDashboard } from '@/services'
import { useConfigStore } from '@/store/useConfigStore'
import { useStore } from '@/store/useStore'
import { PortalRuntimeProvider, type PortalMicroAppMode } from '@/runtime/portal-runtime-context'
import { CanvasThemeProvider } from '@/theme/CanvasThemeProvider'
import sanitizeDashboardConfig from '@/utils/dashboardConfig'
import { isValidCssGradient } from '@/components/BackgroundSettings'
import { buildAutoMobileLayout } from './mobile-layout'
import MobileWidgetAdapter from './MobileWidgetAdapter'
import MobileGroupAdapter from './MobileGroupAdapter'
import MobileFloatingModuleSection from './MobileFloatingModuleSection'
import './index.scss'

const MobileDashboardPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setEditMode } = useStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<PublishedDashboard | null>(null)
  const canvasRef = React.useRef<HTMLDivElement>(null)

  const version = searchParams.get('version') === 'draft' ? 'draft' : 'published'
  const microAppMode: PortalMicroAppMode = searchParams.get('microAppMode') === 'live'
    ? 'live'
    : 'degrade'

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
        setError(null)

        const res = await getPublishedDashboard({ id, version })
        if (!res.data) {
          setError(res.message || '获取工作台数据失败')
          return
        }

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
      } catch (requestError) {
        console.error('获取移动端工作台数据失败:', requestError)
        setError('获取工作台数据失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    void fetchDashboard()
  }, [id, setEditMode, version])

  const mobileLayout = useMemo(
    () => buildAutoMobileLayout(dashboardData?.widgets || [], dashboardData?.groups || []),
    [dashboardData?.groups, dashboardData?.widgets],
  )

  const widgetMap = useMemo(
    () => new Map((dashboardData?.widgets || []).map(widget => [widget.id, widget])),
    [dashboardData?.widgets],
  )

  const groupMap = useMemo(
    () => new Map((dashboardData?.groups || []).map(group => [group.id, group])),
    [dashboardData?.groups],
  )

  const pageStyle = useMemo(() => {
    const dashboardConfig = dashboardData?.dashboardConfig
    const style: React.CSSProperties = {}

    if (!dashboardConfig) {
      return style
    }

    if (dashboardConfig.backgroundType === 'image' && dashboardConfig.backgroundImage) {
      style.backgroundImage = `url(${dashboardConfig.backgroundImage})`
      style.backgroundSize = dashboardConfig.backgroundSize || 'cover'
      style.backgroundPosition = dashboardConfig.backgroundPosition || 'center'
      style.backgroundRepeat = dashboardConfig.backgroundRepeat || 'no-repeat'
    } else if (
      dashboardConfig.backgroundType === 'gradient' &&
      dashboardConfig.backgroundGradient &&
      isValidCssGradient(dashboardConfig.backgroundGradient)
    ) {
      style.background = dashboardConfig.backgroundGradient
    } else if (dashboardConfig.backgroundType === 'color' && dashboardConfig.backgroundColor) {
      style.backgroundColor = dashboardConfig.backgroundColor
    }

    return style
  }, [dashboardData?.dashboardConfig])

  if (loading) {
    return (
      <div className="mobile-dashboard-preview-state">
        <Spin size="large" tip="正在加载工作台..." />
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="mobile-dashboard-preview-state">
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

  return (
    <PortalRuntimeProvider value={{ mode: 'mobile-runtime', microAppMode }}>
      <CanvasThemeProvider containerRef={canvasRef} overrideConfig={dashboardData.dashboardConfig}>
        <main ref={canvasRef} className="mobile-dashboard-preview" style={pageStyle}>
          <div className="mobile-dashboard-preview__viewport">
            {mobileLayout.map(item => {
              if (!item.visible) {
                return null
              }

              if (item.type === 'group') {
                const group = groupMap.get(item.groupId)
                if (!group) {
                  return null
                }

                return (
                  <MobileGroupAdapter
                    key={item.groupId}
                    group={group}
                    item={item}
                    widgetMap={widgetMap}
                    dashboardConfig={dashboardData.dashboardConfig}
                  />
                )
              }

              const widget = widgetMap.get(item.widgetId)
              if (!widget) {
                return null
              }

              return (
                <MobileWidgetAdapter
                  key={item.widgetId}
                  widget={widget}
                  item={item}
                  dashboardConfig={dashboardData.dashboardConfig}
                />
              )
            })}

            <MobileFloatingModuleSection
              modules={dashboardData.floatingModules}
              dashboardConfig={dashboardData.dashboardConfig}
            />
          </div>
        </main>
      </CanvasThemeProvider>
    </PortalRuntimeProvider>
  )
}

export default MobileDashboardPreview
