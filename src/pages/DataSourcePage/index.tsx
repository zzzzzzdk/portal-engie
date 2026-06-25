import React, { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import WidgetApiConfigTabs, {
  type WidgetApiConfigTabOption,
} from '@/components/WidgetApiConfigTabs'
import WidgetApiDebugButton from '@/components/WidgetApiDebugButton'
import { useTableScroll } from '@/hooks/useTableScroll'
import {
  createDataSource,
  deleteDataSource,
  getDataSourceDetail,
  getDataSourceList,
  updateDataSource,
  type DataSourceItem,
  type DataSourceSaveParams,
} from '@/services'
import { keyValueListToObject } from '@/utils/widgetApi'
import './index.scss'

const HEADER_KEY_OPTIONS: WidgetApiConfigTabOption[] = [
  { label: 'Accept', value: 'Accept' },
  { label: 'Authorization', value: 'Authorization' },
  { label: 'Content-Type', value: 'Content-Type' },
  { label: 'User-Agent', value: 'User-Agent' },
  { label: 'X-Requested-With', value: 'X-Requested-With' },
  { label: 'Cache-Control', value: 'Cache-Control' },
]

const DATA_SOURCE_DEBUG_PAGE_STATE = {
  current: 1,
  pageSize: 10,
}

const DEFAULT_FORM_VALUES = {
  name: '',
  method: 'GET',
  url: '',
  description: '',
  listField: 'data.list',
  timeout: 10,
  requestConfig: {
    headersList: [],
    queryList: [],
    bodyList: [],
    pagination: {
      mode: 'none',
      pageParam: 'page',
      pageSizeParam: 'page_size',
      totalField: 'data.total',
      currentField: 'data.page',
      pageSizeField: 'data.page_size',
      showTotal: true,
    },
  },
}

const mergeFormValues = (record?: DataSourceItem | null) => ({
  ...DEFAULT_FORM_VALUES,
  ...record,
  method: record?.method || DEFAULT_FORM_VALUES.method,
  listField: record?.listField || DEFAULT_FORM_VALUES.listField,
  timeout: record?.timeout || DEFAULT_FORM_VALUES.timeout,
  requestConfig: {
    ...DEFAULT_FORM_VALUES.requestConfig,
    ...(record?.requestConfig || {}),
    pagination: {
      ...DEFAULT_FORM_VALUES.requestConfig.pagination,
      ...(record?.requestConfig?.pagination || {}),
    },
    headersList: record?.requestConfig?.headersList || [],
    queryList: record?.requestConfig?.queryList || [],
    bodyList: record?.requestConfig?.bodyList || [],
  },
})

const buildSubmitPayload = (
  values: any,
  currentRecord: DataSourceItem | null,
): DataSourceSaveParams => {
  const method = values.method === 'POST' ? 'POST' : 'GET'

  return {
    ...(currentRecord?.id ? { id: currentRecord.id } : {}),
    name: String(values.name || '').trim(),
    method,
    url: String(values.url || '').trim(),
    description: String(values.description || '').trim(),
    listField: String(values.listField || '').trim() || 'data.list',
    timeout: Number(values.timeout),
    requestConfig: {
      headersList: Array.isArray(values.requestConfig?.headersList)
        ? values.requestConfig.headersList
        : [],
      queryList: Array.isArray(values.requestConfig?.queryList)
        ? values.requestConfig.queryList
        : [],
      bodyList:
        method === 'POST' && Array.isArray(values.requestConfig?.bodyList)
          ? values.requestConfig.bodyList
          : [],
      pagination: {
        mode: values.requestConfig?.pagination?.mode || DEFAULT_FORM_VALUES.requestConfig.pagination.mode,
        pageParam:
          String(values.requestConfig?.pagination?.pageParam || '').trim()
          || DEFAULT_FORM_VALUES.requestConfig.pagination.pageParam,
        pageSizeParam:
          String(values.requestConfig?.pagination?.pageSizeParam || '').trim()
          || DEFAULT_FORM_VALUES.requestConfig.pagination.pageSizeParam,
        totalField:
          String(values.requestConfig?.pagination?.totalField || '').trim()
          || DEFAULT_FORM_VALUES.requestConfig.pagination.totalField,
        currentField:
          String(values.requestConfig?.pagination?.currentField || '').trim()
          || DEFAULT_FORM_VALUES.requestConfig.pagination.currentField,
        pageSizeField:
          String(values.requestConfig?.pagination?.pageSizeField || '').trim()
          || DEFAULT_FORM_VALUES.requestConfig.pagination.pageSizeField,
        showTotal:
          values.requestConfig?.pagination?.showTotal
          ?? DEFAULT_FORM_VALUES.requestConfig.pagination.showTotal,
      },
    },
  }
}

const renderPairList = (
  list?: Array<{ key?: string; value?: string }>,
  emptyText = '暂无配置',
) => {
  if (!Array.isArray(list) || !list.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
  }

  return (
    <div className="data-source-page__pair-list">
      {list.map((item, index) => (
        <div key={`${item.key || 'row'}-${index}`} className="data-source-page__pair-item">
          <Tag>{item.key || '--'}</Tag>
          <span>{item.value || '--'}</span>
        </div>
      ))}
    </div>
  )
}

const DataSourcePage: React.FC = () => {
  const [form] = Form.useForm()
  const { scrollY } = useTableScroll({ headerHeight: 194, footerHeight: 76 })
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [currentKeyword, setCurrentKeyword] = useState('')
  const [list, setList] = useState<DataSourceItem[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [currentRecord, setCurrentRecord] = useState<DataSourceItem | null>(null)

  const currentMethod = Form.useWatch('method', form) || 'GET'
  const paginationMode = Form.useWatch(['requestConfig', 'pagination', 'mode'], form) || 'none'

  const fetchList = useCallback(async (page: number, pageSize: number, nextKeyword = '') => {
    setLoading(true)
    try {
      const res = await getDataSourceList({
        page,
        page_size: pageSize,
        keyword: nextKeyword || undefined,
      })

      if (res.code === 20000 && res.data) {
        setList(res.data.list || [])
        setPagination({
          current: res.data.page || page,
          pageSize: res.data.page_size || pageSize,
          total: res.data.total || 0,
        })
        return
      }

    } catch (error) {
      console.error('加载数据源列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList(1, 10, '')
  }, [fetchList])

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await getDataSourceDetail({ id })
      if (res.code === 20000 && res.data) {
        setCurrentRecord(res.data)
        return res.data
      }

      return null
    } catch (error) {
      console.error('加载数据源详情失败:', error)
      return null
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleSearch = () => {
    const nextKeyword = keyword.trim()
    setCurrentKeyword(nextKeyword)
    fetchList(1, pagination.pageSize, nextKeyword)
  }

  const handlePageChange = (page: number, pageSize: number) => {
    fetchList(page, pageSize, currentKeyword)
  }

  const handleOpenCreate = () => {
    setFormMode('create')
    setCurrentRecord(null)
    form.resetFields()
    form.setFieldsValue(mergeFormValues())
    setFormModalOpen(true)
  }

  const handleOpenEdit = async (id: string) => {
    setCurrentRecord(null)
    const detail = await loadDetail(id)
    if (!detail) {
      return
    }

    setFormMode('edit')
    form.resetFields()
    form.setFieldsValue(mergeFormValues(detail))
    setFormModalOpen(true)
  }

  const handleOpenDetail = async (id: string) => {
    setCurrentRecord(null)
    setDetailModalOpen(true)
    await loadDetail(id)
  }

  const handleDelete = async (record: DataSourceItem) => {
    try {
      const res = await deleteDataSource({ id: record.id })
      if (res.code !== 20000) {
        return
      }

      message.success('删除数据源成功')
      const targetPage = list.length === 1 && pagination.current > 1
        ? pagination.current - 1
        : pagination.current
      fetchList(targetPage, pagination.pageSize, currentKeyword)
    } catch (error) {
      console.error('删除数据源失败:', error)
    }
  }

  const handleFormModalAfterOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    form.resetFields()
    setCurrentRecord(null)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = buildSubmitPayload(values, currentRecord)
      setSaving(true)

      const request = formMode === 'create'
        ? createDataSource(payload)
        : updateDataSource(payload)
      const res = await request

      if (res.code !== 20000) {
        return
      }

      message.success(formMode === 'create' ? '新增数据源成功' : '更新数据源成功')
      setFormModalOpen(false)
      fetchList(formMode === 'create' ? 1 : pagination.current, pagination.pageSize, currentKeyword)
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error('保存数据源失败:', error)
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnsType<DataSourceItem> = [
    {
      title: '数据源名称',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      align: "center",
      ellipsis: true,
      render: (_value, record) => (
        <div className="data-source-name-cell">
          <div className="data-source-name-cell__name" title={record.name}>{record.name}</div>
          <div className="data-source-name-cell__description" title={record.description}>{record.description || '暂无描述'}</div>
        </div>
      ),
    },
    {
      title: '请求方式',
      dataIndex: 'method',
      key: 'method',
      width: 90,
      align: "center",
      render: (value: DataSourceItem['method']) => (
        <Tag color={value === 'POST' ? 'processing' : 'success'}>{value}</Tag>
      ),
    },
    {
      title: '接口地址',
      dataIndex: 'url',
      key: 'url',
      align: "center",
      ellipsis: true,
      render: (value: string) => (

        <Typography.Text copyable={{ text: value }} className="data-source-page__url-text">
          <div className='text' title={value}>{value}</div>
        </Typography.Text>
      ),
    },
    {
      title: '列表字段路径',
      dataIndex: 'listField',
      key: 'listField',
      width: 180,
      align: "center",
      ellipsis: true,
      render: (value?: string) => value || 'data.list',
    },
    {
      title: '查询超时',
      dataIndex: 'timeout',
      key: 'timeout',
      width: 96,
      align: "center",
      render: (value: number) => `${value}s`,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      align: "center",
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      align: "center",
      render: (_value, record) => (
        <Space size={[4, 0]} wrap>
          <Button type="link" icon={<EyeOutlined />} onClick={() => void handleOpenDetail(record.id)}>
            查看
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => void handleOpenEdit(record.id)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该数据源吗？"
            description="删除后不可恢复"
            onConfirm={() => void handleDelete(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const detailRecord = currentRecord

  return (
    <div className="data-source-page">
      <div className="page-toolbar">
        <Space.Compact>
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="请输入数据源名称、接口地址或描述"
            allowClear
            className="data-source-page__search-input"
          />
          <Button icon={<SearchOutlined />} type="primary" onClick={handleSearch}>
            检索
          </Button>
        </Space.Compact>

        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          新增数据源
        </Button>
      </div>

      <Table
        bordered
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={false}
        className="data-source-table"
        scroll={{ y: scrollY }}
      />

      <div className="data-source-page__pagination">
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showSizeChanger
          showTotal={(total) => `共 ${total} 条`}
          onChange={handlePageChange}
        />
      </div>

      <Modal
        title={formMode === 'create' ? '新增数据源' : '编辑数据源'}
        open={formModalOpen}
        onOk={() => void handleSubmit()}
        onCancel={() => {
          setFormModalOpen(false)
        }}
        afterOpenChange={handleFormModalAfterOpenChange}
        confirmLoading={saving}
        width={980}
        destroyOnHidden
        className="data-source-page__form-modal"
      >
        <Form form={form} layout="vertical" initialValues={mergeFormValues()}>
          <div className="data-source-page__form-grid">
            <Form.Item
              name="name"
              label="数据源名称"
              rules={[
                { required: true, whitespace: true, message: '请输入数据源名称' },
                {
                  validator: async (_rule, value) => {
                    if (!value) {
                      return
                    }
                    if (Array.from(String(value)).length > 20) {
                      throw new Error('数据源名称不能超过 20 个字')
                    }
                  },
                },
              ]}
            >
              <Input placeholder="请输入数据源名称" maxLength={20} showCount />
            </Form.Item>

            <Form.Item name="method" label="请求方式" rules={[{ required: true, message: '请选择请求方式' }]}>
              <Select
                options={[
                  { label: 'GET', value: 'GET' },
                  { label: 'POST', value: 'POST' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="url"
              label="接口地址"
              className="data-source-page__form-grid-span-2"
              rules={[
                { required: true, whitespace: true, message: '请输入接口地址' },
                { max: 500, message: '接口地址不能超过 500 个字符' },
              ]}
            >
              <Input placeholder="请输入接口地址，例如 /api/demo/table 或 http://127.0.0.1:3000/api" maxLength={500} showCount />
            </Form.Item>

            <Form.Item
              name="description"
              label="描述"
              className="data-source-page__form-grid-span-2"
              rules={[
                {
                  validator: async (_rule, value) => {
                    if (!value) {
                      return
                    }
                    if (Array.from(String(value)).length > 30) {
                      throw new Error('描述不能超过 30 个字')
                    }
                  },
                },
              ]}
            >
              <Input placeholder="请输入数据源描述信息" maxLength={30} showCount />
            </Form.Item>

            <Form.Item
              name="listField"
              label="列表字段路径"
              rules={[
                { required: true, whitespace: true, message: '请输入列表字段路径' },
                { max: 100, message: '列表字段路径不能超过 100 个字符' },
              ]}
            >
              <Input placeholder="data.list" maxLength={100} showCount />
            </Form.Item>

            <Form.Item
              name="timeout"
              label="查询超时（秒）"
              rules={[
                { required: true, message: '请输入查询超时' },
                {
                  validator: async (_rule, value) => {
                    if (!Number.isInteger(Number(value)) || Number(value) <= 1) {
                      throw new Error('查询超时必须为大于 1 的整数')
                    }
                  },
                },
              ]}
              tooltip="查询超时（2-300秒）"
            >
              <InputNumber min={2} max={300} precision={0} style={{ width: '100%' }} placeholder="请输入查询超时（2-300秒）" />
            </Form.Item>
          </div>

          <div className="data-source-page__section">
            <div className="data-source-page__section-title">请求参数配置</div>
            <WidgetApiConfigTabs
              form={form}
              methodName="method"
              headersName={['requestConfig', 'headersList']}
              queryName={['requestConfig', 'queryList']}
              bodyName={['requestConfig', 'bodyList']}
              headerKeyOptions={HEADER_KEY_OPTIONS}
              debugContent={(
                <WidgetApiDebugButton
                  form={form}
                  buildConfig={(formValues) => ({
                    endpoint: formValues.url,
                    method: formValues.method || 'GET',
                    timeout: Number(formValues.timeout) * 1000,
                    headers: keyValueListToObject(formValues.requestConfig?.headersList),
                    query: keyValueListToObject(formValues.requestConfig?.queryList),
                    body:
                      formValues.method === 'POST'
                        ? keyValueListToObject(formValues.requestConfig?.bodyList)
                        : undefined,
                    listField: formValues.listField || 'data.list',
                    pagination: {
                      mode: formValues.requestConfig?.pagination?.mode,
                      pageParam: formValues.requestConfig?.pagination?.pageParam,
                      pageSizeParam: formValues.requestConfig?.pagination?.pageSizeParam,
                      totalField: formValues.requestConfig?.pagination?.totalField,
                      currentField: formValues.requestConfig?.pagination?.currentField,
                      pageSizeField: formValues.requestConfig?.pagination?.pageSizeField,
                      showTotal: formValues.requestConfig?.pagination?.showTotal,
                    },
                  })}
                  buildPageState={(formValues) => {
                    if (formValues.requestConfig?.pagination?.mode !== 'pagination') {
                      return undefined
                    }

                    return DATA_SOURCE_DEBUG_PAGE_STATE
                  }}
                />
              )}
              debugHint="调试时将使用当前接口地址、请求头、Query / Body 参数、列表字段路径和分页参数名称。服务端分页调试固定使用第 1 页、每页 10 条。"
            />

            <div className="data-source-page__pagination-settings">
              <div className="data-source-page__section-title is-inner">分页设置</div>
              <div className="data-source-page__form-grid">
                <Form.Item name={['requestConfig', 'pagination', 'mode']} label="分页模式">
                  <Select
                    options={[
                      { label: '不分页', value: 'none' },
                      { label: '服务端分页', value: 'pagination' },
                    ]}
                  />
                </Form.Item>

                {paginationMode === 'pagination' && (
                  <>
                    <Form.Item
                      name={['requestConfig', 'pagination', 'pageParam']}
                      label="页码参数名"
                    >
                      <Input placeholder="page" />
                    </Form.Item>

                    <Form.Item
                      name={['requestConfig', 'pagination', 'pageSizeParam']}
                      label="每页条数参数名"
                    >
                      <Input placeholder="page_size" />
                    </Form.Item>

                    <Form.Item
                      name={['requestConfig', 'pagination', 'totalField']}
                      label="总数字段路径"
                    >
                      <Input placeholder="data.total" />
                    </Form.Item>

                    {/* <Form.Item
                      name={['requestConfig', 'pagination', 'currentField']}
                      label="当前页字段路径"
                    >
                      <Input placeholder="data.page" />
                    </Form.Item>

                    <Form.Item
                      name={['requestConfig', 'pagination', 'pageSizeField']}
                      label="每页数字段路径"
                    >
                      <Input placeholder="data.page_size" />
                    </Form.Item> */}
                  </>
                )}
              </div>
            </div>

            {currentMethod !== 'POST' && (
              <Typography.Text type="secondary">
                当前为 GET 请求，请求体配置不会参与保存与调试。
              </Typography.Text>
            )}
          </div>
        </Form>
      </Modal>

      <Modal
        title="数据源详情"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false)
          setCurrentRecord(null)
        }}
        footer={(
          <Button onClick={() => {
            setDetailModalOpen(false)
            setCurrentRecord(null)
          }}
          >
            关闭
          </Button>
        )}
        width={980}
        className="data-source-page__detail-modal"
      >
        {detailLoading ? (
          <div className="data-source-page__detail-loading">
            <Spin />
          </div>
        ) : detailRecord ? (
          <div className="data-source-page__detail">
            <div className="data-source-page__detail-section">
              <div className="data-source-page__section-title">基础信息</div>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="数据源名称">{detailRecord.name}</Descriptions.Item>
                <Descriptions.Item label="请求方式">
                  <Tag color={detailRecord.method === 'POST' ? 'processing' : 'success'}>
                    {detailRecord.method}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item
                  label="接口地址"
                  span={2}
                >
                  <span title={detailRecord.url}>{detailRecord.url}</span>
                </Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>
                  {detailRecord.description || '--'}
                </Descriptions.Item>
                <Descriptions.Item label="列表字段路径">
                  {detailRecord.listField || 'data.list'}
                </Descriptions.Item>
                <Descriptions.Item label="查询超时">{detailRecord.timeout}s</Descriptions.Item>
                <Descriptions.Item label="创建时间">{detailRecord.createdAt || '--'}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{detailRecord.updatedAt || '--'}</Descriptions.Item>
              </Descriptions>
            </div>

            <div className="data-source-page__detail-section">
              <div className="data-source-page__section-title">请求参数配置</div>
              <div className="data-source-page__detail-block">
                <div className="data-source-page__detail-block-title">请求头</div>
                {renderPairList(detailRecord.requestConfig?.headersList, '暂无请求头配置')}
              </div>
              <div className="data-source-page__detail-block">
                <div className="data-source-page__detail-block-title">查询参数</div>
                {renderPairList(detailRecord.requestConfig?.queryList, '暂无查询参数配置')}
              </div>
              {detailRecord.method === 'POST' && (
                <div className="data-source-page__detail-block">
                  <div className="data-source-page__detail-block-title">请求体</div>
                  {renderPairList(detailRecord.requestConfig?.bodyList, '暂无请求体配置')}
                </div>
              )}
            </div>

            <div className="data-source-page__detail-section">
              <div className="data-source-page__section-title">分页设置</div>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="分页模式">
                  {detailRecord.requestConfig?.pagination?.mode === 'pagination' ? '服务端分页' : '不分页'}
                </Descriptions.Item>
                {detailRecord.requestConfig?.pagination?.mode === 'pagination' && (
                  <>
                    <Descriptions.Item label="页码参数名">
                      {detailRecord.requestConfig?.pagination?.pageParam || 'page'}
                    </Descriptions.Item>
                    <Descriptions.Item label="每页条数参数名">
                      {detailRecord.requestConfig?.pagination?.pageSizeParam || 'page_size'}
                    </Descriptions.Item>
                    <Descriptions.Item label="总数字段路径">
                      {detailRecord.requestConfig?.pagination?.totalField || 'data.total'}
                    </Descriptions.Item>
                    {/* <Descriptions.Item label="当前页字段路径">
                      {detailRecord.requestConfig?.pagination?.currentField || 'data.page'}
                    </Descriptions.Item>
                    <Descriptions.Item label="每页数字段路径">
                      {detailRecord.requestConfig?.pagination?.pageSizeField || 'data.page_size'}
                    </Descriptions.Item> */}
                  </>
                )}
              </Descriptions>
            </div>
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无详情数据" />
        )}
      </Modal>
    </div>
  )
}

export default DataSourcePage
