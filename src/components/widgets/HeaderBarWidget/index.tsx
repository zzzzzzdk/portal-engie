import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { Typography, Avatar, Dropdown, Space, MenuProps, theme, Radio, Menu } from 'antd';
import { UserOutlined, LogoutOutlined, DownOutlined, SunOutlined, MoonOutlined, MoreOutlined } from '@ant-design/icons';
import axios from 'axios';
import IconRenderer from '@/components/IconRenderer';
import { WidgetConfig, NavItem } from '@/types';
import { useSystemStore } from '@/store/useSystemStore';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import './index.scss';

const { Text } = Typography;

interface HeaderNavItem extends NavItem {
  path?: string;
}

interface HeaderBarWidgetConfig extends WidgetConfig {
  headerTitle?: string;
  headerAlignment?: 'left' | 'center';
  headerFontSize?: number;
  fontFamily?: string;
  textColor?: string;
  showThemeSwitcher?: boolean;
  showUserProfile?: boolean;
  navItems?: HeaderNavItem[];
  navDataSource?: 'static' | 'api';
  navApiEndpoint?: string;
  navTextColor?: string;
  showNavMenu?: boolean;
  // 接口请求配置
  navApiMethod?: 'GET' | 'POST';
  navApiHeaders?: Record<string, string>;
  // 响应字段映射
  navFieldMapping?: {
    name?: string;   // 名称字段，默认 name
    url?: string;    // 链接字段，默认 url
    icon?: string;   // 图标字段，默认 icon
  };
}

interface HeaderBarWidgetProps {
  config?: WidgetConfig;
}

const HeaderBarWidget: React.FC<HeaderBarWidgetProps> = ({ config }) => {
  const { userInfo, sysConfig, logout } = useSystemStore();
  const { token } = theme.useToken();
  const { themeMode, setCanvasThemeMode } = useCanvasTheme();

  // 换肤选项
  const themeOptions = [
    { label: <SunOutlined />, value: 'light' },
    { label: <MoonOutlined />, value: 'dark' },
  ];

  const headerConfig = config as HeaderBarWidgetConfig | undefined;
  const [navItems, setNavItems] = useState<HeaderNavItem[]>(headerConfig?.navItems || []);
  const [navLoading, setNavLoading] = useState(false);

  const renderIcon = () => {
    if (!config?.icon) {
      return null;
    }

    return (
      <IconRenderer
        value={config.icon}
        size={24}
        color={config?.textColor ||"#1890ff"}
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

  const getNavKey = useCallback((item: HeaderNavItem, index: number) => {
    return `nav-${index}-${item.id || item.url || item.path || item.name}`;
  }, []);

  const navKeyMap = useMemo(() => {
    return navItems.reduce<Record<string, HeaderNavItem>>((map, item, index) => {
      map[getNavKey(item, index)] = item;
      return map;
    }, {});
  }, [navItems, getNavKey]);

  const navMenuItems = useMemo(() => {
    return navItems.map((item, index) => ({
      key: getNavKey(item, index),
      label: item.name || '未命名',
    }));
  }, [navItems, getNavKey]);

  const alignment = headerConfig?.headerAlignment || 'left';
  const showUserProfile = config?.showUserProfile;
  const showNavMenu = headerConfig?.showNavMenu;

  // 导航数据加载
  useEffect(() => {
    if (!showNavMenu) {
      setNavItems([]);
      setNavLoading(false);
      return;
    }

    let isMounted = true;
    const hasStaticNav = Array.isArray(headerConfig?.navItems) && headerConfig?.navItems.length;
    const dataSource = headerConfig?.navDataSource || (hasStaticNav ? 'static' : 'api');

    const loadNavItems = async () => {
      if (dataSource === 'static') {
        setNavItems(headerConfig?.navItems || []);
        return;
      }

      const endpoint = headerConfig?.navApiEndpoint?.trim();

      if (!endpoint) {
        setNavItems([]);
        return;
      }

      setNavLoading(true);
      try {
        const method = headerConfig?.navApiMethod || 'GET';
        const headers = headerConfig?.navApiHeaders;
        const response = await axios({ method, url: endpoint, ...(headers ? { headers } : {}) });
        const rawPayload = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];

        // 字段映射
        const mapping = headerConfig?.navFieldMapping;
        const payload = (mapping && (mapping.name || mapping.url || mapping.icon))
          ? rawPayload.map((item: any) => ({
              ...item,
              name: item[mapping.name || 'name'] ?? item.name,
              url: item[mapping.url || 'url'] ?? item.url,
              icon: item[mapping.icon || 'icon'] ?? item.icon,
            }))
          : rawPayload;

        if (isMounted) {
          setNavItems(payload as HeaderNavItem[]);
        }
      } catch (error) {
        console.error('HeaderBarWidget: 导航数据加载失败', error);
        if (isMounted) {
          setNavItems([]);
        }
      } finally {
        if (isMounted) {
          setNavLoading(false);
        }
      }
    };

    loadNavItems();

    return () => {
      isMounted = false;
    };
  }, [showNavMenu, headerConfig?.navItems, headerConfig?.navDataSource, headerConfig?.navApiEndpoint, headerConfig?.navApiMethod, headerConfig?.navApiHeaders, headerConfig?.navFieldMapping]);

  const handleNavClick: MenuProps['onClick'] = ({ key }) => {
    const target = navKeyMap[key];
    const targetUrl = target?.url || target?.path;
    if (!target || !targetUrl) {
      return;
    }

    const shouldOpenNewTab = target.openInNew ?? /^https?:\/\//.test(targetUrl);
    if (shouldOpenNewTab) {
      window.open(targetUrl, '_blank');
    } else {
      window.location.href = targetUrl;
    }
  };

  const navTextColor = headerConfig?.navTextColor || headerConfig?.textColor || config?.textColor || token.colorTextBase;

  return (
    <div
      className={`header-bar-widget alignment-${alignment}`}
      style={{
        ...backgroundStyle,
      }}
    >
      <div className="header-bar-content">
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
            {headerConfig?.headerTitle || ''}
          </Typography.Title>
        </div>

        {showNavMenu && (
          <div
            className="nav-section"
            style={{ ['--header-nav-color' as string]: navTextColor } as React.CSSProperties}
          >
            {navLoading ? (
              <Text type="secondary">导航加载中...</Text>
            ) : navMenuItems.length > 0 ? (
              <Menu
                mode="horizontal"
                selectable={false}
                items={navMenuItems}
                onClick={handleNavClick}
                className="header-nav-menu"
                overflowedIndicator={<MoreOutlined />}
              />
            ) : (
              <Text type="secondary">暂无导航配置</Text>
            )}
          </div>
        )}

        <div className="right-section">
          {config?.showThemeSwitcher && (
            <div className="theme-switcher-section">
              <Radio.Group
                options={themeOptions}
                onChange={(e) => setCanvasThemeMode(e.target.value)}
                value={themeMode}
                optionType="button"
                size="small"
              />
            </div>
          )}

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
