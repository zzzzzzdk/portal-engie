import JSZip from 'jszip'
import { Modal, Progress, message } from 'antd'
import { getPublishedDashboard, parseDashboardSnapshot } from '@/services'
import sanitizeDashboardConfig from '@/utils/dashboardConfig'
import { downloadBlob } from '@/utils/fileUtils'
import type { ExportRuntimePayload } from '@/types/export-runtime'

interface InteractiveExportOptions {
  dashboardId: string
  fileName?: string
  version?: 'draft' | 'published'
  onProgress?: (info: { phase: string; message: string; progress?: number }) => void
}

interface ExportRuntimeManifest {
  version: string
  files: string[]
}

const EXPORT_RUNTIME_DIR = 'export-runtime'
const RUNTIME_SCRIPT_FILE = 'static/export-runtime.js'
const RUNTIME_STYLE_FILE = 'static/export-runtime.css'

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeInlineScriptContent(content: string): string {
  return content.replace(/<\/script/gi, '<\\/script')
}

function escapeInlineStyleContent(content: string): string {
  return content.replace(/<\/style/gi, '<\\/style')
}

function getExportRuntimeBaseUrl(): URL {
  const currentDocumentUrl = window.location.href.split('#')[0]
  return new URL(`./${EXPORT_RUNTIME_DIR}/`, currentDocumentUrl)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`资源请求失败: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`资源请求失败: ${response.status} ${response.statusText}`)
  }

  return response.blob()
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`资源请求失败: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

function buildDashboardDataScript(payload: ExportRuntimePayload): string {
  const json = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

  return `window.__PORTAL_EXPORT_DATA__ = ${json};`
}

function buildRuntimeBootstrapScript(): string {
  return [
    'window.global = window.global || window;',
    'window.process = window.process || { env: { NODE_ENV: "production" } };',
  ].join('\n')
}

function buildPayload(args: {
  dashboardId: string
  title: string
  publishTime?: string
  widgets: ExportRuntimePayload['dashboard']['widgets']
  groups: ExportRuntimePayload['dashboard']['groups']
  floatingModules: ExportRuntimePayload['dashboard']['floatingModules']
  dashboardConfig?: ExportRuntimePayload['dashboard']['dashboardConfig']
}): ExportRuntimePayload {
  return {
    version: '1.0.0',
    runtime: 'export-runtime-v1',
    meta: {
      title: args.title,
      dashboardId: args.dashboardId,
      exportedAt: new Date().toISOString(),
      publishTime: args.publishTime,
    },
    options: {
      microAppMode: 'degrade',
    },
    dashboard: {
      widgets: args.widgets,
      groups: args.groups,
      floatingModules: args.floatingModules,
      dashboardConfig: args.dashboardConfig,
    },
  }
}

async function loadRuntimeManifest(): Promise<{
  manifest: ExportRuntimeManifest
  baseUrl: URL
}> {
  const baseUrl = getExportRuntimeBaseUrl()
  const manifestUrl = new URL('./asset-manifest.json', baseUrl).toString()
  const manifest = await fetchJson<ExportRuntimeManifest>(manifestUrl)

  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error('导出运行时资源清单为空')
  }

  return { manifest, baseUrl }
}

function buildOfflineHtml(args: {
  title: string
  runtimeBootstrapScript: string
  dashboardDataScript: string
  runtimeStyle: string
  runtimeScript: string
}): string {
  const { title, runtimeBootstrapScript, dashboardDataScript, runtimeStyle, runtimeScript } = args

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <title>${escapeHtml(title || '工作台导出包')}</title>`,
    '    <style>',
    escapeInlineStyleContent(runtimeStyle),
    '    </style>',
    '  </head>',
    '  <body>',
    '    <div id="root"></div>',
    '    <script>',
    escapeInlineScriptContent(runtimeBootstrapScript),
    '    </script>',
    '    <script>',
    escapeInlineScriptContent(dashboardDataScript),
    '    </script>',
    '    <script>',
    escapeInlineScriptContent(runtimeScript),
    '    </script>',
    '  </body>',
    '</html>',
    '',
  ].join('\n')
}

async function addRuntimeAssetsToZip(args: {
  zip: JSZip
  manifest: ExportRuntimeManifest
  baseUrl: URL
  onProgress?: InteractiveExportOptions['onProgress']
}) {
  const { zip, manifest, baseUrl, onProgress } = args
  const assetFiles = manifest.files.filter(file => {
    return ![RUNTIME_SCRIPT_FILE, RUNTIME_STYLE_FILE, 'index.html'].includes(file)
  })

  const total = assetFiles.length

  for (let index = 0; index < total; index += 1) {
    const file = assetFiles[index]
    const assetUrl = new URL(file, baseUrl).toString()

    onProgress?.({
      phase: 'assets',
      message: `正在打包模板资源 (${index + 1}/${total})`,
      progress: 30 + Math.round(((index + 1) / Math.max(total, 1)) * 50),
    })

    const blob = await fetchBlob(assetUrl)
    zip.file(file, blob)
  }
}

export async function exportInteractiveDashboardPackage(
  options: InteractiveExportOptions,
): Promise<void> {
  const { dashboardId, fileName, onProgress, version = 'published' } = options

  const updateProgress = (phase: string, text: string, progress?: number) => {
    onProgress?.({ phase, message: text, progress })
    console.log(`[交互包导出] ${phase}: ${text}`)
  }

  updateProgress('init', '正在准备导出交互包...', 5)

  const res = await getPublishedDashboard({ id: dashboardId, version })
  if (!res.data) {
    throw new Error(res.message || '获取工作台数据失败')
  }

  updateProgress('data', '正在解析工作台配置...', 12)

  const snapshot = parseDashboardSnapshot(res.data.dashboardConfig)
  if (!snapshot) {
    throw new Error('解析工作台配置失败')
  }

  const dashboardConfig = sanitizeDashboardConfig(snapshot.dashboardConfig || {})
  const payload = buildPayload({
    dashboardId: res.data.id,
    title: res.data.title || `工作台_${res.data.id}`,
    publishTime: res.data.publishTime,
    widgets: snapshot.widgets,
    groups: snapshot.groups,
    floatingModules: snapshot.floatingModules,
    dashboardConfig,
  })

  updateProgress('manifest', '正在加载导出模板...', 18)
  const { manifest, baseUrl } = await loadRuntimeManifest()

  updateProgress('runtime', '正在读取运行时资源...', 24)
  const [runtimeStyle, runtimeScript] = await Promise.all([
    fetchText(new URL(`./${RUNTIME_STYLE_FILE}`, baseUrl).toString()),
    fetchText(new URL(`./${RUNTIME_SCRIPT_FILE}`, baseUrl).toString()),
  ])

  const packageName = sanitizeFileName(
    fileName || `${payload.meta.title || '工作台'}_${dashboardId}_交互包.zip`,
  )
  const rootName = sanitizeFileName((packageName || 'portal-export').replace(/\.zip$/i, ''))
  const zip = new JSZip()
  const folder = zip.folder(rootName)

  if (!folder) {
    throw new Error('创建压缩包目录失败')
  }

  updateProgress('html', '正在生成离线入口页...', 28)
  folder.file(
    'index.html',
    buildOfflineHtml({
      title: payload.meta.title,
      runtimeBootstrapScript: buildRuntimeBootstrapScript(),
      dashboardDataScript: buildDashboardDataScript(payload),
      runtimeStyle,
      runtimeScript,
    }),
  )

  await addRuntimeAssetsToZip({
    zip: folder,
    manifest,
    baseUrl,
    onProgress,
  })

  updateProgress('zip', '正在生成压缩包...', 90)
  const blob = await zip.generateAsync({ type: 'blob' })

  updateProgress('download', '正在下载导出文件...', 96)
  downloadBlob(blob, packageName.endsWith('.zip') ? packageName : `${packageName}.zip`)

  updateProgress('done', '交互包导出完成', 100)
  message.success('交互包导出成功')
}

export async function exportInteractiveDashboardPackageWithProgress(
  options: InteractiveExportOptions,
): Promise<void> {
  let progress = 0
  let status: 'normal' | 'exception' | 'active' | 'success' = 'normal'
  let info = '准备中...'

  const modal = Modal.info({
    title: '导出交互包',
    icon: null,
    content: (
      <div style={{ padding: '10px 0' }}>
        <Progress percent={progress} status={status} />
        <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>{info}</div>
      </div>
    ),
    okText: '关闭',
    okButtonProps: { style: { display: 'none' } },
    maskClosable: false,
  })

  const updateProgressBar = (
    nextProgress: number,
    nextStatus: 'normal' | 'exception' | 'active' | 'success',
    nextInfo: string,
  ) => {
    progress = nextProgress
    status = nextStatus
    info = nextInfo

    modal.update({
      content: (
        <div style={{ padding: '10px 0' }}>
          <Progress percent={progress} status={status} />
          <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>{info}</div>
        </div>
      ),
    })
  }

  try {
    await exportInteractiveDashboardPackage({
      ...options,
      onProgress: ({ phase, message: nextInfo, progress: nextProgress }) => {
        const statusValue =
          phase === 'error' ? 'exception' : phase === 'done' ? 'success' : 'active'
        updateProgressBar(nextProgress ?? progress, statusValue, nextInfo)
      },
    })
  } catch (error: any) {
    updateProgressBar(0, 'exception', error?.message || '交互包导出失败')
    message.error(`交互包导出失败: ${error?.message || '未知错误'}`)
    throw error
  } finally {
    window.setTimeout(() => {
      modal.destroy()
    }, 1500)
  }
}

export async function exportInteractiveDashboardFromList(
  dashboardId: string,
  fileName?: string,
  version: 'draft' | 'published' = 'published',
): Promise<void> {
  await exportInteractiveDashboardPackageWithProgress({
    dashboardId,
    fileName,
    version,
  })
}
