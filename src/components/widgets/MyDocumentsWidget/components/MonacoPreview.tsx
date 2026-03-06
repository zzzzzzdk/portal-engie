import { useState, useEffect, useRef } from 'react';
import { Spin, Button, Space, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import Editor, { loader } from '@monaco-editor/react';
import { getMonacoLanguage } from '@/utils/fileUtils';
import { fileOpsApi } from '@/api/fileManager';

// 内网环境：从 public 目录加载 Monaco 静态资源，不走 CDN，不打入 bundle
loader.config({
  paths: { vs: './static/js/monaco-editor-vs' },
});

interface MonacoPreviewProps {
  url: string;
  fileName: string;
  filePath: string;
  bucket: string;
  canEdit?: boolean;
}

export default function MonacoPreview({ url, fileName, filePath, bucket, canEdit = false }: MonacoPreviewProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalContentRef = useRef<string>('');

  const language = getMonacoLanguage(fileName);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setEdited(false);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        setContent(text);
        originalContentRef.current = text;
      })
      .catch((err) => {
        console.error('Failed to load file:', err);
        setError('文件内容加载失败');
        message.error('文件内容加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [url]);

  const handleChange = (value: string | undefined) => {
    const newValue = value || '';
    setContent(newValue);
    setEdited(newValue !== originalContentRef.current);
  };

  const handleSave = async () => {
    if (!bucket || !filePath) return;

    setSaving(true);
    try {
      // 从 filePath 中提取目录前缀（upload 接口需要 prefix + filename）
      const lastSlash = filePath.lastIndexOf('/');
      const prefix = lastSlash >= 0 ? filePath.substring(0, lastSlash + 1) : '';

      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], fileName, { type: 'text/plain' });

      await fileOpsApi.upload(bucket, file, prefix);
      originalContentRef.current = content;
      setEdited(false);
      message.success('保存成功');
    } catch (err: any) {
      message.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="monaco-preview-loading">
        <Spin size="large" tip="加载文件内容..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="monaco-preview-error">
        {error}
      </div>
    );
  }

  return (
    <div className="monaco-preview">

      <Editor
        height={canEdit ? 'calc(70vh - 40px)' : '70vh'}
        language={language}
        value={content}
        onChange={handleChange}
        options={{
          readOnly: !canEdit,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
        }}
      />
      {canEdit && (
        <div className="monaco-toolbar">
          <Space>
            {edited && <span className="monaco-edit-hint">内容已修改</span>}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!edited}
              size="small"
            >
              保存
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
}
