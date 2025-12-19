import React from 'react';
import { Card, Avatar } from 'antd';
import { EditOutlined, EllipsisOutlined, SettingOutlined } from '@ant-design/icons';
import { WidgetConfig } from '@/types';

interface CardGridWidgetProps {
  config?: WidgetConfig;
}

const { Meta } = Card;

// 默认卡片数据
const DEFAULT_CARDS = [
  { id: 1, title: '项目 A', description: '项目 A 的描述信息', avatar: '项' },
  { id: 2, title: '项目 B', description: '项目 B 的描述信息', avatar: '项' },
  { id: 3, title: '项目 C', description: '项目 C 的描述信息', avatar: '项' },
  { id: 4, title: '项目 D', description: '项目 D 的描述信息', avatar: '项' },
];

const CardGridWidget: React.FC<CardGridWidgetProps> = ({ config: _config }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%', overflow: 'auto', padding: '8px' }}>
      {DEFAULT_CARDS.map((item) => (
        <Card
          key={item.id}
          style={{ width: '100%' }}
          actions={[
            <SettingOutlined key="setting" title="设置" />,
            <EditOutlined key="edit" title="编辑" />,
            <EllipsisOutlined key="ellipsis" title="更多" />,
          ]}
        >
          <Meta
            avatar={<Avatar style={{ backgroundColor: `hsl(${item.id * 90}, 70%, 60%)` }}>{item.avatar}</Avatar>}
            title={item.title}
            description={item.description}
          />
        </Card>
      ))}
    </div>
  );
};

export default CardGridWidget;
