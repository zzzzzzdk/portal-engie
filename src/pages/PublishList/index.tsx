import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Modal, message, Typography, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CopyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { getPublishList, deletePublishedDashboard, PublishListItem } from '@/services/dashboard';
import { useStore } from '@/store/useStore';
import './index.scss';

const { Title } = Typography;

const PublishList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<PublishListItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const { resetDashboard, setEditMode } = useStore();

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

  // 分页变化
  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    const { current = 1, pageSize = 10 } = paginationConfig;
    fetchList(current, pageSize, searchText || undefined);
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
            // 刷新列表，保持当前分页
            fetchList(pagination.current, pagination.pageSize, searchText || undefined);
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
    // 清空 localStorage 中的数据，从空白页创建
    resetDashboard();
    setEditMode(true);
    navigate('/dashboard-gridstack');
  };

  const columns: ColumnsType<PublishListItem> = [
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
      title: '发布时间',
      dataIndex: 'publishTime',
      key: 'publishTime',
      width: 180,
      render: (time: string) => {
        if (!time) return '-';
        return new Date(time).toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
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

  return (
    <div className="publish-list-page">
      <div className="publish-list-header">
        <Title level={4}>已发布列表</Title>
        <Space size="middle">
          <Input
            placeholder="搜索标题或ID"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            allowClear
            style={{ width: 250 }}
          />
          <Button onClick={handleSearch}>搜索</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增
          </Button>
        </Space>
      </div>
      <div className="publish-list-content">
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </div>
    </div>
  );
};

export default PublishList;
