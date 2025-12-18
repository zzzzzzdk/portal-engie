import React, { useState } from 'react';
import { Button, Input, Collapse, Popconfirm, Typography, Empty, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import type { AssistantSystem, AssistantEntry } from '@/types/assistantHub';
import MicroAppSelector from '@/components/MicroAppSelector';
import { v4 as uuidv4 } from 'uuid';
import './index.scss';

const { Text } = Typography;

interface AssistantHubConfigProps {
  value?: AssistantSystem[];
  onChange?: (systems: AssistantSystem[]) => void;
}

const AssistantHubConfig: React.FC<AssistantHubConfigProps> = ({
  value = [],
  onChange,
}) => {
  const [activeKeys, setActiveKeys] = useState<string[]>(value.map(s => s.id));

  const triggerChange = (newSystems: AssistantSystem[]) => {
    onChange?.(newSystems);
  };

  // 添加系统
  const handleAddSystem = () => {
    const newSystem: AssistantSystem = {
      id: uuidv4(),
      name: '新系统',
      icon: 'AppstoreOutlined',
      expanded: true,
      entries: [],
    };
    const newSystems = [...value, newSystem];
    triggerChange(newSystems);
    setActiveKeys([...activeKeys, newSystem.id]);
  };

  // 删除系统
  const handleDeleteSystem = (systemId: string) => {
    const newSystems = value.filter(s => s.id !== systemId);
    triggerChange(newSystems);
    setActiveKeys(activeKeys.filter(k => k !== systemId));
  };

  // 更新系统
  const handleUpdateSystem = (systemId: string, updates: Partial<AssistantSystem>) => {
    const newSystems = value.map(s =>
      s.id === systemId ? { ...s, ...updates } : s
    );
    triggerChange(newSystems);
  };

  // 添加入口
  const handleAddEntry = (systemId: string) => {
    const newEntry: AssistantEntry = {
      id: uuidv4(),
      name: '新入口',
      icon: 'AppstoreOutlined',
      microApp: {
        url: '',
        entry: '',
      },
    };
    const newSystems = value.map(s =>
      s.id === systemId
        ? { ...s, entries: [...s.entries, newEntry] }
        : s
    );
    triggerChange(newSystems);
  };

  // 删除入口
  const handleDeleteEntry = (systemId: string, entryId: string) => {
    const newSystems = value.map(s =>
      s.id === systemId
        ? { ...s, entries: s.entries.filter(e => e.id !== entryId) }
        : s
    );
    triggerChange(newSystems);
  };

  // 更新入口
  const handleUpdateEntry = (
    systemId: string,
    entryId: string,
    updates: Partial<AssistantEntry>
  ) => {
    const newSystems = value.map(s =>
      s.id === systemId
        ? {
            ...s,
            entries: s.entries.map(e =>
              e.id === entryId ? { ...e, ...updates } : e
            ),
          }
        : s
    );
    triggerChange(newSystems);
  };

  // 更新入口的微应用配置
  const handleUpdateEntryMicroApp = (
    systemId: string,
    entryId: string,
    microAppUpdates: Partial<AssistantEntry['microApp']>
  ) => {
    const newSystems = value.map(s =>
      s.id === systemId
        ? {
            ...s,
            entries: s.entries.map(e =>
              e.id === entryId
                ? { ...e, microApp: { ...e.microApp, ...microAppUpdates } }
                : e
            ),
          }
        : s
    );
    triggerChange(newSystems);
  };

  const collapseItems = value.map(system => ({
    key: system.id,
    label: (
      <div className="system-header" onClick={e => e.stopPropagation()}>
        <Input
          value={system.name}
          onChange={e => handleUpdateSystem(system.id, { name: e.target.value })}
          placeholder="系统名称"
          style={{ width: 150 }}
          size="small"
        />
        <Input
          value={system.icon}
          onChange={e => handleUpdateSystem(system.id, { icon: e.target.value })}
          placeholder="图标名称"
          style={{ width: 150 }}
          size="small"
        />
        <Popconfirm
          title="确定删除此系统?"
          onConfirm={() => handleDeleteSystem(system.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
          />
        </Popconfirm>
      </div>
    ),
    children: (
      <div className="system-entries">
        {system.entries.length === 0 ? (
          <Empty description="暂无入口" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          system.entries.map(entry => (
            <div key={entry.id} className="entry-item">
              <div className="entry-row">
                <Input
                  value={entry.name}
                  onChange={e =>
                    handleUpdateEntry(system.id, entry.id, { name: e.target.value })
                  }
                  placeholder="入口名称"
                  size="small"
                  style={{ width: 120 }}
                />
                <Input
                  value={entry.icon}
                  onChange={e =>
                    handleUpdateEntry(system.id, entry.id, { icon: e.target.value })
                  }
                  placeholder="图标"
                  size="small"
                  style={{ width: 120 }}
                />
                <Popconfirm
                  title="确定删除此入口?"
                  onConfirm={() => handleDeleteEntry(system.id, entry.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                  />
                </Popconfirm>
              </div>
              <div className="entry-microapp">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  关联微应用:
                </Text>
                {entry.microApp.url ? (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {entry.microApp.systemId || '未知系统'} / {entry.microApp.moduleId || '未知模块'}
                  </Tag>
                ) : (
                  <Tag color="default" style={{ marginLeft: 8 }}>未选择</Tag>
                )}
              </div>
              <MicroAppSelector
                systemId={entry.microApp.systemId}
                moduleId={entry.microApp.moduleId}
                onChange={({ systemId: sysId, moduleId: modId, module }) => {
                  handleUpdateEntryMicroApp(system.id, entry.id, {
                    systemId: sysId,
                    moduleId: modId,
                    url: module?.url || '',
                    entry: module?.entry || '',
                  });
                }}
              />
            </div>
          ))
        )}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => handleAddEntry(system.id)}
          size="small"
          block
        >
          添加入口
        </Button>
      </div>
    ),
  }));

  return (
    <div className="assistant-hub-config">
      {value.length === 0 ? (
        <Empty description="暂无系统配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Collapse
          activeKey={activeKeys}
          onChange={keys => setActiveKeys(keys as string[])}
          items={collapseItems}
          size="small"
          expandIcon={({ isActive }) =>
            isActive ? <DownOutlined /> : <RightOutlined />
          }
        />
      )}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddSystem}
        style={{ marginTop: 8 }}
        block
      >
        添加系统
      </Button>
    </div>
  );
};

export default AssistantHubConfig;
