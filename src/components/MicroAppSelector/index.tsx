import React, { useEffect, useState } from 'react';
import { Select, Space, Typography, Spin, Alert } from 'antd';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import type { MicroAppSystem, MicroAppModule } from '@/types';
import './index.scss';

const { Text } = Typography;

interface MicroAppSelectorProps {
  systemId?: string;
  moduleId?: string;
  onSystemChange?: (systemId: string) => void;
  onModuleChange?: (moduleId: string, module: MicroAppModule | null) => void;
  onChange?: (config: { systemId: string; moduleId: string; module: MicroAppModule | null }) => void;
}

const MicroAppSelector: React.FC<MicroAppSelectorProps> = ({
  systemId,
  moduleId,
  onSystemChange,
  onModuleChange,
  onChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [systems, setSystems] = useState<MicroAppSystem[]>([]);
  const [modules, setModules] = useState<MicroAppModule[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string | undefined>(systemId);
  const [selectedModule, setSelectedModule] = useState<string | undefined>(moduleId);
  const [error, setError] = useState<string | null>(null);

  // 加载系统列表
  useEffect(() => {
    const loadSystems = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await microAppConfigLoader.getAllSystems();
        setSystems(data);
        if (data.length === 0) {
          setError('未找到可用的微应用系统配置');
        }
      } catch (err: any) {
        console.error('Failed to load systems:', err);
        setError(err.message || '加载系统列表失败');
      } finally {
        setLoading(false);
      }
    };
    loadSystems();
  }, []);

  // 当系统变化时,加载模块列表
  useEffect(() => {
    if (selectedSystem) {
      const loadModules = async () => {
        try {
          const data = await microAppConfigLoader.getModulesBySystemId(selectedSystem);
          setModules(data);
        } catch (err) {
          console.error('Failed to load modules:', err);
          setModules([]);
        }
      };
      loadModules();
    } else {
      setModules([]);
      setSelectedModule(undefined);
    }
  }, [selectedSystem]);

  const handleSystemChange = (value: string) => {
    setSelectedSystem(value);
    setSelectedModule(undefined);
    onSystemChange?.(value);
    onModuleChange?.('', null);
    onChange?.({ systemId: value, moduleId: '', module: null });
  };

  const handleModuleChange = async (value: string) => {
    setSelectedModule(value);
    if (selectedSystem) {
      const module = await microAppConfigLoader.getModule(selectedSystem, value);
      onModuleChange?.(value, module);
      onChange?.({ systemId: selectedSystem, moduleId: value, module });
    }
  };

  if (loading) {
    return (
      <div className="micro-app-selector-loading">
        <Spin tip="加载微应用配置中..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle" className="micro-app-selector">
      <div>
        <Text strong>选择系统</Text>
        <Select
          style={{ width: '100%', marginTop: 8 }}
          placeholder="请选择系统"
          value={selectedSystem}
          onChange={handleSystemChange}
          options={systems.map(sys => ({
            label: sys.name,
            value: sys.id,
            desc: sys.description,
          }))}
          optionRender={(option) => (
            <div className="system-option">
              <div className="system-name">{option.label}</div>
              {option.data.desc && (
                <div className="system-desc">{option.data.desc}</div>
              )}
            </div>
          )}
        />
      </div>

      <div>
        <Text strong>选择模块</Text>
        <Select
          style={{ width: '100%', marginTop: 8 }}
          placeholder={selectedSystem ? "请选择模块" : "请先选择系统"}
          value={selectedModule}
          onChange={handleModuleChange}
          disabled={!selectedSystem || modules.length === 0}
          options={modules.map(mod => ({
            label: mod.name,
            value: mod.id,
            desc: mod.description,
          }))}
          optionRender={(option) => (
            <div className="module-option">
              <div className="module-name">{option.label}</div>
              {option.data.desc && (
                <div className="module-desc">{option.data.desc}</div>
              )}
            </div>
          )}
        />
      </div>

      {selectedSystem && selectedModule && (
        <Alert
          message="配置已选择"
          description={`系统: ${systems.find(s => s.id === selectedSystem)?.name} / 模块: ${modules.find(m => m.id === selectedModule)?.name}`}
          type="success"
          showIcon
        />
      )}
    </Space>
  );
};

export default MicroAppSelector;
