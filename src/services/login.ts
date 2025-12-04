import ajax from '@/utils/axios.config';

/**
 * 登录参数接口
 */
export interface LoginParams {
  username: string;
  password: string;
}

/**
 * 用户信息接口
 */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  roles: string[];
  avatar?: string;
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
  token: string;
  user_info: UserInfo;
}

/**
 * 用户登录
 */
export const loginApi = async (params: LoginParams) => {
  return ajax<LoginResponse>({
    method: 'post',
    url: '/login',
    data: params,
  });
}