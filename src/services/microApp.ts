// 微应用配置相关接口服务
import ajax from '../utils/axios.config';
import axios from 'axios';
import type { MicroAppMetadata, MicroAppSystem } from '@/types';

// ============================================
// 类型定义
// ============================================

// 应用保存参数
export interface AppSaveParams {
  id?: string;       // 数据库ID（编辑时必填，由接口返回）
  systemId: string;  // 用户输入的系统标识符
  name: string;
  description?: string;
  icon?: string;
  category: string;
}

// 模块保存参数
export interface ModuleSaveParams {
  id?: string;       // 数据库ID（编辑时必填，由接口返回）
  moduleId: string;  // 用户输入的模块标识符
  systemId: string;  // 所属系统标识符
  name: string;
  description?: string;
  url: string;
  entry: string;
  icon?: string;
  defaultSize?: { w: number; h: number };
  forceIconOnly?: boolean;
  iconSvg?: string;
}

// 事件保存参数
export interface EventSaveParams {
  id?: string;       // 数据库ID（编辑时必填，由接口返回）
  moduleId: string;  // 所属模块标识符
  event_type: 'emittableEvents' | 'listenableEvents';
  type: string;
  name: string;
  description?: string;
}

// 删除参数
export interface DeleteParams {
  id: string;        // 数据库ID
  type: 'app' | 'module' | 'event';
}

export interface ImportConfigResult {
  success: boolean;
  version?: string;
  appCount?: number;
  moduleCount?: number;
  importedAt?: string;
}

export interface ExportConfigDownload {
  download_url: string;
}

export interface MicroAppListParams {
  page?: number;
  page_size?: number;
  all?: boolean;
  keyword?: string;
}

export interface MicroAppListPageData {
  version: string;
  apps: MicroAppSystem[];
  page: number;
  page_size: number;
  total: number;
}

// ============================================
// 接口方法
// ============================================

/**
 * 获取微应用列表
 * @returns 微应用配置数据
 */
export const getMicroAppList = (params?: MicroAppListParams) => {
  return ajax<MicroAppMetadata | MicroAppListPageData>({
    method: 'get',
    url: '/v1/micro_apps/list',
    data: params,
  });
};

/**
 * 保存/编辑应用
 * @param data 应用数据
 * @returns 保存结果
 */
export const saveApp = (data: AppSaveParams) => {
  return ajax<{ success: boolean; id: string }>({
    method: 'post',
    url: '/v1/micro_apps/app-save',
    data,
  });
};

/**
 * 保存/编辑模块
 * @param data 模块数据
 * @returns 保存结果
 */
export const saveModule = (data: ModuleSaveParams) => {
  return ajax<{ success: boolean; id: string }>({
    method: 'post',
    url: '/v1/micro_apps/module-save',
    data,
  });
};

/**
 * 保存/编辑事件
 * @param data 事件数据
 * @returns 保存结果
 */
export const saveEvent = (data: EventSaveParams) => {
  return ajax<{ success: boolean; id: string }>({
    method: 'post',
    url: '/v1/micro_apps/event-save',
    data,
  });
};

/**
 * 删除应用/模块/事件
 * @param data 删除参数
 * @returns 删除结果
 */
export const deleteMicroAppItem = (data: DeleteParams) => {
  return ajax<{ success: boolean }>({
    method: 'post',
    url: '/v1/micro_apps/delete',
    data,
  });
};

/**
 * 导入微应用配置
 * @param file JSON 文件
 */
export const importMicroAppConfig = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return ajax<ImportConfigResult>({
    method: 'post',
    url: '/v1/micro_apps/import_config',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * 发起导出任务，返回下载链接
 */
export const exportMicroAppConfig = () => {
  return ajax<ExportConfigDownload>({
    method: 'get',
    url: '/v1/micro_apps/export_config',
  });
};

/**
 * 根据 download_url 下载导出文件
 */
export const downloadMicroAppConfig = (downloadUrl: string) => {
  const isAbsolute = /^https?:\/\//i.test(downloadUrl);
  const finalUrl = isAbsolute
    ? downloadUrl
    : downloadUrl.startsWith('/')
      ? downloadUrl
      : `/${downloadUrl}`;
  return axios.get(finalUrl, {
    responseType: 'blob',
  });
};
