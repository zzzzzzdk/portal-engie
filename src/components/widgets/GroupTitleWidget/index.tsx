import React, { useMemo } from 'react';
import * as Icons from '@ant-design/icons';
import Icon from '@/components/Icon';
import { WidgetConfig } from '@/types';
import './index.scss'

interface GroupTitleWidgetProps {
  config?: WidgetConfig;
}

const GroupTitleWidget: React.FC<GroupTitleWidgetProps> = ({ config }) => {
  const renderIcon = () => {
    if (!config?.icon) {
      // return <Icons.FolderOpenOutlined style={{ fontSize: '18px', color: '#1890ff' }} />;
      return null
    }

    // 优先尝试渲染为 Ant Design Icon
    if ((Icons as any)[config.icon]) {
      const AntIcon = (Icons as any)[config.icon];
      return <AntIcon style={{ fontSize: '18px', color: '#1890ff' }} />;
    }

    // 如果不是 Ant Design Icon，则尝试渲染为自定义 Icon 组件
    return <Icon type={config.icon} style={{ fontSize: '18px', color: '#1890ff' }} />;
  };

  const backgroundStyle = useMemo(() => {
    if (config?.backgroundImage) {
      return {
        backgroundImage: `url(${config.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return { background: 'transparent' };
  }, [config?.backgroundImage]);


  return (
    <div
      className='group-title-widget'
      style={{
        ...backgroundStyle
      }}
    >
      <div className="group-title-content">
        {renderIcon()}
        {/* <Typography.Title level={5} style={{ margin: 0 }}>
          {config?.title || '分组标题'}
        </Typography.Title> */}
      </div>
    </div>
  );
};

export default GroupTitleWidget;
