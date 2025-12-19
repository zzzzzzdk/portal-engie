import React, { useState } from 'react';
import { Button, Input, Popconfirm, Empty, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, AppstoreOutlined, EditOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import type { AssistantEntry } from '@/types/assistantHub';
import MicroAppSelector from '@/components/MicroAppSelector';
import IconPicker from '@/components/IconPicker';
import { v4 as uuidv4 } from 'uuid';
import './index.scss';

interface AssistantHubConfigProps {
  value?: AssistantEntry[];
  onChange?: (entries: AssistantEntry[]) => void;
}

const AssistantHubConfig: React.FC<AssistantHubConfigProps> = ({
  value = [],
  onChange,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const triggerChange = (newEntries: AssistantEntry[]) => {
    onChange?.(newEntries);
  };

  const toggleExpand = (id: string) => {
    setExpandedKeys(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  // 添加入口
  const handleAddEntry = () => {
    const id = uuidv4();
    const newEntry: AssistantEntry = {
      id,
      name: '新入口',
      icon: 'AppstoreOutlined',
      microApp: {
        url: '',
        entry: '',
      },
    };
    triggerChange([...value, newEntry]);
    setExpandedKeys(prev => [...prev, id]); // 自动展开新项
  };

  // 删除入口
  const handleDeleteEntry = (entryId: string) => {
    triggerChange(value.filter(e => e.id !== entryId));
  };

  // 更新入口
  const handleUpdateEntry = (entryId: string, updates: Partial<AssistantEntry>) => {
    triggerChange(
      value.map(e => (e.id === entryId ? { ...e, ...updates } : e))
    );
  };

  // 更新入口的微应用配置
  const handleUpdateEntryMicroApp = (
    entryId: string,
    microAppUpdates: Partial<AssistantEntry['microApp']>
  ) => {
    triggerChange(
      value.map(e =>
        e.id === entryId
          ? { ...e, microApp: { ...e.microApp, ...microAppUpdates } }
          : e
      )
    );
  };

  return (
    <div className="assistant-hub-config">
      {value.length === 0 ? (
        <div className="empty-state">
           <Empty description="暂无入口配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div className="entry-list">
          {value.map(entry => {
            const isExpanded = expandedKeys.includes(entry.id);
            return (
              <div 
                key={entry.id} 
                className={`config-card ${isExpanded ? 'expanded' : 'collapsed'}`}
              >
                <div className="card-header" onClick={() => toggleExpand(entry.id)}>
                  <div className="header-left">
                    <div className="expand-icon">
                      {isExpanded ? <DownOutlined /> : <RightOutlined />}
                    </div>
                    
                    <div className="name-editor" onClick={e => e.stopPropagation()}>
                      <Input
                        value={entry.name}
                        onChange={e => handleUpdateEntry(entry.id, { name: e.target.value })}
                        placeholder="请输入名称"
                        className="name-input"
                        bordered={false}
                        size="small"
                      />
                      <EditOutlined className="edit-icon" />
                    </div>

                    <div className="header-meta">
                      {entry.icon && (
                        <span className="icon-tag">
                           <AppstoreOutlined /> {entry.icon}
                        </span>
                      )}
                      
                      {entry.microApp.url ? (
                        <Tag color="blue" bordered={false} className="app-tag">
                          {entry.microApp.systemId}/{entry.microApp.moduleId}
                        </Tag>
                      ) : (
                        <Tag bordered={false} className="app-tag">未关联</Tag>
                      )}
                    </div>
                  </div>

                  <div className="header-right" onClick={e => e.stopPropagation()}>
                    <Popconfirm
                      title="确定删除此入口?"
                      onConfirm={() => handleDeleteEntry(entry.id)}
                      okText="确定"
                      cancelText="取消"
                      placement="left"
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        className="delete-btn"
                        size="small"
                      />
                    </Popconfirm>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="card-body">
                    <div className="form-row">
                      <div className="form-item icon-config">
                         <span className="field-label">图标配置:</span>
                         <IconPicker
                            value={entry.icon}
                            onChange={icon => handleUpdateEntry(entry.id, { icon })}
                            mode="simple"
                            placeholder="选择入口图标"
                         />
                      </div>
                    </div>

                    <div className="microapp-selection-area">
                      <div className="area-label">关联微应用配置</div>
                      <div className="selector-container">
                        <MicroAppSelector
                          systemId={entry.microApp.systemId}
                          moduleId={entry.microApp.moduleId}
                          onChange={({ systemId: sysId, moduleId: modId, module }) => {
                            handleUpdateEntryMicroApp(entry.id, {
                              systemId: sysId,
                              moduleId: modId,
                              url: module?.url || '',
                              entry: module?.entry || '',
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddEntry}
        className="add-entry-btn"
        block
      >
        添加入口
      </Button>
    </div>
  );
};

export default AssistantHubConfig;
