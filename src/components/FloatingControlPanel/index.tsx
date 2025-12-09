import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { Button, Dropdown, Space, Switch, Tooltip, Select } from 'antd';
import { 
  PlusOutlined, 
  SettingOutlined, 
  FullscreenExitOutlined, 
  DragOutlined,
  AppstoreOutlined,
  SaveOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useStore } from '@/store/useStore';
import { GRID_DENSITY_PRESETS, GridDensityKey } from '@/types';

interface FloatingControlPanelProps {
  onAdd: (key: string) => void;
  addMenuItems: MenuProps['items'];
  onOpenSettings: () => void;
  onOpenMicroAppConfig?: () => void;
  onSave: () => void;
}

const FloatingControlPanel: React.FC<FloatingControlPanelProps> = ({
  onAdd,
  addMenuItems,
  onOpenSettings,
  onOpenMicroAppConfig,
  onSave,
}) => {
  const {
    isEditMode,
    setEditMode,
    gridDensity,
    setGridDensity,
    toggleFullScreen,
    floatingPanelPosition,
    setFloatingPanelPosition,
  } = useStore();
  
  const nodeRef = useRef(null);

  const handleDragStop = (_e: any, data: { x: number; y: number }) => {
    setFloatingPanelPosition({ x: data.x, y: data.y });
  };

  return (
    <Draggable
      handle=".drag-handle"
      defaultPosition={floatingPanelPosition}
      onStop={handleDragStop}
      nodeRef={nodeRef}
      bounds="parent"
    >
      <div 
        ref={nodeRef}
        style={{
          position: 'fixed',
          zIndex: 9999,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '8px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div 
          className="drag-handle" 
          style={{ cursor: 'move', color: '#999', display: 'flex', alignItems: 'center' }}
        >
          <DragOutlined />
        </div>

        <Space>
          <Space>
            <span style={{ fontSize: '12px', color: '#666' }}>编辑</span>
            <Switch size="small" checked={isEditMode} onChange={setEditMode} />
          </Space>

          {isEditMode && (
            <>
               <Dropdown
                menu={{
                  items: addMenuItems,
                  onClick: ({ key }) => onAdd(key)
                }}
                trigger={['click']}
              >
                <Button type="primary" icon={<PlusOutlined />} size="small">
                  添加
                </Button>
              </Dropdown>

              <Tooltip title="页面设置">
                <Button icon={<SettingOutlined />} size="small" onClick={onOpenSettings} >页面设置</Button>
              </Tooltip>

              <Select
                value={gridDensity}
                onChange={(value) => setGridDensity(value as GridDensityKey)}
                style={{ width: 100 }}
                size="small"
              >
                {Object.entries(GRID_DENSITY_PRESETS).map(([key, preset]) => (
                  <Select.Option key={key} value={key}>
                    {preset.label}
                  </Select.Option>
                ))}
              </Select>

              {onOpenMicroAppConfig && (
                <Tooltip title="微应用配置">
                  <Button icon={<AppstoreOutlined />} size="small" onClick={onOpenMicroAppConfig} >微应用配置</Button>
                </Tooltip>
              )}

              <Button icon={<SaveOutlined />} size="small" onClick={onSave}>保存</Button>
            </>
          )}

          <Tooltip title="退出全屏">
            <Button 
              type="text" 
              icon={<FullscreenExitOutlined />} 
              onClick={toggleFullScreen} 
              danger
            />
          </Tooltip>
        </Space>
      </div>
    </Draggable>
  );
};

export default FloatingControlPanel;
