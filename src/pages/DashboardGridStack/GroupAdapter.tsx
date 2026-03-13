import React, { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Button, Popconfirm } from 'antd';
import { DeleteOutlined, SettingOutlined } from '@ant-design/icons';

interface GroupAdapterProps {
  groupId: string;
}

const GroupAdapter: React.FC<GroupAdapterProps> = ({ groupId }) => {
  const { groups, removeGroup, isEditMode, openConfigPanel } = useStore();
  const group = groups.find((g) => g.id === groupId);

  // 计算容器样式（背景和边框）
  const containerStyle = useMemo(() => {
    const config = group?.config || {};
    const style: React.CSSProperties = {};

    // 背景设置
    if (config.backgroundType === 'color' && config.backgroundColor) {
      style.backgroundColor = config.backgroundColor;
    } else if (config.backgroundType === 'image' && config.backgroundImage) {
      style.backgroundImage = `url(${config.backgroundImage})`;
      style.backgroundSize = config.backgroundSize || 'auto';
      style.backgroundRepeat = config.backgroundRepeat || 'no-repeat';
      style.backgroundPosition = config.backgroundPosition || 'center';
    } else if (config.backgroundType === 'gradient' && config.backgroundGradient) {
      style.background = config.backgroundGradient;
    }

    // 边框设置 - 默认不显示边框，需要用户手动配置
    const borderStyle = config.borderStyle ?? 'none';
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

    // 背景模糊度
    if (config.backdropBlur !== undefined && config.backdropBlur !== null) {
      if (config.backdropBlur > 0) {
        style.backdropFilter = `blur(${config.backdropBlur}px)`;
        style.WebkitBackdropFilter = `blur(${config.backdropBlur}px)`;
      } else {
        style.backdropFilter = 'none';
        style.WebkitBackdropFilter = 'none';
      }
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
    // 处理字符串和数字类型的 fontSize
    if (config.titleFontSize !== undefined && config.titleFontSize !== null) {
      const fontSize = Number(config.titleFontSize);
      if (!isNaN(fontSize)) {
        style.fontSize = fontSize;
      }
    }
    if (config.titleFontWeight !== undefined && config.titleFontWeight !== null) {
      style.fontWeight = config.titleFontWeight;
    }

    return style;
  }, [group?.config]);

  if (!group) {
    return null;
  }

  const config = group.config || {};
  const showTitle = config.showTitle !== false;

  const handleDelete = () => {
    removeGroup(groupId);
  };


  // 将背景层和头部层分开，使它们可以有独立的 z-index
  // 背景层: z-index: 0 (在 widgets 下面)
  // 嵌套网格: z-index: 1 (widgets 层)
  // 头部层: z-index: 2 (在 widgets 上面，可点击)
  return (
    <>
      {/* 背景层 - 只负责背景和边框样式 */}
      <div className="group-background" style={containerStyle} />

      {/* 头部层 - 独立的层，在 widgets 之上 */}
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
                icon={<SettingOutlined />}
                size="small"
                className="group-config-btn"
                onClick={() => openConfigPanel({ type: 'group', id: group.id })}
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
  );
};

export default GroupAdapter;
