import React from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useStore } from '@/store/useStore';
import WidgetWrapper from '@/components/WidgetWrapper';
import clsx from 'clsx';
import { Button, Tooltip } from 'antd';
import { FullscreenExitOutlined } from '@ant-design/icons';
import ClockWidget from '@/components/widgets/ClockWidget';
import StatsWidget from '@/components/widgets/StatsWidget';
import ChartWidget from '@/components/widgets/ChartWidget';
import LinkWidget from '@/components/widgets/LinkWidget';
import NewsWidget from '@/components/widgets/NewsWidget';
import TopListWidget from '@/components/widgets/TopListWidget';
import SearchWidget from '@/components/widgets/SearchWidget';
import DataTableWidget from '@/components/widgets/DataTableWidget';
import CardGridWidget from '@/components/widgets/CardGridWidget';
import CustomFormWidget from '@/components/widgets/CustomFormWidget';
import MicroAppWidget from '@/components/widgets/MicroAppWidget';
import MyDocumentsWidget from '@/components/widgets/MyDocumentsWidget';
import WidgetErrorBoundary from '@/components/WidgetErrorBoundary';
import FloatingModule from '@/components/FloatingModule';
import './index.scss';


const ResponsiveReactGridLayout = WidthProvider(RGL);

// 验证并清理布局数据，确保所有必需的数值字段都是有效数字
const sanitizeLayout = (layout: Layout): Layout => {
  return {
    ...layout,
    i: layout.i || '',
    x: typeof layout.x === 'number' && !isNaN(layout.x) ? layout.x : 0,
    y: typeof layout.y === 'number' && !isNaN(layout.y) ? layout.y : 0,
    w: typeof layout.w === 'number' && !isNaN(layout.w) && layout.w > 0 ? layout.w : 4,
    h: typeof layout.h === 'number' && !isNaN(layout.h) && layout.h > 0 ? layout.h : 1,
    minW: typeof layout.minW === 'number' && !isNaN(layout.minW) ? layout.minW : 1,
    minH: typeof layout.minH === 'number' && !isNaN(layout.minH) ? layout.minH : 1,
  };
};

const Dashboard: React.FC = () => {
  const { widgets, updateLayout, isEditMode, isFullScreen, toggleFullScreen, floatingModules } = useStore();

  const onLayoutChange = (layout: Layout[]) => {
    updateLayout(layout);
  };

  // 清理所有 widget 的布局数据
  const sanitizedWidgets = widgets.map(widget => ({
    ...widget,
    layout: sanitizeLayout(widget.layout)
  }));

  const renderWidgetContent = (widget: any) => {
    const commonProps = { config: widget.config, widget };
    switch (widget.type) {
      case 'clock':
        return <ClockWidget {...commonProps} />;
      case 'stats':
        return <StatsWidget {...commonProps} />;
      case 'chart':
        return <ChartWidget {...commonProps} />;
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
      case 'microApp':
        return <MicroAppWidget {...commonProps} />;
      case 'myDocuments':
        return <MyDocumentsWidget {...commonProps} />;
      default:
        return <div>{widget.type} Widget</div>;
    }
  };

  return (
    <div 
      className={clsx('dashboard-container', { 
        'grid-background': isEditMode,
        'fullscreen': isFullScreen
      })}
    >
      {isFullScreen && (
        <div className="dashboard-fullscreen-exit">
          <Tooltip title="Exit Full Screen">
            <Button
              type="primary"
              shape="circle"
              icon={<FullscreenExitOutlined />}
              onClick={toggleFullScreen}
              size="large"
            />
          </Tooltip>
        </div>
      )}
      <ResponsiveReactGridLayout
        className="layout"
        layout={sanitizedWidgets.map((w) => w.layout)}
        cols={12}
        rowHeight={120}
        onLayoutChange={onLayoutChange}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        draggableHandle=".grid-drag-handle"
        margin={[10, 10]}
        compactType={null}
        preventCollision={true}
        // isBounded={true}
      >
        {sanitizedWidgets.map((widget) => (
          <div key={widget.id} data-grid={widget.layout}>
            <WidgetWrapper widget={widget}>
              <WidgetErrorBoundary widgetId={widget.id} widgetType={widget.type}>
                {renderWidgetContent(widget)}
              </WidgetErrorBoundary>
            </WidgetWrapper>
          </div>
        ))}
      </ResponsiveReactGridLayout>

      {/* Render all floating modules */}
      {floatingModules.map(module => (
        <FloatingModule key={module.id} widget={module} />
      ))}
    </div>
  );
};

export default Dashboard;
