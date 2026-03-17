/**
 * 页面导出 HTML 工具
 *
 * 使用 iframe 沙箱 + rrweb-snapshot 技术实现高质量的页面导出
 * 流程：创建iframe → 加载页面 → 处理图片/Canvas → 序列化DOM → 生成HTML
 */

import { snapshot, rebuild } from 'rrweb-snapshot';
import { message, Modal, Progress } from 'antd';

interface ExportOptions {
  /** 指定要导出的页面 URL（默认当前页面） */
  url?: string;
  /** 导出后的文件名 */
  fileName?: string;
  /** 进度回调 */
  onProgress?: (info: { phase: string; message: string; progress?: number }) => void;
}


/**
 * 处理字体文件：将 @font-face 中的字体转换为 base64
 */
async function processFonts(html: string): Promise<string> {
  // 匹配 @font-face 中的 src URL
  const fontUrlRegex = /src:s*url(['"]?([^'"()]+)['"]?)/g;
  
  const urls = [];
  let match;
  while ((match = fontUrlRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  
  if (urls.length === 0) return html;
  
  // 下载并转换每个字体文件
  for (const url of urls) {
    try {
      // 跳过 data: 开头的 base64
      if (url.startsWith('data:')) continue;
      
      const response = await fetch(url);
      if (!response.ok) continue;
      
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      // 替换 URL 为 base64
      html = html.replace(url, base64);
    } catch (e) {
      console.warn('处理字体失败:', url);
    }
  }
  
  return html;
}


/**
 * 下载图片并转换为 Blob
 */
async function downloadImage(imgUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(imgUrl);
    if (!response.ok) return null;
    return response.blob();
  } catch {
    return null;
  }
}

/**
 * 图片转换为 base64
 */
async function imageToBase64(imgUrl: string): Promise<string> {
  const blob = await downloadImage(imgUrl);
  if (!blob) return imgUrl;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(imgUrl);
    reader.readAsDataURL(blob);
  });
}

/**
 * 处理文档中的图片：转换为 base64
 */
async function processImages(doc: Document): Promise<void> {
  const images = doc.getElementsByTagName('img');
  const total = images.length;

  for (let i = 0; i < total; i++) {
    const img = images[i];
    const originalSrc = img.src;

    // 只处理 http/https URL 的图片（相对路径已由 rrweb-snapshot 处理）
    if (originalSrc.startsWith('http://') || originalSrc.startsWith('https://')) {
      try {
        const base64 = await imageToBase64(originalSrc);
        img.src = base64;
      } catch (e) {
        console.warn('处理图片失败:', originalSrc);
      }
    }
  }
}

/**
 * 处理 Canvas 元素：转换为 base64 图片
 * 专门用于处理 ECharts 等 Canvas 图表
 */
async function processCanvas(doc: Document): Promise<void> {
  const canvases = doc.getElementsByTagName('canvas');
  const total = canvases.length;

  for (let i = 0; i < total; i++) {
    const canvas = canvases[i];
    try {
      // 检查 canvas 是否有实际内容
      if (canvas.width === 0 || canvas.height === 0) continue;

      // 创建图片元素
      const img = doc.createElement('img');
      img.setAttribute('data-original-canvas', 'true');

      // 将 canvas 转换为 base64
      const dataUrl = canvas.toDataURL('image/png');
      img.src = dataUrl;

      // 复制 canvas 的尺寸
      img.width = canvas.width;
      img.height = canvas.height;

      // 复制样式
      if (canvas.style.cssText) {
        img.style.cssText = canvas.style.cssText;
      }

      // 复制 class 和 id
      if (canvas.id) img.id = canvas.id;
      if (canvas.className) img.className = canvas.className;

      // 保留 data-* 属性
      Array.from(canvas.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          img.setAttribute(attr.name, attr.value);
        }
      });

      // 替换 canvas
      if (canvas.parentNode) {
        canvas.parentNode.replaceChild(img, canvas);
      }
    } catch (e) {
      console.warn('处理 canvas 失败:', e);
    }
  }
}

/**
 * 创建导出用的 iframe 沙箱
 */
function createExportIframe(): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = `${window.innerWidth}px`;
  iframe.style.height = `${window.innerHeight}px`;
  iframe.style.visibility = 'hidden';
  iframe.style.opacity = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);
  return iframe;
}

/**
 * 等待 iframe 加载完成
 */
function waitForIframeLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error('iframe 加载失败'));
    // 超时保护
    setTimeout(() => reject(new Error('iframe 加载超时')), 30000);
  });
}

/**
 * 等待页面渲染完成
 */
function waitForRenderComplete(iframeDoc: Document, timeout = 15000): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkReady = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        // 最后等待一小段时间确保动画完成
        setTimeout(resolve, 2000);
        return;
      }

      // 检查关键元素是否渲染完成（网格容器或内容区域）
      const gridContainer = iframeDoc.querySelector('.grid-stack, [class*="grid-container"], .grid-stack-item');
      if (gridContainer) {
        // 网格已渲染，再等待一段时间确保图表也渲染完成
        setTimeout(resolve, 3000);
      } else {
        setTimeout(checkReady, 500);
      }
    };

    checkReady();
  });
}

/**
 * 导出页面为 HTML 文件
 */
export async function exportPageAsHtml(options: ExportOptions = {}): Promise<void> {
  const { url, fileName, onProgress } = options;

  const updateProgress = (phase: string, message: string, progress?: number) => {
    onProgress?.({ phase, message, progress });
    console.log(`[导出] ${phase}: ${message}`);
  };

  updateProgress('init', '正在准备导出...');

  let iframe: HTMLIFrameElement | null = null;

  try {
    // 1. 创建 iframe 沙箱
    updateProgress('iframe', '正在创建导出环境...');
    iframe = createExportIframe();

    // 2. 加载页面
    updateProgress('loading', '正在加载页面...');
    iframe.src = url || window.location.href;

    // 3. 等待 iframe 加载
    await waitForIframeLoad(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('无法获取 iframe 文档');
    }

    // 4. 等待页面渲染完成
    updateProgress('render', '正在等待页面渲染...');
    await waitForRenderComplete(iframeDoc);

    // 5. 处理图片（转换为 base64）
    updateProgress('images', '正在处理图片...');
    await processImages(iframeDoc);

    // 6. 处理 Canvas（ECharts 图表转换为图片）
    updateProgress('canvas', '正在处理图表...');
    await processCanvas(iframeDoc);

    // 7. 使用 rrweb-snapshot 序列化 DOM
    updateProgress('snapshot', '正在生成快照...');

    const serializedNodeId = snapshot(iframeDoc, {
      inlineStylesheet: true,
      inlineImages: false, // 图片已经在上面处理过了
      recordCanvas: false, // Canvas 已经在上面处理过了
      preserveWhiteSpace: true,
    });

    if (!serializedNodeId) {
      throw new Error('DOM 快照生成失败');
    }

    // 8. 重建 DOM
    rebuild(serializedNodeId, {
      doc: iframeDoc,
      cache: undefined as any,
      mirror: undefined as any,
    });

    // 9. 获取最终 HTML
    updateProgress('generate', '正在生成 HTML 文件...');
    const finalHtml = await processFonts(iframeDoc.documentElement.outerHTML);

    // 10. 触发下载
    updateProgress('download', '正在下载...');

    const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || `dashboard_export_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    updateProgress('done', '导出完成！');
    message.success('导出成功！');

  } catch (error: any) {
    console.error('导出失败:', error);
    updateProgress('error', `导出失败: ${error.message}`);
    message.error(`导出失败: ${error.message}`);
    throw error;
  } finally {
    // 11. 清理 iframe
    if (iframe) {
      try {
        iframe.remove();
      } catch (e) {
        // 忽略清理错误
      }
    }
  }
}

/**
 * 导出页面为 HTML（带进度条 UI）
 */
export async function exportPageWithProgress(options?: ExportOptions): Promise<void> {
  

  let progress = 0;
  let status: 'normal' | 'exception' | 'active' | 'success' = 'normal';
  let info = '准备中...';

  const modal = Modal.info({
    title: '导出 HTML 页面',
    icon: null,
    content: (
      <div style={{ padding: '10px 0' }}>
        <Progress percent={progress} status={status} />
        <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>{info}</div>
      </div>
    ),
    okText: '取消',
    okButtonProps: { style: { display: 'none' } },
    maskClosable: false,
  });

  const updateProgressBar = (p: number, s: 'normal' | 'exception' | 'active' | 'success', i: string) => {
    progress = p;
    status = s;
    info = i;
    modal.update({
      content: (
        <div style={{ padding: '10px 0' }}>
          <Progress percent={progress} status={status} />
          <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>{info}</div>
        </div>
      ),
    });
  };

  try {
    await exportPageAsHtml({
      ...options,
      onProgress: ({ phase, message: msg, progress: prog }) => {
        const progressMap: Record<string, number> = {
          init: 5,
          iframe: 10,
          loading: 20,
          render: 40,
          images: 55,
          canvas: 70,
          snapshot: 85,
          generate: 90,
          download: 95,
          done: 100,
          error: 0,
        };

        const progressValue = progressMap[phase] ?? prog ?? 0;
        const statusVal = phase === 'error' ? 'exception' : phase === 'done' ? 'success' : 'active';

        updateProgressBar(progressValue, statusVal, msg);
      },
    });
  } finally {
    setTimeout(() => {
      modal.destroy();
    }, 1500);
  }
}

/**
 * 从应用列表导出指定的工作台
 * @param dashboardId 工作台 ID
 * @param fileName 导出后的文件名（可选）
 */
export async function exportDashboardFromList(dashboardId: string, fileName?: string): Promise<void> {
  const previewUrl = `${window.location.origin + window.location.pathname}#/preview/${dashboardId}`;
  console.log(previewUrl)
  await exportPageWithProgress({
    url: previewUrl,
    fileName: fileName || `工作台_${dashboardId}_${Date.now()}.html`,
  });
}
