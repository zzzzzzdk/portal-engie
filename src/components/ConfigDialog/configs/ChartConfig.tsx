import React from 'react'
import { ColorPicker, Divider, Form, Input, InputNumber, Select, Switch } from 'antd'
import type { ChartPreset } from '@/components/widgets/chart/types'
import { WidgetConfigProps } from './types'

const PIE_LIKE_PRESETS: ChartPreset[] = ['pie', 'donut']
const BAR_PRESETS: ChartPreset[] = [
  'basic-bar',
  'stacked-bar',
  'percent-bar',
  'grouped-bar',
  'basic-horizontal-bar',
  'stacked-horizontal-bar',
  'progress-bar',
]
const CATEGORY_AXIS_PRESETS: ChartPreset[] = [
  'basic-line',
  ...BAR_PRESETS,
  'dual-axis',
  'grouped-dual-axis',
]
const DUAL_AXIS_PRESETS: ChartPreset[] = ['dual-axis', 'grouped-dual-axis']
const MAP_PRESETS: ChartPreset[] = ['area-map', 'flow-map']
const PIE_LABEL_POSITION_OPTIONS = [
  { label: '外侧', value: 'outer' },
  { label: '内部', value: 'inside' },
  { label: '中心', value: 'center' },
]
const DEFAULT_LABEL_POSITION_OPTIONS = [
  { label: '顶部', value: 'top' },
  { label: '左侧', value: 'left' },
  { label: '右侧', value: 'right' },
  { label: '底部', value: 'bottom' },
  { label: '内部', value: 'inside' },
  { label: '内部左侧', value: 'insideLeft' },
  { label: '内部右侧', value: 'insideRight' },
  { label: '内部顶部', value: 'insideTop' },
  { label: '内部底部', value: 'insideBottom' },
  { label: '内部左上', value: 'insideTopLeft' },
  { label: '内部左下', value: 'insideBottomLeft' },
  { label: '内部右上', value: 'insideTopRight' },
  { label: '内部右下', value: 'insideBottomRight' },
]

const ChartConfig: React.FC<WidgetConfigProps> = () => {
  const form = Form.useFormInstance()
  const chartPreset = (Form.useWatch('chartPreset', form) || 'basic-line') as ChartPreset
  const showLegendEnabled = Form.useWatch('showLegend', form)
  const showLabelEnabled = Form.useWatch('showLabel', form)
  const showAxisLabel = Form.useWatch('showAxisLabel', form)
  const showAreaEnabled = Form.useWatch('showArea', form)
  const showGaugePointer = Form.useWatch('gaugeShowPointer', form)
  const isGaugePreset = chartPreset === 'gauge'

  const showLegend = !MAP_PRESETS.includes(chartPreset) && !isGaugePreset
  const showLabel = chartPreset !== 'radar'
  const showLabelPosition = [
    'basic-line',
    ...BAR_PRESETS,
    'dual-axis',
    'grouped-dual-axis',
    ...PIE_LIKE_PRESETS,
  ].includes(chartPreset)
  const showLegendPosition = showLegend && showLegendEnabled === true
  const showLabelPositionField = showLabelPosition && showLabelEnabled === true

  const showLineStyle = ['basic-line', 'dual-axis', 'grouped-dual-axis', 'flow-map'].includes(chartPreset)
  const showLineSmooth = ['basic-line', 'dual-axis', 'grouped-dual-axis'].includes(chartPreset)
  const showLineArea = ['basic-line', 'radar'].includes(chartPreset)
  const showBarStyle = [...BAR_PRESETS, 'dual-axis', 'grouped-dual-axis'].includes(chartPreset)
  const showDonutStyle = chartPreset === 'donut'
  const showScatterStyle = chartPreset === 'scatter'
  const showFlowStyle = chartPreset === 'flow-map'
  const showGaugeStyle = isGaugePreset
  const showMapBaseStyle = MAP_PRESETS.includes(chartPreset)
  const showFlowMapAreaColor = chartPreset === 'flow-map'
  const showAreaMapVisualMap = chartPreset === 'area-map'
  const showAxisConfig = [...CATEGORY_AXIS_PRESETS, 'scatter'].includes(chartPreset)
  const showGridConfig = [...CATEGORY_AXIS_PRESETS, 'scatter', ...PIE_LIKE_PRESETS].includes(chartPreset)
  const showAxisLabelSwitch = CATEGORY_AXIS_PRESETS.includes(chartPreset)
  const showAxisRotate = CATEGORY_AXIS_PRESETS.includes(chartPreset) && showAxisLabel !== false
  const showDualAxisConfig = DUAL_AXIS_PRESETS.includes(chartPreset)
  const showFunnelSort = chartPreset === 'funnel'
  const borderRadiusMax = chartPreset === 'progress-bar' ? 999 : 40
  const labelPositionOptions = PIE_LIKE_PRESETS.includes(chartPreset)
    ? PIE_LABEL_POSITION_OPTIONS
    : DEFAULT_LABEL_POSITION_OPTIONS
  const symbolSizeLabel = showScatterStyle
    ? '点大小'
    : showFlowStyle
      ? '箭头大小'
      : '拐点大小'

  return (
    <>
      <Form.Item name="chartPreset" hidden>
        <Input />
      </Form.Item>

      <Divider>通用属性</Divider>
      <div className="form-row-2">
        <Form.Item name="chartTitle" label="图内标题">
          <Input placeholder="可选" />
        </Form.Item>
        <Form.Item name="chartSubTitle" label="图内副标题">
          <Input placeholder="可选" />
        </Form.Item>
      </div>

      <div className="form-row-3">
        {showLegend ? (
          <Form.Item name="showLegend" label="显示图例" valuePropName="checked">
            <Switch />
          </Form.Item>
        ) : null}
        <Form.Item name="showTooltip" label="显示提示" valuePropName="checked">
          <Switch />
        </Form.Item>
        {showLabel ? (
          <Form.Item name="showLabel" label="显示标签" valuePropName="checked">
            <Switch />
          </Form.Item>
        ) : null}
      </div>

      {(showLegendPosition || showLabelPositionField) && (
        <div className="form-row-2">
          {showLegendPosition ? (
            <Form.Item name="legendPosition" label="图例位置" initialValue="top">
              <Select
                allowClear
                options={[
                  { label: '顶部', value: 'top' },
                  { label: '底部', value: 'bottom' },
                  { label: '左侧', value: 'left' },
                  { label: '右侧', value: 'right' },
                ]}
              />
            </Form.Item>
          ) : null}
          {showLabelPositionField ? (
            <Form.Item name="labelPosition" label="标签位置">
              <Select
                allowClear
                options={labelPositionOptions}
              />
            </Form.Item>
          ) : null}
        </div>
      )}

      {(showLineStyle ||
        showLineSmooth ||
        showLineArea ||
        showBarStyle ||
        showDonutStyle ||
        showGaugeStyle ||
        showFlowStyle ||
        showMapBaseStyle ||
        showAreaMapVisualMap) && <Divider>样式属性</Divider>}

      {(showLineStyle || showBarStyle) && (
        <div className="form-row-3">
          {showLineStyle ? (
            <Form.Item name="lineWidth" label="线宽">
              <InputNumber min={1} max={12} style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
          {(showFlowStyle ||
            ['basic-line', 'dual-axis', 'grouped-dual-axis'].includes(chartPreset)) ? (
            <Form.Item name="symbolSize" label={symbolSizeLabel}>
              <InputNumber min={4} max={40} style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
          {showBarStyle ? (
            <Form.Item name="borderRadius" label="圆角">
              <InputNumber min={0} max={borderRadiusMax} style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
        </div>
      )}

      {showFlowStyle && (
        <div className="form-row-3">
          <Form.Item name="flowNodeSize" label="节点大小">
            <InputNumber min={4} max={60} style={{ width: '100%' }} />
          </Form.Item>
          <div />
          <div />
        </div>
      )}

      {showGaugeStyle && (
        <>
          <div className="empty-hint" style={{ marginBottom: 12 }}>
            {'若数据中提供了最小值、最大值，则优先使用数据；仅在数据未提供时，才会回退到下方配置值。'}
          </div>
          <div className="form-row-3">
            <Form.Item
              name="gaugeMin"
              label={'最小值'}
              dependencies={['gaugeMax']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const maxValue = getFieldValue('gaugeMax')
                    if (
                      value == null
                      || maxValue == null
                      || Number(value) <= Number(maxValue)
                    ) {
                      return Promise.resolve()
                    }

                    return Promise.reject(new Error('最小值不能大于最大值'))
                  },
                }),
              ]}
            >
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="gaugeMax"
              label={'最大值'}
              dependencies={['gaugeMin']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const minValue = getFieldValue('gaugeMin')
                    if (
                      value == null
                      || minValue == null
                      || Number(value) >= Number(minValue)
                    ) {
                      return Promise.resolve()
                    }

                    return Promise.reject(new Error('最大值不能小于最小值'))
                  },
                }),
              ]}
            >
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="gaugeSplitNumber" label={'分段数'}>
              <InputNumber min={1} max={20} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className="form-row-3">
            <Form.Item name="gaugeStartAngle" label={'起始角度'}>
              <InputNumber min={-360} max={360} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="gaugeEndAngle" label={'结束角度'}>
              <InputNumber min={-360} max={360} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="showAxisLabel" label={'显示刻度值'} valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <div className="form-row-3">
            <Form.Item name="gaugeAxisLineWidth" label={'刻度环宽度'}>
              <InputNumber min={1} max={40} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="gaugeProgressWidth" label={'进度宽度'}>
              <InputNumber min={1} max={40} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="gaugeDetailFontSize" label={'数值字号'}>
              <InputNumber min={12} max={60} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className="form-row-3">
            <Form.Item name="showSplitLine" label={'显示分隔线'} valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="gaugeShowProgress" label={'显示进度条'} valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="gaugeShowPointer" label={'显示指针'} valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <div className="form-row-3">
            <Form.Item name="gaugeDetailSuffix" label={'数值后缀'}>
              <Input placeholder={'例如 %'} />
            </Form.Item>
            {showGaugePointer !== false ? (
              <Form.Item name="gaugePointerWidth" label={'指针宽度'}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
            ) : (
              <div />
            )}
            {showGaugePointer !== false ? (
              <Form.Item name="gaugePointerLength" label={'指针长度'}>
                <InputNumber min={10} max={100} addonAfter="%" style={{ width: '100%' }} />
              </Form.Item>
            ) : (
              <div />
            )}
          </div>
        </>
      )}

      {(showBarStyle || showLineSmooth || showLineArea) && (
        <div className="form-row-3">
          {showBarStyle ? (
            <Form.Item name="barWidth" label="柱宽">
              <Input placeholder="例如 45% 或 24" />
            </Form.Item>
          ) : null}
          {showLineSmooth ? (
            <Form.Item name="smooth" label="平滑曲线" valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : null}
          {showLineArea ? (
            <Form.Item name="showArea" label="显示面积" valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : null}
        </div>
      )}

      {((showLineArea && showAreaEnabled) || showDonutStyle || showFlowStyle) && (
        <div className="form-row-3">
          {showLineArea && showAreaEnabled ? (
            <Form.Item name="areaOpacity" label="面积透明度">
              <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
          {showDonutStyle ? (
            <Form.Item
              name="donutInnerRadius"
              label="环图内径"
              dependencies={['donutOuterRadius']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const outerRadius = getFieldValue('donutOuterRadius')
                    if (
                      value == null
                      || outerRadius == null
                      || Number(value) < Number(outerRadius)
                    ) {
                      return Promise.resolve()
                    }

                    return Promise.reject(new Error('环圈内径必须小于环圈外径'))
                  },
                }),
              ]}
            >
              <InputNumber min={0} max={90} addonAfter="%" style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
          {showDonutStyle ? (
            <Form.Item
              name="donutOuterRadius"
              label="环图外径"
              dependencies={['donutInnerRadius']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const innerRadius = getFieldValue('donutInnerRadius')
                    if (
                      value == null
                      || innerRadius == null
                      || Number(value) > Number(innerRadius)
                    ) {
                      return Promise.resolve()
                    }

                    return Promise.reject(new Error('环圈外径必须大于环圈内径'))
                  },
                }),
              ]}
            >
              <InputNumber min={10} max={100} addonAfter="%" style={{ width: '100%' }} />
            </Form.Item>
          ) : showFlowStyle ? (
            <Form.Item name="lineCurveness" label="连线弯曲度">
              <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
        </div>
      )}

      {showMapBaseStyle && (
        <>
          <div className="form-row-3">
            <Form.Item name="mapZoom" label="地图缩放">
              <InputNumber min={0.2} max={10} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="mapRoam" label="地图缩放拖拽" valuePropName="checked">
              <Switch />
            </Form.Item>
            <div />
          </div>

          <Divider>地图样式</Divider>
          <div className={'form-row-2'}>
            {showFlowMapAreaColor ? (
              <Form.Item name="mapAreaColor" label="区域底色">
                <ColorPicker showText allowClear />
              </Form.Item>
            ) : null}
            <Form.Item name="mapBorderColor" label="边界颜色">
              <ColorPicker showText allowClear />
            </Form.Item>

          </div>
          <div className="form-row-2">
            <Form.Item name="mapEmphasisAreaColor" label="高亮区域色">
              <ColorPicker showText allowClear />
            </Form.Item>
            {showFlowMapAreaColor ? (
              <Form.Item name="flowLineColor" label="流向线颜色">
                <ColorPicker showText allowClear />
              </Form.Item>
            ) : null}
          </div>
          {showFlowMapAreaColor ? (
            <div className="form-row-2">
              <Form.Item name="flowNodeColor" label="节点颜色">
                <ColorPicker showText allowClear />
              </Form.Item>
              <div />
            </div>
          ) : null}
        </>
      )}

      {showAreaMapVisualMap && (
        <>
          <div className="form-row-3">
            <Form.Item name="showVisualMap" label="显示色阶" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item
              name="visualMapMin"
              label="色阶最小值"
              dependencies={['visualMapMax']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const maxValue = getFieldValue('visualMapMax')
                    if (
                      value == null
                      || maxValue == null
                      || Number(value) < Number(maxValue)
                    ) {
                      return Promise.resolve()
                    }

                    return Promise.reject(new Error('色阶最小值必须小于色阶最大值'))
                  },
                }),
              ]}
            >
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="visualMapMax"
              label="色阶最大值"
              dependencies={['visualMapMin']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const minValue = getFieldValue('visualMapMin')
                    if (
                      value == null
                      || minValue == null
                      || Number(value) > Number(minValue)
                    ) {
                      return Promise.resolve()
                    }

                    return Promise.reject(new Error('色阶最大值必须大于色阶最小值'))
                  },
                }),
              ]}
            >
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div className="form-row-2">
            <Form.Item name="visualMapStartColor" label="色阶起始色">
              <ColorPicker showText allowClear />
            </Form.Item>
            <Form.Item name="visualMapEndColor" label="色阶结束色">
              <ColorPicker showText allowClear />
            </Form.Item>
          </div>
        </>
      )}

      {showAxisConfig && (
        <>
          <Divider>坐标轴</Divider>
          <div className="form-row-3">
            <Form.Item name="xAxisName" label="X 轴名称">
              <Input placeholder="可选" />
            </Form.Item>
            <Form.Item name="yAxisName" label="Y 轴名称">
              <Input placeholder="可选" />
            </Form.Item>

          </div>
          <div className="form-row-2">
            {showAxisLabelSwitch ? (
              <Form.Item name="showAxisLabel" label="显示类目标签" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            ) : null}
            {showAxisRotate ? (
              <Form.Item name="axisLabelRotate" label="类目轴旋转">
                <InputNumber min={0} max={90} addonAfter="°" style={{ width: '100%' }} />
              </Form.Item>
            ) : null}

          </div>
          <div className="form-row-2">
            <Form.Item name="showSplitLine" label="显示网格线" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            {showDualAxisConfig ? (
              <Form.Item name="yAxisName2" label="右侧 Y 轴名称">
                <Input placeholder="可选" />
              </Form.Item>
            ) : null}
          </div>
        </>
      )}

      {showGridConfig && (
        <>
          <Divider>图表边距</Divider>
          <div className="form-row-2">
            <Form.Item name="gridTop" label="上边距" initialValue={60}>
              <InputNumber min={0} max={300} addonAfter="px" placeholder="60" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="gridBottom" label="下边距" initialValue={60}>
              <InputNumber min={0} max={300} addonAfter="px" placeholder="60" style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div className="form-row-2">
            <Form.Item name="gridLeft" label="左边距" initialValue="10%">
              <Input placeholder="10%" />
            </Form.Item>
            <Form.Item name="gridRight" label="右边距" initialValue="10%">
              <Input placeholder="10%" />
            </Form.Item>
          </div>
        </>
      )}

      {showFunnelSort && (
        <>
          <Divider>漏斗属性</Divider>
          <Form.Item name="funnelSort" label="漏斗排序">
            <Select
              options={[
                { label: '从大到小', value: 'descending' },
                { label: '从小到大', value: 'ascending' },
              ]}
            />
          </Form.Item>
        </>
      )}
    </>
  )
}

export default ChartConfig
