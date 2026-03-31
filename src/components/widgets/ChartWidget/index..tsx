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
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const resizeTimerRef = useRef<number | null>(null)

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

    try {
      const result = await requestWidgetApi({
        endpoint: apiEndpoint,
        method: chartConfig.apiMethod,
        headers: chartConfig.apiHeaders,
        query: mergeRequestConfig(chartConfig.apiQuery),
        body: mergeRequestConfig(chartConfig.apiBody),
        dataField: chartConfig.apiDataField || defaultDataField,
      })

      setChartData(result.data ?? result.raw ?? presetDefinition.staticDataExample)
    } catch (err: any) {
      console.error('加载图表数据失败:', err)
      setError(err?.message || '图表数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [
    chartConfig,
    defaultDataField,
    presetDefinition.staticDataExample,
  ])

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
            throw new Error('请配置 GeoJSON 地址')
          }

          const response = await axios.get(chartConfig.geoJsonUrl.trim())
          console.log(response)
          geoJson = response.data
        } else {
          if (!chartConfig.geoJsonText?.trim()) {
            throw new Error('请粘贴 GeoJSON 内容')
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
    if (!chartRef.current || !chartOption || error) {
      return
    }

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current)
    }

    const chart = chartInstanceRef.current
    chart.setOption(chartOption, true)
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

    return () => {
      window.removeEventListener('resize', handleWindowResize)
      resizeObserver.disconnect()

      if (resizeTimerRef.current != null) {
        window.clearTimeout(resizeTimerRef.current)
        resizeTimerRef.current = null
      }
    }
  }, [chartOption, error, resizeChart])

  useEffect(() => () => {
    if (resizeFrameRef.current != null) {
      cancelAnimationFrame(resizeFrameRef.current)
      resizeFrameRef.current = null
    }

    if (resizeTimerRef.current != null) {
      window.clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = null
    }

    chartInstanceRef.current?.dispose()
    chartInstanceRef.current = null
  }, [])

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
    <div ref={containerRef} className="chart-widget">
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
