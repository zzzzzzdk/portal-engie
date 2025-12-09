import React from 'react';
import { useStore } from '@/store/useStore';
import { Button, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

interface GroupAdapterProps {
  groupId: string;
}

const GroupAdapter: React.FC<GroupAdapterProps> = ({ groupId }) => {
  const { groups, removeGroup, isEditMode } = useStore();
  const group = groups.find((g) => g.id === groupId);

  if (!group) {
    return null;
  }

  const handleDelete = () => {
    removeGroup(groupId);
  };

  // 仅在编辑模式下显示头部
  // 或者：始终显示，但在非编辑模式下隐藏操作按钮？
  // 根据用户需求，这里应该是一个组标题栏。通常标题在预览模式下也显示。
  // 删除操作只在编辑模式下显示。

  return (
    <div className="group-header-wrapper">
      <div className="group-header">
        {isEditMode && (
          <div className="group-actions">
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
  );
};

export default GroupAdapter;
