import type { WidgetConfig } from '@/types'

export type ChartPreset =
  | 'basic-line'
  | 'basic-bar'
  | 'stacked-bar'
  | 'percent-bar'
  | 'grouped-bar'
  | 'basic-horizontal-bar'
  | 'stacked-horizontal-bar'
  | 'progress-bar'
  | 'gauge'
  | 'pie'
  | 'donut'
  | 'radar'
  | 'area-map'
  | 'flow-map'
  | 'funnel'
  | 'scatter'
  | 'dual-axis'
  | 'grouped-dual-axis'

export interface ChartWidgetConfig extends WidgetConfig {
  chartPreset?: ChartPreset
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  chartTitle?: string
  chartSubTitle?: string
  gridTop?: number | string
  gridBottom?: number | string
  gridLeft?: number | string
  gridRight?: number | string
  categoryField?: string
  nameField?: string
  valueField?: string
  valueField2?: string
  valueField3?: string
  seriesField?: string
  xField?: string
  yField?: string
  symbolSizeField?: string
  nodesField?: string
  linksField?: string
  sourceField?: string
  targetField?: string
  lngField?: string
  latField?: string
  indicatorsField?: string
  radarSeriesField?: string
  smooth?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  showLabel?: boolean
  showArea?: boolean
  areaOpacity?: number
  lineWidth?: number
  barWidth?: number | string
  borderRadius?: number
  symbolSize?: number
  flowNodeSize?: number
  lineCurveness?: number
  donutInnerRadius?: number
  donutOuterRadius?: number
  gaugeMin?: number
  gaugeMax?: number
  gaugeStartAngle?: number
  gaugeEndAngle?: number
  gaugeSplitNumber?: number
  gaugeAxisLineWidth?: number
  gaugeProgressWidth?: number
  gaugePointerWidth?: number
  gaugePointerLength?: number
  gaugeShowPointer?: boolean
  gaugeShowProgress?: boolean
  gaugeDetailSuffix?: string
  gaugeDetailFontSize?: number
  xAxisName?: string
  yAxisName?: string
  yAxisName2?: string
  showAxisLabel?: boolean
  axisLabelRotate?: number
  showSplitLine?: boolean
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  labelPosition?:
    | 'top'
    | 'left'
    | 'right'
    | 'bottom'
    | 'outer'
    | 'center'
    | 'inside'
    | 'insideLeft'
    | 'insideRight'
    | 'insideTop'
    | 'insideBottom'
    | 'insideTopLeft'
    | 'insideBottomLeft'
    | 'insideTopRight'
    | 'insideBottomRight'
  funnelSort?: 'ascending' | 'descending'
  colors?: string[]
  staticData?: unknown
  dataSource?: 'customApi' | 'static' | 'dataSource'
  geoJsonSource?: 'inline' | 'url'
  geoJsonText?: string
  geoJsonUrl?: string
  geoJsonNameProperty?: string
  mapZoom?: number
  mapRoam?: boolean
  mapAreaColor?: string
  mapBorderColor?: string
  mapEmphasisAreaColor?: string
  flowLineColor?: string
  flowNodeColor?: string
  showVisualMap?: boolean
  visualMapMin?: number
  visualMapMax?: number
  visualMapStartColor?: string
  visualMapEndColor?: string
}

export interface ChartPresetDefinition {
  key: ChartPreset
  title: string
  description: string
  drawerCategory: string
  defaultLayout?: {
    w: number
    h: number
    minW?: number
    minH?: number
  }
  defaults: Partial<ChartWidgetConfig>
  staticDataExample: unknown
}
