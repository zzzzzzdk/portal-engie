/**
 * IconPicker 组件
 * 统一的图标选择器，支持图标列表选择、URL 输入、图片上传、SVG 代码输入
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Popover, Button, Input, Upload, Tabs, message, Space } from 'antd'
import {
  AppstoreOutlined,
  LinkOutlined,
  UploadOutlined,
  CodeOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import * as Icons from '@ant-design/icons'
import Icon from '@/components/Icon'
import { uploadImage } from '@/services'
import { sanitizeSvg } from '@/utils/sanitizeSvg'
import IconGrid from './IconGrid'
import { findIconByName } from './iconData'
import { getIconValueType } from './types'
import type { IconPickerProps } from './types'
import './index.scss'

const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  mode = 'full',
  allowUpload = true,
  allowSvg = true,
  allowUrl = true,
  placeholder = '选择图标',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [svgInput, setSvgInput] = useState('')

  const handleOpenChange = useCallback((visible: boolean) => {
    setOpen(visible)
    if (visible && value) {
      const type = getIconValueType(value)
      if (type === 'svg') {
        setSvgInput(value)
      } else if (type === 'url') {
        setUrlInput(value)
      }
    }
  }, [value])

  const valueType = useMemo(() => getIconValueType(value), [value])

  const handleChange = useCallback((newValue: string) => {
    onChange?.(newValue)
    setOpen(false)
  }, [onChange])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
  }, [onChange])

  const renderPreview = useCallback(() => {
    if (!value || valueType === 'empty') {
      return <AppstoreOutlined className="icon-picker-placeholder-icon" />
    }

    if (valueType === 'svg') {
      return (
        <div
          className="icon-picker-svg-preview"
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(value) }}
        />
      )
    }

    if (valueType === 'url') {
      return <img src={value} alt="icon" className="icon-picker-img-preview" />
    }

    const iconItem = findIconByName(value)
    if (iconItem?.component) {
      const IconComponent = iconItem.component
      return <IconComponent style={{ fontSize: 18 }} />
    }

    const AntdIcon = (Icons as Record<string, unknown>)[value] as React.ComponentType<{
      style?: React.CSSProperties
    }> | undefined
    if (AntdIcon) {
      return <AntdIcon style={{ fontSize: 18 }} />
    }

    if (iconItem) {
      return <Icon type={value} style={{ fontSize: 18 }} />
    }

    return <span className="icon-picker-letter">{value.charAt(0).toUpperCase()}</span>
  }, [value, valueType])

  const getDisplayText = useCallback(() => {
    if (!value || valueType === 'empty') {
      return placeholder
    }

    if (valueType === 'svg') {
      return 'SVG 图标'
    }

    if (valueType === 'url') {
      try {
        const url = new URL(value)
        const pathname = url.pathname
        const filename = pathname.split('/').pop() || 'image'
        return filename.length > 20 ? `${filename.substring(0, 17)}...` : filename
      } catch {
        return value.length > 20 ? `${value.substring(0, 17)}...` : value
      }
    }

    return value
  }, [value, valueType, placeholder])

  const handleIconSelect = useCallback((iconName: string) => {
    handleChange(iconName)
  }, [handleChange])

  const handleUrlConfirm = useCallback(() => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      message.warning('请输入图标 URL')
      return
    }

    if (!/^(https?:\/\/|data:image\/)/.test(trimmed)) {
      message.warning('请输入有效的图标 URL，需以 http://、https:// 或 data:image/ 开头')
      return
    }

    handleChange(trimmed)
    setUrlInput('')
  }, [urlInput, handleChange])

  const handleUpload = useCallback(async (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片文件')
      return false
    }

    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error('图片大小不能超过 10MB')
      return false
    }

    setUploading(true)
    try {
      const res = await uploadImage(file)
      if (res.data?.url) {
        handleChange(res.data.url)
        message.success('图标上传成功')
      } else {
        message.error(res.message || '上传失败')
      }
    } catch {
      message.error('上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }

    return false
  }, [handleChange])

  const handleSvgConfirm = useCallback(() => {
    if (!svgInput.trim()) {
      message.warning('请输入 SVG 代码')
      return
    }

    const trimmed = svgInput.trim()
    if (!trimmed.startsWith('<svg') && !trimmed.startsWith('<?xml')) {
      message.error('请输入有效的 SVG 代码')
      return
    }

    const sanitized = sanitizeSvg(trimmed)
    if (!sanitized) {
      message.error('SVG 代码解析失败，请检查格式')
      return
    }

    handleChange(sanitized)
    setSvgInput('')
  }, [svgInput, handleChange])

  const tabItems = useMemo(() => {
    const items = [
      {
        key: 'icons',
        label: (
          <span>
            <AppstoreOutlined /> 图标
          </span>
        ),
        children: <IconGrid value={value} onSelect={handleIconSelect} />,
      },
    ]

    if (mode === 'full') {
      if (allowUrl) {
        items.push({
          key: 'url',
          label: (
            <span>
              <LinkOutlined /> URL
            </span>
          ),
          children: (
            <div className="icon-picker-url-panel">
              <Input
                placeholder="输入图标 URL 地址"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onPressEnter={handleUrlConfirm}
              />
              <Button type="primary" size="small" onClick={handleUrlConfirm}>
                确认
              </Button>
            </div>
          ),
        })
      }

      if (allowUpload) {
        items.push({
          key: 'upload',
          label: (
            <span>
              <UploadOutlined /> 上传
            </span>
          ),
          children: (
            <div className="icon-picker-upload-panel">
              <Upload
                accept=".jpg,.jpeg,.png,.gif"
                showUploadList={false}
                beforeUpload={handleUpload}
              >
                <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}>
                  {uploading ? '上传中...' : '点击上传图片'}
                </Button>
              </Upload>
              <p className="upload-hint">支持 jpg、png、gif 格式，大小不超过 10MB</p>
            </div>
          ),
        })
      }

      if (allowSvg) {
        items.push({
          key: 'svg',
          label: (
            <span>
              <CodeOutlined /> SVG
            </span>
          ),
          children: (
            <div className="icon-picker-svg-panel">
              <Input.TextArea
                placeholder="粘贴 SVG 代码，如: <svg viewBox='0 0 24 24'>...</svg>"
                value={svgInput}
                onChange={(e) => setSvgInput(e.target.value)}
                rows={4}
              />
              <Button type="primary" size="small" onClick={handleSvgConfirm}>
                确认
              </Button>
            </div>
          ),
        })
      }
    }

    return items
  }, [
    mode,
    allowUrl,
    allowUpload,
    allowSvg,
    value,
    urlInput,
    svgInput,
    uploading,
    handleIconSelect,
    handleUrlConfirm,
    handleUpload,
    handleSvgConfirm,
  ])

  const popoverContent = (
    <div className="icon-picker-popover">
      <Tabs items={tabItems} size="small" />
    </div>
  )

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={open && !disabled}
      onOpenChange={handleOpenChange}
      placement="bottomLeft"
      overlayClassName="icon-picker-popover-overlay"
    >
      <div className={`icon-picker-trigger ${disabled ? 'disabled' : ''}`}>
        <Space>
          <div className="icon-picker-preview">{renderPreview()}</div>
          <span className="icon-picker-text">{getDisplayText()}</span>
        </Space>
        {value && !disabled && (
          <CloseCircleOutlined className="icon-picker-clear" onClick={handleClear} />
        )}
      </div>
    </Popover>
  )
}

export default IconPicker
