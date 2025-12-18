import React, { useMemo } from 'react';
import { Typography, Avatar, Dropdown, Space, MenuProps, theme } from 'antd';
import * as Icons from '@ant-design/icons';
import { UserOutlined, LogoutOutlined, DownOutlined } from '@ant-design/icons';
import Icon from '@/components/Icon';
import { WidgetConfig } from '@/types';
import { useStore } from '@/store/useStore';
import './index.scss';

const { Text } = Typography;

interface HeaderBarWidgetProps {
  config?: WidgetConfig;
}

const HeaderBarWidget: React.FC<HeaderBarWidgetProps> = ({ config }) => {
  const { userInfo, logout } = useStore();
  const { token } = theme.useToken();

  const renderIcon = () => {
    if (!config?.icon) {
      return null;
    }

    // 优先尝试渲染为 Ant Design Icon
    if ((Icons as any)[config.icon]) {
      const AntIcon = (Icons as any)[config.icon];
      return <AntIcon style={{ fontSize: '24px', color: '#1890ff', marginRight: 8 }} />;
    }

    // 如果不是 Ant Design Icon，则尝试渲染为自定义 Icon 组件
    return <Icon type={config.icon} style={{ fontSize: '24px', color: '#1890ff', marginRight: 8 }} />;
  };

  const backgroundStyle = useMemo(() => {
    const { backgroundType, backgroundColor, backgroundImage, backgroundGradient } = config || {};

    if (backgroundType === 'image' && backgroundImage) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    if (backgroundType === 'gradient' && backgroundGradient) {
      return { background: backgroundGradient };
    }
    if (backgroundType === 'color' && backgroundColor) {
      return { backgroundColor };
    }
    // 兼容旧数据：直接使用 backgroundImage
    if (backgroundImage) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return { background: 'transparent' };
  }, [config]);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') {
      logout();
    }
  };

  const userMenuProps: MenuProps = {
    items: [
      {
        key: 'user-info',
        label: (
          <div style={{ padding: '4px 0' }}>
            <Text strong>{userInfo?.username || '用户'}</Text>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>
              {userInfo?.email || 'user@example.com'}
            </div>
          </div>
        ),
        disabled: true,
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
        danger: true,
      },
    ],
    onClick: handleMenuClick,
  };

  const alignment = config?.headerAlignment || 'left';
  const showUserProfile = config?.showUserProfile;

  return (
    <div
      className={`header-bar-widget ${alignment === 'center' ? 'align-center' : ''}`}
      style={{
        ...backgroundStyle,
      }}
    >
      <div className="header-bar-content">
        {/* Title Section */}
        <div className="title-section">
          {renderIcon()}
          <Typography.Title
            level={4}
            style={{
              margin: 0,
              color: config?.textColor,
              fontFamily: config?.fontFamily || 'YouSheBiaoTiHei',
            }}
          >
            {config?.headerTitle || ''}
          </Typography.Title>
        </div>

        {/* User Profile Section - Right aligned */}
        {showUserProfile && (
          <div className="user-profile-section">
            <Dropdown menu={userMenuProps} trigger={['click']}>
              <div className="user-profile-trigger" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  src={userInfo?.avatar}
                  style={{ backgroundColor: token.colorPrimary }}
                />
                <Space size={4}>
                  <Text style={{ color: config?.textColor || 'inherit' }}>{userInfo?.username || '个人中心'}</Text>
                  <DownOutlined style={{ fontSize: '10px', color: config?.textColor || 'inherit' }} />
                </Space>
              </div>
            </Dropdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderBarWidget;
