import * as echarts from 'echarts/core'
import {
  BarChart,
  EffectScatterChart,
  FunnelChart,
  GaugeChart,
  LineChart,
  LinesChart,
  MapChart,
  PieChart,
  RadarChart,
  ScatterChart,
} from 'echarts/charts'
import {
  DatasetComponent,
  GeoComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
  VisualMapComponent,
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  VisualMapComponent,
  LegendComponent,
  GeoComponent,
  RadarComponent,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  FunnelChart,
  GaugeChart,
  MapChart,
  LinesChart,
  EffectScatterChart,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
])

export default echarts
