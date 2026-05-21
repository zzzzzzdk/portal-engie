import React, { useEffect, useState } from 'react'
import { Tooltip, Dropdown, Modal, Button } from 'antd'
import type { MenuProps } from 'antd'
import { Settings, Trash2, RefreshCw, Copy } from 'lucide-react'
import clsx from 'clsx'
import type { Widget } from '@/types'
import { getWidgetIcon } from '@/utils/widgetHelpers'
import type { WidgetIconConfig } from '@/types/widget-size'
import { microAppConfigLoader } from '@/utils/microAppConfig'
import { useStore } from '@/store/useStore'
import IconRenderer, { getIconValueType } from '@/components/IconRenderer'
import './index.scss'

const { confirm } = Modal

interface WidgetIconViewProps {
  widget: Widget
  isEditMode: boolean
  onClick?: () => void
}

const WidgetIconView: React.FC<WidgetIconViewProps> = ({ widget, isEditMode, onClick }) => {
  const [iconConfig, setIconConfig] = useState<WidgetIconConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { removeWidget, refreshWidget, duplicateWidget, openConfigPanel } = useStore()
  const { w = 2, h = 2 } = widget.layout || {}
  const isSmallSize = w < 2 || h < 2

  useEffect(() => {
    const loadIcon = async () => {
      setLoading(true)
      const config = await getWidgetIcon(widget)
      setIconConfig(config)
      setLoading(false)
    }

    loadIcon()
  }, [widget.id, widget.type, widget.title, widget.config])

  const handleConfig = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    openConfigPanel({ type: 'widget', id: widget.id })
  }

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    confirm({
      title: '删除小部件',
      content: '确定要删除这个小部件吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => removeWidget(widget.id),
    })
  }

  const handleRefresh = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setIsRefreshing(true)
    refreshWidget(widget.id)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 600)
  }

  const handleDuplicate = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    duplicateWidget(widget.id)
  }

  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'refresh',
      label: '刷新',
      icon: <RefreshCw size={14} className={isRefreshing ? 'rotating' : ''} />,
      onClick: () => handleRefresh(),
      disabled: isRefreshing,
    },
    {
      key: 'duplicate',
      label: '复制',
      icon: <Copy size={14} />,
      onClick: () => handleDuplicate(),
    },
    {
      key: 'config',
      label: '设置',
      icon: <Settings size={14} />,
      onClick: () => handleConfig(),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => handleDelete(),
    },
  ]

  const handleClick = async () => {
    if (isEditMode) {
      return
    }

    if (onClick) {
      onClick()
      return
    }

    if (widget.type === 'microApp' && widget.config.systemId && widget.config.moduleId) {
      try {
        const module = await microAppConfigLoader.getModule(
          widget.config.systemId,
          widget.config.moduleId,
        )

        if (module?.url) {
          window.open(module.url, '_blank')
        } else {
          console.warn('MicroApp URL not found for', widget.config.systemId, widget.config.moduleId)
        }
      } catch (error) {
        console.error('Failed to get micro app module info:', error)
      }
    }
  }

  const renderIcon = () => {
    const configIcon = widget.config.icon
    const svgMarkup = widget.config.iconSvg || iconConfig?.iconSvg

    if (svgMarkup) {
      return (
        <IconRenderer
          value={svgMarkup}
          size={56}
          fallbackText={widget.title}
          className="widget-icon-svg"
        />
      )
    }

    if (configIcon) {
      const iconType = getIconValueType(configIcon)
      if (iconType !== 'empty') {
        return (
          <IconRenderer
            value={configIcon}
            size={56}
            fallbackText={widget.title}
            className="widget-icon-custom"
          />
        )
      }
    }

    if (loading) {
      return <div className="widget-icon-skeleton" />
    }

    if (!iconConfig) {
      return null
    }

    if (typeof iconConfig.icon === 'string' && (iconConfig.icon.startsWith('http') || iconConfig.icon.startsWith('data:'))) {
      return (
        <img
          src={iconConfig.icon}
          alt={widget.title}
          className="widget-icon-image"
        />
      )
    }

    if (React.isValidElement(iconConfig.icon)) {
      return React.cloneElement(iconConfig.icon as React.ReactElement, {
        size: 56,
        strokeWidth: 1.5,
        className: 'widget-icon-component',
      } as any)
    }

    if (typeof iconConfig.icon === 'function' || typeof iconConfig.icon === 'object') {
      const IconComponent = iconConfig.icon as React.ComponentType<any>
      return <IconComponent size={56} strokeWidth={1.5} className="widget-icon-component" />
    }

    if (iconConfig.fallback === 'letter') {
      return (
        <div
          className="widget-icon-letter"
          style={{ backgroundColor: iconConfig.backgroundColor }}
        >
          {iconConfig.icon as React.ReactNode}
        </div>
      )
    }

    if (typeof iconConfig.icon === 'string') {
      return (
        <IconRenderer
          value={iconConfig.icon}
          size={56}
          fallbackText={widget.title}
          className="widget-icon-component"
        />
      )
    }

    return null
  }

  const tooltipTitle = isEditMode
    ? `${widget.title} (右键打开菜单)`
    : widget.title

  const content = (
    <div
      className={clsx('widget-icon-view', {
        'edit-mode': isEditMode,
        clickable: !isEditMode,
      })}
      onClick={handleClick}
    >
      <div className="widget-icon-container">
        {renderIcon()}
      </div>

      <div className="widget-icon-title">
        {widget.title}
      </div>

      {isEditMode && !isSmallSize && (
        <div
          className="widget-icon-actions"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <Button
            type="text"
            size="small"
            icon={<Copy size={14} />}
            onClick={handleDuplicate}
            className="action-btn"
          />
          <Button
            type="text"
            size="small"
            icon={<Settings size={14} />}
            onClick={handleConfig}
            className="action-btn"
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<Trash2 size={14} />}
            onClick={handleDelete}
            className="action-btn"
          />
        </div>
      )}
    </div>
  )

  if (isEditMode) {
    return (
      <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
        {content}
      </Dropdown>
    )
  }

  return (
    <Tooltip title={tooltipTitle} placement="top">
      {content}
    </Tooltip>
  )
}

export default WidgetIconView
