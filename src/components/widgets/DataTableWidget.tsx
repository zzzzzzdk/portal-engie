import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Table, Tag, Spin, Empty, Typography } from 'antd'
import { WidgetConfig, Widget } from '@/types'
import { safeIntervalMs } from '@/constants/dashboard'
import { getPaginationSizeOptions } from '@/constants/pagination'
import { getValueByPath, requestWidgetApi } from '@/utils/widgetApi'
import { getWidgetDefaultFieldValue, getWidgetPaginationDefaults } from '@/utils/widgetApiDefaults'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'

interface ColumnConfig {
  key: string
  title: string
  dataIndex: string
  width?: number | string
  align?: 'left' | 'center' | 'right'
  type?: 'text' | 'number' | 'tag' | 'date' | 'status'
  tagColorMap?: Record<string, string>
  statusConfig?: { success: string[]; error: string[]; warning: string[] }
  ellipsis?: boolean
  fixed?: 'left' | 'right'
  sorter?: boolean
}

interface DataTableWidgetConfig extends WidgetConfig {
  columns?: ColumnConfig[]
  tableData?: any[]
  staticData?: any[]
  rowKey?: string
  pagination?: boolean | { pageSize?: number; showTotal?: boolean }
  scrollY?: number
  scrollX?: number | string
  bordered?: boolean
  size?: 'small' | 'middle' | 'large'
  showHeader?: boolean
}

interface DataTableWidgetProps {
  config?: DataTableWidgetConfig
  widget?: Widget
}

interface SharedPaginationState {
  current: number
  pageSize: number
  total: number
  serverSide: boolean
}

interface CachedTableRequestState {
  rows: any[]
  pagination: SharedPaginationState
}

interface SharedTableViewState {
  rows: any[]
  loading: boolean
  error: string | null
  pagination: SharedPaginationState
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', title: '姓名', dataIndex: 'name' },
  { key: 'age', title: '年龄', dataIndex: 'age', type: 'number' },
  { key: 'status', title: '状态', dataIndex: 'status', type: 'tag' },
]

const DEFAULT_DATA = [
  { key: '1', name: '张三', age: 32, status: '在线' },
  { key: '2', name: '李四', age: 42, status: '离线' },
  { key: '3', name: '王五', age: 28, status: '在线' },
]

const EMPTY_ARRAY: any[] = []

const dataTableRequestCache = new Map<string, CachedTableRequestState>()
const dataTableInFlightRequests = new Map<string, Promise<CachedTableRequestState>>()
const dataTableViewStateCache = new Map<string, SharedTableViewState>()

const createPaginationState = (
  current = 1,
  pageSize = 10,
  total = 0,
  serverSide = false,
): SharedPaginationState => ({
  current,
  pageSize,
  total,
  serverSide,
})

const buildStableText = (value: unknown) => {
  if (value == null || value === '') {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

const normalizeTableRows = (list: any[], rowKey: string) =>
  list.map((item, index) => ({
    ...item,
    [rowKey]: item?.[rowKey] || `row-${index}`,
  }))

const getColumnValue = (record: any, dataIndex?: string) => {
  if (!dataIndex) {
    return undefined
  }

  return getValueByPath(record, dataIndex)
}

const buildDataTableViewStateKey = (params: {
  widgetId?: string
  dataSource: 'api' | 'static' | 'default'
  apiEndpoint?: string
  apiMethod?: string
  apiHeadersText?: string
  apiQuery?: string
  apiBody?: string
  apiDataField?: string
  apiListField?: string
  timeout?: number
  paginationMode?: string
  paginationConfig?: Record<string, any>
  staticDataText?: string
  rowKey?: string
}) =>
  JSON.stringify({
    widgetId: params.widgetId || '',
    dataSource: params.dataSource,
    endpoint: params.apiEndpoint || '',
    method: params.apiMethod || 'GET',
    headers: params.apiHeadersText || '',
    query: params.apiQuery || '',
    body: params.apiBody || '',
    dataField: params.apiDataField || '',
    listField: params.apiListField || '',
    timeout: params.timeout || 0,
    paginationMode: params.paginationMode || 'none',
    paginationConfig: params.paginationConfig || {},
    staticDataText: params.staticDataText || '',
    rowKey: params.rowKey || 'key',
  })

const buildDataTableRequestKey = (viewStateKey: string, pageState: { current: number; pageSize: number }) =>
  JSON.stringify({
    viewStateKey,
    current: pageState.current,
    pageSize: pageState.pageSize,
  })

const buildSharedTableViewState = (
  rows: any[],
  pagination: SharedPaginationState,
  loading: boolean,
  error: string | null,
): SharedTableViewState => ({
  rows,
  loading,
  error,
  pagination: { ...pagination },
})

const stopEventPropagation = (event: React.MouseEvent<HTMLElement>) => {
  event.stopPropagation()
}

const stopPointerEventPropagation = (event: React.MouseEvent<HTMLElement>) => {
  event.stopPropagation()
}

const DataTableWidget: React.FC<DataTableWidgetProps> = ({ config, widget }) => {
  const tableConfig = config as DataTableWidgetConfig
  const apiEndpoint = tableConfig?.apiEndpoint
  const isStaticDataSource = tableConfig?.dataSource === 'static'
  const refreshInterval = tableConfig?.refreshInterval || 0
  const columnsConfig = tableConfig?.columns || DEFAULT_COLUMNS
  const staticData = useMemo(() => {
    if (Array.isArray(tableConfig?.staticData)) {
      return tableConfig.staticData
    }

    if (Array.isArray(tableConfig?.tableData)) {
      return tableConfig.tableData
    }

    return EMPTY_ARRAY
  }, [tableConfig?.staticData, tableConfig?.tableData])
  const rowKey = tableConfig?.rowKey || 'key'
  const legacyPaginationConfig = tableConfig?.pagination
  const paginationMode =
    tableConfig?.paginationMode || (legacyPaginationConfig ? 'pagination' : 'none')
  const paginationConfig = tableConfig?.paginationConfig || {}
  const initialPageSize = useMemo(
    () =>
      paginationConfig.pageSize ||
      (typeof legacyPaginationConfig === 'object' ? legacyPaginationConfig.pageSize : undefined) ||
      10,
    [legacyPaginationConfig, paginationConfig.pageSize],
  )
  const initialCurrent = useMemo(() => paginationConfig.page || 1, [paginationConfig.page])
  const apiHeadersText = useMemo(
    () => (tableConfig?.apiHeaders ? JSON.stringify(tableConfig.apiHeaders) : ''),
    [tableConfig?.apiHeaders],
  )
  const apiHeaders = useMemo(
    () => (apiHeadersText ? JSON.parse(apiHeadersText) as Record<string, string> : undefined),
    [apiHeadersText],
  )
  const apiQuery = useMemo(
    () =>
      typeof tableConfig?.apiQuery === 'string'
        ? tableConfig.apiQuery
        : tableConfig?.apiQuery != null
          ? JSON.stringify(tableConfig.apiQuery)
          : undefined,
    [tableConfig?.apiQuery],
  )
  const apiBody = useMemo(
    () =>
      typeof tableConfig?.apiBody === 'string'
        ? tableConfig.apiBody
        : tableConfig?.apiBody != null
          ? JSON.stringify(tableConfig.apiBody)
          : undefined,
    [tableConfig?.apiBody],
  )
  const staticDataText = useMemo(() => buildStableText(staticData), [staticData])
  const defaultListField = getWidgetDefaultFieldValue('dataTable')
  const defaultPagination = getWidgetPaginationDefaults('dataTable')
  const scrollY = tableConfig?.scrollY || 240
  const scrollX = tableConfig?.scrollX
  const bordered = tableConfig?.bordered ?? false
  const size = tableConfig?.size || 'small'
  const showTableHeader = tableConfig?.showHeader ?? true
  const initialPaginationState = useMemo(
    () => createPaginationState(initialCurrent, initialPageSize),
    [initialCurrent, initialPageSize],
  )
  const viewStateKey = useMemo(
    () =>
      buildDataTableViewStateKey({
        widgetId: widget?.id,
        dataSource: apiEndpoint ? 'api' : isStaticDataSource ? 'static' : 'default',
        apiEndpoint,
        apiMethod: tableConfig?.apiMethod,
        apiHeadersText,
        apiQuery,
        apiBody,
        apiDataField: tableConfig?.apiDataField,
        apiListField: tableConfig?.apiListField || defaultListField,
        timeout: tableConfig?.timeout,
        paginationMode,
        paginationConfig: {
          page: paginationConfig.page || 1,
          pageSize:
            paginationConfig.pageSize ||
            (typeof legacyPaginationConfig === 'object' ? legacyPaginationConfig.pageSize : undefined) ||
            10,
          pageParam: paginationConfig.pageParam || defaultPagination?.pageParam,
          pageSizeParam: paginationConfig.pageSizeParam || defaultPagination?.pageSizeParam,
          totalField: paginationConfig.totalField || defaultPagination?.totalField,
          currentField: paginationConfig.currentField || defaultPagination?.currentField,
          pageSizeField: paginationConfig.pageSizeField || defaultPagination?.pageSizeField,
          showTotal: paginationConfig.showTotal ?? false,
        },
        staticDataText,
        rowKey,
      }),
    [
      apiBody,
      apiEndpoint,
      apiHeadersText,
      apiQuery,
      defaultListField,
      defaultPagination?.currentField,
      defaultPagination?.pageParam,
      defaultPagination?.pageSizeField,
      defaultPagination?.pageSizeParam,
      defaultPagination?.totalField,
      isStaticDataSource,
      legacyPaginationConfig,
      paginationConfig.page,
      paginationConfig.currentField,
      paginationConfig.pageParam,
      paginationConfig.pageSize,
      paginationConfig.pageSizeField,
      paginationConfig.pageSizeParam,
      paginationConfig.showTotal,
      paginationConfig.totalField,
      paginationMode,
      rowKey,
      staticDataText,
      tableConfig?.apiDataField,
      tableConfig?.apiListField,
      tableConfig?.apiMethod,
      tableConfig?.timeout,
      widget?.id,
    ],
  )
  const cachedInitialViewState = dataTableViewStateCache.get(viewStateKey)

  const [tableData, setTableData] = useState<any[]>(() => cachedInitialViewState?.rows || [])
  const [loading, setLoading] = useState<boolean>(() => cachedInitialViewState?.loading ?? Boolean(apiEndpoint))
  const [error, setError] = useState<string | null>(() => cachedInitialViewState?.error ?? null)
  const [pageState, setPageState] = useState<SharedPaginationState>(
    () => cachedInitialViewState?.pagination || initialPaginationState,
  )
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pageStateRef = useRef(pageState)
  const tableDataRef = useRef(tableData)
  const pageSizeOptions = useMemo(
    () => getPaginationSizeOptions(pageState.pageSize).map(value => String(value)),
    [pageState.pageSize],
  )

  useEffect(() => {
    pageStateRef.current = pageState
  }, [pageState])

  useEffect(() => {
    tableDataRef.current = tableData
  }, [tableData])

  const applySharedViewState = useCallback((nextState: SharedTableViewState) => {
    setTableData(nextState.rows)
    setLoading(nextState.loading)
    setError(nextState.error)
    setPageState(prev => {
      const nextPagination = nextState.pagination
      if (
        prev.current === nextPagination.current &&
        prev.pageSize === nextPagination.pageSize &&
        prev.total === nextPagination.total &&
        prev.serverSide === nextPagination.serverSide
      ) {
        return prev
      }

      return nextPagination
    })
  }, [])

  const persistSharedViewState = useCallback((nextState: SharedTableViewState) => {
    dataTableViewStateCache.set(viewStateKey, nextState)
    applySharedViewState(nextState)
  }, [applySharedViewState, viewStateKey])

  useEffect(() => {
    const cachedViewState = dataTableViewStateCache.get(viewStateKey)
    if (cachedViewState) {
      pageStateRef.current = cachedViewState.pagination
      applySharedViewState(cachedViewState)
      return
    }

    const nextInitialPagination = createPaginationState(initialCurrent, initialPageSize)
    pageStateRef.current = nextInitialPagination

    setPageState(prev => {
      if (prev.current === initialCurrent && prev.pageSize === initialPageSize) {
        return prev
      }

      return {
        ...prev,
        current: initialCurrent,
        pageSize: initialPageSize,
      }
    })
  }, [applySharedViewState, initialCurrent, initialPageSize, viewStateKey])

  const loadData = useCallback(
    async (nextPageState = pageStateRef.current, options?: { force?: boolean }) => {
      const requestKey = buildDataTableRequestKey(viewStateKey, nextPageState)
      const cachedViewState = dataTableViewStateCache.get(viewStateKey)

      if (apiEndpoint) {
        const requestPaginationConfig =
          paginationMode === 'pagination'
            ? {
                mode: 'pagination' as const,
                pageParam: paginationConfig.pageParam || defaultPagination?.pageParam,
                pageSizeParam: paginationConfig.pageSizeParam || defaultPagination?.pageSizeParam,
                totalField: paginationConfig.totalField || defaultPagination?.totalField,
                currentField: paginationConfig.currentField || defaultPagination?.currentField,
                pageSizeField: paginationConfig.pageSizeField || defaultPagination?.pageSizeField,
              }
            : undefined

        if (!options?.force) {
          const cachedRequestState = dataTableRequestCache.get(requestKey)
          if (cachedRequestState) {
            persistSharedViewState(buildSharedTableViewState(
              cachedRequestState.rows,
              cachedRequestState.pagination,
              false,
              null,
            ))
            return
          }
        }

        let requestPromise = dataTableInFlightRequests.get(requestKey)

        if (!requestPromise || options?.force) {
          persistSharedViewState(buildSharedTableViewState(
            cachedViewState?.rows || tableDataRef.current,
            cachedViewState?.pagination || createPaginationState(nextPageState.current, nextPageState.pageSize),
            true,
            null,
          ))

          requestPromise = requestWidgetApi(
            {
              endpoint: apiEndpoint,
              method: tableConfig?.apiMethod,
              headers: apiHeaders,
              query: apiQuery,
              body: apiBody,
              dataField: tableConfig?.apiDataField,
              listField: tableConfig?.apiListField || defaultListField,
              timeout: tableConfig?.timeout,
              pagination: requestPaginationConfig,
            },
            paginationMode === 'pagination'
              ? { current: nextPageState.current, pageSize: nextPageState.pageSize }
              : undefined,
          ).then(result => {
            const sourceList = result.list.length
              ? result.list
              : Array.isArray(result.data)
                ? result.data
                : []
            const normalizedList = normalizeTableRows(sourceList, rowKey)
            const requestState = {
              rows: normalizedList,
              pagination: createPaginationState(
                result.pagination.current || nextPageState.current,
                result.pagination.pageSize || nextPageState.pageSize,
                result.pagination.total || normalizedList.length,
                result.pagination.serverSide,
              ),
            }

            dataTableRequestCache.set(requestKey, requestState)
            return requestState
          }).finally(() => {
            if (dataTableInFlightRequests.get(requestKey) === requestPromise) {
              dataTableInFlightRequests.delete(requestKey)
            }
          })

          dataTableInFlightRequests.set(requestKey, requestPromise)
        }

        try {
          const requestState = await requestPromise
          persistSharedViewState(buildSharedTableViewState(
            requestState.rows,
            requestState.pagination,
            false,
            null,
          ))
        } catch (err: any) {
          persistSharedViewState(buildSharedTableViewState(
            cachedViewState?.rows || tableDataRef.current,
            cachedViewState?.pagination || createPaginationState(nextPageState.current, nextPageState.pageSize),
            false,
            err?.message || '数据加载失败',
          ))
        }

        return
      }

      if (isStaticDataSource) {
        const normalizedList = normalizeTableRows(staticData, rowKey)
        persistSharedViewState(buildSharedTableViewState(
          normalizedList,
          createPaginationState(nextPageState.current, nextPageState.pageSize, normalizedList.length, false),
          false,
          null,
        ))
        return
      }

      persistSharedViewState(buildSharedTableViewState(
        DEFAULT_DATA,
        createPaginationState(nextPageState.current, nextPageState.pageSize, DEFAULT_DATA.length, false),
        false,
        null,
      ))
    },
    [
      apiBody,
      apiEndpoint,
      apiHeaders,
      apiQuery,
      defaultListField,
      defaultPagination?.currentField,
      defaultPagination?.pageParam,
      defaultPagination?.pageSizeField,
      defaultPagination?.pageSizeParam,
      defaultPagination?.totalField,
      isStaticDataSource,
      paginationConfig.currentField,
      paginationConfig.pageParam,
      paginationConfig.pageSizeField,
      paginationConfig.pageSizeParam,
      paginationConfig.totalField,
      paginationMode,
      persistSharedViewState,
      rowKey,
      staticData,
      tableConfig?.apiDataField,
      tableConfig?.apiListField,
      tableConfig?.apiMethod,
      tableConfig?.timeout,
      viewStateKey,
    ],
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (refreshInterval > 0 && apiEndpoint) {
      intervalRef.current = setInterval(() => {
        loadData(pageStateRef.current, { force: true })
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
    if (widget?.refreshCount && widget.refreshCount > 0) {
      loadData(pageStateRef.current, { force: true })
    }
  }, [widget?.refreshCount, loadData])

  const renderColumnContent = (colConfig: ColumnConfig, value: any) => {
    switch (colConfig.type) {
      case 'tag':
        if (Array.isArray(value)) {
          return (
            <>
              {value.map((tag: string, index: number) => {
                const color = colConfig.tagColorMap?.[tag] || (tag.length > 5 ? 'geekblue' : 'green')
                return (
                  <Tag color={color} key={`${tag}-${index}`}>
                    {tag}
                  </Tag>
                )
              })}
            </>
          )
        }
        return <Tag color={colConfig.tagColorMap?.[value] || 'blue'}>{value}</Tag>

      case 'status': {
        const { success = [], error: err = [], warning = [] } = colConfig.statusConfig || {}
        let statusColor = 'default'
        if (success.includes(value)) statusColor = 'success'
        else if (err.includes(value)) statusColor = 'error'
        else if (warning.includes(value)) statusColor = 'warning'
        return <Tag color={statusColor}>{value}</Tag>
      }

      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value

      case 'date':
        if (value) {
          try {
            return new Date(value).toLocaleDateString('zh-CN')
          } catch {
            return value
          }
        }
        return '-'

      case 'text':
      default:
        if (colConfig.ellipsis) {
          return <Typography.Text ellipsis={{ tooltip: value }}>{value ?? '-'}</Typography.Text>
        }
        return value ?? '-'
    }
  }

  const generateColumns = useCallback((): ColumnsType<any> => {
    return columnsConfig.map(col => ({
      key: col.key,
      title: col.title,
      dataIndex: col.dataIndex,
      width: col.width,
      align: col.align,
      ellipsis: col.ellipsis,
      fixed: col.fixed,
      sorter: col.sorter
        ? (a: any, b: any) => {
            const aVal = getColumnValue(a, col.dataIndex)
            const bVal = getColumnValue(b, col.dataIndex)
            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return aVal - bVal
            }
            return String(aVal || '').localeCompare(String(bVal || ''))
          }
        : undefined,
      render: (_value: any, record: any) => renderColumnContent(col, getColumnValue(record, col.dataIndex)),
    }))
  }, [columnsConfig])

  const getPagination = (): false | TablePaginationConfig => {
    if (paginationMode !== 'pagination') {
      return false
    }

    const showTotal =
      paginationConfig.showTotal ??
      (typeof legacyPaginationConfig === 'object' ? legacyPaginationConfig.showTotal : false)

    return {
      current: pageState.current,
      pageSize: pageState.pageSize,
      total: pageState.total,
      pageSizeOptions,
      showSizeChanger: pageSizeOptions.length > 1
        ? {
            getPopupContainer: triggerNode =>
              tableContainerRef.current || triggerNode.parentElement || document.body,
            onMouseDown: stopPointerEventPropagation,
            onClick: stopEventPropagation,
          }
        : false,
      showTotal: showTotal ? total => `共 ${total} 条` : undefined,
      onShowSizeChange: (_current, size) => {
        const next = {
          current: 1,
          pageSize: size,
          total: pageState.total,
          serverSide: pageState.serverSide,
        }

        persistSharedViewState(buildSharedTableViewState(
          tableDataRef.current,
          next,
          false,
          error,
        ))

        if (paginationMode === 'pagination' && apiEndpoint) {
          loadData(next, { force: true })
        }
      },
      onChange: (current, pageSize) => {
        const nextPageSize = pageSize || pageState.pageSize
        const next = {
          current: nextPageSize !== pageState.pageSize ? 1 : current,
          pageSize: nextPageSize,
          total: pageState.total,
          serverSide: pageState.serverSide,
        }

        persistSharedViewState(buildSharedTableViewState(
          tableDataRef.current,
          next,
          false,
          error,
        ))

        if (paginationMode === 'pagination' && apiEndpoint) {
          loadData(next, { force: true })
        }
      },
    }
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={error} />
      </div>
    )
  }

  return (
    <div
      ref={tableContainerRef}
      onMouseDown={stopPointerEventPropagation}
      onClick={stopEventPropagation}
    >
      <Spin spinning={loading}>
        <Table
          columns={generateColumns()}
          dataSource={tableData}
          rowKey={rowKey}
          pagination={getPagination()}
          size={size}
          bordered={bordered}
          showHeader={showTableHeader}
          scroll={{ y: scrollY, x: scrollX }}
        />
      </Spin>
    </div>
  )
}

export default DataTableWidget
