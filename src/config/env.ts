/**
 * 环境配置文件
 * 统一管理全局配置变量
 */

// 全局配置接口定义
interface AppConfig {
  API_BASE_URL: string;
  APP_NAME?: string;
  VERSION?: string;
  [key: string]: any;
}

// 扩展 Window 接口
declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

/**
 * 获取 API 基础地址
 * 优先级：
 * 1. window.__APP_CONFIG__.API_BASE_URL (生产环境在 index.html 中配置)
 * 2. 默认值 '/api' (开发环境会被 Vite Proxy 代理)
 */
export const getApiBaseUrl = (): string => {
  return window.__APP_CONFIG__?.API_BASE_URL || '/api'
}

/**
 * 获取 MinIO 文件管理服务地址
 * 优先级：
 * 1. window.__APP_CONFIG__.MINIO_API_URL (生产环境在 index.html 中配置)
 * 2. 默认值 '/minio-api' (开发环境会被 Vite Proxy 代理)
 */
export const getMinioApiUrl = (): string => {
  return window.__APP_CONFIG__?.MINIO_API_URL || '/minio-api'
}

/**
 * 获取应用名称
 */
export const getAppName = (): string => {
  return window.__APP_CONFIG__?.APP_NAME || '极光训推用一体平台'
}

/**
 * 获取应用版本
 */
export const getAppVersion = (): string => {
  return window.__APP_CONFIG__?.VERSION || '1.0.0'
}

/**
 * 获取完整的全局配置对象
 */
export const getAppConfig = (): AppConfig => {
  return window.__APP_CONFIG__ || {
    API_BASE_URL: '/api'
  }
}

/**
 * 判断是否为开发环境
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV
}

/**
 * 判断是否为生产环境
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD
}

// 导出常用配置
export const API_BASE_URL = getApiBaseUrl()
export const APP_NAME = getAppName()
export const APP_VERSION = getAppVersion()
