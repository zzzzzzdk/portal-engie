import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { Button, Switch, Tooltip } from 'antd';
import {
  PlusOutlined,
  SettingOutlined,
  FullscreenExitOutlined,
  DragOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import clsx from 'clsx';
import './index.scss';

const LEGACY_DEFAULT_POSITION = { x: 100, y: 100 };
const PANEL_EDGE_OFFSET = 16;

const isLegacyDefaultPosition = (position: { x: number; y: number }) =>
  position.x === LEGACY_DEFAULT_POSITION.x && position.y === LEGACY_DEFAULT_POSITION.y;

const shouldUseTopRightDefault = (position: { x: number; y: number }) =>
  position.x < 0 || position.y < 0 || isLegacyDefaultPosition(position);

interface FloatingControlPanelProps {
  onAddWidget: () => void;
  onOpenSettings: () => void;
  onResetPage: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onExitFullScreen: () => void;
  isSavingDraft: boolean;
  isPublishing?: boolean;
}

const FloatingControlPanel: React.FC<FloatingControlPanelProps> = ({
  onAddWidget,
  onOpenSettings,
  onResetPage,
  onSaveDraft,
  onPublish,
  onExitFullScreen,
  isSavingDraft,
  isPublishing = false,
}) => {
  const {
    isEditMode,
    setEditMode,
    floatingPanelPosition,
    setFloatingPanelPosition,
  } = useStore();
  const { isDark } = useCanvasTheme();

  const nodeRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState(floatingPanelPosition);

  useEffect(() => {
    setPanelPosition(floatingPanelPosition);
  }, [floatingPanelPosition]);

  useLayoutEffect(() => {
    if (!shouldUseTopRightDefault(floatingPanelPosition)) {
      return;
    }

    const panelWidth = nodeRef.current?.offsetWidth || 0;
    const nextPosition = {
      x: Math.max(window.innerWidth - panelWidth - PANEL_EDGE_OFFSET, PANEL_EDGE_OFFSET),
      y: PANEL_EDGE_OFFSET,
    };

    setPanelPosition(nextPosition);
    setFloatingPanelPosition(nextPosition);
  }, [floatingPanelPosition, setFloatingPanelPosition]);

  const handleDragStop = (_e: any, data: { x: number; y: number }) => {
    const nextPosition = { x: data.x, y: data.y };
    setPanelPosition(nextPosition);
    setFloatingPanelPosition(nextPosition);
  };

  return (
    <Draggable
      handle=".drag-handle"
      position={panelPosition}
      onStop={handleDragStop}
      nodeRef={nodeRef}
      bounds="parent"
    >
      <div ref={nodeRef} className={clsx('floating-control-panel', 'drag-handle', { 'is-dark': isDark })}>
        <div className="floating-control-panel__drag ">
          <DragOutlined />
        </div>

        <div className="floating-control-panel__content">
          <div className="floating-control-panel__mode app-sub-header__mode">
            <span className="app-sub-header__mode-label">编辑模式</span>
            <Switch checked={isEditMode} onChange={setEditMode} />
          </div>

          <div className="floating-control-panel__actions">
            <Button
              type="primary"
              size='small'
              icon={<PlusOutlined />}
              disabled={!isEditMode}
              onClick={onAddWidget}
              className="add"
            >
              添加组件
            </Button>

            {isEditMode && (
              <>
                <Button icon={<SettingOutlined />} onClick={onOpenSettings} className="set" size='small'>
                  页面设置
                </Button>

                <Button icon={<DeleteOutlined />} onClick={onResetPage} danger className="clear" size='small'>
                  清空页面
                </Button>
              </>
            )}

            <Button
              icon={<SaveOutlined />}
              onClick={onSaveDraft}
              disabled={!isEditMode}
              loading={isSavingDraft}
              className="save"
              size='small'
            >
              保存
            </Button>

            <Button className="app-sub-header__publish-btn" icon={<CloudUploadOutlined />} onClick={onPublish} size='small' loading={isPublishing}>
              发布
            </Button>

            <Tooltip title="退出全屏">
              <Button type="text" icon={<FullscreenExitOutlined />} onClick={onExitFullScreen} className="full" size='small' />
            </Tooltip>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default FloatingControlPanel;
