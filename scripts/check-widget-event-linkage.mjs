import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const checks = []

const addCheck = (name, ok, detail = '') => {
  checks.push({ name, ok, detail })
}

const includesAll = (content, tokens) => tokens.every(token => content.includes(token))

const widgetEventTypes = read('src/types/widget-event.ts')
const widgetEventBus = read('src/utils/widgetEventBus.ts')
const widgetEventLogger = read('src/utils/widgetEventLogger.ts')
const widgetEventMapping = read('src/utils/widgetEventMapping.ts')
const widgetApi = read('src/utils/widgetApi.ts')
const capabilities = read('src/utils/widgetEventCapabilities.ts')
const eventConfig = read('src/components/ConfigDialog/configs/EventLinkageConfig.tsx')
const nativeFormConfigPanel = read('src/native-form/designer/components/native-form-config-panel.tsx')
const nativeFormFieldConfigPanel = read('src/native-form/designer/components/native-form-field-config-panel.tsx')

addCheck('event config fields', includesAll(read('src/types/index.ts'), ['eventOutputs?', 'eventInputs?', 'variableBindings?']))
addCheck('event message tracing', includesAll(widgetEventTypes, ['traceId?', 'parentId?', 'depth?']))
addCheck('event bus depth guard', includesAll(widgetEventBus, ['WIDGET_EVENT_MAX_DEPTH', "recordWidgetEventLog('blocked'", 'activeWidgetEventMessage']))
addCheck('event logger API', includesAll(widgetEventLogger, ['recordWidgetEventLog', 'onWidgetEventLogsChange', 'clearWidgetEventLogs']))
addCheck('path mapping supports literals', includesAll(widgetEventMapping, ['literal:', 'readWidgetEventPath', 'applyWidgetEventMapping']))
addCheck('runtime params mapping helper', includesAll(widgetEventMapping, ['readWidgetEventPath', 'applyWidgetEventMapping', 'originalPayload']))
addCheck('API runtime placeholders', includesAll(widgetApi, ['runtimeParams', 'runtime\\.', 'resolveRuntimeTemplateValue']))
addCheck('visual linkage editor', includesAll(eventConfig, ['发送事件', '监听事件', 'Payload 映射', '参数映射']))
addCheck('mapping help tooltip', includesAll(eventConfig, ['QuestionCircleOutlined', 'Tooltip', 'literal:固定值']))
addCheck('source path controlled autocomplete', includesAll(eventConfig, ['AutoComplete', 'value={value}', 'onChange={onChange}', 'notFoundContent={emptyText}']))
addCheck('capability declarations', includesAll(capabilities, ['search.submit', 'form.submit', 'setParamsAndReload', 'setValue']))
addCheck('native form linkage config panel', includesAll(nativeFormConfigPanel, ['EventLinkageConfig', 'normalizeEventOutputsForSave', 'normalizeEventInputsForSave', '联动配置']))
addCheck('native field linkage config panel', includesAll(nativeFormFieldConfigPanel, ['EventLinkageConfig', 'normalizeEventOutputsForSave', 'normalizeEventInputsForSave', '联动']))

const componentChecks = [
  ['queryFilter emits submit/reset/change', 'src/components/widgets/QueryFilterWidget/index.tsx', ['useWidgetEventEmitter', 'useWidgetEventInputs', "emitWidgetEvent('form.submit'", "emitWidgetEvent('form.reset'", "emitWidgetEvent('form.change'", 'setValue:', 'clearValue:', 'reset:']],
  ['search emits and receives values', 'src/components/widgets/SearchWidget/index.tsx', ['useWidgetEventEmitter', 'useWidgetEventInputs', "emitWidgetEvent('search.submit'", 'setValue:']],
  ['table receives runtime params', 'src/components/widgets/DataTableWidget.tsx', ['useWidgetEventInputs', 'useWidgetRuntimeParams', 'setParamsAndReload']],
  ['chart receives runtime params', 'src/components/widgets/ChartWidget/index..tsx', ['useWidgetEventInputs', 'useWidgetRuntimeParams', 'setParamsAndReload']],
  ['indicator card receives runtime params', 'src/components/widgets/IndicatorCardWidget/index.tsx', ['useWidgetEventInputs', 'useWidgetRuntimeParams', 'setParamsAndReload']],
  ['custom form receives value actions', 'src/components/widgets/CustomFormWidget.tsx', ['useWidgetEventInputs', 'setValue:', 'clearValue:', 'reset:']],
  ['native field receives value actions', 'src/components/widgets/NativeFormFieldWidget.tsx', ['useWidgetEventInputs', 'setValue:', 'clearValue:', 'reset:']],
  ['floating module receives actions', 'src/components/FloatingModule/index.tsx', ['useWidgetEventInputs', "emitWidgetEvent(nextExpanded ? 'floating.expand'", "emitWidgetEvent('floating.close'", 'open:', 'collapse:']],
]

componentChecks.forEach(([name, file, tokens]) => {
  addCheck(name, includesAll(read(file), tokens), file)
})

const actionImplementationChecks = [
  ['search input actions implemented', 'src/components/widgets/SearchWidget/index.tsx', ['setValue:', 'clearValue:']],
  ['queryFilter input actions implemented', 'src/components/widgets/QueryFilterWidget/index.tsx', ['setValue:', 'clearValue:', 'reset:']],
  ['dataTable input actions implemented', 'src/components/widgets/DataTableWidget.tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:']],
  ['chart input actions implemented', 'src/components/widgets/ChartWidget/index..tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:']],
  ['indicatorCard input actions implemented', 'src/components/widgets/IndicatorCardWidget/index.tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:']],
  ['indicatorCardList input actions implemented', 'src/components/widgets/IndicatorCardListWidget/index.tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:']],
  ['stats input actions implemented', 'src/components/widgets/StatsWidget.tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:']],
  ['news input actions implemented', 'src/components/widgets/NewsWidget.tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:']],
  ['topList input actions implemented', 'src/components/widgets/TopListWidget.tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:']],
  ['navGroup input actions implemented', 'src/components/widgets/NavGroupWidget/index.tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:']],
  ['headerBar input actions implemented', 'src/components/widgets/HeaderBarWidget/index.tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:']],
  ['carousel input actions implemented', 'src/components/widgets/CarouselWidget/index.tsx', ['reload:', 'setParams:', 'setParamsAndReload:', 'clearParams:', 'select:', 'goTo:', 'next:', 'prev:']],
  ['customForm input actions implemented', 'src/components/widgets/CustomFormWidget.tsx', ['setValue:', 'clearValue:', 'reset:']],
  ['nativeFormField input actions implemented', 'src/components/widgets/NativeFormFieldWidget.tsx', ['setValue:', 'clearValue:']],
  ['floatingModule input actions implemented', 'src/components/FloatingModule/index.tsx', ['open:', 'close:', 'expand:', 'collapse:']],
]

actionImplementationChecks.forEach(([name, file, tokens]) => {
  addCheck(name, includesAll(read(file), tokens), file)
})

const failed = checks.filter(check => !check.ok)

checks.forEach(check => {
  const mark = check.ok ? 'PASS' : 'FAIL'
  console.log(`${mark} ${check.name}${check.detail ? ` (${check.detail})` : ''}`)
})

console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)

if (failed.length > 0) {
  process.exitCode = 1
}
