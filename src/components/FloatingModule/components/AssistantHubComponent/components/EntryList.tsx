import React, { useCallback, useMemo } from 'react';
import { Typography } from 'antd';
import IconRenderer from '@/components/IconRenderer';
import type { AssistantEntry } from '@/types/assistantHub';

const { Text } = Typography;

interface EntryListProps {
  entries: AssistantEntry[];
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

const EntryList: React.FC<EntryListProps> = ({
  entries,
  selectedEntryId,
  onEntrySelect,
}) => {
  const handleEntryClick = useCallback((entry: AssistantEntry) => {
    onEntrySelect(entry);
  }, [onEntrySelect]);

  // 计算入口颜色映射
  const entryColors = useMemo(() => {
    const colors: Record<string, string> = {};
    entries.forEach(entry => {
      colors[entry.id] = getColorFromString(entry.id);
    });
    return colors;
  }, [entries]);

  return (
    <div className="entry-list">
      {entries.map(entry => {
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
              <IconRenderer
                value={entry.icon}
                size={16}
                fallbackText={entry.name}
                fallbackColor="transparent"
              />
            </div>
            <div className="entry-info">
              <Text className="entry-name">{entry.name}</Text>
              {entry.description && (
                <Text type="secondary" className="entry-desc">{entry.description}</Text>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EntryList;
