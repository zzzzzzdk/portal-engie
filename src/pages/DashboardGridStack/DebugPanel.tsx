/**
 * Debug Panel - 用于调试 localStorage、状态同步和网格布局
 */

import React, { useState, useEffect } from 'react';
import { Button, Card, Collapse, Tag, Descriptions } from 'antd';
import { useStore } from '@/store/useStore';
import { useGridStackContext } from '@/lib/gridstack';

const DebugPanel: React.FC = () => {
  const { widgets } = useStore();
  const { gridStack } = useGridStackContext();
  const [localStorageData, setLocalStorageData] = useState<any>(null);
  const [gridMetrics, setGridMetrics] = useState({
    cellWidth: 0,
    cellHeight: 0,
    margin: 0,
    containerWidth: 0,
    gridUnitWidth: 0,
    gridUnitHeight: 0,
  });

  const refreshLocalStorage = () => {
    const stored = localStorage.getItem('portal-engine-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setLocalStorageData(parsed);
      } catch (e) {
        setLocalStorageData({ error: 'Parse error', raw: stored });
      }
    } else {
      setLocalStorageData(null);
    }
  };

  useEffect(() => {
    refreshLocalStorage();
    // 每秒自动刷新
    const interval = setInterval(refreshLocalStorage, 1000);
    return () => clearInterval(interval);
  }, []);

  // 监听 GridStack 度量变化
  useEffect(() => {
    if (!gridStack?.el) return;

    const updateMetrics = () => {
      const cellWidth = gridStack.cellWidth();
      const cellHeight = Number(gridStack.opts.cellHeight) || 0;
      const margin = Number(gridStack.opts.margin) || 0;
      const containerWidth = gridStack.el?.offsetWidth || 0;

      setGridMetrics({
        cellWidth,
        cellHeight,
        margin,
        containerWidth,
        gridUnitWidth: cellWidth + margin,
        gridUnitHeight: cellHeight + margin,
      });
    };

    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(gridStack.el);

    return () => observer.disconnect();
  }, [gridStack]);

  const clearLocalStorage = () => {
    localStorage.removeItem('portal-engine-storage');
    refreshLocalStorage();
  };

  const compareWidgets = () => {
    if (!localStorageData?.state?.widgets) return null;

    const storedWidgets = localStorageData.state.widgets;
    const differences: any[] = [];

    widgets.forEach((currentWidget) => {
      const storedWidget = storedWidgets.find((w: any) => w.id === currentWidget.id);
      if (storedWidget) {
        const layoutDiff: any = {};
        const keys: Array<keyof typeof currentWidget.layout> = ['x', 'y', 'w', 'h'];
        keys.forEach(key => {
          if (currentWidget.layout[key] !== storedWidget.layout[key]) {
            layoutDiff[key] = {
              current: currentWidget.layout[key],
              stored: storedWidget.layout[key]
            };
          }
        });
        if (Object.keys(layoutDiff).length > 0) {
          differences.push({
            id: currentWidget.id,
            type: currentWidget.type,
            diff: layoutDiff
          });
        }
      }
    });

    return differences;
  };

  const differences = compareWidgets();

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 400,
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 10000
    }}>
      <Card
        title="🐛 Debug Panel"
        size="small"
        extra={
          <Button size="small" onClick={refreshLocalStorage}>
            刷新
          </Button>
        }
      >
        <Collapse size="small" defaultActiveKey={['status', 'metrics']}>
          <Collapse.Panel header="📐 网格度量" key="metrics">
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="容器宽度">
                {gridMetrics.containerWidth.toFixed(0)}px
              </Descriptions.Item>
              <Descriptions.Item label="列宽 (cellWidth)">
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  {gridMetrics.cellWidth.toFixed(2)}px
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="行高 (cellHeight)">
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {gridMetrics.cellHeight}px
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="间距 (margin)">
                <span style={{ color: '#faad14', fontWeight: 'bold' }}>
                  {gridMetrics.margin}px
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="网格单元宽度">
                <span style={{ color: '#722ed1', fontWeight: 'bold' }}>
                  {gridMetrics.gridUnitWidth.toFixed(2)}px
                </span>
                <Tag color="purple" style={{ marginLeft: 8 }}>
                  = cellWidth + margin
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="网格单元高度">
                <span style={{ color: '#722ed1', fontWeight: 'bold' }}>
                  {gridMetrics.gridUnitHeight}px
                </span>
                <Tag color="purple" style={{ marginLeft: 8 }}>
                  = cellHeight + margin
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              💡 背景网格大小应与「网格单元」尺寸一致才能完美对齐
            </div>
          </Collapse.Panel>

          <Collapse.Panel header="📊 状态对比" key="status">
            <div style={{ marginBottom: 8 }}>
              <strong>Store Widgets:</strong> {widgets.length}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>localStorage Widgets:</strong>{' '}
              {localStorageData?.state?.widgets?.length || 0}
            </div>
            {differences && differences.length > 0 && (
              <div>
                <Tag color="warning">发现 {differences.length} 个差异</Tag>
                {differences.map((diff, idx) => (
                  <div key={idx} style={{ fontSize: 12, marginTop: 4 }}>
                    <strong>{diff.type} ({diff.id.substring(0, 8)}...)</strong>
                    <pre style={{ fontSize: 10, margin: 0 }}>
                      {JSON.stringify(diff.diff, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
            {differences && differences.length === 0 && (
              <Tag color="success">✅ 状态一致</Tag>
            )}
          </Collapse.Panel>

          <Collapse.Panel header="📦 localStorage 数据" key="data">
            <pre style={{
              fontSize: 10,
              maxHeight: 300,
              overflow: 'auto',
              background: '#f5f5f5',
              padding: 8,
              borderRadius: 4
            }}>
              {localStorageData
                ? JSON.stringify(localStorageData, null, 2)
                : '无数据'}
            </pre>
          </Collapse.Panel>

          <Collapse.Panel header="🔧 操作" key="actions">
            <Button
              size="small"
              danger
              onClick={clearLocalStorage}
              style={{ marginRight: 8 }}
            >
              清除 localStorage
            </Button>
            <Button
              size="small"
              onClick={() => {
                console.log('Current widgets:', widgets);
                console.log('localStorage data:', localStorageData);
              }}
            >
              打印到控制台
            </Button>
          </Collapse.Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default DebugPanel;
