import React, { useState, useCallback, useMemo } from 'react';
import { Typography } from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import type { AssistantSystem, AssistantEntry } from '@/types/assistantHub';

const { Text } = Typography;

interface SystemListProps {
  systems: AssistantSystem[];
  selectedEntryId?: string;
  onEntrySelect: (entry: AssistantEntry) => void;
}

/** 根据字符串生成 HSL 颜色 */
const getColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 55%)`;
};

/** 渲染图标 */
const renderIcon = (iconName?: string, fallbackText?: string) => {
  if (iconName && (Icons as any)[iconName]) {
    const IconComponent = (Icons as any)[iconName];
    return <IconComponent style={{ fontSize: 16 }} />;
  }
  // 降级到首字母
  return (
    <span className="icon-fallback">
      {fallbackText?.charAt(0).toUpperCase() || '?'}
    </span>
  );
};

const SystemList: React.FC<SystemListProps> = ({
  systems,
  selectedEntryId,
  onEntrySelect,
}) => {
  // 管理每个系统的展开状态
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    systems.forEach(sys => {
      if (sys.expanded !== false) {
        initial.add(sys.id);
      }
    });
    return initial;
  });

  const toggleSystem = useCallback((systemId: string) => {
    setExpandedSystems(prev => {
      const next = new Set(prev);
      if (next.has(systemId)) {
        next.delete(systemId);
      } else {
        next.add(systemId);
      }
      return next;
    });
  }, []);

  const handleEntryClick = useCallback((entry: AssistantEntry) => {
    onEntrySelect(entry);
  }, [onEntrySelect]);

  // 计算入口颜色映射
  const entryColors = useMemo(() => {
    const colors: Record<string, string> = {};
    systems.forEach(sys => {
      sys.entries.forEach(entry => {
        colors[entry.id] = getColorFromString(entry.id);
      });
    });
    return colors;
  }, [systems]);

  return (
    <div className="system-list">
      {systems.map(system => {
        const isExpanded = expandedSystems.has(system.id);

        return (
          <div key={system.id} className="system-group">
            {/* 系统标题 */}
            <div
              className="system-header"
              onClick={() => toggleSystem(system.id)}
            >
              <span className="system-expand-icon">
                {isExpanded ? <DownOutlined /> : <RightOutlined />}
              </span>
              <Text strong className="system-name">{system.name}</Text>
            </div>

            {/* 入口列表 */}
            {isExpanded && (
              <div className="entry-list">
                {system.entries.map(entry => {
                  const isSelected = selectedEntryId === entry.id;
                  const bgColor = entryColors[entry.id];

                  return (
                    <div
                      key={entry.id}
                      className={`entry-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleEntryClick(entry)}
                    >
                      <div
                        className="entry-icon"
                        style={{ backgroundColor: bgColor }}
                      >
                        {renderIcon(entry.icon, entry.name)}
                      </div>
                      <Text className="entry-name">{entry.name}</Text>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SystemList;
