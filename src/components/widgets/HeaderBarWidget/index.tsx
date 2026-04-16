import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, Dropdown, Menu, Radio, Space, theme, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  DownOutlined,
  LogoutOutlined,
  MoonOutlined,
  MoreOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons'
import IconRenderer from '@/components/IconRenderer'
import { useCanvasTheme } from '@/hooks/useCanvasTheme'
import { useStore } from '@/store/useStore'
import { useSystemStore } from '@/store/useSystemStore'
import type { NavItem, WidgetConfig } from '@/types'
import { buildDeployedSystemSet, isSystemDeployed } from '@/utils/systemDeployment'
import { requestWidgetApi } from '@/utils/widgetApi'
import './index.scss'

const { Text } = Typography

interface HeaderNavItem extends NavItem {
  path?: string
}

interface HeaderBarWidgetConfig extends WidgetConfig {
  headerTitle?: string
  headerAlignment?: 'left' | 'center'
  headerFontSize?: number
  fontFamily?: string
  textColor?: string
  showThemeSwitcher?: boolean
  showUserProfile?: boolean
  navItems?: HeaderNavItem[]
  navDataSource?: 'static' | 'api' | 'customApi' | 'dataSource'
  navDataSourceId?: string
  navApiEndpoint?: string
  navApiMethod?: 'GET' | 'POST'
  navApiHeaders?: Record<string, string>
  navApiQuery?: Record<string, any> | string
  navApiBody?: Record<string, any> | string
  navApiListField?: string
  navTimeout?: number
  navTextColor?: string
  showNavMenu?: boolean
  navFieldMapping?: {
    name?: string
    url?: string
    icon?: string
  }
}

interface HeaderBarWidgetProps {
  config?: WidgetConfig
}

const mapHeaderNavItem = (
  item: any,
  mapping?: HeaderBarWidgetConfig['navFieldMapping'],
): HeaderNavItem => {
  if (!mapping || (!mapping.name && !mapping.url && !mapping.icon)) {
    return item as HeaderNavItem
  }

  return {
    ...item,
    name: item?.[mapping.name || 'name'] ?? item?.name,
    url: item?.[mapping.url || 'url'] ?? item?.url ?? item?.path,
    path: item?.[mapping.url || 'url'] ?? item?.path ?? item?.url,
    icon: item?.[mapping.icon || 'icon'] ?? item?.icon,
  }
}

const HeaderBarWidget: React.FC<HeaderBarWidgetProps> = ({ config }) => {
  const { userInfo, sysConfig, logout } = useSystemStore()
  const { isEditMode } = useStore()
  const { token } = theme.useToken()
  const { themeMode, setCanvasThemeMode } = useCanvasTheme()

  const headerConfig = config as HeaderBarWidgetConfig | undefined
  const [navItems, setNavItems] = useState<HeaderNavItem[]>(headerConfig?.navItems || [])
  const [navLoading, setNavLoading] = useState(false)

  const deployedSystemSet = useMemo(() => buildDeployedSystemSet(sysConfig), [sysConfig])

  const themeOptions = [
    { label: <SunOutlined />, value: 'light' },
    { label: <MoonOutlined />, value: 'dark' },
  ]

  const renderHeaderIcon = () => {
    if (!config?.icon) {
      return null
    }

    return (
      <IconRenderer
        value={config.icon}
        size={24}
        color={config.textColor || '#1890ff'}
        style={{ marginRight: 8 }}
        fallbackText={config.headerTitle}
      />
    )
  }

  const backgroundStyle = useMemo(() => {
    const { backgroundType, backgroundColor, backgroundImage, backgroundGradient } = config || {}

    if (backgroundType === 'image' && backgroundImage) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    }

    if (backgroundType === 'gradient' && backgroundGradient) {
      return { background: backgroundGradient }
    }

    if (backgroundType === 'color' && backgroundColor) {
      return { backgroundColor }
    }

    if (backgroundImage) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    }

    return { background: 'transparent' }
  }, [config])

  const handleLogout = useCallback(() => {
    logout()
    const loginUrl = sysConfig?.login_url

    if (loginUrl) {
      window.location.href = loginUrl
      return
    }

    window.location.href = '/#/login'
  }, [logout, sysConfig?.login_url])

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (isEditMode) {
      return
    }

    if (key === 'logout') {
      handleLogout()
    }
  }

  const userMenuProps: MenuProps = {
    items: [
      {
        key: 'user-info',
        label: (
          <div style={{ padding: '4px 0' }}>
            <Text strong>{userInfo?.user_info?.user_name || '用户'}</Text>
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
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
  }

  const getNavKey = useCallback((item: HeaderNavItem, index: number) => {
    return `nav-${index}-${item.id || item.url || item.path || item.name}`
  }, [])

  const navKeyMap = useMemo(() => {
    return navItems.reduce<Record<string, HeaderNavItem>>((map, item, index) => {
      map[getNavKey(item, index)] = item
      return map
    }, {})
  }, [navItems, getNavKey])

  const navMenuItems = useMemo(() => {
    return navItems.map((item, index) => {
      const isAvailable = isSystemDeployed(deployedSystemSet, item.systemId)

      return {
        key: getNavKey(item, index),
        label: item.name || '未命名',
        disabled: !isAvailable,
        icon: item.icon ? (
          <span style={!isAvailable ? { opacity: 0.45 } : undefined}>
            <IconRenderer
              value={item.icon}
              size={16}
              color={headerConfig?.navTextColor || headerConfig?.textColor || undefined}
              fallbackText={item.name}
            />
          </span>
        ) : undefined,
      }
    })
  }, [
    deployedSystemSet,
    getNavKey,
    headerConfig?.navTextColor,
    headerConfig?.textColor,
    navItems,
  ])

  const alignment = headerConfig?.headerAlignment || 'left'
  const showUserProfile = config?.showUserProfile
  const showNavMenu = headerConfig?.showNavMenu

  useEffect(() => {
    if (!showNavMenu) {
      setNavItems([])
      setNavLoading(false)
      return
    }

    let isMounted = true
    const hasStaticNav = Array.isArray(headerConfig?.navItems) && headerConfig.navItems.length > 0
    const dataSource =
      headerConfig?.navDataSource === 'api'
        ? 'customApi'
        : headerConfig?.navDataSource || (hasStaticNav ? 'static' : 'customApi')

    const loadNavItems = async () => {
      if (dataSource === 'static') {
        setNavItems(headerConfig?.navItems || [])
        return
      }

      const endpoint = headerConfig?.navApiEndpoint?.trim()
      if (!endpoint) {
        setNavItems([])
        return
      }

      setNavLoading(true)

      try {
        const result = await requestWidgetApi({
          endpoint,
          method: headerConfig?.navApiMethod || 'GET',
          headers: headerConfig?.navApiHeaders,
          query: headerConfig?.navApiQuery,
          body: headerConfig?.navApiBody,
          listField: headerConfig?.navApiListField,
          timeout: headerConfig?.navTimeout,
        })

        const sourceList = result.list.length
          ? result.list
          : Array.isArray(result.raw?.data)
            ? result.raw.data
            : Array.isArray(result.raw)
              ? result.raw
              : []

        const payload = sourceList.map((item: any) =>
          mapHeaderNavItem(item, headerConfig?.navFieldMapping),
        )

        if (isMounted) {
          setNavItems(payload)
        }
      } catch (error) {
        console.error('HeaderBarWidget: 导航数据加载失败', error)
        if (isMounted) {
          setNavItems([])
        }
      } finally {
        if (isMounted) {
          setNavLoading(false)
        }
      }
    }

    void loadNavItems()

    return () => {
      isMounted = false
    }
  }, [
    headerConfig?.navApiBody,
    headerConfig?.navApiEndpoint,
    headerConfig?.navApiHeaders,
    headerConfig?.navApiListField,
    headerConfig?.navApiMethod,
    headerConfig?.navApiQuery,
    headerConfig?.navDataSource,
    headerConfig?.navFieldMapping,
    headerConfig?.navItems,
    headerConfig?.navTimeout,
    showNavMenu,
  ])

  const handleNavClick: MenuProps['onClick'] = ({ key }) => {
    if (isEditMode) {
      return
    }

    const target = navKeyMap[key]
    const targetUrl = target?.url || target?.path

    if (!target || !targetUrl || !isSystemDeployed(deployedSystemSet, target.systemId)) {
      return
    }

    const shouldOpenNewTab = target.openInNew ?? /^https?:\/\//.test(targetUrl)
    if (shouldOpenNewTab) {
      window.open(targetUrl, '_blank')
      return
    }

    window.location.href = targetUrl
  }

  const navTextColor =
    headerConfig?.navTextColor || headerConfig?.textColor || config?.textColor || token.colorTextBase

  return (
    <div
      className={`header-bar-widget alignment-${alignment}`}
      style={backgroundStyle}
    >
      <div className="header-bar-content">
        <div className="title-section">
          {renderHeaderIcon()}
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
                onChange={event => {
                  if (!isEditMode) {
                    setCanvasThemeMode(event.target.value)
                  }
                }}
                value={themeMode}
                optionType="button"
                size="small"
                disabled={isEditMode}
              />
            </div>
          )}

          {showUserProfile && (
            <div className="user-profile-section">
              <Dropdown menu={userMenuProps} trigger={['click']} disabled={isEditMode}>
                <div
                  className="user-profile-trigger"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    style={{ backgroundColor: token.colorPrimary }}
                  />
                  <Space size={4}>
                    <Text style={{ color: config?.textColor || 'inherit' }}>
                      {userInfo?.user_info?.user_name || '个人中心'}
                    </Text>
                    <DownOutlined
                      style={{ fontSize: 10, color: config?.textColor || 'inherit' }}
                    />
                  </Space>
                </div>
              </Dropdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HeaderBarWidget
