import { create } from 'zustand';
import type { FileInfo, PreviewInfo } from '@/types';
import { bucketApi, fileOpsApi } from '@/api/fileManager';

interface FileState {
  // 桶状态
  currentBucket: string;
  bucketLoading: boolean;

  // 文件状态
  files: FileInfo[];
  currentPath: string[];
  filesLoading: boolean;

  // 预览状态
  previewVisible: boolean;
  previewFile: FileInfo | null;
  previewInfo: PreviewInfo | null;
  previewLoading: boolean;

  // Actions
  fetchBucket: () => Promise<void>;

  fetchFiles: () => Promise<void>;
  navigateTo: (path: string[]) => void;
  enterFolder: (folderName: string) => void;
  goBack: () => void;

  uploadFile: (file: File) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteFile: (file: FileInfo) => Promise<void>;
  downloadFile: (file: FileInfo) => Promise<void>;

  openPreview: (file: FileInfo) => Promise<void>;
  closePreview: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  // 初始状态
  currentBucket: '',
  bucketLoading: false,

  files: [],
  currentPath: [],
  filesLoading: false,

  previewVisible: false,
  previewFile: null,
  previewInfo: null,
  previewLoading: false,

  // 获取当前用户的 bucket（接口返回数组，取第一个）
  fetchBucket: async () => {
    set({ bucketLoading: true });
    try {
      const buckets = await bucketApi.list();
      const bucketName = buckets?.[0]?.name;
      if (!bucketName) {
        console.error('[fetchBucket] 未获取到 bucket，接口返回:', buckets);
        return;
      }
      set({ currentBucket: bucketName, currentPath: [], files: [] });
      await get().fetchFiles();
    } catch (err) {
      console.error('[fetchBucket] 请求失败:', err);
    } finally {
      set({ bucketLoading: false });
    }
  },

  // 文件操作
  fetchFiles: async () => {
    const { currentBucket, currentPath } = get();
    if (!currentBucket) return;

    set({ filesLoading: true });
    try {
      const prefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
      const response = await fileOpsApi.list(currentBucket, prefix);
      set({ files: response.files });
    } finally {
      set({ filesLoading: false });
    }
  },

  navigateTo: (path: string[]) => {
    set({ currentPath: path });
    get().fetchFiles();
  },

  enterFolder: (folderName: string) => {
    const { currentPath } = get();
    set({ currentPath: [...currentPath, folderName] });
    get().fetchFiles();
  },

  goBack: () => {
    const { currentPath } = get();
    if (currentPath.length > 0) {
      set({ currentPath: currentPath.slice(0, -1) });
      get().fetchFiles();
    }
  },

  uploadFile: async (file: File) => {
    const { currentBucket, currentPath } = get();
    if (!currentBucket) return;

    const prefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
    await fileOpsApi.upload(currentBucket, file, prefix);
    await get().fetchFiles();
  },

  createFolder: async (name: string) => {
    const { currentBucket, currentPath } = get();
    if (!currentBucket) return;

    const prefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
    await fileOpsApi.createFolder(currentBucket, name, prefix);
    await get().fetchFiles();
  },

  deleteFile: async (file: FileInfo) => {
    const { currentBucket } = get();
    if (!currentBucket) return;

    await fileOpsApi.delete(currentBucket, file.path, file.is_dir);
    await get().fetchFiles();
  },

  downloadFile: async (file: FileInfo) => {
    const { currentBucket } = get();
    if (!currentBucket) return;

    const blob = await fileOpsApi.download(currentBucket, file.path);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // 预览操作
  openPreview: async (file: FileInfo) => {
    const { currentBucket } = get();
    if (!currentBucket) return;

    set({ previewVisible: true, previewFile: file, previewLoading: true });
    try {
      const previewInfo = await fileOpsApi.getPreviewUrl(currentBucket, file.path);
      set({ previewInfo });
    } finally {
      set({ previewLoading: false });
    }
  },

  closePreview: () => {
    set({ previewVisible: false, previewFile: null, previewInfo: null });
  },
}));
