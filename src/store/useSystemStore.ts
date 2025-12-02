// 系统状态管理 - Zustand Store
import { create } from 'zustand';
import { getSysConfig, getUserInfo } from '@/services/system';
import { loginApi } from '@/services/login';
import type { SysConfigResponse, UserInfoResponse } from '@/services/system';
import type { LoginParams } from '@/services/login';
import { setToken as setCookieToken, removeToken, getToken } from '@/utils/cookie';

// 当前路由信息接口
export interface CurrentRouteInfo {
  path: string;
  name?: string;
  title?: string;
  breadcrumb?: string[];
  [key: string]: any;
}

// 系统状态接口
interface SystemState {
  // 系统配置
  sysConfig: SysConfigResponse | null;
  sysConfigLoading: boolean;
  sysConfigError: string | null;

  // 用户信息
  userInfo: UserInfoResponse | null;
  userInfoLoading: boolean;
  userInfoError: string | null;

  // 认证相关
  token: string | null;
  isLogin: boolean;
  loginLoading: boolean;
  loginError: string | null;

  // 系统初始化状态
  initialized: boolean;
  initError: string | null;

  // 当前路由信息
  currentRoute: CurrentRouteInfo | null;
}

// 系统操作接口
interface SystemActions {
  // 获取系统配置
  fetchSysConfig: () => Promise<SysConfigResponse>;

  // 获取用户信息
  fetchUserInfo: () => Promise<UserInfoResponse>;

  // 初始化系统
  initializeSystem: () => Promise<void>;

  // 用户登录
  login: (params: LoginParams) => Promise<void>;

  // 用户登出
  logout: () => void;

  // 设置 Token
  setToken: (token: string) => void;

  // 设置当前路由
  setCurrentRoute: (route: CurrentRouteInfo) => void;

  // 清除错误
  clearErrors: () => void;

  // 重置状态
  resetSystemState: () => void;
}

// 初始状态
const initialState: SystemState = {
  sysConfig: null,
  sysConfigLoading: false,
  sysConfigError: null,

  userInfo: null,
  userInfoLoading: false,
  userInfoError: null,

  // 从 Cookie 读取 token 判断登录状态
  token: getToken() || null,
  isLogin: !!getToken(),
  loginLoading: false,
  loginError: null,

  initialized: false,
  initError: null,

  currentRoute: null,
};

/**
 * 系统状态管理 Store
 */
export const useSystemStore = create<SystemState & SystemActions>((set, get) => ({
  ...initialState,

  // 获取系统配置
  fetchSysConfig: async () => {
    set({ sysConfigLoading: true, sysConfigError: null });
    try {
      const response = await getSysConfig();
      if (!response.data) {
        throw new Error('获取系统配置失败：返回数据为空');
      }
      set({
        sysConfig: response.data,
        sysConfigLoading: false
      });
      return response.data;
    } catch (error: any) {
      const errorMsg = error.message || '获取系统配置失败';
      set({
        sysConfigError: errorMsg,
        sysConfigLoading: false
      });
      throw error;
    }
  },

  // 获取用户信息
  fetchUserInfo: async () => {
    set({ userInfoLoading: true, userInfoError: null });
    try {
      const response = await getUserInfo();
      if (!response.data) {
        throw new Error('获取用户信息失败：返回数据为空');
      }
      set({
        userInfo: response.data,
        userInfoLoading: false
      });
      return response.data;
    } catch (error: any) {
      const errorMsg = error.message || '获取用户信息失败';
      set({
        userInfoError: errorMsg,
        userInfoLoading: false
      });
      throw error;
    }
  },

  // 初始化系统（并行获取系统配置和用户信息）
  initializeSystem: async () => {
    set({ initialized: false, initError: null });
    try {
      // 并行请求系统配置和用户信息
      const results = await Promise.allSettled([
        get().fetchSysConfig(),
        get().fetchUserInfo(),
      ]);

      // 检查是否有失败的请求
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        const errors = failures
          .map((f: any) => f.reason?.message || '未知错误')
          .join('; ');
        set({ initError: errors, initialized: false });
        throw new Error(errors);
      }

      set({ initialized: true, initError: null });
    } catch (error: any) {
      const errorMsg = error.message || '系统初始化失败';
      set({ initError: errorMsg, initialized: false });
      throw error;
    }
  },

  // 用户登录
  login: async (params: LoginParams) => {
    set({ loginLoading: true, loginError: null });
    try {
      const response = await loginApi(params);

      // 保存 token 到 Cookie
      if (response.token) {
        setCookieToken(response.token);
        set({
          token: response.token,
          isLogin: true
        });
      }

      // 登录成功后重新初始化系统
      await get().initializeSystem();

      set({ loginLoading: false });
    } catch (error: any) {
      console.log(error)
      const errorMsg = error.message || '登录失败';
      set({
        loginLoading: false,
        loginError: errorMsg,
        isLogin: false
      });
      throw error;
    }
  },

  // 用户登出
  logout: () => {
    removeToken();
    set({
      token: null,
      isLogin: false,
      userInfo: null,
      initialized: false,
    });
  },

  // 设置 Token
  setToken: (token: string) => {
    setCookieToken(token);
    set({
      token,
      isLogin: true
    });
  },

  // 设置当前路由
  setCurrentRoute: (route: CurrentRouteInfo) => {
    set({ currentRoute: route });
  },

  // 清除错误
  clearErrors: () => {
    set({
      sysConfigError: null,
      userInfoError: null,
      initError: null,
      loginError: null,
    });
  },

  // 重置状态
  resetSystemState: () => {
    set(initialState);
  },
}));
