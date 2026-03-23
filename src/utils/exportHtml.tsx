import { snapshot, rebuild } from 'rrweb-snapshot';
import { message, Modal, Progress } from 'antd';

interface ExportOptions {
  url?: string;
  fileName?: string;
  onProgress?: (info: { phase: string; message: string; progress?: number }) => void;
}

type ShadowHostElement = HTMLElement & {
  shadowRoot?: ShadowRoot | null;
};

async function processFonts(html: string): Promise<string> {
  const fontUrlRegex = /src:\s*url\(['"]?([^'"()]+)['"]?\)/g;
  const urls: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = fontUrlRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }

  if (!urls.length) {
    return html;
  }

  for (const url of urls) {
    try {
      if (url.startsWith('data:')) {
        continue;
      }

      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }

      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      html = html.replace(url, base64);
    } catch {
      console.warn('处理字体失败:', url);
    }
  }

  return html;
}

async function downloadImage(imgUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(imgUrl);
    if (!response.ok) {
      return null;
    }
    return response.blob();
  } catch {
    return null;
  }
}

async function imageToBase64(imgUrl: string): Promise<string> {
  const blob = await downloadImage(imgUrl);
  if (!blob) {
    return imgUrl;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(imgUrl);
    reader.readAsDataURL(blob);
  });
}

async function processImages(doc: Document): Promise<void> {
  const images = doc.getElementsByTagName('img');

  for (let i = 0; i < images.length; i += 1) {
    const img = images[i];
    const originalSrc = img.src;

    if (!originalSrc.startsWith('http://') && !originalSrc.startsWith('https://')) {
      continue;
    }

    try {
      img.src = await imageToBase64(originalSrc);
    } catch {
      console.warn('处理图片失败:', originalSrc);
    }
  }
}

async function processCanvas(doc: Document): Promise<void> {
  const canvases = doc.getElementsByTagName('canvas');

  for (let i = 0; i < canvases.length; i += 1) {
    const canvas = canvases[i];

    try {
      if (canvas.width === 0 || canvas.height === 0) {
        continue;
      }

      const img = doc.createElement('img');
      img.setAttribute('data-original-canvas', 'true');
      img.src = canvas.toDataURL('image/png');
      img.width = canvas.width;
      img.height = canvas.height;

      if (canvas.style.cssText) {
        img.style.cssText = canvas.style.cssText;
      }

      if (canvas.id) {
        img.id = canvas.id;
      }
      if (canvas.className) {
        img.className = canvas.className;
      }

      Array.from(canvas.attributes).forEach((attr) => {
        if (attr.name.startsWith('data-')) {
          img.setAttribute(attr.name, attr.value);
        }
      });

      canvas.parentNode?.replaceChild(img, canvas);
    } catch (error) {
      console.warn('处理 canvas 失败:', error);
    }
  }
}

function cloneNodeToDocument<T extends Node>(doc: Document, node: T): T {
  return doc.importNode(node, true) as T;
}

function appendStyleNodes(doc: Document, target: HTMLElement, sourceRoot: ParentNode) {
  const styleNodes = sourceRoot.querySelectorAll('style, link[rel="stylesheet"]');
  styleNodes.forEach((node) => {
    target.appendChild(cloneNodeToDocument(doc, node));
  });
}

function appendBodyChildren(doc: Document, target: HTMLElement, body: HTMLElement | null | undefined): boolean {
  if (!body) {
    return false;
  }

  let appended = false;
  Array.from(body.childNodes).forEach((node) => {
    if (node.nodeName.toLowerCase() === 'script') {
      return;
    }
    target.appendChild(cloneNodeToDocument(doc, node));
    appended = true;
  });

  return appended;
}

function processMicroApps(doc: Document): void {
  const microApps = Array.from(doc.querySelectorAll('wujie-app')) as ShadowHostElement[];

  microApps.forEach((microApp) => {
    const staticContainer = doc.createElement('div');
    staticContainer.className = 'wujie-app-static';
    staticContainer.setAttribute('data-export-static-micro-app', 'true');

    if (microApp.id) {
      staticContainer.id = microApp.id;
    }
    if (microApp.className) {
      staticContainer.className = `${staticContainer.className} ${microApp.className}`;
    }
    if (microApp.getAttribute('style')) {
      staticContainer.setAttribute('style', microApp.getAttribute('style') || '');
    }

    let appended = false;
    const shadowRoot = microApp.shadowRoot;

    if (shadowRoot) {
      appendStyleNodes(doc, staticContainer, shadowRoot);

      const shadowIframe = shadowRoot.querySelector('iframe') as HTMLIFrameElement | null;
      const iframeDoc = shadowIframe?.contentDocument;
      if (iframeDoc) {
        appendStyleNodes(doc, staticContainer, iframeDoc);
        appended = appendBodyChildren(doc, staticContainer, iframeDoc.body) || appended;
      }

      if (!appended) {
        Array.from(shadowRoot.childNodes).forEach((node) => {
          const nodeName = node.nodeName.toLowerCase();
          if (nodeName === 'style' || nodeName === 'iframe' || nodeName === 'script') {
            return;
          }
          staticContainer.appendChild(cloneNodeToDocument(doc, node));
          appended = true;
        });
      }
    }

    if (!appended) {
      const innerIframe = microApp.querySelector('iframe') as HTMLIFrameElement | null;
      const iframeDoc = innerIframe?.contentDocument;
      if (iframeDoc) {
        appendStyleNodes(doc, staticContainer, iframeDoc);
        appended = appendBodyChildren(doc, staticContainer, iframeDoc.body) || appended;
      }
    }

    if (appended) {
      microApp.replaceWith(staticContainer);
    }
  });
}

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

function waitForIframeLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('iframe 加载超时')), 30000);

    iframe.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };

    iframe.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('iframe 加载失败'));
    };
  });
}

function readDatasetNumber(doc: Document, key: string): number {
  const value = Number(doc.documentElement.dataset[key] || '0');
  return Number.isFinite(value) ? value : 0;
}

function waitForRenderComplete(iframeDoc: Document, timeout = 20000): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stableSince = 0;

    const checkReady = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        window.setTimeout(resolve, 1000);
        return;
      }

      const previewState = iframeDoc.documentElement.dataset.exportPreviewState;
      const hasPreviewRoot = Boolean(
        iframeDoc.querySelector('[data-export-root="dashboard-preview"], .grid-stack, .grid-stack-item')
      );
      const hasPreviewError = Boolean(iframeDoc.querySelector('.dashboard-preview-error'));
      const previewLoading = Boolean(iframeDoc.querySelector('.dashboard-preview-loading'));
      const expectedMicroAppCount = readDatasetNumber(iframeDoc, 'exportExpectedMicroAppCount');
      const registeredMicroAppCount = readDatasetNumber(iframeDoc, 'exportMicroAppCount');
      const pendingMicroAppCount = readDatasetNumber(iframeDoc, 'exportMicroAppPendingCount');

      const pageReady =
        !previewLoading &&
        (previewState === 'error' ? hasPreviewError : hasPreviewRoot) &&
        previewState !== 'loading';
      const microAppsReady =
        expectedMicroAppCount === 0 ||
        (registeredMicroAppCount >= expectedMicroAppCount && pendingMicroAppCount === 0);

      if (pageReady && microAppsReady) {
        if (!stableSince) {
          stableSince = Date.now();
        }

        if (Date.now() - stableSince >= 800) {
          resolve();
          return;
        }
      } else {
        stableSince = 0;
      }

      window.setTimeout(checkReady, 300);
    };

    checkReady();
  });
}

export async function exportPageAsHtml(options: ExportOptions = {}): Promise<void> {
  const { url, fileName, onProgress } = options;

  const updateProgress = (phase: string, text: string, progress?: number) => {
    onProgress?.({ phase, message: text, progress });
    console.log(`[导出] ${phase}: ${text}`);
  };

  updateProgress('init', '正在准备导出...');

  let iframe: HTMLIFrameElement | null = null;

  try {
    updateProgress('iframe', '正在创建导出环境...');
    iframe = createExportIframe();

    updateProgress('loading', '正在加载页面...');
    iframe.src = url || window.location.href;

    await waitForIframeLoad(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('无法获取 iframe 文档');
    }

    updateProgress('render', '正在等待页面渲染完成...');
    await waitForRenderComplete(iframeDoc);

    updateProgress('microApp', '姝ｅ湪鍥哄寲寰簲鐢ㄥ唴瀹?..');
    processMicroApps(iframeDoc);

    updateProgress('images', '正在处理图片...');
    await processImages(iframeDoc);

    updateProgress('canvas', '正在处理图表...');
    await processCanvas(iframeDoc);

    updateProgress('snapshot', '正在生成快照...');
    const serializedNodeId = snapshot(iframeDoc, {
      inlineStylesheet: true,
      inlineImages: false,
      recordCanvas: false,
      preserveWhiteSpace: true,
    });

    if (!serializedNodeId) {
      throw new Error('DOM 快照生成失败');
    }

    rebuild(serializedNodeId, {
      doc: iframeDoc,
      cache: undefined as any,
      mirror: undefined as any,
    });

    updateProgress('generate', '正在生成 HTML 文件...');
    const finalHtml = await processFonts(iframeDoc.documentElement.outerHTML);

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

    updateProgress('done', '导出完成');
    message.success('导出成功');
  } catch (error: any) {
    console.error('导出失败:', error);
    updateProgress('error', `导出失败: ${error.message}`);
    message.error(`导出失败: ${error.message}`);
    throw error;
  } finally {
    if (iframe) {
      try {
        iframe.remove();
      } catch {
        // 忽略 iframe 清理失败
      }
    }
  }
}

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

  const updateProgressBar = (
    nextProgress: number,
    nextStatus: 'normal' | 'exception' | 'active' | 'success',
    nextInfo: string
  ) => {
    progress = nextProgress;
    status = nextStatus;
    info = nextInfo;

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
      onProgress: ({ phase, message: text, progress: customProgress }) => {
        const progressMap: Record<string, number> = {
          init: 5,
          iframe: 10,
          loading: 20,
          render: 40,
          microApp: 48,
          images: 55,
          canvas: 70,
          snapshot: 85,
          generate: 90,
          download: 95,
          done: 100,
          error: 0,
        };

        const progressValue = progressMap[phase] ?? customProgress ?? 0;
        const statusValue =
          phase === 'error' ? 'exception' : phase === 'done' ? 'success' : 'active';

        updateProgressBar(progressValue, statusValue, text);
      },
    });
  } finally {
    window.setTimeout(() => {
      modal.destroy();
    }, 1500);
  }
}

export async function exportDashboardFromList(
  dashboardId: string,
  fileName?: string
): Promise<void> {
  const previewUrl = `${window.location.origin + window.location.pathname}#/preview/${dashboardId}`;

  await exportPageWithProgress({
    url: previewUrl,
    fileName: fileName || `工作台_${dashboardId}_${Date.now()}.html`,
  });
}
