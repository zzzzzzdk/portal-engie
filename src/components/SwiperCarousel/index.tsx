import React, { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import type { SwiperOptions, Swiper as SwiperClass, SwiperModule } from 'swiper/types';
import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Autoplay,
  Pagination,
  Navigation,
  Scrollbar,
  Grid,
  EffectFade,
  EffectCube,
  EffectCoverflow,
  EffectCreative,
  Keyboard,
  Mousewheel,
  A11y,
} from 'swiper/modules';
import type { CarouselSlide } from '@/types';
import './index.scss';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import 'swiper/css/grid';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-cube';
import 'swiper/css/effect-coverflow';
import 'swiper/css/effect-creative';

interface SwiperCarouselProps {
  slides: CarouselSlide[];
  renderSlide: (slide: CarouselSlide, index: number) => React.ReactNode;
  swiperOptions?: SwiperOptions;
  className?: string;
  onSwiperReady?: (swiper: SwiperClass) => void;
}

const SwiperCarousel: React.FC<SwiperCarouselProps> = ({
  slides,
  renderSlide,
  swiperOptions,
  className,
  onSwiperReady,
}) => {
  const swiperRef = useRef<SwiperClass | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const modules = useMemo(() => {
    const enabled: SwiperModule[] = [A11y];
    if (swiperOptions?.autoplay) enabled.push(Autoplay);
    if (swiperOptions?.pagination) enabled.push(Pagination);
    if (swiperOptions?.navigation) enabled.push(Navigation);
    if (swiperOptions?.scrollbar) enabled.push(Scrollbar);
    if (swiperOptions?.grid) enabled.push(Grid);
    if (swiperOptions?.effect === 'fade') enabled.push(EffectFade);
    if (swiperOptions?.effect === 'cube') enabled.push(EffectCube);
    if (swiperOptions?.effect === 'coverflow') enabled.push(EffectCoverflow);
    if (swiperOptions?.effect === 'creative') enabled.push(EffectCreative);
    if (swiperOptions?.keyboard) enabled.push(Keyboard);
    if (swiperOptions?.mousewheel) enabled.push(Mousewheel);
    return Array.from(new Set(enabled));
  }, [swiperOptions]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (swiperRef.current) {
        swiperRef.current.update();
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (swiperRef.current) {
      swiperRef.current.update();
    }
  }, [slides.length]);

  const optionsKey = useMemo(
    () => JSON.stringify(swiperOptions ?? {}),
    [swiperOptions],
  );

  return (
    <div
      className={clsx('swiper-carousel', className)}
      ref={containerRef}
    >
      {slides.length > 0 && (
        <Swiper
          key={optionsKey}
          modules={modules}
          {...swiperOptions}
          onSwiper={(instance) => {
            swiperRef.current = instance;
            onSwiperReady?.(instance);
          }}
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={slide.id ?? `slide-${index}`}>
              {renderSlide(slide, index)}
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
};

export default SwiperCarousel;
