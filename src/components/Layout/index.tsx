import React, { useState } from 'react';
import { Layout as AntdLayout, Button, Switch, Dropdown, Space, Tooltip, App as AntdApp } from 'antd';
import type { MenuProps } from 'antd'
import { PlusOutlined, SaveOutlined, AppstoreOutlined, FullscreenOutlined, LogoutOutlined, BgColorsOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { WidgetType } from '@/types';
import { Outlet, useNavigate } from 'react-router-dom';
import ThemeCustomizer from '@/components/ThemeCustomizer'
import { useTheme } from '@/theme'
import { isDevelopment } from '@/config/env'
import './index.scss';

const { Header, Content } = AntdLayout;

const Layout: React.FC = () => {
  const {
    isEditMode,
    setEditMode,
    addWidget,
    saveDashboard,
    toggleFullScreen,
    logout
  } = useStore();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const themeSystem = useTheme()
  const [customizerOpen, setCustomizerOpen] = useState(false)

  const handleAddWidget = (key: string) => {
    addWidget(key as WidgetType);
    const widgetNames: Record<string, string> = {
      clock: '时钟',
      stats: '统计卡片',
      chart: '图表',
      link: '快捷链接',
      news: '新闻动态',
      topList: '排行榜',
      search: '搜索',
      dataTable: '数据表格',
      cardGrid: '卡片网格',
      customForm: '自定义表单',
    };
    message.success(`已添加${widgetNames[key] || key}小部件`);
  };

  const items = [
    { label: '时钟', key: 'clock' },
    { label: '统计卡片', key: 'stats' },
    { label: '图表', key: 'chart' },
    { label: '快捷链接', key: 'link' },
    { label: '新闻动态', key: 'news' },
    { label: '排行榜', key: 'topList' },
    { label: '搜索', key: 'search' },
    { label: '数据表格', key: 'dataTable' },
    { label: '卡片网格', key: 'cardGrid' },
    { label: '自定义表单', key: 'customForm' },
  ];

  const handleSave = () => {
    saveDashboard();
    message.success('仪表盘保存成功');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleThemeChange: MenuProps['onClick'] = ({ key }) => {
    if (key === 'custom') {
      setCustomizerOpen(true)
      return
    }

    // 使用新的主题系统切换预设
    themeSystem.applyPreset(key as 'light' | 'dark' | 'blue' | 'purple', true)
  }

  // 主题切换菜单
  const themeMenuItems: MenuProps['items'] = [
    {
      key: 'light',
      label: '浅色主题',
    },
    {
      key: 'dark',
      label: '暗黑主题',
    },
    {
      type: 'divider',
    },
    {
      key: 'blue',
      label: '蓝色主题',
    },
    {
      key: 'purple',
      label: '紫色主题',
    },
    {
      type: 'divider',
    },
    {
      key: 'custom',
      label: '自定义主题...',
    },
  ]

  return (
    <AntdLayout className="app-layout">
      <Header className="app-header">
        <div className="app-header__logo">
          <AppstoreOutlined />
          Portal Engine
        </div>

        {/* 自定义主题配置器 */}
        <ThemeCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
        <Space size="middle">
          {/* 主题切换按钮 - 仅在开发环境显示 */}
          {isDevelopment() && (
            <Dropdown
              menu={{
                items: themeMenuItems,
                onClick: handleThemeChange,
                selectedKeys: [themeSystem.themePreset],
              }}
              placement="bottomRight"
            >
              <Button type="text" className="utility-btn" icon={<BgColorsOutlined />} title="主题切换" />
            </Dropdown>
          )}


          <Space>
            <span>编辑模式</span>
            <Switch checked={isEditMode} onChange={setEditMode} />
          </Space>

          <Dropdown
            menu={{
              items,
              onClick: ({ key }) => handleAddWidget(key)
            }}
            trigger={['click']}
            disabled={!isEditMode}
          >
            <Button type="primary" icon={<PlusOutlined />} disabled={!isEditMode}>
              添加小部件
            </Button>
          </Dropdown>

          <Button icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>

          <Tooltip title="全屏模式">
            <Button icon={<FullscreenOutlined />} onClick={toggleFullScreen} />
          </Tooltip>

          <Tooltip title="退出登录">
            <Button icon={<LogoutOutlined />} onClick={handleLogout} danger />
          </Tooltip>
        </Space>
      </Header>

      <Content className="app-content">
        <Outlet />
      </Content>
    </AntdLayout>
  );
};

export default Layout;
