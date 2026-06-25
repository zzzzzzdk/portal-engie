import React, { useCallback, useState } from 'react'
import { SaveOutlined } from '@ant-design/icons'
import { Button, Dropdown, Modal } from 'antd'
import type { MenuProps } from 'antd'
import clsx from 'clsx'
import { Copy, RefreshCw, Settings, Trash2 } from 'lucide-react'
import { Widget } from '@/types'
import { isValidCssGradient } from '@/components/BackgroundSettings'
import { REFRESHABLE_WIDGET_TYPES } from '@/constants/dashboard'
import { useNativeFormDesignerStore } from '@/native-form/designer/store/use-native-form-designer-store'
import { useStore } from '@/store/useStore'
import { requestLocalTemplateSave } from '@/utils/local-component-library-events'
import './index.scss'

const { confirm } = Modal

interface WidgetWrapperProps {
  widget: Widget
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onMouseDown?: React.MouseEventHandler
  onMouseUp?: React.MouseEventHandler
  onTouchEnd?: React.TouchEventHandler
  isPreviewMode?: boolean
}

const WidgetWrapper = React.forwardRef<HTMLDivElement, WidgetWrapperProps>(
  ({ widget, children, style, className, onMouseDown, onMouseUp, onTouchEnd, isPreviewMode = false, ...props }, ref) => {
    const {
      removeWidget,
      refreshWidget,
      duplicateWidget,
      isEditMode: storeEditMode,
      openConfigPanel,
    } = useStore()
    const setSelectedNativeFormNodeId = useNativeFormDesignerStore(state => state.setSelectedNodeId)
    const isEditMode = isPreviewMode ? false : storeEditMode
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleDelete = () => {
      confirm({
        title: '删除组件',
        content: '确定要删除这个组件吗？',
        okText: '删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => removeWidget(widget.id),
      })
    }

    const handleConfig = () => {
      if (widget.type === 'nativeForm') {
        setSelectedNativeFormNodeId(null)
      }
      openConfigPanel({ type: 'widget', id: widget.id })
    }

    const handleRefresh = () => {
      setIsRefreshing(true)
      refreshWidget(widget.id)
      window.setTimeout(() => {
        setIsRefreshing(false)
      }, 600)
    }

    const handleDuplicate = () => {
      duplicateWidget(widget.id)
    }

    const handleSaveAsLocalTemplate = () => {
      requestLocalTemplateSave({
        targetType: 'widget',
        targetId: widget.id,
      })
    }

    const isRefreshable = REFRESHABLE_WIDGET_TYPES.has(widget.type)

    const contextMenuItems: MenuProps['items'] = [
      ...(isRefreshable
        ? [{
            key: 'refresh' as const,
            label: '刷新',
            icon: <RefreshCw size={14} className={isRefreshing ? 'rotating' : ''} />,
            onClick: handleRefresh,
            disabled: isRefreshing,
          }]
        : []),
      {
        key: 'duplicate',
        label: '复制',
        icon: <Copy size={14} />,
        onClick: handleDuplicate,
      },
      {
        key: 'config',
        label: '设置',
        icon: <Settings size={14} />,
        onClick: handleConfig,
      },
      {
        key: 'save-local-template',
        label: '保存为组件模板',
        icon: <SaveOutlined />,
        onClick: handleSaveAsLocalTemplate,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        label: '删除',
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: handleDelete,
      },
    ]

    const handleContextMenu = (event: React.MouseEvent) => {
      event.preventDefault()
    }

    const showTitle = widget.config.showTitle !== false
    const { w, h } = widget.layout || { w: 2, h: 2 }
    const isSmallSize = w < 2 || h < 2
    const shouldShowHeader = !isSmallSize && (showTitle || isEditMode)

    const titleStyle: React.CSSProperties = {}
    if (widget.config.titleColor) {
      titleStyle.color = widget.config.titleColor
    }
    if (widget.config.titleFontSize !== undefined && widget.config.titleFontSize !== null) {
      titleStyle.fontSize = Number(widget.config.titleFontSize)
    }
    if (widget.config.titleFontWeight !== undefined && widget.config.titleFontWeight !== null) {
      titleStyle.fontWeight = widget.config.titleFontWeight
    }

    const backgroundStyle = useCallback(() => {
      const nextBackgroundStyle: React.CSSProperties = {}
      const {
        backgroundType,
        backgroundColor,
        backgroundImage,
        backgroundGradient,
        backgroundSize,
        backgroundRepeat,
        backgroundPosition,
        backdropBlur,
        boxShadow,
        borderRadius,
      } = widget.config

      if (backgroundType === 'image' && backgroundImage) {
        nextBackgroundStyle.backgroundImage = `url(${backgroundImage})`
        nextBackgroundStyle.backgroundSize = backgroundSize || 'auto'
        nextBackgroundStyle.backgroundPosition = backgroundPosition || 'center'
        nextBackgroundStyle.backgroundRepeat = backgroundRepeat || 'no-repeat'
      } else if (
        backgroundType === 'gradient'
        && backgroundGradient
        && isValidCssGradient(backgroundGradient)
      ) {
        nextBackgroundStyle.background = backgroundGradient
      } else if (backgroundType === 'color' && backgroundColor) {
        nextBackgroundStyle.backgroundColor = backgroundColor
      }

      if (backdropBlur !== undefined && backdropBlur !== null) {
        if (backdropBlur > 0) {
          nextBackgroundStyle.backdropFilter = `blur(${backdropBlur}px)`
          nextBackgroundStyle.WebkitBackdropFilter = `blur(${backdropBlur}px)`
        } else {
          nextBackgroundStyle.backdropFilter = 'none'
          nextBackgroundStyle.WebkitBackdropFilter = 'none'
        }
      }

      if (boxShadow) {
        nextBackgroundStyle.boxShadow = boxShadow
      }

      if (borderRadius !== undefined && borderRadius !== null) {
        nextBackgroundStyle.borderRadius = borderRadius
      }

      return nextBackgroundStyle
    }, [widget.config])

    const hasCustomBackground = widget.config.backgroundType && (
      (widget.config.backgroundType === 'color' && widget.config.backgroundColor)
      || (widget.config.backgroundType === 'image' && widget.config.backgroundImage)
      || (widget.config.backgroundType === 'gradient' && widget.config.backgroundGradient)
    )

    const hasBackdropBlur = widget.config.backdropBlur && widget.config.backdropBlur > 0

    const getContentPadding = (): number | undefined => {
      const configPadding = widget.config.contentPadding
      if (configPadding !== undefined && configPadding !== null) {
        return configPadding
      }

      return undefined
    }

    const contentPadding = getContentPadding()
    const contentStyle: React.CSSProperties = contentPadding !== undefined
      ? { padding: contentPadding }
      : {}

    const renderContent = () => (
      <div
        ref={ref}
        style={{ ...style, ...backgroundStyle() }}
        className={clsx('widget-wrapper', className, widget.type, {
          'edit-mode': isEditMode,
          'no-header': !shouldShowHeader,
          'has-custom-bg': hasCustomBackground,
          'has-backdrop-blur': hasBackdropBlur,
        })}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        onContextMenu={isEditMode ? handleContextMenu : undefined}
        {...props}
      >
        {shouldShowHeader && (
          <div className={clsx('widget-header grid-drag-handle', {
            'widget-header--minimal': !showTitle && isEditMode,
          })}
          >
            {showTitle && (
              <h3
                className="widget-title"
                style={Object.keys(titleStyle).length ? titleStyle : undefined}
              >
                {widget.title}
              </h3>
            )}
            {isEditMode && (
              <div
                className="widget-actions"
                style={widget.config.titleColor ? { color: widget.config.titleColor } : undefined}
                onMouseDown={(event) => event.stopPropagation()}
              >
                {isRefreshable && (
                  <Button
                    type="text"
                    size="small"
                    icon={<RefreshCw size={14} className={isRefreshing ? 'rotating' : ''} />}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  />
                )}
                <Button
                  type="text"
                  size="small"
                  icon={<Copy size={14} />}
                  onClick={handleDuplicate}
                  title='复制'
                />
                <Button
                  type="text"
                  size="small"
                  icon={<Settings size={14} />}
                  onClick={handleConfig}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={handleSaveAsLocalTemplate}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 size={14} />}
                  onClick={handleDelete}
                />
              </div>
            )}
          </div>
        )}
        <div className="widget-content" style={contentStyle}>{children}</div>
      </div>
    )

    if (isPreviewMode || !isEditMode) {
      return renderContent()
    }

    return (
      <Dropdown
        menu={{ items: contextMenuItems }}
        trigger={['contextMenu']}
      >
        {renderContent()}
      </Dropdown>
    )
  },
)

export default WidgetWrapper
