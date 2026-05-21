import { getChartPresetDefinition } from './presets'
import type { ChartPreset, ChartWidgetConfig } from './types'

const DEFAULT_COLORS = [
  '#1677ff',
  '#36cfc9',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#22c55e',
]

const isPlainObject = (value: unknown): value is Record<string, any> =>
  Object.prototype.toString.call(value) === '[object Object]'

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const toPercent = (value: number, total: number) => {
  if (!total) {
    return 0
  }
  return Number(((value / total) * 100).toFixed(2))
}

const unique = <T,>(values: T[]) => Array.from(new Set(values))

const getPalette = (config: ChartWidgetConfig) =>
  Array.isArray(config.colors) && config.colors.length ? config.colors : DEFAULT_COLORS

const getLegendConfig = (config: ChartWidgetConfig) => {
  if (config.showLegend === false) {
    return { show: false }
  }

  switch (config.legendPosition) {
    case 'bottom':
      return { show: true, bottom: 0, left: 'center' }
    case 'left':
      return { show: true, left: 0, top: 'middle', orient: 'vertical' as const }
    case 'right':
      return { show: true, right: 0, top: 'middle', orient: 'vertical' as const }
    case 'top':
    default:
      return { show: true, top: 0, left: 'center' }
  }
}

const withLegendData = (config: ChartWidgetConfig, data?: string[]) => {
  const legend = getLegendConfig(config)
  if (legend.show === false || !data?.length) {
    return legend
  }

  return {
    ...legend,
    data,
  }
}

const getSingleSeriesLegendName = (config: ChartWidgetConfig, fallback: string) =>
  config.chartTitle?.trim() || fallback

const getLabelConfig = (config: ChartWidgetConfig) => ({
  show: config.showLabel === true,
  position: config.labelPosition || 'top',
})

const getPieLabelPosition = (config: ChartWidgetConfig) => {
  switch (config.labelPosition) {
    case 'inside':
    case 'center':
    case 'outer':
      return config.labelPosition
    default:
      return 'outer'
  }
}

const getTooltipConfig = (
  config: ChartWidgetConfig,
  options: Record<string, any> = {},
) => {
  if (config.showTooltip === false) {
    return { show: false }
  }

  return {
    appendToBody: true,
    confine: false,
    ...options,
  }
}

const getCategoryAxisConfig = (
  data: string[],
  config: ChartWidgetConfig,
  name?: string,
) => ({
  type: 'category' as const,
  data,
  name,
  axisLabel: config.showAxisLabel === false
    ? { show: false }
    : {
        show: true,
        ...(config.axisLabelRotate != null ? { rotate: config.axisLabelRotate } : {}),
      },
})

const getValueAxisConfig = (
  config: ChartWidgetConfig,
  options: Record<string, any> = {},
) => ({
  type: 'value' as const,
  splitLine: {
    show: config.showSplitLine !== false,
  },
  ...options,
})

const getMapItemStyle = (config: ChartWidgetConfig) => ({
  areaColor: config.mapAreaColor || '#f5f7fb',
  borderColor: config.mapBorderColor || '#d0d7e2',
})

const getMapEmphasisStyle = (config: ChartWidgetConfig) => ({
  areaColor: config.mapEmphasisAreaColor || '#dce8ff',
})

const formatMapTooltip = (params: { name?: string; value?: unknown; data?: { value?: unknown } }) => {
  const name = params?.name || '-'
  const rawValue = params?.data?.value ?? params?.value
  const value = Array.isArray(rawValue) ? rawValue[rawValue.length - 1] : rawValue
  const numericValue = Number(value)

  if (
    value == null
    || value === ''
    || (typeof value === 'number' && !Number.isFinite(value))
    || (typeof value === 'string' && value.trim() !== '' && !Number.isFinite(numericValue))
  ) {
    return name
  }

  return `${name}<br/>数值：${value}`
}

const zipObjectArrays = (rawData: Record<string, any>, fields: string[]) => {
  const validFields = fields.filter(Boolean)
  const lengths = validFields
    .map(field => (Array.isArray(rawData[field]) ? rawData[field].length : 0))
    .filter(length => length > 0)

  if (!lengths.length) {
    return []
  }

  const maxLength = Math.max(...lengths)

  return Array.from({ length: maxLength }, (_, index) =>
    validFields.reduce<Record<string, any>>((result, field) => {
      result[field] = Array.isArray(rawData[field]) ? rawData[field][index] : undefined
      return result
    }, {}),
  )
}

const normalizeRows = (rawData: unknown, fields: string[]) => {
  if (Array.isArray(rawData)) {
    return rawData.filter(item => isPlainObject(item))
  }

  if (isPlainObject(rawData)) {
    return zipObjectArrays(rawData, fields)
  }

  return []
}

const buildSingleCategorySeries = (
  rawData: unknown,
  config: ChartWidgetConfig,
) => {
  const categoryField = config.categoryField || 'name'
  const valueField = config.valueField || 'value'
  const rows = normalizeRows(rawData, [categoryField, valueField])

  return {
    rows,
    categories: rows.map(item => String(item?.[categoryField] ?? '')),
    values: rows.map(item => toNumber(item?.[valueField])),
  }
}

const buildGroupedSeries = (
  rawData: unknown,
  config: ChartWidgetConfig,
) => {
  const categoryField = config.categoryField || 'category'
  const seriesField = config.seriesField || 'series'
  const valueField = config.valueField || 'value'
  const valueField2 = config.valueField2 || 'value2'
  const rows = normalizeRows(rawData, [categoryField, seriesField, valueField, valueField2])
  const categories = unique(rows.map(item => String(item?.[categoryField] ?? '')))
  const seriesNames = unique(rows.map(item => String(item?.[seriesField] ?? '系列')))

  return {
    rows,
    categories,
    seriesNames,
    pickSeriesValues: (fieldName: string) =>
      seriesNames.map(seriesName => ({
        name: seriesName,
        data: categories.map(category => {
          const match = rows.find(item =>
            String(item?.[categoryField] ?? '') === category &&
            String(item?.[seriesField] ?? '') === seriesName,
          )
          return toNumber(match?.[fieldName])
        }),
      })),
  }
}

const buildPieRows = (rawData: unknown, config: ChartWidgetConfig) => {
  const nameField = config.nameField || 'name'
  const valueField = config.valueField || 'value'
  const rows = normalizeRows(rawData, [nameField, valueField])

  return rows.map(item => ({
    name: String(item?.[nameField] ?? ''),
    value: toNumber(item?.[valueField]),
    ...(isPlainObject(item?.itemStyle) ? { itemStyle: item.itemStyle } : {}),
    rawData: item,
  }))
}

const buildScatterRows = (rawData: unknown, config: ChartWidgetConfig) => {
  const xField = config.xField || 'x'
  const yField = config.yField || 'y'
  const nameField = config.nameField || 'name'
  const symbolSizeField = config.symbolSizeField || 'size'
  const rows = normalizeRows(rawData, [nameField, xField, yField, symbolSizeField])

  return rows.map(item => ({
    name: String(item?.[nameField] ?? ''),
    value: [toNumber(item?.[xField]), toNumber(item?.[yField]), toNumber(item?.[symbolSizeField], 14)],
    rawData: item,
  }))
}

const buildRadarData = (rawData: unknown, config: ChartWidgetConfig) => {
  if (isPlainObject(rawData)) {
    const indicators = Array.isArray(rawData[config.indicatorsField || 'indicators'])
      ? rawData[config.indicatorsField || 'indicators']
      : []
    const radarSeries = Array.isArray(rawData[config.radarSeriesField || 'series'])
      ? rawData[config.radarSeriesField || 'series']
      : []

    return {
      indicators: indicators.map((item: any) => ({
        name: String(item?.name ?? ''),
        max: toNumber(item?.max, 100),
      })),
      series: radarSeries.map((item: any, index: number) => ({
        name: String(item?.name ?? `系列 ${index + 1}`),
        value: Array.isArray(item?.value)
          ? item.value.map((value: unknown) => toNumber(value))
          : [],
      })),
    }
  }

  const rows = normalizeRows(rawData, ['name', config.valueField || 'value', 'max'])
  return {
    indicators: rows.map(item => ({
      name: String(item?.name ?? ''),
      max: toNumber(item?.max, 100),
    })),
    series: [
      {
        name: '当前值',
        value: rows.map(item => toNumber(item?.[config.valueField || 'value'])),
      },
    ],
  }
}

const buildMapRows = (rawData: unknown, config: ChartWidgetConfig) => {
  const nameField = config.nameField || 'name'
  const valueField = config.valueField || 'value'
  const rows = normalizeRows(rawData, [nameField, valueField])

  return rows.map(item => ({
    name: String(item?.[nameField] ?? ''),
    value: toNumber(item?.[valueField]),
    rawData: item,
  }))
}

const buildGaugeData = (rawData: unknown, config: ChartWidgetConfig) => {
  const nameField = config.nameField || 'name'
  const valueField = config.valueField || 'value'
  const maxField = config.valueField2 || 'max'
  const minField = config.valueField3 || 'min'
  const rows = normalizeRows(rawData, [nameField, valueField, maxField, minField])
  const source = rows[0] || (isPlainObject(rawData) ? rawData : {})
  const min = source?.[minField] != null
    ? toNumber(source[minField])
    : config.gaugeMin != null
      ? toNumber(config.gaugeMin, 0)
      : 0
  const rawMax = source?.[maxField] != null
    ? toNumber(source[maxField])
    : config.gaugeMax != null
      ? toNumber(config.gaugeMax, 100)
      : 100
  const max = rawMax > min ? rawMax : min + 100

  return {
    name: String(source?.[nameField] ?? config.chartTitle ?? ''),
    value: toNumber(source?.[valueField]),
    min,
    max,
  }
}

const buildFlowMapData = (rawData: unknown, config: ChartWidgetConfig) => {
  if (!isPlainObject(rawData)) {
    return {
      nodes: [],
      links: [],
      nodeMap: new Map<string, [number, number]>(),
    }
  }

  const nodesField = config.nodesField || 'nodes'
  const linksField = config.linksField || 'links'
  const nameField = config.nameField || 'name'
  const lngField = config.lngField || 'lng'
  const latField = config.latField || 'lat'
  const valueField = config.valueField || 'value'
  const sourceField = config.sourceField || 'source'
  const targetField = config.targetField || 'target'

  const nodes = Array.isArray(rawData[nodesField]) ? rawData[nodesField] : []
  const links = Array.isArray(rawData[linksField]) ? rawData[linksField] : []
  const sourceNames = new Set(
    links.map((link: any) => String(link?.[sourceField] ?? '')).filter(Boolean),
  )
  const targetNames = new Set(
    links.map((link: any) => String(link?.[targetField] ?? '')).filter(Boolean),
  )

  const nodeMap = new Map<string, [number, number]>()
  nodes.forEach((node: any) => {
    nodeMap.set(String(node?.[nameField] ?? ''), [toNumber(node?.[lngField]), toNumber(node?.[latField])])
  })

  return {
    nodes: nodes.map((node: any) => ({
      name: String(node?.[nameField] ?? ''),
      role: sourceNames.has(String(node?.[nameField] ?? '')) && targetNames.has(String(node?.[nameField] ?? ''))
        ? 'both'
        : sourceNames.has(String(node?.[nameField] ?? ''))
          ? 'source'
          : targetNames.has(String(node?.[nameField] ?? ''))
            ? 'target'
            : 'default',
      value: [
        toNumber(node?.[lngField]),
        toNumber(node?.[latField]),
        toNumber(node?.[valueField]),
      ],
      symbolSize: config.flowNodeSize || 18,
      rawData: node,
    })),
    links: links
      .map((link: any) => {
        const source = String(link?.[sourceField] ?? '')
        const target = String(link?.[targetField] ?? '')
        const from = nodeMap.get(source)
        const to = nodeMap.get(target)

        if (!from || !to) {
          return null
        }

        return {
          name: `${source}-${target}`,
          coords: [from, to],
          value: toNumber(link?.[valueField]),
          rawData: link,
        }
      })
      .filter(Boolean),
    nodeMap,
  }
}

const getVisualMapConfig = (rows: Array<{ value: number }>, config: ChartWidgetConfig) => {
  if (config.showVisualMap === false) {
    return undefined
  }

  const values = rows.map(item => item.value)
  if (!values.length) {
    return undefined
  }

  return {
    min: config.visualMapMin ?? Math.min(...values),
    max: config.visualMapMax ?? Math.max(...values),
    left: 16,
    bottom: 8,
    calculable: true,
    orient: 'horizontal' as const,
    inRange: {
      color: [
        config.visualMapStartColor || '#dce8ff',
        config.visualMapEndColor || '#1677ff',
      ],
    },
  }
}

const getBaseOption = (config: ChartWidgetConfig) => ({
  color: getPalette(config),
  animationDuration: 400,
  title: config.chartTitle || config.chartSubTitle
    ? {
        text: config.chartTitle || '',
        subtext: config.chartSubTitle || '',
        left: 'center',
        top: 0,
      }
    : undefined,
  tooltip: getTooltipConfig(config),
  legend: getLegendConfig(config),
  grid: {
    top: config.gridTop ?? 60,
    bottom: config.gridBottom ?? 60,
    left: config.gridLeft ?? '10%',
    right: config.gridRight ?? '10%',
    containLabel: true,
  },
})

export const normalizeGeoJson = (geoJson: unknown, nameProperty = 'name') => {
  if (!isPlainObject(geoJson) || !Array.isArray(geoJson.features)) {
    throw new Error('GeoJSON 格式无效')
  }

  if (!nameProperty || nameProperty === 'name') {
    return geoJson
  }

  return {
    ...geoJson,
    features: geoJson.features.map((feature: any) => ({
      ...feature,
      properties: {
        ...(feature?.properties || {}),
        name: feature?.properties?.[nameProperty] ?? feature?.properties?.name ?? '',
      },
    })),
  }
}

export const buildChartOption = ({
  preset,
  config,
  rawData,
  mapName,
}: {
  preset: ChartPreset
  config: ChartWidgetConfig
  rawData: unknown
  mapName?: string
}): Record<string, any> => {
  const baseOption = getBaseOption(config)
  const label = getLabelConfig(config)

  switch (preset) {
    case 'basic-line': {
      const { categories, values } = buildSingleCategorySeries(rawData, config)
      const legendName = getSingleSeriesLegendName(config, '数据')

      return {
        ...baseOption,
        legend: withLegendData(config, [legendName]),
        tooltip: getTooltipConfig(config, { trigger: 'axis' }),
        xAxis: getCategoryAxisConfig(categories, config, config.xAxisName),
        yAxis: getValueAxisConfig(config, { name: config.yAxisName }),
        series: [
          {
            name: legendName,
            type: 'line',
            data: values,
            smooth: config.smooth !== false,
            showSymbol: true,
            symbolSize: config.symbolSize || 10,
            lineStyle: { width: config.lineWidth || 3 },
            areaStyle: config.showArea ? { opacity: (config.areaOpacity ?? 20) / 100 } : undefined,
            label,
          },
        ],
      }
    }
    case 'basic-bar': {
      const { categories, values } = buildSingleCategorySeries(rawData, config)
      const legendName = getSingleSeriesLegendName(config, '数据')

      return {
        ...baseOption,
        legend: withLegendData(config, [legendName]),
        tooltip: getTooltipConfig(config, { trigger: 'axis' }),
        xAxis: getCategoryAxisConfig(categories, config, config.xAxisName),
        yAxis: getValueAxisConfig(config, { name: config.yAxisName }),
        series: [
          {
            name: legendName,
            type: 'bar',
            data: values,
            barWidth: config.barWidth || '45%',
            label,
            itemStyle: {
              borderRadius: config.borderRadius ?? 6,
            },
          },
        ],
      }
    }
    case 'stacked-bar':
    case 'percent-bar':
    case 'grouped-bar': {
      const grouped = buildGroupedSeries(rawData, config)
      const series = grouped.pickSeriesValues(config.valueField || 'value').map(item => ({
        type: 'bar',
        name: item.name,
        stack: preset === 'stacked-bar' || preset === 'percent-bar' ? 'total' : undefined,
        data:
          preset === 'percent-bar'
            ? item.data.map((value, index) => {
                const total = grouped.seriesNames.reduce((sum, currentName) => {
                  const currentSeries = grouped.pickSeriesValues(config.valueField || 'value')
                    .find(seriesItem => seriesItem.name === currentName)
                  return sum + toNumber(currentSeries?.data[index])
                }, 0)
                return toPercent(toNumber(value), total)
              })
            : item.data,
        barWidth: config.barWidth || (preset === 'grouped-bar' ? '36%' : '50%'),
        label: preset === 'percent-bar'
          ? {
              ...label,
              formatter: ({ value }: { value: number }) => `${value}%`,
            }
          : label,
        itemStyle: {
          borderRadius: config.borderRadius ?? 4,
        },
      }))

      return {
        ...baseOption,
        legend: withLegendData(config, grouped.seriesNames),
        tooltip: getTooltipConfig(config, { trigger: 'axis' }),
        xAxis: getCategoryAxisConfig(grouped.categories, config, config.xAxisName),
        yAxis: getValueAxisConfig(config, {
          name: config.yAxisName,
          axisLabel: preset === 'percent-bar'
            ? { formatter: '{value}%' }
            : undefined,
          max: preset === 'percent-bar' ? 100 : undefined,
        }),
        series,
      }
    }
    case 'basic-horizontal-bar':
    case 'stacked-horizontal-bar': {
      const grouped = preset === 'stacked-horizontal-bar'
        ? buildGroupedSeries(rawData, config)
        : null

      const single = preset === 'basic-horizontal-bar'
        ? buildSingleCategorySeries(rawData, config)
        : null
      const singleLegendName = getSingleSeriesLegendName(config, '数据')

      return {
        ...baseOption,
        legend: withLegendData(
          config,
          preset === 'basic-horizontal-bar' ? [singleLegendName] : grouped?.seriesNames,
        ),
        tooltip: getTooltipConfig(config, { trigger: 'axis' }),
        xAxis: getValueAxisConfig(config, { name: config.xAxisName }),
        yAxis: getCategoryAxisConfig(
          preset === 'basic-horizontal-bar' ? single?.categories || [] : grouped?.categories || [],
          config,
          config.yAxisName,
        ),
        series:
          preset === 'basic-horizontal-bar'
            ? [
                {
                  name: singleLegendName,
                  type: 'bar',
                  data: single?.values || [],
                  barWidth: config.barWidth || '52%',
                  label: { ...label, position: config.labelPosition || 'insideRight' },
                  itemStyle: {
                    borderRadius: config.borderRadius ?? 6,
                  },
                },
              ]
            : grouped?.pickSeriesValues(config.valueField || 'value').map(item => ({
                type: 'bar',
                name: item.name,
                stack: 'total',
                data: item.data,
                barWidth: config.barWidth || '58%',
                label: { ...label, position: config.labelPosition || 'insideRight' },
                itemStyle: {
                  borderRadius: config.borderRadius ?? 4,
                },
              })),
      }
    }
    case 'progress-bar': {
      const categoryField = config.categoryField || 'name'
      const valueField = config.valueField || 'value'
      const targetField = config.valueField2 || 'target'
      const rows = normalizeRows(rawData, [categoryField, valueField, targetField])
      const categories = rows.map(item => String(item?.[categoryField] ?? ''))
      const actualValues = rows.map(item => toNumber(item?.[valueField]))
      const targetValues = rows.map(item => toNumber(item?.[targetField], 100))
      const legendName = getSingleSeriesLegendName(config, '完成值')

      return {
        ...baseOption,
        legend: withLegendData(config, [legendName]),
        tooltip: getTooltipConfig(config, { trigger: 'axis' }),
        grid: {
          ...baseOption.grid,
          left: 8,
          right: 8,
        },
        xAxis: getValueAxisConfig(config, {
          name: config.xAxisName,
          max: (value: { max: number }) => Math.max(value.max, 100),
        }),
        yAxis: getCategoryAxisConfig(categories, config, config.yAxisName),
        series: [
          {
            type: 'bar',
            data: targetValues,
            barWidth: config.barWidth || '40%',
            barGap: '-100%',
            tooltip: {
              show: false,
            },
            itemStyle: {
              color: 'rgba(22, 119, 255, 0.12)',
              borderRadius: config.borderRadius ?? 99,
            },
            silent: true,
          },
          {
            name: legendName,
            type: 'bar',
            data: actualValues,
            barWidth: config.barWidth || '40%',
            label: {
              ...label,
              position: config.labelPosition || 'insideRight',
              formatter: ({ dataIndex }: { dataIndex: number }) => {
                const target = targetValues[dataIndex] || 100
                return `${toPercent(actualValues[dataIndex] || 0, target)}%`
              },
            },
            itemStyle: {
              borderRadius: config.borderRadius ?? 99,
            },
          },
        ],
      }
    }
    case 'gauge': {
      const gauge = buildGaugeData(rawData, config)
      const suffix = config.gaugeDetailSuffix || ''
      const axisLineWidth = config.gaugeAxisLineWidth || 12
      const progressWidth = config.gaugeProgressWidth || axisLineWidth

      return {
        ...baseOption,
        legend: { show: false },
        tooltip: getTooltipConfig(config, {
          formatter: ({ data }: { data?: { name?: string; value?: number } }) => {
            const name =
              data?.name || gauge.name || config.chartTitle || '仪表盘'
            const value = data?.value ?? gauge.value
            return `${name}<br/>数值：${value}${suffix}`
          },
        }),
        series: [
          {
            name: gauge.name || config.chartTitle || '仪表盘',
            type: 'gauge',
            min: gauge.min,
            max: gauge.max,
            startAngle: config.gaugeStartAngle ?? 210,
            endAngle: config.gaugeEndAngle ?? -30,
            splitNumber: config.gaugeSplitNumber ?? 10,
            itemStyle: {
              color: getPalette(config)[0],
            },
            progress: {
              show: config.gaugeShowProgress !== false,
              roundCap: true,
              width: progressWidth,
            },
            axisLine: {
              roundCap: true,
              lineStyle: {
                width: axisLineWidth,
                color: [[1, 'rgba(22, 119, 255, 0.12)']],
              },
            },
            axisTick: {
              show: config.showSplitLine !== false,
              distance: -axisLineWidth,
              splitNumber: 5,
            },
            splitLine: {
              show: config.showSplitLine !== false,
              distance: -axisLineWidth,
              length: Math.max(Math.round(axisLineWidth * 0.6), 8),
              lineStyle: {
                width: 2,
              },
            },
            axisLabel: {
              show: config.showAxisLabel !== false,
              distance: Math.max(axisLineWidth + 4, 22),
            },
            pointer: {
              show: config.gaugeShowPointer !== false,
              length: `${config.gaugePointerLength ?? 68}%`,
              width: config.gaugePointerWidth || 6,
            },
            anchor: {
              show: config.gaugeShowPointer !== false,
              size: Math.max((config.gaugePointerWidth || 6) + 4, 10),
              showAbove: true,
            },
            title: {
              show: config.showLabel !== false && Boolean(gauge.name),
              offsetCenter: [0, '82%'],
              fontSize: 14,
            },
            detail: {
              valueAnimation: true,
              offsetCenter: [0, '56%'],
              fontSize: config.gaugeDetailFontSize || 24,
              formatter: `{value}${suffix}`,
            },
            data: [
              {
                value: gauge.value,
                name: gauge.name,
              },
            ],
          },
        ],
      }
    }
    case 'pie':
    case 'donut': {
      const rows = buildPieRows(rawData, config)
      const innerRadius = preset === 'donut' ? `${config.donutInnerRadius ?? 52}%` : '0%'
      const outerRadius = preset === 'donut' ? `${config.donutOuterRadius ?? 76}%` : '72%'

      return {
        ...baseOption,
        legend: withLegendData(config, rows.map(item => item.name)),
        tooltip: getTooltipConfig(config, { trigger: 'item' }),
        series: [
          {
            type: 'pie',
            top: config.gridTop ?? 60,
            bottom: config.gridBottom ?? 60,
            left: config.gridLeft ?? '10%',
            right: config.gridRight ?? '10%',
            radius: [innerRadius, outerRadius],
            data: rows,
            label: {
              show: config.showLabel !== false,
              position: getPieLabelPosition(config),
              formatter: '{b}: {d}%',
            },
          },
        ],
      }
    }
    case 'radar': {
      const radar = buildRadarData(rawData, config)

      return {
        ...baseOption,
        legend: withLegendData(config, radar.series.map((item: { name: string }) => item.name)),
        tooltip: getTooltipConfig(config, { trigger: 'item' }),
        radar: {
          indicator: radar.indicators,
          radius: '62%',
        },
        series: [
          {
            type: 'radar',
            data: radar.series.map((item: { name: string; value: number[] }) => ({
              name: item.name,
              value: item.value,
              areaStyle: config.showArea ? { opacity: (config.areaOpacity ?? 18) / 100 } : undefined,
            })),
          },
        ],
      }
    }
    case 'area-map': {
      const rows = buildMapRows(rawData, config)
      return {
        ...baseOption,
        tooltip: getTooltipConfig(config, {
          trigger: 'item',
          formatter: formatMapTooltip,
        }),
        visualMap: getVisualMapConfig(rows, config),
        series: [
          {
            type: 'map',
            map: mapName,
            roam: config.mapRoam !== false,
            zoom: config.mapZoom || 1,
            label: {
              show: config.showLabel === true,
            },
            itemStyle: getMapItemStyle(config),
            emphasis: {
              itemStyle: getMapEmphasisStyle(config),
            },
            data: rows,
          },
        ],
      }
    }
    case 'flow-map': {
      const flowMap = buildFlowMapData(rawData, config)

      return {
        ...baseOption,
        tooltip: getTooltipConfig(config, { trigger: 'item' }),
        geo: {
          map: mapName,
          roam: config.mapRoam !== false,
          zoom: config.mapZoom || 1,
          label: {
            show: false,
          },
          itemStyle: getMapItemStyle(config),
          emphasis: {
            itemStyle: getMapEmphasisStyle(config),
          },
        },
        series: [
          {
            type: 'lines',
            coordinateSystem: 'geo',
            zlevel: 1,
            effect: {
              show: true,
              symbol: 'arrow',
              symbolSize: config.symbolSize || 12,
              trailLength: 0.18,
              color: config.flowLineColor || '#1677ff',
            },
            lineStyle: {
              color: config.flowLineColor || '#1677ff',
              width: config.lineWidth || 2,
              curveness: config.lineCurveness ?? 0.18,
              opacity: 0.75,
            },
            data: flowMap.links,
          },
          {
            type: 'effectScatter',
            coordinateSystem: 'geo',
            zlevel: 2,
            itemStyle: {
              color: config.flowNodeColor || '#1677ff',
            },
            label: {
              show: config.showLabel === true,
              formatter: '{b}',
              position: 'right',
            },
            data: flowMap.nodes,
          },
        ],
      }
    }
    case 'funnel': {
      const rows = buildPieRows(rawData, config)

      return {
        ...baseOption,
        legend: withLegendData(config, rows.map(item => item.name)),
        tooltip: getTooltipConfig(config, { trigger: 'item' }),
        series: [
          {
            type: 'funnel',
            sort: config.funnelSort || 'descending',
            data: rows,
            label: {
              show: config.showLabel !== false,
            },
          },
        ],
      }
    }
    case 'scatter': {
      const rows = buildScatterRows(rawData, config)
      const legendName = getSingleSeriesLegendName(config, '散点')

      return {
        ...baseOption,
        legend: withLegendData(config, [legendName]),
        tooltip: getTooltipConfig(config, { trigger: 'item' }),
        xAxis: getValueAxisConfig(config, { name: config.xAxisName }),
        yAxis: getValueAxisConfig(config, { name: config.yAxisName }),
        series: [
          {
            name: legendName,
            type: 'scatter',
            data: rows,
            symbolSize: (value: number[]) => value?.[2] || config.symbolSize || 14,
            label: {
              show: config.showLabel === true,
              formatter: ({ data }: { data: { name?: string } }) => data?.name || '',
              position: 'top',
            },
          },
        ],
      }
    }
    case 'dual-axis': {
      const categoryField = config.categoryField || 'name'
      const valueField = config.valueField || 'barValue'
      const valueField2 = config.valueField2 || 'lineValue'
      const rows = normalizeRows(rawData, [categoryField, valueField, valueField2])

      return {
        ...baseOption,
        tooltip: getTooltipConfig(config, { trigger: 'axis' }),
        xAxis: getCategoryAxisConfig(
          rows.map(item => String(item?.[categoryField] ?? '')),
          config,
          config.xAxisName,
        ),
        yAxis: [
          getValueAxisConfig(config, { name: config.yAxisName }),
          getValueAxisConfig(config, { name: config.yAxisName2 }),
        ],
        series: [
          {
            name: '柱状值',
            type: 'bar',
            data: rows.map(item => toNumber(item?.[valueField])),
            yAxisIndex: 0,
            barWidth: config.barWidth || '42%',
            label,
            itemStyle: {
              borderRadius: config.borderRadius ?? 6,
            },
          },
          {
            name: '折线值',
            type: 'line',
            data: rows.map(item => toNumber(item?.[valueField2])),
            yAxisIndex: 1,
            smooth: config.smooth !== false,
            symbolSize: config.symbolSize || 10,
            lineStyle: { width: config.lineWidth || 3 },
          },
        ],
      }
    }
    case 'grouped-dual-axis': {
      const grouped = buildGroupedSeries(rawData, config)
      const barSeries = grouped.pickSeriesValues(config.valueField || 'barValue').map(item => ({
        name: `${item.name}-柱`,
        type: 'bar',
        data: item.data,
        barWidth: config.barWidth || '32%',
        yAxisIndex: 0,
        itemStyle: {
          borderRadius: config.borderRadius ?? 6,
        },
      }))
      const lineSeries = grouped.pickSeriesValues(config.valueField2 || 'lineValue').map(item => ({
        name: `${item.name}-线`,
        type: 'line',
        data: item.data,
        yAxisIndex: 1,
        smooth: config.smooth !== false,
        symbolSize: config.symbolSize || 10,
        lineStyle: { width: config.lineWidth || 3 },
      }))

      return {
        ...baseOption,
        tooltip: getTooltipConfig(config, { trigger: 'axis' }),
        xAxis: getCategoryAxisConfig(grouped.categories, config, config.xAxisName),
        yAxis: [
          getValueAxisConfig(config, { name: config.yAxisName }),
          getValueAxisConfig(config, { name: config.yAxisName2 }),
        ],
        series: [...barSeries, ...lineSeries],
      }
    }
    default: {
      const fallbackPreset = getChartPresetDefinition(preset)
      return buildChartOption({
        preset: fallbackPreset.key,
        config: {
          ...config,
          chartPreset: fallbackPreset.key,
        },
        rawData,
        mapName,
      })
    }
  }
}
