// 系统配置和用户信息相关接口服务
import ajax from '../utils/axios.config';

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

// 系统配置响应（扁平结构）
export interface SysConfigResponse {
  // 基础配置
  water_mark?: boolean;
  waterMark?: boolean;
  login_url: string;
  logout_url: string;
  sys_text?: string;  // 系统名称

  // API 配置
  api_host?: string;
  iamUrl?: string;
  editPasswordUrl?: string;

  // 安全配置
  public_key?: string;

  // 地图配置
  map?: MapConfig;
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
