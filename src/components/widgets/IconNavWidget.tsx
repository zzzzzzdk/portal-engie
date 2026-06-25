import React, { useMemo } from 'react'
import { LinkOutlined, LockOutlined } from '@ant-design/icons'
import IconRenderer from '@/components/IconRenderer'
import { useSystemStore } from '@/store/useSystemStore'
import type { Widget, WidgetConfig } from '@/types'
import { buildDeployedSystemSet, isSystemDeployed } from '@/utils/systemDeployment'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'

interface IconNavWidgetConfig extends WidgetConfig {
  icon?: string
  url?: string
  systemId?: string
  openInNew?: boolean
  iconSize?: number
  iconColor?: string
  hoverColor?: string
}

interface IconNavWidgetProps {
  config?: IconNavWidgetConfig
  widget?: Widget
  isEditMode?: boolean
}

const normalizeColor = (color: any, defaultColor: string): string => {
  if (!color) return defaultColor
  if (typeof color === 'string') return color
  if (typeof color === 'object' && color?.toHexString) {
    return color.toHexString()
  }
  return defaultColor
}

const IconNavWidget: React.FC<IconNavWidgetProps> = ({ config, widget, isEditMode }) => {
  const sysConfig = useSystemStore(state => state.sysConfig)
  const widgetConfig = config as IconNavWidgetConfig
  const emitWidgetEvent = useWidgetEventEmitter(widget)

  const deployedSystemSet = useMemo(() => buildDeployedSystemSet(sysConfig), [sysConfig])

  const icon = widgetConfig?.icon || 'AppstoreOutlined'
  const url = widgetConfig?.url || ''
  const openInNew = widgetConfig?.openInNew ?? false
  const iconSize = widgetConfig?.iconSize || 48
  const iconColor = normalizeColor(widgetConfig?.iconColor, '#1890ff')
  const isAvailable = isSystemDeployed(deployedSystemSet, widgetConfig?.systemId)
  const canJump = Boolean(url) && !isEditMode && isAvailable

  const handleClick = () => {
    emitWidgetEvent('nav.click', { url, icon, title: widgetConfig?.title, systemId: widgetConfig?.systemId }, 'click')

    if (!canJump) {
      return
    }

    if (openInNew) {
      window.open(url, '_blank')
      return
    }

    window.location.href = url
  }

  const renderIcon = () => {
    if (!icon) {
      return <LinkOutlined style={{ fontSize: iconSize, color: iconColor }} />
    }

    return (
      <IconRenderer
        value={icon}
        size={iconSize}
        color={iconColor}
        fallbackText="Nav"
        fallbackColor={iconColor}
      />
    )
  }

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={handleClick}
        style={{
          position: 'relative',
          cursor: canJump ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          transition: 'all 0.3s ease',
          opacity: isAvailable ? 1 : 0.6,
        }}
      >
        {renderIcon()}
        {!isAvailable && url && (
          <span
            style={{
              position: 'absolute',
              right: -4,
              top: -4,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.65)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #fff',
            }}
          >
            <LockOutlined style={{ fontSize: 10 }} />
          </span>
        )}
      </div>
    </div>
  )
}

export default IconNavWidget
