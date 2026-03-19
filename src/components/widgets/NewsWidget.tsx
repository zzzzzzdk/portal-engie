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
    title: '\u6700\u65b0\u4ea7\u54c1\u7248\u672c\u53d1\u5e03',
    description: '\u672c\u6b21\u66f4\u65b0\u805a\u7126\u6027\u80fd\u4f18\u5316\u4e0e\u7ec4\u4ef6\u914d\u7f6e\u80fd\u529b\u63d0\u5347\u3002',
  },
  {
    title: '\u5f00\u53d1\u89c4\u8303\u6301\u7eed\u5347\u7ea7',
    description: '\u56e2\u961f\u6b63\u5728\u8fdb\u4e00\u6b65\u7edf\u4e00\u7f16\u7801\u98ce\u683c\u4e0e\u914d\u7f6e\u4f53\u7cfb\u3002',
  },
  {
    title: '\u53ef\u89c6\u5316\u7ec4\u4ef6\u80fd\u529b\u6269\u5c55',
    description: '\u65b0\u589e\u591a\u7c7b\u6570\u636e\u5bf9\u63a5\u4e0e\u5c55\u793a\u80fd\u529b\uff0c\u9002\u914d\u66f4\u591a\u4e1a\u52a1\u573a\u666f\u3002',
  },
  {
    title: '\u754c\u9762\u4ea4\u4e92\u4f53\u9a8c\u4f18\u5316',
    description: '\u91cd\u70b9\u6539\u8fdb\u7ec4\u4ef6\u914d\u7f6e\u4e0e\u6570\u636e\u8c03\u8bd5\u6d41\u7a0b\uff0c\u63d0\u5347\u4f7f\u7528\u6548\u7387\u3002',
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
        title: item?.[titleField] || item?.title || '\u65e0\u6807\u9898',
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
      console.error('\u52a0\u8f7d\u65b0\u95fb\u6570\u636e\u5931\u8d25:', err)
      setError(err.message || '\u6570\u636e\u52a0\u8f7d\u5931\u8d25')
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
