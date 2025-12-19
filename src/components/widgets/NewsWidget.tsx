import React, { useState, useEffect, useCallback, useRef } from 'react';
import { List, Avatar, Typography, Spin, Empty } from 'antd';
import { WidgetConfig, Widget } from '@/types';
import axios from 'axios';

/**
 * 新闻项数据
 */
interface NewsItem {
  id?: string;
  title: string;
  description?: string;
  avatar?: string;
  url?: string;
  time?: string;
  source?: string;
}

/**
 * 新闻组件配置
 */
interface NewsWidgetConfig extends WidgetConfig {
  apiEndpoint?: string;      // 数据接口地址
  refreshInterval?: number;  // 刷新间隔(秒)
  newsItems?: NewsItem[];    // 静态新闻数据
  titleField?: string;       // 标题字段
  descriptionField?: string; // 描述字段
  urlField?: string;         // 链接字段
  avatarField?: string;      // 头像字段
  maxItems?: number;         // 最大显示条数
}

interface NewsWidgetProps {
  config?: NewsWidgetConfig;
  widget?: Widget;
}

// 默认新闻数据
const DEFAULT_NEWS: NewsItem[] = [
  {
    title: 'React 19 正式版发布',
    description: 'React 团队发布了 React 19 正式版，带来了多项性能优化。',
  },
  {
    title: 'Vite 6.0 路线图公布',
    description: '下一代前端构建工具即将带来更快的构建速度。',
  },
  {
    title: 'TypeScript 5.4 发布',
    description: '新特性包括 NoInfer 工具类型等改进。',
  },
  {
    title: 'Ant Design 6.0 即将发布',
    description: '全球第二流行的 React UI 库迎来重大更新。',
  },
];

const NewsWidget: React.FC<NewsWidgetProps> = ({ config, widget }) => {
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 获取配置
  const newsConfig = config as NewsWidgetConfig;
  const apiEndpoint = newsConfig?.apiEndpoint;
  const refreshInterval = newsConfig?.refreshInterval || 0;
  const staticItems = newsConfig?.newsItems;
  const titleField = newsConfig?.titleField || 'title';
  const descriptionField = newsConfig?.descriptionField || 'description';
  const urlField = newsConfig?.urlField || 'url';
  const avatarField = newsConfig?.avatarField || 'avatar';
  const maxItems = newsConfig?.maxItems || 10;

  // 转换数据格式
  const transformData = useCallback((data: any[]): NewsItem[] => {
    return data.slice(0, maxItems).map((item, index) => ({
      id: item.id || `news-${index}`,
      title: item[titleField] || item.title || '无标题',
      description: item[descriptionField] || item.description || '',
      url: item[urlField] || item.url,
      avatar: item[avatarField] || item.avatar,
      time: item.time || item.publishTime || item.createTime,
      source: item.source,
    }));
  }, [titleField, descriptionField, urlField, avatarField, maxItems]);

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
          setNewsData(transformData(data));
        } else {
          setNewsData([]);
        }
      } else if (staticItems && staticItems.length > 0) {
        // 使用静态配置数据
        setNewsData(staticItems.slice(0, maxItems));
      } else {
        // 使用默认数据
        await new Promise(resolve => setTimeout(resolve, 300));
        setNewsData(DEFAULT_NEWS);
      }
    } catch (err: any) {
      console.error('加载新闻数据失败:', err);
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
      console.log('刷新新闻组件数据...');
      loadData();
    }
  }, [widget?.refreshCount, loadData]);

  // 点击新闻
  const handleNewsClick = (item: NewsItem) => {
    if (item.url) {
      console.log('打开新闻链接:', item.url);
      // 内网环境不能直接跳转，仅输出日志
    }
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
      <List
        itemLayout="horizontal"
        dataSource={newsData}
        style={{ height: '100%', overflow: 'auto' }}
        renderItem={(item, index) => (
          <List.Item style={{ cursor: item.url ? 'pointer' : 'default' }} onClick={() => handleNewsClick(item)}>
            <List.Item.Meta
              avatar={
                item.avatar ? (
                  <Avatar src={item.avatar}>{item.title.charAt(0)}</Avatar>
                ) : (
                  <Avatar style={{ backgroundColor: `hsl(${index * 60}, 70%, 60%)` }}>
                    {item.title.charAt(0)}
                  </Avatar>
                )
              }
              title={
                <Typography.Text strong ellipsis={{ tooltip: item.title }}>
                  {item.title}
                </Typography.Text>
              }
              description={
                <div>
                  <Typography.Text type="secondary" ellipsis={{ tooltip: item.description }}>
                    {item.description}
                  </Typography.Text>
                  {(item.time || item.source) && (
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      {item.source && <span>{item.source}</span>}
                      {item.source && item.time && <span> · </span>}
                      {item.time && <span>{item.time}</span>}
                    </div>
                  )}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Spin>
  );
};

export default NewsWidget;
