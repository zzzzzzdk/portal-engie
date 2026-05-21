import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import {
  Modal,
  Layout,
  Button,
  Breadcrumb,
  Space,
  Input,
  message,
  Spin,
  Upload,
} from 'antd'
import {
  DatabaseOutlined,
  UploadOutlined,
  FolderAddOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useFileStore } from '@/store/useFileStore'
import FileList from './components/FileList'
import PreviewDialog from './components/PreviewDialog'

const { Sider, Content } = Layout

interface FileManagerModalProps {
  open: boolean
  onClose: () => void
}

export default function FileManagerModal({ open, onClose }: FileManagerModalProps) {
  const {
    currentBucket,
    bucketLoading,
    currentPath,
    filesLoading,
    fetchBucket,
    navigateTo,
    uploadFile,
    createFolder,
  } = useFileStore()

  const [createFolderVisible, setCreateFolderVisible] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const MAX_FOLDER_NAME_LENGTH = 80

  useEffect(() => {
    if (open) {
      fetchBucket()
    }
  }, [open, fetchBucket])

  const stopContextMenuPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const renderModalContainer = (modal: React.ReactNode) => (
    <div onContextMenuCapture={stopContextMenuPropagation}>
      {modal}
    </div>
  )

  const handleCreateFolder = async () => {
    const folderName = newFolderName.trim()
    if (!folderName) {
      message.warning('请输入文件夹名称')
      return
    }
    if (folderName.length > MAX_FOLDER_NAME_LENGTH) {
      message.warning(`文件夹名称不能超过 ${MAX_FOLDER_NAME_LENGTH} 个字符`)
      return
    }

    setCreateLoading(true)
    try {
      await createFolder(folderName)
      message.success('文件夹创建成功')
      setCreateFolderVisible(false)
      setNewFolderName('')
    } catch (err: any) {
      message.error(err.message || '创建文件夹失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpload = async (file: File) => {
    try {
      await uploadFile(file)
      message.success(`${file.name} 上传成功`)
    } catch (err: any) {
      message.error(err.message || '上传失败')
    }
  }

  const uploadProps: UploadProps = {
    beforeUpload: file => {
      void handleUpload(file)
      return false
    },
    showUploadList: false,
  }

  const breadcrumbItems = [
    {
      title: (
        <span onClick={() => navigateTo([])} style={{ cursor: 'pointer' }}>
          <HomeOutlined />
        </span>
      ),
    },
    ...currentPath.map((segment, index) => ({
      title: (
        <span
          onClick={() => navigateTo(currentPath.slice(0, index + 1))}
          style={{ cursor: 'pointer' }}
          title={segment}
        >
          {segment}
        </span>
      ),
    })),
  ]

  return (
    <Modal
      title="我的文档"
      open={open}
      onCancel={onClose}
      footer={null}
      width={1200}
      destroyOnClose
      className="file-manager-modal"
      styles={{ body: { padding: 0, height: '70vh' } }}
      modalRender={renderModalContainer}
    >
      <Layout className="file-manager" style={{ height: '100%' }}>
        <Sider width={200} theme="light" className="file-manager-sider">
          <div className="sider-header">
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>存储空间</h3>
          </div>
          <Spin spinning={bucketLoading}>
            {currentBucket ? (
              <div className="bucket-info-item">
                <DatabaseOutlined style={{ fontSize: 16, color: '#1677ff' }} />
                <span className="bucket-info-name">{currentBucket}</span>
              </div>
            ) : (
              <div className="bucket-info-item" style={{ color: '#999' }}>
                暂无存储空间
              </div>
            )}
          </Spin>
        </Sider>

        <Content className="file-manager-content">
          <div className="content-toolbar">
            <Breadcrumb items={breadcrumbItems} />
            <Space>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} disabled={!currentBucket} size="small">
                  上传
                </Button>
              </Upload>
              <Button
                icon={<FolderAddOutlined />}
                disabled={!currentBucket}
                size="small"
                onClick={() => setCreateFolderVisible(true)}
              >
                新建文件夹
              </Button>
            </Space>
          </div>

          <div className="content-body">
            <Spin spinning={filesLoading}>
              <FileList />
            </Spin>
          </div>
        </Content>

        <PreviewDialog />

        <Modal
          title="新建文件夹"
          open={createFolderVisible}
          onOk={() => void handleCreateFolder()}
          onCancel={() => {
            setCreateFolderVisible(false)
            setNewFolderName('')
          }}
          confirmLoading={createLoading}
          modalRender={renderModalContainer}
        >
          <Input
            placeholder="请输入文件夹名称"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onPressEnter={() => void handleCreateFolder()}
            maxLength={MAX_FOLDER_NAME_LENGTH}
            showCount
          />
        </Modal>
      </Layout>
    </Modal>
  )
}
