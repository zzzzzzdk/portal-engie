import React, { useMemo, useState } from 'react'
import { AutoComplete, Button, Form, Input, Select, Switch, Tooltip, Typography } from 'antd'
import { DeleteOutlined, DownOutlined, PlusOutlined, QuestionCircleOutlined, RightOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import type { Widget, WidgetGroup } from '@/types'
import { buildCanvasWidgetEventOptions } from '@/utils/widgetEventCanvas'
import { getRecommendedActionsForEvent, getWidgetEventCapability } from '@/utils/widgetEventCapabilities'
import { buildWidgetEventFieldSuggestions } from '@/utils/widgetEventFieldSuggestions'

interface EventLinkageConfigProps {
  form: FormInstance
  widget: Widget
  widgets: Widget[]
  groups: WidgetGroup[]
  floatingModules: Widget[]
}

const buildOptionLabel = (item: { title: string; type: string; shortId: string }) =>
  `${item.title} / ${item.type} / ${item.shortId}`

const MappingHelp: React.FC<{ title: string }> = ({ title }) => (
  <Tooltip title={title}>
    <QuestionCircleOutlined style={{ marginLeft: 6, color: '#8c8c8c' }} />
  </Tooltip>
)

const collectNativeFormFields = (nodes: any[] = []): Array<{ label: string; value: string }> => {
  return nodes.flatMap((node) => {
    const current = node?.field
      ? [{ label: node.label || node.field, value: node.field }]
      : []

    if (node?.type === 'grid') {
      const gridChildren = (node.gridCells || [])
        .flatMap((cell: any) => cell.node ? collectNativeFormFields([cell.node]) : [])
      return [...current, ...gridChildren]
    }

    if (Array.isArray(node?.children)) {
      return [...current, ...collectNativeFormFields(node.children)]
    }

    return current
  })
}

const getTargetParamSuggestions = (widget: Widget, action?: string) => {
  if (widget.type === 'nativeForm' && ['setValue', 'clearValue'].includes(action || '')) {
    return collectNativeFormFields((widget.config as any)?.formSchema?.children)
  }

  if (widget.type === 'nativeForm' && ['setParams', 'setParamsAndReload'].includes(action || '')) {
    return [
      { label: '运行时参数', value: 'paramName' },
    ]
  }

  return []
}

const getTargetParamPlaceholder = (widget: Widget, action?: string) => {
  if (widget.type === 'nativeForm' && ['setValue', 'clearValue'].includes(action || '')) {
    return '表单字段名'
  }

  if (widget.type === 'nativeForm' && ['setParams', 'setParamsAndReload'].includes(action || '')) {
    return '运行时参数名'
  }

  return 'keyword'
}

const EventSection: React.FC<{
  title: string
  description: string
  tone: 'output' | 'input'
  children: React.ReactNode
}> = ({ title, description, tone, children }) => {
  const color = tone === 'output' ? '#1677ff' : '#52c41a'
  const background = tone === 'output' ? 'rgba(22, 119, 255, 0.06)' : 'rgba(82, 196, 26, 0.08)'

  return (
      <section className={`event-linkage-section event-linkage-section--${tone}`}>
        <div className="event-linkage-section__header">
        <Typography.Title level={5}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
      {children}
    </section>
  )
}

const EventConfigCard: React.FC<{
  title: string
  tone: 'output' | 'input'
  onRemove: () => void
  children: React.ReactNode
}> = ({ title, tone, onRemove, children }) => {
  const [expanded, setExpanded] = useState(true)
  const color = tone === 'output' ? '#1677ff' : '#52c41a'

  return (
    <div className={`config-item-card ${expanded ? 'expanded' : ''}`}>
      <div className="card-header">
        <Button
          type="text"
          size="small"
          icon={expanded ? <DownOutlined /> : <RightOutlined />}
          onClick={() => setExpanded(value => !value)}
        />
        <div className="header-content">{title}</div>
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={onRemove} />
      </div>
      {expanded ? <div className="card-body">{children}</div> : null}
    </div>
  )
}

const EventLinkageConfig: React.FC<EventLinkageConfigProps> = ({ form, widget, widgets, groups, floatingModules }) => {
  const currentCapability = getWidgetEventCapability(widget.type)
  const options = useMemo(
    () => buildCanvasWidgetEventOptions(widgets, groups, floatingModules, widget.id),
    [floatingModules, groups, widget.id, widgets],
  )
  const sourceOptions = options
    .filter(item => !item.disabled && item.outputEvents.length > 0)
    .map(item => ({ label: buildOptionLabel(item), value: item.id }))

  return (
    <div className="event-linkage-config">
      <EventSection title="发送事件" description="当前组件触发事件后，把数据发送给目标组件。" tone="output">
        <Form.List name="eventOutputs">
          {(fields, { add, remove }) => (
            <div className="config-list-container">
              {fields.map(({ key, name, ...restField }) => (
                <EventConfigCard key={key} title={`发送事件 #${name + 1}`} tone="output" onRemove={() => remove(name)}>
                  <Form.Item {...restField} name={[name, 'id']} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'enabled']} label="启用" valuePropName="checked" initialValue>
                    <Switch />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'eventName']} label="事件名称" rules={[{ required: true, message: '请选择事件' }]}>
                    <Select
                      placeholder="请选择当前组件事件"
                      options={(currentCapability?.outputEvents || []).map(eventName => ({ label: eventName, value: eventName }))}
                    />
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, next) => prev.eventOutputs?.[name]?.eventName !== next.eventOutputs?.[name]?.eventName}>
                    {({ getFieldValue }) => {
                      const eventName = getFieldValue(['eventOutputs', name, 'eventName'])
                      const recommendedActions = getRecommendedActionsForEvent(eventName)
                      const filteredTargetOptions = options
                        .filter(item => !item.disabled && item.inputActions.length > 0)
                        .filter(item => {
                          if (recommendedActions.length === 0) return true
                          return item.inputActions.some(action => recommendedActions.includes(action as any))
                        })
                        .map(item => ({
                          label: `${buildOptionLabel(item)}${recommendedActions.length ? ` / 推荐动作: ${item.inputActions.filter(action => recommendedActions.includes(action as any)).join('、')}` : ''}`,
                          value: item.id,
                        }))

                      return (
                        <Form.Item {...restField} name={[name, 'targetWidgetIds']} label="目标组件" rules={[{ required: true, message: '请选择目标组件' }]}>
                          <Select mode="multiple" placeholder="请选择当前画布中的目标组件" options={filteredTargetOptions} />
                        </Form.Item>
                      )
                    }}
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'debounce']} label="防抖时间(ms)">
                    <Input placeholder="可选，例如 300" />
                  </Form.Item>
                  <OutputPayloadMappingEditor name={name} widget={widget} />
                </EventConfigCard>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({ id: `output-${Date.now()}`, enabled: true, targetWidgetIds: [] })}
              >
                添加发送事件
              </Button>
            </div>
          )}
        </Form.List>
      </EventSection>

      <EventSection title="监听事件" description="当前组件接收其他组件事件，并执行选定的响应动作。" tone="input">
        <Form.List name="eventInputs">
          {(fields, { add, remove }) => (
            <div className="config-list-container">
              {fields.map(({ key, name, ...restField }) => (
                <EventConfigCard key={key} title={`监听事件 #${name + 1}`} tone="input" onRemove={() => remove(name)}>
                  <Form.Item {...restField} name={[name, 'id']} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'enabled']} label="启用" valuePropName="checked" initialValue>
                    <Switch />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'listenWidgetId']} label="来源组件" rules={[{ required: true, message: '请选择来源组件' }]}>
                    <Select placeholder="请选择当前画布中的来源组件" options={sourceOptions} />
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, next) => prev.eventInputs?.[name]?.listenWidgetId !== next.eventInputs?.[name]?.listenWidgetId}>
                    {({ getFieldValue }) => {
                      const sourceId = getFieldValue(['eventInputs', name, 'listenWidgetId'])
                      const source = options.find(item => item.id === sourceId)
                      return (
                        <Form.Item {...restField} name={[name, 'listenEventName']} label="监听事件" rules={[{ required: true, message: '请选择监听事件' }]}>
                          <Select
                            placeholder="请选择来源组件事件"
                            options={(source?.outputEvents || []).map(eventName => ({ label: eventName, value: eventName }))}
                          />
                        </Form.Item>
                      )
                    }}
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, next) => prev.eventInputs?.[name]?.listenEventName !== next.eventInputs?.[name]?.listenEventName}>
                    {({ getFieldValue }) => {
                      const listenEventName = getFieldValue(['eventInputs', name, 'listenEventName'])
                      const recommendedActions = getRecommendedActionsForEvent(listenEventName)
                      const currentActions = currentCapability?.inputActions || []
                      const sortedActions = [
                        ...currentActions.filter(action => recommendedActions.includes(action)),
                        ...currentActions.filter(action => !recommendedActions.includes(action)),
                      ]
                      const actionOptions = sortedActions
                        .map(action => ({
                          label: recommendedActions.includes(action) ? `${action}（推荐）` : action,
                          value: action,
                        }))

                      return (
                        <>
                          <Form.Item {...restField} name={[name, 'action']} label="响应动作" rules={[{ required: true, message: '请选择响应动作' }]}>
                            <Select placeholder="请选择当前组件动作" options={actionOptions} />
                          </Form.Item>
                        </>
                      )
                    }}
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'debounce']} label="防抖时间(ms)">
                    <Input placeholder="可选，例如 300" />
                  </Form.Item>
                  <ParamMappingEditor name={name} widget={widget} form={form} widgets={widgets} floatingModules={floatingModules} />
                </EventConfigCard>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({ id: `input-${Date.now()}`, enabled: true, paramMappingList: [] })}
              >
                添加监听事件
              </Button>
            </div>
          )}
        </Form.List>
      </EventSection>
    </div>
  )
}

const PathSelect: React.FC<{
  value?: string
  placeholder: string
  suggestions: ReturnType<typeof buildWidgetEventFieldSuggestions>
  emptyText: string
  onChange?: (path?: string) => void
  onSelectPath?: (path: string) => void
}> = ({ value, placeholder, suggestions, emptyText, onChange, onSelectPath }) => {
  const options = Object.entries(
    suggestions.reduce<Record<string, { label: string; value: string }[]>>((result, item) => {
      if (!result[item.group]) result[item.group] = []
      result[item.group].push({
        label: `${item.label} (${item.value})${item.preview !== undefined ? ` = ${item.preview}` : ''}`,
        value: item.value,
      })
      return result
    }, {}),
  ).map(([label, groupOptions]) => ({ label, options: groupOptions }))

  return (
    <>
      <AutoComplete
        allowClear
        value={value}
        placeholder={placeholder}
        options={options}
        notFoundContent={emptyText}
        onChange={onChange}
        onSelect={(nextValue) => onSelectPath?.(nextValue)}
      />
    </>
  )
}

const ParamMappingEditor: React.FC<{
  name: number
  widget: Widget
  form: FormInstance
  widgets: Widget[]
  floatingModules: Widget[]
}> = ({ name, widget, widgets, floatingModules }) => (
  <Form.List name={[name, 'paramMappingList']}>
    {(fields, { add, remove }) => (
      <div className="event-linkage-mapping event-linkage-mapping--input">
        <Typography.Text type="secondary" className="event-linkage-mapping__title">
          参数映射
          <MappingHelp title="把来源组件发出的字段转换成当前组件动作需要的参数。来源路径下拉只展示所选来源组件和事件支持传出的字段；固定值可手写 literal:固定值。" />
        </Typography.Text>
        {fields.map(({ key, name: fieldName, ...restField }) => (
          <div key={key} className="event-linkage-mapping__row">
            <Form.Item noStyle shouldUpdate={(prev, next) => prev.eventInputs?.[name]?.action !== next.eventInputs?.[name]?.action}>
              {({ getFieldValue }) => {
                const action = getFieldValue(['eventInputs', name, 'action'])
                const targetSuggestions = getTargetParamSuggestions(widget, action)
                return (
                  <Form.Item {...restField} name={[fieldName, 'target']} label="目标参数" className="event-linkage-mapping__target">
                    <AutoComplete
                      allowClear
                      placeholder={getTargetParamPlaceholder(widget, action)}
                      options={targetSuggestions.map(item => ({
                        label: `${item.label} (${item.value})`,
                        value: item.value,
                      }))}
                    />
                  </Form.Item>
                )
              }}
            </Form.Item>
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue, setFieldValue }) => {
                const sourceWidgetId = getFieldValue(['eventInputs', name, 'listenWidgetId'])
                const eventName = getFieldValue(['eventInputs', name, 'listenEventName'])
                const sourceWidget = [...widgets, ...floatingModules].find(item => item.id === sourceWidgetId)
                const suggestions = buildWidgetEventFieldSuggestions({ sourceWidget, eventName, targetWidgetId: widget.id })

                return (
                  <Form.Item {...restField} name={[fieldName, 'source']} label="来源路径" className="event-linkage-mapping__source">
                    <PathSelect
                      placeholder="选择来源组件支持传出的字段"
                      suggestions={suggestions}
                      emptyText="请先选择来源组件和监听事件，或该事件暂无可选字段"
                      onSelectPath={(path) => setFieldValue(['eventInputs', name, 'paramMappingList', fieldName, 'source'], path)}
                    />
                  </Form.Item>
                )
              }}
            </Form.Item>
            <div className="event-linkage-mapping__action">
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(fieldName)} />
            </div>
          </div>
        ))}
        <div className="event-linkage-mapping__add">
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ target: '', source: '' })}>
            添加参数映射
          </Button>
        </div>
      </div>
    )}
  </Form.List>
)

const OutputPayloadMappingEditor: React.FC<{ name: number; widget: Widget }> = ({ name, widget }) => (
  <Form.List name={[name, 'payloadMappingList']}>
    {(fields, { add, remove }) => (
      <div className="event-linkage-mapping event-linkage-mapping--output">
        <Typography.Text type="secondary" className="event-linkage-mapping__title">
          Payload 映射（可选）
          <MappingHelp title="发送事件前重组 payload。来源路径下拉只展示当前组件在当前事件中支持传出的字段；固定值可手写 literal:固定值。不配置时默认发送完整 payload。" />
        </Typography.Text>
        {fields.map(({ key, name: fieldName, ...restField }) => (
          <div key={key} className="event-linkage-mapping__row">
            <Form.Item {...restField} name={[fieldName, 'target']} label="映射字段" className="event-linkage-mapping__target">
              <Input placeholder="keyword" />
            </Form.Item>
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue, setFieldValue }) => {
                const eventName = getFieldValue(['eventOutputs', name, 'eventName'])
                const suggestions = buildWidgetEventFieldSuggestions({ sourceWidget: widget, eventName, useMappedOutput: false })

                return (
                  <Form.Item {...restField} name={[fieldName, 'source']} label="来源路径" className="event-linkage-mapping__source">
                    <PathSelect
                      placeholder="选择当前组件支持传出的字段"
                      suggestions={suggestions}
                      emptyText="请先选择事件名称，或该事件暂无可选字段"
                      onSelectPath={(path) => setFieldValue(['eventOutputs', name, 'payloadMappingList', fieldName, 'source'], path)}
                    />
                  </Form.Item>
                )
              }}
            </Form.Item>
            <div className="event-linkage-mapping__action">
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(fieldName)} />
            </div>
          </div>
        ))}
        <div className="event-linkage-mapping__add">
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ target: '', source: '' })}>
            添加 Payload 映射
          </Button>
        </div>
      </div>
    )}
  </Form.List>
)

export default EventLinkageConfig
