import React from 'react';
import { Typography, Spin } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import MicroAppWidget from '@/components/widgets/MicroAppWidget';
import type { AssistantEntry } from '@/types/assistantHub';

const { Text } = Typography;

interface MicroAppPanelProps {
  entry: AssistantEntry;
  onClose: () => void;
}

const MicroAppPanel: React.FC<MicroAppPanelProps> = ({ entry, onClose }) => {
  const { microApp } = entry;

  return (
    <div className="micro-app-panel">
      {/* 面板头部 */}
      <div className="panel-header">
        <Text strong className="panel-title">{entry.name}</Text>
        <button className="panel-close-btn" onClick={onClose}>
          <CloseOutlined />
        </button>
      </div>

      {/* 微应用内容区 */}
      <div className="panel-content">
        {microApp?.url && microApp?.entry ? (
          <MicroAppWidget
            config={{
              systemId: microApp.systemId,
              moduleId: microApp.moduleId,
              microAppUrl: microApp.url,
              microAppEntry: microApp.entry,
              props: microApp.props,
              showTitle: false,
              alive: true,
              sync: false,
            }}
          />
        ) : (
          <div className="panel-loading">
            <Spin tip="加载中..." />
          </div>
        )}
      </div>
    </div>
  );
};

export default MicroAppPanel;
