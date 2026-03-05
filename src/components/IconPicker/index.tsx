/**
 * IconPicker 组件
 * 统一的图标选择器，支持图标列表选择、URL输入、图片上传、SVG代码输入
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Popover, Button, Input, Upload, Tabs, message, Space } from 'antd';
import {
  AppstoreOutlined,
  LinkOutlined,
  UploadOutlined,
  CodeOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import Icon from '@/components/Icon';
import { uploadImage } from '@/services';
import { sanitizeSvg } from '@/utils/sanitizeSvg';
import IconGrid from './IconGrid';
import { findIconByName, ICONFONT_ICONS } from './iconData';
import { getIconValueType } from './types';
import type { IconPickerProps } from './types';
import './index.scss';

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
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [svgInput, setSvgInput] = useState('');

  // Popover 打开时回填已有值
  const handleOpenChange = useCallback((visible: boolean) => {
    setOpen(visible);
    if (visible && value) {
      const type = getIconValueType(value);
      if (type === 'svg') {
        setSvgInput(value);
      } else if (type === 'url') {
        setUrlInput(value);
      }
    }
  }, [value]);

  // 判断当前值的类型
  const valueType = useMemo(() => getIconValueType(value), [value]);

  // 触发值变化
  const handleChange = useCallback(
    (newValue: string) => {
      onChange?.(newValue);
      setOpen(false);
    },
    [onChange]
  );

  // 清除值
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.('');
    },
    [onChange]
  );

  // 渲染图标预览
  const renderPreview = useCallback(() => {
    if (!value || valueType === 'empty') {
      return <AppstoreOutlined className="icon-picker-placeholder-icon" />;
    }

    if (valueType === 'svg') {
      return (
        <div
          className="icon-picker-svg-preview"
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(value) }}
        />
      );
    }

    if (valueType === 'url') {
      return <img src={value} alt="icon" className="icon-picker-img-preview" />;
    }

    // 图标名称 - 尝试 Ant Design 图标
    const iconItem = findIconByName(value);
    if (iconItem?.component) {
      const IconComponent = iconItem.component;
      return <IconComponent style={{ fontSize: 18 }} />;
    }

    // 尝试直接从 @ant-design/icons 获取
    const AntdIcon = (Icons as any)[value];
    if (AntdIcon) {
      return <AntdIcon style={{ fontSize: 18 }} />;
    }

    // 尝试 Iconfont 图标
    const isIconfont = ICONFONT_ICONS.some((icon) => icon.name === value);
    if (isIconfont) {
      return <Icon type={value} style={{ fontSize: 18 }} />;
    }

    // 默认显示首字母
    return <span className="icon-picker-letter">{value.charAt(0).toUpperCase()}</span>;
  }, [value, valueType]);

  // 获取显示文本
  const getDisplayText = useCallback(() => {
    if (!value || valueType === 'empty') {
      return placeholder;
    }

    if (valueType === 'svg') {
      return 'SVG 图标';
    }

    if (valueType === 'url') {
      // 截取 URL 的文件名部分
      try {
        const url = new URL(value);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop() || 'image';
        return filename.length > 20 ? filename.substring(0, 17) + '...' : filename;
      } catch {
        return value.length > 20 ? value.substring(0, 17) + '...' : value;
      }
    }

    return value;
  }, [value, valueType, placeholder]);

  // 处理图标选择
  const handleIconSelect = useCallback(
    (iconName: string) => {
      handleChange(iconName);
    },
    [handleChange]
  );

  // 处理 URL 确认
  const handleUrlConfirm = useCallback(() => {
    if (!urlInput.trim()) {
      message.warning('请输入图标URL');
      return;
    }
    handleChange(urlInput.trim());
    setUrlInput('');
  }, [urlInput, handleChange]);

  // 处理图片上传
  const handleUpload = useCallback(
    async (file: File) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('图片大小不能超过 10MB');
        return false;
      }

      setUploading(true);
      try {
        const res = await uploadImage(file);
        if (res.data?.url) {
          handleChange(res.data.url);
          message.success('图标上传成功');
        } else {
          message.error(res.message || '上传失败');
        }
      } catch {
        message.error('上传失败，请稍后重试');
      } finally {
        setUploading(false);
      }
      return false;
    },
    [handleChange]
  );

  // 处理 SVG 确认
  const handleSvgConfirm = useCallback(() => {
    if (!svgInput.trim()) {
      message.warning('请输入SVG代码');
      return;
    }

    const trimmed = svgInput.trim();
    if (!trimmed.startsWith('<svg') && !trimmed.startsWith('<?xml')) {
      message.error('请输入有效的SVG代码');
      return;
    }

    // 净化 SVG，移除潜在的 XSS 攻击向量
    const sanitized = sanitizeSvg(trimmed);
    if (!sanitized) {
      message.error('SVG 代码解析失败，请检查格式');
      return;
    }

    handleChange(sanitized);
    setSvgInput('');
  }, [svgInput, handleChange]);

  // 构建 Tabs 项
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
    ];

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
                placeholder="输入图标URL地址"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onPressEnter={handleUrlConfirm}
              />
              <Button type="primary" size="small" onClick={handleUrlConfirm}>
                确认
              </Button>
            </div>
          ),
        });
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
        });
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
        });
      }
    }

    return items;
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
  ]);

  // Popover 内容
  const popoverContent = (
    <div className="icon-picker-popover">
      <Tabs items={tabItems} size="small" />
    </div>
  );

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
  );
};

export default IconPicker;
