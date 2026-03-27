import React, { useMemo, useRef, useState, useEffect } from 'react'
import { GridStackOptions, GridStackWidget } from 'gridstack'
import {
  GridStackProvider,
  GridStackRenderProvider,
  GridStackRender,
  useGridStackContext,
} from '@/lib/gridstack'
import { Widget, WidgetGroup, GRID_DENSITY_PRESETS } from '@/types'
import type { PublishedDashboard } from '@/services'
import { isValidCssGradient } from '@/components/BackgroundSettings'
import { PreviewDataProvider } from './PreviewDataContext'
import PreviewWidgetAdapter from './PreviewWidgetAdapter'
import PreviewGroupAdapter from './PreviewGroupAdapter'
import FloatingModule from '@/components/FloatingModule'
import { CanvasThemeProvider } from '@/theme/CanvasThemeProvider'
import clsx from 'clsx'

interface DashboardCanvasRendererProps {
  dashboardData: PublishedDashboard
}

const PreviewInner: React.FC<{ dashboardData: PublishedDashboard }> = ({ dashboardData }) => {
  const { gridStack } = useGridStackContext()
  const { floatingModules, dashboardConfig } = dashboardData
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const isDark = dashboardConfig?.themeMode === 'dark'

  const densityPreset = GRID_DENSITY_PRESETS.standard
  const [gridVisualMetrics, setGridVisualMetrics] = useState({
    cellWidth: 120,
    cellHeight: densityPreset.cellHeight,
    margin: densityPreset.margin,
  })

  const backgroundStyle = useMemo(() => {
    const style: React.CSSProperties = {
      '--grid-cell-width': `${gridVisualMetrics.cellWidth}px`,
      '--grid-cell-height': `${gridVisualMetrics.cellHeight}px`,
      '--grid-gutter': `${gridVisualMetrics.margin}px`,
    } as React.CSSProperties

    if (dashboardConfig) {
      if (dashboardConfig.backgroundType === 'image' && dashboardConfig.backgroundImage) {
        style.backgroundImage = `url(${dashboardConfig.backgroundImage})`
        style.backgroundSize = dashboardConfig.backgroundSize || 'auto'
        style.backgroundPosition = dashboardConfig.backgroundPosition || 'center'
        style.backgroundRepeat = dashboardConfig.backgroundRepeat || 'no-repeat'
        style.backgroundAttachment = 'fixed'
      } else if (
        dashboardConfig.backgroundType === 'gradient' &&
        dashboardConfig.backgroundGradient &&
        isValidCssGradient(dashboardConfig.backgroundGradient)
      ) {
        style.background = dashboardConfig.backgroundGradient
      } else if (dashboardConfig.backgroundType === 'color' && dashboardConfig.backgroundColor) {
        style.backgroundColor = dashboardConfig.backgroundColor
      } else {
        style.backgroundColor = isDark ? '#141414' : 'var(--ant-color-bg-layout, #f5f5f5)'
      }
    } else {
      style.backgroundColor = isDark ? '#141414' : 'var(--ant-color-bg-layout, #f5f5f5)'
    }

    return style
  }, [dashboardConfig, gridVisualMetrics, isDark])

  useEffect(() => {
    if (gridStack) {
      gridStack.disable()
    }
  }, [gridStack])

  useEffect(() => {
    if (!gridStack?.el) return

    const updateWidth = () => {
      setGridVisualMetrics(prev => ({
        ...prev,
        cellWidth: gridStack.cellWidth(),
      }))
    }

    updateWidth()

    const observer = new ResizeObserver(() => {
      updateWidth()
    })

    observer.observe(gridStack.el)

    return () => observer.disconnect()
  }, [gridStack])

  return (
    <CanvasThemeProvider containerRef={canvasContainerRef} overrideConfig={dashboardConfig}>
      <div
        ref={canvasContainerRef}
        className={clsx('dashboard-preview-container')}
        data-export-root="dashboard-preview"
        style={backgroundStyle}
      >
        <GridStackRenderProvider>
          <GridStackRender
            componentMap={{
              PreviewWidgetAdapter,
              PreviewGroupAdapter,
            }}
          />
        </GridStackRenderProvider>

        {floatingModules?.map(module => (
          <FloatingModule
            key={module.id}
            widget={module}
            dashboardConfig={dashboardConfig}
          />
        ))}
      </div>
    </CanvasThemeProvider>
  )
}

export const countDashboardMicroApps = (dashboardData: PublishedDashboard | null): number => {
  if (!dashboardData) {
    return 0
  }

  const widgetCount = dashboardData.widgets.filter(widget => widget.type === 'microApp').length
  const floatingCount = dashboardData.floatingModules.filter(module => {
    return (module.config as Record<string, any>)?.contentType === 'microApp'
  }).length

  return widgetCount + floatingCount
}

function createWidgetGridNode(widget: Widget): GridStackWidget & { id: string } {
  const normalizedX = Number.isFinite(widget.layout.x) ? widget.layout.x : 0
  const normalizedY = Number.isFinite(widget.layout.y) ? widget.layout.y : 0

  return {
    id: widget.id,
    x: normalizedX,
    y: normalizedY,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.layout.minW || 1,
    minH: widget.layout.minH || 1,
    content: JSON.stringify({
      name: 'PreviewWidgetAdapter',
      props: {
        widgetId: widget.id,
        type: widget.type,
      },
    }),
  }
}

function createGroupGridWidget(
  group: WidgetGroup,
  widgetMap: Map<string, Widget>,
  preset: { cellHeight: number; margin: number },
): (GridStackWidget & {
  id: string
  subGridOpts: GridStackOptions & { children: (GridStackWidget & { id: string })[] }
}) | null {
  const children =
    group.widgetIds
      .map(id => widgetMap.get(id))
      .filter((widget): widget is Widget => Boolean(widget))
      .map(widget => {
        const relativeX = (widget.layout.x || 0) - (group.layout.x || 0)
        const relativeY = (widget.layout.y || 0) - (group.layout.y || 0)
        return {
          id: widget.id,
          x: Math.max(relativeX, 0),
          y: Math.max(relativeY, 0),
          w: widget.layout.w,
          h: widget.layout.h,
          minW: widget.layout.minW || 1,
          minH: widget.layout.minH || 1,
          content: JSON.stringify({
            name: 'PreviewWidgetAdapter',
            props: {
              widgetId: widget.id,
              type: widget.type,
            },
          }),
        }
      }) || []

  const normalizedX = Number.isFinite(group.layout.x) ? group.layout.x : 0
  const normalizedY = Number.isFinite(group.layout.y) ? group.layout.y : 0

  return {
    id: group.id,
    x: normalizedX,
    y: normalizedY,
    w: group.layout.w,
    h: group.layout.h,
    minW: group.layout.minW || 2,
    minH: group.layout.minH || 2,
    content: JSON.stringify({
      name: 'PreviewGroupAdapter',
      props: {
        groupId: group.id,
      },
    }),
    subGridOpts: {
      column: 'auto',
      cellHeight: preset.cellHeight,
      margin: preset.margin,
      animate: false,
      float: true,
      staticGrid: true,
      class: 'grid-stack-group-wrap',
      subGridDynamic: true,
      children,
    },
  }
}

export const buildInitialChildren = (
  widgets: Widget[],
  groups: WidgetGroup[],
  preset: { cellHeight: number; margin: number },
): GridStackWidget[] => {
  const widgetMap = new Map(widgets.map(widget => [widget.id, widget]))
  const rootWidgets = widgets
    .filter(widget => !widget.groupId)
    .map(createWidgetGridNode)

  const groupWidgets = groups
    .map(group => createGroupGridWidget(group, widgetMap, preset))
    .filter((groupNode): groupNode is Exclude<ReturnType<typeof createGroupGridWidget>, null> =>
      Boolean(groupNode)
    )

  return [...rootWidgets, ...groupWidgets]
}

const DashboardCanvasRenderer: React.FC<DashboardCanvasRendererProps> = ({ dashboardData }) => {
  const initialOptions = useMemo((): GridStackOptions => {
    const preset = GRID_DENSITY_PRESETS.compact
    const children = buildInitialChildren(dashboardData.widgets, dashboardData.groups, preset)

    return {
      column: preset.columnCount,
      cellHeight: preset.cellHeight,
      margin: preset.margin,
      float: true,
      staticGrid: true,
      animate: false,
      children,
    }
  }, [dashboardData])

  return (
    <PreviewDataProvider
      widgets={dashboardData.widgets}
      groups={dashboardData.groups}
      floatingModules={dashboardData.floatingModules}
      dashboardConfig={dashboardData.dashboardConfig}
    >
      <GridStackProvider initialOptions={initialOptions}>
        <PreviewInner dashboardData={dashboardData} />
      </GridStackProvider>
    </PreviewDataProvider>
  )
}

export default DashboardCanvasRenderer
