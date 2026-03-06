import React, { useState, useMemo, useEffect } from 'react';
import { Layout as AntdLayout, Button, Switch, Space, Tooltip, App as AntdApp, Modal, Form, Input, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { PlusOutlined, CloudUploadOutlined, FullscreenOutlined, SettingOutlined, DeleteOutlined, UnorderedListOutlined, DashboardOutlined, ApiOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { useSystemStore } from '@/store/useSystemStore'
import { WidgetType, MicroAppModule, Widget } from '@/types';
import { Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import ThemeCustomizer from '@/components/ThemeCustomizer'
import MicroAppMarket from '@/components/MicroAppMarket'
import GlobalMicroAppContainer from './GlobalMicroAppContainer'
import DashboardConfigDialog from '@/components/DashboardConfigDialog';
import ConfigDialog from '@/components/ConfigDialog';
import FloatingControlPanel from '@/components/FloatingControlPanel';
import WidgetDrawer from '@/components/WidgetDrawer';
import Icon from '@/components/Icon';
import { useCanvasTheme } from '@/hooks/useCanvasTheme'
import { getStylePreset } from '@/theme/tokens/styles'
import { useConfigStore } from '@/store/useConfigStore'
import { useAutoSave } from '@/hooks/useAutoSave'
import { publishDashboard, serializeDashboardSnapshot } from '@/services'
import captureDashboardCover from '@/utils/captureDashboardCover'
import sanitizeDashboardConfig from '@/utils/dashboardConfig'
import { DASHBOARD_LAST_EDIT_ID_KEY } from '@/constants/dashboard'
import Logo from '@/assets/images/logo.svg'
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
    configPanelTarget,
    dashboardConfig,
    resetDashboard,
    closeConfigPanel,
    updateDashboardConfig,
    clearDirty,
  } = useStore();
  const sysConfig = useSystemStore((state) => state.sysConfig)
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId'); // 从URL获取编辑的发布ID
  const { message, modal } = AntdApp.useApp();
  const canvasTheme = useCanvasTheme()
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [dashboardConfigOpen, setDashboardConfigOpen] = useState(false)
  const [microAppMarketOpen, setMicroAppMarketOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishForm] = Form.useForm()
  const [microAppMarketMode, setMicroAppMarketMode] = useState<'widget' | 'floating' | 'global'>('widget')
  const [widgetDrawerOpen, setWidgetDrawerOpen] = useState(false)
  const [publishAction, setPublishAction] = useState<'publish' | 'draft'>('publish')
  const [publishLoading, setPublishLoading] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'error' | 'idle'>('idle')
  const currentAppName = dashboardConfig?.title?.trim() ? dashboardConfig.title : '未命名'
  const draftLoading = publishLoading && publishAction === 'draft'
  const publishButtonLoading = publishLoading && publishAction === 'publish'
  const configPanelWidget = useMemo(() => {
    if (!configPanelTarget) {
      return null;
    }
    if (configPanelTarget.type === 'widget') {
      return widgets.find((widget) => widget.id === configPanelTarget.id) || null;
    }
    if (configPanelTarget.type === 'floating') {
      return floatingModules.find((module) => module.id === configPanelTarget.id) || null;
    }
    if (configPanelTarget.type === 'group') {
      const group = groups.find((item) => item.id === configPanelTarget.id);
      if (!group) {
        return null;
      }
      const groupWidget = {
        id: group.id,
        type: 'group',
        title: group.title,
        layout: group.layout,
        config: group.config || {},
      };
      return groupWidget as unknown as Widget;
    }
    return null;
  }, [configPanelTarget, widgets, floatingModules, groups])

  useEffect(() => {
    if (configPanelTarget && !configPanelWidget) {
      closeConfigPanel();
    }
  }, [configPanelTarget, configPanelWidget, closeConfigPanel])

  useEffect(() => {
    if (!isEditMode) {
      setWidgetDrawerOpen(false);
      closeConfigPanel();
    }
  }, [isEditMode, closeConfigPanel])

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
      headerBar: '导航栏',
      pageNavigator: '页面切换工具',
      iconNav: '图标导航',
      navGroup: '导航组',
      typography: '文本',
      carousel: '轮播图',
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


  const openPublishModal = (action: 'publish' | 'draft') => {
    setPublishAction(action);
    if (dashboardConfig?.title) {
      publishForm.setFieldsValue({ title: dashboardConfig.title });
    } else {
      publishForm.resetFields();
    }
    setPublishModalOpen(true);
  };

  const handlePublish = () => {
    openPublishModal('publish');
  };

  const handlePublishSubmit = async () => {
    let currentAction: 'publish' | 'draft' = publishAction;
    try {
      const values = await publishForm.validateFields();
      const baseDashboardConfig = sanitizeDashboardConfig(dashboardConfig);
      // 画布级主题配置已在 dashboardConfig 中（themeMode/styleMode），全局配色从 ConfigStore 取
      const { themePreset, baseColors } = useConfigStore.getState();
      const canvasStyleMode = baseDashboardConfig.styleMode || 'normal';
      const canvasThemeMode = baseDashboardConfig.themeMode || 'light';
      const publishConfig = {
        ...baseDashboardConfig,
        themeMode: canvasThemeMode,
        themePreset,
        styleMode: canvasStyleMode,
        styleTokens: getStylePreset(canvasStyleMode as 'normal' | 'minimal', canvasThemeMode === 'dark'),
        baseColors,
        title: values.title,
      };
      const snapshot = {
        widgets,
        groups,
        floatingModules,
        dashboardConfig: publishConfig,
      };
      const coverImageBase64 = await captureDashboardCover();
      if (!coverImageBase64) {
        message.warning('封面生成失败，将继续提交');
      }
      setPublishLoading(true);
      currentAction = publishAction;
      const res = await publishDashboard({
        id: editId || undefined,
        title: values.title,
        dashboardConfig: serializeDashboardSnapshot(snapshot),
        status: currentAction === 'publish' ? 1 : 0,
        cover_url: coverImageBase64 || undefined,
      });
      if (res.code !== 20000 || !res.data) {
        throw new Error(res.message || '请求失败');
      }
      const responseId = res.data.id || editId || '';
      if (responseId) {
        const params = new URLSearchParams(searchParams);
        params.set('editId', responseId);
        navigate({
          pathname: location.pathname,
          search: params.toString(),
        }, { replace: true });
        if (typeof window !== 'undefined') {
          localStorage.setItem(DASHBOARD_LAST_EDIT_ID_KEY, responseId);
        }
      }
      updateDashboardConfig({
        title: values.title,
      });
      clearDirty();
      message.success(currentAction === 'publish' ? '工作台发布成功' : '暂存成功');
      setPublishModalOpen(false);
      publishForm.resetFields();
    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.message || (currentAction === 'publish' ? "发布失败" : '暂存失败')
      message.error(errorMsg);
    } finally {
      setPublishLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = sysConfig?.logout_url || ''
    // navigate('/login');
  };

  const handleStyleModeChange = (mode: 'normal' | 'minimal') => {
    if (canvasTheme.styleMode === mode) {
      message.info(`已是${mode === 'normal' ? '标准' : '极简'}风格`)
      return
    }
    canvasTheme.setCanvasStyleMode(mode)
    message.success(`已切换到${mode === 'normal' ? '标准' : '极简'}风格（仅当前画布）`)
  }

  const handleThemeModeChange = (mode: 'light' | 'dark') => {
    if (canvasTheme.themeMode === mode) {
      message.info(`已是${mode === 'light' ? '浅色' : '深色'}模式`)
      return
    }
    canvasTheme.setCanvasThemeMode(mode)
    message.success(`已切换到${mode === 'light' ? '浅色' : '深色'}模式（仅当前画布）`)
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
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DASHBOARD_LAST_EDIT_ID_KEY);
        }
        // 清除 URL 中的 editId 参数
        const params = new URLSearchParams(searchParams);
        if (params.has('editId')) {
          params.delete('editId');
          navigate({
            pathname: location.pathname,
            search: params.toString(),
          }, { replace: true });
        }
        message.success('已恢复为空白页面');
      },
    });
  };

  const handleGoHome = () => {
    navigate('/')
  }

  // 头部导航菜单配置
  const headerMenuItems: MenuProps['items'] = [
    {
      key: '/dashboard-gridstack',
      icon: <DashboardOutlined />,
      label: '工作台',
    },
    {
      key: '/micro-app-config',
      icon: <ApiOutlined />,
      label: '微应用配置',
    },
    {
      key: '/publish-list',
      icon: <UnorderedListOutlined />,
      label: '应用列表',
    },
  ];

  // 获取当前路由对应的菜单 key
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('micro-app-config')) return '/micro-app-config';
    if (path.includes('publish-list')) return '/publish-list';
    return '/dashboard-gridstack';
  };
  const isDashboardRoute = location.pathname === '/' || location.pathname.includes('dashboard-gridstack');

  // 自动保存
  const { lastSaveTimeRef } = useAutoSave({
    enabled: isDashboardRoute,
    onSaveStatusChange: setAutoSaveStatus,
  });

  // 自动保存状态提示
  const autoSaveIndicator = useMemo(() => {
    if (autoSaveStatus === 'saving') {
      return <span className="auto-save-indicator"><SyncOutlined spin /> 自动保存中...</span>;
    }
    if (autoSaveStatus === 'saved') {
      const timeStr = lastSaveTimeRef.current
        ? lastSaveTimeRef.current.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : '';
      return <span className="auto-save-indicator saved"><CheckCircleOutlined /> 
      已自动保存 
      {/* {timeStr} */}
      </span>;
    }
    if (autoSaveStatus === 'error') {
      return <span className="auto-save-indicator error"><ExclamationCircleOutlined /> 自动保存失败</span>;
    }
    return null;
  }, [autoSaveStatus, lastSaveTimeRef]);

  // 导航菜单点击处理
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  return (
    <AntdLayout className="app-layout">
      {!isFullScreen && (
        <>
          <Header className="app-header">
            <div className="app-header__left">
              <div className="app-header__logo" onClick={handleGoHome}>
                <img src={Logo} alt="描述文字" width="52" height="24" />
                Portal Engine
              </div>
              <Menu
                mode="horizontal"
                selectedKeys={[getSelectedKey()]}
                items={headerMenuItems}
                onClick={handleMenuClick}
                className="app-header__menu"
              />
            </div>

            <Space size="middle">
              <Tooltip title="退出登录">
                <Button type="text" icon={<Icon type="line_tuichu" />} onClick={handleLogout} />
              </Tooltip>
            </Space>
          </Header>

          {isDashboardRoute && (
            <div className="app-sub-header">
              <div className="app-sub-header__title">
                <span className="app-sub-header__name">{currentAppName}</span>
              </div>

              <div className="app-sub-header__actions">
                <div className="app-sub-header__mode">
                  <span className="app-sub-header__mode-label">编辑模式</span>
                  <Switch checked={isEditMode} onChange={setEditMode} />
                </div>

                <Space size={12} wrap>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!isEditMode}
                    onClick={() => setWidgetDrawerOpen(true)}
                    className='add'
                  >
                    添加组件
                  </Button>

                  {isEditMode && (
                    <>
                      <Button icon={<SettingOutlined />} onClick={() => setDashboardConfigOpen(true)} className='set'>页面设置</Button>

                      <Button icon={<DeleteOutlined />} onClick={handleResetDashboard} danger className='clear'>清空页面</Button>
                    </>
                  )}

                  <Button icon={<SaveOutlined />} onClick={() => openPublishModal('draft')} disabled={!isEditMode} loading={draftLoading} className='save'>
                    保存
                  </Button>

                  {autoSaveIndicator}

                  <Button className="app-sub-header__publish-btn" icon={<CloudUploadOutlined />} loading={publishButtonLoading} onClick={handlePublish}>
                    发布
                  </Button>
                  <div className="app-sub-header__style-toggle">
                    <Button.Group size="small">
                      <Button
                        type={canvasTheme.themeMode === 'light' ? 'primary' : 'default'}
                        onClick={() => handleThemeModeChange('light')}
                      >
                        浅色
                      </Button>
                      <Button
                        type={canvasTheme.themeMode === 'dark' ? 'primary' : 'default'}
                        onClick={() => handleThemeModeChange('dark')}
                      >
                        深色
                      </Button>
                    </Button.Group>
                    <Button.Group size="small" style={{ marginLeft: 4 }}>
                      <Button
                        type={canvasTheme.styleMode === 'normal' ? 'primary' : 'default'}
                        onClick={() => handleStyleModeChange('normal')}
                      >
                        标准
                      </Button>
                      <Button
                        type={canvasTheme.styleMode === 'minimal' ? 'primary' : 'default'}
                        onClick={() => handleStyleModeChange('minimal')}
                      >
                        极简
                      </Button>
                    </Button.Group>
                  </div>
                  <Button onClick={toggleFullScreen} className='full' icon={<FullscreenOutlined />} />
                </Space>
              </div>
            </div>
          )}
        </>
      )}

      {isFullScreen && isDashboardRoute && (
        <FloatingControlPanel
          onAddWidget={() => setWidgetDrawerOpen(true)}
          onOpenSettings={() => setDashboardConfigOpen(true)}
          onResetPage={handleResetDashboard}
          onSaveDraft={() => openPublishModal('draft')}
          onPublish={handlePublish}
          onExitFullScreen={toggleFullScreen}
          isSavingDraft={draftLoading}
          isPublishing={publishButtonLoading}
        />
      )}

      <Content className="app-content">
        <div className="app-content__workspace">
          {isDashboardRoute && (
            <div className={`app-content__sidebar ${widgetDrawerOpen ? 'is-open' : ''}`}>
              <WidgetDrawer
                open={widgetDrawerOpen}
                onClose={() => setWidgetDrawerOpen(false)}
                onSelect={handleAddWidget}
              />
            </div>
          )}
          <div className="app-content__main">
            <Outlet />
            {/* 全局无边框微应用挂载点 */}
            <GlobalMicroAppContainer />
          </div>
          {isDashboardRoute && (
            <div className={`app-content__inspector ${configPanelWidget ? 'is-open' : ''}`}>
              {configPanelWidget && (
                <ConfigDialog
                  isOpen={!!configPanelWidget}
                  onClose={closeConfigPanel}
                  widget={configPanelWidget}
                />
              )}
            </div>
          )}
        </div>
      </Content>

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
        title={publishAction === 'draft' ? "保存" : "发布"}
        open={publishModalOpen}
        onOk={handlePublishSubmit}
        onCancel={() => setPublishModalOpen(false)}
        confirmLoading={publishLoading}
      >
        <Form form={publishForm} layout="vertical">
          <Form.Item
            name="title"
            label="名称"
            rules={[
              { required: true, whitespace: true, message: '请输入名称' },
              { max: 30, message: '名称最多30个字符' },
            ]}
          >
            <Input placeholder="请输入名称" maxLength={30} showCount />
          </Form.Item>
        </Form>
      </Modal>

    </AntdLayout>
  );
};

export default Layout;
