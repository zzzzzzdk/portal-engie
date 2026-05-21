import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  message,
  Tooltip,
  Radio,
  Spin,
  Pagination,
  Form,
  Dropdown,
  Popover,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  AppstoreOutlined,
  BarsOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  UploadOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'

import {
  deletePublishedDashboard,
  getPublishList,
  getPublishedDashboard,
  getCurrentHomepageDashboard,
  publishDashboard,
  serializeDashboardSnapshot,
  setHomepageDashboard,
  type PublishListItem,
} from '@/services/dashboard'
import { exportDashboardFromList } from '@/utils/exportHtml'
import { exportInteractiveDashboardFromList } from '@/utils/exportInteractivePackage'
import { useStore } from '@/store/useStore'
import { useTableScroll } from '@/hooks/useTableScroll'
import './index.scss'

const VIEW_MODE_KEY = 'publish_list_view_mode'

const PublishList: React.FC = () => {
  const navigate = useNavigate()
  const { scrollY } = useTableScroll({ headerHeight: 195, footerHeight: 90 })
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<PublishListItem[]>([])
  const [searchText, setSearchText] = useState('')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
    if (typeof window === 'undefined') return 'card'
    return (localStorage.getItem(VIEW_MODE_KEY) as 'table' | 'card') || 'card'
  })
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [deleteRecord, setDeleteRecord] = useState<PublishListItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [homepageDashboardId, setHomepageDashboardId] = useState<string>('')
  const [createForm] = Form.useForm()
  const importInputRef = useRef<HTMLInputElement>(null)
  const { resetDashboard, setEditMode } = useStore()

  const fetchList = useCallback(async (page: number, pageSize: number, keyword?: string) => {
    setLoading(true)
    try {
      const res = await getPublishList({ page, page_size: pageSize, keyword })
      if (res.code === 20000 && res.data) {
        const { list, page: currentPage, page_size, total } = res.data
        setDataSource(list)
        setPagination(prev => ({
          ...prev,
          current: currentPage,
          pageSize: page_size,
          total,
        }))
      }
    } catch (error) {
      console.error('获取应用列表失败:', error)
      message.error('获取应用列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList(1, pagination.pageSize)
  }, [fetchList, pagination.pageSize])

  useEffect(() => {
    const fetchHomepage = async () => {
      try {
        const res = await getCurrentHomepageDashboard()
        setHomepageDashboardId(res.data?.id || '')
      } catch (error) {
        console.error('获取首页应用失败:', error)
      }
    }

    void fetchHomepage()
  }, [])

  const getStatusMeta = useCallback((record: PublishListItem) => {
    const status = Number(record.status)
    if (status === 2) {
      return { label: record.statusLabel || '已发布', color: '#13c26b', previewVersion: 'published' as const }
    }
    if (status === 1) {
      return { label: record.statusLabel || '待发布更新', color: '#fa8c16', previewVersion: 'published' as const }
    }
    return { label: record.statusLabel || '暂存', color: '#999', previewVersion: 'draft' as const }
  }, [])

  const buildShareUrl = useCallback((record: PublishListItem) => {
    return `${window.location.origin + window.location.pathname}#/preview/${record.id}`
  }, [])

  const buildPreviewUrl = useCallback((record: PublishListItem) => {
    const statusMeta = getStatusMeta(record)
    const versionQuery = statusMeta.previewVersion === 'draft' ? '?version=draft' : ''
    return `${window.location.origin + window.location.pathname}#/preview/${record.id}${versionQuery}`
  }, [getStatusMeta])

  const handlePaginationChange = (page: number, pageSize: number = pagination.pageSize) => {
    void fetchList(page, pageSize, searchText || undefined)
  }

  const handleSearch = () => {
    void fetchList(1, pagination.pageSize, searchText || undefined)
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const handleEdit = (record: PublishListItem) => {
    resetDashboard()
    setEditMode(true)
    navigate(`/dashboard-gridstack?editId=${record.id}`)
  }

  const executeDelete = async (record: PublishListItem, target: 'draft' | 'published' | 'all') => {
    setDeleteLoading(true)
    try {
      const res = await deletePublishedDashboard({ id: record.id, target })
      if (res.code === 20000) {
        if (target !== 'draft' && homepageDashboardId === record.id) {
          setHomepageDashboardId('')
        }
        message.success('删除成功')
        setDeleteRecord(null)
        const { current, pageSize, total } = pagination
        const removedCount = target === 'draft' && record.hasPublished ? 0 : 1
        const remainingTotal = Math.max(0, total - removedCount)
        const currentStartIndex = (current - 1) * pageSize
        const shouldGoPrev = current > 1 && currentStartIndex >= remainingTotal
        const targetPage = shouldGoPrev ? current - 1 : current
        void fetchList(targetPage, pageSize, searchText || undefined)
      } else {
        message.error(res.message || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDelete = (record: PublishListItem) => {
    if (record.status === 1) {
      setDeleteRecord(record)
      return
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除「${record.title}」吗？删除后无法恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await executeDelete(record, 'all')
      },
    })
  }

  const handlePreview = (record: PublishListItem) => {
    window.open(buildPreviewUrl(record), '_blank')
  }

  const handleExportStatic = async (record: PublishListItem) => {
    setExportLoading(`${record.id}:static`)
    try {
      await exportDashboardFromList(
        record.id,
        record.title ? `${record.title}_${record.id}.html` : `工作台_${record.id}.html`,
        'draft',
      )
    } catch (error: any) {
      console.error('静态 HTML 导出失败:', error)
      message.error('静态 HTML 导出失败: ' + (error.message || '未知错误'))
    } finally {
      setExportLoading(null)
    }
  }

  const handleExportInteractive = async (record: PublishListItem) => {
    setExportLoading(`${record.id}:interactive`)
    try {
      await exportInteractiveDashboardFromList(
        record.id,
        record.title ? `${record.title}_${record.id}_交互包.zip` : `工作台_${record.id}_交互包.zip`,
        'draft',
      )
    } catch (error: any) {
      console.error('交互包导出失败:', error)
      message.error('交互包导出失败: ' + (error.message || '未知错误'))
    } finally {
      setExportLoading(null)
    }
  }

  const handleExportJson = async (record: PublishListItem) => {
    setExportLoading(`${record.id}:json`)
    try {
      const res = await getPublishedDashboard({ id: record.id, version: 'draft' })
      if (res.code !== 20000 || !res.data?.dashboardConfig) {
        throw new Error(res.message || '获取应用配置失败')
      }

      const blob = new Blob([res.data.dashboardConfig], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${record.title || '工作台'}_${record.id}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success('JSON 导出成功')
    } catch (error: any) {
      console.error('JSON 导出失败:', error)
      message.error(error?.message || 'JSON 导出失败')
    } finally {
      setExportLoading(null)
    }
  }

  const getExportMenu = (record: PublishListItem): MenuProps => ({
    items: [
      { key: 'json', label: '导出 JSON' },
      { key: 'static', label: '导出静态 HTML' },
      { key: 'interactive', label: '导出交互包 ZIP' },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'json') {
        void handleExportJson(record)
        return
      }
      if (key === 'interactive') {
        void handleExportInteractive(record)
        return
      }
      void handleExportStatic(record)
    },
  })

  const isRecordExporting = (recordId: string) => {
    return exportLoading?.startsWith(`${recordId}:`) ?? false
  }

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    try {
      const successful = document.execCommand('copy')
      if (successful) {
        message.success('访问地址已复制到剪贴板')
      } else {
        message.error('复制失败，请手动复制')
      }
    } catch {
      message.error('复制失败，请手动复制')
    }

    document.body.removeChild(textarea)
  }

  const handleCopyUrl = (record: PublishListItem) => {
    const url = buildShareUrl(record)

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => {
          message.success('访问地址已复制到剪贴板')
        })
        .catch(() => {
          fallbackCopy(url)
        })
      return
    }

    fallbackCopy(url)
  }

  const handleSetHomepage = (record: PublishListItem) => {
    Modal.confirm({
      title: '设置为首页',
      content: '是否将当前页面设置为门户首页，设置后将会替换掉默认的首页。',
      okText: '确认设置',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await setHomepageDashboard({ id: record.id })
          if (res.code === 20000) {
            message.success('设置首页成功')
            setHomepageDashboardId(record.id)
            return
          }
          message.error(res.message || '设置首页失败')
        } catch (error) {
          console.error('设置首页失败:', error)
          message.error('设置首页失败')
        }
      },
    })
  }

  const buildEmptyDashboardSnapshot = (title: string) => {
    return serializeDashboardSnapshot({
      widgets: [],
      groups: [],
      floatingModules: [],
      dashboardConfig: {
        title,
        backgroundType: 'color',
        backgroundColor: '',
        themeMode: 'light',
        styleMode: 'normal',
      },
    })
  }

  const handleCreate = () => {
    createForm.resetFields()
    setCreateModalOpen(true)
  }

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields()
      const title = values.title.trim()
      setCreateLoading(true)
      const res = await publishDashboard({
        title,
        dashboardConfig: buildEmptyDashboardSnapshot(title),
        cover_url: '',
        action: 'save_draft',
      })

      if (res.code !== 20000 || !res.data?.id) {
        throw new Error(res.message || '创建应用失败')
      }

      resetDashboard()
      setEditMode(true)
      message.success('应用创建成功')
      setCreateModalOpen(false)
      createForm.resetFields()
      navigate(`/dashboard-gridstack?editId=${res.data.id}`)
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error('创建应用失败:', error)
      message.error(error?.message || '创建应用失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const normalizeImportedSnapshot = (data: any) => {
    if (Array.isArray(data)) {
      return {
        widgets: data,
        groups: [],
        floatingModules: [],
        dashboardConfig: {
          title: '导入应用',
          backgroundType: 'color',
          backgroundColor: '',
          themeMode: 'light',
          styleMode: 'normal',
        },
      }
    }

    if (data?.widgets || data?.groups || data?.floatingModules || data?.dashboardConfig) {
      return {
        widgets: Array.isArray(data.widgets) ? data.widgets : [],
        groups: Array.isArray(data.groups) ? data.groups : [],
        floatingModules: Array.isArray(data.floatingModules) ? data.floatingModules : [],
        dashboardConfig: data.dashboardConfig || {
          title: '导入应用',
          backgroundType: 'color',
          backgroundColor: '',
          themeMode: 'light',
          styleMode: 'normal',
        },
      }
    }

    throw new Error('JSON 格式错误：未识别到可导入的工作台快照')
  }

  const handleImportButtonClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const snapshot = normalizeImportedSnapshot(json)
      const titleFromSnapshot = snapshot.dashboardConfig?.title?.trim()
      const fallbackTitle = file.name.replace(/\.json$/i, '').trim()
      const title = titleFromSnapshot || fallbackTitle || '导入应用'

      const res = await publishDashboard({
        title,
        dashboardConfig: JSON.stringify({
          ...snapshot,
          dashboardConfig: {
            ...snapshot.dashboardConfig,
            title,
          },
        }),
        cover_url: '',
        action: 'save_draft',
      })

      if (res.code !== 20000 || !res.data?.id) {
        throw new Error(res.message || '导入失败')
      }

      resetDashboard()
      setEditMode(true)
      message.success('导入成功，已创建草稿应用')
      navigate(`/dashboard-gridstack?editId=${res.data.id}`)
    } catch (error: any) {
      console.error('导入应用失败:', error)
      message.error(error?.message || '导入应用失败')
    } finally {
      event.target.value = ''
    }
  }

  const columns: ColumnsType<PublishListItem> = useMemo(() => [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_value, _record, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 240,
      ellipsis: true,
      render: (title: string, record) => (
        <Space size={8}>
          <span>{title}</span>
          {homepageDashboardId === record.id ? <Tag color="gold">首页</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 180,
      ellipsis: true,
      render: (id: string) => (
        <Tooltip title={id}>
          <span className="publish-list-id">{id}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_value, record) => {
        const statusMeta = getStatusMeta(record)
        return (
          <div className="status-dot">
            <span className="status-dot__point" style={{ background: statusMeta.color }} />
            {statusMeta.label}
          </div>
        )
      },
    },
    {
      title: '最近更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (time: string) => time || '-',
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 180,
      render: (time: string) => time || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      fixed: 'right',
      render: (_value, record) => {
        const showPublishedActions = record.hasPublished
        return (
          <Space size="small">
            {showPublishedActions ? (
              <Tooltip title="设置为首页">
                <Button
                  type="text"
                  size="small"
                  icon={<HomeOutlined />}
                  onClick={() => handleSetHomepage(record)}
                />
              </Tooltip>
            ) : null}
            {showPublishedActions ? (
              <Popover
                trigger="hover"
                placement="top"
                content={(
                  <div className="publish-list-share-popover">
                    <div className="publish-list-share-popover__url" title={buildShareUrl(record)}>
                      {buildShareUrl(record)}
                    </div>
                    <Button type="primary" size="small" icon={<CopyOutlined />} onClick={() => handleCopyUrl(record)}>
                      复制链接
                    </Button>
                  </div>
                )}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<ShareAltOutlined />}
                />
              </Popover>
            ) : null}
            <Tooltip title="预览">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handlePreview(record)}
              />
            </Tooltip>
            <Tooltip title="导出">
              <Dropdown menu={getExportMenu(record)} trigger={['click']}>
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  loading={isRecordExporting(record.id)}
                  onClick={event => event.preventDefault()}
                />
              </Dropdown>
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          </Space>
        )
      },
    },
  ], [
    buildShareUrl,
    getStatusMeta,
    handleCopyUrl,
    handleDelete,
    handleEdit,
    getExportMenu,
    handlePreview,
    handleSetHomepage,
    homepageDashboardId,
    isRecordExporting,
    pagination.current,
    pagination.pageSize,
  ])

  const handleViewModeChange = (mode: 'table' | 'card') => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  const renderCardActions = (item: PublishListItem) => {
    const showPublishedActions = item.hasPublished
    return (
      <div className="publish-card__action-row">
        {showPublishedActions ? (
          <Tooltip title="设置为首页">
            <Button type="text" icon={<HomeOutlined />} onClick={() => handleSetHomepage(item)} />
          </Tooltip>
        ) : null}
        {showPublishedActions ? (
          <Popover
            trigger="hover"
            placement="top"
            content={(
              <div className="publish-list-share-popover">
                <div className="publish-list-share-popover__url" title={buildShareUrl(item)}>
                  {buildShareUrl(item)}
                </div>
                <Button type="primary" size="small" icon={<CopyOutlined />} onClick={() => handleCopyUrl(item)}>
                  复制链接
                </Button>
              </div>
            )}
          >
            <Button type="text" icon={<ShareAltOutlined />} />
          </Popover>
        ) : null}
        <Tooltip title="预览">
          <Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(item)} />
        </Tooltip>
        <Tooltip title="导出">
          <Dropdown menu={getExportMenu(item)} trigger={['click']}>
            <Button
              type="text"
              icon={<DownloadOutlined />}
              loading={isRecordExporting(item.id)}
              onClick={event => event.preventDefault()}
            />
          </Dropdown>
        </Tooltip>
        <Tooltip title="编辑">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(item)} />
        </Tooltip>
        <Tooltip title="删除">
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item)} />
        </Tooltip>
      </div>
    )
  }

  const renderCards = () => {
    return (
      <Spin spinning={loading}>
        <div className="publish-card-grid">
          <button
            type="button"
            className="publish-card publish-card--create"
            onClick={handleCreate}
          >
            <div className="publish-card__cover">
              <div className="publish-card__thumbnail publish-card__thumbnail--create">
                <div className="publish-card__create-icon">
                  <PlusOutlined />
                </div>
              </div>
            </div>
            <div className="publish-card__body">
              <div className="publish-card__title">
                <div className="title">新建空白应用</div>
              </div>
              <div className="publish-card__info">
                <span className="info-id">创建后进入工作台编辑</span>
                <span>空白模板</span>
              </div>
            </div>
          </button>

          {dataSource.map(item => {
            const statusMeta = getStatusMeta(item)
            const coverSrc = item.cover_url || ''
            const isHomepage = homepageDashboardId === item.id

            return (
              <div className="publish-card" key={item.id}>
                <div className="publish-card__cover">
                  {isHomepage ? <div className="publish-card__homepage-badge">首页</div> : null}
                  <div className="publish-card__thumbnail">
                    {coverSrc ? (
                      <img src={coverSrc} alt={item.title} />
                    ) : (
                      <div className="publish-card__placeholder">暂无封面</div>
                    )}
                  </div>
                  <div className="publish-card__status-wrapper">
                    <span
                      className={`publish-card__status ${item.status === 2 ? 'is-success' : ''} ${item.status === 1 ? 'is-pending' : ''}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>
                <div className="publish-card__body">
                  <div className="publish-card__title" title={item.title}>
                    <div className="title">{item.title || '未命名'}</div>
                    <div className="publish-card__actions">
                      {renderCardActions(item)}
                    </div>
                  </div>
                  <div className="publish-card__info">
                    <span className="info-id" title={item.id}>{item.id || '--'}</span>
                    <span title={item.updatedAt}>{item.updatedAt || '--'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Spin>
    )
  }

  return (
    <div className="publish-list-page">
      <div className="publish-list-toolbar">
        <div className="publish-list-toolbar__left">
          <Input
            placeholder="搜索标题或 ID"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={event => setSearchText(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            maxLength={20}
            allowClear
          />
          <Button onClick={handleSearch} loading={loading}>搜索</Button>
        </div>
        <Space size="small">
          <Radio.Group
            value={viewMode}
            onChange={event => handleViewModeChange(event.target.value as 'table' | 'card')}
            buttonStyle="solid"
            className="view-switch"
          >
            <Radio.Button value="card">
              <AppstoreOutlined />
            </Radio.Button>
            <Radio.Button value="table">
              <BarsOutlined />
            </Radio.Button>
          </Radio.Group>
          <Button icon={<UploadOutlined />} onClick={handleImportButtonClick}>
            导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增
          </Button>
        </Space>
      </div>

      <div className="publish-list-content">
        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1400, y: scrollY }}
          />
        ) : (
          renderCards()
        )}
      </div>

      <div className="publish-list-pagination">
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showSizeChanger
          showQuickJumper
          pageSizeOptions={['10', '20', '50', '100']}
          showTotal={total => `共 ${total} 条`}
          onChange={handlePaginationChange}
          onShowSizeChange={handlePaginationChange}
        />
      </div>

      <Modal
        title="新增应用"
        open={createModalOpen}
        onOk={handleCreateSubmit}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={createLoading}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="title"
            label="应用名称"
            rules={[
              { required: true, whitespace: true, message: '请输入应用名称' },
              { max: 30, message: '应用名称最多 30 个字符' },
            ]}
          >
            <Input
              placeholder="请输入应用名称"
              maxLength={30}
              showCount
              onPressEnter={() => void handleCreateSubmit()}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="删除应用"
        open={Boolean(deleteRecord)}
        onCancel={() => setDeleteRecord(null)}
        footer={deleteRecord ? [
          <Button key="cancel" onClick={() => setDeleteRecord(null)} disabled={deleteLoading}>
            取消
          </Button>,
          <Button
            key="draft"
            danger
            loading={deleteLoading}
            onClick={() => void executeDelete(deleteRecord, 'draft')}
          >
            删除草稿
          </Button>,
          <Button
            key="published"
            type="primary"
            danger
            loading={deleteLoading}
            onClick={() => void executeDelete(deleteRecord, 'published')}
          >
            删除整个应用
          </Button>,
        ] : undefined}
        destroyOnHidden
      >
        <p>当前应用存在已发布版本和待发布草稿，请选择删除范围。</p>
        <p>删除草稿：保留已发布版本。</p>
        <p>删除整个应用：草稿和已发布版本都会删除。</p>
      </Modal>

      <input
        type="file"
        ref={importInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleImportFileChange}
      />
    </div>
  )
}

export default PublishList
