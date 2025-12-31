import React, { useState } from 'react';
import { Layout as AntdLayout, Button, Switch, Dropdown, Space, Tooltip, App as AntdApp, Modal, Form, Input } from 'antd';
import type { MenuProps } from 'antd';
import { PlusOutlined, CloudUploadOutlined, AppstoreOutlined, FullscreenOutlined, LogoutOutlined, BgColorsOutlined, RobotOutlined, SettingOutlined, GroupOutlined, FolderOutlined, DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { useSystemStore } from '@/store/useSystemStore'
import { WidgetType, MicroAppModule } from '@/types';
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import ThemeCustomizer from '@/components/ThemeCustomizer'
import MicroAppMarket from '@/components/MicroAppMarket'
import GlobalMicroAppContainer from './GlobalMicroAppContainer'
import DashboardConfigDialog from '@/components/DashboardConfigDialog';
import FloatingControlPanel from '@/components/FloatingControlPanel';
import { useTheme } from '@/theme'
import { isDevelopment } from '@/config/env'
import { publishDashboard } from '@/services'
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
    createEmptyGroup,
    isFullScreen,
    toggleFullScreen,
    logout,
    widgets,
    groups,
    floatingModules,
    dashboardConfig,
    resetDashboard,
  } = useStore();
  const sysConfig = useSystemStore((state) => state.sysConfig)
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId'); // 从URL获取编辑的发布ID
  const { message, modal } = AntdApp.useApp();
  const themeSystem = useTheme()
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [dashboardConfigOpen, setDashboardConfigOpen] = useState(false)
  const [microAppMarketOpen, setMicroAppMarketOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishForm] = Form.useForm()
  const [microAppMarketMode, setMicroAppMarketMode] = useState<'widget' | 'floating' | 'global'>('widget')

  const handleAddWidget = (key: string) => {
    // 处理新建分组
    if (key === 'create-group') {
      handleCreateGroupContainer();
      return;
    }

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

    // 助手中心悬浮模块
    if (key === 'floating-assistantHub') {
      addFloatingModuleLocal(
        'assistantHub',
        '助手中心',
        {
          entries: [],
          collapsedIcon: 'CustomerServiceOutlined',
        },
        {
          defaultPosition: 'bottom-right',
          width: 720,
          height: 500,
          collapsedWidth: 60,
          collapsedHeight: 60,
        }
      );
      message.success('已添加助手中心悬浮模块');
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
      headerBar: '头部栏',
      pageNavigator: '页面切换工具',
      iconNav: '图标导航',
      navGroup: '导航组',
    };
    message.success(`已添加${widgetNames[key] || key}小部件`);
  };

  const handleCreateGroupContainer = () => {
    if (!isEditMode) {
      return;
    }
    const group = createEmptyGroup();
    message.success(`${group.title} 已创建，请拖入小部件`);
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
          icon: module.icon,
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
      label: '分组组件',
      children: [
        { label: '新建分组', key: 'create-group', icon: <GroupOutlined /> },
        { label: '头部栏', key: 'headerBar', icon: <FolderOutlined /> },
      ]
    },
    {
      type: 'divider',
    },
    {
      type: 'group',
      label: '基础小部件',
      children: [
        { label: '文本', key: 'typography' },
        { label: '时钟', key: 'clock' },
        { label: '统计卡片', key: 'stats' },
        { label: '图表', key: 'chart' },
        { label: '快捷链接', key: 'link' },
        { label: '页面切换', key: 'pageNavigator' },
        { label: '新闻动态', key: 'news' },
        { label: '排行榜', key: 'topList' },
        { label: '搜索', key: 'search' },
        { label: '数据表格', key: 'dataTable' },
        // { label: '卡片网格', key: 'cardGrid' },
        { label: '自定义表单', key: 'customForm' },
      ]
    },
    {
      type: 'divider',
    },
    {
      type: 'group',
      label: '导航组件',
      children: [
        { label: '图标导航', key: 'iconNav' },
        { label: '导航组', key: 'navGroup' },
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
        {
          label: '助手中心',
          key: 'floating-assistantHub',
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

  const handlePublish = () => {
    // 如果是编辑模式且有保存的标题，预填标题
    if (editId && dashboardConfig?.title) {
      publishForm.setFieldsValue({ title: dashboardConfig.title });
    }
    setPublishModalOpen(true);
  };

  const handlePublishSubmit = async () => {
    try {
      const values = await publishForm.validateFields();
      const res = await publishDashboard({
        id: editId || '', // 编辑模式下携带已发布的ID，实现更新而非新建
        title: values.title,
        widgets,
        groups,
        floatingModules,
        dashboardConfig,
      });
      console.log(res)
      message.success(editId ? '仪表盘更新成功' : '仪表盘发布成功');
      setPublishModalOpen(false);
      publishForm.resetFields();
    } catch (error) {
      console.log(error)
      message.error(editId ? '更新失败' : '发布失败');
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = sysConfig?.logout_url || ''
    // navigate('/login');
  };

  const handleThemeChange: MenuProps['onClick'] = ({ key }) => {
    if (key === 'custom') {
      setCustomizerOpen(true)
      return
    }

    // 使用新的主题系统切换预设
    themeSystem.applyPreset(key as 'light' | 'dark' | 'blue' | 'purple', true)
  }

  const handleResetDashboard = () => {
    modal.confirm({
      title: '确认清空页面',
      content: '此操作将清空所有组件和配置，恢复为空白页面。此操作无法撤销，确定要继续吗？',
      okText: '确认清空',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        resetDashboard();
        message.success('已恢复为空白页面');
      },
    });
  };

  const handleGoHome = () => {
    navigate('/')
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
    // {
    //   type: 'divider',
    // },
    // {
    //   key: 'blue',
    //   label: '蓝色主题',
    // },
    // {
    //   key: 'purple',
    //   label: '紫色主题',
    // },
    // {
    //   type: 'divider',
    // },
    // {
    //   key: 'custom',
    //   label: '自定义主题...',
    // },
  ]

  return (
    <AntdLayout className="app-layout">
      {!isFullScreen && (
        <Header className="app-header">
          <div className="app-header__logo" onClick={handleGoHome}>
            <AppstoreOutlined />
            Portal Engine
          </div>

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

            {/* 微应用配置按钮 */}
            <Tooltip title="微应用配置">
              <a href="#/micro-app-config" target='_blank' className="utility-btn">微应用配置</a>
            </Tooltip>

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
                添加组件
              </Button>
            </Dropdown>

            {isEditMode && (
              <>
                <Tooltip title="页面设置">
                  <Button icon={<SettingOutlined />} onClick={() => setDashboardConfigOpen(true)} >页面设置</Button>
                </Tooltip>

                <Tooltip title="清空页面">
                  <Button icon={<DeleteOutlined />} onClick={handleResetDashboard} danger>清空页面</Button>
                </Tooltip>

                {/* <Select
                  value={gridDensity}
                  onChange={(value) => setGridDensity(value as GridDensityKey)}
                  style={{ width: 100 }}
                >
                  {Object.entries(GRID_DENSITY_PRESETS).map(([key, preset]) => (
                    <Select.Option key={key} value={key}>
                      {preset.label}
                    </Select.Option>
                  ))}
                </Select> */}
              </>
            )}

            <Button icon={<CloudUploadOutlined />} onClick={handlePublish}>
              发布
            </Button>

            <Tooltip title="已发布列表">
              <Button icon={<UnorderedListOutlined />} onClick={() => navigate('/publish-list')} />
            </Tooltip>

            <Tooltip title="全屏模式">
              <Button icon={<FullscreenOutlined />} onClick={toggleFullScreen} />
            </Tooltip>

            <Tooltip title="退出登录">
              <Button icon={<LogoutOutlined />} onClick={handleLogout} danger />
            </Tooltip>
          </Space>
        </Header>
      )}

      {isFullScreen && (
        <FloatingControlPanel
          onAdd={handleAddWidget}
          addMenuItems={items}
          onOpenSettings={() => setDashboardConfigOpen(true)}
          onOpenMicroAppConfig={() => window.open('#/micro-app-config', '_blank')}
          onSave={handlePublish}
        />
      )}

      {/* 自定义主题配置器 */}
      <ThemeCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />

      {/* 微应用市场 */}
      <MicroAppMarket
        open={microAppMarketOpen}
        onClose={() => setMicroAppMarketOpen(false)}
        onSelectModule={handleSelectMicroApp}
        mode={microAppMarketMode}
      />

      <DashboardConfigDialog
        isOpen={dashboardConfigOpen}
        onClose={() => setDashboardConfigOpen(false)}
      />

      <Modal
        title="发布仪表盘"
        open={publishModalOpen}
        onOk={handlePublishSubmit}
        onCancel={() => setPublishModalOpen(false)}
      >
        <Form form={publishForm} layout="vertical">
          <Form.Item
            name="title"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Content className="app-content">
        <Outlet />
        {/* 全局无边框微应用挂载点 */}
        <GlobalMicroAppContainer />
      </Content>
    </AntdLayout>
  );
};

export default Layout;
