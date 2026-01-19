/**
 * PreviewGroupAdapter - 预览模式下的分组适配层
 *
 * 与 GroupAdapter 类似，但从 PreviewDataContext 读取数据且不显示编辑操作
 */

import React, { useMemo } from 'react';
import { usePreviewGroup } from './PreviewDataContext';

interface PreviewGroupAdapterProps {
  groupId: string;
}

const PreviewGroupAdapter: React.FC<PreviewGroupAdapterProps> = ({ groupId }) => {
  const group = usePreviewGroup(groupId);

  // 计算容器样式（背景和边框）
  const containerStyle = useMemo(() => {
    const config = group?.config || {};
    const style: React.CSSProperties = {};

    // 背景设置
    if (config.backgroundType === 'color' && config.backgroundColor) {
      style.backgroundColor = config.backgroundColor;
    } else if (config.backgroundType === 'image' && config.backgroundImage) {
      style.backgroundImage = `url(${config.backgroundImage})`;
      style.backgroundSize = config.backgroundSize || 'cover';
      style.backgroundRepeat = config.backgroundRepeat || 'no-repeat';
      style.backgroundPosition = config.backgroundPosition || 'center';
    } else if (config.backgroundType === 'gradient' && config.backgroundGradient) {
      style.background = config.backgroundGradient;
    }

    // 边框设置 - 默认显示实线边框
    const borderStyle = config.borderStyle ?? 'solid';
    if (borderStyle !== 'none') {
      style.borderStyle = borderStyle;
      style.borderWidth = config.borderWidth ?? 2;
      style.borderColor = config.borderColor || 'var(--ant-color-border)';
    } else {
      style.border = 'none';
    }

    // 圆角 - 默认 8px
    style.borderRadius = config.borderRadius ?? 8;

    // 内边距
    if (config.padding !== undefined) {
      style.padding = config.padding;
    }

    return style;
  }, [group?.config]);

  // 标题样式
  const titleStyle = useMemo(() => {
    const config = group?.config || {};
    const style: React.CSSProperties = {};

    if (config.titleColor) {
      style.color = config.titleColor;
    }
    if (config.titleFontSize) {
      style.fontSize = config.titleFontSize;
    }
    if (config.titleFontWeight) {
      style.fontWeight = config.titleFontWeight;
    }

    return style;
  }, [group?.config]);

  if (!group) {
    return null;
  }

  const config = group.config || {};
  const showTitle = config.showTitle !== false;

  // 预览模式下不显示任何操作按钮，只显示分组的标题区域
  // 将背景层和头部层分开，使它们可以有独立的 z-index
  return (
    <>
      {/* 背景层 - 只负责背景和边框样式 */}
      <div className="group-background" style={containerStyle} />

      {/* 头部层 - 独立的层，只显示标题 */}
      <div className="group-header-wrapper">
        <div className="group-header">
          {showTitle && (
            <span className="group-title" style={titleStyle}>
              {group.title}
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default PreviewGroupAdapter;
