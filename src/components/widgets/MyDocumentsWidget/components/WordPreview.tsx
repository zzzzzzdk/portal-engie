import { useEffect, useRef, useState } from 'react';
import { Spin, message } from 'antd';
import { renderAsync } from 'docx-preview';

interface WordPreviewProps {
  url: string;
}

export default function WordPreview({ url }: WordPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      if (!containerRef.current) return;

      setLoading(true);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch document');
        }

        const blob = await response.blob();

        if (cancelled) return;

        containerRef.current.innerHTML = '';

        await renderAsync(blob, containerRef.current, undefined, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });
      } catch (err) {
        console.error('Failed to load Word document:', err);
        message.error('Word 文档加载失败');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="word-preview">
      <Spin spinning={loading}>
        <div ref={containerRef} className="word-container" />
      </Spin>
    </div>
  );
}
