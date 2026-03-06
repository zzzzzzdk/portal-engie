import React, { useState, useMemo } from 'react';
import { Button } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import type { WidgetConfig, Widget } from '@/types';
import FileManagerModal from './FileManagerModal';
import './index.scss';

interface MyDocumentsWidgetProps {
  config?: WidgetConfig;
  widget?: Widget;
}

const MyDocumentsWidget: React.FC<MyDocumentsWidgetProps> = ({ config, widget: _widget }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const btnStyle = useMemo(() => {
    const style: React.CSSProperties = {};
    if (config?.btnColor) {
      style.backgroundColor = config.btnColor;
      style.borderColor = config.btnColor;
    }
    if (config?.btnTextColor) {
      style.color = config.btnTextColor;
    }
    return style;
  }, [config?.btnColor, config?.btnTextColor]);

  return (
    <>
      <div className="my-documents-widget">
        <Button
          type="primary"
          icon={<FolderOpenOutlined />}
          onClick={() => setModalOpen(true)}
          className="my-documents-btn"
          style={btnStyle}
        >
          我的文档
        </Button>
      </div>
      <FileManagerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default MyDocumentsWidget;
