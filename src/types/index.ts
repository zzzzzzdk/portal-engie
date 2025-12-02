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
  | 'customForm';

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
