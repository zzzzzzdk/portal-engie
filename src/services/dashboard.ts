// 仪表盘相关接口服务
import ajax from '../utils/axios.config';
import type { Widget, WidgetGroup, DashboardConfig } from '@/types';

// 发布请求参数
export interface PublishDashboardParams {
  id?: string;
  title?: string; // 仪表盘标题
  widgets: Widget[];
  groups: WidgetGroup[];
  floatingModules: Widget[];
  dashboardConfig?: DashboardConfig;
}

// 发布响应
export interface PublishDashboardResponse {
  id: string;
  publishTime: string;
  success: boolean;
}

// 发布列表项
export interface PublishListItem {
  id: string;
  title: string;
  publishTime: string;
}

// 分页请求参数
export interface PublishListParams {
  page: number;
  page_size: number;
  keyword?: string;
}

// 分页响应
export interface PublishListResponse {
  list: PublishListItem[];
  total: number;
  page: number;
  page_size: number;
}

// 发布的仪表盘详情
export interface PublishedDashboard {
  id: string;
  name: string;
  publishTime: string;
  widgets: Widget[];
  groups: WidgetGroup[];
  floatingModules: Widget[];
  dashboardConfig?: DashboardConfig;
}

/**
 * 发布仪表盘
 * @param data 仪表盘数据
 * @returns 发布结果
 */
export const publishDashboard = (data: PublishDashboardParams) => {
  return ajax<PublishDashboardResponse>({
    method: 'post',
    url: '/v1/dashboard/publish',
    data,
  });
};

/**
 * 获取发布列表
 * @param params 分页参数
 * @returns 发布列表
 */
export const getPublishList = (params: PublishListParams) => {
  return ajax<PublishListResponse>({
    method: 'get',
    url: '/v1/dashboard/publish/list',
    params,
  });
};

/**
 * 获取发布的仪表盘详情
 * @param id 发布ID
 * @returns 仪表盘详情数据
 */
export const getPublishedDashboard = (data: {id: string}) => {
  return ajax<PublishedDashboard>({
    method: 'get',
    url: `/v1/dashboard/publish`,
    data: data
  });
};

/**
 * 删除已发布的仪表盘
 * @param id 发布ID
 * @returns 删除结果
 */
export const deletePublishedDashboard = (data: {id: string}) => {
  return ajax<{ success: boolean }>({
    method: 'post',
    url: `/v1/dashboard/publish/delete`,
    data: data
  });
};
