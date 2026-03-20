import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Table, Tag, Spin, Empty, Typography } from 'antd'
import { WidgetConfig, Widget } from '@/types'
import { safeIntervalMs } from '@/constants/dashboard'
import { requestWidgetApi } from '@/utils/widgetApi'
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

const DataTableWidget: React.FC<DataTableWidgetProps> = ({ config, widget }) => {
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageState, setPageState] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    serverSide: false,
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pageStateRef = useRef(pageState)

  const tableConfig = config as DataTableWidgetConfig
  const apiEndpoint = tableConfig?.apiEndpoint
  const refreshInterval = tableConfig?.refreshInterval || 0
  const columnsConfig = tableConfig?.columns || DEFAULT_COLUMNS
  const staticData = tableConfig?.tableData
  const rowKey = tableConfig?.rowKey || 'key'
  const legacyPaginationConfig = tableConfig?.pagination
  const paginationMode =
    tableConfig?.paginationMode || (legacyPaginationConfig ? 'pagination' : 'none')
  const paginationConfig = tableConfig?.paginationConfig || {}
  const defaultListField = getWidgetDefaultFieldValue('dataTable')
  const defaultPagination = getWidgetPaginationDefaults('dataTable')
  const scrollY = tableConfig?.scrollY || 240
  const scrollX = tableConfig?.scrollX
  const bordered = tableConfig?.bordered ?? false
  const size = tableConfig?.size || 'small'
  const showTableHeader = tableConfig?.showHeader ?? true

  useEffect(() => {
    pageStateRef.current = pageState
  }, [pageState])

  useEffect(() => {
    const defaultPageSize =
      paginationConfig.pageSize ||
      (typeof legacyPaginationConfig === 'object' ? legacyPaginationConfig.pageSize : undefined) ||
      10

    setPageState(prev => ({
      ...prev,
      current: paginationConfig.page || 1,
      pageSize: defaultPageSize,
    }))
  }, [legacyPaginationConfig, paginationConfig.page, paginationConfig.pageSize])

  const loadData = useCallback(
    async (nextPageState = pageStateRef.current) => {
      setLoading(true)
      setError(null)

      try {
        if (apiEndpoint) {
          const result = await requestWidgetApi(
            {
              endpoint: apiEndpoint,
              method: tableConfig?.apiMethod,
              headers: tableConfig?.apiHeaders,
              query: tableConfig?.apiQuery,
              body: tableConfig?.apiBody,
              dataField: tableConfig?.apiDataField,
              listField: tableConfig?.apiListField || defaultListField,
              pagination:
                paginationMode === 'pagination'
                  ? {
                      mode: 'pagination',
                      pageParam: paginationConfig.pageParam || defaultPagination?.pageParam,
                      pageSizeParam:
                        paginationConfig.pageSizeParam || defaultPagination?.pageSizeParam,
                      totalField: paginationConfig.totalField || defaultPagination?.totalField,
                      currentField:
                        paginationConfig.currentField || defaultPagination?.currentField,
                      pageSizeField:
                        paginationConfig.pageSizeField || defaultPagination?.pageSizeField,
                    }
                  : undefined,
            },
            paginationMode === 'pagination'
              ? { current: nextPageState.current, pageSize: nextPageState.pageSize }
              : undefined,
          )

          const sourceList = result.list.length
            ? result.list
            : Array.isArray(result.data)
              ? result.data
              : []
          const normalizedList = sourceList.map((item, index) => ({
            ...item,
            [rowKey]: item?.[rowKey] || `row-${index}`,
          }))

          setTableData(normalizedList)

          if (paginationMode === 'pagination') {
            setPageState({
              current: result.pagination.current || nextPageState.current,
              pageSize: result.pagination.pageSize || nextPageState.pageSize,
              total: result.pagination.total || normalizedList.length,
              serverSide: result.pagination.serverSide,
            })
          }
        } else if (staticData && staticData.length > 0) {
          setTableData(staticData)
          if (paginationMode === 'pagination') {
            setPageState(prev => ({
              ...prev,
              total: staticData.length,
              serverSide: false,
            }))
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 300))
          setTableData(DEFAULT_DATA)
          if (paginationMode === 'pagination') {
            setPageState(prev => ({
              ...prev,
              total: DEFAULT_DATA.length,
              serverSide: false,
            }))
          }
        }
      } catch (err: any) {
        console.error('加载表格数据失败:', err)
        setError(err.message || '数据加载失败')
      } finally {
        setLoading(false)
      }
    },
    [
      apiEndpoint,
      paginationConfig.currentField,
      paginationConfig.pageParam,
      paginationConfig.pageSizeField,
      paginationConfig.pageSizeParam,
      paginationConfig.totalField,
      paginationMode,
      rowKey,
      staticData,
      defaultListField,
      defaultPagination?.currentField,
      defaultPagination?.pageParam,
      defaultPagination?.pageSizeField,
      defaultPagination?.pageSizeParam,
      defaultPagination?.totalField,
      tableConfig?.apiBody,
      tableConfig?.apiDataField,
      tableConfig?.apiHeaders,
      tableConfig?.apiListField,
      tableConfig?.apiMethod,
      tableConfig?.apiQuery,
    ],
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (refreshInterval > 0 && apiEndpoint) {
      intervalRef.current = setInterval(() => {
        loadData()
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
      loadData()
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
            const aVal = a[col.dataIndex]
            const bVal = b[col.dataIndex]
            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return aVal - bVal
            }
            return String(aVal || '').localeCompare(String(bVal || ''))
          }
        : undefined,
      render: (value: any) => renderColumnContent(col, value),
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
      showSizeChanger: true,
      showTotal: showTotal ? total => `共 ${total} 条` : undefined,
      onChange: (current, pageSize) => {
        const next = {
          current,
          pageSize: pageSize || pageState.pageSize,
          total: pageState.total,
          serverSide: pageState.serverSide,
        }
        setPageState(next)
        if (pageState.serverSide && apiEndpoint) {
          loadData(next)
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
  )
}

export default DataTableWidget
