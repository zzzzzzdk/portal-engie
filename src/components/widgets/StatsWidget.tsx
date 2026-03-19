import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Statistic, Card, Row, Col, Spin, Empty } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons'
import { WidgetConfig, Widget } from '@/types'
import { safeIntervalMs } from '@/constants/dashboard'
import { requestWidgetApi } from '@/utils/widgetApi'
import { getWidgetDefaultFieldValue } from '@/utils/widgetApiDefaults'

interface StatItem {
  key: string
  label: string
  value?: number
  precision?: number
  suffix?: string
  prefix?: string
  trend?: 'up' | 'down' | 'none'
  trendValue?: number
  color?: string
}

interface StatsWidgetConfig extends WidgetConfig {
  statsItems?: StatItem[]
  layout?: 'horizontal' | 'vertical'
}

interface StatsWidgetProps {
  config?: StatsWidgetConfig
  widget?: Widget
}

const DEFAULT_STATS: StatItem[] = [
  { key: 'activeUsers', label: '活跃用户', precision: 0, trend: 'up', color: '#3f8600' },
  { key: 'idleRate', label: '空闲率', precision: 2, suffix: '%', trend: 'down', color: '#cf1322' },
]

const StatsWidget: React.FC<StatsWidgetProps> = ({ config, widget }) => {
  const [statsData, setStatsData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const statsConfig = config as StatsWidgetConfig
  const apiEndpoint = statsConfig?.apiEndpoint
  const refreshInterval = statsConfig?.refreshInterval || 0
  const statsItems = statsConfig?.statsItems || DEFAULT_STATS
  const layout = statsConfig?.layout || 'horizontal'
  const defaultDataField = getWidgetDefaultFieldValue('stats')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (apiEndpoint) {
        const result = await requestWidgetApi({
        endpoint: apiEndpoint,
        method: statsConfig?.apiMethod,
        headers: statsConfig?.apiHeaders,
        query: statsConfig?.apiQuery,
        body: statsConfig?.apiBody,
        dataField: statsConfig?.apiDataField || defaultDataField,
      })
        setStatsData(result.data || result.raw || {})
      } else {
        await new Promise(resolve => setTimeout(resolve, 500))
        setStatsData({
          activeUsers: Math.floor(Math.random() * 20000) + 100000,
          idleRate: Math.random() * 15 + 5,
        })
      }
    } catch (err: any) {
      console.error('加载统计数据失败:', err)
      setError(err.message || '数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [
    apiEndpoint,
    statsConfig?.apiBody,
    statsConfig?.apiDataField,
    statsConfig?.apiHeaders,
    statsConfig?.apiMethod,
    statsConfig?.apiQuery,
    defaultDataField,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (refreshInterval > 0) {
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
  }, [refreshInterval, loadData])

  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      loadData()
    }
  }, [widget?.refreshCount, loadData])

  const getTrendIcon = (trend?: 'up' | 'down' | 'none') => {
    switch (trend) {
      case 'up':
        return <ArrowUpOutlined />
      case 'down':
        return <ArrowDownOutlined />
      default:
        return <MinusOutlined />
    }
  }

  const getTrendColor = (trend?: 'up' | 'down' | 'none', customColor?: string) => {
    if (customColor) return customColor
    switch (trend) {
      case 'up':
        return '#3f8600'
      case 'down':
        return '#cf1322'
      default:
        return '#666'
    }
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={error} />
      </div>
    )
  }

  const colSpan = layout === 'horizontal' ? Math.floor(24 / Math.max(statsItems.length, 1)) : 24

  return (
    <Spin spinning={loading}>
      <Row gutter={16} style={{ height: '100%', alignItems: 'center' }}>
        {statsItems.map(item => {
          const value = item.value ?? statsData[item.key] ?? 0
          const color = getTrendColor(item.trend, item.color)

          return (
            <Col span={colSpan} key={item.key}>
              <Card variant="borderless">
                <Statistic
                  title={item.label}
                  value={value}
                  precision={item.precision ?? 0}
                  loading={loading}
                  styles={{ content: { color }, prefix: { color }, suffix: { color } }}
                  prefix={item.prefix || getTrendIcon(item.trend)}
                  suffix={item.suffix || ''}
                />
                {item.trendValue !== undefined && (
                  <div style={{ fontSize: '12px', color, marginTop: '4px' }}>
                    {item.trend === 'up' ? '+' : item.trend === 'down' ? '' : ''}
                    {item.trendValue}%
                  </div>
                )}
              </Card>
            </Col>
          )
        })}
      </Row>
    </Spin>
  )
}

export default StatsWidget
