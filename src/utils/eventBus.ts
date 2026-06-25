// 事件总线工具函数

interface EventHandler<T = any> {
  callback: (data: T) => void;
  once: boolean;
  context: any | null;
}

class EventBus {
  private events: Record<string, EventHandler[]> = {};
  private history: Record<string, any[]> = {};
  private enableHistory: boolean = false;
  
  constructor() {
    this.events = {};
    this.history = {};
    this.enableHistory = false;
  }

  /**
   * 启用事件历史记录
   * @param enable - 是否启用
   */
  setHistoryEnabled(enable: boolean = true): void {
    this.enableHistory = enable;
  }

  /**
   * 订阅事件
   * @param eventName - 事件名称
   * @param callback - 回调函数
   * @param options - 配置项
   * @returns 包含取消订阅方法的对象
   */
  on<T = any>(eventName: string, callback: (data: T) => void, options: { once?: boolean, context?: any } = {}): { off: () => void } | null {
    if (typeof eventName !== 'string' || typeof callback !== 'function') {
      console.error('事件名称必须是字符串，回调必须是函数');
      return null;
    }

    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    const handler = {
      callback,
      once: !!options.once,
      context: options.context || null
    };

    this.events[eventName].push(handler);

    // 如果有历史记录且启用了历史记录，则立即触发回调
    if (this.enableHistory && this.history[eventName]) {
      this.history[eventName].forEach(data => {
        this._executeCallback(handler, data);
      });
    }

    // 返回取消订阅的方法
    return {
      off: () => this.off(eventName, callback)
    };
  }

  /**
   * 订阅事件，只触发一次
   * @param eventName - 事件名称
   * @param callback - 回调函数
   * @param options - 配置项
   * @returns 包含取消订阅方法的对象
   */
  once<T = any>(eventName: string, callback: (data: T) => void, options: { context?: any } = {}): { off: () => void } | null {
    return this.on(eventName, callback, {
      ...options,
      once: true
    });
  }

  /**
   * 取消订阅事件
   * @param eventName - 事件名称
   * @param callback - 回调函数，如果不提供则取消该事件的所有订阅
   */
  off<T = any>(eventName: string, callback?: (data: T) => void): void {
    if (typeof eventName !== 'string') {
      console.error('事件名称必须是字符串');
      return;
    }

    // 如果事件不存在，直接返回
    if (!this.events[eventName]) {
      return;
    }

    // 如果提供了回调函数，则只取消该回调的订阅
    if (callback && typeof callback === 'function') {
      this.events[eventName] = this.events[eventName].filter(
        handler => handler.callback !== callback
      );
    } else {
      // 否则取消该事件的所有订阅
      delete this.events[eventName];
    }

    // 同时清理历史记录
    if (this.history[eventName]) {
      delete this.history[eventName];
    }
  }

  /**
   * 触发事件
   * @param eventName - 事件名称
   * @param data - 要传递的数据
   */
  emit<T = any>(eventName: string, data: T): void {
    if (typeof eventName !== 'string') {
      console.error('事件名称必须是字符串');
      return;
    }

    // 如果启用了历史记录，保存事件数据
    if (this.enableHistory) {
      if (!this.history[eventName]) {
        this.history[eventName] = [];
      }
      this.history[eventName].push(data);
    }

    // 如果没有订阅者，直接返回
    if (!this.events[eventName]) {
      return;
    }

    // 需要移除的一次性处理程序
    const toRemove: number[] = [];

    // 执行所有订阅者的回调
    this.events[eventName].forEach((handler, index) => {
      try {
        this._executeCallback(handler, data);
        // 标记一次性处理程序以便后续移除
        if (handler.once) {
          toRemove.push(index);
        }
      } catch (error) {
        console.error(`事件 ${eventName} 的回调执行出错:`, error);
      }
    });

    // 移除一次性处理程序（从后往前移除，避免索引偏移）
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.events[eventName].splice(toRemove[i], 1);
    }

    // 如果事件列表为空，清理该事件
    if (this.events[eventName] && this.events[eventName].length === 0) {
      delete this.events[eventName];
    }
  }

  /**
   * 执行回调函数
   * @private
   * @param handler - 处理程序对象
   * @param data - 事件数据
   */
  private _executeCallback<T = any>(handler: EventHandler<T>, data: T): void {
    if (handler.context) {
      handler.callback.call(handler.context, data);
    } else {
      handler.callback(data);
    }
  }

  /**
   * 获取指定事件的订阅者数量
   * @param eventName - 事件名称
   * @returns 订阅者数量
   */
  getListenerCount(eventName: string): number {
    if (typeof eventName !== 'string' || !this.events[eventName]) {
      return 0;
    }
    return this.events[eventName].length;
  }

  /**
   * 获取所有注册的事件名称
   * @returns 事件名称数组
   */
  getEventNames(): string[] {
    return Object.keys(this.events);
  }

  /**
   * 清除所有事件订阅
   */
  clear(): void {
    this.events = {};
    this.history = {};
  }

  /**
   * 清除历史记录
   * @param eventName - 事件名称，如果不提供则清除所有历史记录
   */
  clearHistory(eventName?: string): void {
    if (eventName) {
      delete this.history[eventName];
    } else {
      this.history = {};
    }
  }

  /**
   * 检查是否有指定事件的订阅者
   * @param eventName - 事件名称
   * @returns 是否有订阅者
   */
  hasListeners(eventName: string): boolean {
    return typeof eventName === 'string' && 
           !!this.events[eventName] && 
           this.events[eventName].length > 0;
  }
}

// 创建单例实例
const eventBus = new EventBus();

// 常用事件名称常量
export const EVENT_NAMES: Record<string, string> = {
  // 用户相关事件
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  USER_INFO_CHANGE: 'user:info:change',
  
  // 主题相关事件
  THEME_CHANGE: 'theme:change',
  
  // 布局相关事件
  LAYOUT_CHANGE: 'layout:change',
  SIDEBAR_TOGGLE: 'sidebar:toggle',
  
  // 权限相关事件
  PERMISSION_CHANGE: 'permission:change',
  
  // 通知相关事件
  NOTIFICATION_ADD: 'notification:add',
  NOTIFICATION_CLEAR: 'notification:clear',
  
  // 错误相关事件
  ERROR_OCCURRED: 'error:occurred',
  
  // 数据加载相关事件
  DATA_LOAD_START: 'data:load:start',
  DATA_LOAD_END: 'data:load:end',
  
  // 路由相关事件
  ROUTE_CHANGE: 'route:change',
  
  // 语言相关事件
  LANGUAGE_CHANGE: 'language:change',
  
  // 窗口大小变化事件
  WINDOW_RESIZE: 'window:resize',
  
  // 自定义事件前缀
  CUSTOM: 'custom:'
};

// 导出事件总线实例和方法
export default eventBus;

// 导出便捷方法
export const on = <T = any>(
  eventName: string,
  callback: (data: T) => void,
  options: { once?: boolean; context?: any } = {},
) => eventBus.on<T>(eventName, callback, options)

export const once = <T = any>(
  eventName: string,
  callback: (data: T) => void,
  options: { context?: any } = {},
) => eventBus.once<T>(eventName, callback, options)

export const off = <T = any>(eventName: string, callback?: (data: T) => void) =>
  eventBus.off<T>(eventName, callback)

export const emit = <T = any>(eventName: string, data: T) =>
  eventBus.emit<T>(eventName, data)

export const clear = () => eventBus.clear()

export const hasListeners = (eventName: string) => eventBus.hasListeners(eventName)

/**
 * 创建自定义事件名称
 * @param name - 自定义事件名称
 * @returns 完整的事件名称
 */
export const createCustomEventName = (name: string): string =>
  `${EVENT_NAMES.CUSTOM}${name}`;

/**
 * 批量订阅多个事件
 * @param eventsMap - 事件名称到回调函数的映射
 * @param options - 配置项
 * @returns 包含取消所有订阅方法的对象
 */
export const onMultiple = (eventsMap: Record<string, (data: any) => void>, options: { once?: boolean, context?: any } = {}): { offAll: () => void } => {
  const subscriptions: { off: () => void }[] = [];
  
  Object.entries(eventsMap).forEach(([eventName, callback]) => {
    if (typeof callback === 'function') {
      const subscription = on(eventName, callback, options);
      if (subscription) {
        subscriptions.push(subscription);
      }
    }
  });
  
  return {
    offAll: () => {
      subscriptions.forEach(subscription => subscription.off());
    }
  };
};
