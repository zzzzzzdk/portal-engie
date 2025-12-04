import { getToken, getRToken, setToken, setRToken, setID, getID, removeToken } from './cookie'
import { encryptData, rsaUtil, aesUtil } from './encryption'
import { getPageDestroy, setPageDestroy } from './axios.config'
// import TileColorLayer from '@yisa/TileColorLayer'
// @ts-ignore - leaflet types not installed
import L from 'leaflet'


export function isObject(params: any) {
  return Object.prototype.toString.call(params) === '[object Object]'
}

export function isArray(params: any) {
  return Object.prototype.toString.call(params) === '[object Array]'
}

export function isFunction(params: any) {
  return Object.prototype.toString.call(params) === '[object Function]'
}

export function isNumber(params: any) {
  return Object.prototype.toString.call(params) === '[object Number]'
}

export const isUndefined = (params: any): params is undefined => params === undefined

// 文件大小转换
export function toSizeText(size: number) {
  let num = 0
  let unit = ''
  if (size < 1000) {
    num = size
    unit = 'B'
  } else if (size / 1024 < 1000) {
    num = size / 1024
    unit = 'KB'
  } else if (size / 1024 / 1024 < 1000) {
    num = size / 1024 / 1024
    unit = 'MB'
  } else {
    num = size / 1024 / 1024 / 1024
    unit = 'GB'
  }
  num = Math.floor(num * 100) / 100
  return `${num}${unit}`
}

// Removed unused function getLocalSurplus()

export function getQueryString(h: string, name: string) {
  const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
  const r = h.substr(1).match(reg);
  if (r != null) return decodeURIComponent(r[2]);
  return null;
}

// 获取地址栏搜索参数 search 格式，如： ?deal_status=2
export function getParams(search: string) {
  const result: {
    [key: string]: string
  } = {}
  const params = new URLSearchParams(search)
  if (params) {
    for (const [key, value] of params) {
      // result[key] = decodeURIComponent(value)
      result[key] = value
      // console.log(key, decodeURIComponent(value))
    }
  }
  return result
}

// 生成一个唯一随机数
export function createRandom() {
  return new Date().getTime() + '_' + (Math.random() * 10000) + '_' + (Math.random() * 10000)
}

// 输入框输入整数处理
export function integerHandle(value: string) {
  if (isNaN(parseInt(value))) {
    return ''
  } else {
    return parseInt(value)
  }
}

// input输入框的字符禁用
export function handleKeyPress(event: any) {
  const forbiddenCharacters = ['-', '+', '.', 'e', 'E']
  if (forbiddenCharacters.indexOf(event.key) !== -1) {
    event.preventDefault()
  }
}

// 开启前进后退事件
export function mouseTools(min: number) {

  let x = 0
  let tag = false
  let move = false

  window.addEventListener('mousedown', function (e: any) {
    e = window.event || e
    if (e.which == 3) {
      x = e.pageX
      tag = true
    }
  })


  window.addEventListener('contextmenu', function (e: any) {
    if (move) {
      e = window.event || e
      move = false
      e.preventDefault()
      return false;
    }
  })

  window.addEventListener('mouseup', function (e: any) {
    e = window.event || e
    if (e.which == 3 && tag) {
      tag = false
      const movex = e.pageX - x
      if (Math.abs(movex) > min) {
        move = true
        if (movex > 0) {
          window.history.go(1)
        } else {
          window.history.back()
        }
      }
    }
  })
}

export function getMapProps(domId: string) {
  const {
    center,
    zoom,
    zooms = [],
    mapTileTemplate,
    mapTileOptions,
    mapTileHost,
    mapCRS,
    mapTileType
  } = window.YISACONF?.map || {}
  let thisCRS: any = L.CRS

  const DMCRS = new L.Proj.CRS('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs', {
    resolutions: [
      1.40625,
      0.703125,
      0.3515625,
      0.17578125,
      0.087890625,
      0.0439453125,
      0.02197265625,
      0.010986328125,
      0.0054931640625,
      0.00274658203125,
      0.001373291015625,
      0.0006866455078125,
      0.00034332275390625,
      0.000171661376953125,
      0.0000858306884765625,
      0.00004291534423828125,
      0.000021457672119140625,
      // eslint-disable-next-line no-loss-of-precision
      0.000010728836059570312,
      0.000005364418029785156,
      0.000002682209014892578,
      0.000001341104507446289,
      6.705522537231445e-7,
      3.3527612686157227e-7
    ],
    origin: [-180, 90]
  })


  if (mapTileType === 'dingmai') {
    thisCRS = DMCRS
  } else {
    thisCRS = mapCRS ? (L.CRS as any)[`EPSG${mapCRS}`] : L.CRS.EPSG3857
  }


  const mapProps = {
    domId,
    mapOptions: {
      center: center && isArray(center) ? [...center].reverse() : [],
      zoom: zoom,
      crs: thisCRS
    },
    showScale: true
  }

  const tileLayerProps = {
    tileUrlTemplate: mapTileTemplate,
    tileLayerOptions: {
      ...(isObject(mapTileOptions) ? mapTileOptions : {
        maxZoom: zooms[1],
        minZoom: zooms[0],
        mapTileHost: mapTileHost
      })
    }
  }

  // const tilecolorLayer = useMemo(() => {
  //   return <TileColorLayer { ...tileLayerProps } />
  // }, [tileLayerProps])

  return {
    mapProps,
    tileLayerProps
  }
}

// 数组扁平化
export function flatten(arr: any[]): any[] {
  return arr.reduce((result, item) => {
    return result.concat(item, (Array.isArray(item.children) ? flatten(item.children) : []))
  }, [])
}

// Removed unused function validatePlate()

// Removed unused function jumpRecordVehicle()

// 各种正则表达式
const regular = {
  zh: /[\u4e00-\u9fa5]/g, // 匹配到中文
  zhBlank: /[\u4e00-\u9fa5]|\s/g, // 匹配到中文+空格,
  ip: /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/,//ip地址
  port: /^([0-9]|[1-9]\d{1,3}|[1-5]\d{4}|6[0-5]{2}[0-3][0-5])$/,
  ipPort: /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])(:([0-9]|[1-9]\d{1,3}|[1-5]\d{4}|6[0-5]{2}[0-3][0-5])){0,1}$/, // iP/ip+端口
  isNum: /^[0-9]*$/,
  isPhone: /^(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}$/, //手机号
  isIdcard: /^[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|10|11|12)(?:0[1-9]|[1-2]\d|30|31)\d{3}[\dXx]$/,//精确证件号
  isPassport: /^([a-zA-z]|[0-9]){5,17}$/
}



// Removed unused function formatTimeComponentToForm()

/**
 * 数字格式格式化  亿、万
 * @param num
 * @param decimal
 * @returns
 */
export function numberFormat(num: number, decimal = 2) {
  if (!num) {
    return "0"
  }
  let str = JSON.stringify(num);
  const len = str.length;
  if (len > 8) {
    const str1 = str.substring(0, len - 8);
    const str2 = str.substring(str1.length, str1.length + decimal);
    str = str1 + "." + str2 + "亿";
  } else if (len > 4 && len <= 8) {
    const str1 = str.substring(0, len - 4);
    const str2 = str.substring(str1.length, str1.length + decimal);
    str = str1 + "." + str2 + '万';
  }
  return str;
}

/**
 * 对象数组按照对象某一个键名分组
 *
 */
export function groupByKey(target: { [key: string]: any }[], key: string) {
  const result: any = {}
  for (let index = 0; index < target.length; index++) {
    const element = target[index];
    if (Object.prototype.toString.call(element) !== "[object Object]") continue;
    if (element[key] !== undefined) {
      if (element[key] in result) {
        result[element[key]].push(element)
      } else {
        result[element[key]] = [element]
      }
    }
  }
  return result
}

/**
 * 判断当前环境是否为生产环境
 * @returns 是否为生产环境
 */
export function isProduction() {
  return import.meta.env.MODE === 'production'
}

export {
  getPageDestroy, setPageDestroy,
  getToken, getRToken, setToken, setRToken, setID, getID, removeToken,
  encryptData, rsaUtil, aesUtil,
  regular
}
