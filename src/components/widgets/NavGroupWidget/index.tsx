import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppstoreOutlined, LockOutlined } from '@ant-design/icons'
import { Empty, Spin, Tag, Tooltip, Typography } from 'antd'
import clsx from 'clsx'
import IconRenderer from '@/components/IconRenderer'
import { safeIntervalMs } from '@/constants/dashboard'
import { useSystemStore } from '@/store/useSystemStore'
import type { NavItem, Widget, WidgetConfig } from '@/types'
import { buildDeployedSystemSet, isSystemDeployed } from '@/utils/systemDeployment'
import { requestWidgetApi } from '@/utils/widgetApi'
import { DEFAULT_NAV_GROUP_LIST_FIELD } from '@/utils/widgetApiDefaults'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'
import { useWidgetRuntimeParams } from '@/hooks/useWidgetRuntimeParams'
import './index.scss'

interface NavGroupWidgetConfig extends WidgetConfig {
  groupTitle?: string
  layout?: 'flex' | 'grid' | 'list' | 'text' | 'tag'
  columns?: number
  iconSize?: number
  showLabel?: boolean
  staticItems?: NavItem[]
  itemGap?: number
  itemBgColor?: string
  itemTextColor?: string
  itemIconColor?: string
  itemBlur?: number
  itemBorderRadius?: number
  itemSize?: 'small' | 'middle' | 'large'
  textIcon?: string
  textIconSize?: number
  textColumns?: number
}

interface NavGroupWidgetProps {
  config?: NavGroupWidgetConfig
  widget?: Widget
  isEditMode?: boolean
}

const normalizeColor = (color: any, defaultColor: string): string => {
  if (!color) return defaultColor
  if (typeof color === 'string') return color
  if (typeof color === 'object' && color?.toHexString) {
    return color.toHexString()
  }
  if (typeof color === 'object' && color?.metaColor) {
    const { r, g, b, a } = color.metaColor
    if (a !== undefined && a < 1) {
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }
  return defaultColor
}

const ICON_BG_GRADIENT_PRESETS = [
  'linear-gradient(137deg, #6fa4ff 15%, #406eef 86%)',
  'linear-gradient(137deg, #68d56e 15%, #3eb864 86%)',
  'linear-gradient(135deg, #fda96b 9%, #fe700e 91%)',
  'linear-gradient(137deg, #ff7eb3 15%, #e6488d 86%)',
  'linear-gradient(135deg, #a78bfa 12%, #7c3aed 88%)',
  'linear-gradient(137deg, #5eead4 15%, #14b8a6 86%)',
  'linear-gradient(135deg, #fbbf24 10%, #f59e0b 90%)',
  'linear-gradient(137deg, #f87171 15%, #dc2626 86%)',
  'linear-gradient(135deg, #60a5fa 12%, #2563eb 88%)',
  'linear-gradient(137deg, #c084fc 15%, #9333ea 86%)',
  'linear-gradient(135deg, #4ade80 10%, #16a34a 90%)',
  'linear-gradient(137deg, #fb923c 15%, #ea580c 86%)',
]

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: '1', url: '/dashboard', icon: 'DashboardOutlined', name: 'Dashboard' },
  { id: '2', url: '/settings', icon: 'SettingOutlined', name: '设置' },
  { id: '3', url: '/users', icon: 'UserOutlined', name: '用户' },
  { id: '4', url: '/files', icon: 'FolderOutlined', name: '文件' },
]

const getRandomGradient = (index: number) => ICON_BG_GRADIENT_PRESETS[index % ICON_BG_GRADIENT_PRESETS.length]

const NavGroupWidget: React.FC<NavGroupWidgetProps> = ({ config, widget, isEditMode }) => {
  const sysConfig = useSystemStore(state => state.sysConfig)
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const emitWidgetEvent = useWidgetEventEmitter(widget)
  const { runtimeParamsRef, setRuntimeParams, clearRuntimeParams } = useWidgetRuntimeParams()

  const deployedSystemSet = useMemo(() => buildDeployedSystemSet(sysConfig), [sysConfig])

  const widgetConfig = config as NavGroupWidgetConfig
  const apiEndpoint = widgetConfig?.apiEndpoint
  const refreshInterval = widgetConfig?.refreshInterval || 0
  const layout = widgetConfig?.layout || 'flex'
  const columns = widgetConfig?.columns || 4
  const iconSize = widgetConfig?.iconSize || 32
  const showLabel = widgetConfig?.showLabel !== false
  const staticItems = widgetConfig?.staticItems
  const itemGap = widgetConfig?.itemGap || 12
  const itemBgColor = normalizeColor(widgetConfig?.itemBgColor, '')
  const itemTextColor = normalizeColor(widgetConfig?.itemTextColor, '')
  const itemIconColor = normalizeColor(widgetConfig?.itemIconColor, '#FFFFFF')
  const itemBlur = widgetConfig?.itemBlur || 0
  const itemBorderRadius = widgetConfig?.itemBorderRadius ?? 4
  const itemSize = widgetConfig?.itemSize || 'middle'
  const textIcon = widgetConfig?.textIcon || 'SearchOutlined'
  const textIconSize = widgetConfig?.textIconSize || 16
  const textColumns = widgetConfig?.textColumns || 1

  const isItemAvailable = useCallback(
    (item: NavItem) => isSystemDeployed(deployedSystemSet, item.systemId),
    [deployedSystemSet],
  )

  const canItemJump = useCallback(
    (item: NavItem) => Boolean(item.url) && !isEditMode && isItemAvailable(item),
    [isEditMode, isItemAvailable],
  )

  const loadData = useCallback(async () => {
    if (staticItems && staticItems.length > 0) {
      setNavItems(staticItems)
      return
    }

    if (!apiEndpoint) {
      setNavItems(DEFAULT_NAV_ITEMS)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await requestWidgetApi({
        endpoint: apiEndpoint,
        method: widgetConfig?.apiMethod,
        headers: widgetConfig?.apiHeaders,
        query: widgetConfig?.apiQuery,
        body: widgetConfig?.apiBody,
        dataField: widgetConfig?.apiDataField,
        listField: widgetConfig?.apiListField || DEFAULT_NAV_GROUP_LIST_FIELD,
        timeout: widgetConfig?.timeout,
        runtimeParams: runtimeParamsRef.current,
      })
      const sourceList = result.list.length
        ? result.list
        : Array.isArray(result.data)
          ? result.data
          : []
      setNavItems(sourceList)
      emitWidgetEvent('data.loaded', { items: sourceList, raw: result.raw }, 'system')
    } catch (err: any) {
      console.error('NavGroupWidget: 加载数据失败', err)
      const message = err.message || '数据加载失败'
      setError(message)
      emitWidgetEvent('data.error', { message, error: err }, 'system')
      setNavItems(DEFAULT_NAV_ITEMS)
    } finally {
      setLoading(false)
    }
  }, [
    apiEndpoint,
    staticItems,
    widgetConfig?.apiBody,
    widgetConfig?.apiDataField,
    widgetConfig?.apiHeaders,
    widgetConfig?.apiListField,
    widgetConfig?.apiMethod,
    widgetConfig?.apiQuery,
    emitWidgetEvent,
    runtimeParamsRef,
  ])

  useWidgetEventInputs(widget, {
    reload: () => {
      loadData()
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
      loadData()
    },
    clearParams: () => {
      clearRuntimeParams()
      loadData()
    },
  })

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (refreshInterval > 0 && apiEndpoint) {
      intervalRef.current = setInterval(() => {
        loadData()
      }, safeIntervalMs(refreshInterval))
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [apiEndpoint, loadData, refreshInterval])

  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      loadData()
    }
  }, [widget?.refreshCount, loadData])

  const handleItemClick = (item: NavItem, index: number) => {
    emitWidgetEvent('nav.itemClick', { item, index, systemId: item.systemId, url: item.url }, 'click')

    if (!canItemJump(item)) {
      return
    }

    if (item.openInNew !== false) {
      window.open(item.url, '_blank')
      return
    }

    window.location.href = item.url
  }

  const renderIcon = (item: NavItem) => {
    const iconColor = item.iconColor || (item.iconBgColor ? '#ffffff' : itemIconColor)

    if (!item.icon) {
      return <AppstoreOutlined style={{ fontSize: iconSize, color: iconColor }} />
    }

    return (
      <IconRenderer
        value={item.icon}
        size={iconSize}
        color={iconColor}
        fallbackText={item.name?.charAt(0) || 'N'}
        fallbackColor={iconColor}
      />
    )
  }

  const getIconBgStyle = (item: NavItem, index: number): React.CSSProperties => {
    const bgValue = item.iconBgColor || itemBgColor || getRandomGradient(index)
    return {
      background: bgValue,
      width: iconSize + 36,
      height: iconSize + 36,
      borderRadius: itemBorderRadius,
      backdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
      WebkitBackdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
    }
  }

  const renderIconBadge = (item: NavItem, index: number, extraStyle?: React.CSSProperties) => {
    const isAvailable = isItemAvailable(item)

    return (
      <div
        className={clsx('nav-group-widget__icon-bg', {
          'nav-group-widget__icon-bg--disabled': !isAvailable && item.url,
        })}
        style={{
          ...getIconBgStyle(item, index),
          ...extraStyle,
        }}
      >
        {renderIcon(item)}
        {!isAvailable && item.url && (
          <span className="nav-group-widget__lock">
            <LockOutlined />
          </span>
        )}
      </div>
    )
  }

  if (loading && navItems.length === 0) {
    return (
      <div className="nav-group-widget__status">
        <Spin tip="加载中..." />
      </div>
    )
  }

  if (!loading && navItems.length === 0) {
    return (
      <div className="nav-group-widget__status">
        <Empty description={error || '暂无导航数据'} />
      </div>
    )
  }

  if (layout === 'flex') {
    return (
      <div className="nav-group-widget__flex" style={{ gap: itemGap }}>
        {navItems.map((item, index) => {
          const isAvailable = isItemAvailable(item)

          return (
            <Tooltip key={item.id || index} title={item.description || item.name}>
              <div
                className={clsx('nav-group-widget__flex-item', {
                  'nav-group-widget__flex-item--clickable': canItemJump(item),
                  'nav-group-widget__flex-item--disabled': !isAvailable && item.url,
                })}
                onClick={() => handleItemClick(item, index)}
              >
                {renderIconBadge(item, index, { marginBottom: showLabel ? 8 : 0 })}
                {showLabel && (
                  <Typography.Text
                    ellipsis={{ tooltip: item.name }}
                    className="nav-group-widget__flex-label"
                    style={{ color: item.textColor || itemTextColor || undefined }}
                  >
                    {item.name}
                  </Typography.Text>
                )}
              </div>
            </Tooltip>
          )
        })}
      </div>
    )
  }

  if (layout === 'grid') {
    return (
      <div
        className="nav-group-widget__grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: itemGap,
        }}
      >
        {navItems.map((item, index) => {
          const isAvailable = isItemAvailable(item)

          return (
            <Tooltip key={item.id || index} title={item.description || item.name}>
              <div
                className={clsx('nav-group-widget__grid-item', {
                  'nav-group-widget__grid-item--clickable': canItemJump(item),
                  'nav-group-widget__grid-item--disabled': !isAvailable && item.url,
                })}
                onClick={() => handleItemClick(item, index)}
              >
                {renderIconBadge(item, index, { marginBottom: showLabel ? 8 : 0 })}
                {showLabel && (
                  <Typography.Text
                    ellipsis={{ tooltip: item.name }}
                    className="nav-group-widget__grid-label"
                    style={{ color: item.textColor || itemTextColor || undefined }}
                  >
                    {item.name}
                  </Typography.Text>
                )}
              </div>
            </Tooltip>
          )
        })}
      </div>
    )
  }

  if (layout === 'text') {
    const textPadding = itemSize === 'small' ? '6px 12px' : itemSize === 'large' ? '12px 20px' : '8px 16px'
    const textFontSize = itemSize === 'small' ? 12 : itemSize === 'large' ? 16 : 14

    return (
      <div
        className="nav-group-widget__text"
        style={{
          gridTemplateColumns: `repeat(${textColumns}, 1fr)`,
          gap: itemGap,
        }}
      >
        {navItems.map((item, index) => {
          const isAvailable = isItemAvailable(item)

          return (
            <div
              key={item.id || index}
              className={clsx('nav-group-widget__text-item', {
                'nav-group-widget__text-item--clickable': canItemJump(item),
                'nav-group-widget__text-item--disabled': !isAvailable && item.url,
              })}
              style={{
                padding: textPadding,
                fontSize: textFontSize,
                background: item.iconBgColor || itemBgColor || undefined,
                color: item.textColor || itemTextColor || undefined,
                borderRadius: itemBorderRadius,
                backdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
                WebkitBackdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
              }}
              title={item.name}
              onClick={() => handleItemClick(item, index)}
            >
              <span className="nav-group-widget__text-icon">
                <IconRenderer
                  value={item.icon || textIcon}
                  size={textIconSize}
                  color={item.iconColor || item.textColor || itemTextColor || itemIconColor}
                />
              </span>
              <span className="nav-group-widget__text-label">{item.name}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (layout === 'tag') {
    const tagWidth = itemSize === 'small' ? 100 : itemSize === 'large' ? 190 : 140
    const tagHeight = itemSize === 'small' ? 38 : itemSize === 'large' ? 72 : 52
    const tagFontSize = itemSize === 'small' ? 12 : itemSize === 'large' ? 16 : 14

    return (
      <div className="nav-group-widget__tag" style={{ gap: itemGap }}>
        {navItems.map((item, index) => {
          const isAvailable = isItemAvailable(item)

          return (
            <Tag
              key={item.id || index}
              className={clsx('nav-group-widget__tag-item', {
                'nav-group-widget__tag-item--clickable': canItemJump(item),
                'nav-group-widget__tag-item--disabled': !isAvailable && item.url,
              })}
              style={{
                width: tagWidth,
                height: tagHeight,
                fontSize: tagFontSize,
                background: item.iconBgColor || itemBgColor || undefined,
                color: item.textColor || itemTextColor || undefined,
                borderRadius: itemBorderRadius,
                border: 'none',
                cursor: canItemJump(item) ? 'pointer' : 'default',
                backdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
                WebkitBackdropFilter: itemBlur > 0 ? `blur(${itemBlur}px)` : undefined,
              }}
              title={item.name}
              onClick={() => handleItemClick(item, index)}
            >
              <span className="nav-group-widget__tag-text">{item.name}</span>
            </Tag>
          )
        })}
      </div>
    )
  }

  return (
    <div className="nav-group-widget__list">
      {navItems.map((item, index) => {
        const isAvailable = isItemAvailable(item)

        return (
          <div
            key={item.id || index}
            className={clsx('nav-group-widget__list-item', {
              'nav-group-widget__list-item--clickable': canItemJump(item),
              'nav-group-widget__list-item--disabled': !isAvailable && item.url,
            })}
            onClick={() => handleItemClick(item, index)}
          >
            {renderIconBadge(item, index, { marginRight: 12 })}
            <div className="nav-group-widget__list-content">
              <Typography.Text
                strong
                ellipsis
                style={{ color: item.textColor || itemTextColor || undefined }}
              >
                {item.name}
              </Typography.Text>
              {item.description && (
                <Typography.Text
                  type="secondary"
                  className="nav-group-widget__list-description"
                  style={{
                    color: item.textColor
                      ? `${item.textColor}99`
                      : itemTextColor
                        ? `${itemTextColor}99`
                        : undefined,
                  }}
                  ellipsis
                >
                  {item.description}
                </Typography.Text>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default NavGroupWidget
