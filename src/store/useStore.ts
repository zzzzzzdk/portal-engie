import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { AppState, Widget, WidgetType, WidgetConfig, UserInfo, MicroAppModule } from '@/types';
import { Layout } from 'react-grid-layout';
import { getToken, removeToken } from '@/utils/cookie';

const DEFAULT_LAYOUT = { w: 4, h: 1, x: 0, y: 0, minW: 1, minH: 1 };

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
    h: sanitizeLayoutValue(layout.h, 1, 1),
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
    case 'microApp':
      return {
        ...baseConfig,
        title: '微应用',
        systemId: '',
        moduleId: '',
        sync: false,
        alive: true,
      };
    default:
      return baseConfig;
  }
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      widgets: [
        {
          id: 'default-clock',
          type: 'clock',
          title: 'Clock',
          layout: { i: 'default-clock', x: 0, y: 0, w: 4, h: 1, minW: 1, minH: 1 },
          config: { title: 'Clock', showTitle: true, refreshInterval: 60 },
        },
        {
          id: 'default-stats',
          type: 'stats',
          title: 'Statistics',
          layout: { i: 'default-stats', x: 4, y: 0, w: 4, h: 1, minW: 1, minH: 1 },
          config: { title: 'Statistics', showTitle: true, refreshInterval: 60 },
        },
        {
          id: 'default-chart',
          type: 'chart',
          title: 'Chart',
          layout: { i: 'default-chart', x: 8, y: 0, w: 4, h: 2, minW: 1, minH: 1 },
          config: { title: 'Chart', showTitle: true, refreshInterval: 60 },
        },
      ] as Widget[],
      isEditMode: true, // Default to edit mode for easier setup
      isFullScreen: false,
      isAuthenticated: !!getToken(), // 初始化时从 cookie 检查登录状态
      userInfo: null,

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
        const newWidget: Widget = {
          id,
          type,
          title: type.charAt(0).toUpperCase() + type.slice(1),
          layout: sanitizeLayout({ ...DEFAULT_LAYOUT, i: id, y: Infinity }),
          config: getDefaultConfig(type),
        };

        set((state) => ({
          widgets: [...state.widgets, newWidget],
        }));
      },

      addMicroAppWidget: (systemId: string, moduleId: string, module: MicroAppModule) => {
        const id = uuidv4();
        const defaultSize = module.defaultSize || { w: 6, h: 4 };
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
            minW: 2,
            minH: 2,
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
          },
        };

        set((state) => ({
          widgets: [...state.widgets, newWidget],
        }));
      },

      removeWidget: (id: string) => {
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== id),
        }));
      },

      updateWidget: (id: string, updates: Partial<Widget>) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },

      updateLayout: (layouts: Layout[]) => {
        set((state) => {
          // Map new layout positions to existing widgets
          const updatedWidgets = state.widgets.map((widget) => {
            const layoutItem = layouts.find((l) => l.i === widget.id);
            if (layoutItem) {
              // 使用 sanitizeLayout 确保所有布局数据都是有效的
              const mergedLayout = { ...widget.layout, ...layoutItem };
              return { ...widget, layout: sanitizeLayout(mergedLayout) };
            }
            return widget;
          });
          return { widgets: updatedWidgets };
        });
      },

      setEditMode: (isEditMode: boolean) => set({ isEditMode }),

      toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),

      resetDashboard: () => set({ widgets: [] }),

      saveDashboard: () => {
        // Zustand persist middleware handles localStorage automatically.
        // This function could be used to sync with a backend API.
        const state = get();
        console.log('Saving dashboard config:', state.widgets);
        // Here you would call an API
      },

      loadDashboard: () => {
        // This could fetch from API
        console.log('Loading dashboard config...');
      },
    }),
    {
      name: 'portal-engine-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ widgets: state.widgets }), // Only persist widgets
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
        return mergedState;
      },
    }
  )
);
