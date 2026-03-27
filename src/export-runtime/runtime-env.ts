import type { ExportRuntimePayload } from '@/types/export-runtime'

export const EXPORT_RUNTIME_GLOBAL_KEY = '__PORTAL_EXPORT_DATA__'

export function readExportRuntimePayload(): ExportRuntimePayload {
  const payload = window.__PORTAL_EXPORT_DATA__

  if (!payload || typeof payload !== 'object') {
    throw new Error('未找到导出数据，请确认 dashboard-data.js 已正确加载')
  }

  if (!payload.dashboard || !Array.isArray(payload.dashboard.widgets) || !Array.isArray(payload.dashboard.groups)) {
    throw new Error('导出数据格式不正确，缺少 dashboard 配置')
  }

  return payload as ExportRuntimePayload
}
