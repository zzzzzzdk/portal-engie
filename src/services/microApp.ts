// 微应用配置相关接口服务
import ajax from '../utils/axios.config';

/**
 * 保存微应用配置到服务器
 * @param config 配置对象
 * @returns 保存结果
 */
export const saveMicroAppConfig = (config: any) => {
  return ajax<{ success: boolean }>({
    method: 'post',
    url: '/micro-app/save-config',
    data: config
  });
};
