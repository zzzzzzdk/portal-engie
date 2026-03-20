import React, { useState, useEffect, useCallback, useRef } from 'react'
import { List, Avatar, Typography, Spin, Empty } from 'antd'
import { WidgetConfig, Widget } from '@/types'
import { safeIntervalMs } from '@/constants/dashboard'
import { requestWidgetApi } from '@/utils/widgetApi'
import { getWidgetDefaultFieldValue } from '@/utils/widgetApiDefaults'

interface NewsItem {
  id?: string
  title: string
  description?: string
  avatar?: string
  url?: string
  time?: string
  source?: string
}

interface NewsWidgetConfig extends WidgetConfig {
  newsItems?: NewsItem[]
  titleField?: string
  descriptionField?: string
  urlField?: string
  avatarField?: string
  maxItems?: number
}

interface NewsWidgetProps {
  config?: NewsWidgetConfig
  widget?: Widget
  isEditMode?: boolean
}

const DEFAULT_NEWS: NewsItem[] = [
  {
    title: '最新产品版本发布',
    description: '本次更新聚焦性能优化与组件配置能力提升。',
  },
  {
    title: '开发规范持续升级',
    description: '团队正在进一步统一编码风格与配置体系。',
  },
  {
    title: '可视化组件能力扩展',
    description: '新增多类数据对接与展示能力，适配更多业务场景。',
  },
  {
    title: '界面交互体验优化',
    description: '重点改进组件配置与数据调试流程，提升使用效率。',
  },
]

const NewsWidget: React.FC<NewsWidgetProps> = ({ config, widget, isEditMode }) => {
  const [newsData, setNewsData] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const newsConfig = config as NewsWidgetConfig
  const apiEndpoint = newsConfig?.apiEndpoint
  const refreshInterval = newsConfig?.refreshInterval || 0
  const staticItems = newsConfig?.newsItems
  const titleField = newsConfig?.titleField || 'title'
  const descriptionField = newsConfig?.descriptionField || 'description'
  const urlField = newsConfig?.urlField || 'url'
  const avatarField = newsConfig?.avatarField || 'avatar'
  const maxItems = newsConfig?.maxItems || 10
  const defaultListField = getWidgetDefaultFieldValue('news')

  const transformData = useCallback(
    (data: any[]): NewsItem[] =>
      data.map((item, index) => ({
        id: item.id || `news-${index}`,
        title: item?.[titleField] || item?.title || '无标题',
        description: item?.[descriptionField] || item?.description || '',
        url: item?.[urlField] || item?.url,
        avatar: item?.[avatarField] || item?.avatar,
        time: item?.time || item?.publishTime || item?.createTime,
        source: item?.source,
      })),
    [avatarField, descriptionField, titleField, urlField],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (apiEndpoint) {
        const result = await requestWidgetApi({
          endpoint: apiEndpoint,
          method: newsConfig?.apiMethod,
          headers: newsConfig?.apiHeaders,
          query: newsConfig?.apiQuery,
          body: newsConfig?.apiBody,
          dataField: newsConfig?.apiDataField,
          listField: newsConfig?.apiListField || defaultListField,
        })

        const sourceList = result.list.length
          ? result.list
          : Array.isArray(result.data)
            ? result.data
            : []

        setNewsData(transformData(sourceList).slice(0, maxItems))
      } else if (staticItems && staticItems.length > 0) {
        setNewsData(staticItems.slice(0, maxItems))
      } else {
        await new Promise(resolve => setTimeout(resolve, 300))
        setNewsData(DEFAULT_NEWS.slice(0, maxItems))
      }
    } catch (err: any) {
      console.error('加载新闻数据失败:', err)
      setError(err.message || '数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [
    apiEndpoint,
    defaultListField,
    maxItems,
    newsConfig?.apiBody,
    newsConfig?.apiDataField,
    newsConfig?.apiHeaders,
    newsConfig?.apiListField,
    newsConfig?.apiMethod,
    newsConfig?.apiQuery,
    staticItems,
    transformData,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (refreshInterval > 0 && apiEndpoint) {
      intervalRef.current = setInterval(() => {
        loadData()
      }, safeIntervalMs(refreshInterval))
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [refreshInterval, apiEndpoint, loadData])

  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      loadData()
    }
  }, [widget?.refreshCount, loadData])

  const handleNewsClick = (item: NewsItem) => {
    if (item.url && !isEditMode) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={error} />
      </div>
    )
  }

  return (
    <Spin spinning={loading}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <List
          itemLayout="horizontal"
          dataSource={newsData}
          style={{ flex: 1, overflow: 'auto' }}
          renderItem={(item, index) => (
            <List.Item
              style={{ cursor: item.url && !isEditMode ? 'pointer' : 'default' }}
              onClick={() => handleNewsClick(item)}
            >
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
                        {item.source && item.time && <span> / </span>}
                        {item.time && <span>{item.time}</span>}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </Spin>
  )
}

export default NewsWidget
