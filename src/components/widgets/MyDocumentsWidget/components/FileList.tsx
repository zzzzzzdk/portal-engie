import { Table, Button, Space, Popconfirm, Empty, message } from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useFileStore } from '@/store/useFileStore';
import type { FileInfo } from '@/types';
import { formatFileSize, formatDate, getFileIconColor, getPreviewType } from '@/utils/fileUtils';

export default function FileList() {
  const {
    files,
    currentBucket,
    currentPath,
    enterFolder,
    goBack,
    deleteFile,
    downloadFile,
    openPreview,
  } = useFileStore();

  const handleFileClick = (file: FileInfo) => {
    if (file.is_dir) {
      enterFolder(file.name);
    } else {
      openPreview(file);
    }
  };

  const handleDelete = async (file: FileInfo) => {
    try {
      await deleteFile(file);
      message.success('删除成功');
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  const handleDownload = async (file: FileInfo) => {
    try {
      await downloadFile(file);
    } catch (err: any) {
      message.error(err.message || '下载失败');
    }
  };

  const canPreview = (file: FileInfo) => {
    if (file.is_dir) return false;
    const previewType = getPreviewType(file.name);
    return previewType !== 'none';
  };

  const columns: ColumnsType<FileInfo> = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: FileInfo) => (
        <Space
          style={{ cursor: 'pointer' }}
          onClick={() => handleFileClick(record)}
        >
          {record.is_dir ? (
            <FolderOutlined style={{ color: getFileIconColor(name, true), fontSize: 18 }} />
          ) : (
            <FileOutlined style={{ color: getFileIconColor(name, false), fontSize: 18 }} />
          )}
          <span className="file-name">{name}</span>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number, record: FileInfo) =>
        record.is_dir ? '-' : formatFileSize(size),
    },
    {
      title: '修改时间',
      dataIndex: 'last_modified',
      key: 'last_modified',
      width: 180,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: FileInfo) => (
        <Space size="small">
          {canPreview(record) && (
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openPreview(record);
              }}
            />
          )}
          {!record.is_dir && (
            <Button
              type="text"
              icon={<DownloadOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(record);
              }}
            />
          )}
          <Popconfirm
            title="删除"
            description={`确定要删除 ${record.name} 吗？`}
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!currentBucket) {
    return (
      <Empty
        description="正在加载文档目录..."
        style={{ marginTop: 100 }}
      />
    );
  }

  return (
    <div className="file-list">
      {currentPath.length > 0 && (
        <div className="back-button">
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={goBack}
          >
            返回
          </Button>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={files}
        rowKey="path"
        pagination={false}
        locale={{
          emptyText: <Empty description="暂无文件" />,
        }}
        onRow={(record) => ({
          onDoubleClick: () => handleFileClick(record),
        })}
      />
    </div>
  );
}
