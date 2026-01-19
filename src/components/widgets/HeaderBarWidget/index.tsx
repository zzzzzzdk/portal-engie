import React, { useMemo, useCallback } from 'react';
import { Typography, Avatar, Dropdown, Space, MenuProps, theme, Radio } from 'antd';
import { UserOutlined, LogoutOutlined, DownOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import IconRenderer from '@/components/IconRenderer';
import { WidgetConfig } from '@/types';
import { useSystemStore } from '@/store/useSystemStore';
import { useTheme } from '@/theme';
import './index.scss';

const { Text } = Typography;

interface HeaderBarWidgetProps {
  config?: WidgetConfig;
}

const HeaderBarWidget: React.FC<HeaderBarWidgetProps> = ({ config }) => {
  const { userInfo, sysConfig, logout } = useSystemStore();
  const { token } = theme.useToken();
  const { themeMode, setMode } = useTheme();

  // 换肤选项
  const themeOptions = [
    { label: <SunOutlined />, value: 'light' },
    { label: <MoonOutlined />, value: 'dark' },
  ];

  const renderIcon = () => {
    if (!config?.icon) {
      return null;
    }

    return (
      <IconRenderer
        value={config.icon}
        size={24}
        color="#1890ff"
        style={{ marginRight: 8 }}
        fallbackText={config.headerTitle}
      />
    );
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

  // 处理退出登录，清除 cookie 并跳转到 login_url
  const handleLogout = useCallback(() => {
    logout();
    // 跳转到系统配置的登录地址
    const loginUrl = sysConfig?.login_url;
    if (loginUrl) {
      window.location.href = loginUrl;
    } else {
      // 如果没有配置 login_url，跳转到默认登录页
      window.location.href = '/#/login';
    }
  }, [logout, sysConfig?.login_url]);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') {
      handleLogout();
    }
  };

  const userMenuProps: MenuProps = {
    items: [
      {
        key: 'user-info',
        label: (
          <div style={{ padding: '4px 0' }}>
            <Text strong>{userInfo?.user_info?.user_name || '用户'}</Text>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>
              {userInfo?.user_info?.account || ''}
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
              fontSize: config?.headerFontSize || 24,
            }}
          >
            {config?.headerTitle || ''}
          </Typography.Title>
        </div>

        {/* Right Section - Theme Switcher & User Profile */}
        <div className="right-section">
          {/* Theme Switcher */}
          {config?.showThemeSwitcher && (
            <div className="theme-switcher-section">
              <Radio.Group
                options={themeOptions}
                onChange={(e) => setMode(e.target.value)}
                value={themeMode}
                optionType="button"
                size="small"
              />
            </div>
          )}

          {/* User Profile Section */}
          {showUserProfile && (
            <div className="user-profile-section">
              <Dropdown menu={userMenuProps} trigger={['click']}>
                <div className="user-profile-trigger" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    style={{ backgroundColor: token.colorPrimary }}
                  />
                  <Space size={4}>
                    <Text style={{ color: config?.textColor || 'inherit' }}>{userInfo?.user_info?.user_name || '个人中心'}</Text>
                    <DownOutlined style={{ fontSize: '10px', color: config?.textColor || 'inherit' }} />
                  </Space>
                </div>
              </Dropdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderBarWidget;
