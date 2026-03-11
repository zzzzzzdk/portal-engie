import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Collapse, Card, Row, Col, Empty, Spin, Alert, Tag, Input } from 'antd';
import { AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import { microAppConfigLoader } from '@/utils/microAppConfig';
import IconRenderer from '@/components/IconRenderer';
import type { MicroAppSystem, MicroAppModule } from '@/types';
import './index.scss';

const { Panel } = Collapse;

interface MicroAppMarketProps {
  open: boolean;
  onClose: () => void;
  onSelectModule: (systemId: string, moduleId: string, module: MicroAppModule) => void;
  mode?: 'widget' | 'floating' | 'global'; // 添加模式：小部件、悬浮模块或全局无边框
}

const MicroAppMarket: React.FC<MicroAppMarketProps> = ({ open, onClose, onSelectModule, mode = 'widget' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemsByCategory, setSystemsByCategory] = useState<Record<string, MicroAppSystem[]>>({});
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    if (open) {
      setSearchKeyword('');
      loadMicroApps();
    }
  }, [open]);

  // 根据关键词过滤系统和模块
  const filteredByCategory = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return systemsByCategory;

    const result: Record<string, MicroAppSystem[]> = {};
    for (const [category, systems] of Object.entries(systemsByCategory)) {
      const filteredSystems: MicroAppSystem[] = [];
      for (const system of systems) {
        const systemMatch = system.name.toLowerCase().includes(keyword);
        // 系统名匹配则保留全部模块，否则按模块名过滤
        if (systemMatch) {
          filteredSystems.push(system);
        } else {
          const matchedModules = system.modules.filter(
            m => m.name.toLowerCase().includes(keyword) ||
                 m.description?.toLowerCase().includes(keyword)
          );
          if (matchedModules.length > 0) {
            filteredSystems.push({ ...system, modules: matchedModules });
          }
        }
      }
      if (filteredSystems.length > 0) {
        result[category] = filteredSystems;
      }
    }
    return result;
  }, [systemsByCategory, searchKeyword]);

  const loadMicroApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await microAppConfigLoader.getSystemsByCategory();
      setSystemsByCategory(data);
    } catch (err: any) {
      console.error('Failed to load micro apps:', err);
      setError(err.message || '加载微应用失败');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = (systemId: string, moduleId: string, module: MicroAppModule) => {
    onSelectModule(systemId, moduleId, module);
    onClose();
  };

  const renderModuleCard = (system: MicroAppSystem, module: MicroAppModule) => {
    const iconValue = module.iconSvg || module.icon;
    const cover = iconValue ? (
      <div className="module-thumbnail">
        <IconRenderer value={iconValue} size={48} />
      </div>
    ) : (
      <div className="module-thumbnail module-thumbnail--placeholder">
        <AppstoreOutlined style={{ fontSize: 48, color: '#1890ff' }} />
      </div>
    );

    return (
      <Card
        key={`${system.id}-${module.id}`}
        hoverable
        className="module-card"
        onClick={() => handleModuleClick(system.id, module.id, module)}
        cover={cover}
      >
        <Card.Meta
          title={module.name}
          description={
            <div className="module-description">
              <div className="module-desc-text">{module.description || '-'}</div>
              {module.defaultSize && (
                <div className="module-size">
                  宽/高: {module.defaultSize.w} / {module.defaultSize.h}
                </div>
              )}
              {module.forceIconOnly && (
                <Tag color="purple" style={{ marginTop: 8 }}>强制图标显示</Tag>
              )}
            </div>
          }
        />
      </Card>
    );
  };

  const renderSystemPanel = (system: MicroAppSystem) => {
    return (
      <Panel
        key={system.id}
        header={
          <div className="system-header">
            <span className="system-name">{system.name}</span>
            <span className="system-count">({system.modules.length} 个模块)</span>
          </div>
        }
        extra={system.description && <span className="system-desc">{system.description}</span>}
      >
        <Row gutter={[16, 16]}>
          {system.modules.map((module) => (
            <Col key={module.id} xs={24} sm={12} md={8} lg={6}>
              {renderModuleCard(system, module)}
            </Col>
          ))}
        </Row>
      </Panel>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="market-loading">
          <Spin size="large" tip="加载微应用市场..." />
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

    const categories = Object.keys(filteredByCategory);
    if (categories.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={searchKeyword ? '没有匹配的微应用' : '暂无可用的微应用'}
        />
      );
    }

    return (
      <div className="market-content">
        {categories.map((category) => (
          <div key={category} className="category-section">
            <h3 className="category-title">{category}</h3>
            <Collapse
              defaultActiveKey={filteredByCategory[category].map(s => s.id)}
              className="system-collapse"
            >
              {filteredByCategory[category].map((system) => renderSystemPanel(system))}
            </Collapse>
          </div>
        ))}
      </div>
    );
  };

  const getModeText = () => {
    switch (mode) {
      case 'floating': return '(悬浮模式)';
      case 'global': return '(全局挂载模式)';
      default: return '';
    }
  };

  return (
    <Modal
      title={
        <div className="market-title">
          <AppstoreOutlined /> 微应用市场 <span style={{ fontSize: 14, color: '#999' }}>{getModeText()}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      className="micro-app-market-modal"
      destroyOnHidden
    >
      <div className="market-search">
        <Input
          placeholder="搜索系统名称 / 微应用名称"
          prefix={<SearchOutlined />}
          allowClear
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
      </div>
      <div className="market-scroll">
        {renderContent()}
      </div>
    </Modal>
  );
};

export default MicroAppMarket;
