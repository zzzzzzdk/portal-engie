import React from 'react';
import { Statistic, Card, Row, Col } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { WidgetConfig } from '@/types';

interface StatsWidgetProps {
  config?: WidgetConfig;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ config: _config }) => {
  return (
    <Row gutter={16} style={{ height: '100%', alignItems: 'center' }}>
      <Col span={12}>
        <Card variant="borderless">
          <Statistic
            title="Active Users"
            value={112893}
            precision={0}
            styles={{ content: { color: '#3f8600' } }}
            prefix={<ArrowUpOutlined />}
            suffix=""
          />
        </Card>
      </Col>
      <Col span={12}>
        <Card variant="borderless">
          <Statistic
            title="Idle"
            value={9.3}
            precision={2}
            styles={{ content: { color: '#cf1322' } }}
            prefix={<ArrowDownOutlined />}
            suffix="%"
          />
        </Card>
      </Col>
    </Row>
  );
};

export default StatsWidget;
