import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Spin } from 'antd'
import type { Widget, WidgetConfig } from '@/types'
import { safeIntervalMs } from '@/constants/dashboard'
import { requestWidgetApi } from '@/utils/widgetApi'
import { getWidgetDefaultFieldValue } from '@/utils/widgetApiDefaults'
import './index.scss'

interface IndicatorCardWidgetConfig extends WidgetConfig {
  dataSource?: 'static' | 'customApi' | 'dataSource'
  staticValue?: string | number
  staticDescription?: string
  valueField?: string
  descriptionField?: string
  indicatorValueFontSize?: number
  indicatorDescriptionFontSize?: number
  indicatorValueColor?: string
  indicatorDescriptionColor?: string
}

interface IndicatorCardData {
  value?: unknown
  description?: unknown
}

interface IndicatorCardWidgetProps {
  config?: IndicatorCardWidgetConfig
  widget?: Widget
}

const resolveApiPayload = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload[0]
  }

  return payload
}

const formatIndicatorValue = (value: unknown) => {
  if (value == null || value === '') {
    return '--'
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('zh-CN', {
      maximumFractionDigits: 20,
    }).format(value)
  }

  return String(value)
}

const IndicatorCardWidget: React.FC<IndicatorCardWidgetProps> = ({ config, widget }) => {
  const widgetConfig = config as IndicatorCardWidgetConfig
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardData, setCardData] = useState<IndicatorCardData>({
    value: widgetConfig?.staticValue,
    description: widgetConfig?.staticDescription,
  })

  const defaultDataField = getWidgetDefaultFieldValue('indicatorCard')
  const dataSource = widgetConfig?.dataSource || 'static'

  const loadData = useCallback(async () => {
    if (dataSource === 'static' || !widgetConfig?.apiEndpoint?.trim()) {
      setError(null)
      setCardData({
        value: widgetConfig?.staticValue,
        description: widgetConfig?.staticDescription,
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await requestWidgetApi({
        endpoint: widgetConfig.apiEndpoint.trim(),
        method: widgetConfig.apiMethod,
        headers: widgetConfig.apiHeaders,
        query: widgetConfig.apiQuery,
        body: widgetConfig.apiBody,
        dataField: widgetConfig.apiDataField || defaultDataField,
        timeout: widgetConfig?.timeout,
      })

      const payload = resolveApiPayload(result.data ?? result.raw)
      const valueField = widgetConfig?.valueField || 'value'
      const descriptionField = widgetConfig?.descriptionField || 'description'

      if (payload && typeof payload === 'object') {
        setCardData({
          value: (payload as Record<string, unknown>)[valueField],
          description: (payload as Record<string, unknown>)[descriptionField],
        })
      } else {
        setCardData({
          value: payload,
          description: '',
        })
      }
    } catch (err: any) {
      console.error('加载指标卡数据失败:', err)
      setError(err?.message || '指标卡数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [
    dataSource,
    defaultDataField,
    widgetConfig?.apiBody,
    widgetConfig?.apiDataField,
    widgetConfig?.apiEndpoint,
    widgetConfig?.apiHeaders,
    widgetConfig?.apiMethod,
    widgetConfig?.apiQuery,
    widgetConfig?.descriptionField,
    widgetConfig?.staticDescription,
    widgetConfig?.staticValue,
    widgetConfig?.valueField,
  ])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (
      dataSource === 'customApi' &&
      widgetConfig?.refreshInterval &&
      widgetConfig.refreshInterval > 0 &&
      widgetConfig.apiEndpoint
    ) {
      intervalRef.current = setInterval(() => {
        void loadData()
      }, safeIntervalMs(widgetConfig.refreshInterval))
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [dataSource, loadData, widgetConfig?.apiEndpoint, widgetConfig?.refreshInterval])

  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      void loadData()
    }
  }, [loadData, widget?.refreshCount])

  const styles = useMemo(
    () =>
      ({
        '--indicator-value-color': widgetConfig?.indicatorValueColor || '#1890ff',
        '--indicator-description-color': widgetConfig?.indicatorDescriptionColor || '#95de64',
        '--indicator-value-font-size':
          typeof widgetConfig?.indicatorValueFontSize === 'number'
            ? `${widgetConfig.indicatorValueFontSize}px`
            : undefined,
        '--indicator-description-font-size':
          typeof widgetConfig?.indicatorDescriptionFontSize === 'number'
            ? `${widgetConfig.indicatorDescriptionFontSize}px`
            : undefined,
      } as React.CSSProperties),
    [
      widgetConfig?.indicatorDescriptionColor,
      widgetConfig?.indicatorDescriptionFontSize,
      widgetConfig?.indicatorValueColor,
      widgetConfig?.indicatorValueFontSize,
    ],
  )

  if (error) {
    return (
      <div className="indicator-card-widget__state">
        <Empty description={error} />
      </div>
    )
  }

  return (
    <Spin spinning={loading} wrapperClassName="indicator-card-widget__state">
      <div className="indicator-card-widget" style={styles}>
        <div className="indicator-card-widget__content">
          <div className="indicator-card-widget__value">{formatIndicatorValue(cardData.value)}</div>
          {cardData.description ? (
            <div className="indicator-card-widget__description">{String(cardData.description)}</div>
          ) : null}
        </div>
      </div>
    </Spin>
  )
}

export default IndicatorCardWidget
