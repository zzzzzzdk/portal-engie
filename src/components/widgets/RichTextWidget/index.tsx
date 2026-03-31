import React, { useMemo } from 'react'
import DOMPurify from 'dompurify'
import type { RichTextWidgetConfig, Widget } from '@/types'
import './index.scss'

interface RichTextWidgetProps {
  config: RichTextWidgetConfig
  widget?: Widget
  isEditMode?: boolean
}

const RichTextWidget: React.FC<RichTextWidgetProps> = ({
  config,
  isEditMode = false,
}) => {
  const sanitizedHtml = useMemo(
    () =>
      DOMPurify.sanitize(config.html || '', {
        ADD_ATTR: ['target', 'rel', 'style', 'class'],
      }),
    [config.html],
  )

  if (!sanitizedHtml) {
    return (
      <div className="rich-text-widget">
        <div className="rich-text-widget__empty">
          {isEditMode ? config.placeholder || '双击配置富文本内容' : '暂无内容'}
        </div>
      </div>
    )
  }

  return (
    <div className="rich-text-widget">
      <div
        className="rich-text-widget__content"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  )
}

export default RichTextWidget
