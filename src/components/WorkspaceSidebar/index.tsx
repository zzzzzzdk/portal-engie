import React from 'react'
import { AppstoreOutlined, RobotOutlined } from '@ant-design/icons'
import WidgetDrawer from '@/components/WidgetDrawer'
import AIAssistantPanel from '@/components/AIAssistantPanel'
import type { DashboardSnapshot } from '@/services/dashboard'
import type { LocalTemplateCategory, LocalTemplateRecord } from '@/types/local-component-library'
import './index.scss'

export type WorkspaceSidebarTabKey = 'widget' | 'ai'

interface WorkspaceSidebarProps {
  open: boolean
  activeTab: WorkspaceSidebarTabKey
  onTabChange: (tab: WorkspaceSidebarTabKey) => void
  onCloseWidget: () => void
  onCloseAi: () => void
  onWidgetSelect: (key: string) => void
  onNativeFormFieldSelect?: (fieldType: string) => void
  activeNativeFormWidgetId?: string | null
  currentSnapshot: DashboardSnapshot
  hasWorkspaceContent: boolean
  workspaceKey: string
  workspaceTitle?: string
  onApplySnapshot: (snapshot: DashboardSnapshot) => void
  onClearWorkspace: () => void
  localCategories?: LocalTemplateCategory[]
  localTemplates?: LocalTemplateRecord[]
  onCreateLocalCategory?: (name: string) => Promise<void> | void
  onDeleteLocalCategory?: (categoryId: string) => Promise<void> | void
  onDeleteLocalTemplate?: (templateId: string) => Promise<void> | void
}

const tabItems: Array<{
  key: WorkspaceSidebarTabKey
  label: string
  icon: React.ReactNode
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
  onCloseWidget,
  onCloseAi,
  onWidgetSelect,
  onNativeFormFieldSelect,
  activeNativeFormWidgetId,
  currentSnapshot,
  hasWorkspaceContent,
  workspaceKey,
  workspaceTitle,
  onApplySnapshot,
  onClearWorkspace,
  localCategories,
  localTemplates,
  onCreateLocalCategory,
  onDeleteLocalCategory,
  onDeleteLocalTemplate,
}) => {
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
          </button>
        ))}
      </div>

      <div className="workspace-sidebar__content">
        <div
          className={`workspace-sidebar__panel ${activeTab === 'widget' ? 'is-active' : ''}`}
        >
          <WidgetDrawer
            open={open && activeTab === 'widget'}
            onClose={onCloseWidget}
            onSelect={onWidgetSelect}
            onSelectNativeFormField={onNativeFormFieldSelect}
            activeNativeFormWidgetId={activeNativeFormWidgetId}
            localCategories={localCategories}
            localTemplates={localTemplates}
            onCreateLocalCategory={onCreateLocalCategory}
            onDeleteLocalCategory={onDeleteLocalCategory}
            onDeleteLocalTemplate={onDeleteLocalTemplate}
          />
        </div>
        <div
          className={`workspace-sidebar__panel ${activeTab === 'ai' ? 'is-active' : ''}`}
        >
          <AIAssistantPanel
            currentSnapshot={currentSnapshot}
            hasWorkspaceContent={hasWorkspaceContent}
            visible={open && activeTab === 'ai'}
            workspaceKey={workspaceKey}
            workspaceTitle={workspaceTitle}
            onApplySnapshot={onApplySnapshot}
            onClearWorkspace={onClearWorkspace}
            onClose={onCloseAi}
          />
        </div>
      </div>
    </div>
  )
}

export default WorkspaceSidebar
