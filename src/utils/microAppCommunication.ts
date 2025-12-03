import WujieReact from 'wujie-react';
import type { EventRouteConfig } from '@/types';
import { useStore } from '@/store/useStore';

const { bus } = WujieReact;

/**
 * 微应用通信管理器
 *
 * 核心理念:
 * - 子应用发送方: 使用 bus.$emit(eventType, payload) 发送事件
 * - 子应用接收方: 使用 bus.$on(`${appId}:event`, handler) 监听事件
 * - 主应用: 根据配置的事件路由表动态监听发送方事件并转发给接收方
 */
class MicroAppCommunicationManager {
  // 已注册的监听器清理函数: Map<listenerKey, cleanupFunction>
  private eventListeners: Map<string, () => void> = new Map();
  private debugMode: boolean = true;

  /**
   * 设置调试模式
   */
  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
  }

  /**
   * 根据当前配置的事件路由，设置主应用的监听器
   * 当配置更新时应该调用此方法重新设置监听器
   */
  setupEventListeners() {
    // 清除所有旧的监听器
    this.clearAllListeners();

    const store = useStore.getState();

    if (this.debugMode) {
      console.log('[MicroAppCommunication] Setting up event listeners based on current routes');
    }

    // 遍历所有微应用小部件，为配置了事件路由的发送方设置监听
    store.widgets.forEach(widget => {
      if (widget.type !== 'microApp') return;

      const config = widget.config as any;
      const fromAppId = `${config.systemId}-${config.moduleId}`;
      const eventRoutes: EventRouteConfig[] = config.eventRoutes || [];

      if (eventRoutes.length === 0) return;

      // 为每个配置的事件类型设置监听器
      eventRoutes.forEach(route => {
        if (!route.enabled || !route.toAppId || !route.eventType) return;

        const listenerKey = `${fromAppId}:${route.eventType}`;

        // 避免重复监听
        if (this.eventListeners.has(listenerKey)) return;

        if (this.debugMode) {
          console.log('[MicroAppCommunication] Setting up listener:', {
            fromAppId,
            eventType: route.eventType,
            toAppId: route.toAppId,
            toEventType: route.toEventType,
          });
        }

        // 创建事件处理函数
        const handler = (payload: any) => {
          if (this.debugMode) {
            console.log('[MicroAppCommunication] Received event from subapp:', {
              from: fromAppId,
              eventType: route.eventType,
              ...(payload||{}),
            });
          }

          // 转发到接收方
          const targetEventType = route.toEventType || route.eventType;

          if (this.debugMode) {
            console.log('[MicroAppCommunication] Forwarding to receiver:', {
              toAppId: route.toAppId,
              targetEventType,
              ...(payload||{}),
            });
          }

          // 通过 Wujie bus 发送给目标子应用
          bus.$emit(`${targetEventType}`, {
            from: fromAppId,
            type: targetEventType,
            ...(payload||{}),
            timestamp: Date.now(),
          });
        };

        // 监听子应用发送的事件
        bus.$on(route.eventType, handler);

        // 保存清理函数
        this.eventListeners.set(listenerKey, () => {
          bus.$off(route.eventType, handler);
        });
      });
    });

    if (this.debugMode) {
      console.log(`[MicroAppCommunication] Total listeners registered: ${this.eventListeners.size}`);
    }
  }

  /**
   * 清除所有监听器
   */
  private clearAllListeners() {
    if (this.debugMode) {
      console.log(`[MicroAppCommunication] Clearing ${this.eventListeners.size} existing listeners`);
    }

    this.eventListeners.forEach((cleanup) => {
      cleanup();
    });
    this.eventListeners.clear();
  }

  /**
   * 获取当前所有配置的路由信息（调试用）
   */
  debugGetAllRoutes() {
    const store = useStore.getState();
    const allRoutes: any[] = [];

    store.widgets.forEach(widget => {
      if (widget.type !== 'microApp') return;
      const config = widget.config as any;
      const appId = `${config.systemId}-${config.moduleId}`;
      const eventRoutes = config.eventRoutes || [];

      if (eventRoutes.length > 0) {
        allRoutes.push({
          fromAppId: appId,
          fromAppName: widget.title,
          routes: eventRoutes,
        });
      }
    });

    console.log('[MicroAppCommunication] All configured routes:', allRoutes);
    return allRoutes;
  }

  /**
   * 销毁通信管理器
   */
  destroy() {
    this.clearAllListeners();
  }
}

// 导出单例
export const microAppCommunication = new MicroAppCommunicationManager();