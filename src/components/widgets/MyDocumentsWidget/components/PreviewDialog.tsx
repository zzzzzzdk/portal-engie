import type { MouseEvent } from 'react'
import { Modal, Spin } from 'antd'
import { useFileStore } from '@/store/useFileStore'
import { getPreviewType, isOfficePreviewType } from '@/utils/fileUtils'
import OnlyOfficeEditor from './OnlyOfficeEditor'
import MonacoPreview from './MonacoPreview'
import PdfPreview from './PdfPreview'
import WordPreview from './WordPreview'
import ExcelPreview from './ExcelPreview'

export default function PreviewDialog() {
  const {
    previewVisible,
    previewFile,
    previewInfo,
    previewLoading,
    closePreview,
    currentBucket,
  } = useFileStore()

  const previewType = previewFile ? getPreviewType(previewFile.name) : 'none'

  const stopContextMenuPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const renderModalContainer = (modal: React.ReactNode) => (
    <div onContextMenuCapture={stopContextMenuPropagation}>
      {modal}
    </div>
  )

  const renderContent = () => {
    if (previewLoading) {
      return (
        <div className="preview-loading">
          <Spin size="large" />
        </div>
      )
    }

    if (!previewInfo || !previewFile) {
      return <div className="preview-empty">暂无预览</div>
    }

    if (isOfficePreviewType(previewType) && currentBucket) {
      return (
        <OnlyOfficeEditor
          bucket={currentBucket}
          filePath={previewFile.path}
          fileName={previewFile.name}
          mode={previewInfo.can_edit ? 'edit' : 'view'}
        />
      )
    }

    switch (previewType) {
      case 'image':
        return (
          <div className="image-preview">
            <img src={previewInfo.url} alt={previewFile.name} />
          </div>
        )

      case 'video':
        return (
          <div className="video-preview">
            <video controls autoPlay>
              <source src={previewInfo.url} />
              您的浏览器不支持视频播放
            </video>
          </div>
        )

      case 'audio':
        return (
          <div className="audio-preview">
            <audio controls autoPlay>
              <source src={previewInfo.url} />
              您的浏览器不支持音频播放
            </audio>
          </div>
        )

      case 'pdf':
        return <PdfPreview url={previewInfo.url} />

      case 'word':
        return <WordPreview url={previewInfo.url} />

      case 'excel':
        return (
          <ExcelPreview
            url={previewInfo.url}
            fileName={previewFile.name}
            canEdit={previewInfo.can_edit}
          />
        )

      case 'text':
        return (
          <MonacoPreview
            url={previewInfo.url}
            fileName={previewFile.name}
            filePath={previewFile.path}
            bucket={currentBucket}
            canEdit={previewInfo.can_edit}
          />
        )

      default:
        return <div className="preview-empty">无法预览此文件类型</div>
    }
  }

  const isOfficeType = isOfficePreviewType(previewType)

  const getModalWidth = () => {
    if (isOfficeType) return '90%'
    if (previewType === 'text') return '80%'
    return '60%'
  }

  return (
    <Modal
      title={previewFile?.name || '预览'}
      open={previewVisible}
      onCancel={closePreview}
      footer={null}
      width={getModalWidth()}
      destroyOnClose
      className="preview-dialog"
      styles={isOfficeType ? { body: { padding: 0, height: '80vh', overflow: 'hidden' } } : undefined}
      modalRender={renderModalContainer}
    >
      <div className={isOfficeType ? 'preview-content-office' : 'preview-content'}>
        {renderContent()}
      </div>
    </Modal>
  )
}
