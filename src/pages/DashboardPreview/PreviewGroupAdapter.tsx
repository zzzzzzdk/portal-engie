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
    if (!group?.config) return {};

    const config = group.config;
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

    // 边框设置
    if (config.borderStyle && config.borderStyle !== 'none') {
      style.borderStyle = config.borderStyle;
      style.borderWidth = config.borderWidth ?? 2;
      style.borderColor = config.borderColor || 'var(--ant-color-border)';
    } else if (config.borderStyle === 'none') {
      style.border = 'none';
    }

    // 圆角
    if (config.borderRadius !== undefined) {
      style.borderRadius = config.borderRadius;
    }

    // 内边距
    if (config.padding !== undefined) {
      style.padding = config.padding;
    }

    return style;
  }, [group?.config]);

  // 标题样式
  const titleStyle = useMemo(() => {
    if (!group?.config?.titleColor) return {};
    return { color: group.config.titleColor };
  }, [group?.config?.titleColor]);

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
