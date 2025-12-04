import React, { useEffect, useState } from 'react';
import { Modal, Collapse, Card, Row, Col, Empty, Spin, Alert, Image } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { microAppConfigLoader } from '@/utils/microAppConfig';
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

  useEffect(() => {
    if (open) {
      loadMicroApps();
    }
  }, [open]);

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
    return (
      <Card
        key={`${system.id}-${module.id}`}
        hoverable
        className="module-card"
        onClick={() => handleModuleClick(system.id, module.id, module)}
        cover={
          module.icon ? (
            <div className="module-thumbnail">
              <Image
                src={module.icon}
                alt={module.name}
                preview={false}
                fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23999'%3E暂无图片%3C/text%3E%3C/svg%3E"
              />
            </div>
          ) : (
            <div className="module-thumbnail module-thumbnail--placeholder">
              <AppstoreOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </div>
          )
        }
      >
        <Card.Meta
          title={module.name}
          description={
            <div className="module-description">
              <div className="module-desc-text">{module.description || '暂无描述'}</div>
              {module.defaultSize && (
                <div className="module-size">
                  推荐尺寸: {module.defaultSize.w} × {module.defaultSize.h}
                </div>
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

    const categories = Object.keys(systemsByCategory);
    if (categories.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无可用的微应用"
        />
      );
    }

    return (
      <div className="market-content">
        {categories.map((category) => (
          <div key={category} className="category-section">
            <h3 className="category-title">{category}</h3>
            <Collapse
              defaultActiveKey={systemsByCategory[category].map(s => s.id)}
              className="system-collapse"
            >
              {systemsByCategory[category].map((system) => renderSystemPanel(system))}
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
      {renderContent()}
    </Modal>
  );
};

export default MicroAppMarket;
