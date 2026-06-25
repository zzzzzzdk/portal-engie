import React, { useMemo } from 'react'
import { CopyOutlined, DeleteOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Popconfirm } from 'antd'
import { useStore } from '@/store/useStore'
import { requestLocalTemplateSave } from '@/utils/local-component-library-events'

interface GroupAdapterProps {
  groupId: string
}

const GroupAdapter: React.FC<GroupAdapterProps> = ({ groupId }) => {
  const { groups, removeGroup, duplicateGroup, isEditMode, openConfigPanel } = useStore()
  const group = groups.find((item) => item.id === groupId)

  const containerStyle = useMemo(() => {
    const config = group?.config || {}
    const style: React.CSSProperties = {}

    if (config.backgroundType === 'color' && config.backgroundColor) {
      style.backgroundColor = config.backgroundColor
    } else if (config.backgroundType === 'image' && config.backgroundImage) {
      style.backgroundImage = `url(${config.backgroundImage})`
      style.backgroundSize = config.backgroundSize || 'auto'
      style.backgroundRepeat = config.backgroundRepeat || 'no-repeat'
      style.backgroundPosition = config.backgroundPosition || 'center'
    } else if (config.backgroundType === 'gradient' && config.backgroundGradient) {
      style.background = config.backgroundGradient
    }

    const borderStyle = config.borderStyle ?? 'none'
    if (borderStyle !== 'none') {
      style.borderStyle = borderStyle
      style.borderWidth = config.borderWidth ?? 2
      style.borderColor = config.borderColor || 'var(--ant-color-border)'
    } else {
      style.border = 'none'
    }

    style.borderRadius = config.borderRadius ?? 8

    if (config.padding !== undefined) {
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
  }, [group?.config])

  const titleStyle = useMemo(() => {
    const config = group?.config || {}
    const style: React.CSSProperties = {}

    if (config.titleColor) {
      style.color = config.titleColor
    }

    if (config.titleFontSize !== undefined && config.titleFontSize !== null) {
      const fontSize = Number(config.titleFontSize)
      if (!Number.isNaN(fontSize)) {
        style.fontSize = fontSize
      }
    }

    if (config.titleFontWeight !== undefined && config.titleFontWeight !== null) {
      style.fontWeight = config.titleFontWeight
    }

    return style
  }, [group?.config])

  if (!group) {
    return null
  }

  const config = group.config || {}
  const showTitle = config.showTitle !== false

  const handleDelete = () => {
    removeGroup(groupId)
  }

  const handleDuplicate = () => {
    duplicateGroup(groupId)
  }

  const handleSaveAsLocalTemplate = () => {
    requestLocalTemplateSave({
      targetType: 'group',
      targetId: group.id,
    })
  }

  return (
    <>
      <div className="group-background" style={containerStyle} />
      <div className="group-header-wrapper">
        <div className="group-header">
          {showTitle && (
            <span className="group-title" style={titleStyle}>
              {group.title}
            </span>
          )}
          {isEditMode && (
            <div className="group-actions">
              <Button
                type="text"
                icon={<CopyOutlined />}
                size="small"
                className="group-config-btn group-copy-btn"
                onClick={handleDuplicate}
              />
              <Button
                type="text"
                icon={<SettingOutlined />}
                size="small"
                className="group-config-btn"
                onClick={() => openConfigPanel({ type: 'group', id: group.id })}
              />
              <Button
                type="text"
                icon={<SaveOutlined />}
                size="small"
                className="group-config-btn"
                onClick={handleSaveAsLocalTemplate}
              />
              <Popconfirm
                title="删除分组"
                description="确定要删除该分组及其包含的所有组件吗？"
                onConfirm={handleDelete}
                okText="删除"
                cancelText="取消"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  className="group-delete-btn"
                />
              </Popconfirm>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default GroupAdapter
