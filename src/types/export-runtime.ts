import type { DashboardConfig, Widget, WidgetGroup } from '@/types'

export interface ExportRuntimePayload {
  version: string
  runtime: string
  meta: {
    title: string
    dashboardId: string
    exportedAt: string
    publishTime?: string
  }
  options: {
    microAppMode: 'degrade'
  }
  dashboard: {
    widgets: Widget[]
    groups: WidgetGroup[]
    floatingModules: Widget[]
    dashboardConfig?: DashboardConfig
  }
}
