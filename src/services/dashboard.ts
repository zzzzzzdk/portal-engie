// 工作台相关接口服务
import ajax from '../utils/axios.config';
import { getToken } from '@/utils/cookie';
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
  cover_url?: string;
  action: 'save_draft' | 'publish';
}

// 发布响应
export interface PublishDashboardResponse {
  id: string;
  publishTime?: string | null;
  success: boolean;
  status?: number;
  statusLabel?: string;
  updatedAt?: string;
  cover_url?: string;
  hasDraft?: boolean;
  hasPublished?: boolean;
}

// 发布列表项
export interface PublishListItem {
  id: string;
  title: string;
  publishedAt: string;
  updatedAt?: string;
  status: number;
  statusLabel?: string;
  componentCount?: number;
  cover_url?: string;
  hasDraft?: boolean;
  hasPublished?: boolean;
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
  publishedAt?: string;
  updatedAt?: string;
  coverUrl?: string;
  cover_url?: string;
  status?: number;
  statusLabel?: string;
  hasDraft?: boolean;
  hasPublished?: boolean;
}

// 解析后的工作台结构（供前端使用）
export interface PublishedDashboard extends DashboardSnapshot {
  id: string;
  title: string;
  publishTime?: string;
}

export interface SetHomepageResponse {
  dashboardId: string;
  setAt: string;
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
export const getPublishedDashboard = (data: { id: string; version?: 'draft' | 'published' }) => {
  return ajax<PublishedDashboardRecord>({
    method: 'get',
    url: `/v1/dashboard/publish`,
    data,
  });
};

/**
 * 删除已发布工作台
 */
export const deletePublishedDashboard = (data: {
  id: string;
  target?: 'draft' | 'published' | 'all';
}) => {
  return ajax<{ success: boolean }>({
    method: 'post',
    url: `/v1/dashboard/publish/delete`,
    data,
  });
};

export const setHomepageDashboard = (data: { id: string }) => {
  return ajax<SetHomepageResponse>({
    method: 'post',
    url: '/v1/dashboard/homepage/set',
    data,
  });
};

export const getCurrentHomepageDashboard = () => {
  return ajax<PublishedDashboardRecord | null>({
    method: 'get',
    url: '/v1/dashboard/homepage/current',
  });
};

/**
 * 导出进度回调
 */
export type ExportProgressCallback = (info: {
  phase: 'sending' | 'downloading' | 'done' | 'error';
  message: string;
}) => void;

/**
 * 导出已发布工作台（通过 dashboardId）
 * 后端通过 /export/render 接口渲染页面并返回 ZIP 文件
 */
export const exportPublishedDashboard = async (
  dashboardId: string,
  onProgress?: ExportProgressCallback
): Promise<void> => {
  onProgress?.({ phase: 'sending', message: '正在发送到服务端渲染...' });

  try {
    const token = getToken();
    const response = await fetch('/api/export/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': token } : {}),
      },
      body: JSON.stringify({ dashboardId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `请求失败: ${response.status}`);
    }

    // 下载 ZIP 文件
    onProgress?.({ phase: 'downloading', message: '正在下载渲染结果...' });

    const blob = await response.blob();

    // 获取响应头中的统计信息
    const duration = response.headers.get('X-Export-Duration');
    const resourceCount = response.headers.get('X-Export-Resources');

    // 从 dashboardId 推断标题（实际应该从后端返回）
    const title = '工作台';

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${title}_导出_${timestamp}.zip`;

    // 触发浏览器下载
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onProgress?.({
      phase: 'done',
      message: `导出完成！耗时: ${duration || '?'}s, 资源数: ${resourceCount || '?'}`,
    });
  } catch (error: any) {
    console.error('服务端导出失败:', error);
    onProgress?.({
      phase: 'error',
      message: error.message || '服务端导出失败',
    });
    throw error;
  }
};
