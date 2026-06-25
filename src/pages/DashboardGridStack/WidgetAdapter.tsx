/**
 * Widget 适配层 - 桥接 GridStack 和现有 Widget 组件
 *
 * GridStack content 格式: JSON.stringify({ widgetId, type, config })
 * 现有 Widget 组件期望: { config, widget } props
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import WidgetWrapper from '@/components/WidgetWrapper';
import WidgetIconView from '@/components/WidgetIconView';
import { isIconOnlyMode } from '@/utils/widgetHelpers';
import WidgetErrorBoundary from '@/components/WidgetErrorBoundary';
import ClockWidget from '@/components/widgets/ClockWidget';
import StatsWidget from '@/components/widgets/StatsWidget';
import IndicatorCardWidget from '@/components/widgets/IndicatorCardWidget';
import IndicatorCardListWidget from '@/components/widgets/IndicatorCardListWidget';
import RecognitionCardWidget from '@/components/widgets/RecognitionCardWidget';
import ChartWidget from '@/components/widgets/ChartWidget/index.';
import LinkWidget from '@/components/widgets/LinkWidget';
import NewsWidget from '@/components/widgets/NewsWidget';
import TopListWidget from '@/components/widgets/TopListWidget';
import SearchWidget from '@/components/widgets/SearchWidget';
import QueryFilterWidget from '@/components/widgets/QueryFilterWidget';
import DataTableWidget from '@/components/widgets/DataTableWidget';
import CardGridWidget from '@/components/widgets/CardGridWidget';
import CustomFormWidget from '@/components/widgets/CustomFormWidget';
import NativeFormWidget from '@/components/widgets/NativeFormWidget';
import NativeFormFieldWidget from '@/components/widgets/NativeFormFieldWidget';
import CarouselWidget from '@/components/widgets/CarouselWidget';
import HeaderBarWidget from '@/components/widgets/HeaderBarWidget';
import TypographyWidget from '@/components/widgets/TypographyWidget';
import RichTextWidget from '@/components/widgets/RichTextWidget';
import MicroAppWidget from '@/components/widgets/MicroAppWidget';
import PageNavigatorWidget from '@/components/widgets/PageNavigatorWidget';
import IconNavWidget from '@/components/widgets/IconNavWidget';
import NavGroupWidget from '@/components/widgets/NavGroupWidget';
import MyDocumentsWidget from '@/components/widgets/MyDocumentsWidget';
import { WidgetType } from '@/types';
import type { Layout } from 'react-grid-layout';

interface WidgetAdapterProps {
  widgetId: string;
  type: WidgetType;
  // config 和其他 widget 数据将从 store 中读取
}

/**
 * WidgetAdapter 组件
 *
 * 从 Zustand store 中根据 widgetId 获取完整的 widget 数据
 * 然后渲染对应类型的 Widget 组件
 */
const WidgetAdapter: React.FC<WidgetAdapterProps> = ({ widgetId, type }) => {
  const widget = useStore(
    useCallback(
      state => state.widgets.find(w => w.id === widgetId),
      [widgetId]
    )
  );
  const isEditMode = useStore(state => state.isEditMode);
  const liveSize = useLiveGridSize(widgetId, widget?.layout);
  const resolvedWidget = useMemo(() => {
    if (!widget || !liveSize) {
      return widget;
    }

    if (widget.layout.w === liveSize.w && widget.layout.h === liveSize.h) {
      return widget;
    }

    return {
      ...widget,
      layout: {
        ...widget.layout,
        w: liveSize.w,
        h: liveSize.h,
      },
    };
  }, [widget, liveSize?.w, liveSize?.h]);

  if (!resolvedWidget) {
    return <div className="widget-not-found">Widget not found: {widgetId}</div>;
  }

  const { w, h } = resolvedWidget.layout;
  const forceIconOnly = resolvedWidget.config.forceIconOnly;

  // 不需要 icon-only 模式的组件类型列表
  // - iconNav: 本身就是图标导航组件
  // - typography: 文本组件，缩小时仍需显示内容
  // - navGroup: 导航组组件，缩小时仍需显示导航项
  // - headerBar: 导航栏组件，通常不会缩小到 icon 尺寸
  const skipIconOnlyTypes: WidgetType[] = ['iconNav', 'typography', 'richText', 'navGroup', 'headerBar', 'carousel', 'nativeForm', 'nativeFormField'];
  const skipIconOnlyMode = skipIconOnlyTypes.includes(type);

  // 判断是否为 icon-only 模式
  if (!skipIconOnlyMode && (forceIconOnly || isIconOnlyMode(w, h))) {
    return (
      <WidgetErrorBoundary widgetId={resolvedWidget.id} widgetType={resolvedWidget.type}>
        <WidgetIconView
          widget={resolvedWidget}
          isEditMode={isEditMode}
        />
      </WidgetErrorBoundary>
    );
  }

  const commonProps = { config: resolvedWidget.config, widget: resolvedWidget, isEditMode };

  const renderWidgetContent = () => {
    switch (type) {
      case 'clock':
        return <ClockWidget {...commonProps} />;
      case 'stats':
        return <StatsWidget {...commonProps} />;
      case 'indicatorCard':
        return <IndicatorCardWidget {...commonProps} />;
      case 'indicatorCardList':
        return <IndicatorCardListWidget {...commonProps} />;
      case 'recognitionCard':
        return <RecognitionCardWidget {...commonProps} />;
      case 'chart':
        return <ChartWidget {...commonProps} />;
      case 'carousel':
        return <CarouselWidget {...commonProps} />;
      case 'link':
        return <LinkWidget {...commonProps} />;
      case 'news':
        return <NewsWidget {...commonProps} />;
      case 'topList':
        return <TopListWidget {...commonProps} />;
      case 'search':
        return <SearchWidget {...commonProps} />;
      case 'queryFilter':
        return <QueryFilterWidget {...commonProps} />;
      case 'dataTable':
        return <DataTableWidget {...commonProps} />;
      case 'cardGrid':
        return <CardGridWidget {...commonProps} />;
      case 'customForm':
        return <CustomFormWidget {...commonProps} />;
      case 'nativeForm':
        return <NativeFormWidget {...commonProps} />;
      case 'nativeFormField':
        return <NativeFormFieldWidget {...commonProps} />;
      case 'headerBar':
        return <HeaderBarWidget {...commonProps} />;
      case 'typography':
        return <TypographyWidget {...commonProps} />;
      case 'richText':
        return <RichTextWidget {...commonProps} />;
      case 'microApp':
        return <MicroAppWidget {...commonProps} />;
      case 'pageNavigator':
        return <PageNavigatorWidget {...commonProps} />;
      case 'iconNav':
        return <IconNavWidget {...commonProps} />;
      case 'navGroup':
        return <NavGroupWidget {...commonProps} />;
      case 'myDocuments':
        return <MyDocumentsWidget {...commonProps} />;
      default:
        return <div>Unknown Widget Type: {type}</div>;
    }
  };

  return (
    <WidgetWrapper widget={resolvedWidget}>
      <WidgetErrorBoundary widgetId={resolvedWidget.id} widgetType={resolvedWidget.type}>
        {renderWidgetContent()}
      </WidgetErrorBoundary>
    </WidgetWrapper>
  );
};

export default WidgetAdapter;

type GridSize = { w: number; h: number };

const ATTRIBUTES_TO_WATCH: MutationObserverInit['attributeFilter'] = ['gs-w', 'gs-h'];

const readSizeFromElement = (element: Element): GridSize | null => {
  const wAttr = Number(element.getAttribute('gs-w') || 1);
  const hAttr = Number(element.getAttribute('gs-h') || 1);
  if (!Number.isFinite(wAttr) || !Number.isFinite(hAttr)) {
    return null;
  }

  return { w: wAttr, h: hAttr };
};

function useLiveGridSize(widgetId: string, fallbackLayout?: Layout) {
  const [size, setSize] = useState<GridSize | undefined>(() =>
    fallbackLayout ? { w: fallbackLayout.w, h: fallbackLayout.h } : undefined
  );
  const hasDomMeasurementRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isCancelled = false;
    let activeObserver: MutationObserver | null = null;
    let rafId: number | null = null;

    const attachObserver = () => {
      if (isCancelled) {
        return;
      }

      const element = document.querySelector<HTMLElement>(`[gs-id="${widgetId}"]`);

      if (!element) {
        rafId = window.requestAnimationFrame(attachObserver);
        return;
      }

      const updateSize = () => {
        const measured = readSizeFromElement(element);

        if (!measured) {
          return;
        }

        hasDomMeasurementRef.current = true;
        setSize(prev =>
          prev && prev.w === measured.w && prev.h === measured.h ? prev : measured
        );
      };

      updateSize();

      activeObserver = new MutationObserver(mutations => {
        if (mutations.some(mutation => mutation.type === 'attributes')) {
          updateSize();
        }
      });

      activeObserver.observe(element, {
        attributes: true,
        attributeFilter: ATTRIBUTES_TO_WATCH || undefined,
      });
    };

    attachObserver();

    return () => {
      isCancelled = true;
      activeObserver?.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [widgetId]);

  useEffect(() => {
    hasDomMeasurementRef.current = false;
    setSize(fallbackLayout ? { w: fallbackLayout.w, h: fallbackLayout.h } : undefined);
  }, [widgetId]);

  useEffect(() => {
    if (!fallbackLayout) {
      if (!hasDomMeasurementRef.current) {
        setSize(undefined);
      }
      return;
    }

    if (hasDomMeasurementRef.current) {
      return;
    }

    setSize(prev => {
      if (prev && prev.w === fallbackLayout.w && prev.h === fallbackLayout.h) {
        return prev;
      }
      return { w: fallbackLayout.w, h: fallbackLayout.h };
    });
  }, [fallbackLayout?.w, fallbackLayout?.h]);

  return size;
}
