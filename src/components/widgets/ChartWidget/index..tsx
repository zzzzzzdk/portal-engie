import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Empty, Spin } from 'antd'
import type { Widget } from '@/types'
import { safeIntervalMs } from '@/constants/dashboard'
import echarts from '@/utils/echarts'
import { parseJsonConfig, requestWidgetApi } from '@/utils/widgetApi'
import { getWidgetDefaultFieldValue } from '@/utils/widgetApiDefaults'
import {
  createChartPresetConfig,
  getChartPresetDefinition,
  resolveChartLegacyPreset,
} from '../chart/presets'
import {
  buildChartOption,
  normalizeGeoJson,
} from '../chart/utils'
import type { ChartPreset, ChartWidgetConfig } from '../chart/types'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'
import { useWidgetRuntimeParams } from '@/hooks/useWidgetRuntimeParams'
import { usePortalRuntime } from '@/runtime/portal-runtime-context'
import './index.scss'

interface ChartWidgetProps {
  config?: ChartWidgetConfig
  widget?: Widget
}

const mergeRequestConfig = (
  baseValue: Record<string, any> | string | undefined,
  extraValue?: Record<string, any>,
) => {
  const baseConfig = parseJsonConfig(baseValue)

  if (!extraValue || !Object.keys(extraValue).length) {
    return baseConfig
  }

  if (baseConfig && typeof baseConfig === 'object' && !Array.isArray(baseConfig)) {
    return {
      ...baseConfig,
      ...extraValue,
    }
  }

  return extraValue
}

const isMapPreset = (preset: ChartPreset) => preset === 'area-map' || preset === 'flow-map'

const ChartWidget: React.FC<ChartWidgetProps> = ({ config, widget }) => {
  const { mode: runtimeMode } = usePortalRuntime()
  const isMobileRuntime = runtimeMode === 'mobile-runtime'
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const resizeTimerRef = useRef<number | null>(null)
  const mobileResizeTimersRef = useRef<number[]>([])
  const emitWidgetEvent = useWidgetEventEmitter(widget)
  const { runtimeParamsRef, setRuntimeParams, clearRuntimeParams } = useWidgetRuntimeParams()

  const chartConfig = useMemo(() => {
    const baseConfig = createChartPresetConfig(resolveChartLegacyPreset(config)) as ChartWidgetConfig

    return {
      ...baseConfig,
      ...config,
    }
  }, [config])

  const chartPreset = resolveChartLegacyPreset(chartConfig)
  const presetDefinition = getChartPresetDefinition(chartPreset)
  const defaultDataField = getWidgetDefaultFieldValue('chart')
  const mapName = useMemo(
    () => `${widget?.id || 'chart'}-${chartPreset}-map`,
    [chartPreset, widget?.id],
  )

  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<unknown>(
    chartConfig.staticData ?? presetDefinition.staticDataExample,
  )
  const [geoReady, setGeoReady] = useState(!isMapPreset(chartPreset))

  const resizeChart = useCallback(() => {
    if (resizeFrameRef.current != null) {
      cancelAnimationFrame(resizeFrameRef.current)
    }

    resizeFrameRef.current = requestAnimationFrame(() => {
      const chart = chartInstanceRef.current
      const container = containerRef.current

      if (!chart || !container) {
        return
      }

      const { clientWidth, clientHeight } = container
      if (clientWidth <= 0 || clientHeight <= 0) {
        return
      }

      chart.resize({
        width: clientWidth,
        height: clientHeight,
      })
    })
  }, [])

  const resetChartInstance = useCallback(() => {
    chartInstanceRef.current?.dispose()
    chartInstanceRef.current = null
  }, [])

  const loadData = useCallback(async () => {
    const isStaticDataSource = chartConfig.dataSource === 'static'
    const apiEndpoint = chartConfig.apiEndpoint?.trim()

    if (isStaticDataSource || !apiEndpoint) {
      setError(null)
      setChartData(chartConfig.staticData ?? presetDefinition.staticDataExample)
      return
    }

    setLoading(true)
    setError(null)
    setChartData(presetDefinition.staticDataExample)

    try {
      const result = await requestWidgetApi({
        endpoint: apiEndpoint,
        method: chartConfig.apiMethod,
        headers: chartConfig.apiHeaders,
        query: mergeRequestConfig(chartConfig.apiQuery),
          body: mergeRequestConfig(chartConfig.apiBody),
          dataField: chartConfig.apiDataField || defaultDataField,
          timeout: chartConfig?.timeout,
          runtimeParams: runtimeParamsRef.current,
        })

      const nextData = result.data ?? result.raw ?? presetDefinition.staticDataExample
      setChartData(nextData)
      emitWidgetEvent('chart.dataLoaded', { data: nextData, raw: result.raw, total: result.pagination.total }, 'system')
    } catch (err: any) {
      console.error('加载图表数据失败:', err)
      const message = err?.message || '图表数据加载失败'
      setError(message)
      emitWidgetEvent('chart.dataError', { message, error: err }, 'system')
    } finally {
      setLoading(false)
    }
  }, [
    chartConfig,
    defaultDataField,
    emitWidgetEvent,
    presetDefinition.staticDataExample,
    runtimeParamsRef,
  ])

  useWidgetEventInputs(widget, {
    reload: () => {
      void loadData()
    },
    setParams: (params, _message, input) => {
      setRuntimeParams(params, 'replace')
    },
    setParamsAndReload: (params, _message, input) => {
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
    if (chartConfig.refreshInterval && chartConfig.refreshInterval > 0 && chartConfig.apiEndpoint) {
      intervalRef.current = setInterval(() => {
        void loadData()
      }, safeIntervalMs(chartConfig.refreshInterval))
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [chartConfig.apiEndpoint, chartConfig.refreshInterval, loadData])

  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      void loadData()
    }
  }, [loadData, widget?.refreshCount])

  useEffect(() => {
    if (!isMapPreset(chartPreset)) {
      setGeoReady(true)
      return
    }

    const source = chartConfig.geoJsonSource || 'inline'
    const nameProperty = chartConfig.geoJsonNameProperty || 'name'
    let cancelled = false

    const registerGeoJson = async () => {
      setGeoLoading(true)
      setError(null)

      try {
        let geoJson: unknown

        if (source === 'url') {
          if (!chartConfig.geoJsonUrl?.trim()) {
            throw new Error('请配�?GeoJSON 地址')
          }

          const response = await axios.get(chartConfig.geoJsonUrl.trim())
          console.log(response)
          geoJson = response.data
        } else {
          if (!chartConfig.geoJsonText?.trim()) {
            throw new Error('请粘�?GeoJSON 内容')
          }

          geoJson = JSON.parse(chartConfig.geoJsonText)
        }

        const normalizedGeoJson = normalizeGeoJson(geoJson, nameProperty)

        if (cancelled) {
          return
        }

        echarts.registerMap(mapName, normalizedGeoJson as any)
        setGeoReady(true)
      } catch (err: any) {
        if (!cancelled) {
          setGeoReady(false)
          setError(err?.message || 'GeoJSON 加载失败')
        }
      } finally {
        if (!cancelled) {
          setGeoLoading(false)
        }
      }
    }

    void registerGeoJson()

    return () => {
      cancelled = true
    }
  }, [
    chartConfig.geoJsonNameProperty,
    chartConfig.geoJsonSource,
    chartConfig.geoJsonText,
    chartConfig.geoJsonUrl,
    chartPreset,
    mapName,
  ])

  const chartOption = useMemo(() => {
    if (isMapPreset(chartPreset) && !geoReady) {
      return null
    }

    return buildChartOption({
      preset: chartPreset,
      config: chartConfig,
      rawData: chartData,
      mapName,
    })
  }, [chartConfig, chartData, chartPreset, geoReady, mapName])

  useEffect(() => {
    const chartDom = chartRef.current

    if (!chartDom || !chartOption || error) {
      resetChartInstance()
      return
    }

    if (chartInstanceRef.current?.getDom() !== chartDom) {
      resetChartInstance()
    }

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartDom)
    }

    const chart = chartInstanceRef.current
    chart.setOption(chartOption, true)
    chart.off('click')
    chart.on('click', (params: any) => {
      const payload = {
        name: params?.name,
        value: params?.value,
        seriesName: params?.seriesName,
        data: params?.data,
        dataIndex: params?.dataIndex,
      }
      emitWidgetEvent('chart.click', payload, 'click')

      if (chartPreset === 'pie' || chartPreset === 'donut') {
        emitWidgetEvent('chart.sliceClick', payload, 'click')
      } else if (chartPreset === 'area-map') {
        emitWidgetEvent('chart.regionClick', payload, 'click')
      } else if (chartPreset !== 'flow-map') {
        emitWidgetEvent('chart.axisClick', {
          ...payload,
          axisValue: params?.name,
        }, 'click')
      }
    })
    resizeChart()

    const resizeObserver = new ResizeObserver(() => {
      resizeChart()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    const handleWindowResize = () => {
      resizeChart()
    }
    window.addEventListener('resize', handleWindowResize)

    if (resizeTimerRef.current != null) {
      window.clearTimeout(resizeTimerRef.current)
    }
    resizeTimerRef.current = window.setTimeout(() => {
      resizeChart()
    }, 120)

    if (isMobileRuntime) {
      mobileResizeTimersRef.current.forEach(timer => window.clearTimeout(timer))
      mobileResizeTimersRef.current = [80, 240, 600].map(delay =>
        window.setTimeout(() => {
          resizeChart()
        }, delay),
      )
    }

    return () => {
      window.removeEventListener('resize', handleWindowResize)
      resizeObserver.disconnect()

      if (resizeTimerRef.current != null) {
        window.clearTimeout(resizeTimerRef.current)
        resizeTimerRef.current = null
      }
      mobileResizeTimersRef.current.forEach(timer => window.clearTimeout(timer))
      mobileResizeTimersRef.current = []
      chart.off('click')
    }
  }, [chartOption, chartPreset, emitWidgetEvent, error, isMobileRuntime, resetChartInstance, resizeChart])

  useEffect(() => () => {
    if (resizeFrameRef.current != null) {
      cancelAnimationFrame(resizeFrameRef.current)
      resizeFrameRef.current = null
    }

    if (resizeTimerRef.current != null) {
      window.clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = null
    }

    mobileResizeTimersRef.current.forEach(timer => window.clearTimeout(timer))
    mobileResizeTimersRef.current = []

    resetChartInstance()
  }, [resetChartInstance])

  if (error) {
    return (
      <div className="chart-widget chart-widget--state">
        <Empty description={error} />
      </div>
    )
  }

  if (isMapPreset(chartPreset) && !geoReady) {
    return (
      <div className="chart-widget chart-widget--state">
        <Spin spinning={geoLoading}>
          <Empty description="请先配置 GeoJSON 区域数据" />
        </Spin>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`chart-widget${isMobileRuntime ? ' chart-widget--mobile' : ''}`}>
      {(loading || geoLoading) ? (
        <div className="chart-widget__loading">
          <Spin spinning />
        </div>
      ) : null}
      <div ref={chartRef} className="chart-widget__canvas" />
    </div>
  )
}

export default ChartWidget
