import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Layout as AntdLayout, Button, Switch, Space, Tooltip, App as AntdApp, Modal, Form, Input, Menu, Spin } from 'antd';
import type { MenuProps, InputRef } from 'antd';
import { PlusOutlined, CloudUploadOutlined, FullscreenOutlined, SettingOutlined, DeleteOutlined, UnorderedListOutlined, ApiOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined, ExclamationCircleOutlined, LeftOutlined, EditOutlined, CheckOutlined, CloseOutlined, ImportOutlined, FileTextOutlined, RobotOutlined, DatabaseOutlined, GlobalOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { useSystemStore } from '@/store/useSystemStore'
import { WidgetType, MicroAppModule, Widget } from '@/types';
import { Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { flushSync } from 'react-dom';
import ThemeCustomizer from '@/components/ThemeCustomizer'
import MicroAppMarket from '@/components/MicroAppMarket'
import GlobalMicroAppContainer from './GlobalMicroAppContainer'
import DashboardConfigDialog from '@/components/DashboardConfigDialog';
import ConfigDialog from '@/components/ConfigDialog';
import FloatingControlPanel from '@/components/FloatingControlPanel';
import WorkspaceSidebar, { WorkspaceSidebarTabKey } from '@/components/WorkspaceSidebar';
import Icon from '@/components/Icon';
import { useCanvasTheme } from '@/hooks/useCanvasTheme'
import { getStylePreset } from '@/theme/tokens/styles'
import { useConfigStore } from '@/store/useConfigStore'
import { lightPreset } from '@/theme/tokens/presets/light'
import { useAutoSave } from '@/hooks/useAutoSave'
import { publishDashboard, serializeDashboardSnapshot } from '@/services'
import captureDashboardCover from '@/utils/captureDashboardCover'
import { createChartWidgetByPreset, isChartPresetWidgetKey } from '@/utils/chartWidgetPreset'
import sanitizeDashboardConfig from '@/utils/dashboardConfig'
import Logo from '@/assets/images/logo.svg'
import './index.scss';

const { Header, Content } = AntdLayout;
const MAX_APP_NAME_LENGTH = 30;
const getTitleLength = (value: string) => Array.from(value).length;
const waitForUiPaint = () => new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => resolve());
});

const Layout: React.FC = () => {
  const {
    isEditMode,
    setEditMode,
    addWidget,
    updateWidget,
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
    clearDashboardCanvas,
    loadDashboardFromData,
    closeConfigPanel,
    updateDashboardConfig,
    currentCoverUrl,
    setCurrentCoverUrl,
    clearDirty,
    markDirty,
    pendingMicroAppDrop,
    setPendingMicroAppDrop,
  } = useStore();
  const sysConfig = useSystemStore((state) => state.sysConfig)
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId'); // 从URL获取编辑的发布ID
  const dashboardStatus = searchParams.get('status') === '1' ? 1 : 0;
  const { message, modal } = AntdApp.useApp();
  const canvasTheme = useCanvasTheme()
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [dashboardConfigOpen, setDashboardConfigOpen] = useState(false)
  const [microAppMarketOpen, setMicroAppMarketOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishForm] = Form.useForm()
  const [microAppMarketMode, setMicroAppMarketMode] = useState<'widget' | 'floating' | 'global'>('widget')
  const [widgetDrawerOpen, setWidgetDrawerOpen] = useState(false)
  const [workspaceSidebarTab, setWorkspaceSidebarTab] = useState<WorkspaceSidebarTabKey>('widget')
  const [publishAction, setPublishAction] = useState<'publish' | 'draft'>('publish')
  const [publishLoading, setPublishLoading] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'error' | 'idle'>('idle')
  const [isCapturingCover, setIsCapturingCover] = useState(false)
  const [globalMaskText, setGlobalMaskText] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)
  const configDialogSaveRef = useRef<(() => Promise<boolean>) | null>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const currentCoverUrlRef = useRef('')
  const titleInputRef = useRef<InputRef>(null)
  const currentAppName = dashboardConfig?.title?.trim() ? dashboardConfig.title : '未命名'
  const draftLoading = publishLoading && publishAction === 'draft'
  const publishButtonLoading = publishLoading && publishAction === 'publish'
  const showPublishingMask = Boolean(globalMaskText)
  const _publishingMaskText = publishAction === 'publish'
    ? '正在生成封面并发布...'
    : '正在生成封面并保存...'
  const publishingMaskText = globalMaskText || _publishingMaskText
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
      setIsEditingTitle(false);
    }
  }, [isEditMode, closeConfigPanel])

  useEffect(() => {
    if (!isEditingTitle) {
      setEditingTitle(currentAppName);
    }
  }, [currentAppName, isEditingTitle])

  useEffect(() => {
    if (!isEditingTitle) {
      return;
    }

    const timer = window.setTimeout(() => {
      titleInputRef.current?.focus({
        cursor: 'all',
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isEditingTitle])

  useEffect(() => {
    if (!editId) {
      currentCoverUrlRef.current = '';
      return;
    }

    currentCoverUrlRef.current = currentCoverUrl;
    return;

    let cancelled = false;

    const loadCurrentCover = async () => {
      try {
        const res = { code: 20000, data: { coverUrl: currentCoverUrl } };
        if (!cancelled && res.code === 20000 && res.data) {
          currentCoverUrlRef.current =
            (res.data as typeof res.data & { cover_url?: string }).cover_url
            ?? res.data.coverUrl
            ?? '';
        }
      } catch (error) {
        console.error('获取当前应用封面失败:', error);
      }
    };

    void loadCurrentCover();

    return () => {
      cancelled = true;
    };
  }, [editId, currentCoverUrl]);

  const getCurrentCoverUrl = useCallback(() => currentCoverUrl, [currentCoverUrl])

  const currentSnapshot = useMemo(() => ({
    widgets,
    groups,
    floatingModules,
    dashboardConfig,
  }), [dashboardConfig, floatingModules, groups, widgets])

  const hasWorkspaceContent = useMemo(
    () => widgets.length > 0 || groups.length > 0 || floatingModules.length > 0,
    [floatingModules.length, groups.length, widgets.length],
  )

  const openWorkspaceSidebar = useCallback((tab: WorkspaceSidebarTabKey) => {
    setWorkspaceSidebarTab(tab)
    setWidgetDrawerOpen(true)
  }, [])

  const handleApplyAiSnapshot = useCallback((snapshot: {
    widgets: Widget[];
    groups: typeof groups;
    floatingModules: Widget[];
    dashboardConfig?: typeof dashboardConfig;
  }) => {
    loadDashboardFromData(snapshot)
    markDirty()
    message.success('AI 已更新当前工作台')
  }, [loadDashboardFromData, markDirty, message])

  const resetGlobalThemeConfig = useCallback(() => {
    const configStore = useConfigStore.getState()
    configStore.setThemePreset('light')
    configStore.setBaseColors(lightPreset.colors)
    configStore.setCustomTokens(lightPreset)
  }, [])

  const handleClearWorkspaceForAi = useCallback(() => {
    clearDashboardCanvas()
    resetGlobalThemeConfig()
  }, [clearDashboardCanvas, resetGlobalThemeConfig])

  // 响应拖放微应用到画布：打开微应用市场选择器
  useEffect(() => {
    if (pendingMicroAppDrop) {
      setMicroAppMarketMode(pendingMicroAppDrop.mode);
      setMicroAppMarketOpen(true);
    }
  }, [pendingMicroAppDrop])

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

    if (isChartPresetWidgetKey(key)) {
      const result = createChartWidgetByPreset({
        widgetKey: key,
        addWidget,
        updateWidget,
      });

      if (result) {
        message.success(`已添加 ${result.definition.title} 组件`);
      }
      return;
    }

    addWidget(key as WidgetType);
    const widgetNames: Record<string, string> = {
      richText: '富文本',
      clock: '时钟',
      stats: '统计卡片',
      chart: '图表',
      link: '快捷链接',
      news: '新闻动态',
      topList: '排行榜',
      search: '搜索',
      queryFilter: '查询筛选',
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
    // 消费拖放暂存位置
    const dropPos = pendingMicroAppDrop;
    if (dropPos) {
      setPendingMicroAppDrop(null);
    }

    if (microAppMarketMode === 'floating') {
      // 以悬浮模块形式添加（如果有拖放位置则使用）
      addFloatingModuleMicroApp(
        systemId,
        moduleId,
        module,
        {
          width: 400,
          height: 400,
          icon: module.icon,
          ...(dropPos
            ? { position: { x: dropPos.x, y: dropPos.y }, isExpanded: false, expandAnchor: 'top-left' as const }
            : { defaultPosition: 'bottom-right' as const }),
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
      // 以小部件形式添加到网格（如果有拖放位置则使用）
      addMicroAppWidget(
        systemId,
        moduleId,
        module,
        dropPos
          ? { x: dropPos.x, y: dropPos.y, ...(dropPos.groupId ? { groupId: dropPos.groupId } : {}) }
          : undefined
      );
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

  const handleRegisterConfigSave = useCallback((handler: (() => Promise<boolean>) | null) => {
    configDialogSaveRef.current = handler;
  }, []);

  const syncDashboardEditorParams = useCallback((responseId: string, status: number) => {
    if (!responseId) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set('editId', responseId);
    params.set('status', status === 1 ? '1' : '0');
    navigate({
      pathname: location.pathname,
      search: params.toString(),
    }, { replace: true });
  }, [location.pathname, navigate, searchParams]);

  const buildSnapshotPayload = useCallback((title: string) => {
    const baseDashboardConfig = sanitizeDashboardConfig(dashboardConfig);
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
      title,
    };

    return serializeDashboardSnapshot({
      widgets,
      groups,
      floatingModules,
      dashboardConfig: publishConfig,
    });
  }, [dashboardConfig, widgets, groups, floatingModules]);

  const persistDashboardSnapshot = useCallback(async ({
    title,
    status,
    coverUrl,
  }: {
    title: string;
    status: number;
    coverUrl: string;
  }) => {
    const res = await publishDashboard({
      id: editId || undefined,
      title,
      dashboardConfig: buildSnapshotPayload(title),
      status,
      cover_url: coverUrl,
    });

    if (res.code !== 20000 || !res.data) {
      throw new Error(res.message || '请求失败');
    }

    const responseId = res.data.id || editId || '';
    if (coverUrl) {
      setCurrentCoverUrl(coverUrl);
    }
    if (responseId) {
      syncDashboardEditorParams(responseId, status);
    }

    updateDashboardConfig({
      title,
    });
    clearDirty();

    return res.data;
  }, [buildSnapshotPayload, clearDirty, editId, setCurrentCoverUrl, syncDashboardEditorParams, updateDashboardConfig]);

  const handleStartTitleEdit = useCallback(() => {
    if (!isEditMode || publishLoading || titleSaving) {
      return;
    }

    setEditingTitle(currentAppName);
    setIsEditingTitle(true);
  }, [currentAppName, isEditMode, publishLoading, titleSaving]);

  const handleCancelTitleEdit = useCallback(() => {
    setEditingTitle(currentAppName);
    setIsEditingTitle(false);
  }, [currentAppName]);

  const handleSaveTitle = useCallback(async () => {
    const nextTitle = editingTitle.trim();

    if (!nextTitle) {
      message.warning('请输入应用名称');
      return;
    }

    if (getTitleLength(nextTitle) > MAX_APP_NAME_LENGTH) {
      message.warning('应用名称最多 30 字');
      return;
    }

    if (nextTitle === currentAppName) {
      setIsEditingTitle(false);
      return;
    }

    setTitleSaving(true);
    try {
      await persistDashboardSnapshot({
        title: nextTitle,
        status: dashboardStatus,
        coverUrl: currentCoverUrl || currentCoverUrlRef.current || '',
      });
      publishForm.setFieldsValue({ title: nextTitle });
      setIsEditingTitle(false);
      message.success('应用名称已更新');
    } catch (error: any) {
      console.error(error);
      message.error(error?.message || '应用名称保存失败');
    } finally {
      setTitleSaving(false);
    }
  }, [currentAppName, dashboardStatus, editingTitle, message, persistDashboardSnapshot, publishForm]);

  const handlePublishSubmit = async () => {
    let currentAction: 'publish' | 'draft' = publishAction;
    try {
      if (configDialogSaveRef.current) {
        const configSaved = await configDialogSaveRef.current();
        if (!configSaved) {
          return;
        }
      }
      const values = await publishForm.validateFields();
      currentAction = publishAction;
      flushSync(() => {
        setPublishModalOpen(false);
        setGlobalMaskText(currentAction === 'publish' ? '正在生成封面并发布...' : '正在生成封面并保存...');
        setPublishLoading(true);
      });
      await waitForUiPaint();
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
      setIsCapturingCover(true);
      const coverImageBase64 = await captureDashboardCover({ waitMs: 80 });
      if (!coverImageBase64) {
        message.warning('封面生成失败，将继续提交');
      }
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
      if (coverImageBase64) {
        setCurrentCoverUrl(coverImageBase64);
      }
      if (responseId) {
        const params = new URLSearchParams(searchParams);
        params.set('editId', responseId);
        params.set('status', currentAction === 'publish' ? '1' : '0');
        navigate({
          pathname: location.pathname,
          search: params.toString(),
        }, { replace: true });
      }
      updateDashboardConfig({
        title: values.title,
      });
      clearDirty();
      message.success(currentAction === 'publish' ? '工作台发布成功' : '暂存成功');
      publishForm.resetFields();
    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.message || (currentAction === 'publish' ? "发布失败" : '暂存失败')
      message.error(errorMsg);
    } finally {
      setIsCapturingCover(false);
      setGlobalMaskText(null);
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

  // JSON 导入处理
  const handleImportJson = () => {
    jsonInputRef.current?.click();
  };

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 验证 JSON 结构
      if (!data.widgets && !Array.isArray(data)) {
        message.error('JSON 格式错误：缺少 widgets 字段或不是有效的数组');
        return;
      }

      modal.confirm({
        title: '确认导入',
        content: `即将导入 ${Array.isArray(data) ? data.length : (data.widgets?.length || 0)} 个组件，当前页面内容将被替换，是否继续？`,
        okText: '确认导入',
        cancelText: '取消',
        onOk: () => {
          const { loadDashboardFromData } = useStore.getState();

          if (Array.isArray(data)) {
            // 直接是 widgets 数组
            loadDashboardFromData({ widgets: data });
          } else {
            // 是完整的工作台配置对象
            loadDashboardFromData(data);
          }
          message.success('JSON 导入成功');
        },
      });
    } catch (err) {
      console.error('JSON 解析失败:', err);
      message.error('JSON 解析失败，请检查文件格式');
    } finally {
      // 重置 input 以允许重复选择同一文件
      e.target.value = '';
    }
  };

  // 导出 JSON
  const handleExportJson = () => {
    const state = useStore.getState();
    const exportData = {
      widgets: state.widgets,
      groups: state.groups,
      floatingModules: state.floatingModules,
      dashboardConfig: state.dashboardConfig,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('JSON 导出成功');
  };

  const handleResetDashboard = () => {
    modal.confirm({
      title: '确认清空页面',
      content: '此操作将清空所有组件和配置，恢复为空白页面。此操作无法撤销，确定要继续吗？',
      okText: '确认清空',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        clearDashboardCanvas();
        resetGlobalThemeConfig();
        message.success('已清空当前应用页面');
      },
    });
  };

  const handleGoHome = async () => {
    if (!isDashboardRoute) {
      navigate('/publish-list')
      return
    }

    try {
      if (configDialogSaveRef.current) {
        const configSaved = await configDialogSaveRef.current();
        if (!configSaved) {
          return;
        }
      }

      flushSync(() => {
        setGlobalMaskText('正在保存并返回应用列表...');
      });
      await waitForUiPaint();

      const saved = await silentSave({ force: true });
      if (!saved) {
        message.error('自动保存失败，请稍后重试');
        return;
      }

      navigate('/publish-list')
    } finally {
      setGlobalMaskText(null);
    }
  }

  // 头部导航菜单配置
  const headerMenuItems: MenuProps['items'] = [
    {
      key: '/publish-list',
      icon: <UnorderedListOutlined />,
      label: '应用列表',
    },
    {
      key: '/micro-app-config',
      icon: <ApiOutlined />,
      label: '微应用配置',
    },
    {
      key: '/data-source',
      icon: <DatabaseOutlined />,
      label: '数据源',
    },
    {
      key: '/global-config',
      icon: <GlobalOutlined />,
      label: '全局配置',
    },
  ];

  // 获取当前路由对应的菜单 key
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('global-config')) return '/global-config';
    if (path.includes('data-source')) return '/data-source';
    if (path.includes('micro-app-config')) return '/micro-app-config';
    if (path.includes('publish-list')) return '/publish-list';
    return '/publish-list';
  };
  const isDashboardRoute = location.pathname === '/' || location.pathname.includes('dashboard-gridstack');

  // 自动保存
  const { silentSave, lastSaveTimeRef } = useAutoSave({
    enabled: isDashboardRoute && Boolean(editId),
    dashboardId: editId || undefined,
    status: dashboardStatus,
    getCoverUrl: getCurrentCoverUrl,
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
      // return <span className="auto-save-indicator saved">
      //   <CheckCircleOutlined />
      //   已自动保存
      //   {timeStr}
      // </span>;
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
    <AntdLayout className={`app-layout${isCapturingCover ? ' is-capturing-cover' : ''}`}>
      {!isFullScreen && (
        <>
          {!isDashboardRoute && (
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
          )}

          {isDashboardRoute && (
            <div className="app-sub-header">
              <div className="app-sub-header__title">
                <Button
                  type="text"
                  icon={<LeftOutlined />}
                  onClick={handleGoHome}
                  className="app-sub-header__back"
                >
                  {/* 返回应用列表 */}
                </Button>
                <div className="app-sub-header__name">
                  {isEditingTitle ? (
                    <div className="app-sub-header__name-editor">
                      <Input
                        ref={titleInputRef}
                        value={editingTitle}
                        maxLength={MAX_APP_NAME_LENGTH}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onPressEnter={() => void handleSaveTitle()}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            handleCancelTitleEdit();
                          }
                        }}
                        className="app-sub-header__name-input"
                        disabled={titleSaving}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<CheckOutlined />}
                        loading={titleSaving}
                        onClick={() => void handleSaveTitle()}
                        className="app-sub-header__name-action is-confirm"
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={handleCancelTitleEdit}
                        className="app-sub-header__name-action"
                        disabled={titleSaving}
                      />
                    </div>
                  ) : (
                    <div className="app-sub-header__name-display">
                      <span className="app-sub-header__name-text">{currentAppName}</span>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={handleStartTitleEdit}
                        className="app-sub-header__name-trigger"
                        disabled={!isEditMode || publishLoading}
                      />
                    </div>
                  )}
                </div>
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
                    onClick={() => openWorkspaceSidebar('widget')}
                    className='add'
                  >
                    添加组件
                  </Button>

                  <Button
                    icon={<RobotOutlined />}
                    disabled={!isEditMode}
                    onClick={() => openWorkspaceSidebar('ai')}
                  >
                    AI辅助建模
                  </Button>

                  {isEditMode && (
                    <>
                      <Button icon={<SettingOutlined />} onClick={() => setDashboardConfigOpen(true)} className='set'>页面设置</Button>

                      <Button icon={<DeleteOutlined />} onClick={handleResetDashboard} danger className='clear'>清空页面</Button>

                      {/* <Button icon={<ImportOutlined />} onClick={handleImportJson} className='import'>导入JSON</Button>

                      <Button icon={<FileTextOutlined />} onClick={handleExportJson} className='export'>导出JSON</Button> */}
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
          onAddWidget={() => openWorkspaceSidebar('widget')}
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
              <WorkspaceSidebar
                open={widgetDrawerOpen}
                activeTab={workspaceSidebarTab}
                onTabChange={setWorkspaceSidebarTab}
                onClose={() => setWidgetDrawerOpen(false)}
                onWidgetSelect={handleAddWidget}
                currentSnapshot={currentSnapshot}
                hasWorkspaceContent={hasWorkspaceContent}
                onApplySnapshot={handleApplyAiSnapshot}
                onClearWorkspace={handleClearWorkspaceForAi}
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
                  onRegisterSaveHandler={handleRegisterConfigSave}
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
        onClose={() => { setMicroAppMarketOpen(false); setPendingMicroAppDrop(null); }}
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

      {showPublishingMask && (
        <div className="app-layout__publishing-mask">
          <Spin size="large" tip={publishingMaskText} fullscreen />
        </div>
      )}

      {/* 隐藏的 JSON 文件输入 */}
      <input
        type="file"
        ref={jsonInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleJsonFileChange}
      />

    </AntdLayout>
  );
};

export default Layout;
