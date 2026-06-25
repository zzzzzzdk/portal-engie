import React, { useState } from 'react'
import { ConfigProvider, App as AntdApp, Card, Space, Typography } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { Widget } from '@/types'
import QueryFilterWidget from '@/components/widgets/QueryFilterWidget'
import SearchWidget from '@/components/widgets/SearchWidget'
import DataTableWidget from '@/components/widgets/DataTableWidget'
import ChartWidget from '@/components/widgets/ChartWidget/index.'
import IndicatorCardWidget from '@/components/widgets/IndicatorCardWidget'
import CustomFormWidget from '@/components/widgets/CustomFormWidget'
import NativeFormWidget from '@/components/widgets/NativeFormWidget'
import NativeFormFieldWidget from '@/components/widgets/NativeFormFieldWidget'
import { clearWidgetEventLogs, getWidgetEventLogs } from '@/utils/widgetEventLogger'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'
import { normalizeEventInputsForSave, normalizeEventOutputsForSave } from '@/components/ConfigDialog'
import { buildWidgetEventFieldSuggestions } from '@/utils/widgetEventFieldSuggestions'
import { getWidgetEventCapability } from '@/utils/widgetEventCapabilities'

const queryWidget: Widget = {
  id: 'e2e-query-filter',
  type: 'queryFilter',
  title: 'E2E 查询筛选',
  layout: { i: 'e2e-query-filter', x: 0, y: 0, w: 8, h: 5 },
  config: {
    title: 'E2E 查询筛选',
    submitMethod: 'eventRoute',
    submitButtonText: '查询',
    resetButtonText: '重置',
    queryFields: [
      {
        id: 'keyword',
        field: 'keyword',
        label: '关键词',
        type: 'input',
      },
      {
        id: 'name',
        field: 'name',
        label: '姓名',
        type: 'input',
      },
    ],
    eventOutputs: [
      {
        id: 'query-submit-to-search',
        enabled: true,
        eventName: 'form.submit',
        targetWidgetIds: ['e2e-search', 'e2e-search-replace', 'e2e-table'],
      },
      {
        id: 'query-reset-to-search',
        enabled: true,
        eventName: 'form.reset',
        targetWidgetIds: ['e2e-search', 'e2e-table'],
      },
    ],
  },
}

const userCaseSearchWidget: Widget = {
  id: 'e2e-user-case-search',
  type: 'search',
  title: 'User Case Search',
  layout: { i: 'e2e-user-case-search', x: 0, y: 0, w: 8, h: 4 },
  config: {
    title: 'User Case Search',
    submitMethod: 'eventRoute',
    eventOutputs: [
      {
        id: 'user-case-search-output',
        enabled: true,
        eventName: 'search.submit',
        targetWidgetIds: ['e2e-user-case-query'],
        payloadMapping: { val: 'payload.keyword' },
      },
    ],
  },
}

const userCaseQueryWidget: Widget = {
  id: 'e2e-user-case-query',
  type: 'queryFilter',
  title: 'User Case Query',
  layout: { i: 'e2e-user-case-query', x: 0, y: 0, w: 12, h: 5 },
  config: {
    title: 'User Case Query',
    queryFields: [
      { id: 'keyword', field: 'keyword', label: '关键字', type: 'input' },
      { id: 'name', field: 'name', label: '名称', type: 'input' },
    ],
    submitMethod: 'eventRoute',
    eventInputs: [
      {
        id: 'user-case-query-input',
        enabled: true,
        listenWidgetId: 'e2e-user-case-search',
        listenEventName: 'search.submit',
        action: 'setValue',
        mergeMode: 'merge',
        paramMapping: { name: 'payload.val' },
      },
    ],
  },
}

const mappedPayloadSourceWidget: Widget = {
  id: 'e2e-mapped-payload-source',
  type: 'queryFilter',
  title: 'Mapped Payload Source',
  layout: { i: 'e2e-mapped-payload-source', x: 0, y: 0, w: 4, h: 4 },
  config: {
    queryFields: [
      { id: 'mapped-keyword', field: 'keyword', label: '映射关键词', type: 'input' },
    ],
    eventOutputs: [
      {
        id: 'mapped-output',
        enabled: true,
        eventName: 'form.submit',
        targetWidgetIds: ['e2e-mapped-payload-target'],
        payloadMapping: { key: 'payload.values.keyword' },
      },
    ],
  },
}

const mappedPayloadTargetWidget: Widget = {
  id: 'e2e-mapped-payload-target',
  type: 'dataTable',
  title: 'Mapped Payload Target',
  layout: { i: 'e2e-mapped-payload-target', x: 0, y: 0, w: 4, h: 4 },
  config: {
    eventInputs: [
      {
        id: 'mapped-input',
        enabled: true,
        listenWidgetId: 'e2e-mapped-payload-source',
        listenEventName: 'form.submit',
        action: 'setValue',
        mergeMode: 'replace',
        paramMapping: { jdt: 'payload.values.keyword' },
      },
    ],
  },
}

const searchWidget: Widget = {
  id: 'e2e-search',
  type: 'search',
  title: 'E2E 搜索',
  layout: { i: 'e2e-search', x: 0, y: 5, w: 8, h: 4 },
  config: {
    title: 'E2E 搜索',
    buttonText: '搜索',
    searchFields: [
      {
        id: 'keyword',
        name: 'keyword',
        label: '关键词',
        type: 'input',
      },
      {
        id: 'name',
        name: 'name',
        label: '姓名',
        type: 'input',
      },
    ],
    eventOutputs: [
      {
        id: 'search-submit-to-table-chart',
        enabled: true,
        eventName: 'search.submit',
        targetWidgetIds: ['e2e-search-table', 'e2e-chart', 'e2e-post-table', 'e2e-header-table'],
      },
      {
        id: 'search-change-to-table',
        enabled: true,
        eventName: 'search.change',
        targetWidgetIds: ['e2e-search-table'],
      },
    ],
    eventInputs: [
      {
        id: 'listen-query-submit',
        enabled: true,
        listenWidgetId: 'e2e-query-filter',
        listenEventName: 'form.submit',
        action: 'setValue',
        mergeMode: 'merge',
        paramMapping: {
          keyword: 'payload.values.keyword',
          name: 'payload.values.name',
        },
      },
      {
        id: 'listen-query-reset',
        enabled: true,
        listenWidgetId: 'e2e-query-filter',
        listenEventName: 'form.reset',
        action: 'clearValue',
      },
      {
        id: 'listen-table-row-search',
        enabled: true,
        listenWidgetId: 'e2e-table',
        listenEventName: 'table.rowClick',
        action: 'setValue',
        mergeMode: 'merge',
        paramMapping: {
          keyword: 'payload.row.keyword',
          name: 'payload.row.name',
        },
      },
      {
        id: 'listen-custom-form-submit-search',
        enabled: true,
        listenWidgetId: 'e2e-custom-form',
        listenEventName: 'form.submit',
        action: 'setValue',
        mergeMode: 'merge',
        paramMapping: {
          keyword: 'payload.values.formKeyword',
          name: 'payload.values.formName',
        },
      },
      {
        id: 'listen-native-field-change-search',
        enabled: true,
        listenWidgetId: 'e2e-native-field',
        listenEventName: 'field.change',
        action: 'setValue',
        mergeMode: 'merge',
        paramMapping: {
          keyword: 'payload.value',
        },
      },
    ],
  },
}

const replaceSearchWidget: Widget = {
  id: 'e2e-search-replace',
  type: 'search',
  title: 'E2E 替换搜索',
  layout: { i: 'e2e-search-replace', x: 0, y: 9, w: 8, h: 4 },
  config: {
    title: 'E2E 替换搜索',
    buttonText: '搜索',
    searchFields: [
      {
        id: 'keyword',
        name: 'keyword',
        label: '关键词',
        type: 'input',
        defaultValue: 'keep-me',
      },
      {
        id: 'name',
        name: 'name',
        label: '姓名',
        type: 'input',
        defaultValue: 'remove-me',
      },
    ],
    eventInputs: [
      {
        id: 'listen-query-submit-replace',
        enabled: true,
        listenWidgetId: 'e2e-query-filter',
        listenEventName: 'form.submit',
        action: 'setValue',
        mergeMode: 'replace',
        paramMapping: {
          keyword: 'payload.values.keyword',
        },
      },
    ],
  },
}

const tableWidget: Widget = {
  id: 'e2e-table',
  type: 'dataTable',
  title: 'E2E 表格',
  layout: { i: 'e2e-table', x: 0, y: 13, w: 12, h: 6 },
  config: {
    title: 'E2E 表格',
    apiEndpoint: '/api/e2e/table',
    apiMethod: 'GET',
    apiQuery: {
      staticParam: 'static-value',
    },
    apiListField: 'list',
    rowKey: 'id',
    columns: [
      { key: 'name', title: '姓名', dataIndex: 'name' },
      { key: 'keyword', title: '关键词', dataIndex: 'keyword' },
    ],
    eventOutputs: [
      {
        id: 'table-row-click-to-search-card',
        enabled: true,
        eventName: 'table.rowClick',
        targetWidgetIds: ['e2e-search', 'e2e-indicator-card'],
      },
    ],
    eventInputs: [
      {
        id: 'listen-query-submit-table',
        enabled: true,
        listenWidgetId: 'e2e-query-filter',
        listenEventName: 'form.submit',
        action: 'setParamsAndReload',
        mergeMode: 'merge',
        paramMapping: {
          keyword: 'payload.values.keyword',
          userName: 'payload.values.name',
          page: 'literal:1',
        },
      },
      {
        id: 'listen-query-reset-table',
        enabled: true,
        listenWidgetId: 'e2e-query-filter',
        listenEventName: 'form.reset',
        action: 'clearParams',
      },
    ],
  },
}

const searchDrivenTableWidget: Widget = {
  id: 'e2e-search-table',
  type: 'dataTable',
  title: 'E2E 搜索驱动表格',
  layout: { i: 'e2e-search-table', x: 0, y: 19, w: 12, h: 6 },
  config: {
    title: 'E2E 搜索驱动表格',
    apiEndpoint: '/api/e2e/search-table',
    apiMethod: 'GET',
    apiListField: 'list',
    rowKey: 'id',
    columns: [
      { key: 'name', title: '姓名', dataIndex: 'name' },
      { key: 'keyword', title: '关键词', dataIndex: 'keyword' },
    ],
    eventInputs: [
      {
        id: 'listen-search-submit-table',
        enabled: true,
        listenWidgetId: 'e2e-search',
        listenEventName: 'search.submit',
        action: 'setParamsAndReload',
        mergeMode: 'merge',
        paramMapping: {
          keyword: 'payload.keyword',
          source: 'literal:search-submit',
        },
      },
      {
        id: 'listen-search-change-table',
        enabled: true,
        listenWidgetId: 'e2e-search',
        listenEventName: 'search.change',
        action: 'setParams',
        mergeMode: 'merge',
        paramMapping: {
          draftKeyword: 'payload.value',
        },
      },
      {
        id: 'listen-custom-form-submit-table',
        enabled: true,
        listenWidgetId: 'e2e-custom-form',
        listenEventName: 'form.submit',
        action: 'setParamsAndReload',
        mergeMode: 'merge',
        paramMapping: {
          formKeyword: 'payload.values.formKeyword',
          formName: 'payload.values.formName',
        },
      },
    ],
  },
}

const chartWidget: Widget = {
  id: 'e2e-chart',
  type: 'chart',
  title: 'E2E 图表',
  layout: { i: 'e2e-chart', x: 0, y: 25, w: 12, h: 6 },
  config: {
    title: 'E2E 图表',
    dataSource: 'customApi',
    apiEndpoint: '/api/e2e/chart',
    apiMethod: 'GET',
    apiDataField: 'data',
    apiQuery: {
      chartStatic: 'yes',
    },
    eventInputs: [
      {
        id: 'listen-search-submit-chart',
        enabled: true,
        listenWidgetId: 'e2e-search',
        listenEventName: 'search.submit',
        action: 'setParamsAndReload',
        mergeMode: 'merge',
        paramMapping: {
          keyword: 'payload.keyword',
        },
      },
    ],
  },
}

const postTableWidget: Widget = {
  id: 'e2e-post-table',
  type: 'dataTable',
  title: 'E2E POST 表格',
  layout: { i: 'e2e-post-table', x: 0, y: 31, w: 12, h: 6 },
  config: {
    title: 'E2E POST 表格',
    apiEndpoint: '/api/e2e/post-table',
    apiMethod: 'POST',
    apiBody: {
      staticBody: 'body-value',
      templatedKeyword: '${runtime.keyword}',
    },
    apiListField: 'list',
    rowKey: 'id',
    columns: [
      { key: 'name', title: '姓名', dataIndex: 'name' },
      { key: 'keyword', title: '关键词', dataIndex: 'keyword' },
    ],
    eventInputs: [
      {
        id: 'listen-search-submit-post-table',
        enabled: true,
        listenWidgetId: 'e2e-search',
        listenEventName: 'search.submit',
        action: 'setParamsAndReload',
        mergeMode: 'merge',
        paramMapping: {
          keyword: 'payload.keyword',
          source: 'literal:search-post',
        },
      },
    ],
  },
}

const headerTableWidget: Widget = {
  id: 'e2e-header-table',
  type: 'dataTable',
  title: 'E2E Header 表格',
  layout: { i: 'e2e-header-table', x: 0, y: 37, w: 12, h: 6 },
  config: {
    title: 'E2E Header 表格',
    apiEndpoint: '/api/e2e/header-table',
    apiMethod: 'GET',
    apiHeaders: {
      'X-Keyword': '${runtime.keyword}',
      'X-Trace': 'trace-${runtime.keyword}',
    },
    apiListField: 'list',
    rowKey: 'id',
    columns: [
      { key: 'name', title: '姓名', dataIndex: 'name' },
    ],
    eventInputs: [
      {
        id: 'listen-search-submit-header-table',
        enabled: true,
        listenWidgetId: 'e2e-search',
        listenEventName: 'search.submit',
        action: 'setParamsAndReload',
        mergeMode: 'merge',
        paramMapping: {
          keyword: 'payload.keyword',
        },
      },
    ],
  },
}

const indicatorCardWidget: Widget = {
  id: 'e2e-indicator-card',
  type: 'indicatorCard',
  title: 'E2E 指标卡',
  layout: { i: 'e2e-indicator-card', x: 0, y: 43, w: 6, h: 4 },
  config: {
    title: 'E2E 指标卡',
    dataSource: 'customApi',
    apiEndpoint: '/api/e2e/indicator-card',
    apiMethod: 'GET',
    apiDataField: 'data',
    valueField: 'value',
    descriptionField: 'description',
    eventInputs: [
      {
        id: 'listen-table-row-card',
        enabled: true,
        listenWidgetId: 'e2e-table',
        listenEventName: 'table.rowClick',
        action: 'setParamsAndReload',
        mergeMode: 'merge',
        paramMapping: {
          selectedId: 'payload.row.id',
          selectedName: 'payload.row.name',
        },
      },
    ],
  },
}

const customFormWidget: Widget = {
  id: 'e2e-custom-form',
  type: 'customForm',
  title: 'E2E 自定义表单',
  layout: { i: 'e2e-custom-form', x: 0, y: 47, w: 8, h: 6 },
  config: {
    title: 'E2E 自定义表单',
    submitMethod: 'eventRoute',
    submitButtonText: '提交表单',
    resetButtonText: '重置表单',
    fields: [
      {
        id: 'form-keyword',
        type: 'input',
        label: '表单关键词',
        field: 'formKeyword',
        placeholder: '请输入表单关键词',
      },
      {
        id: 'form-name',
        type: 'input',
        label: '表单姓名',
        field: 'formName',
        placeholder: '请输入表单姓名',
      },
    ],
    eventOutputs: [
      {
        id: 'custom-form-submit-to-search-table',
        enabled: true,
        eventName: 'form.submit',
        targetWidgetIds: ['e2e-search', 'e2e-search-table'],
      },
    ],
  },
}

const nativeFieldWidget: Widget = {
  id: 'e2e-native-field',
  type: 'nativeFormField',
  title: 'E2E 原生字段',
  layout: { i: 'e2e-native-field', x: 0, y: 53, w: 6, h: 4 },
  config: {
    title: 'E2E 原生字段',
    field: {
      id: 'native-keyword',
      type: 'input',
      label: '原生关键词',
      field: 'nativeKeyword',
      placeholder: '请输入原生关键词',
    },
    runtime: {
      mode: 'standalone',
      emitOnChange: true,
    },
    eventOutputs: [
      {
        id: 'native-field-change-to-search',
        enabled: true,
        eventName: 'field.change',
        targetWidgetIds: ['e2e-search'],
      },
    ],
  },
}

const nativeFormSubmitTargetWidget: Widget = {
  id: 'e2e-native-form-submit-target',
  type: 'search',
  title: 'E2E 原生表单提交目标',
  layout: { i: 'e2e-native-form-submit-target', x: 0, y: 54, w: 6, h: 4 },
  config: {
    title: 'E2E 原生表单提交目标',
    eventInputs: [
      {
        id: 'native-form-submit-input',
        enabled: true,
        listenWidgetId: 'e2e-native-form-submit-none',
        listenEventName: 'form.submit',
        action: 'setValue',
      },
    ],
  },
}

const nativeFormSubmitNoneWidget: Widget = {
  id: 'e2e-native-form-submit-none',
  type: 'nativeForm',
  title: 'E2E 原生表单无提交方式',
  layout: { i: 'e2e-native-form-submit-none', x: 0, y: 55, w: 8, h: 6 },
  config: {
    title: 'E2E 原生表单无提交方式',
    formSchema: {
      version: 1,
      meta: { name: 'E2E 原生表单无提交方式', description: '' },
      layout: {
        mode: 'horizontal',
        labelWidth: 96,
        fieldSpacing: 16,
        labelAlign: 'right',
        colon: true,
        size: 'middle',
        variant: 'outlined',
      },
      children: [
        {
          id: 'native-form-keyword',
          type: 'input',
          label: '原生表单关键词',
          field: 'nativeFormKeyword',
          placeholder: '请输入原生表单关键词',
        },
        {
          id: 'native-form-submit-button',
          type: 'button',
          label: '提交按钮',
          componentProps: {
            text: '提交',
            buttonType: 'primary',
            actionType: 'submit',
          },
        },
      ],
    },
    submitConfig: {
      mode: 'none',
      submitButtonText: '提交',
    },
    eventOutputs: [
      {
        id: 'native-form-submit-none-output',
        enabled: true,
        eventName: 'form.submit',
        targetWidgetIds: ['e2e-native-form-submit-target'],
        payloadMapping: {
          keyword: 'payload.values.nativeFormKeyword',
        },
      },
    ],
  },
}

const loopSourceWidget: Widget = {
  id: 'e2e-loop-source',
  type: 'search',
  title: 'E2E 循环源',
  layout: { i: 'e2e-loop-source', x: 0, y: 45, w: 1, h: 1 },
  config: {
    title: 'E2E 循环源',
    eventOutputs: [
      {
        id: 'loop-source-ping',
        enabled: true,
        eventName: 'loop.ping',
        targetWidgetIds: ['e2e-loop-target'],
      },
    ],
    eventInputs: [
      {
        id: 'loop-source-listen-pong',
        enabled: true,
        listenWidgetId: 'e2e-loop-target',
        listenEventName: 'loop.pong',
        action: 'setValue',
      },
    ],
  },
}

const loopTargetWidget: Widget = {
  id: 'e2e-loop-target',
  type: 'search',
  title: 'E2E 循环目标',
  layout: { i: 'e2e-loop-target', x: 0, y: 46, w: 1, h: 1 },
  config: {
    title: 'E2E 循环目标',
    eventOutputs: [
      {
        id: 'loop-target-pong',
        enabled: true,
        eventName: 'loop.pong',
        targetWidgetIds: ['e2e-loop-source'],
      },
    ],
    eventInputs: [
      {
        id: 'loop-target-listen-ping',
        enabled: true,
        listenWidgetId: 'e2e-loop-source',
        listenEventName: 'loop.ping',
        action: 'setValue',
      },
    ],
  },
}

const debounceSourceWidget: Widget = {
  id: 'e2e-debounce-source',
  type: 'search',
  title: 'E2E 防抖源',
  layout: { i: 'e2e-debounce-source', x: 0, y: 47, w: 1, h: 1 },
  config: {
    title: 'E2E 防抖源',
    eventOutputs: [
      {
        id: 'debounce-output',
        enabled: true,
        eventName: 'debounce.change',
        targetWidgetIds: ['e2e-debounce-target'],
        debounce: 200,
      },
    ],
  },
}

const debounceTargetWidget: Widget = {
  id: 'e2e-debounce-target',
  type: 'search',
  title: 'E2E 防抖目标',
  layout: { i: 'e2e-debounce-target', x: 0, y: 48, w: 1, h: 1 },
  config: {
    title: 'E2E 防抖目标',
    eventInputs: [
      {
        id: 'debounce-input',
        enabled: true,
        listenWidgetId: 'e2e-debounce-source',
        listenEventName: 'debounce.change',
        action: 'setValue',
      },
    ],
  },
}

const inputDebounceSourceWidget: Widget = {
  id: 'e2e-input-debounce-source',
  type: 'search',
  title: 'E2E 监听防抖源',
  layout: { i: 'e2e-input-debounce-source', x: 0, y: 49, w: 1, h: 1 },
  config: {
    title: 'E2E 监听防抖源',
    eventOutputs: [
      {
        id: 'input-debounce-output',
        enabled: true,
        eventName: 'input.debounce.change',
        targetWidgetIds: ['e2e-input-debounce-target'],
      },
    ],
  },
}

const inputDebounceTargetWidget: Widget = {
  id: 'e2e-input-debounce-target',
  type: 'search',
  title: 'E2E 监听防抖目标',
  layout: { i: 'e2e-input-debounce-target', x: 0, y: 50, w: 1, h: 1 },
  config: {
    title: 'E2E 监听防抖目标',
    eventInputs: [
      {
        id: 'input-debounce-input',
        enabled: true,
        listenWidgetId: 'e2e-input-debounce-source',
        listenEventName: 'input.debounce.change',
        action: 'setValue',
        debounce: 200,
      },
    ],
  },
}

const missingPathSourceWidget: Widget = {
  id: 'e2e-missing-path-source',
  type: 'search',
  title: 'E2E 缺失映射源',
  layout: { i: 'e2e-missing-path-source', x: 0, y: 51, w: 1, h: 1 },
  config: {
    title: 'E2E 缺失映射源',
    eventOutputs: [
      {
        id: 'missing-path-output',
        enabled: true,
        eventName: 'missing.path',
        targetWidgetIds: ['e2e-missing-path-target'],
      },
    ],
  },
}

const missingPathTargetWidget: Widget = {
  id: 'e2e-missing-path-target',
  type: 'search',
  title: 'E2E 缺失映射目标',
  layout: { i: 'e2e-missing-path-target', x: 0, y: 52, w: 1, h: 1 },
  config: {
    title: 'E2E 缺失映射目标',
    eventInputs: [
      {
        id: 'missing-path-input',
        enabled: true,
        listenWidgetId: 'e2e-missing-path-source',
        listenEventName: 'missing.path',
        action: 'setValue',
        paramMapping: {
          keyword: 'payload.not.exists',
        },
      },
    ],
  },
}

const disabledSourceWidget: Widget = {
  id: 'e2e-disabled-source',
  type: 'search',
  title: 'E2E 禁用源',
  layout: { i: 'e2e-disabled-source', x: 0, y: 53, w: 1, h: 1 },
  config: {
    title: 'E2E 禁用源',
    eventOutputs: [
      {
        id: 'disabled-output',
        enabled: false,
        eventName: 'disabled.output',
        targetWidgetIds: ['e2e-disabled-target'],
      },
      {
        id: 'enabled-output-to-disabled-input',
        enabled: true,
        eventName: 'disabled.input',
        targetWidgetIds: ['e2e-disabled-target'],
      },
    ],
  },
}

const disabledTargetWidget: Widget = {
  id: 'e2e-disabled-target',
  type: 'search',
  title: 'E2E 禁用目标',
  layout: { i: 'e2e-disabled-target', x: 0, y: 54, w: 1, h: 1 },
  config: {
    title: 'E2E 禁用目标',
    eventInputs: [
      {
        id: 'enabled-input-disabled-output',
        enabled: true,
        listenWidgetId: 'e2e-disabled-source',
        listenEventName: 'disabled.output',
        action: 'setValue',
      },
      {
        id: 'disabled-input',
        enabled: false,
        listenWidgetId: 'e2e-disabled-source',
        listenEventName: 'disabled.input',
        action: 'setValue',
      },
    ],
  },
}

const multiInputSourceWidget: Widget = {
  id: 'e2e-multi-input-source',
  type: 'search',
  title: 'E2E 多监听源',
  layout: { i: 'e2e-multi-input-source', x: 0, y: 55, w: 1, h: 1 },
  config: {
    title: 'E2E 多监听源',
    eventOutputs: [
      {
        id: 'multi-input-output',
        enabled: true,
        eventName: 'multi.input',
        targetWidgetIds: ['e2e-multi-input-target'],
      },
    ],
  },
}

const multiInputTargetWidget: Widget = {
  id: 'e2e-multi-input-target',
  type: 'search',
  title: 'E2E 多监听目标',
  layout: { i: 'e2e-multi-input-target', x: 0, y: 56, w: 1, h: 1 },
  config: {
    title: 'E2E 多监听目标',
    eventInputs: [
      {
        id: 'multi-input-first',
        enabled: true,
        listenWidgetId: 'e2e-multi-input-source',
        listenEventName: 'multi.input',
        action: 'setValue',
        paramMapping: {
          first: 'payload.first',
        },
      },
      {
        id: 'multi-input-second',
        enabled: true,
        listenWidgetId: 'e2e-multi-input-source',
        listenEventName: 'multi.input',
        action: 'setValue',
        paramMapping: {
          second: 'payload.second',
        },
      },
    ],
  },
}

const EventRuntimeProbe: React.FC = () => {
  const emitLoopSource = useWidgetEventEmitter(loopSourceWidget)
  const emitLoopTarget = useWidgetEventEmitter(loopTargetWidget)
  const emitDebounceSource = useWidgetEventEmitter(debounceSourceWidget)
  const emitInputDebounceSource = useWidgetEventEmitter(inputDebounceSourceWidget)
  const emitMissingPathSource = useWidgetEventEmitter(missingPathSourceWidget)
  const emitDisabledSource = useWidgetEventEmitter(disabledSourceWidget)
  const emitMultiInputSource = useWidgetEventEmitter(multiInputSourceWidget)
  const emitMappedPayloadSource = useWidgetEventEmitter(mappedPayloadSourceWidget)
  const [debounceCount, setDebounceCount] = useState(0)
  const [inputDebounceCount, setInputDebounceCount] = useState(0)
  const [missingPathValue, setMissingPathValue] = useState('initial')
  const [disabledCount, setDisabledCount] = useState(0)
  const [multiInputValue, setMultiInputValue] = useState<Record<string, any>>({ keep: 'keep' })
  const [mappedPayloadValue, setMappedPayloadValue] = useState('pending')
  const [configTransformResult, setConfigTransformResult] = useState('pending')
  const [suggestionResult, setSuggestionResult] = useState('pending')
  const [capabilityResult, setCapabilityResult] = useState('pending')

  useWidgetEventInputs(loopSourceWidget, {
    setValue: () => {
      emitLoopSource('loop.ping', { from: 'source-listener' }, 'system')
    },
  })

  useWidgetEventInputs(loopTargetWidget, {
    setValue: () => {
      emitLoopTarget('loop.pong', { from: 'target-listener' }, 'system')
    },
  })

  useWidgetEventInputs(debounceTargetWidget, {
    setValue: () => {
      setDebounceCount(count => count + 1)
    },
  })

  useWidgetEventInputs(inputDebounceTargetWidget, {
    setValue: () => {
      setInputDebounceCount(count => count + 1)
    },
  })

  useWidgetEventInputs(missingPathTargetWidget, {
    setValue: (params) => {
      setMissingPathValue(params.keyword === undefined ? 'undefined' : String(params.keyword))
    },
  })

  useWidgetEventInputs(disabledTargetWidget, {
    setValue: () => {
      setDisabledCount(count => count + 1)
    },
  })

  useWidgetEventInputs(multiInputTargetWidget, {
    setValue: (params) => {
      setMultiInputValue(prev => ({ ...prev, ...params }))
    },
  })

  useWidgetEventInputs(mappedPayloadTargetWidget, {
    setValue: (params) => {
      setMappedPayloadValue(params.jdt === undefined ? 'undefined' : String(params.jdt))
    },
  })

  return (
    <Card title="Runtime Probe" data-testid="runtime-probe-card">
      <Space>
        <button
          data-testid="clear-event-logs"
          type="button"
          onClick={() => clearWidgetEventLogs()}
        >
          clear logs
        </button>
        <button
          data-testid="start-loop"
          type="button"
          onClick={() => emitLoopSource('loop.ping', { from: 'button' }, 'system')}
        >
          start loop
        </button>
        <button
          data-testid="blocked-log-count"
          type="button"
          onClick={(event) => {
            event.currentTarget.textContent = String(getWidgetEventLogs().filter(log => log.status === 'blocked').length)
          }}
        >
          0
        </button>
        <button
          data-testid="fire-debounce"
          type="button"
          onClick={() => {
            setDebounceCount(0)
            emitDebounceSource('debounce.change', { value: 'a' }, 'change')
            emitDebounceSource('debounce.change', { value: 'b' }, 'change')
            emitDebounceSource('debounce.change', { value: 'c' }, 'change')
          }}
        >
          fire debounce
        </button>
        <span data-testid="debounce-count">{debounceCount}</span>
        <button
          data-testid="fire-input-debounce"
          type="button"
          onClick={() => {
            setInputDebounceCount(0)
            emitInputDebounceSource('input.debounce.change', { value: 'a' }, 'change')
            emitInputDebounceSource('input.debounce.change', { value: 'b' }, 'change')
            emitInputDebounceSource('input.debounce.change', { value: 'c' }, 'change')
          }}
        >
          fire input debounce
        </button>
        <span data-testid="input-debounce-count">{inputDebounceCount}</span>
        <button
          data-testid="fire-missing-path"
          type="button"
          onClick={() => emitMissingPathSource('missing.path', { existing: 'value' }, 'system')}
        >
          fire missing path
        </button>
        <span data-testid="missing-path-value">{missingPathValue}</span>
        <button
          data-testid="fire-disabled-output"
          type="button"
          onClick={() => emitDisabledSource('disabled.output', { value: 'disabled-output' }, 'system')}
        >
          fire disabled output
        </button>
        <button
          data-testid="fire-disabled-input"
          type="button"
          onClick={() => emitDisabledSource('disabled.input', { value: 'disabled-input' }, 'system')}
        >
          fire disabled input
        </button>
        <span data-testid="disabled-count">{disabledCount}</span>
        <button
          data-testid="fire-multi-input"
          type="button"
          onClick={() => {
            setMultiInputValue({ keep: 'keep' })
            emitMultiInputSource('multi.input', { first: 'one', second: 'two' }, 'system')
          }}
        >
          fire multi input
        </button>
        <span data-testid="multi-input-value">{JSON.stringify(multiInputValue)}</span>
        <button
          data-testid="fire-mapped-payload"
          type="button"
          onClick={() => {
            setMappedPayloadValue('pending')
            emitMappedPayloadSource('form.submit', { values: { keyword: 'mapped-keyword' } }, 'submit')
          }}
        >
          fire mapped payload
        </button>
        <span data-testid="mapped-payload-value">{mappedPayloadValue}</span>
        <button
          data-testid="run-config-transform"
          type="button"
          onClick={() => {
            const outputs = normalizeEventOutputsForSave([{
              id: 'output-1',
              enabled: true,
              eventName: 'form.submit',
              targetWidgetIds: ['target-1'],
              debounce: '123',
              payloadMappingList: [
                { target: 'keyword', source: 'payload.keyword' },
              ],
            }])
            const inputs = normalizeEventInputsForSave([{
              id: 'input-1',
              enabled: true,
              listenWidgetId: 'source-1',
              listenEventName: 'form.submit',
              action: 'setValue',
              mergeMode: 'merge',
              debounce: '456',
              paramMappingList: [
                { target: 'name', source: 'payload.name' },
              ],
            }])

            const passed = outputs[0]?.debounce === 123 &&
              outputs[0]?.payloadMapping?.keyword === 'payload.keyword' &&
              inputs[0]?.debounce === 456 &&
              inputs[0]?.paramMapping?.name === 'payload.name' &&
              !('mergeMode' in inputs[0])

            setConfigTransformResult(passed ? 'pass' : 'fail')
          }}
        >
          run config transform
        </button>
        <span data-testid="config-transform-result">{configTransformResult}</span>
        <button
          data-testid="run-field-suggestions"
          type="button"
          onClick={() => {
            const querySuggestions = buildWidgetEventFieldSuggestions({ sourceWidget: queryWidget, eventName: 'form.submit', logs: getWidgetEventLogs() })
            const tableSuggestions = buildWidgetEventFieldSuggestions({ sourceWidget: tableWidget, eventName: 'table.rowClick', logs: getWidgetEventLogs() })
            const searchSuggestions = buildWidgetEventFieldSuggestions({ sourceWidget: searchWidget, eventName: 'search.submit', logs: getWidgetEventLogs() })
            const unselectedEventSuggestions = buildWidgetEventFieldSuggestions({ sourceWidget: searchWidget, logs: getWidgetEventLogs() })
            const mappedSuggestions = buildWidgetEventFieldSuggestions({ sourceWidget: mappedPayloadSourceWidget, eventName: 'form.submit', targetWidgetId: mappedPayloadTargetWidget.id })
            const outputEditorSuggestions = buildWidgetEventFieldSuggestions({ sourceWidget: mappedPayloadSourceWidget, eventName: 'form.submit', useMappedOutput: false })
            const nativeFormOutputEditorSuggestions = buildWidgetEventFieldSuggestions({ sourceWidget: nativeFormSubmitNoneWidget, eventName: 'form.submit', useMappedOutput: false })
            const suggestionGroups = [
              ...querySuggestions,
              ...tableSuggestions,
              ...searchSuggestions,
              ...unselectedEventSuggestions,
            ].map(item => item.group)
            const passed = querySuggestions.some(item => item.value === 'payload.values.keyword') &&
              tableSuggestions.some(item => item.value === 'payload.row.name') &&
              searchSuggestions.some(item => item.value === 'payload.values.name') &&
              unselectedEventSuggestions.some(item => item.value === 'payload.values.keyword') &&
              mappedSuggestions.some(item => item.value === 'payload.key') &&
              outputEditorSuggestions.some(item => item.value === 'payload.values.keyword') &&
              nativeFormOutputEditorSuggestions.some(item => item.value === 'payload.values.nativeFormKeyword') &&
              !suggestionGroups.includes('通用字段') &&
              !suggestionGroups.includes('最近事件 Payload') &&
              !suggestionGroups.includes('常用字段')
            setSuggestionResult(passed ? 'pass' : 'fail')
          }}
        >
          run field suggestions
        </button>
        <span data-testid="field-suggestion-result">{suggestionResult}</span>
        <button
          data-testid="run-capability-check"
          type="button"
          onClick={() => {
            const dataTableActions = getWidgetEventCapability('dataTable')?.inputActions || []
            const chartActions = getWidgetEventCapability('chart')?.inputActions || []
            const queryActions = getWidgetEventCapability('queryFilter')?.inputActions || []
            const passed = !dataTableActions.includes('select') &&
              !chartActions.includes('highlight') &&
              queryActions.includes('setValue') &&
              queryActions.includes('reset')
            setCapabilityResult(passed ? 'pass' : 'fail')
          }}
        >
          run capability check
        </button>
        <span data-testid="capability-check-result">{capabilityResult}</span>
      </Space>
    </Card>
  )
}

const WidgetEventLinkageFixture: React.FC = () => (
  <ConfigProvider locale={zhCN}>
    <AntdApp>
      <div style={{ padding: 24 }}>
        <Typography.Title level={3}>Widget Event Linkage Fixture</Typography.Title>
        <Space direction="vertical" size={16} style={{ width: 720 }}>
          <Card title="Query Filter" data-testid="query-filter-card">
            <QueryFilterWidget config={queryWidget.config as any} widget={queryWidget} />
          </Card>
          <Card title="User Case Search" data-testid="user-case-search-card">
            <SearchWidget config={userCaseSearchWidget.config as any} widget={userCaseSearchWidget} />
          </Card>
          <Card title="User Case Query" data-testid="user-case-query-card">
            <QueryFilterWidget config={userCaseQueryWidget.config as any} widget={userCaseQueryWidget} />
          </Card>
          <Card title="Search" data-testid="search-card">
            <SearchWidget config={searchWidget.config as any} widget={searchWidget} />
          </Card>
          <Card title="Replace Search" data-testid="replace-search-card">
            <SearchWidget config={replaceSearchWidget.config as any} widget={replaceSearchWidget} />
          </Card>
          <Card title="Data Table" data-testid="table-card">
            <DataTableWidget config={tableWidget.config as any} widget={tableWidget} />
          </Card>
          <Card title="Search Driven Table" data-testid="search-table-card">
            <DataTableWidget config={searchDrivenTableWidget.config as any} widget={searchDrivenTableWidget} />
          </Card>
          <Card title="Chart" data-testid="chart-card">
            <ChartWidget config={chartWidget.config as any} widget={chartWidget} />
          </Card>
          <Card title="POST Table" data-testid="post-table-card">
            <DataTableWidget config={postTableWidget.config as any} widget={postTableWidget} />
          </Card>
          <Card title="Header Table" data-testid="header-table-card">
            <DataTableWidget config={headerTableWidget.config as any} widget={headerTableWidget} />
          </Card>
          <Card title="Indicator Card" data-testid="indicator-card">
            <IndicatorCardWidget config={indicatorCardWidget.config as any} widget={indicatorCardWidget} />
          </Card>
          <Card title="Custom Form" data-testid="custom-form-card">
            <CustomFormWidget config={customFormWidget.config as any} widget={customFormWidget} />
          </Card>
          <Card title="Native Field" data-testid="native-field-card">
            <NativeFormFieldWidget config={nativeFieldWidget.config as any} widget={nativeFieldWidget} />
          </Card>
          <Card title="Native Form Submit None" data-testid="native-form-submit-none-card">
            <NativeFormWidget config={nativeFormSubmitNoneWidget.config as any} widget={nativeFormSubmitNoneWidget} />
          </Card>
          <Card title="Native Form Submit Target" data-testid="native-form-submit-target-card">
            <SearchWidget config={nativeFormSubmitTargetWidget.config as any} widget={nativeFormSubmitTargetWidget} />
          </Card>
          <EventRuntimeProbe />
          <button
            data-testid="event-log-count"
            type="button"
            onClick={(event) => {
              event.currentTarget.textContent = String(getWidgetEventLogs().length)
            }}
          >
            0
          </button>
        </Space>
      </div>
    </AntdApp>
  </ConfigProvider>
)

export default WidgetEventLinkageFixture
