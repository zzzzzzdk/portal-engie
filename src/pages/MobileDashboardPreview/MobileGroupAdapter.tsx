import React, { useMemo } from 'react'
import { isValidCssGradient } from '@/components/BackgroundSettings'
import type { DashboardConfig, Widget, WidgetGroup } from '@/types'
import type { MobileGroupLayoutItem } from './mobile-layout'
import MobileWidgetAdapter from './MobileWidgetAdapter'

interface MobileGroupAdapterProps {
  group: WidgetGroup
  item: MobileGroupLayoutItem
  widgetMap: Map<string, Widget>
  dashboardConfig?: DashboardConfig
}

const MobileGroupAdapter: React.FC<MobileGroupAdapterProps> = ({
  group,
  item,
  widgetMap,
  dashboardConfig,
}) => {
  const groupStyle = useMemo(() => {
    const config = group.config || {}
    const style: React.CSSProperties = {}

    if (config.backgroundType === 'color' && config.backgroundColor) {
      style.backgroundColor = config.backgroundColor
    } else if (config.backgroundType === 'image' && config.backgroundImage) {
      style.backgroundImage = `url(${config.backgroundImage})`
      style.backgroundSize = config.backgroundSize || 'cover'
      style.backgroundRepeat = config.backgroundRepeat || 'no-repeat'
      style.backgroundPosition = config.backgroundPosition || 'center'
    } else if (
      config.backgroundType === 'gradient' &&
      config.backgroundGradient &&
      isValidCssGradient(config.backgroundGradient)
    ) {
      style.background = config.backgroundGradient
    }

    const borderStyle = config.borderStyle ?? 'none'
    if (borderStyle !== 'none') {
      style.borderStyle = borderStyle
      style.borderWidth = config.borderWidth ?? 1
      style.borderColor = config.borderColor || 'var(--ant-color-border, #d9d9d9)'
    }

    if (config.borderRadius !== undefined && config.borderRadius !== null) {
      style.borderRadius = config.borderRadius
    }

    if (config.padding !== undefined && config.padding !== null) {
      style.padding = config.padding
    }

    if (config.backdropBlur !== undefined && config.backdropBlur !== null) {
      if (config.backdropBlur > 0) {
        style.backdropFilter = `blur(${config.backdropBlur}px)`
        style.WebkitBackdropFilter = `blur(${config.backdropBlur}px)`
      } else {
        style.backdropFilter = 'none'
        style.WebkitBackdropFilter = 'none'
      }
    }

    return style
  }, [group.config])

  const titleStyle = useMemo(() => {
    const config = group.config || {}
    const style: React.CSSProperties = {}

    if (config.titleColor) {
      style.color = config.titleColor
    }

    if (config.titleFontSize !== undefined && config.titleFontSize !== null) {
      const fontSize = Number(config.titleFontSize)
      if (Number.isFinite(fontSize)) {
        style.fontSize = fontSize
      }
    }

    if (config.titleFontWeight !== undefined && config.titleFontWeight !== null) {
      style.fontWeight = config.titleFontWeight
    }

    return style
  }, [group.config])

  const showTitle = group.config?.showTitle !== false

  return (
    <section className="mobile-dashboard-group" style={groupStyle}>
      {showTitle ? (
        <div className="mobile-dashboard-group__header">
          <h2 style={Object.keys(titleStyle).length ? titleStyle : undefined}>{group.title}</h2>
        </div>
      ) : null}
      <div className="mobile-dashboard-group__content">
        {item.children.map(childItem => {
          const widget = widgetMap.get(childItem.widgetId)
          if (!widget) {
            return null
          }

          return (
            <MobileWidgetAdapter
              key={childItem.widgetId}
              widget={widget}
              item={childItem}
              dashboardConfig={dashboardConfig}
            />
          )
        })}
      </div>
    </section>
  )
}

export default MobileGroupAdapter

