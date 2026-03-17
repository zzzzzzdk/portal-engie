import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button, Empty, Spin, Tag } from 'antd';
import clsx from 'clsx';
import type {
  CarouselApiMapping,
  CarouselSlide,
  CarouselWidgetConfig,
  Widget,
} from '@/types';
import { safeIntervalMs } from '@/constants/dashboard';
import SwiperCarousel from '@/components/SwiperCarousel';
import './index.scss';

interface CarouselWidgetProps {
  config: CarouselWidgetConfig;
  widget: Widget;
  isEditMode?: boolean;
}

const getValueByPath = (target: any, path?: string) => {
  if (!path) {
    return undefined;
  }
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), target);
};

const normalizeSlide = (
  item: any,
  index: number,
  mapping?: CarouselApiMapping,
): CarouselSlide => {
  const mapValue = (field?: string, fallbackKey?: string) =>
    getValueByPath(item, field) ?? (fallbackKey ? item?.[fallbackKey] : undefined);

  return {
    id: mapValue(mapping?.idField) ?? item?.id ?? `slide-${index}`,
    title: mapValue(mapping?.titleField, 'title'),
    subtitle: mapValue(mapping?.subtitleField, 'subtitle'),
    description: mapValue(mapping?.descriptionField, 'description'),
    imageUrl: mapValue(mapping?.imageField, 'imageUrl'),
    thumbnailUrl: mapValue(mapping?.thumbnailField, 'thumbnailUrl'),
    link: mapValue(mapping?.linkField, 'link'),
    buttonText: mapValue(mapping?.buttonTextField, 'buttonText'),
    badge: mapValue(mapping?.badgeField, 'badge'),
  };
};

const normalizeColor = (value?: any, fallback?: string) => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.toRgbString) {
    return value.toRgbString();
  }
  if (typeof value === 'object' && value.toHexString) {
    return value.toHexString();
  }
  if (typeof value === 'object' && value.metaColor) {
    const { r, g, b, a } = value.metaColor;
    return `rgba(${r}, ${g}, ${b}, ${a ?? 1})`;
  }
  return fallback;
};

const resolveRequestBody = (rawBody?: Record<string, any> | string) => {
  if (rawBody == null || rawBody === '') {
    return undefined;
  }

  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      console.warn('CarouselWidget: 请求体 JSON 解析失败，将忽略该配置', error);
      return undefined;
    }
  }

  return rawBody;
};

const CarouselWidget: React.FC<CarouselWidgetProps> = ({ config, widget, isEditMode }) => {
  const carouselConfig = config as CarouselWidgetConfig;
  const dataSourceType = carouselConfig.dataSourceType || 'static';
  const configuredSlides = carouselConfig.slides || [];
  const [remoteSlides, setRemoteSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlides = useCallback(async () => {
    if (dataSourceType !== 'api' || !carouselConfig.apiConfig?.endpoint) {
      setRemoteSlides([]);
      return;
    }
    const { endpoint, method = 'GET', params, headers, body, bodyParams, listField, mapping } =
      carouselConfig.apiConfig;
    const requestBody = resolveRequestBody(body ?? bodyParams);
    setLoading(true);
    setError(null);
    try {
      const response = await axios({
        url: endpoint.trim(),
        method,
        params,
        headers,
        data: method.toUpperCase() === 'GET' ? undefined : requestBody,
      });
      const findList = (data: any): any[] | null => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          if (Array.isArray(data.data)) return data.data;
          if (Array.isArray(data.list)) return data.list;
          if (Array.isArray(data.rows)) return data.rows;
          if (Array.isArray(data.records)) return data.records;
          // 递归一层：data.data 是对象时再查找
          if (data.data && typeof data.data === 'object') {
            const nested = data.data;
            if (Array.isArray(nested.list)) return nested.list;
            if (Array.isArray(nested.rows)) return nested.rows;
            if (Array.isArray(nested.records)) return nested.records;
          }
        }
        return null;
      };
      const listSource = listField
        ? getValueByPath(response.data, listField)
        : findList(response.data);
      const dataList = Array.isArray(listSource) ? listSource : [];
      const normalized = dataList.map((item, index) =>
        normalizeSlide(item, index, mapping),
      );
      setRemoteSlides(normalized);
    } catch (err: any) {
      setError(err?.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [carouselConfig.apiConfig, dataSourceType]);

  useEffect(() => {
    if (dataSourceType === 'api' && carouselConfig.apiConfig?.endpoint) {
      fetchSlides();
    }
  }, [fetchSlides, dataSourceType, carouselConfig.apiConfig?.endpoint]);

  useEffect(() => {
    if (dataSourceType !== 'api') {
      return;
    }
    if (!carouselConfig.refreshInterval || carouselConfig.refreshInterval <= 0) {
      return;
    }
    const timer = setInterval(() => {
      fetchSlides();
    }, safeIntervalMs(carouselConfig.refreshInterval));
    return () => clearInterval(timer);
  }, [carouselConfig.refreshInterval, dataSourceType, fetchSlides]);

  useEffect(() => {
    if (!widget?.refreshCount) return;
    if (dataSourceType === 'api') {
      fetchSlides();
    }
  }, [widget?.refreshCount, dataSourceType, fetchSlides]);

  const slides = useMemo(() => {
    if (dataSourceType === 'api') {
      if (remoteSlides.length > 0) {
        return remoteSlides;
      }
      return configuredSlides;
    }
    return configuredSlides;
  }, [configuredSlides, dataSourceType, remoteSlides]);

  const responsiveBreakpoints = useMemo(() => {
    if (!Array.isArray(carouselConfig.responsive)) return undefined;
    return carouselConfig.responsive.reduce<Record<number, any>>((acc, item) => {
      if (!item?.minWidth) {
        return acc;
      }
      const bp: Record<string, any> = {};
      if (item.slidesPerView != null) bp.slidesPerView = item.slidesPerView;
      if (item.slidesPerGroup != null) bp.slidesPerGroup = item.slidesPerGroup;
      if (item.spaceBetween != null) bp.spaceBetween = item.spaceBetween;
      acc[item.minWidth] = bp;
      return acc;
    }, {});
  }, [carouselConfig.responsive]);

  const swiperOptions = useMemo(
    () => ({
      slidesPerView: carouselConfig.slidesPerView ?? 1,
      slidesPerGroup: carouselConfig.slidesPerGroup ?? 1,
      spaceBetween: carouselConfig.spaceBetween ?? 16,
      loop: carouselConfig.loop !== false,
      centeredSlides: carouselConfig.centeredSlides ?? false,
      autoHeight: carouselConfig.autoHeight ?? false,
      allowTouchMove: carouselConfig.allowTouchMove !== false,
      grabCursor: carouselConfig.grabCursor ?? true,
      speed: carouselConfig.speed ?? 600,
      effect: carouselConfig.effect || 'slide',
      autoplay: carouselConfig.autoplay?.enabled
        ? {
            delay: carouselConfig.autoplay.delay || 5000,
            pauseOnMouseEnter: carouselConfig.autoplay.pauseOnMouseEnter ?? true,
            disableOnInteraction: carouselConfig.autoplay.disableOnInteraction ?? false,
            stopOnLastSlide: carouselConfig.autoplay.stopOnLastSlide ?? false,
          }
        : undefined,
      pagination: carouselConfig.pagination?.enabled
        ? {
            clickable: carouselConfig.pagination.clickable !== false,
            type: carouselConfig.pagination.type || 'bullets',
          }
        : undefined,
      navigation: carouselConfig.navigation?.enabled ? {} : undefined,
      scrollbar: carouselConfig.scrollbar?.enabled
        ? { draggable: carouselConfig.scrollbar.draggable !== false }
        : undefined,
      breakpoints: responsiveBreakpoints,
      watchSlidesProgress: true,
    }),
    [carouselConfig, responsiveBreakpoints],
  );

  const openLink = useCallback((link?: string) => {
    if (!link) return;
    const target = link.startsWith('http') ? '_blank' : '_self';
    window.open(link, target);
  }, []);

  const handleSlideClick = useCallback(
    (slide: CarouselSlide) => {
      if (isEditMode) return;
      if (slide.link) {
        openLink(slide.link);
      }
    },
    [isEditMode, openLink],
  );

  const accentColor = normalizeColor(carouselConfig.overlayColor, '#ffffff');
  const emptyHint = carouselConfig.emptyMessage || '暂无轮播内容';

  const renderSlide = useCallback(
    (slide: CarouselSlide) => {
      const overlayStyle = slide.overlay ?? carouselConfig.overlayStyle ?? 'gradient';
      const overlayColor = normalizeColor(
        slide.overlayColor ?? carouselConfig.overlayColor,
        'rgba(0, 0, 0, 0.45)',
      );
      const textAlign = slide.contentAlign ?? carouselConfig.textAlign ?? 'left';
      const hasMedia = Boolean(slide.imageUrl);

      return (
        <div
          className={clsx('carousel-slide', `align-${textAlign}`)}
          onClick={() => handleSlideClick(slide)}
        >
          {hasMedia && (
            <>
              <div className="carousel-slide__media">
                <img src={slide.imageUrl} alt={slide.title || '轮播图'} loading="lazy" />
              </div>
              <div
                className={clsx('carousel-slide__overlay', {
                  'is-gradient': overlayStyle === 'gradient',
                  'is-solid': overlayStyle === 'solid',
                  'is-none': overlayStyle === 'none',
                })}
                style={
                  overlayStyle === 'solid'
                    ? { background: overlayColor }
                    : overlayStyle === 'gradient'
                      ? {
                          background: `linear-gradient(135deg, rgba(0, 0, 0, 0) 0%, ${overlayColor} 80%)`,
                        }
                      : undefined
                }
              />
            </>
          )}

          <div className="carousel-slide__content">
            {slide.badge && (
              <Tag color={slide.badgeColor || 'blue'} className="carousel-slide__badge">
                {slide.badge}
              </Tag>
            )}
            {slide.subtitle && <div className="carousel-slide__subtitle">{slide.subtitle}</div>}
            {slide.title && <h3 className="carousel-slide__title">{slide.title}</h3>}
            {slide.description && (
              <p className="carousel-slide__description">{slide.description}</p>
            )}
            {(slide.buttonText || slide.buttonLink || slide.link) && (
              <Button
                type={slide.buttonType || carouselConfig.buttonType || 'primary'}
                size="large"
                className="carousel-slide__action"
                onClick={(event) => {
                  event.stopPropagation();
                  openLink(slide.buttonLink || slide.link);
                }}
              >
                {slide.buttonText || '查看详情'}
              </Button>
            )}
          </div>
        </div>
      );
    },
    [carouselConfig.buttonType, carouselConfig.overlayColor, carouselConfig.overlayStyle, carouselConfig.textAlign, handleSlideClick, openLink],
  );

  const hasSlides = slides.length > 0;

  return (
    <div
      className="carousel-widget"
      style={
        {
          '--carousel-accent-color': accentColor || '#ffffff',
        } as React.CSSProperties
      }
    >
      <div
        className="carousel-widget__viewport"
        style={{ height: '100%' }}
      >
        {hasSlides && (
          <SwiperCarousel
            slides={slides}
            renderSlide={renderSlide}
            swiperOptions={swiperOptions}
            className="carousel-widget__swiper"
          />
        )}

        {!loading && !hasSlides && (
          <div className="carousel-widget__empty">
            {error ? <Empty description={error} /> : <Empty description={emptyHint} />}
          </div>
        )}

        {loading && (
          <div className="carousel-widget__loading">
            <Spin />
          </div>
        )}
      </div>
    </div>
  );
};

export default CarouselWidget;
