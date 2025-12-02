import React from 'react';
import { Card, Avatar } from 'antd';
import { EditOutlined, EllipsisOutlined, SettingOutlined } from '@ant-design/icons';
import { WidgetConfig } from '@/types';

interface CardGridWidgetProps {
  config?: WidgetConfig;
}

const { Meta } = Card;

const CardGridWidget: React.FC<CardGridWidgetProps> = ({ config: _config }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%', overflow: 'auto' }}>
      {[1, 2, 3, 4].map((i) => (
        <Card
          key={i}
          style={{ width: '100%' }}
          actions={[
            <SettingOutlined key="setting" />,
            <EditOutlined key="edit" />,
            <EllipsisOutlined key="ellipsis" />,
          ]}
        >
          <Meta
            avatar={<Avatar style={{ backgroundColor: `hsl(${i * 90}, 70%, 60%)` }}>{`U${i}`}</Avatar>}
            title={`Card title ${i}`}
            description="This is the description"
          />
        </Card>
      ))}
    </div>
  );
};

export default CardGridWidget;
