import React from 'react'
import { Button, Divider, Form, Input, Radio } from 'antd'
import type { ChartPreset } from '@/components/widgets/chart/types'
import { DEFAULT_MAP_GEOJSON_TEMPLATE } from '@/components/widgets/chart/presets'
import { WidgetConfigProps } from './types'

const validateGeoJson = (_: unknown, value?: string) => {
  if (!value?.trim()) {
    return Promise.reject(new Error('请输入 GeoJSON'))
  }

  try {
    JSON.parse(value)
    return Promise.resolve()
  } catch {
    return Promise.reject(new Error('GeoJSON 必须是合法 JSON'))
  }
}

const ChartDataConfig: React.FC<WidgetConfigProps> = () => {
  const form = Form.useFormInstance()
  const chartPreset = (Form.useWatch('chartPreset', form) || 'basic-line') as ChartPreset
  const geoJsonSource = Form.useWatch('geoJsonSource', form) || 'inline'

  const isGroupedPreset = ['stacked-bar', 'percent-bar', 'grouped-bar', 'stacked-horizontal-bar', 'grouped-dual-axis']
    .includes(chartPreset)

  const handleFillGeoJsonTemplate = () => {
    form.setFieldsValue({
      geoJsonSource: 'inline',
      geoJsonText: DEFAULT_MAP_GEOJSON_TEMPLATE,
    })
  }

  return (
    <>
      <Divider>字段映射</Divider>

      {['progress-bar', 'dual-axis'].includes(chartPreset) && (
        <div className="form-row-3">
          <Form.Item name="categoryField" label="类目字段" initialValue="name">
            <Input placeholder="name" />
          </Form.Item>
          <Form.Item name="valueField" label="数值字段" initialValue="value">
            <Input placeholder="value" />
          </Form.Item>
          <Form.Item
            name="valueField2"
            label={chartPreset === 'progress-bar' ? '目标值字段' : '折线值字段'}
            initialValue={chartPreset === 'progress-bar' ? 'target' : 'lineValue'}
          >
            <Input placeholder={chartPreset === 'progress-bar' ? 'target' : 'lineValue'} />
          </Form.Item>
        </div>
      )}

      {['basic-line', 'basic-bar', 'basic-horizontal-bar'].includes(chartPreset) && (
        <div className="form-row-2">
          <Form.Item name="categoryField" label="类目字段" initialValue="name">
            <Input placeholder="name" />
          </Form.Item>
          <Form.Item name="valueField" label="主数值字段" initialValue="value">
            <Input placeholder="value" />
          </Form.Item>
        </div>
      )}

      {chartPreset === 'gauge' && (
        <>
          <div className="form-row-2">
            <Form.Item name="nameField" label={'名称字段'} initialValue="name">
              <Input placeholder="name" />
            </Form.Item>
            <Form.Item name="valueField" label={'数值字段'} initialValue="value">
              <Input placeholder="value" />
            </Form.Item>
          </div>
          <div className="form-row-2">
            <Form.Item name="valueField3" label={'最小值字段'} initialValue="min">
              <Input placeholder="min" />
            </Form.Item>
            <Form.Item name="valueField2" label={'最大值字段'} initialValue="max">
              <Input placeholder="max" />
            </Form.Item>
          </div>
        </>
      )}

      {isGroupedPreset && (
        <>
          <div className="form-row-2">
            <Form.Item name="categoryField" label="类目字段" initialValue="category">
              <Input placeholder="category" />
            </Form.Item>
            <Form.Item name="seriesField" label="系列字段" initialValue="series">
              <Input placeholder="series" />
            </Form.Item>

          </div>
          <div className="form-row-2">
            <Form.Item name="valueField" label="主数值字段" initialValue="value">
              <Input placeholder={chartPreset === 'grouped-dual-axis' ? 'barValue' : 'value'} />
            </Form.Item>
            {chartPreset === 'grouped-dual-axis' ? (
              <Form.Item name="valueField2" label="折线值字段" initialValue="lineValue">
                <Input placeholder="lineValue" />
              </Form.Item>
            ) : (
              <div />
            )}
          </div>
        </>
      )}

      {['pie', 'donut', 'funnel', 'area-map'].includes(chartPreset) && (
        <div className="form-row-2">
          <Form.Item name="nameField" label="名称字段" initialValue="name">
            <Input placeholder="name" />
          </Form.Item>
          <Form.Item name="valueField" label="数值字段" initialValue="value">
            <Input placeholder="value" />
          </Form.Item>
        </div>
      )}

      {chartPreset === 'scatter' && (
        <>
          <div className="form-row-3">
            <Form.Item name="nameField" label="名称字段" initialValue="name">
              <Input placeholder="name" />
            </Form.Item>
            <Form.Item name="xField" label="X 字段" initialValue="x">
              <Input placeholder="x" />
            </Form.Item>
            <Form.Item name="yField" label="Y 字段" initialValue="y">
              <Input placeholder="y" />
            </Form.Item>
          </div>
          <div className="form-row-3">
            <Form.Item name="symbolSizeField" label="气泡大小字段" initialValue="size">
              <Input placeholder="size" />
            </Form.Item>
          </div>
        </>
      )}

      {chartPreset === 'radar' && (
        <div className="form-row-2">
          <Form.Item name="indicatorsField" label="指标数组字段" initialValue="indicators">
            <Input placeholder="indicators" />
          </Form.Item>
          <Form.Item name="radarSeriesField" label="系列数组字段" initialValue="series">
            <Input placeholder="series" />
          </Form.Item>
        </div>
      )}

      {chartPreset === 'flow-map' && (
        <>
          <div className="form-row-3">
            <Form.Item name="nodesField" label="节点数组字段" initialValue="nodes">
              <Input placeholder="nodes" />
            </Form.Item>
            <Form.Item name="linksField" label="连线数组字段" initialValue="links">
              <Input placeholder="links" />
            </Form.Item>
            <Form.Item name="nameField" label="节点名称字段" initialValue="name">
              <Input placeholder="name" />
            </Form.Item>

          </div>
          <div className="form-row-3">
            <Form.Item name="valueField" label="权重字段" initialValue="value">
              <Input placeholder="value" />
            </Form.Item>
            <Form.Item name="lngField" label="经度字段" initialValue="lng">
              <Input placeholder="lng" />
            </Form.Item>
            <Form.Item name="latField" label="纬度字段" initialValue="lat">
              <Input placeholder="lat" />
            </Form.Item>

          </div>
          <div className="form-row-3">
            <Form.Item name="sourceField" label="起点字段" initialValue="source">
              <Input placeholder="source" />
            </Form.Item>
            <Form.Item name="targetField" label="终点字段" initialValue="target">
              <Input placeholder="target" />
            </Form.Item>
          </div>
        </>
      )}

      {['area-map', 'flow-map'].includes(chartPreset) && (
        <>
          <Divider>GeoJSON 区域</Divider>
          <Form.Item name="geoJsonSource" label="GeoJSON 来源" initialValue="inline">
            <Radio.Group>
              <Radio.Button value="inline">直接粘贴</Radio.Button>
              <Radio.Button value="url">远程地址</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {/* <div className="form-row-2">
            <Form.Item name="geoJsonNameProperty" label="区域名称属性" initialValue="name">
              <Input placeholder="name" />
            </Form.Item>
            <div />
          </div> */}
          {geoJsonSource === 'inline' ? (
            <Form.Item
              name="geoJsonText"
              label="GeoJSON"
              rules={[{ validator: validateGeoJson }]}
              extra=""
            >
              <Input.TextArea rows={12} placeholder='{"type":"FeatureCollection","features":[]}' autoSize={{ minRows: 6, maxRows: 12 }} />
            </Form.Item>
          ) : (
            <Form.Item
              name="geoJsonUrl"
              label="GeoJSON 地址"
              rules={[{ required: true, message: '请输入 GeoJSON 地址' }]}
              extra="运行时会请求该地址并注册地图。"
            >
              <Input placeholder="/geo/region.json" />
            </Form.Item>
          )}
          {/* <div className="empty-hint" style={{ marginTop: -8, marginBottom: 12 }}>
            <Button type="link" onClick={handleFillGeoJsonTemplate} style={{ paddingInline: 0 }}>
              填充 GeoJSON 示例模板
            </Button>
          </div> */}
        </>
      )}
    </>
  )
}

export default ChartDataConfig
