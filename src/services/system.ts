// 系统配置和用户信息相关接口服务
import ajax from '../utils/axios.config';

// 系统信息
export interface SystemInfo {
  sys_name: string;
  sys_description: string;
  logo: string;
}

// 系统配置
export interface SystemConfig {
  login_url: string;
  logout_url: string;
  manage_url: string;
}

// 场景信息
export interface SceneInfo {
  id: number;
  scene_name: string;
}

// 模型信息
export interface ModelInfo {
  id: number;
  model_name: string;
  api_url: string;
  api_key?: string;
  context_max_len?: number;
  is_default?: boolean; // 是否为默认模型
}

// 标签信息
export interface LabelInfo {
  id: number;
  class_name: string;
  children: Array<{
    id: number;
    label_en: string;
    lebel_zh: string;
  }>;
}

// 地图配置
export interface MapConfig {
  map_crs: number;
  center: [number, number];
  zoom: number;
  tile_templates: {
    default: string;
    default_text: string;
    image: string;
    image_text: string;
    sea: string;
    sea_text: string;
  };
  tile_options: {
    default: {
      minZoom: number;
      maxZoom: number;
    };
    image: {
      minZoom: number;
      maxZoom: number;
    };
    sea: {
      minZoom: number;
      maxZoom: number;
    };
  };
}

// 系统配置响应
export interface SysConfigResponse {
  sys_info: SystemInfo;
  sys_config: SystemConfig;
  sys_scene_info: SceneInfo[];
  sys_model_info: {
    llm: ModelInfo[];
    detection: ModelInfo[];
    img_text_relation: ModelInfo[];
  };
  sys_label_info: LabelInfo[];
  province: string;
  water_mark: boolean;
  login_url: string;
  logout_url: string;
  help_url: string;
  manage_url: string;
  chrome_url: string;
  mlflow_web_url: string;
  ws_url: string;
  post_error: string;
  map: MapConfig;
}

// 用户基本信息
export interface UserBasicInfo {
  user_uuid: number | string;
  user_name: string;
  account: string;
  phone_number: string;
  organization_uuid: string;
  role: string[];
}

// 菜单项
export interface MenuItem {
  title: string;
  icon?: string;
  path?: string;
  fid?: number;
  id?: number;
  children?: MenuItem[];
}

// 用户信息响应
export interface UserInfoResponse {
  color: string;
  layout: string;
  user_info: UserBasicInfo;
  menus: MenuItem[];
  route: string[];
}

/**
 * 获取系统配置信息
 * @returns 系统配置数据
 */
export const getSysConfig = () => {
  return ajax<SysConfigResponse>({
    method: 'get',
    url: '/v1/common/get-sysconfig'
  });
};

/**
 * 获取用户信息
 * @returns 用户信息数据
 */
export const getUserInfo = () => {
  return ajax<UserInfoResponse>({
    method: 'get',
    url: '/v1/user/info'
  });
};
