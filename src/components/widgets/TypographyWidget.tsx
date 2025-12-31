import React, { useCallback } from 'react';
import { Typography } from 'antd';
import { WidgetConfig } from '@/types';

interface TypographyWidgetProps {
  config: WidgetConfig;
  isEditMode?: boolean;
}

const { Title, Text } = Typography;

const TypographyWidget: React.FC<TypographyWidgetProps> = ({ config, isEditMode = false }) => {
  const { content, level, color, textAlign, fontSize, fontWeight, linkUrl, linkTarget } = config;

  // 是否有可跳转的链接
  const hasLink = !isEditMode && linkUrl;

  const handleClick = useCallback(() => {
    if (!hasLink) return;

    if (linkTarget === '_blank') {
      window.open(linkUrl, '_blank');
    } else {
      window.location.href = linkUrl;
    }
  }, [hasLink, linkUrl, linkTarget]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', // 默认垂直居中
    alignItems: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
    padding: '0 8px',
    cursor: hasLink ? 'pointer' : 'default',
  };

  const textStyle: React.CSSProperties = {
    margin: 0,
    color: color,
    textAlign: textAlign as any,
    fontSize: fontSize ? `${fontSize}px` : undefined,
    fontWeight: fontWeight,
  };

  // 如果指定了 level 且在 1-5 之间，则渲染标题
  if (level && level >= 1 && level <= 5) {
    return (
      <div style={containerStyle} onClick={handleClick}>
        <Title level={level as 1 | 2 | 3 | 4 | 5} style={textStyle}>
          {content || 'Heading'}
        </Title>
      </div>
    );
  }

  // 否则渲染普通文本
  return (
    <div style={containerStyle} onClick={handleClick}>
      <Text style={textStyle}>
        {content || 'Text Content'}
      </Text>
    </div>
  );
};

export default TypographyWidget;
