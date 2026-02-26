// 工作台相关接口服务
import ajax from '../utils/axios.config';
import type { Widget, WidgetGroup, DashboardConfig } from '@/types';

// 工作台快照：统一打包 widgets/groups/floatingModules/page config
export interface DashboardSnapshot {
  widgets: Widget[];
  groups: WidgetGroup[];
  floatingModules: Widget[];
  dashboardConfig?: DashboardConfig;
}

// 发布接口采用的新结构
export interface PublishDashboardParams {
  id?: string;
  title: string;
  dashboardConfig: string; // JSON 字符串
  status?: number;
  cover_url?: string;
}

// 发布响应
export interface PublishDashboardResponse {
  id: string;
  publishTime?: string | null;
  success: boolean;
  status?: number;
  cover_url?: string;
}

// 发布列表项
export interface PublishListItem {
  id: string;
  title: string;
  publishedAt: string;
  status?: number;
  componentCount?: number;
  cover_url?: string;
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

// 后端原始返回数据
export interface PublishedDashboardRecord {
  id: string;
  title: string;
  dashboardConfig: string;
  publishTime?: string;
  coverUrl?: string;
}

// 解析后的工作台结构（供前端使用）
export interface PublishedDashboard extends DashboardSnapshot {
  id: string;
  title: string;
  publishTime?: string;
}

// 序列化工作台快照
export const serializeDashboardSnapshot = (snapshot: DashboardSnapshot): string => {
  return JSON.stringify(snapshot);
};

// 反序列化工作台快照
export const parseDashboardSnapshot = (
  snapshotString?: string | null
): DashboardSnapshot | null => {
  if (!snapshotString || typeof snapshotString !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(snapshotString);
    return {
      widgets: Array.isArray(parsed.widgets) ? parsed.widgets : [],
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      floatingModules: Array.isArray(parsed.floatingModules) ? parsed.floatingModules : [],
      dashboardConfig: parsed.dashboardConfig || {},
    };
  } catch (error) {
    console.error('无法解析 dashboardConfig 字符串: ', error);
    return null;
  }
};

/**
 * 发布工作台
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
 */
export const getPublishList = (params: PublishListParams) => {
  return ajax<PublishListResponse>({
    method: 'get',
    url: '/v1/dashboard/publish/list',
    params,
  });
};

/**
 * 获取已发布工作台详情（原始结构）
 */
export const getPublishedDashboard = (data: { id: string }) => {
  return ajax<PublishedDashboardRecord>({
    method: 'get',
    url: `/v1/dashboard/publish`,
    data,
  });
};

/**
 * 删除已发布工作台
 */
export const deletePublishedDashboard = (data: { id: string }) => {
  return ajax<{ success: boolean }>({
    method: 'post',
    url: `/v1/dashboard/publish/delete`,
    data,
  });
};
