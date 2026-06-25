import React, { useState, useEffect, useCallback, useRef } from 'react'
import { List, Typography, Badge, Spin, Empty } from 'antd'
import { WidgetConfig, Widget } from '@/types'
import { safeIntervalMs } from '@/constants/dashboard'
import { requestWidgetApi } from '@/utils/widgetApi'
import { getWidgetDefaultFieldValue } from '@/utils/widgetApiDefaults'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'
import { useWidgetRuntimeParams } from '@/hooks/useWidgetRuntimeParams'

interface TopListItem {
  id?: string
  name: string
  value: number
  change?: string
  unit?: string
  extra?: Record<string, any>
}

interface TopListWidgetConfig extends WidgetConfig {
  listItems?: TopListItem[]
  nameField?: string
  valueField?: string
  changeField?: string
  unitField?: string
  maxItems?: number
  highlightTop?: number
  listTitle?: string
  valueLabel?: string
  changeLabel?: string
  staticData?: any
}

interface TopListWidgetProps {
  config?: TopListWidgetConfig
  widget?: Widget
}

const DEFAULT_DATA: TopListItem[] = [
  { name: '产品 A', value: 1234, change: '+12%' },
  { name: '产品 B', value: 984, change: '+5%' },
  { name: '产品 C', value: 856, change: '-2%' },
  { name: '产品 D', value: 664, change: '+8%' },
  { name: '产品 E', value: 432, change: '+15%' },
]

const TopListWidget: React.FC<TopListWidgetProps> = ({ config, widget }) => {
  const [listData, setListData] = useState<TopListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const emitWidgetEvent = useWidgetEventEmitter(widget)
  const { runtimeParamsRef, setRuntimeParams, clearRuntimeParams } = useWidgetRuntimeParams()

  const listConfig = config as TopListWidgetConfig
  const apiEndpoint = listConfig?.apiEndpoint
  const isStaticDataSource = listConfig?.dataSource === 'static'
  const refreshInterval = listConfig?.refreshInterval || 0
  const staticData = listConfig?.staticData ?? listConfig?.listItems
  const nameField = listConfig?.nameField || 'name'
  const valueField = listConfig?.valueField || 'value'
  const changeField = listConfig?.changeField || 'change'
  const unitField = listConfig?.unitField || 'unit'
  const maxItems = listConfig?.maxItems || 10
  const highlightTop = listConfig?.highlightTop ?? 3
  const listTitle = listConfig?.listTitle
  const valueLabel = listConfig?.valueLabel || ''
  const changeLabel = listConfig?.changeLabel || ''
  const defaultListField = getWidgetDefaultFieldValue('topList')

  const transformData = useCallback(
    (data: any[]): TopListItem[] =>
      data.map((item, index) => {
        const rawValue = item?.[valueField] ?? item?.value ?? 0
        const rawChange = item?.[changeField] ?? item?.change
        const rawUnit = item?.[unitField] ?? item?.unit

        return {
          id: item.id || `item-${index}`,
          name: String(item?.[nameField] ?? item?.name ?? '未知'),
          value: typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0,
          change: rawChange != null ? String(rawChange) : undefined,
          unit: rawUnit != null ? String(rawUnit) : undefined,
        }
      }),
    [changeField, nameField, unitField, valueField],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (apiEndpoint) {
        const result = await requestWidgetApi({
          endpoint: apiEndpoint,
          method: listConfig?.apiMethod,
          headers: listConfig?.apiHeaders,
          query: listConfig?.apiQuery,
          body: listConfig?.apiBody,
          dataField: listConfig?.apiDataField,
          listField: listConfig?.apiListField || defaultListField,
          timeout: listConfig?.timeout,
          runtimeParams: runtimeParamsRef.current,
        })

        const sourceList = result.list.length
          ? result.list
          : Array.isArray(result.data)
            ? result.data
            : []

        const nextData = transformData(sourceList).slice(0, maxItems)
        setListData(nextData)
        emitWidgetEvent('data.loaded', { items: nextData, raw: sourceList }, 'system')
      } else if (isStaticDataSource && Array.isArray(staticData)) {
        setListData(transformData(staticData).slice(0, maxItems))
      } else {
        await new Promise(resolve => setTimeout(resolve, 300))
        setListData(DEFAULT_DATA.slice(0, maxItems))
      }
    } catch (err: any) {
      console.error('加载排行榜数据失败', err)
      const message = err.message || '数据加载失败'
      setError(message)
      emitWidgetEvent('data.error', { message, error: err }, 'system')
    } finally {
      setLoading(false)
    }
  }, [
    apiEndpoint,
    defaultListField,
    listConfig?.apiBody,
    listConfig?.apiDataField,
    listConfig?.apiHeaders,
    listConfig?.apiListField,
    listConfig?.apiMethod,
    listConfig?.apiQuery,
    emitWidgetEvent,
    runtimeParamsRef,
    maxItems,
    isStaticDataSource,
    staticData,
    transformData,
  ])

  useWidgetEventInputs(widget, {
    reload: () => {
      loadData()
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
      loadData()
    },
    clearParams: () => {
      clearRuntimeParams()
      loadData()
    },
  })

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

  const formatValue = (value: number, unit?: string) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万${unit || ''}`
    }
    return `${value.toLocaleString()}${unit || ''}`
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
        {listTitle && (
          <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0' }}>
            {listTitle}
          </div>
        )}
        <List
          size="small"
          dataSource={listData}
          style={{ flex: 1, overflow: 'auto' }}
          renderItem={(item, index) => {
            const rank = index + 1

            return (
              <List.Item
                onClick={() => emitWidgetEvent('ranking.itemClick', { item, rank, index }, 'click')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                    <Badge
                      count={rank}
                      style={{
                        backgroundColor: rank <= highlightTop ? '#faad14' : '#d9d9d9',
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
                        type={
                          item.change.startsWith('+')
                            ? 'success'
                            : item.change.startsWith('-')
                              ? 'danger'
                              : undefined
                        }
                      >
                        {changeLabel && <span style={{ marginRight: '2px', color: '#999' }}>{changeLabel}</span>}
                        {item.change}
                      </Typography.Text>
                    )}
                  </div>
                </div>
              </List.Item>
            )
          }}
        />
      </div>
    </Spin>
  )
}

export default TopListWidget
