import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  AppState,
  Widget,
  WidgetType,
  WidgetConfig,
  UserInfo,
  MicroAppModule,
  FloatingModuleConfig,
  LocalComponentType,
  WidgetGroup,
  WidgetGroupConfig,
  LayoutSyncOptions,
} from '@/types';
import { Layout } from 'react-grid-layout';
import { getToken, removeToken } from '@/utils/cookie';

// cellHeight=30 时的默认布局尺寸
// 各小部件默认尺寸配置 (w: 宽度列数, h: 高度行数)
const WIDGET_DEFAULT_LAYOUTS: Record<string, { w: number; h: number; minW?: number; minH?: number }> = {
  clock: { w: 4, h: 6, minW: 2, minH: 3 },
  stats: { w: 10, h: 6, minW: 4, minH: 3 },
  chart: { w: 8, h: 9, minW: 4, minH: 4 },
  link: { w: 5, h: 5, minW: 2, minH: 2 },
  news: { w: 6, h: 10, minW: 4, minH: 4 },
  topList: { w: 5, h: 9, minW: 3, minH: 4 },
  search: { w: 8, h: 4, minW: 4, minH: 2 },
  dataTable: { w: 10, h: 8, minW: 6, minH: 4 },
  customForm: { w: 8, h: 11, minW: 4, minH: 4 },
  typography: { w: 4, h: 3, minW: 2, minH: 1 },
  cardGrid: { w: 8, h: 6, minW: 4, minH: 3 },
};

const DEFAULT_LAYOUT = { w: 4, h: 3, x: 0, y: 0, minW: 1, minH: 1 };
const DEFAULT_GROUP_LAYOUT = { w: 6, h: 5, x: 0, y: Infinity, minW: 2, minH: 2 };
const DEFAULT_GROUP_CONFIG: WidgetGroupConfig = {
  showTitle: true,
  borderStyle: 'solid',
  borderWidth: 2,
  borderRadius: 8,
  backgroundType: 'color',
  backgroundColor: 'rgba(0, 0, 0, 0.02)',
};
const DEFAULT_HEADER_BAR_LAYOUT = { w: 4, h: 2, x: 0, y: 0, minW: 1, minH: 1 };
const DEFAULT_NAVIGATOR_LAYOUT = { w: 12, h: 3, x: 0, y: 0, minW: 2, minH: 1 };
const DEFAULT_ICON_NAV_LAYOUT = { w: 2, h: 3, x: 0, y: 0, minW: 1, minH: 1 };
const DEFAULT_NAV_GROUP_LAYOUT = { w: 10, h: 10, x: 0, y: 0, minW: 4, minH: 4 };

// 验证并清理布局数据，确保所有必需的数值字段都是有效数字
const sanitizeLayoutValue = (value: any, defaultValue: number, minValue?: number): number => {
  const num = typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  return minValue !== undefined ? Math.max(num, minValue) : num;
};

const sanitizeLayout = (layout: Layout): Layout => {
  return {
    ...layout,
    i: layout.i || '',
    x: sanitizeLayoutValue(layout.x, 0, 0),
    y: sanitizeLayoutValue(layout.y, 0, 0),
    w: sanitizeLayoutValue(layout.w, 4, 1),
    h: sanitizeLayoutValue(layout.h, 3, 1),  // 默认 h=3（cellHeight=30 时约 90px）
    minW: sanitizeLayoutValue(layout.minW, 1, 1),
    minH: sanitizeLayoutValue(layout.minH, 1, 1),
  };
};

const getDefaultConfig = (type: WidgetType): WidgetConfig => {
  const baseConfig = {
    title: type.charAt(0).toUpperCase() + type.slice(1),
    showTitle: true, // 默认显示标题
    refreshInterval: 60
  };
  switch (type) {
    case 'clock':
      return { ...baseConfig, title: 'Clock' };
    case 'stats':
      return { ...baseConfig, title: 'Statistics' };
    case 'chart':
      return { ...baseConfig, title: 'Chart' };
    case 'headerBar':
      return {
        ...baseConfig,
        title: '头部栏',
        showTitle: false,
        headerTitle: '头部栏',  // 默认显示标题文字
        textColor: '#ffffff',  // 白色文字
        fontFamily: 'YouSheBiaoTiHei',  // 默认字体
        backgroundType: 'gradient',
        // backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  // 默认渐变背景
      };
    case 'typography':
      return { ...baseConfig, title: '文本组件', content: '这是一段文本', showTitle: false };
    case 'microApp':
      return {
        ...baseConfig,
        title: '微应用',
        systemId: '',
        moduleId: '',
        sync: false,
        alive: true,
      };
    case 'pageNavigator':
      return {
        ...baseConfig,
        title: '页面切换',
        showTitle: false,
        items: [
          { name: '沧澜架构', path: '' },
          { name: '工作台', path: '' },
          { name: '首页', path: '' }
        ]
      };
    case 'iconNav':
      return {
        ...baseConfig,
        title: '图标导航',
        showTitle: false,  // 默认不显示标题
        icon: 'AppstoreOutlined',
        url: '',
        openInNew: false,
        iconSize: 48,
        iconColor: '#1890ff',
      };
    case 'navGroup':
      return {
        ...baseConfig,
        title: '导航组',
        showTitle: true,   // 默认显示标题
        layout: 'grid',
        columns: 4,
        showLabel: true,
        iconSize: 32,
        itemIconColor: '#ffffff',
        itemGap: 12,
      };
    default:
      return baseConfig;
  }
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      widgets: [
        // {
        //   id: 'default-clock',
        //   type: 'clock',
        //   title: 'Clock',
        //   layout: { i: 'default-clock', x: 0, y: 0, w: 4, h: 3, minW: 1, minH: 1 },
        //   config: { title: 'Clock', showTitle: true, refreshInterval: 60 },
        // },
        // {
        //   id: 'default-stats',
        //   type: 'stats',
        //   title: 'Statistics',
        //   layout: { i: 'default-stats', x: 4, y: 0, w: 4, h: 3, minW: 1, minH: 1 },
        //   config: { title: 'Statistics', showTitle: true, refreshInterval: 60 },
        // },
        // {
        //   id: 'default-chart',
        //   type: 'chart',
        //   title: 'Chart',
        //   layout: { i: 'default-chart', x: 8, y: 0, w: 4, h: 3, minW: 1, minH: 1 },
        //   config: { title: 'Chart', showTitle: true, refreshInterval: 60 },
        // },
      ] as Widget[],
      groups: [] as WidgetGroup[],
      isEditMode: true, // Default to edit mode for easier setup
      isFullScreen: false,
      isAuthenticated: !!getToken(), // 初始化时从 cookie 检查登录状态
      userInfo: null,
      floatingModules: [] as Widget[], // 悬浮模块列表
      globalMicroApps: [] as Widget[], // 全局无边框微应用列表
      dashboardConfig: {
        backgroundType: 'color',
        backgroundColor: '',
      },
      gridDensity: 'compact',
      setGridDensity: (density) => set({ gridDensity: density }),
      floatingPanelPosition: { x: 100, y: 100 },
      setFloatingPanelPosition: (position) => set({ floatingPanelPosition: position }),

      login: (userInfo?: UserInfo) => set({
        isAuthenticated: true,
        userInfo: userInfo || null
      }),
      logout: () => {
        removeToken(); // 清除 cookie 中的 token
        set({
          isAuthenticated: false,
          userInfo: null
        });
      },

      addWidget: (type: WidgetType) => {
        const id = uuidv4();
        // 根据组件类型获取对应的默认布局配置
        let layoutConfig: { w: number; h: number; x: number; y: number; minW: number; minH: number };

        if (type === 'headerBar') {
          layoutConfig = DEFAULT_HEADER_BAR_LAYOUT;
        } else if (type === 'pageNavigator') {
          layoutConfig = DEFAULT_NAVIGATOR_LAYOUT;
        } else if (type === 'iconNav') {
          layoutConfig = DEFAULT_ICON_NAV_LAYOUT;
        } else if (type === 'navGroup') {
          layoutConfig = DEFAULT_NAV_GROUP_LAYOUT;
        } else if (WIDGET_DEFAULT_LAYOUTS[type]) {
          // 使用各小部件特定的默认尺寸
          const widgetLayout = WIDGET_DEFAULT_LAYOUTS[type];
          layoutConfig = {
            w: widgetLayout.w,
            h: widgetLayout.h,
            x: 0,
            y: 0,
            minW: widgetLayout.minW || 1,
            minH: widgetLayout.minH || 1,
          };
        } else {
          layoutConfig = DEFAULT_LAYOUT;
        }

        const newWidget: Widget = {
          id,
          type,
          title: type.charAt(0).toUpperCase() + type.slice(1),
          layout: sanitizeLayout({ ...layoutConfig, i: id, y: Infinity }),
          config: getDefaultConfig(type),
        };

        set((state) => ({
          widgets: [...state.widgets, newWidget],
        }));
      },

      addMicroAppWidget: (systemId: string, moduleId: string, module: MicroAppModule) => {
        const id = uuidv4();
        const defaultSize = module.defaultSize || { w: 6, h: 5 };
        const newWidget: Widget = {
          id,
          type: 'microApp',
          title: module.name,
          layout: sanitizeLayout({
            i: id,
            x: 0,
            y: Infinity,
            w: defaultSize.w,
            h: defaultSize.h,
            minW: 1,
            minH: 1,
          }),
          config: {
            title: module.name,
            showTitle: true,
            refreshInterval: 60,
            systemId,
            moduleId,
            microAppUrl: module.url,
            microAppEntry: module.entry,
            sync: true,
            alive: true,
            icon: module.icon,
            iconSvg: module.iconSvg,
            forceIconOnly: module.forceIconOnly,
          },
        };

        set((state) => ({
          widgets: [...state.widgets, newWidget],
        }));
      },

      createWidgetGroup: (title: string, widgetIds: string[]) => {
        set((state) => {
          const uniqueIds = Array.from(new Set(widgetIds));
          const candidates = state.widgets.filter(
            (widget) => uniqueIds.includes(widget.id) && !widget.groupId
          );

          if (candidates.length < 2) {
            return {};
          }

          const normalizedLayouts = candidates.map((widget) => ({
            id: widget.id,
            x: Number.isFinite(widget.layout.x) ? (widget.layout.x as number) : 0,
            y: Number.isFinite(widget.layout.y) ? (widget.layout.y as number) : 0,
            w: Number.isFinite(widget.layout.w) ? (widget.layout.w as number) : 1,
            h: Number.isFinite(widget.layout.h) ? (widget.layout.h as number) : 1,
          }));

          const minX = Math.min(...normalizedLayouts.map((item) => item.x));
          const minY = Math.min(...normalizedLayouts.map((item) => item.y));
          const maxRight = Math.max(...normalizedLayouts.map((item) => item.x + item.w));
          const maxBottom = Math.max(...normalizedLayouts.map((item) => item.y + item.h));

          const width = Math.max(maxRight - minX, 1);
          const height = Math.max(maxBottom - minY, 1);

          const groupId = `group-${Date.now()}`;
          const groupTitle = title || `分组 ${state.groups.length + 1}`;
          const orderedWidgetIds = normalizedLayouts
            .slice()
            .sort((a, b) => {
              if (a.y === b.y) {
                return a.x - b.x;
              }
              return a.y - b.y;
            })
            .map((item) => item.id);

          const newGroup: WidgetGroup = {
            id: groupId,
            title: groupTitle,
            widgetIds: orderedWidgetIds,
            layout: sanitizeLayout({
              i: groupId,
              x: minX,
              y: minY,
              w: width,
              h: height,
              minW: Math.max(width, 2),
              minH: Math.max(height, 2),
            }),
            config: { ...DEFAULT_GROUP_CONFIG },
          };

          const updatedWidgets = state.widgets.map((widget) =>
            uniqueIds.includes(widget.id) ? { ...widget, groupId: groupId } : widget
          );

          return {
            widgets: updatedWidgets,
            groups: [...state.groups, newGroup],
          };
        });
      },

      createEmptyGroup: (title?: string) => {
        let createdGroup: WidgetGroup | null = null;

        set((state) => {
          const groupId = `group-${Date.now()}`;
          const groupTitle = title?.trim() || `分组 ${state.groups.length + 1}`;
          const layout = sanitizeLayout({
            ...DEFAULT_GROUP_LAYOUT,
            i: groupId,
          });

          const newGroup: WidgetGroup = {
            id: groupId,
            title: groupTitle,
            widgetIds: [],
            layout,
            config: { ...DEFAULT_GROUP_CONFIG },
          };

          createdGroup = newGroup;

          return {
            groups: [...state.groups, newGroup],
          };
        });

        return createdGroup!;
      },

      removeGroup: (id: string) => {
        set((state) => {
          const group = state.groups.find((g) => g.id === id);
          if (!group) return {};

          // 删除分组时，同时删除分组内的所有 widget
          const widgetIdsToRemove = new Set(group.widgetIds);

          return {
            groups: state.groups.filter((g) => g.id !== id),
            widgets: state.widgets.filter((w) => !widgetIdsToRemove.has(w.id)),
          };
        });
      },

      updateGroup: (id: string, updates: Partial<WidgetGroup>) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        }));
      },

      updateGroupConfig: (id: string, config: Partial<WidgetGroupConfig>) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, config: { ...g.config, ...config } } : g
          ),
        }));
      },

      removeWidget: (id: string) => {
        set((state) => {
          const remainingGroups = state.groups.map((group) => {
            if (!group.widgetIds.includes(id)) {
              return group;
            }
            const widgetIds = group.widgetIds.filter((widgetId) => widgetId !== id);
            return { ...group, widgetIds };
          });

          return {
            widgets: state.widgets.filter((w) => w.id !== id),
            groups: remainingGroups,
          };
        });
      },

      updateWidget: (id: string, updates: Partial<Widget>) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },

      refreshWidget: (id: string) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, refreshCount: (w.refreshCount || 0) + 1 } : w
          ),
        }));
      },

      updateLayout: (layouts: Layout[], options: LayoutSyncOptions = {}) => {
        const {
          groupLayouts = [],
          widgetAssignments,
          groupMemberships,
        } = options;

        set((state) => {
          const layoutMap = new Map(layouts.map((layout) => [layout.i, layout]));
          const assignmentMap = widgetAssignments || {};

          const updatedWidgets = state.widgets.map((widget) => {
            const layoutItem = layoutMap.get(widget.id);
            const hasAssignment = Object.prototype.hasOwnProperty.call(
              assignmentMap,
              widget.id
            );

            const nextLayout = layoutItem
              ? sanitizeLayout({ ...widget.layout, ...layoutItem })
              : widget.layout;

            const nextGroupId = hasAssignment
              ? assignmentMap[widget.id] || undefined
              : widget.groupId;

            if (nextLayout === widget.layout && nextGroupId === widget.groupId) {
              return widget;
            }

            return {
              ...widget,
              layout: nextLayout,
              groupId: nextGroupId,
            };
          });

          const shouldSyncGroups =
            groupLayouts.length > 0 || groupMemberships !== undefined;

          if (!shouldSyncGroups) {
            return { widgets: updatedWidgets, groups: state.groups };
          }

          const groupLayoutMap = new Map(groupLayouts.map((layout) => [layout.i, layout]));
          const membershipEntries = groupMemberships
            ? Object.entries(groupMemberships)
            : [];
          const targetGroupIds = new Set([
            ...groupLayoutMap.keys(),
            ...membershipEntries.map(([groupId]) => groupId),
          ]);

          const existingOrder = state.groups.map((group) => group.id);
          const orderedGroupIds: string[] = [
            ...existingOrder.filter((id) => targetGroupIds.has(id)),
            ...Array.from(targetGroupIds).filter((id) => !existingOrder.includes(id)),
          ];

          const nextGroups: WidgetGroup[] = orderedGroupIds.map((groupId, index) => {
            const existing = state.groups.find((group) => group.id === groupId);
            const layoutItem = groupLayoutMap.get(groupId);
            const widgetIds =
              (groupMemberships && groupMemberships[groupId]) ||
              existing?.widgetIds ||
              [];

            const fallbackLayout: Layout = existing?.layout || {
              i: groupId,
              x: 0,
              y: 0,
              w: 4,
              h: 3,
              minW: 1,
              minH: 1,
            };

            const mergedLayout = layoutItem
              ? sanitizeLayout({ ...fallbackLayout, ...layoutItem })
              : sanitizeLayout(fallbackLayout);

            return {
              id: groupId,
              title: existing?.title || `分组 ${index + 1}`,
              widgetIds,
              layout: mergedLayout,
              config: existing?.config,  // 保留分组配置
            };
          });

          return {
            widgets: updatedWidgets,
            groups: nextGroups,
          };
        });
      },

      setEditMode: (isEditMode: boolean) => set({ isEditMode }),

      toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),

      resetDashboard: () => set({
        widgets: [],
        groups: [],
        floatingModules: [] as Widget[], // 悬浮模块列表
        globalMicroApps: [] as Widget[], // 全局无边框微应用列表
        dashboardConfig: {
          backgroundType: 'color',
          backgroundColor: '',
        },
      }),

      saveDashboard: () => {
        // Zustand persist middleware handles localStorage automatically.
        // This function could be used to sync with a backend API.
        const state = get();
        console.log('Saving dashboard config:', {
          widgets: state.widgets,
          groups: state.groups,
          floatingModules: state.floatingModules,
          // globalMicroApps: state.globalMicroApps
        });
        // Here you would call an API
      },

      loadDashboard: () => {
        // This could fetch from API
        console.log('Loading dashboard config...');
      },

      // 从API数据加载仪表盘（用于编辑已发布的仪表盘）
      loadDashboardFromData: (data: {
        widgets?: Widget[];
        groups?: WidgetGroup[];
        floatingModules?: Widget[];
        dashboardConfig?: any;
      }) => {
        set({
          widgets: data.widgets?.map(w => ({
            ...w,
            layout: sanitizeLayout(w.layout)
          })) || [],
          groups: data.groups?.map(g => ({
            ...g,
            layout: sanitizeLayout(g.layout)
          })) || [],
          floatingModules: data.floatingModules || [],
          dashboardConfig: data.dashboardConfig || {
            backgroundType: 'color',
            backgroundColor: '',
          },
        });
      },

      updateDashboardConfig: (config) =>
        set((state) => ({
          dashboardConfig: {
            ...state.dashboardConfig,
            ...config,
          } as any,
        })),

      // ============================================
      // 悬浮模块相关方法
      // ============================================

      // 添加微应用类型的悬浮模块
      addFloatingModuleMicroApp: (
        systemId: string,
        moduleId: string,
        module: MicroAppModule,
        customConfig?: Partial<FloatingModuleConfig>
      ) =>
        set((state) => {
          const id = `floating-module-${Date.now()}`;
          const defaultConfig: FloatingModuleConfig = {
            contentType: 'microApp',
            microApp: {
              systemId,
              moduleId,
              url: module.url,
              entry: module.entry,
            },
            defaultPosition: 'bottom-right',
            width: 380,
            height: 400,
            minWidth: 300,
            minHeight: 400,
            isExpanded: true,
            draggable: true,
            resizable: true,
            collapsible: true,
            closable: true,
            showHeader: true,
            theme: 'auto',
            borderRadius: 12,
            zIndex: 9999,
            ...customConfig,
          };

          const newWidget: Widget = {
            id,
            type: 'floatingModule',
            title: module.name || '悬浮模块',
            layout: { i: id, x: 0, y: 0, w: 0, h: 0 }, // 不使用网格布局
            config: defaultConfig,
          };

          return {
            floatingModules: [...state.floatingModules, newWidget]
          };
        }),

      // 添加本地组件类型的悬浮模块
      addFloatingModuleLocal: (
        componentType: LocalComponentType,
        title: string,
        componentProps?: Record<string, any>,
        customConfig?: Partial<FloatingModuleConfig>
      ) =>
        set((state) => {
          const id = `floating-module-${Date.now()}`;
          const defaultConfig: FloatingModuleConfig = {
            contentType: 'localComponent',
            localComponent: {
              componentType,
              componentProps,
            },
            defaultPosition: 'bottom-right',
            width: 380,
            height: 400,
            minWidth: 300,
            minHeight: 400,
            isExpanded: true,
            draggable: true,
            resizable: true,
            collapsible: true,
            closable: true,
            showHeader: true,
            theme: 'auto',
            borderRadius: 12,
            zIndex: 9999,
            ...customConfig,
          };

          const newWidget: Widget = {
            id,
            type: 'floatingModule',
            title,
            layout: { i: id, x: 0, y: 0, w: 0, h: 0 }, // 不使用网格布局
            config: defaultConfig,
          };

          return {
            floatingModules: [...state.floatingModules, newWidget]
          };
        }),

      // 移除悬浮模块
      removeFloatingModule: (id: string) =>
        set((state) => ({
          floatingModules: state.floatingModules.filter(m => m.id !== id),
        })),

      // 更新悬浮模块配置
      updateFloatingModuleConfig: (id: string, config: Partial<FloatingModuleConfig>) =>
        set((state) => ({
          floatingModules: state.floatingModules.map(m =>
            m.id === id
              ? { ...m, config: { ...m.config, ...config } }
              : m
          ),
        })),

      // 更新悬浮模块位置
      updateFloatingModulePosition: (id: string, position: { x: number; y: number }) =>
        set((state) => ({
          floatingModules: state.floatingModules.map(m =>
            m.id === id
              ? {
                ...m,
                config: { ...m.config, position } as FloatingModuleConfig
              }
              : m
          ),
        })),

      // 更新悬浮模块尺寸
      updateFloatingModuleSize: (id: string, size: { width: number; height: number }) =>
        set((state) => ({
          floatingModules: state.floatingModules.map(m =>
            m.id === id
              ? {
                ...m,
                config: {
                  ...m.config,
                  width: size.width,
                  height: size.height
                } as FloatingModuleConfig
              }
              : m
          ),
        })),

      // 切换悬浮模块展开/折叠状态
      toggleFloatingModuleExpanded: (id: string) =>
        set((state) => ({
          floatingModules: state.floatingModules.map(m => {
            if (m.id !== id) return m;
            const config = m.config as FloatingModuleConfig;
            return {
              ...m,
              config: {
                ...config,
                isExpanded: !config.isExpanded,
              },
            };
          }),
        })),

      // 更新悬浮模块（包括 title 等属性）
      updateFloatingModule: (id: string, updates: Partial<Widget>) =>
        set((state) => ({
          floatingModules: state.floatingModules.map(m =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      // ============================================
      // 全局无边框微应用相关方法
      // ============================================

      // 添加全局无边框微应用
      addGlobalMicroApp: (
        systemId: string,
        moduleId: string,
        module: MicroAppModule,
        customConfig?: Partial<WidgetConfig>
      ) =>
        set((state) => {
          const id = `global-app-${Date.now()}`;

          const newWidget: Widget = {
            id,
            type: 'microApp',
            title: module.name,
            layout: { i: id, x: 0, y: 0, w: 0, h: 0 }, // 不占用网格
            config: {
              title: module.name,
              showTitle: false,
              refreshInterval: 60,
              systemId,
              moduleId,
              microAppUrl: module.url,
              microAppEntry: module.entry,
              sync: true,
              alive: true,
              mode: 'global', // 设置为全局模式
              ...customConfig,
            },
          };

          return {
            globalMicroApps: [...state.globalMicroApps, newWidget]
          };
        }),

      // 移除全局微应用
      removeGlobalMicroApp: (id: string) =>
        set((state) => ({
          globalMicroApps: state.globalMicroApps.filter(m => m.id !== id),
        })),
    }),
    {
      name: 'portal-engine-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        widgets: state.widgets,
        groups: state.groups,
        floatingModules: state.floatingModules, // 持久化悬浮模块
        globalMicroApps: state.globalMicroApps,  // 持久化全局微应用
        dashboardConfig: state.dashboardConfig,
        floatingPanelPosition: state.floatingPanelPosition,
      }),
      // 从 localStorage 恢复时验证和清理数据
      merge: (persistedState: any, currentState: AppState) => {
        const mergedState = { ...currentState, ...persistedState };
        // 清理所有恢复的 widget 布局数据
        if (mergedState.widgets && Array.isArray(mergedState.widgets)) {
          mergedState.widgets = mergedState.widgets.map((widget: Widget) => ({
            ...widget,
            layout: sanitizeLayout(widget.layout),
          }));
        }
        if (mergedState.groups && Array.isArray(mergedState.groups)) {
          mergedState.groups = mergedState.groups.map((group: WidgetGroup) => ({
            ...group,
            layout: sanitizeLayout(group.layout),
          }));
        }
        // 恢复悬浮模块
        if (mergedState.floatingModules && Array.isArray(mergedState.floatingModules)) {
          mergedState.floatingModules = mergedState.floatingModules;
        }
        // 恢复全局微应用
        if (mergedState.globalMicroApps && Array.isArray(mergedState.globalMicroApps)) {
          mergedState.globalMicroApps = mergedState.globalMicroApps;
        }
        return mergedState;
      },
    }
  )
);
