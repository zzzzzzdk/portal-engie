/**
 * SVG 安全净化工具
 *
 * 防止通过 SVG 注入恶意脚本（XSS 攻击）。
 * 移除危险元素（script、foreignObject、iframe 等）和事件属性（onerror、onload 等）。
 */

// 危险元素黑名单
const DANGEROUS_ELEMENTS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'link',
  'style',
  'meta',
  'base',
  'form',
  'input',
  'textarea',
  'button',
  'select',
]);

// 危险属性前缀 / 值
const DANGEROUS_ATTR_PREFIX = 'on'; // onclick, onerror, onload …
const DANGEROUS_URL_PATTERN = /^\s*javascript\s*:/i;

/**
 * 递归移除 DOM 节点中的危险内容
 */
function sanitizeNode(node: Element): void {
  // 从下往上遍历，避免索引偏移
  const children = Array.from(node.children);
  for (const child of children) {
    if (DANGEROUS_ELEMENTS.has(child.tagName.toLowerCase())) {
      child.remove();
      continue;
    }
    // 移除事件属性和 javascript: URL
    const attrs = Array.from(child.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      if (name.startsWith(DANGEROUS_ATTR_PREFIX)) {
        child.removeAttribute(attr.name);
      } else if (
        (name === 'href' || name === 'xlink:href') &&
        DANGEROUS_URL_PATTERN.test(attr.value)
      ) {
        child.removeAttribute(attr.name);
      }
    }
    // 递归处理子节点
    sanitizeNode(child);
  }
}

/**
 * 净化 SVG 字符串，移除潜在的 XSS 攻击向量。
 *
 * @param svgString 原始 SVG 字符串
 * @returns 净化后的安全 SVG 字符串；解析失败时返回空字符串
 */
export function sanitizeSvg(svgString: string): string {
  if (!svgString || typeof svgString !== 'string') return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');

    // 解析失败检测
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) return '';

    const svg = doc.documentElement;
    sanitizeNode(svg);

    // 序列化回字符串
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  } catch {
    return '';
  }
}
