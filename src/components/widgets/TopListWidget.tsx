import React, { useState, useEffect, useCallback, useRef } from 'react';
import { List, Typography, Badge, Spin, Empty } from 'antd';
import { WidgetConfig, Widget } from '@/types';
import axios from 'axios';

/**
 * 排行榜项数据
 */
interface TopListItem {
  id?: string;
  name: string;
  value: number;
  change?: string;
  unit?: string;
  extra?: Record<string, any>;
}

/**
 * 排行榜组件配置
 */
interface TopListWidgetConfig extends WidgetConfig {
  apiEndpoint?: string;      // 数据接口地址
  refreshInterval?: number;  // 刷新间隔(秒)
  listItems?: TopListItem[]; // 静态数据
  nameField?: string;        // 名称字段
  valueField?: string;       // 值字段
  changeField?: string;      // 变化字段
  unitField?: string;        // 单位字段
  maxItems?: number;         // 最大显示条数
  highlightTop?: number;     // 高亮前N名
  listTitle?: string;        // 列表标题
  valueLabel?: string;       // 值标签
  changeLabel?: string;      // 变化标签
}

interface TopListWidgetProps {
  config?: TopListWidgetConfig;
  widget?: Widget;
}

// 默认排行榜数据
const DEFAULT_DATA: TopListItem[] = [
  { name: '产品 A', value: 1234, change: '+12%' },
  { name: '产品 B', value: 984, change: '+5%' },
  { name: '产品 C', value: 856, change: '-2%' },
  { name: '产品 D', value: 664, change: '+8%' },
  { name: '产品 E', value: 432, change: '+15%' },
];

const TopListWidget: React.FC<TopListWidgetProps> = ({ config, widget }) => {
  const [listData, setListData] = useState<TopListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 获取配置
  const listConfig = config as TopListWidgetConfig;
  const apiEndpoint = listConfig?.apiEndpoint;
  const refreshInterval = listConfig?.refreshInterval || 0;
  const staticItems = listConfig?.listItems;
  const nameField = listConfig?.nameField || 'name';
  const valueField = listConfig?.valueField || 'value';
  const changeField = listConfig?.changeField || 'change';
  const unitField = listConfig?.unitField || 'unit';
  const maxItems = listConfig?.maxItems || 10;
  const highlightTop = listConfig?.highlightTop ?? 3;
  const listTitle = listConfig?.listTitle;
  const valueLabel = listConfig?.valueLabel || '';
  const changeLabel = listConfig?.changeLabel || '';

  // 转换数据格式
  const transformData = useCallback((data: any[]): TopListItem[] => {
    return data.slice(0, maxItems).map((item, index) => ({
      id: item.id || `item-${index}`,
      name: item[nameField] || item.name || '未知',
      value: item[valueField] ?? item.value ?? 0,
      change: item[changeField] || item.change,
      unit: item[unitField] || item.unit,
    }));
  }, [nameField, valueField, changeField, unitField, maxItems]);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (apiEndpoint) {
        // 从接口获取数据
        const response = await axios.get(apiEndpoint);
        const data = response.data?.data || response.data?.list || response.data;
        if (Array.isArray(data)) {
          setListData(transformData(data));
        } else {
          setListData([]);
        }
      } else if (staticItems && staticItems.length > 0) {
        // 使用静态配置数据
        setListData(staticItems.slice(0, maxItems));
      } else {
        // 使用默认数据
        await new Promise(resolve => setTimeout(resolve, 300));
        setListData(DEFAULT_DATA);
      }
    } catch (err: any) {
      console.error('加载排行榜数据失败:', err);
      setError(err.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, staticItems, maxItems, transformData]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 设置轮询
  useEffect(() => {
    if (refreshInterval > 0 && apiEndpoint) {
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
  }, [refreshInterval, apiEndpoint, loadData]);

  // 响应刷新操作
  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      console.log('刷新排行榜组件数据...');
      loadData();
    }
  }, [widget?.refreshCount, loadData]);

  // 格式化数值
  const formatValue = (value: number, unit?: string): string => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万${unit || ''}`;
    }
    return `${value.toLocaleString()}${unit || ''}`;
  };

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={error} />
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <div style={{ height: '100%', overflow: 'auto' }}>
        {listTitle && (
          <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0' }}>
            {listTitle}
          </div>
        )}
        <List
          size="small"
          dataSource={listData}
          renderItem={(item, index) => (
            <List.Item>
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                  <Badge
                    count={index + 1}
                    style={{
                      backgroundColor: index < highlightTop ? '#faad14' : '#d9d9d9',
                      boxShadow: 'none',
                      minWidth: '24px',
                    }}
                  />
                  <Typography.Text strong ellipsis={{ tooltip: item.name }} style={{ flex: 1 }}>
                    {item.name}
                  </Typography.Text>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
                  <Typography.Text>
                    {valueLabel && <span style={{ marginRight: '4px', color: '#999' }}>{valueLabel}</span>}
                    {formatValue(item.value, item.unit)}
                  </Typography.Text>
                  {item.change && (
                    <Typography.Text
                      type={item.change.startsWith('+') ? 'success' : item.change.startsWith('-') ? 'danger' : undefined}
                    >
                      {changeLabel && <span style={{ marginRight: '2px', color: '#999' }}>{changeLabel}</span>}
                      {item.change}
                    </Typography.Text>
                  )}
                </div>
              </div>
            </List.Item>
          )}
        />
      </div>
    </Spin>
  );
};

export default TopListWidget;
