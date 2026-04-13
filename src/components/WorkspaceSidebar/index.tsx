import React from 'react'
import { AppstoreOutlined, RobotOutlined } from '@ant-design/icons'
import WidgetDrawer from '@/components/WidgetDrawer'
import AIAssistantPanel from '@/components/AIAssistantPanel'
import type { DashboardSnapshot } from '@/services/dashboard'
import './index.scss'

export type WorkspaceSidebarTabKey = 'widget' | 'ai'

interface WorkspaceSidebarProps {
  open: boolean;
  activeTab: WorkspaceSidebarTabKey;
  onTabChange: (tab: WorkspaceSidebarTabKey) => void;
  onClose: () => void;
  onWidgetSelect: (key: string) => void;
  currentSnapshot: DashboardSnapshot;
  hasWorkspaceContent: boolean;
  onApplySnapshot: (snapshot: DashboardSnapshot) => void;
  onClearWorkspace: () => void;
}

const tabItems: Array<{
  key: WorkspaceSidebarTabKey;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'widget',
    label: '',
    icon: <AppstoreOutlined />,
  },
  {
    key: 'ai',
    label: '',
    icon: <RobotOutlined />,
  },
]

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  open,
  activeTab,
  onTabChange,
  onClose,
  onWidgetSelect,
  currentSnapshot,
  hasWorkspaceContent,
  onApplySnapshot,
  onClearWorkspace,
}) => {
  if (!open) {
    return null
  }

  return (
    <div className="workspace-sidebar">
      <div className="workspace-sidebar__rail">
        {tabItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`workspace-sidebar__tab ${activeTab === item.key ? 'is-active' : ''}`}
            onClick={() => onTabChange(item.key)}
          >
            <span className="workspace-sidebar__tab-icon">{item.icon}</span>
            {/* <span className="workspace-sidebar__tab-label">{item.label}</span> */}
          </button>
        ))}
      </div>

      <div className="workspace-sidebar__content">
        {activeTab === 'widget' ? (
          <WidgetDrawer
            open
            onClose={onClose}
            onSelect={onWidgetSelect}
          />
        ) : (
          <AIAssistantPanel
            currentSnapshot={currentSnapshot}
            hasWorkspaceContent={hasWorkspaceContent}
            onApplySnapshot={onApplySnapshot}
            onClearWorkspace={onClearWorkspace}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

export default WorkspaceSidebar
