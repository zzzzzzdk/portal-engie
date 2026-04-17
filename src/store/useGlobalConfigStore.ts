import { create } from 'zustand'
import { getGlobalConfigDetail, type GlobalConfigDetail } from '@/services'

interface GlobalConfigState {
  detail: GlobalConfigDetail | null
  setDetail: (detail: GlobalConfigDetail | null) => void
  refreshDetail: () => Promise<GlobalConfigDetail | null>
  ensureLoaded: () => Promise<GlobalConfigDetail | null>
}

let loadingPromise: Promise<GlobalConfigDetail | null> | null = null

const requestGlobalConfigDetail = async () => {
  const res = await getGlobalConfigDetail()
  if (res.code !== 20000 || !res.data) {
    throw new Error(res.message || '加载全局配置失败')
  }
  return res.data
}

export const useGlobalConfigStore = create<GlobalConfigState>((set, get) => ({
  detail: null,

  setDetail: detail => {
    set({ detail })
  },

  refreshDetail: async () => {
    if (!loadingPromise) {
      loadingPromise = requestGlobalConfigDetail()
        .then(detail => {
          // 如果 documentStorageUrl 为空，使用 index.html 中的 MINIO_API_URL 作为默认值
          if (!detail?.componentDataSource?.documentStorageUrl) {
            const defaultMinioUrl =
              (window as any).__APP_CONFIG__?.MINIO_API_URL || ''
            if (defaultMinioUrl) {
              detail.componentDataSource.documentStorageUrl = defaultMinioUrl
            }
          }
          set({ detail })
          return detail
        })
        .catch(error => {
          console.error('加载全局配置失败', error)
          return get().detail
        })
        .finally(() => {
          loadingPromise = null
        })
    }

    return loadingPromise
  },

  ensureLoaded: async () => {
    if (get().detail) {
      return get().detail
    }

    return get().refreshDetail()
  },
}))
