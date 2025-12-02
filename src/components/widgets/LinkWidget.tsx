import React from 'react';
import { Button, Space } from 'antd';
import { GoogleOutlined, GithubOutlined, TwitterOutlined, LinkedinOutlined } from '@ant-design/icons';
import { WidgetConfig } from '@/types';

interface LinkWidgetProps {
  config?: WidgetConfig;
}

const LinkWidget: React.FC<LinkWidgetProps> = ({ config: _config }) => {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Space wrap>
        <Button type="primary" shape="circle" icon={<GoogleOutlined />} size="large" onClick={() => console.log('Google clicked')} />
        <Button type="default" shape="circle" icon={<GithubOutlined />} size="large" onClick={() => console.log('Github clicked')} />
        <Button type="primary" shape="circle" icon={<TwitterOutlined />} size="large" danger onClick={() => console.log('Twitter clicked')} />
        <Button type="primary" shape="circle" icon={<LinkedinOutlined />} size="large" style={{ background: '#0077b5' }} onClick={() => console.log('LinkedIn clicked')} />
      </Space>
    </div>
  );
};

export default LinkWidget;
