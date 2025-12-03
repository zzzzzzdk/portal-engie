import { Layout } from 'react-grid-layout';

export type WidgetType =
  | 'clock'
  | 'stats'
  | 'chart'
  | 'link'
  | 'news'
  | 'topList'
  | 'search'
  | 'dataTable'
  | 'cardGrid'
  | 'customForm'
  | 'microApp'; // 微应用小部件类型

export interface WidgetConfig {
  title?: string;
  showTitle?: boolean; // 是否显示标题
  refreshInterval?: number; // in seconds
  apiEndpoint?: string;
  [key: string]: any; // Allow custom properties for different widgets
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  layout: Layout; // React Grid Layout item properties
  config: WidgetConfig;
}

// 用户信息接口
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  roles: string[];
  avatar?: string;
}

export interface AppState {
  widgets: Widget[];
  isEditMode: boolean;
  isFullScreen: boolean;
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  login: (userInfo?: UserInfo) => void;
  logout: () => void;
  addWidget: (type: WidgetType) => void;
  addMicroAppWidget: (systemId: string, moduleId: string, module: MicroAppModule) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  updateLayout: (layouts: Layout[]) => void;
  setEditMode: (isEditMode: boolean) => void;
  toggleFullScreen: () => void;
  resetDashboard: () => void;
  saveDashboard: () => void;
  loadDashboard: () => void;
}

// Form builder types
export interface FormField {
  id: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  label: string;
  name: string;
  required?: boolean;
  options?: { label: string; value: string | number }[]; // For select
  defaultValue?: any;
}

export interface FormConfig extends WidgetConfig {
  fields: FormField[];
  submitUrl?: string;
}

// 微应用可发送的事件定义
export interface EmittableEvent {
  type: string;                  // 事件类型 (如 data:submit)
  name: string;                  // 事件名称
  description?: string;          // 事件描述
}

// 微应用模块配置
export interface MicroAppModule {
  id: string;                    // 模块唯一标识
  name: string;                  // 模块名称
  description?: string;          // 模块描述
  url: string;                   // 模块访问路径
  entry: string;                 // 微应用入口地址
  icon?: string;                 // 图标
  defaultSize?: { w: number; h: number }; // 默认尺寸

  emittableEvents?: EmittableEvent[]; // 可发送的事件列表
  listenableEvents?: EmittableEvent[]; // 可监听的事件列表(接收方)
}

// 微应用系统配置
export interface MicroAppSystem {
  id: string;                    // 系统唯一标识
  name: string;                  // 系统名称
  description?: string;          // 系统描述
  icon?: string;                 // 系统图标
  category: string;              // 系统分类
  modules: MicroAppModule[];     // 模块列表
}

// 微应用配置元数据
export interface MicroAppMetadata {
  version: string;
  apps: MicroAppSystem[];
}

// 事件路由配置 - 发送方配置(定义当前微应用的事件要发送给谁)
export interface EventRouteConfig {
  eventType: string;             // 事件类型(当前应用发送的事件)
  toAppId: string;               // 发送到哪个应用 (格式: systemId-moduleId)
  toAppName?: string;            // 接收方应用的名称(显示用)
  toEventType?: string;          // 接收方监听的事件类型(可以不同于发送方的事件类型)
  enabled?: boolean;             // 是否启用此路由
}

// 微应用小部件配置(扩展 WidgetConfig)
export interface MicroAppWidgetConfig extends WidgetConfig {
  systemId?: string;             // 选择的系统ID
  moduleId?: string;             // 选择的模块ID
  microAppUrl?: string;          // 微应用URL(从模块配置读取)
  microAppEntry?: string;        // 微应用入口(从模块配置读取)
  sync?: boolean;                // 是否同步路由
  alive?: boolean;               // 是否保持存活
  props?: Record<string, any>;   // 传递给子应用的props
  eventRoutes?: EventRouteConfig[]; // 事件路由配置 - 发送方配置(当前应用的事件发送给谁)
}

// ============================================
// 微应用通信事件协议类型定义
// ============================================

/**
 * 事件类型枚举 - 定义所有支持的事件类型
 */
export enum MicroAppEventType {
  // 数据传递类
  DATA_SUBMIT = 'data:submit',           // 数据提交事件
  DATA_UPDATE = 'data:update',           // 数据更新事件
  DATA_DELETE = 'data:delete',           // 数据删除事件
  DATA_QUERY = 'data:query',             // 数据查询请求
  DATA_RESPONSE = 'data:response',       // 数据查询响应

  // 导航类
  NAVIGATE = 'navigate',                 // 路由导航事件
  NAVIGATE_BACK = 'navigate:back',       // 返回上一页

  // 用户交互类
  USER_SELECT = 'user:select',           // 用户选择事件
  USER_ACTION = 'user:action',           // 用户操作事件

  // 系统通知类
  NOTIFICATION = 'notification',         // 通知消息
  ERROR = 'error',                       // 错误消息
  SUCCESS = 'success',                   // 成功消息
  WARNING = 'warning',                   // 警告消息

  // 状态同步类
  STATE_CHANGE = 'state:change',         // 状态变更
  THEME_CHANGE = 'theme:change',         // 主题变更
  TOKEN_UPDATE = 'token:update',         // Token更新

  // 功能控制类
  REFRESH = 'refresh',                   // 刷新请求
  RESIZE = 'resize',                     // 尺寸变化
  FULLSCREEN = 'fullscreen',             // 全屏切换

  // 自定义事件
  CUSTOM = 'custom',                     // 自定义事件
}

/**
 * 事件消息基础接口
 */
export interface MicroAppEventMessage<T = any> {
  id: string;                            // 消息唯一ID
  type: MicroAppEventType;               // 事件类型
  from: string;                          // 发送方应用ID (格式: systemId-moduleId)
  to?: string | string[];                // 接收方应用ID,可选(不指定则广播给所有应用)
  timestamp: number;                     // 时间戳
  payload: T;                            // 消息载荷(具体数据)
  metadata?: {                           // 元数据
    correlationId?: string;              // 关联ID(用于请求-响应模式)
    priority?: 'low' | 'normal' | 'high'; // 优先级
    ttl?: number;                        // 消息存活时间(毫秒)
  };
}

/**
 * 数据提交事件载荷
 */
export interface DataSubmitPayload {
  entityType: string;                    // 实体类型(如: user, order, product)
  action: 'create' | 'update' | 'delete'; // 操作类型
  data: Record<string, any>;             // 数据内容
  options?: {
    silent?: boolean;                    // 是否静默提交
    validate?: boolean;                  // 是否需要验证
  };
}

/**
 * 数据查询事件载荷
 */
export interface DataQueryPayload {
  entityType: string;                    // 实体类型
  query: {
    filters?: Record<string, any>;       // 过滤条件
    pagination?: {
      page: number;
      pageSize: number;
    };
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
  };
}

/**
 * 数据响应事件载荷
 */
export interface DataResponsePayload<T = any> {
  success: boolean;                      // 是否成功
  data?: T;                              // 响应数据
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * 用户选择事件载荷
 */
export interface UserSelectPayload {
  entityType: string;                    // 选择的实体类型
  selectedIds: string[];                 // 选中的ID列表
  selectedData?: Record<string, any>[];  // 选中的完整数据
}

/**
 * 导航事件载荷
 */
export interface NavigatePayload {
  path: string;                          // 目标路径
  params?: Record<string, any>;          // 路由参数
  query?: Record<string, any>;           // 查询参数
  state?: Record<string, any>;           // 状态数据
}

/**
 * 通知事件载荷
 */
export interface NotificationPayload {
  title: string;                         // 标题
  message: string;                       // 消息内容
  duration?: number;                     // 显示时长(毫秒)
  closable?: boolean;                    // 是否可关闭
}

/**
 * 主题变更事件载荷
 */
export interface ThemeChangePayload {
  theme: 'light' | 'dark' | string;      // 主题名称
  colors?: Record<string, string>;       // 自定义颜色
}

/**
 * 事件监听器回调函数类型
 */
export type MicroAppEventListener<T = any> = (message: MicroAppEventMessage<T>) => void | Promise<void>;
