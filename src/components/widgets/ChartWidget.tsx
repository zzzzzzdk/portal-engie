import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as echarts from 'echarts'
import { Spin, Empty } from 'antd'
import { WidgetConfig, Widget } from '@/types'
import { safeIntervalMs } from '@/constants/dashboard'
import { requestWidgetApi } from '@/utils/widgetApi'
import { getWidgetDefaultFieldValue } from '@/utils/widgetApiDefaults'

type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter'

interface ChartWidgetConfig extends WidgetConfig {
  chartType?: ChartType
  chartTitle?: string
  xAxisField?: string
  yAxisField?: string
  seriesField?: string
  smooth?: boolean
  showLegend?: boolean
  colors?: string[]
}

interface ChartWidgetProps {
  config?: ChartWidgetConfig
  widget?: Widget
}

const DEFAULT_DATA = {
  xAxis: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  series: [150, 230, 224, 218, 135, 147, 260],
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ config, widget }) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<any>(DEFAULT_DATA)

  const chartConfig = config as ChartWidgetConfig
  const apiEndpoint = chartConfig?.apiEndpoint
  const refreshInterval = chartConfig?.refreshInterval || 0
  const chartType = chartConfig?.chartType || 'line'
  const chartTitle = chartConfig?.chartTitle
  const xAxisField = chartConfig?.xAxisField || 'xAxis'
  const yAxisField = chartConfig?.yAxisField || 'series'
  const defaultDataField = getWidgetDefaultFieldValue('chart')
  const smooth = chartConfig?.smooth ?? true
  const showLegend = chartConfig?.showLegend ?? false

  const loadData = useCallback(async () => {
    if (!apiEndpoint) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await requestWidgetApi({
        endpoint: apiEndpoint,
        method: chartConfig?.apiMethod,
        headers: chartConfig?.apiHeaders,
        query: chartConfig?.apiQuery,
        body: chartConfig?.apiBody,
        dataField: chartConfig?.apiDataField || defaultDataField,
      })
      setChartData(result.data || result.raw || DEFAULT_DATA)
    } catch (err: any) {
      console.error('加载图表数据失败:', err)
      setError(err.message || '数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [
    apiEndpoint,
    chartConfig?.apiBody,
    chartConfig?.apiDataField,
    chartConfig?.apiHeaders,
    chartConfig?.apiMethod,
    chartConfig?.apiQuery,
    defaultDataField,
  ])

  useEffect(() => {
    if (apiEndpoint) {
      loadData()
    }
  }, [apiEndpoint, loadData])

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
    if (widget?.refreshCount && widget.refreshCount > 0 && apiEndpoint) {
      loadData()
    }
  }, [widget?.refreshCount, apiEndpoint, loadData])

  const generateOption = useCallback(() => {
    const xData = chartData?.[xAxisField] || chartData?.xAxis || DEFAULT_DATA.xAxis
    const yData = chartData?.[yAxisField] || chartData?.series || DEFAULT_DATA.series

    const baseOption: echarts.EChartsOption = {
      grid: {
        top: chartTitle ? 40 : 30,
        bottom: 30,
        left: 30,
        right: 30,
        containLabel: true,
      },
      tooltip: {
        trigger: chartType === 'pie' ? 'item' : 'axis',
      },
      legend: showLegend ? { show: true } : { show: false },
    }

    if (chartTitle) {
      baseOption.title = {
        text: chartTitle,
        left: 'center',
        textStyle: { fontSize: 14 },
      }
    }

    switch (chartType) {
      case 'pie':
        return {
          ...baseOption,
          series: [
            {
              type: 'pie',
              radius: ['40%', '70%'],
              data: Array.isArray(yData?.[0])
                ? yData
                : xData.map((name: string, index: number) => ({
                    name,
                    value: yData[index] || 0,
                  })),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)',
                },
              },
              label: {
                formatter: '{b}: {c} ({d}%)',
              },
            },
          ],
        }

      case 'bar':
        return {
          ...baseOption,
          xAxis: { type: 'category', data: xData },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'bar',
              data: yData,
              itemStyle: {
                borderRadius: [4, 4, 0, 0],
              },
            },
          ],
        }

      case 'area':
        return {
          ...baseOption,
          xAxis: { type: 'category', data: xData, boundaryGap: false },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'line',
              data: yData,
              smooth,
              areaStyle: { opacity: 0.3 },
            },
          ],
        }

      case 'scatter':
        return {
          ...baseOption,
          xAxis: { type: 'value' },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'scatter',
              data: yData,
              symbolSize: 10,
            },
          ],
        }

      case 'line':
      default:
        return {
          ...baseOption,
          xAxis: { type: 'category', data: xData },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'line',
              data: yData,
              smooth,
            },
          ],
        }
    }
  }, [chartData, chartTitle, chartType, showLegend, smooth, xAxisField, yAxisField])

  useEffect(() => {
    if (!chartRef.current || error) {
      return
    }

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    chartInstance.current.setOption(generateOption(), true)

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize()
    })
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [error, generateOption])

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [])

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={error} />
      </div>
    )
  }

  return (
    <Spin spinning={loading}>
      <div ref={chartRef} style={{ height: '100%', width: '100%', minHeight: '200px' }} />
    </Spin>
  )
}

export default ChartWidget
