import React from 'react'
import { Button, Spin, Tag } from 'antd'
import {
  CheckCircleOutlined,
  PauseCircleOutlined,
  RobotOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useWorkspaceAiAssistantStore } from '@/store/useWorkspaceAiAssistantStore'
import './index.scss'

interface WorkspaceAiFloatingCardProps {
  onExpand: () => void
  onStop: () => void
}

const WorkspaceAiFloatingCard: React.FC<WorkspaceAiFloatingCardProps> = ({
  onExpand,
  onStop,
}) => {
  const floatingVisible = useWorkspaceAiAssistantStore(
    (state) => state.floatingVisible,
  )
  const requestState = useWorkspaceAiAssistantStore((state) => state.requestState)
  const lastStatusText = useWorkspaceAiAssistantStore((state) => state.lastStatusText)
  const sending = useWorkspaceAiAssistantStore((state) => state.sending)

  if (!floatingVisible) {
    return null
  }

  const titleMap = {
    running: 'AI 助手运行中',
    done: 'AI 已完成',
    error: 'AI 生成失败',
    idle: 'AI 助手',
  } as const

  return (
    <div className={`workspace-ai-floating-card is-${requestState}`}>
      <button
        type="button"
        className="workspace-ai-floating-card__main"
        onClick={onExpand}
      >
        <div className="workspace-ai-floating-card__icon">
          {requestState === 'running' ? (
            <Spin size="small" />
          ) : requestState === 'done' ? (
            <CheckCircleOutlined />
          ) : requestState === 'error' ? (
            <WarningOutlined />
          ) : (
            <RobotOutlined />
          )}
        </div>
        <div className="workspace-ai-floating-card__body">
          <div className="workspace-ai-floating-card__title">
            <span>{titleMap[requestState]}</span>
            <Tag color={requestState === 'error' ? 'error' : requestState === 'done' ? 'success' : 'processing'}>
              {requestState === 'running'
                ? '进行中'
                : requestState === 'done'
                  ? '已完成'
                  : requestState === 'error'
                    ? '失败'
                    : '待机'}
            </Tag>
          </div>
          <div className="workspace-ai-floating-card__status">
            {lastStatusText || '点击展开查看详情'}
          </div>
        </div>
      </button>
      <div className="workspace-ai-floating-card__actions">
        <Button size="small" type="default" onClick={onExpand}>
          展开
        </Button>
        {sending ? (
          <Button
            size="small"
            danger
            icon={<PauseCircleOutlined />}
            onClick={onStop}
          >
            停止
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default WorkspaceAiFloatingCard
