import React, { useState, useEffect, useCallback } from 'react';
import { Statistic, Card, Row, Col } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { WidgetConfig, Widget } from '@/types';

interface StatsWidgetProps {
  config?: WidgetConfig;
  widget?: Widget;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ config: _config, widget }) => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [idleRate, setIdleRate] = useState(0);
  const [loading, setLoading] = useState(true);

  // 加载数据函数
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 模拟API请求
      await new Promise(resolve => setTimeout(resolve, 500));

      // 模拟从API获取的数据
      const mockActiveUsers = Math.floor(Math.random() * 20000) + 100000;
      const mockIdleRate = Math.random() * 15 + 5;

      setActiveUsers(mockActiveUsers);
      setIdleRate(mockIdleRate);
    } catch (error) {
      console.error('Failed to load stats data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 响应刷新操作 - 重新加载数据
  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      console.log('Refreshing StatsWidget data...');
      loadData();
    }
  }, [widget?.refreshCount, loadData]);

  return (
    <Row gutter={16} style={{ height: '100%', alignItems: 'center' }}>
      <Col span={12}>
        <Card variant="borderless">
          <Statistic
            title="Active Users"
            value={activeUsers}
            precision={0}
            loading={loading}
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
            value={idleRate}
            precision={2}
            loading={loading}
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
