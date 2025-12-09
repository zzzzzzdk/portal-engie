/**
 * PreviewGroupAdapter - 预览模式下的分组适配层
 *
 * 与 GroupAdapter 类似，但从 PreviewDataContext 读取数据且不显示编辑操作
 */

import React from 'react';
import { usePreviewGroup } from './PreviewDataContext';

interface PreviewGroupAdapterProps {
  groupId: string;
}

const PreviewGroupAdapter: React.FC<PreviewGroupAdapterProps> = ({ groupId }) => {
  const group = usePreviewGroup(groupId);

  if (!group) {
    return null;
  }

  // 预览模式下不显示任何操作按钮，只显示分组的标题区域（如果需要的话）
  return (
    <div className="group-header-wrapper">
      <div className="group-header">
        {/* 预览模式下可选择性显示分组标题 */}
        {group.title && <span className="group-title">{group.title}</span>}
      </div>
    </div>
  );
};

export default PreviewGroupAdapter;
