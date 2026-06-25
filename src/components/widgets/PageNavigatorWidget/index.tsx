import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LockOutlined } from '@ant-design/icons'
import IconRenderer from '@/components/IconRenderer'
import { useStore } from '@/store/useStore'
import { useSystemStore } from '@/store/useSystemStore'
import type { WidgetConfig } from '@/types'
import { buildDeployedSystemSet, isSystemDeployed } from '@/utils/systemDeployment'
import type { Widget } from '@/types'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import './index.scss'

interface NavigationItem {
  name: string
  path: string
  systemId?: string
  icon?: string
  openInNew?: boolean
}

interface PageNavigatorWidgetConfig extends WidgetConfig {
  items?: NavigationItem[]
  displayMode?: 'icon' | 'text'
  itemSize?: 'small' | 'medium' | 'large'
  itemColor?: string | { toHexString?: () => string }
}

interface PageNavigatorWidgetProps {
  config: PageNavigatorWidgetConfig
  widget?: Widget
}

const DEFAULT_ITEMS: NavigationItem[] = [
  { name: '首页', path: '/', icon: 'HomeOutlined' },
  { name: '工作台', path: '/workspace', icon: 'AppstoreOutlined' },
  { name: '设置', path: '/settings', icon: 'SettingOutlined' },
]

const getItemWidth = (size: 'small' | 'medium' | 'large', mode: 'icon' | 'text'): number => {
  if (mode === 'icon') {
    switch (size) {
      case 'small':
        return 40
      case 'large':
        return 60
      default:
        return 50
    }
  }

  switch (size) {
    case 'small':
      return 80
    case 'large':
      return 140
    default:
      return 110
  }
}

const normalizeColor = (
  color: string | { toHexString?: () => string } | undefined,
): string | undefined => {
  if (!color) return undefined
  if (typeof color === 'string') return color
  if (typeof color === 'object' && color.toHexString) {
    return color.toHexString()
  }
  return undefined
}

const PageNavigatorWidget: React.FC<PageNavigatorWidgetProps> = ({ config, widget }) => {
  const { isEditMode } = useStore()
  const sysConfig = useSystemStore(state => state.sysConfig)
  const emitWidgetEvent = useWidgetEventEmitter(widget)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const deployedSystemSet = useMemo(() => buildDeployedSystemSet(sysConfig), [sysConfig])

  const items = config.items && config.items.length > 0 ? config.items : DEFAULT_ITEMS
  const displayMode = config.displayMode || 'text'
  const itemSize = config.itemSize || 'medium'
  const itemColor = normalizeColor(config.itemColor)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    const resizeObserver = new ResizeObserver(updateWidth)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  const itemPositions = useMemo(() => {
    const count = items.length
    if (count === 0 || containerWidth === 0) return []

    const itemWidth = getItemWidth(itemSize, displayMode)
    const gap = 8
    const totalWidth = itemWidth * count + gap * (count - 1)
    const startX = (containerWidth - totalWidth) / 2

    return items.map((_, index) => ({
      left: startX + index * (itemWidth + gap),
    }))
  }, [items, containerWidth, itemSize, displayMode])

  const handleNavigate = (item: NavigationItem, index: number) => {
    emitWidgetEvent('page.change', { item, path: item.path, index }, 'click')

    if (isEditMode || !item.path || !isSystemDeployed(deployedSystemSet, item.systemId)) {
      return
    }

    if (item.openInNew) {
      window.open(item.path, '_blank')
      return
    }

    window.location.href = item.path
  }

  return (
    <div className={`page-navigator-widget mode-${displayMode} size-${itemSize}`} ref={containerRef}>
      <div className="nav-container">
        {items.map((item, index) => {
          const isAvailable = isSystemDeployed(deployedSystemSet, item.systemId)
          const canJump = Boolean(item.path) && !isEditMode && isAvailable

          return (
            <div
              key={`${index}-${item.name}`}
              className={`nav-item${canJump ? ' is-clickable' : ''}${!isAvailable ? ' is-disabled' : ''}`}
              style={{ left: itemPositions[index]?.left ?? 0, color: itemColor }}
              onClick={() => handleNavigate(item, index)}
              title={displayMode === 'icon' ? item.name : undefined}
            >
              {displayMode === 'icon' ? (
                <span className="nav-item__icon">
                  <IconRenderer
                    value={item.icon || 'AppstoreOutlined'}
                    size={itemSize === 'small' ? 20 : itemSize === 'large' ? 32 : 24}
                    color={itemColor}
                  />
                  {!isAvailable && item.path && (
                    <span className="nav-item__lock">
                      <LockOutlined />
                    </span>
                  )}
                </span>
              ) : (
                <span>{item.name}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PageNavigatorWidget
