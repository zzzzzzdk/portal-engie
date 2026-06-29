import React from 'react'
import WidgetErrorBoundary from '@/components/WidgetErrorBoundary'
import ClockWidget from '@/components/widgets/ClockWidget'
import StatsWidget from '@/components/widgets/StatsWidget'
import IndicatorCardWidget from '@/components/widgets/IndicatorCardWidget'
import IndicatorCardListWidget from '@/components/widgets/IndicatorCardListWidget'
import RecognitionCardWidget from '@/components/widgets/RecognitionCardWidget'
import ChartWidget from '@/components/widgets/ChartWidget/index.'
import CarouselWidget from '@/components/widgets/CarouselWidget'
import LinkWidget from '@/components/widgets/LinkWidget'
import NewsWidget from '@/components/widgets/NewsWidget'
import TopListWidget from '@/components/widgets/TopListWidget'
import SearchWidget from '@/components/widgets/SearchWidget'
import QueryFilterWidget from '@/components/widgets/QueryFilterWidget'
import DataTableWidget from '@/components/widgets/DataTableWidget'
import CardGridWidget from '@/components/widgets/CardGridWidget'
import CustomFormWidget from '@/components/widgets/CustomFormWidget'
import NativeFormWidget from '@/components/widgets/NativeFormWidget'
import NativeFormFieldWidget from '@/components/widgets/NativeFormFieldWidget'
import HeaderBarWidget from '@/components/widgets/HeaderBarWidget'
import TypographyWidget from '@/components/widgets/TypographyWidget'
import RichTextWidget from '@/components/widgets/RichTextWidget'
import MicroAppWidget from '@/components/widgets/MicroAppWidget'
import PageNavigatorWidget from '@/components/widgets/PageNavigatorWidget'
import IconNavWidget from '@/components/widgets/IconNavWidget'
import NavGroupWidget from '@/components/widgets/NavGroupWidget'
import MyDocumentsWidget from '@/components/widgets/MyDocumentsWidget'
import MicroAppDegradeCard from '@/components/MicroAppDegradeCard'
import { usePortalRuntime } from '@/runtime/portal-runtime-context'
import type { DashboardConfig, Widget } from '@/types'
import type { MobileLayoutItem } from './mobile-layout'

interface MobileWidgetAdapterProps {
  widget: Widget
  item: MobileLayoutItem
  dashboardConfig?: DashboardConfig
}

const MobileWidgetAdapter: React.FC<MobileWidgetAdapterProps> = ({
  widget,
  item,
  dashboardConfig,
}) => {
  const { microAppMode } = usePortalRuntime()
  const commonProps = { config: widget.config, widget, isEditMode: false }
  const showTitle = widget.config.showTitle !== false

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'clock':
        return <ClockWidget {...commonProps} />
      case 'stats':
        return <StatsWidget {...commonProps} />
      case 'indicatorCard':
        return <IndicatorCardWidget {...commonProps} />
      case 'indicatorCardList':
        return <IndicatorCardListWidget {...commonProps} />
      case 'recognitionCard':
        return <RecognitionCardWidget {...commonProps} />
      case 'chart':
        return <ChartWidget {...commonProps} />
      case 'carousel':
        return <CarouselWidget {...commonProps} />
      case 'link':
        return <LinkWidget {...commonProps} />
      case 'news':
        return <NewsWidget {...commonProps} />
      case 'topList':
        return <TopListWidget {...commonProps} />
      case 'search':
        return <SearchWidget {...commonProps} />
      case 'queryFilter':
        return <QueryFilterWidget {...commonProps} />
      case 'dataTable':
        return <DataTableWidget {...commonProps} />
      case 'cardGrid':
        return <CardGridWidget {...commonProps} />
      case 'customForm':
        return <CustomFormWidget {...commonProps} />
      case 'nativeForm':
        return <NativeFormWidget {...commonProps} />
      case 'nativeFormField':
        return <NativeFormFieldWidget {...commonProps} />
      case 'headerBar':
        return <HeaderBarWidget {...commonProps} />
      case 'typography':
        return <TypographyWidget {...commonProps} />
      case 'richText':
        return <RichTextWidget {...commonProps} />
      case 'microApp':
        return microAppMode === 'degrade'
          ? (
            <MicroAppDegradeCard
              title={widget.title}
              systemId={widget.config.systemId}
              moduleId={widget.config.moduleId}
              url={widget.config.microAppUrl}
              entry={widget.config.microAppEntry}
            />
          )
          : <MicroAppWidget {...commonProps} dashboardConfig={dashboardConfig} />
      case 'pageNavigator':
        return <PageNavigatorWidget {...commonProps} />
      case 'iconNav':
        return <IconNavWidget {...commonProps} />
      case 'navGroup':
        return <NavGroupWidget {...commonProps} />
      case 'myDocuments':
        return <MyDocumentsWidget {...commonProps} />
      default:
        return <div className="mobile-dashboard-preview__unsupported">Unknown Widget Type: {widget.type}</div>
    }
  }

  const contentStyle: React.CSSProperties = item.height === 'auto'
    ? {}
    : { minHeight: item.height, height: item.height }

  return (
    <section className={`mobile-dashboard-widget mobile-dashboard-widget--${item.display} mobile-dashboard-widget--${widget.type}`}>
      {showTitle && widget.type !== 'headerBar' ? (
        <div className="mobile-dashboard-widget__header">
          <h2>{widget.title}</h2>
        </div>
      ) : null}
      <div className="mobile-dashboard-widget__content" style={contentStyle}>
        <WidgetErrorBoundary widgetId={widget.id} widgetType={widget.type}>
          {renderWidgetContent()}
        </WidgetErrorBoundary>
      </div>
    </section>
  )
}

export default MobileWidgetAdapter

