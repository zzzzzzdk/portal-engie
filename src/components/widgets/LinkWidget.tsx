import React, { useMemo } from 'react'
import { Button, Space, Tooltip, Typography } from 'antd'
import { LinkOutlined, LockOutlined } from '@ant-design/icons'
import IconRenderer from '@/components/IconRenderer'
import { useSystemStore } from '@/store/useSystemStore'
import type { Widget, WidgetConfig } from '@/types'
import { buildDeployedSystemSet, isSystemDeployed } from '@/utils/systemDeployment'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'

interface LinkItem {
  id?: string
  title: string
  url: string
  systemId?: string
  icon?: string
  iconBgColor?: string
  iconColor?: string
  description?: string
  openInNew?: boolean
}

interface LinkWidgetConfig extends WidgetConfig {
  links?: LinkItem[]
  layout?: 'button' | 'list' | 'card'
  buttonShape?: 'circle' | 'default' | 'round'
  buttonSize?: 'small' | 'middle' | 'large'
  showTitle?: boolean
  columns?: number
}

interface LinkWidgetProps {
  config?: LinkWidgetConfig
  widget?: Widget
  isEditMode?: boolean
}

const DEFAULT_LINKS: LinkItem[] = [
  { id: '1', title: '首页', url: '/', icon: 'HomeOutlined', iconBgColor: '#1890ff' },
  { id: '2', title: '应用中心', url: '/apps', icon: 'AppstoreOutlined', iconBgColor: '#52c41a' },
  { id: '3', title: '文档', url: '/docs', icon: 'FileOutlined', iconBgColor: '#faad14' },
  { id: '4', title: '设置', url: '/settings', icon: 'SettingOutlined', iconBgColor: '#722ed1' },
]

const lockBadgeStyle: React.CSSProperties = {
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
  fontSize: 10,
}

const LinkWidget: React.FC<LinkWidgetProps> = ({ config, widget, isEditMode }) => {
  const sysConfig = useSystemStore(state => state.sysConfig)
  const deployedSystemSet = useMemo(() => buildDeployedSystemSet(sysConfig), [sysConfig])
  const emitWidgetEvent = useWidgetEventEmitter(widget)

  const linkConfig = config as LinkWidgetConfig
  const links = (linkConfig?.links || DEFAULT_LINKS).map(link => {
    if (link.iconBgColor) {
      return link
    }
    return { ...link, iconBgColor: link.iconColor, iconColor: undefined }
  })
  const layout = linkConfig?.layout || 'button'
  const buttonShape = linkConfig?.buttonShape || 'circle'
  const buttonSize = linkConfig?.buttonSize || 'large'
  const showTitle = linkConfig?.showTitle ?? true
  const columns = linkConfig?.columns || 4

  const getIcon = (iconName?: string, size = 16, color?: string): React.ReactNode => {
    if (!iconName) {
      return <LinkOutlined />
    }
    return <IconRenderer value={iconName} size={size} color={color} fallbackText={iconName} />
  }

  const isLinkAvailable = (link: LinkItem) => isSystemDeployed(deployedSystemSet, link.systemId)

  const handleLinkClick = (link: LinkItem, index: number) => {
    emitWidgetEvent('link.click', { item: link, url: link.url, index }, 'click')

    if (isEditMode || !link.url || !isLinkAvailable(link)) {
      return
    }

    if (link.openInNew) {
      window.open(link.url, '_blank')
      return
    }

    window.location.href = link.url
  }

  const renderLockBadge = (visible: boolean) => {
    if (!visible) {
      return null
    }

    return (
      <span style={lockBadgeStyle}>
        <LockOutlined />
      </span>
    )
  }

  if (layout === 'button') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Space wrap size="middle">
          {links.map((link, index) => {
            const isAvailable = isLinkAvailable(link)
            const canJump = Boolean(link.url) && !isEditMode && isAvailable
            const isIconOnly = !showTitle || buttonShape === 'circle'
            const buttonNode = showTitle && buttonShape !== 'circle' ? (
              <Button
                type="primary"
                shape={buttonShape}
                size={buttonSize}
                disabled={!isAvailable}
                icon={getIcon(link.icon, 14, link.iconColor || '#fff')}
                style={
                  link.iconBgColor
                    ? {
                        backgroundColor: link.iconBgColor,
                        borderColor: link.iconBgColor,
                        cursor: canJump ? 'pointer' : 'default',
                        opacity: isAvailable ? 1 : 0.55,
                      }
                    : {
                        cursor: canJump ? 'pointer' : 'default',
                        opacity: isAvailable ? 1 : 0.55,
                      }
                }
                onClick={() => handleLinkClick(link, index)}
              >
                {link.title}
              </Button>
            ) : (
              <Button
                type="primary"
                shape="circle"
                size={buttonSize}
                disabled={!isAvailable}
                icon={getIcon(link.icon, 16, link.iconColor || '#fff')}
                style={
                  link.iconBgColor
                    ? {
                        backgroundColor: link.iconBgColor,
                        borderColor: link.iconBgColor,
                        cursor: canJump ? 'pointer' : 'default',
                        opacity: isAvailable ? 1 : 0.55,
                      }
                    : {
                        cursor: canJump ? 'pointer' : 'default',
                        opacity: isAvailable ? 1 : 0.55,
                      }
                }
                onClick={() => handleLinkClick(link, index)}
              />
            )

            return (
              <Tooltip title={link.description || link.title} key={link.id || index}>
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  {buttonNode}
                  {renderLockBadge(isIconOnly && !isAvailable && Boolean(link.url))}
                </span>
              </Tooltip>
            )
          })}
        </Space>
      </div>
    )
  }

  if (layout === 'list') {
    return (
      <div style={{ height: '100%', overflow: 'auto', padding: 8 }}>
        {links.map((link, index) => {
          const isAvailable = isLinkAvailable(link)
          const canJump = Boolean(link.url) && !isEditMode && isAvailable
          const textColor = isAvailable ? undefined : '#bfbfbf'
          const descriptionColor = isAvailable ? undefined : '#d9d9d9'

          return (
            <div
              key={link.id || index}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 12,
                cursor: canJump ? 'pointer' : 'default',
                borderRadius: 8,
                transition: 'background-color 0.2s, opacity 0.2s',
                opacity: isAvailable ? 1 : 0.75,
              }}
              className="link-list-item"
              onClick={() => handleLinkClick(link, index)}
              onMouseEnter={event => {
                if (canJump) {
                  event.currentTarget.style.backgroundColor = '#f5f5f5'
                }
              }}
              onMouseLeave={event => {
                event.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: link.iconBgColor || '#1890ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: link.iconColor || '#fff',
                  fontSize: 18,
                  marginRight: 12,
                  flexShrink: 0,
                }}
              >
                {getIcon(link.icon, 18, link.iconColor || '#fff')}
                {renderLockBadge(!isAvailable && Boolean(link.url))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong style={{ color: textColor }}>
                  {link.title}
                </Typography.Text>
                {link.description && (
                  <Typography.Text
                    type="secondary"
                    style={{ display: 'block', fontSize: 12, color: descriptionColor }}
                  >
                    {link.description}
                  </Typography.Text>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: 12,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
      }}
    >
      {links.map((link, index) => {
        const isAvailable = isLinkAvailable(link)
        const canJump = Boolean(link.url) && !isEditMode && isAvailable

        return (
          <div
            key={link.id || index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 8px',
              cursor: canJump ? 'pointer' : 'default',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
              transition: 'all 0.2s',
              opacity: isAvailable ? 1 : 0.75,
            }}
            onClick={() => handleLinkClick(link, index)}
            onMouseEnter={event => {
              if (canJump) {
                event.currentTarget.style.backgroundColor = '#f5f5f5'
                event.currentTarget.style.borderColor = link.iconBgColor || '#1890ff'
              }
            }}
            onMouseLeave={event => {
              event.currentTarget.style.backgroundColor = 'transparent'
              event.currentTarget.style.borderColor = '#f0f0f0'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: link.iconBgColor || '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: link.iconColor || '#fff',
                fontSize: 24,
                marginBottom: 8,
              }}
            >
              {getIcon(link.icon, 24, link.iconColor || '#fff')}
              {renderLockBadge(!isAvailable && Boolean(link.url))}
            </div>
            <Typography.Text
              strong
              ellipsis={{ tooltip: link.title }}
              style={{ textAlign: 'center', color: isAvailable ? undefined : '#bfbfbf' }}
            >
              {link.title}
            </Typography.Text>
            {link.description && (
              <Typography.Text
                type="secondary"
                ellipsis={{ tooltip: link.description }}
                style={{ fontSize: 12, textAlign: 'center', color: isAvailable ? undefined : '#d9d9d9' }}
              >
                {link.description}
              </Typography.Text>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default LinkWidget
