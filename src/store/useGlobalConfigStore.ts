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
