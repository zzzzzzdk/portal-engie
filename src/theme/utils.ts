import type { IWidgetStyleTokens } from './tokens/semantic';

/**
 * 注入风格 Token 到指定 DOM 元素的 CSS 变量
 * 可注入到 documentElement（全局）或画布容器（画布级）
 */
export const injectStyleTokens = (tokens: IWidgetStyleTokens, root: HTMLElement) => {
  const { widget, card } = tokens;

  // Widget 变量（处理可选属性）
  root.style.setProperty('--widget-background', widget.background);
  root.style.setProperty('--widget-backdrop-filter', widget.backdropFilter ?? 'none');
  root.style.setProperty('--widget-border-radius', `${widget.borderRadius}px`);
  root.style.setProperty('--widget-border-color', widget.borderColor ?? 'transparent');
  root.style.setProperty('--widget-border-width', `${widget.borderWidth ?? 0}px`);
  root.style.setProperty('--widget-box-shadow', widget.boxShadow ?? 'none');
  root.style.setProperty('--widget-title-color', widget.titleColor ?? 'inherit');
  root.style.setProperty('--widget-text-color', widget.textColor ?? 'inherit');

  // Card 变量（处理可选属性）
  root.style.setProperty('--card-background', card.background);
  root.style.setProperty('--card-backdrop-filter', card.backdropFilter);
  root.style.setProperty('--card-border-radius', `${card.borderRadius ?? 8}px`);
  root.style.setProperty('--card-border-color', card.borderColor ?? 'transparent');
  root.style.setProperty('--card-box-shadow', card.boxShadow ?? 'none');
};
