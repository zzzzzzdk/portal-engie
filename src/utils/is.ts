const typeString = Object.prototype.toString

export const isArray = (obj: any): obj is any[] => typeString.call(obj) === '[object Array]'
export const isObject = (obj: any): obj is {[key: string]: any} => typeString.call(obj) === '[object Object]'
export const isEmptyObject = (obj: any): boolean => isObject(obj) && Object.keys(obj).length === 0
export const isString = (obj: any): obj is string => typeString.call(obj) === '[object String]'
export const isNumber = (obj: any): obj is number => typeString.call(obj) === '[object Number]'
export const isFile = (obj: any): obj is File => typeString.call(obj) === '[object File]'
export const isBlob = (obj: any): obj is Blob => typeString.call(obj) === '[object Blob]'
export const isRegExp = (obj: any) => typeString.call(obj) === '[object RegExp]'
export const isUndefined = (obj: any): obj is undefined => obj === undefined
export function isFunction (obj: any): obj is (...args: any[]) => any {
  return typeof obj === 'function'
}