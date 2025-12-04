import React, { useState } from 'react';
import { Layout as AntdLayout, Button, Switch, Dropdown, Space, Tooltip, App as AntdApp } from 'antd';
import type { MenuProps } from 'antd'
import { PlusOutlined, SaveOutlined, AppstoreOutlined, FullscreenOutlined, LogoutOutlined, BgColorsOutlined, MessageOutlined, BellOutlined, RobotOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { WidgetType, MicroAppModule } from '@/types';
import { Outlet, useNavigate } from 'react-router-dom';
import ThemeCustomizer from '@/components/ThemeCustomizer'
import MicroAppMarket from '@/components/MicroAppMarket'
import GlobalMicroAppContainer from './GlobalMicroAppContainer'
import { useTheme } from '@/theme'
import { isDevelopment } from '@/config/env'
import './index.scss';

const { Header, Content } = AntdLayout;

const Layout: React.FC = () => {
  const {
    isEditMode,
    setEditMode,
    addWidget,
    addMicroAppWidget,
    addFloatingModuleLocal,
    addFloatingModuleMicroApp,
    saveDashboard,
    toggleFullScreen,
    logout
  } = useStore();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const themeSystem = useTheme()
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [microAppMarketOpen, setMicroAppMarketOpen] = useState(false)
  const [microAppMarketMode, setMicroAppMarketMode] = useState<'widget' | 'floating' | 'global'>('widget')

  const handleAddWidget = (key: string) => {
    // 如果是微应用类型,打开微应用市场
    if (key === 'microApp') {
      setMicroAppMarketMode('widget');
      setMicroAppMarketOpen(true);
      return;
    }

    // 处理悬浮模块 - 本地组件
    if (key === 'floating-chat') {
      addFloatingModuleLocal(
        'chat',
        '在线客服',
        {
          botName: 'AI 智能助手',
          welcomeMessage: '您好！我是 AI 智能助手，有什么可以帮您的吗？',
          onSendMessage: async (msg: string) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (msg.includes('你好') || msg.includes('您好')) {
              return '您好！很高兴为您服务！';
            } else if (msg.includes('帮助')) {
              return '我可以帮您解答问题、提供建议等。请告诉我您需要什么帮助？';
            }
            return `收到您的消息："${msg}"。我会尽快为您处理！`;
          },
        },
        {
          width: 380,
          height: 400,
          defaultPosition: 'bottom-right',
        }
      );
      message.success('已添加在线客服悬浮模块');
      return;
    }

    if (key === 'floating-notification') {
      addFloatingModuleLocal(
        'notification',
        '通知中心',
        {
          notifications: [
            {
              id: '1',
              type: 'info' as const,
              title: '欢迎使用',
              content: '欢迎使用通知中心功能！',
              time: new Date(),
              read: false,
            }
          ],
        },
        {
          width: 400,
          height: 400,
          defaultPosition: 'top-right',
        }
      );
      message.success('已添加通知中心悬浮模块');
      return;
    }

    // 悬浮模块 - 微应用（打开微应用市场，以悬浮模式添加）
    if (key === 'floating-microApp') {
      setMicroAppMarketMode('floating');
      setMicroAppMarketOpen(true);
      return;
    }

    // 全局微应用 - 适用于自带窗口管理的机器人等
    if (key === 'global-microApp') {
      setMicroAppMarketMode('global');
      setMicroAppMarketOpen(true);
      return;
    }

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

  const handleSelectMicroApp = (systemId: string, moduleId: string, module: MicroAppModule) => {
    if (microAppMarketMode === 'floating') {
      // 以悬浮模块形式添加
      addFloatingModuleMicroApp(
        systemId,
        moduleId,
        module,
        {
          width: 400,
          height: 400,
          defaultPosition: 'bottom-right',
        }
      );
      message.success(`已添加悬浮模块: ${module.name}`);
    } else if (microAppMarketMode === 'global') {
      // 以全局无边框模式添加
      useStore.getState().addGlobalMicroApp(
        systemId,
        moduleId,
        module
      );
      message.success(`已添加全局微应用: ${module.name}`);
    } else {
      // 以小部件形式添加到网格
      addMicroAppWidget(systemId, moduleId, module);
      message.success(`已添加微应用: ${module.name}`);
    }
  };

  // 分组的小部件菜单
  const items: MenuProps['items'] = [
    {
      type: 'group',
      label: '基础小部件',
      children: [
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
      ]
    },
    {
      type: 'divider',
    },
    {
      type: 'group',
      label: '微应用小部件',
      children: [
        {
          label: '微应用',
          key: 'microApp',
          icon: <AppstoreOutlined />
        },
      ]
    },
    {
      type: 'divider',
    },
    {
      type: 'group',
      label: '悬浮模块',
      children: [
        // {
        //   label: '在线客服',
        //   key: 'floating-chat',
        //   icon: <MessageOutlined />
        // },
        // {
        //   label: '通知中心',
        //   key: 'floating-notification',
        //   icon: <BellOutlined />
        // },
        {
          label: '微应用（悬浮）',
          key: 'floating-microApp',
          icon: <RobotOutlined />
        },
        // {
        //   label: '微应用（无边框）',
        //   key: 'global-microApp',
        //   icon: <RobotOutlined style={{ color: '#faad14' }} />
        // },
      ]
    }
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

        {/* 微应用市场 */}
        <MicroAppMarket
          open={microAppMarketOpen}
          onClose={() => setMicroAppMarketOpen(false)}
          onSelectModule={handleSelectMicroApp}
          mode={microAppMarketMode}
        />

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
        {/* 全局无边框微应用挂载点 */}
        <GlobalMicroAppContainer />
      </Content>
    </AntdLayout>
  );
};

export default Layout;
