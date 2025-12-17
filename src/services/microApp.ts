// 微应用配置相关接口服务
import ajax from '../utils/axios.config';
import type { MicroAppMetadata } from '@/types';

// ============================================
// 类型定义
// ============================================

// 应用保存参数
export interface AppSaveParams {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  category: string;
}

// 模块保存参数
export interface ModuleSaveParams {
  id?: string;
  app_id: string;
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
  id?: string;
  module_id: string;
  event_type: 'emittableEvents' | 'listenableEvents';
  type: string;
  name: string;
  description?: string;
}

// 删除参数
export interface DeleteParams {
  id: string;
  type: 'app' | 'module' | 'event';
}

// ============================================
// 接口方法
// ============================================

/**
 * 获取微应用列表
 * @returns 微应用配置数据
 */
export const getMicroAppList = () => {
  return ajax<MicroAppMetadata>({
    method: 'get',
    url: '/v1/micro_apps/list',
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
