import { useEffect, useRef, useState, useId } from 'react';
import { Spin, Result } from 'antd';
import { officeApi } from '@/api/fileManager';

interface OnlyOfficeEditorProps {
  bucket: string;
  filePath: string;
  fileName: string;
  mode?: 'edit' | 'view';
}

// 全局 SDK 加载状态管理
let sdkLoadPromise: Promise<void> | null = null;
let sdkLoadedUrl: string | null = null;

function loadOnlyOfficeSdk(onlyofficeUrl: string): Promise<void> {
  const scriptSrc = `${onlyofficeUrl}/web-apps/apps/api/documents/api.js`;

  // 如果已有相同 URL 的加载，直接复用
  if (sdkLoadPromise && sdkLoadedUrl === onlyofficeUrl) {
    return sdkLoadPromise;
  }

  // 如果已加载完成
  if (window.DocsAPI) {
    return Promise.resolve();
  }

  sdkLoadedUrl = onlyofficeUrl;
  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkLoadPromise = null;
      sdkLoadedUrl = null;
      reject(new Error(`OnlyOffice SDK 加载失败: ${scriptSrc}`));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

export default function OnlyOfficeEditor({ bucket, filePath, fileName, mode = 'view' }: OnlyOfficeEditorProps) {
  const uniqueId = useId();
  const containerId = `onlyoffice-editor-${uniqueId.replace(/:/g, '-')}`;
  const editorRef = useRef<{ destroyEditor: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;

    const initEditor = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 获取编辑器配置
        const { config, onlyoffice_url } = await officeApi.getConfig(bucket, filePath, mode);

        if (destroyed) return;

        // 2. 加载 OnlyOffice JS SDK
        await loadOnlyOfficeSdk(onlyoffice_url);

        if (destroyed) return;

        // 3. 确认 SDK 可用
        if (!window.DocsAPI) {
          throw new Error('OnlyOffice SDK 未正确加载');
        }

        // 4. 确认容器存在
        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error('编辑器容器未找到');
        }

        // 5. 初始化编辑器
        const editor = new window.DocsAPI.DocEditor(containerId, config);
        editorRef.current = editor;

        setLoading(false);
      } catch (err: any) {
        if (!destroyed) {
          console.error('OnlyOffice 初始化失败:', err);
          setError(err.message || '编辑器加载失败');
          setLoading(false);
        }
      }
    };

    initEditor();

    return () => {
      destroyed = true;
      if (editorRef.current) {
        try {
          editorRef.current.destroyEditor();
        } catch (e) {
          // 忽略销毁时的错误
        }
        editorRef.current = null;
      }
    };
  }, [bucket, filePath, fileName, mode, containerId]);

  if (error) {
    return (
      <div className="onlyoffice-editor-error">
        <Result
          status="error"
          title="编辑器加载失败"
          subTitle={error}
        />
      </div>
    );
  }

  return (
    <div className="onlyoffice-editor-wrapper">
      {loading && (
        <div className="onlyoffice-editor-loading">
          <Spin size="large" tip="正在加载编辑器..." />
        </div>
      )}
      <div
        id={containerId}
        className="onlyoffice-editor-container"
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
}
