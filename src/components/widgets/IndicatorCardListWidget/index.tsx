import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Spin } from 'antd'
import type {
  IndicatorCardListItem,
  IndicatorCardListWidgetConfig,
  Widget,
} from '@/types'
import { safeIntervalMs } from '@/constants/dashboard'
import { getWidgetDefaultFieldValue } from '@/utils/widgetApiDefaults'
import { getValueByPath, requestWidgetApi } from '@/utils/widgetApi'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'
import { useWidgetRuntimeParams } from '@/hooks/useWidgetRuntimeParams'
import './index.scss'

interface IndicatorCardListWidgetProps {
  config?: IndicatorCardListWidgetConfig
  widget?: Widget
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

const normalizeListItems = (
  payload: unknown,
  valueField = 'value',
  descriptionField = 'description',
): IndicatorCardListItem[] => {
  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .map<IndicatorCardListItem | null>((item, index) => {
      if (item == null) {
        return null
      }

      if (typeof item !== 'object') {
        return {
          id: `indicator-card-list-item-${index}`,
          value: item as string | number,
          description: '',
        }
      }

      const record = item as Record<string, unknown>
      const value = getValueByPath(record, valueField) ?? record[valueField]
      const description =
        getValueByPath(record, descriptionField) ?? record[descriptionField]

      return {
        id: String(record.id ?? `indicator-card-list-item-${index}`),
        value: value as string | number | undefined,
        description: description == null ? '' : String(description),
        valueColor:
          typeof record.valueColor === 'string' ? record.valueColor : undefined,
        descriptionColor:
          typeof record.descriptionColor === 'string'
            ? record.descriptionColor
            : undefined,
      }
    })
    .filter((item): item is IndicatorCardListItem => item !== null)
}

const IndicatorCardListWidget: React.FC<IndicatorCardListWidgetProps> = ({ config, widget }) => {
  const widgetConfig = config as IndicatorCardListWidgetConfig
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const emitWidgetEvent = useWidgetEventEmitter(widget)
  const { runtimeParamsRef, setRuntimeParams, clearRuntimeParams } = useWidgetRuntimeParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<IndicatorCardListItem[]>(widgetConfig?.staticItems || [])

  const defaultListField = getWidgetDefaultFieldValue('indicatorCardList')
  const dataSource = widgetConfig?.dataSource || 'static'
  const valueField = widgetConfig?.valueField || 'value'
  const descriptionField = widgetConfig?.descriptionField || 'description'

  const loadData = useCallback(async () => {
    if (dataSource === 'static' || !widgetConfig?.apiEndpoint?.trim()) {
      setError(null)
      setItems(Array.isArray(widgetConfig?.staticItems) ? widgetConfig.staticItems : [])
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
        listField: widgetConfig.apiListField || defaultListField,
        timeout: widgetConfig.timeout,
        runtimeParams: runtimeParamsRef.current,
      })

      const payload = result.list?.length
        ? result.list
        : Array.isArray(result.raw)
          ? result.raw
          : []

      const nextItems = normalizeListItems(payload, valueField, descriptionField)
      setItems(nextItems)
      emitWidgetEvent('data.loaded', { items: nextItems, raw: payload }, 'system')
    } catch (err: any) {
      console.error('加载指标列表卡数据失败', err)
      const message = err?.message || '指标列表卡数据加载失败'
      setError(message)
      emitWidgetEvent('data.error', { message, error: err }, 'system')
    } finally {
      setLoading(false)
    }
  }, [
    dataSource,
    defaultListField,
    descriptionField,
    valueField,
    widgetConfig?.apiBody,
    widgetConfig?.apiEndpoint,
    widgetConfig?.apiHeaders,
    widgetConfig?.apiListField,
    widgetConfig?.apiMethod,
    widgetConfig?.apiQuery,
    emitWidgetEvent,
    runtimeParamsRef,
    widgetConfig?.staticItems,
    widgetConfig?.timeout,
  ])

  useWidgetEventInputs(widget, {
    reload: () => {
      void loadData()
    },
    setParams: (params, message) => {
      const input = widget?.config?.eventInputs?.find(item =>
        item.listenWidgetId === message.sourceWidgetId && item.listenEventName === message.name,
      )
      setRuntimeParams(params, 'replace')
    },
    setParamsAndReload: (params, message) => {
      const input = widget?.config?.eventInputs?.find(item =>
        item.listenWidgetId === message.sourceWidgetId && item.listenEventName === message.name,
      )
      setRuntimeParams(params, 'replace')
      void loadData()
    },
    clearParams: () => {
      clearRuntimeParams()
      void loadData()
    },
  })

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (
      dataSource !== 'static'
      && widgetConfig?.refreshInterval
      && widgetConfig.refreshInterval > 0
      && widgetConfig.apiEndpoint
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
        '--indicator-card-list-columns': String(
          Math.min(Math.max(widgetConfig?.columns || 2, 1), 4),
        ),
      } as React.CSSProperties),
    [
      widgetConfig?.columns,
      widgetConfig?.indicatorDescriptionColor,
      widgetConfig?.indicatorDescriptionFontSize,
      widgetConfig?.indicatorValueColor,
      widgetConfig?.indicatorValueFontSize,
    ],
  )

  if (error) {
    return (
      <div className="indicator-card-list-widget__state">
        <Empty description={error} />
      </div>
    )
  }

  return (
    <Spin spinning={loading} wrapperClassName="indicator-card-list-widget__state">
      <div className="indicator-card-list-widget" style={styles}>
        {items.length ? (
          <div className="indicator-card-list-widget__grid">
            {items.map((item, index) => (
              <div
                key={item.id || `${item.description || 'indicator'}-${index}`}
                className="indicator-card-list-widget__item"
                onClick={() => emitWidgetEvent('card.itemClick', {
                  item,
                  index,
                  value: item.value,
                  description: item.description,
                }, 'click')}
              >
                <div
                  className="indicator-card-list-widget__value"
                  style={item.valueColor ? { color: item.valueColor } : undefined}
                >
                  {formatIndicatorValue(item.value)}
                </div>
                {item.description ? (
                  <div
                    className="indicator-card-list-widget__description"
                    style={
                      item.descriptionColor
                        ? { color: item.descriptionColor }
                        : undefined
                    }
                  >
                    {String(item.description)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="indicator-card-list-widget__empty">
            <Empty description="暂无数据" />
          </div>
        )}
      </div>
    </Spin>
  )
}

export default IndicatorCardListWidget
