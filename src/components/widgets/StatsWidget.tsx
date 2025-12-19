import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Statistic, Card, Row, Col, Spin, Empty } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import { WidgetConfig, Widget } from '@/types';
import axios from 'axios';

/**
 * 统计项配置
 */
interface StatItem {
  key: string;           // 字段key
  label: string;         // 显示标签
  value?: number;        // 值
  precision?: number;    // 小数精度
  suffix?: string;       // 后缀
  prefix?: string;       // 前缀
  trend?: 'up' | 'down' | 'none';  // 趋势方向
  trendValue?: number;   // 趋势值（如变化百分比）
  color?: string;        // 自定义颜色
}

/**
 * 统计组件配置
 */
interface StatsWidgetConfig extends WidgetConfig {
  apiEndpoint?: string;      // 数据接口地址
  refreshInterval?: number;  // 刷新间隔(秒)
  statsItems?: StatItem[];   // 统计项配置
  layout?: 'horizontal' | 'vertical';  // 布局方向
}

interface StatsWidgetProps {
  config?: StatsWidgetConfig;
  widget?: Widget;
}

// 默认统计项示例
const DEFAULT_STATS: StatItem[] = [
  { key: 'activeUsers', label: '活跃用户', precision: 0, trend: 'up', color: '#3f8600' },
  { key: 'idleRate', label: '空闲率', precision: 2, suffix: '%', trend: 'down', color: '#cf1322' },
];

const StatsWidget: React.FC<StatsWidgetProps> = ({ config, widget }) => {
  const [statsData, setStatsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 获取配置
  const statsConfig = config as StatsWidgetConfig;
  const apiEndpoint = statsConfig?.apiEndpoint;
  const refreshInterval = statsConfig?.refreshInterval || 0;
  const statsItems = statsConfig?.statsItems || DEFAULT_STATS;
  const layout = statsConfig?.layout || 'horizontal';

  // 加载数据函数
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (apiEndpoint) {
        // 从接口获取数据
        const response = await axios.get(apiEndpoint);
        const data = response.data?.data || response.data;
        setStatsData(data);
      } else {
        // 模拟数据
        await new Promise(resolve => setTimeout(resolve, 500));
        setStatsData({
          activeUsers: Math.floor(Math.random() * 20000) + 100000,
          idleRate: Math.random() * 15 + 5,
        });
      }
    } catch (err: any) {
      console.error('加载统计数据失败:', err);
      setError(err.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 设置轮询
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        loadData();
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshInterval, loadData]);

  // 响应刷新操作
  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      console.log('刷新统计组件数据...');
      loadData();
    }
  }, [widget?.refreshCount, loadData]);

  // 获取趋势图标
  const getTrendIcon = (trend?: 'up' | 'down' | 'none') => {
    switch (trend) {
      case 'up':
        return <ArrowUpOutlined />;
      case 'down':
        return <ArrowDownOutlined />;
      default:
        return <MinusOutlined />;
    }
  };

  // 获取趋势颜色
  const getTrendColor = (trend?: 'up' | 'down' | 'none', customColor?: string) => {
    if (customColor) return customColor;
    switch (trend) {
      case 'up':
        return '#3f8600';
      case 'down':
        return '#cf1322';
      default:
        return '#666';
    }
  };

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={error} />
      </div>
    );
  }

  const colSpan = layout === 'horizontal' ? Math.floor(24 / Math.max(statsItems.length, 1)) : 24;

  return (
    <Spin spinning={loading}>
      <Row gutter={16} style={{ height: '100%', alignItems: 'center' }}>
        {statsItems.map((item) => {
          const value = item.value ?? statsData[item.key] ?? 0;
          const color = getTrendColor(item.trend, item.color);

          return (
            <Col span={colSpan} key={item.key}>
              <Card variant="borderless">
                <Statistic
                  title={item.label}
                  value={value}
                  precision={item.precision ?? 0}
                  loading={loading}
                  styles={{ content: { color } }}
                  prefix={item.prefix || getTrendIcon(item.trend)}
                  suffix={item.suffix || ''}
                />
                {item.trendValue !== undefined && (
                  <div style={{ fontSize: '12px', color: color, marginTop: '4px' }}>
                    {item.trend === 'up' ? '+' : item.trend === 'down' ? '' : ''}{item.trendValue}%
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </Spin>
  );
};

export default StatsWidget;
