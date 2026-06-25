import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LockOutlined } from '@ant-design/icons'
import { Button, Empty, Spin, Tag } from 'antd'
import clsx from 'clsx'
import SwiperCarousel from '@/components/SwiperCarousel'
import { safeIntervalMs } from '@/constants/dashboard'
import { useSystemStore } from '@/store/useSystemStore'
import type { CarouselApiMapping, CarouselSlide, CarouselWidgetConfig, Widget } from '@/types'
import { buildDeployedSystemSet, isSystemDeployed } from '@/utils/systemDeployment'
import { getValueByPath, requestWidgetApi } from '@/utils/widgetApi'
import { DEFAULT_CAROUSEL_LIST_FIELD } from '@/utils/widgetApiDefaults'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'
import { useWidgetRuntimeParams } from '@/hooks/useWidgetRuntimeParams'
import type { Swiper as SwiperClass } from 'swiper/types'
import './index.scss'

interface CarouselWidgetProps {
  config: CarouselWidgetConfig
  widget: Widget
  isEditMode?: boolean
}

const normalizeSlide = (
  item: any,
  index: number,
  mapping?: CarouselApiMapping,
): CarouselSlide => {
  const mapValue = (field?: string, fallbackKey?: string) =>
    getValueByPath(item, field) ?? (fallbackKey ? item?.[fallbackKey] : undefined)

  return {
    id: mapValue(mapping?.idField) ?? item?.id ?? `slide-${index}`,
    title: mapValue(mapping?.titleField, 'title'),
    subtitle: mapValue(mapping?.subtitleField, 'subtitle'),
    description: mapValue(mapping?.descriptionField, 'description'),
    imageUrl: mapValue(mapping?.imageField, 'imageUrl'),
    thumbnailUrl: mapValue(mapping?.thumbnailField, 'thumbnailUrl'),
    link: mapValue(mapping?.linkField, 'link'),
    systemId: item?.systemId,
    buttonText: mapValue(mapping?.buttonTextField, 'buttonText'),
    badge: mapValue(mapping?.badgeField, 'badge'),
  }
}

const normalizeColor = (value?: any, fallback?: string) => {
  if (!value) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value.toRgbString) {
    return value.toRgbString()
  }
  if (typeof value === 'object' && value.toHexString) {
    return value.toHexString()
  }
  if (typeof value === 'object' && value.metaColor) {
    const { r, g, b, a } = value.metaColor
    return `rgba(${r}, ${g}, ${b}, ${a ?? 1})`
  }
  return fallback
}

const CarouselWidget: React.FC<CarouselWidgetProps> = ({ config, widget, isEditMode }) => {
  const sysConfig = useSystemStore(state => state.sysConfig)
  const deployedSystemSet = useMemo(() => buildDeployedSystemSet(sysConfig), [sysConfig])
  const swiperRef = useRef<SwiperClass | null>(null)
  const emitWidgetEvent = useWidgetEventEmitter(widget)
  const { runtimeParamsRef, setRuntimeParams, clearRuntimeParams } = useWidgetRuntimeParams()

  const carouselConfig = config as CarouselWidgetConfig
  const dataSourceType = carouselConfig.dataSourceType === 'api'
    ? 'customApi'
    : (carouselConfig.dataSourceType || 'static')
  const isRemoteSource = dataSourceType === 'customApi' || dataSourceType === 'dataSource'
  const configuredSlides = carouselConfig.slides || []
  const [remoteSlides, setRemoteSlides] = useState<CarouselSlide[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSlides = useCallback(async () => {
    if (!isRemoteSource || !carouselConfig.apiConfig?.endpoint) {
      setRemoteSlides([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await requestWidgetApi({
        endpoint: carouselConfig.apiConfig.endpoint,
        method: carouselConfig.apiConfig.method,
        headers: carouselConfig.apiConfig.headers,
        query: carouselConfig.apiConfig.queryParams ?? carouselConfig.apiConfig.params,
        body: carouselConfig.apiConfig.body ?? carouselConfig.apiConfig.bodyParams,
        timeout: carouselConfig.apiConfig.timeout,
        listField: carouselConfig.apiConfig.listField || DEFAULT_CAROUSEL_LIST_FIELD,
        runtimeParams: runtimeParamsRef.current,
      })

      const sourceList = result.list.length
        ? result.list
        : Array.isArray(result.data)
          ? result.data
          : []
      const nextSlides = sourceList.map((item, index) =>
        normalizeSlide(item, index, carouselConfig.apiConfig?.mapping),
      )
      setRemoteSlides(nextSlides)
      emitWidgetEvent('data.loaded', { slides: nextSlides, raw: sourceList }, 'system')
    } catch (err: any) {
      setRemoteSlides([])
      const message = err?.message || '数据加载失败'
      setError(message)
      emitWidgetEvent('data.error', { message, error: err }, 'system')
    } finally {
      setLoading(false)
    }
  }, [carouselConfig.apiConfig, emitWidgetEvent, isRemoteSource, runtimeParamsRef])

  useWidgetEventInputs(widget, {
    reload: () => {
      if (isRemoteSource) fetchSlides()
    },
    setParams: (params, message) => {
      const input = widget?.config?.eventInputs?.find(item =>
        item.listenWidgetId === message.sourceWidgetId && item.listenEventName === message.name,
      )
      setRuntimeParams(params, 'replace')
    },
    setParamsAndReload: (params, message) => {
      const input = widget?.config?.eventInputs?.find(item =>
        item.listenWidgetId === message.sourceWidgetId && item.listenEventName === message.name,
      )
      setRuntimeParams(params, 'replace')
      if (isRemoteSource) fetchSlides()
    },
    clearParams: () => {
      clearRuntimeParams()
      if (isRemoteSource) fetchSlides()
    },
    select: (params) => {
      const index = Number(params.index ?? params.slideIndex ?? params.value)
      if (Number.isFinite(index)) swiperRef.current?.slideToLoop?.(index)
    },
    goTo: (params) => {
      const index = Number(params.index ?? params.slideIndex ?? params.value)
      if (Number.isFinite(index)) swiperRef.current?.slideToLoop?.(index)
    },
    next: () => {
      swiperRef.current?.slideNext()
    },
    prev: () => {
      swiperRef.current?.slidePrev()
    },
  })

  useEffect(() => {
    if (isRemoteSource && carouselConfig.apiConfig?.endpoint) {
      fetchSlides()
    }
  }, [carouselConfig.apiConfig?.endpoint, fetchSlides, isRemoteSource])

  useEffect(() => {
    if (!isRemoteSource) {
      return
    }
    if (!carouselConfig.refreshInterval || carouselConfig.refreshInterval <= 0) {
      return
    }

    const timer = setInterval(() => {
      fetchSlides()
    }, safeIntervalMs(carouselConfig.refreshInterval))

    return () => clearInterval(timer)
  }, [carouselConfig.refreshInterval, fetchSlides, isRemoteSource])

  useEffect(() => {
    if (!widget?.refreshCount) return
    if (isRemoteSource) {
      fetchSlides()
    }
  }, [widget?.refreshCount, fetchSlides, isRemoteSource])

  const slides = useMemo(() => {
    if (isRemoteSource) {
      return remoteSlides
    }
    return configuredSlides
  }, [configuredSlides, isRemoteSource, remoteSlides])

  const responsiveBreakpoints = useMemo(() => {
    if (!Array.isArray(carouselConfig.responsive)) return undefined

    return carouselConfig.responsive.reduce<Record<number, any>>((acc, item) => {
      if (!item?.minWidth) {
        return acc
      }
      const bp: Record<string, any> = {}
      if (item.slidesPerView != null) bp.slidesPerView = item.slidesPerView
      if (item.slidesPerGroup != null) bp.slidesPerGroup = item.slidesPerGroup
      if (item.spaceBetween != null) bp.spaceBetween = item.spaceBetween
      acc[item.minWidth] = bp
      return acc
    }, {})
  }, [carouselConfig.responsive])

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
  )

  const openLink = useCallback(
    (link?: string, systemId?: string) => {
      if (!link || isEditMode || !isSystemDeployed(deployedSystemSet, systemId)) {
        return
      }

      const target = link.startsWith('http') ? '_blank' : '_self'
      window.open(link, target)
    },
    [deployedSystemSet, isEditMode],
  )

  const handleSlideClick = useCallback(
    (slide: CarouselSlide) => {
      const index = slides.findIndex(item => item === slide || item.id === slide.id)
      emitWidgetEvent('carousel.click', { slide, index }, 'click')

      if (!slide.link || !isSystemDeployed(deployedSystemSet, slide.systemId)) {
        return
      }
      openLink(slide.link, slide.systemId)
    },
    [deployedSystemSet, emitWidgetEvent, openLink, slides],
  )

  const handleSlideChange = useCallback((swiper: SwiperClass) => {
    const index = swiper.realIndex ?? swiper.activeIndex ?? 0
    const slide = slides[index]
    emitWidgetEvent('carousel.change', { slide, index }, 'change')
  }, [emitWidgetEvent, slides])

  const accentColor = normalizeColor(carouselConfig.overlayColor, '#ffffff')
  const emptyHint = carouselConfig.emptyMessage || '暂无轮播内容'

  const renderSlide = useCallback(
    (slide: CarouselSlide) => {
      const overlayStyle = slide.overlay ?? carouselConfig.overlayStyle ?? 'gradient'
      const overlayColor = normalizeColor(
        slide.overlayColor ?? carouselConfig.overlayColor,
        'rgba(0, 0, 0, 0.45)',
      )
      const textAlign = slide.contentAlign ?? carouselConfig.textAlign ?? 'left'
      const hasMedia = Boolean(slide.imageUrl)
      const hasAction = Boolean(slide.link || slide.buttonLink)
      const isAvailable = hasAction ? isSystemDeployed(deployedSystemSet, slide.systemId) : true
      const canClickSlide = Boolean(slide.link) && !isEditMode && isAvailable

      return (
        <div
          className={clsx('carousel-slide', `align-${textAlign}`, {
            'is-clickable': canClickSlide,
            'is-disabled': !isAvailable,
          })}
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

          {!isAvailable && hasAction && (
            <span className="carousel-slide__lock">
              <LockOutlined />
            </span>
          )}

          <div className="carousel-slide__content">
            {slide.badge && (
              <Tag color={slide.badgeColor || 'blue'} className="carousel-slide__badge">
                {slide.badge}
              </Tag>
            )}
            {slide.subtitle && <div className="carousel-slide__subtitle">{slide.subtitle}</div>}
            {slide.title && <h3 className="carousel-slide__title">{slide.title}</h3>}
            {slide.description && <p className="carousel-slide__description">{slide.description}</p>}
            {(slide.buttonText || slide.buttonLink || slide.link) && (
              <Button
                type={slide.buttonType || carouselConfig.buttonType || 'primary'}
                size="large"
                className="carousel-slide__action"
                disabled={!isAvailable}
                onClick={event => {
                  event.stopPropagation()
                  openLink(slide.buttonLink || slide.link, slide.systemId)
                }}
              >
                {slide.buttonText || '查看详情'}
              </Button>
            )}
          </div>
        </div>
      )
    },
    [
      carouselConfig.buttonType,
      carouselConfig.overlayColor,
      carouselConfig.overlayStyle,
      carouselConfig.textAlign,
      deployedSystemSet,
      handleSlideClick,
      isEditMode,
      openLink,
    ],
  )

  const hasSlides = slides.length > 0

  return (
    <div
      className="carousel-widget"
      style={
        {
          '--carousel-accent-color': accentColor || '#ffffff',
        } as React.CSSProperties
      }
    >
      <div className="carousel-widget__viewport" style={{ height: '100%' }}>
        {hasSlides && (
          <SwiperCarousel
            slides={slides}
            renderSlide={renderSlide}
            swiperOptions={swiperOptions}
            className="carousel-widget__swiper"
            onSwiperReady={(swiper) => {
              swiperRef.current = swiper
            }}
            onSlideChange={handleSlideChange}
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
  )
}

export default CarouselWidget
