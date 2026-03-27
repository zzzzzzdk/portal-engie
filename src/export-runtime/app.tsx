import React, { useEffect, useMemo } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { Result } from 'antd'
import { useStore } from '@/store/useStore'
import { useConfigStore } from '@/store'
import type { PublishedDashboard } from '@/services'
import type { IBaseColors } from '@/theme/tokens/semantic'
import DashboardCanvasRenderer from '@/pages/DashboardPreview/dashboard-preview-renderer'
import { PortalRuntimeProvider } from '@/runtime/portal-runtime-context'
import { readExportRuntimePayload } from './runtime-env'

const ExportRuntimeApp: React.FC = () => {
  const payloadResult = useMemo(() => {
    try {
      return {
        payload: readExportRuntimePayload(),
        error: null,
      }
    } catch (error) {
      return {
        payload: null,
        error: error instanceof Error ? error.message : '导出数据加载失败',
      }
    }
  }, [])

  useEffect(() => {
    useStore.setState({ isEditMode: false })
  }, [])

  useEffect(() => {
    const baseColors = payloadResult.payload?.dashboard.dashboardConfig?.baseColors
    if (baseColors) {
      useConfigStore.setState({ baseColors: baseColors as IBaseColors })
    }
  }, [payloadResult.payload])

  if (!payloadResult.payload) {
    return (
      <Result
        status="error"
        title="导出页面加载失败"
        subTitle={payloadResult.error || '缺少 dashboard-data.js 或数据格式错误'}
      />
    )
  }

  const dashboardData: PublishedDashboard = {
    id: payloadResult.payload.meta.dashboardId,
    title: payloadResult.payload.meta.title,
    publishTime: payloadResult.payload.meta.publishTime,
    widgets: payloadResult.payload.dashboard.widgets,
    groups: payloadResult.payload.dashboard.groups,
    floatingModules: payloadResult.payload.dashboard.floatingModules,
    dashboardConfig: payloadResult.payload.dashboard.dashboardConfig,
  }

  return (
    <MemoryRouter>
      <PortalRuntimeProvider value={{ mode: 'export-runtime', microAppMode: 'degrade' }}>
        <div className="export-runtime-page">
          <div className="export-runtime-page__content">
            <DashboardCanvasRenderer dashboardData={dashboardData} />
          </div>
        </div>
      </PortalRuntimeProvider>
    </MemoryRouter>
  )
}

export default ExportRuntimeApp
