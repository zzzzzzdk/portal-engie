import React from 'react';
import { List, Typography, Badge } from 'antd';
import { WidgetConfig } from '@/types';

interface TopListWidgetProps {
  config?: WidgetConfig;
}

const data = [
  { name: 'Product A', sales: 1234, change: '+12%' },
  { name: 'Product B', sales: 984, change: '+5%' },
  { name: 'Product C', sales: 856, change: '-2%' },
  { name: 'Product D', sales: 664, change: '+8%' },
  { name: 'Product E', sales: 432, change: '+15%' },
];

const TopListWidget: React.FC<TopListWidgetProps> = ({ config: _config }) => {
  return (
    <List
      size="small"
      dataSource={data}
      renderItem={(item, index) => (
        <List.Item>
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge 
                count={index + 1} 
                style={{ 
                  backgroundColor: index < 3 ? '#faad14' : '#d9d9d9',
                  boxShadow: 'none'
                }} 
              />
              <Typography.Text strong>{item.name}</Typography.Text>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Typography.Text>{item.sales}</Typography.Text>
              <Typography.Text type={item.change.startsWith('+') ? 'success' : 'danger'}>
                {item.change}
              </Typography.Text>
            </div>
          </div>
        </List.Item>
      )}
    />
  );
};

export default TopListWidget;
