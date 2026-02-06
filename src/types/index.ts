import { Layout } from 'react-grid-layout';

export const GRID_DENSITY_PRESETS = {
  compact: { label: '紧凑', cellHeight: 30, margin: 0, columnCount: 36 },
  standard: { label: '标准', cellHeight: 120, margin: 0, columnCount: 12 },
  spacious: { label: '宽松', cellHeight: 150, margin: 0, columnCount: 8 },
} as const;

export type GridDensityKey = keyof typeof GRID_DENSITY_PRESETS;

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
  | 'headerBar'        // 头部栏组件
  | 'typography'       // 文本/标题组件
  | 'microApp'         // 微应用小部件类型
  | 'floatingModule'   // 悬浮模块
  | 'pageNavigator'    // 页面切换工具
  | 'iconNav'          // 图标导航组件
  | 'navGroup';        // 导航组组件

/**
 * 导航项数据结构（用于 NavGroupWidget 接口返回）
 */
export interface NavItem {
  id?: string;
  url: string;
  icon?: string;
  name: string;
  description?: string;
  openInNew?: boolean;
  // 样式配置（可由接口返回，前端有默认值）
  iconBgColor?: string;   // 图标背景色（不返回则使用随机渐变色）
  iconColor?: string;     // 图标颜色（默认白色）
  textColor?: string;     // 文字颜色（默认黑色）
}

export interface WidgetConfig {
  title?: string;
  showTitle?: boolean; // 是否显示标题
  titleColor?: string; // 标题颜色
  contentPadding?: number; // 内容区域内边距（像素）
  refreshInterval?: number; // in seconds
  apiEndpoint?: string;
  forceIconOnly?: boolean;
  iconSvg?: string;
  // 背景配置
  backgroundType?: 'color' | 'image' | 'gradient';
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  backgroundSize?: string;     // 背景大小
  backgroundRepeat?: string;   // 背景重复
  backgroundPosition?: string; // 背景位置
  boxShadow?: string;          // 阴影效果
  [key: string]: any; // Allow custom properties for different widgets
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  layout: Layout; // React Grid Layout item properties
  config: WidgetConfig;
  refreshCount?: number; // 刷新计数器，用于触发小部件重新加载数据
  groupId?: string;
}

export interface WidgetGroupConfig {
  // 标题设置
  showTitle?: boolean;          // 是否显示标题，默认 true
  titleColor?: string;          // 标题颜色
  titleFontSize?: number;       // 标题字体大小，默认 14
  titleFontWeight?: number | string;  // 标题字重，默认 500

  // 背景设置
  backgroundType?: 'color' | 'image' | 'gradient';
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  backgroundSize?: string;
  backgroundRepeat?: string;
  backgroundPosition?: string;
  backdropBlur?: number;        // 背景模糊度

  // 边框设置
  borderStyle?: 'none' | 'solid' | 'dashed';  // 默认 'solid'
  borderColor?: string;         // 默认使用主题边框色
  borderWidth?: number;         // 默认 2
  borderRadius?: number;        // 默认 8

  // 其他
  padding?: number;             // 内边距
}

export interface WidgetGroup {
  id: string;
  title: string;
  widgetIds: string[];
  layout: Layout;
  config?: WidgetGroupConfig;
}

export interface LayoutSyncOptions {
  groupLayouts?: Layout[];
  widgetAssignments?: Record<string, string | null>;
  groupMemberships?: Record<string, string[]>;
}

// 用户信息接口
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  roles: string[];
  avatar?: string;
}

export interface DashboardConfig {
  title?: string; // 仪表盘标题（编辑模式下使用）
  backgroundType?: 'color' | 'image' | 'gradient';
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  // 主题配置（发布时保存，预览时使用）
  themeMode?: 'light' | 'dark';
  themePreset?: string;               // 主题预设名称
  styleMode?: 'normal' | 'minimal';
  styleTokens?: Record<string, any>;  // 风格样式 Token
  baseColors?: Record<string, any>;   // 基础颜色配置
  customTokens?: Record<string, any>; // 自定义语义 Token
}

export type ConfigPanelTarget = {
  type: 'widget' | 'group' | 'floating';
  id: string;
};

export interface AppState {
  gridDensity: GridDensityKey;
  setGridDensity: (density: GridDensityKey) => void;
  floatingPanelPosition: { x: number; y: number };
  setFloatingPanelPosition: (position: { x: number; y: number }) => void;
  dashboardConfig?: DashboardConfig;
  widgets: Widget[];
  groups: WidgetGroup[];
  isEditMode: boolean;
  isFullScreen: boolean;
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  configPanelTarget: ConfigPanelTarget | null;
  floatingModules: Widget[];  // 悬浮模块列表
  globalMicroApps: Widget[];  // 全局无边框微应用列表
  login: (userInfo?: UserInfo) => void;
  logout: () => void;
  addWidget: (type: WidgetType) => void;
  addMicroAppWidget: (systemId: string, moduleId: string, module: MicroAppModule) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  refreshWidget: (id: string) => void;
  updateLayout: (layouts: Layout[], options?: LayoutSyncOptions) => void;
  createWidgetGroup: (title: string, widgetIds: string[]) => void;
  createEmptyGroup: (title?: string) => WidgetGroup;
  removeGroup: (id: string) => void;
  updateGroup: (id: string, updates: Partial<WidgetGroup>) => void;
  updateGroupConfig: (id: string, config: Partial<WidgetGroupConfig>) => void;
  setEditMode: (isEditMode: boolean) => void;
  toggleFullScreen: () => void;
  openConfigPanel: (target: ConfigPanelTarget) => void;
  closeConfigPanel: () => void;
  resetDashboard: () => void;
  saveDashboard: () => void;
  loadDashboard: () => void;
  loadDashboardFromData: (data: {
    widgets?: Widget[];
    groups?: WidgetGroup[];
    floatingModules?: Widget[];
    dashboardConfig?: DashboardConfig;
  }) => void;
  updateDashboardConfig: (config: Partial<DashboardConfig>) => void;
  // 悬浮模块方法
  addFloatingModuleMicroApp: (
    systemId: string,
    moduleId: string,
    module: MicroAppModule,
    config?: Partial<FloatingModuleConfig>
  ) => void;
  addFloatingModuleLocal: (
    componentType: LocalComponentType,
    title: string,
    componentProps?: Record<string, any>,
    config?: Partial<FloatingModuleConfig>
  ) => void;
  removeFloatingModule: (id: string) => void;
  updateFloatingModule: (id: string, updates: Partial<Widget>) => void;
  updateFloatingModuleConfig: (id: string, config: Partial<FloatingModuleConfig>) => void;
  updateFloatingModulePosition: (id: string, position: { x: number; y: number }) => void;
  updateFloatingModuleSize: (id: string, size: { width: number; height: number }) => void;
  toggleFloatingModuleExpanded: (id: string) => void;
  // 全局微应用方法
  addGlobalMicroApp: (
    systemId: string,
    moduleId: string,
    module: MicroAppModule,
    config?: Partial<MicroAppWidgetConfig>
  ) => void;
  removeGlobalMicroApp: (id: string) => void;
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
  id: string;
  type: string;                  // 事件类型 (如 data:submit)
  name: string;                  // 事件名称
  description?: string;          // 事件描述
}

// 微应用模块配置
export interface MicroAppModule {
  id: string;                    // 数据库ID（由接口返回）
  moduleId?: string;             // 模块标识符（用户输入）
  name: string;                  // 模块名称
  description?: string;          // 模块描述
  url: string;                   // 模块访问路径
  entry: string;                 // 微应用入口地址
  icon?: string;                 // 图标
  defaultSize?: { w: number; h: number }; // 默认尺寸
  forceIconOnly?: boolean;
  iconSvg?: string;

  emittableEvents?: EmittableEvent[]; // 可发送的事件列表
  listenableEvents?: EmittableEvent[]; // 可监听的事件列表(接收方)
}

// 微应用系统配置
export interface MicroAppSystem {
  id: string;                    // 数据库ID（由接口返回）
  systemId?: string;             // 系统标识符（用户输入）
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
  mode?: 'default' | 'global';   // 显示模式: default-标准容器, global-无边框全局
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

// ============================================
// 悬浮模块相关类型定义
// ============================================

/**
 * 悬浮模块内容类型
 */
export type FloatingModuleContentType = 'microApp' | 'localComponent';

/**
 * 本地组件类型枚举
 */
export type LocalComponentType =
  | 'chat'           // 聊天组件
  | 'notification'   // 通知中心
  | 'help'           // 帮助文档
  | 'calendar'       // 日历
  | 'notes'          // 笔记
  | 'assistantHub'   // 助手中心
  | 'custom';        // 自定义组件

/**
 * 悬浮模块配置
 */
export interface FloatingModuleConfig extends WidgetConfig {
  // 内容类型配置
  contentType: FloatingModuleContentType;  // 内容类型: 微应用 或 本地组件

  // 微应用配置 (当 contentType = 'microApp' 时使用)
  microApp?: {
    systemId: string;
    moduleId: string;
    url: string;
    entry: string;
    props?: Record<string, any>;
    sync?: boolean;
    alive?: boolean;
  };

  // 本地组件配置 (当 contentType = 'localComponent' 时使用)
  localComponent?: {
    componentType: LocalComponentType;  // 组件类型
    componentProps?: Record<string, any>;  // 传递给组件的 props
  };

  // 位置配置
  position?: {
    x: number;      // X 坐标(像素)
    y: number;      // Y 坐标(像素)
  };
  defaultPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

  // 尺寸配置
  width?: number;        // 宽度(像素)
  height?: number;       // 高度(像素)
  minWidth?: number;     // 最小宽度
  minHeight?: number;    // 最小高度
  maxWidth?: number;     // 最大宽度
  maxHeight?: number;    // 最大高度

  // 显示配置
  isExpanded?: boolean;     // 是否展开
  collapsedWidth?: number;  // 折叠时宽度
  collapsedHeight?: number; // 折叠时高度
  collapsedIcon?: string;   // 折叠时图标（图标名或URL）
  collapsedBgColor?: string; // 折叠时背景色
  collapsedIconSize?: number; // 折叠时图标大小

  // 行为配置
  draggable?: boolean;      // 是否可拖拽(非编辑模式)
  resizable?: boolean;      // 是否可调整大小
  collapsible?: boolean;    // 是否可折叠
  closable?: boolean;       // 是否可关闭

  // 样式配置
  theme?: 'light' | 'dark' | 'auto' | 'custom';  // auto: 跟随主应用主题
  borderRadius?: number;    // 圆角大小
  showHeader?: boolean;     // 是否显示头部
  headerColor?: string;     // 头部颜色
  icon?: React.ReactNode;   // 折叠时显示的图标
  zIndex?: number;          // 层级
}

export * from './widget-size';
