import React, { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface WaterMarkProps {
  /** 水印文本 */
  text?: string;
  /** 水印字体大小 */
  fontSize?: number;
  /** 水印字体颜色 */
  color?: string;
  /** 水印透明度 */
  opacity?: number;
  /** 水印间距 */
  gap?: [number, number];
  /** 水印旋转角度 */
  rotate?: number;
  /** 子内容 */
  children: ReactNode;
  /** 是否显示水印 */
  visible?: boolean;
  /** 容器样式 */
  style?: React.CSSProperties;
}

/**
 * 水印组件
 * 为页面内容添加背景水印
 */
const WaterMark: React.FC<WaterMarkProps> = ({
  text = 'AI 监控平台',
  fontSize = 14,
  color = '#000',
  opacity = 0.1,
  gap = [100, 100],
  rotate = -22,
  children,
  visible = true,
  style = {},
}) => {
  const waterMarkRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 创建水印图片
  const createWaterMarkImage = (): string => {
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    const [gapX, gapY] = gap;
    
    // 设置 canvas 大小为水印区域的大小
    const textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + gapX;
    canvas.height = fontSize * 2 + gapY;

    // 绘制水印文本
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.font = `${fontSize}px Arial`;
    ctx.textBaseline = 'middle';
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.fillText(text, canvas.width / 2 - textWidth / 2, canvas.height / 2);

    return canvas.toDataURL();
  };

  // 更新水印位置和大小
  const updateWaterMark = (): void => {
    if (!waterMarkRef.current || !parentRef.current || !visible) return;

    const parentRect = parentRef.current.getBoundingClientRect();
    const waterMark = waterMarkRef.current;

    // 设置水印样式
    waterMark.style.width = `${parentRect.width}px`;
    waterMark.style.height = `${parentRect.height}px`;
    
    // 创建水印背景图
    const waterMarkImage = createWaterMarkImage();
    waterMark.style.backgroundImage = `url('${waterMarkImage}')`;
  };

  // 初始化和更新水印
  useEffect(() => {
    if (!visible) {
      if (waterMarkRef.current) {
        waterMarkRef.current.style.display = 'none';
      }
      return;
    }

    updateWaterMark();

    // 添加窗口大小改变监听
    const handleResize = (): void => {
      updateWaterMark();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [text, fontSize, color, opacity, gap, rotate, visible]);

  // 监听父元素大小变化（简单实现）
  useEffect(() => {
    const observerCallback = (): void => {
      updateWaterMark();
    };
    
    const observer = new ResizeObserver(observerCallback);

    if (parentRef.current) {
      observer.observe(parentRef.current);
    }

    return () => {
      if (parentRef.current) {
        observer.unobserve(parentRef.current);
      }
    };
  }, [text, fontSize, color, opacity, gap, rotate]);

  return (
    <div ref={parentRef} style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      ...style,
    }}>
      {visible && (
        <div
          ref={waterMarkRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 1,
            backgroundSize: `${gap[0]}px ${gap[1]}px`,
          }}
        />
      )}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
      }}>
        {children}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default WaterMark;