import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Modal, message, Tooltip, Radio, Empty, Spin, Pagination } from 'antd';
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
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { getPublishList, deletePublishedDashboard, PublishListItem } from '@/services/dashboard';
import { exportDashboardFromList } from '@/utils/exportHtml';
import { useStore } from '@/store/useStore';
import { useTableScroll } from '@/hooks/useTableScroll';
import { DASHBOARD_LAST_EDIT_ID_KEY } from '@/constants/dashboard';
import './index.scss';

const VIEW_MODE_KEY = 'publish_list_view_mode';

const PublishList: React.FC = () => {
  const navigate = useNavigate();
  const { scrollY } = useTableScroll({ headerHeight: 195, footerHeight: 90 })
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<PublishListItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
    if (typeof window === 'undefined') return 'table';
    return (localStorage.getItem(VIEW_MODE_KEY) as 'table' | 'card') || 'table';
  });
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const { resetDashboard, setEditMode } = useStore();
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // 获取发布列表
  const fetchList = useCallback(async (page: number, page_size: number, keyword?: string) => {
    setLoading(true);
    try {
      const res = await getPublishList({ page, page_size, keyword });
      if (res.code === 20000 && res.data) {
        const { list, page: currentPage, page_size, total } = res.data;
        setDataSource(list);
        setPagination(prev => ({
          ...prev,
          current: currentPage,
          pageSize: page_size,
          total,
        }));
      }
    } catch (error) {
      console.error('获取发布列表失败:', error);
      message.error('获取发布列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(1, pagination.pageSize);
  }, []);

  const handlePaginationChange = (page: number, pageSize: number = pagination.pageSize) => {
    fetchList(page, pageSize, searchText || undefined);
  };

  // 搜索
  const handleSearch = () => {
    fetchList(1, pagination.pageSize, searchText || undefined);
  };

  // 搜索框回车
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 编辑 - 携带id请求数据跳转到编辑器
  const handleEdit = (record: PublishListItem) => {
    // 跳转到编辑页，通过 URL 参数传递 id
    navigate(`/dashboard-gridstack?editId=${record.id}`);
  };

  // 删除 - 二次确认
  const handleDelete = (record: PublishListItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除「${record.title}」吗？删除后无法恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await deletePublishedDashboard({ id: record.id });
          if (res.code === 20000) {
            message.success('删除成功');
            const { current, pageSize, total } = pagination;
            const remainingTotal = Math.max(0, total - 1);
            const currentStartIndex = (current - 1) * pageSize;
            const shouldGoPrev = current > 1 && currentStartIndex >= remainingTotal;
            const targetPage = shouldGoPrev ? current - 1 : current;
            fetchList(targetPage, pageSize, searchText || undefined);
          } else {
            message.error(res.message || '删除失败');
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      },
    });
  };

  // 预览
  const handlePreview = (record: PublishListItem) => {
    window.open(`${window.location.origin + window.location.pathname}#/preview/${record.id}`, '_blank');
  };

  // 导出
  const handleExport = async (record: PublishListItem) => {
    setExportLoading(record.id);
    try {
      await exportDashboardFromList(record.id, record.title ? record.title + '_' + record.id + '.html' : '工作台_' + record.id + '.html');
    } catch (error: any) {
      console.error('导出失败:', error);
      message.error('导出失败: ' + (error.message || '未知错误'));
    } finally {
      setExportLoading(null);
    }
  };

  // 复制访问地址（兼容非 HTTPS 环境）
  const handleCopyUrl = (record: PublishListItem) => {
    const url = `${window.location.origin + window.location.pathname}#/preview/${record.id}`;

    // 优先使用 navigator.clipboard（需要 HTTPS）
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        message.success('访问地址已复制到剪贴板');
      }).catch(() => {
        fallbackCopy(url);
      });
    } else {
      // 降级方案：使用 execCommand
      fallbackCopy(url);
    }
  };

  // 降级复制方法
  const fallbackCopy = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('访问地址已复制到剪贴板');
      } else {
        message.error('复制失败，请手动复制');
      }
    } catch {
      message.error('复制失败，请手动复制');
    }
    document.body.removeChild(textarea);
  };

  // 新增 - 跳转到空白编辑页
  const handleCreate = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DASHBOARD_LAST_EDIT_ID_KEY);
    }
    resetDashboard();
    setEditMode(true);
    navigate('/dashboard-gridstack');
  };

  const columns: ColumnsType<PublishListItem> = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: any, __: PublishListItem, index: number) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
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
      title: '访问地址',
      key: 'url',
      width: 300,
      render: (_: any, record: PublishListItem) => {
        const url = `${window.location.origin + window.location.pathname}#/preview/${record.id}`;
        return (
          <Space>
            <Tooltip title={url}>
              <span className="publish-list-url">{url}</span>
            </Tooltip>
            <Tooltip title="复制地址">
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyUrl(record)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_: any, record: PublishListItem) => {
        const normalizedStatus = Number(record.status) === 1 ? 1 : 0;
        const statusLabel = normalizedStatus === 1 ? '已发布' : '暂存';
        const color = normalizedStatus === 1 ? '#13c26b' : '#999';
        return (
          <div className="status-dot">
            <span className="status-dot__point" style={{ background: color }} />
            {statusLabel}
          </div>
        );
      },
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 180,
      render: (time: string) => {
        if (!time) return '-';
        return new Date(time).toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_: any, record: PublishListItem) => (
        <Space size="small">
          <Tooltip title="预览">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          {/* <Tooltip title="导出">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              loading={exportLoading === record.id}
              onClick={() => handleExport(record)}
            />
          </Tooltip> */}
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
      ),
    },
  ];

  const handleViewModeChange = (mode: 'table' | 'card') => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  useEffect(() => {
    setActiveShareId(null);
  }, [viewMode, dataSource]);

  const getCoverSrc = (coverUrl?: string) => {
    if (!coverUrl) {
      return '';
    }
    return coverUrl;
  };

  const renderCards = () => {
    if (!loading && !dataSource.length) {
      return (
        <div className="publish-card-empty">
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <Spin spinning={loading}>
        <div className="publish-card-grid">
          {dataSource.map((item) => {
            const url = `${window.location.origin + window.location.pathname}#/preview/${item.id}`;
            const statusValue = Number(item.status) === 1 ? 1 : 0;
            const statusLabel = statusValue === 1 ? '已发布' : '暂存';
            const coverSrc = getCoverSrc(item.cover_url);
            return (
              <div className="publish-card" key={item.id}>
                <div className="publish-card__cover">
                  <div className="publish-card__thumbnail">
                    {coverSrc ? (
                      <img src={coverSrc} alt={item.title} />
                    ) : (
                      <div className="publish-card__placeholder">暂无封面</div>
                    )}
                  </div>
                  <div className="publish-card__status-wrapper">
                    <span className={`publish-card__status ${statusValue === 1 ? 'is-success' : ''}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
                <div className="publish-card__body">
                  <div className="publish-card__title" title={item.title}>
                    <div className="title">{item.title || '未命名'}</div>
                    <div className="publish-card__actions">
                      <div className="publish-card__action-row">
                        <Tooltip title={
                          <>
                            <span>{url}</span>
                            <Button className='copy' type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopyUrl(item)} />
                          </>}
                        >
                          <Button type="text" icon={<ShareAltOutlined />} />
                        </Tooltip>
                        <Tooltip title="预览">
                          <Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(item)} />
                        </Tooltip>
                        {/* <Tooltip title="导出">
                          <Button type="text" icon={<DownloadOutlined />} onClick={() => handleExport(item)} loading={exportLoading === item.id} />
                        </Tooltip> */}
                        <Tooltip title="编辑">
                          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(item)} />
                        </Tooltip>
                        <Tooltip title="删除">
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item)} />
                        </Tooltip>


                      </div>
                    </div>
                  </div>
                  <div className="publish-card__info">
                    <span className='info-id' title={item.id}>{item.id ? item.id : '--'}</span>
                    <span title={item.publishedAt}>{item.publishedAt ? item.publishedAt : '--'}</span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </Spin>
    );
  };

  return (
    <div className="publish-list-page">
      <div className="publish-list-toolbar">
        <div className="publish-list-toolbar__left">
          <Input
            placeholder="搜索标题或ID"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            maxLength={20}
            allowClear
          />
          <Button onClick={handleSearch} loading={loading}>搜索</Button>
        </div>
        <Space size="small">
          <Radio.Group
            value={viewMode}
            onChange={(e) => handleViewModeChange(e.target.value as 'table' | 'card')}
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
            scroll={{ x: 1100, y: scrollY }}
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
          showSizeChanger={true}
          showQuickJumper={true}
          pageSizeOptions={['10', '20', '50', '100']}
          showTotal={(total) => `共 ${total} 条`}
          onChange={handlePaginationChange}
          onShowSizeChange={handlePaginationChange}
        />
      </div>
    </div>
  );
};

export default PublishList;
