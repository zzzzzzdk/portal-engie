import captureDashboardCover from '@/utils/captureDashboardCover'
import { uploadImage } from '@/services/upload'

interface UploadDashboardCoverOptions {
  dashboardId?: string
  waitMs?: number
}

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [meta = '', base64 = ''] = dataUrl.split(',')
  const mimeType = meta.match(/data:(.*?);base64/)?.[1] || 'image/png'
  const binaryString = window.atob(base64)
  const bytes = new Uint8Array(binaryString.length)

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }

  return new File([bytes], filename, { type: mimeType })
}

const getCoverFilename = (dashboardId?: string) => {
  const suffix = dashboardId || Date.now().toString()
  return `dashboard-cover-${suffix}.png`
}

export const captureAndUploadDashboardCover = async ({
  dashboardId,
  waitMs = 80,
}: UploadDashboardCoverOptions = {}): Promise<string> => {
  const coverDataUrl = await captureDashboardCover({ waitMs })
  if (!coverDataUrl) {
    return ''
  }

  const coverFile = dataUrlToFile(coverDataUrl, getCoverFilename(dashboardId))
  const uploadResponse = await uploadImage(coverFile)

  if (!uploadResponse.data?.url) {
    throw new Error(uploadResponse.message || '封面上传失败')
  }

  return uploadResponse.data.url
}
