import html2canvas from 'html2canvas';

const DEFAULT_BG = '#ffffff';

const normalizeBase64 = (dataUrl: string) => {
  if (!dataUrl) {
    return '';
  }
  // 保留完整 data URL，以便直接用于 <img src>
  return dataUrl;
};

export const captureDashboardCover = async (): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return null;
  }
  const container = document.querySelector('.dashboard-container') as HTMLElement | null;
  if (!container) {
    return null;
  }
  try {
    const computedStyle = window.getComputedStyle(container);
    const backgroundColor = computedStyle?.backgroundColor || DEFAULT_BG;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = await html2canvas(container, {
      useCORS: true,
      backgroundColor,
      scale,
      logging: false,
      allowTaint: false,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
    });
    const dataUrl = canvas.toDataURL('image/png', 0.92);
    return normalizeBase64(dataUrl);
  } catch (error) {
    console.error('capture dashboard cover failed', error);
    return null;
  }
};

export default captureDashboardCover;
