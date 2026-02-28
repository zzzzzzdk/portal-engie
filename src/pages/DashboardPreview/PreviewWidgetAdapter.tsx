/**
 * PreviewWidgetAdapter - 预览模式下的 Widget 适配层
 *
 * 与 WidgetAdapter 类似，但从 PreviewDataContext 读取数据而非 store
 */

import React, { useMemo } from 'react';
import { usePreviewWidget } from './PreviewDataContext';
import WidgetWrapper from '@/components/WidgetWrapper';
import WidgetIconView from '@/components/WidgetIconView';
import { isIconOnlyMode } from '@/utils/widgetHelpers';
import WidgetErrorBoundary from '@/components/WidgetErrorBoundary';
import ClockWidget from '@/components/widgets/ClockWidget';
import StatsWidget from '@/components/widgets/StatsWidget';
import ChartWidget from '@/components/widgets/ChartWidget';
import CarouselWidget from '@/components/widgets/CarouselWidget';
import LinkWidget from '@/components/widgets/LinkWidget';
import NewsWidget from '@/components/widgets/NewsWidget';
import TopListWidget from '@/components/widgets/TopListWidget';
import SearchWidget from '@/components/widgets/SearchWidget';
import DataTableWidget from '@/components/widgets/DataTableWidget';
import CardGridWidget from '@/components/widgets/CardGridWidget';
import CustomFormWidget from '@/components/widgets/CustomFormWidget';
import HeaderBarWidget from '@/components/widgets/HeaderBarWidget';
import TypographyWidget from '@/components/widgets/TypographyWidget';
import MicroAppWidget from '@/components/widgets/MicroAppWidget';
import PageNavigatorWidget from '@/components/widgets/PageNavigatorWidget';
import IconNavWidget from '@/components/widgets/IconNavWidget';
import NavGroupWidget from '@/components/widgets/NavGroupWidget';
import MyDocumentsWidget from '@/components/widgets/MyDocumentsWidget';
import { WidgetType } from '@/types';

interface PreviewWidgetAdapterProps {
  widgetId: string;
  type: WidgetType;
}

const PreviewWidgetAdapter: React.FC<PreviewWidgetAdapterProps> = ({ widgetId, type }) => {
  const widget = usePreviewWidget(widgetId);

  const resolvedWidget = useMemo(() => widget, [widget]);

  if (!resolvedWidget) {
    return <div className="widget-not-found">Widget not found: {widgetId}</div>;
  }

  const { w, h } = resolvedWidget.layout;
  const forceIconOnly = resolvedWidget.config.forceIconOnly;

  const skipIconOnlyTypes: WidgetType[] = ['iconNav', 'typography', 'navGroup', 'headerBar', 'carousel'];
  const skipIconOnlyMode = skipIconOnlyTypes.includes(type);

  // 判断是否为 icon-only 模式
  if (!skipIconOnlyMode && (forceIconOnly || isIconOnlyMode(w, h))) {
    return (
      <WidgetErrorBoundary widgetId={resolvedWidget.id} widgetType={resolvedWidget.type}>
        <WidgetIconView
          widget={resolvedWidget}
          isEditMode={false} // 预览模式始终为非编辑状态
        />
      </WidgetErrorBoundary>
    );
  }

  const commonProps = { config: resolvedWidget.config, widget: resolvedWidget, isEditMode: false };

  const renderWidgetContent = () => {
    switch (type) {
      case 'clock':
        return <ClockWidget {...commonProps} />;
      case 'stats':
        return <StatsWidget {...commonProps} />;
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
      case 'dataTable':
        return <DataTableWidget {...commonProps} />;
      case 'cardGrid':
        return <CardGridWidget {...commonProps} />;
      case 'customForm':
        return <CustomFormWidget {...commonProps} />;
      case 'headerBar':
        return <HeaderBarWidget {...commonProps} />;
      case 'typography':
        return <TypographyWidget {...commonProps} />;
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
    <WidgetErrorBoundary widgetId={resolvedWidget.id} widgetType={resolvedWidget.type}>
      <WidgetWrapper widget={resolvedWidget} isPreviewMode>
        {renderWidgetContent()}
      </WidgetWrapper>
    </WidgetErrorBoundary>
  );
};

export default PreviewWidgetAdapter;
