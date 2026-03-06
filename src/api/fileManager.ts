import axios from 'axios';
import type {
  BucketInfo,
  FileListResponse,
  PreviewInfo,
  UploadResponse,
  DeleteResponse,
  FileInfo,
  OnlyOfficeConfigResponse,
} from '@/types';
import { getMinioApiUrl } from '@/config/env';

// 独立的 axios 实例，用于文件管理服务
// 开发环境通过 vite proxy 将 /minio-api 代理到 MinIO 后端 http://localhost:8000/api
// 生产环境通过 window.__APP_CONFIG__.MINIO_API_URL 配置，如 http://192.168.16.26:8010/api
const fileApi = axios.create({
  baseURL: getMinioApiUrl(),
  timeout: 30000,
});

fileApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

// 桶管理 API（接口返回当前用户的 bucket 数组，通常只有一个）
export const bucketApi = {
  list: (): Promise<BucketInfo[]> => fileApi.get('/buckets'),
};

// 文件管理 API
export const fileOpsApi = {
  list: (bucket: string, prefix = ''): Promise<FileListResponse> =>
    fileApi.get(`/files/${bucket}`, { params: { prefix } }),

  upload: (bucket: string, file: File, prefix = ''): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return fileApi.post(`/files/${bucket}/upload`, formData, {
      params: { prefix },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  createFolder: (
    bucket: string,
    folderName: string,
    prefix = ''
  ): Promise<{ success: boolean; message: string; path: string }> =>
    fileApi.post(`/files/${bucket}/folder`, null, {
      params: { folder_name: folderName, prefix },
    }),

  delete: (
    bucket: string,
    path: string,
    isDir = false
  ): Promise<DeleteResponse> =>
    fileApi.delete(`/files/${bucket}`, {
      params: { path, is_dir: isDir },
    }),

  download: (bucket: string, path: string): Promise<Blob> =>
    fileApi.get(`/files/${bucket}/download?path=${encodeURIComponent(path)}`, {
      responseType: 'blob',
    }),

  getPreviewUrl: (bucket: string, path: string): Promise<PreviewInfo> =>
    fileApi.get(`/files/${bucket}/preview`, { params: { path } }),

  getInfo: (bucket: string, path: string): Promise<FileInfo> =>
    fileApi.get(`/files/${bucket}/info`, { params: { path } }),
};

// OnlyOffice 编辑器配置 API
export const officeApi = {
  getConfig: (
    bucket: string,
    path: string,
    mode: 'edit' | 'view' = 'view',
    userId?: string,
    userName?: string
  ): Promise<OnlyOfficeConfigResponse> =>
    fileApi.get(`/office/config/${bucket}`, {
      params: { path, mode, user_id: userId, user_name: userName },
    }),
};
