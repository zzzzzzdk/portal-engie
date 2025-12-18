import React, { useState, useCallback, useRef, useEffect } from 'react';
import SystemList from './components/SystemList';
import MicroAppPanel from './components/MicroAppPanel';
import type { AssistantHubProps, AssistantEntry } from '@/types/assistantHub';
import './index.scss';

type ViewState = 'list' | 'panel' | 'transitioning-to-panel' | 'transitioning-to-list';

const AssistantHubComponent: React.FC<AssistantHubProps> = ({
  systems = [],
  onEntrySelect,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<AssistantEntry | null>(null);
  const [viewState, setViewState] = useState<ViewState>('list');
  const pendingEntryRef = useRef<AssistantEntry | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);

  const TRANSITION_DURATION = 300; // ms

  // 清理定时器
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const handleEntrySelect = useCallback((entry: AssistantEntry) => {
    pendingEntryRef.current = entry;
    setViewState('transitioning-to-panel');

    // 动画结束后切换视图
    transitionTimeoutRef.current = window.setTimeout(() => {
      setSelectedEntry(entry);
      setViewState('panel');
      onEntrySelect?.(entry);
    }, TRANSITION_DURATION);
  }, [onEntrySelect]);

  const handleClosePanel = useCallback(() => {
    setViewState('transitioning-to-list');

    // 动画结束后切换视图
    transitionTimeoutRef.current = window.setTimeout(() => {
      setSelectedEntry(null);
      pendingEntryRef.current = null;
      setViewState('list');
    }, TRANSITION_DURATION);
  }, []);

  const showList = viewState === 'list' || viewState === 'transitioning-to-panel' || viewState === 'transitioning-to-list';
  const showPanel = viewState === 'panel' || viewState === 'transitioning-to-panel' || viewState === 'transitioning-to-list';

  // 计算动画类名
  const getListClassName = () => {
    if (viewState === 'transitioning-to-panel') return 'slide-out-left';
    if (viewState === 'transitioning-to-list') return 'slide-in-left';
    return '';
  };

  const getPanelClassName = () => {
    if (viewState === 'transitioning-to-panel') return 'slide-in-right';
    if (viewState === 'transitioning-to-list') return 'slide-out-right';
    return '';
  };

  return (
    <div className="assistant-hub">
      {/* 系统列表视图 */}
      {showList && (
        <div className={`assistant-hub__view ${getListClassName()}`}>
          <SystemList
            systems={systems}
            selectedEntryId={undefined}
            onEntrySelect={handleEntrySelect}
          />
        </div>
      )}

      {/* 微应用面板视图 */}
      {showPanel && (selectedEntry || pendingEntryRef.current) && (
        <div className={`assistant-hub__view ${getPanelClassName()}`}>
          <MicroAppPanel
            entry={(selectedEntry || pendingEntryRef.current)!}
            onClose={handleClosePanel}
          />
        </div>
      )}
    </div>
  );
};

export default AssistantHubComponent;
