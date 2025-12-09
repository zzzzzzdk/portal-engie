import React from 'react';
import { Typography } from 'antd';
import { WidgetConfig } from '@/types';

interface TypographyWidgetProps {
  config: WidgetConfig;
}

const { Title, Text } = Typography;

const TypographyWidget: React.FC<TypographyWidgetProps> = ({ config }) => {
  const { content, level, color, textAlign, fontSize, fontWeight } = config;
  
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', // 默认垂直居中
    alignItems: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
    padding: '0 8px',
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
      <div style={containerStyle}>
        <Title level={level as 1 | 2 | 3 | 4 | 5} style={textStyle}>
          {content || 'Heading'}
        </Title>
      </div>
    );
  }

  // 否则渲染普通文本
  return (
    <div style={containerStyle}>
      <Text style={textStyle}>
        {content || 'Text Content'}
      </Text>
    </div>
  );
};

export default TypographyWidget;
