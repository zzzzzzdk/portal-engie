import type { Widget, WidgetConfig, WidgetType } from '@/types'
import { createChartPresetConfig, getChartPresetDefinition } from '@/components/widgets/chart/presets'
import type { ChartPreset } from '@/components/widgets/chart/types'

export const isChartPresetWidgetKey = (key: string) => key.startsWith('chart:')

export const getChartPresetFromWidgetKey = (key: string): ChartPreset | null => {
  if (!isChartPresetWidgetKey(key)) {
    return null
  }

  return key.slice('chart:'.length) as ChartPreset
}

export const createChartWidgetByPreset = ({
  widgetKey,
  addWidget,
  updateWidget,
  position,
}: {
  widgetKey: string
  addWidget: (
    type: WidgetType,
    position?: { x: number; y: number; w?: number; h?: number; groupId?: string },
  ) => Widget
  updateWidget: (id: string, updates: Partial<Widget>) => void
  position?: { x?: number; y?: number; w?: number; h?: number; groupId?: string }
}) => {
  const preset = getChartPresetFromWidgetKey(widgetKey)

  if (!preset) {
    return null
  }

  const definition = getChartPresetDefinition(preset)
  const widgetPosition =
    typeof position?.x === 'number' && typeof position?.y === 'number'
      ? {
          ...position,
          x: position.x,
          y: position.y,
          w: position.w ?? definition.defaultLayout?.w,
          h: position.h ?? definition.defaultLayout?.h,
        }
      : undefined

  const widget = addWidget('chart', widgetPosition)

  updateWidget(widget.id, {
    title: definition.title,
    config: {
      ...(widget.config as WidgetConfig),
      ...createChartPresetConfig(preset),
    },
  })

  return {
    widget,
    preset,
    definition,
  }
}
