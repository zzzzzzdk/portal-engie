import { useEffect, useRef, useState, useCallback } from 'react';
import { Spin, Pagination, message } from 'antd';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface PdfPreviewProps {
  url: string;
}

export default function PdfPreview({ url }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale] = useState(1.5);

  const renderPage = useCallback(async (pageNum: number) => {
    const pdfDoc = pdfDocRef.current;
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        canvas: canvas,
        viewport: viewport,
      }).promise;
    } catch (err) {
      console.error('Failed to render page:', err);
      message.error('PDF 页面渲染失败');
    }
  }, [scale]);

  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      setLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelled) {
          pdf.destroy();
          return;
        }

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        await renderPage(1);
      } catch (err) {
        console.error('Failed to load PDF:', err);
        message.error('PDF 文件加载失败');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [url]);

  useEffect(() => {
    if (pdfDocRef.current && !loading) {
      renderPage(currentPage);
    }
  }, [currentPage, scale, renderPage, loading]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="pdf-preview" ref={containerRef}>
      <Spin spinning={loading}>
        <div className="pdf-container">
          <canvas ref={canvasRef} />
        </div>
      </Spin>
      {totalPages > 0 && (
        <div className="pdf-pagination">
          <Pagination
            current={currentPage}
            total={totalPages}
            pageSize={1}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total) => `共 ${total} 页`}
          />
        </div>
      )}
    </div>
  );
}
