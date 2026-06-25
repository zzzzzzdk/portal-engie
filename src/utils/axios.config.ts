import axios, { AxiosRequestConfig } from 'axios'
import { isObject } from '@/utils/is'
import { message } from "antd";
import { getToken, removeToken } from "./cookie";
import omit from '@/utils/omit'
import { getApiBaseUrl, isDevelopment } from '@/config/env'
import { useSystemStore } from '@/store'

let destroy = false
export const getPageDestroy = () => destroy;
export const setPageDestroy = (flag: boolean) => {
  destroy = flag
}

// 动态获取 API 基础地址
// 开发环境：使用 Vite Proxy 代理到 localhost:3001
// 生产环境：从 index.html 的 window.__APP_CONFIG__ 中读取
axios.defaults.baseURL = getApiBaseUrl()
axios.defaults.timeout = 2 * 60 * 1000
axios.defaults.headers.common['Authorization'] = getToken() ?? ""

type Method = 'get' | 'post' | 'put' | 'delete' | 'patch'

interface AjaxDataProps extends AxiosRequestConfig {
  method?: Method;
  url: string;
  data?: any;
  onUploadProgress?: AxiosRequestConfig["onUploadProgress"];
  onGlobalLoading?: (loading: boolean) => void;
  silentErrorCodes?: number[];
}

// 泛型函数，接口，类
export interface ApiResponse<T, U = object> {
  status?: number;
  message?: string,
  data?: T;
  totalRecords?: number;
  usedTime?: number;
  personInfoData?: U
  personInfoDataRecords?: number //身份信息（以图）
  [key: string]: any;
}

window.cancelTokens = window.cancelTokens || [];

// 接口请求过慢的，添加全局loading
axios.interceptors.request.use(config => {
  // console.log(config)
  return config;
}, error => Promise.reject(error));

export const cancelAllRequests = () => {
  if (window.cancelTokens) {
    window.cancelTokens.forEach((source: any) => {
      source.cancel('Operation canceled due to route change.');
    });
    window.cancelTokens.length = 0; // 清空数组
  }
};

// 将pagesize存储到local storage，保证用户习惯统一
export const updatePageSize = (value?: string) => {
  const key = "STOREDPAGESIZE"
  if (value) {
    const oldVal = localStorage.getItem(key)
    if (value !== oldVal) localStorage.setItem(key, value);
  }
}

/**
 * @description ajax 请求
 * @param {Object} ajaxData 配置 ajax 请求的键值对集合U
 * @param {String} ajaxData.method 创建请求使用的方法
 * @param {String} ajaxData.url 请求服务器的 URL
 * @param {Object} ajaxData.data 与请求一起发送的 URL 参数
 */
// 类型T为返回数据Data的数据类型 U为响应的数据类型和data同级
function ajax<T = any, U = object>(ajaxData: AjaxDataProps) {
  return new Promise<ApiResponse<T, U>>((resolve, reject) => {
    if (!isObject(ajaxData)) {
      return reject(new Error('ajax请求配置错误'))
    }
    const method: Method = ajaxData.method || 'get'
    const url = ajaxData.url
    // let data = method === 'get' ? { params: ajaxData.data } : ajaxData.data
    const data =
      method === 'get' ?
        { params: ajaxData.data }
        :
        method === 'delete' || method === 'post' || method === 'put' ?
          { data: ajaxData.data }
          :
          ajaxData.data
    const axiosRequestConfig = omit(ajaxData, ['method', 'url', 'data', 'silentErrorCodes'])

    if (ajaxData.data?.pageSize) updatePageSize(ajaxData.data?.pageSize);

    const onUploadProgress = ajaxData.onUploadProgress
    axios({
      method,
      url,
      ...data,
      ...axiosRequestConfig,
      onUploadProgress: onUploadProgress,
      headers: { 'Frontend-Route': window.location.hash.split('?')[0] }
    })
      .then((res) => {
        switch (res.status) {
          case 200:
          case 201:
          case 202:
          case 204:

            if (ajaxData.onGlobalLoading) {
              cancelAllRequests()
              ajaxData.onGlobalLoading(false)
            }

            resolve({
              status: res.status,
              ...res.data
            })
            break
        }
      }).catch(err => {
        console.log(err)
        if (err.message && err.message === "canceled") {
          console.log('请求已取消')
          // Message.warning('请求已取消')
        }
        if (ajaxData.onGlobalLoading) {
          cancelAllRequests()
          ajaxData.onGlobalLoading(false)
        }
        const response = err.response || {}
        const msg = response.data ? response.data.message : "服务繁忙，请联系以萨运维人员处理。"
        const responseCode = response.data?.code
        const shouldSkipGlobalError = ajaxData.silentErrorCodes?.includes(responseCode)
        if (response.status && !shouldSkipGlobalError) {
          switch (response.status) {
            case 401:
              message.error("用户权限已失效！")
              // 清除 token
              removeToken()
              // 如果是在登录页,不需要重定向
              if (window.location.hash.indexOf('#/login') == -1) {
                // 从 Zustand store 获取系统配置
                const sysConfig = useSystemStore.getState().sysConfig
                const loginUrl = isDevelopment() ? '/#/login' : sysConfig?.login_url
                if (loginUrl) {
                  if (isDevelopment()) {
                    window.location.href = loginUrl
                  } else {
                    window.location.href = loginUrl + '&target_url=' + encodeURIComponent(window.location.href)
                  }
                }
              }
              break
            case 403:
              message.error(msg)
              break
            case 404:
              message.error(`${url}: ${response.statusText}`) 
              break
            case 400:
            case 405:
            case 406:
            case 408:
            case 409:
            case 410:
            case 413:
            case 414:
            case 415:
            case 429:
              message.error(msg)
              break
            case 500:
            case 503:
            case 504:
              message.error(msg)
              break
            default:
              // window.location.href = window.YISACONF.login_url
              message.error(response.statusText)
              break
          }
        }
        return reject(err)
      })
  })
}

export default ajax