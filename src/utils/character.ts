// 字符处理工具函数

/**
 * 判断字符串是否为空
 * @param str - 要检查的字符串
 * @returns 是否为空
 */
export const isEmpty = (str: string | null | undefined): boolean => {
  return str === null || str === undefined || str.trim() === '';
};

/**
 * 判断字符串是否不为空
 * @param str - 要检查的字符串
 * @returns 是否不为空
 */
export const isNotEmpty = (str: string | null | undefined): boolean => {
  return !isEmpty(str);
};

/**
 * 去除字符串两端空格
 * @param str - 原始字符串
 * @returns 去除空格后的字符串
 */
export const trim = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.trim();
};

/**
 * 去除字符串左侧空格
 * @param str - 原始字符串
 * @returns 去除左侧空格后的字符串
 */
export const trimLeft = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/^\s+/, '');
};

/**
 * 去除字符串右侧空格
 * @param str - 原始字符串
 * @returns 去除右侧空格后的字符串
 */
export const trimRight = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/\s+$/, '');
};

/**
 * 字符串转大写
 * @param str - 原始字符串
 * @returns 大写字符串
 */
export const toUpperCase = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.toUpperCase();
};

/**
 * 字符串转小写
 * @param str - 原始字符串
 * @returns 小写字符串
 */
export const toLowerCase = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.toLowerCase();
};

/**
 * 首字母大写
 * @param str - 原始字符串
 * @returns 首字母大写的字符串
 */
export const capitalize = (str: any): string => {
  if (typeof str !== 'string' || str.length === 0) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * 驼峰命名转短横线命名
 * @param str - 驼峰命名字符串
 * @returns 短横线命名字符串
 */
export const camelToKebab = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
};

/**
 * 短横线命名转驼峰命名
 * @param str - 短横线命名字符串
 * @returns 驼峰命名字符串
 */
export const kebabToCamel = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * 首字母大写的驼峰命名
 * @param str - 原始字符串
 * @returns 首字母大写的驼峰命名字符串
 */
export const pascalCase = (str: any): string => {
  if (typeof str !== 'string') return '';
  const camel = kebabToCamel(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

/**
 * 截断字符串
 * @param str - 原始字符串
 * @param length - 最大长度
 * @param suffix - 截断后缀，默认'...'
 * @returns 截断后的字符串
 */
export const truncate = (str: any, length: number, suffix: string = '...'): string => {
  if (typeof str !== 'string' || str.length <= length) return str || '';
  return str.slice(0, length - suffix.length) + suffix;
};

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @param decimals - 小数位数
 * @returns 格式化后的文件大小
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals > 0 ? decimals : 0;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * 格式化数字（添加千分位）
 * @param num - 数字
 * @param decimals - 小数位数
 * @returns 格式化后的数字
 */
export const formatNumber = (num: number | string | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '';
  
  const parsedNum = parseFloat(String(num));
  if (isNaN(parsedNum)) return '';
  
  return parsedNum.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * 将字符串转换为数字
 * @param num 数字字符串
 * @returns 转换后的数字
 */
export function parseNumber(num: string | number): number {
  const parsedNum = parseFloat(String(num));
  return isNaN(parsedNum) ? 0 : parsedNum;
};

/**
 * 隐藏敏感信息
 * @param str - 原始字符串
 * @param start - 起始位置
 * @param end - 结束位置
 * @param mask - 掩码字符
 * @returns 隐藏敏感信息后的字符串
 */
export const maskSensitiveInfo = (str: any, start: number = 3, end: number = 4, mask: string = '*'): string => {
  if (typeof str !== 'string' || str.length < start + end) return str || '';
  
  const maskLength = str.length - start - end;
  const maskStr = mask.repeat(Math.max(1, maskLength));
  
  return str.slice(0, start) + maskStr + str.slice(-end);
};

/**
 * 隐藏手机号
 * @param phone - 手机号
 * @returns 隐藏后的手机号
 */
export const maskPhone = (phone: any): string => {
  return maskSensitiveInfo(phone, 3, 4);
};

/**
 * 隐藏身份证号
 * @param idCard - 身份证号
 * @returns 隐藏后的身份证号
 */
export const maskIdCard = (idCard: any): string => {
  return maskSensitiveInfo(idCard, 6, 4);
};

/**
 * 隐藏邮箱
 * @param email - 邮箱
 * @returns 隐藏后的邮箱
 */
export const maskEmail = (email: any): string => {
  if (typeof email !== 'string' || !email.includes('@')) return email || '';
  
  const [username, domain] = email.split('@');
  if (username.length <= 3) {
    return username.charAt(0) + '***@' + domain;
  }
  return username.slice(0, 3) + '***@' + domain;
};

/**
 * 判断是否为有效的手机号
 * @param phone - 手机号
 * @returns 是否有效
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 判断是否为有效的邮箱
 * @param email - 邮箱
 * @returns 是否有效
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 判断是否为有效的身份证号
 * @param idCard - 身份证号
 * @returns 是否有效
 */
export const isValidIdCard = (idCard: string): boolean => {
  const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
  return idCardRegex.test(idCard);
};

/**
 * 生成随机字符串
 * @param length - 字符串长度
 * @param chars - 字符集
 * @returns 随机字符串
 */
export const generateRandomString = (length: number = 8, chars: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string => {
  let result = '';
  const charsLength = chars.length;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charsLength));
  }
  return result;
};

/**
 * 计算字符串长度（中文算2个字符）
 * @param str - 字符串
 * @returns 字符串长度
 */
export const getStringLength = (str: any): number => {
  if (typeof str !== 'string') return 0;
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    length += (charCode > 0 && charCode < 128) ? 1 : 2;
  }
  return length;
};

/**
 * 替换所有匹配的字符串
 * @param str - 原始字符串
 * @param search - 搜索字符串或正则表达式
 * @param replace - 替换字符串
 * @returns 替换后的字符串
 */
export const replaceAll = (str: any, search: string | RegExp, replace: string): string => {
  if (typeof str !== 'string') return '';
  if (typeof search === 'string') {
    return str.split(search).join(replace);
  }
  return str.replace(new RegExp(search.source, 'g'), replace);
};