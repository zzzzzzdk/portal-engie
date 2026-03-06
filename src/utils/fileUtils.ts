import dayjs from 'dayjs';

/**
 * 格式化文件大小为可读字符串
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '-';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * 格式化日期
 */
export function formatDate(date?: string): string {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * 根据文件类型获取图标颜色
 */
export function getFileIconColor(filename: string, isDir: boolean): string {
  if (isDir) return '#faad14';

  const ext = getFileExtension(filename);
  const colorMap: Record<string, string> = {
    doc: '#2b5797', docx: '#2b5797',
    pdf: '#e74c3c',
    xls: '#1d6f42', xlsx: '#1d6f42', csv: '#1d6f42',
    ppt: '#d24726', pptx: '#d24726',
    jpg: '#9b59b6', jpeg: '#9b59b6', png: '#9b59b6', gif: '#9b59b6',
    mp4: '#e74c3c', avi: '#e74c3c',
    mp3: '#1abc9c', wav: '#1abc9c',
    zip: '#795548', rar: '#795548',
    js: '#f7df1e', ts: '#3178c6', py: '#3776ab',
  };

  return colorMap[ext] || '#909399';
}

/**
 * 获取文件预览类型
 */
export type PreviewType = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'word' | 'excel' | 'ppt' | 'none';

export function getPreviewType(filename: string): PreviewType {
  const ext = getFileExtension(filename);

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'];
  const videoExts = ['mp4', 'webm', 'ogg'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
  const textExts = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'log', 'ini', 'yaml', 'yml', 'sh', 'bat', 'csv'];
  const wordExts = ['doc', 'docx', 'odt', 'rtf'];
  const excelExts = ['xls', 'xlsx', 'ods'];
  const pptExts = ['ppt', 'pptx'];

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (textExts.includes(ext)) return 'text';
  if (ext === 'pdf') return 'pdf';
  if (wordExts.includes(ext)) return 'word';
  if (excelExts.includes(ext)) return 'excel';
  if (pptExts.includes(ext)) return 'ppt';

  return 'none';
}

/**
 * 判断预览类型是否应使用 OnlyOffice 编辑器
 */
export function isOfficePreviewType(type: string): boolean {
  return ['word', 'excel', 'ppt', 'pdf'].includes(type);
}

/**
 * 根据文件名获取 Monaco Editor 语言标识
 */
export function getMonacoLanguage(filename: string): string {
  const ext = getFileExtension(filename);
  const langMap: Record<string, string> = {
    json: 'json',
    md: 'markdown',
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bat: 'bat',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'cpp',
    ini: 'ini',
    sql: 'sql',
  };
  return langMap[ext] || 'plaintext';
}

/**
 * 下载 Blob 文件
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
