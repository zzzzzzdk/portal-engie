// 地图配置文件

// 定义接口
export interface LatLng {
  lat: number;
  lng: number;
}

export interface IconConfig {
  url: string;
  size?: [number, number];
  origin?: [number, number];
  anchor: [number, number];
  scaledSize?: [number, number];
}

export interface ControlPositionConfig {
  ENABLED: boolean;
  POSITION: string;
  STYLE?: string;
}

export interface MapTypeConfig {
  STANDARD: string;
  SATELLITE: string;
  HYBRID: string;
  TERRAIN: string;
}

export interface ControlsConfig {
  ZOOM: ControlPositionConfig;
  MAP_TYPE: ControlPositionConfig;
  SCALE: ControlPositionConfig;
  PANORAMA: ControlPositionConfig;
  LOCATION: ControlPositionConfig;
}

export interface AnimationConfig {
  PAN_DURATION: number;
  ZOOM_DURATION: number;
  ENABLED: boolean;
}

export interface MarkerAnimationConfig {
  BOUNCE: string;
  DROP: string;
  NONE: string;
}

export interface MarkerConfig {
  DEFAULT_ICON: IconConfig;
  SELECTED_ICON: IconConfig;
  ANIMATION: MarkerAnimationConfig;
  DEFAULT_ANIMATION: string;
}

export interface InfoWindowConfig {
  DRAGGABLE: boolean;
  AUTO_OPEN: boolean;
  MAX_WIDTH: number;
  PIXEL_OFFSET: [number, number];
}

export interface PolygonConfig {
  FILL_COLOR: string;
  STROKE_COLOR: string;
  STROKE_WIDTH: number;
  CLICKABLE: boolean;
  EDITABLE: boolean;
  DRAGGABLE: boolean;
}

export interface PolylineConfig {
  STROKE_COLOR: string;
  STROKE_WIDTH: number;
  STROKE_LINE_CAP: string;
  STROKE_LINE_JOIN: string;
  CLICKABLE: boolean;
  EDITABLE: boolean;
  DRAGGABLE: boolean;
}

export interface HeatmapGradient {
  [key: string]: string;
}

export interface HeatmapConfig {
  RADIUS: number;
  OPACITY: number;
  MAX_INTENSITY: number;
  GRADIENT: HeatmapGradient;
}

export interface LayerConfig {
  ENABLED: boolean;
}

export interface LayersConfig {
  TRAFFIC: LayerConfig;
  SATELLITE: LayerConfig;
  ROAD_NETWORK: LayerConfig;
  BUILDINGS: LayerConfig;
}

export interface EventsConfig {
  ENABLED: string[];
}

export interface GeolocationConfig {
  HIGH_ACCURACY: boolean;
  TIMEOUT: number;
  MAX_AGE: number;
  DEFAULT_LOCATION: LatLng;
}

export interface SearchConfig {
  AUTOCOMPLETE: boolean;
  RADIUS: number;
  MAX_RESULTS: number;
}

export interface BoundsConfig {
  SW: LatLng;
  NE: LatLng;
}

export interface RestrictionsConfig {
  ENABLE_BOUNDS: boolean;
  BOUNDS: BoundsConfig;
  REGION: string;
}

export interface StyleConfig {
  featureType: string;
  elementType: string;
  stylers: { [key: string]: any }[];
}

export interface StylesConfig {
  STANDARD: StyleConfig[];
  DARK: StyleConfig[];
  LIGHT: StyleConfig[];
}

export interface CategoryIcons {
  [key: string]: IconConfig;
}

export interface CustomIconsConfig {
  DEVICE: CategoryIcons;
  EVENT: CategoryIcons;
}

export interface LoadingConfig {
  TIMEOUT: number;
  RETRY_COUNT: number;
  RETRY_INTERVAL: number;
}

export interface MapConfigType {
  DEFAULT_CENTER: LatLng;
  DEFAULT_ZOOM: number;
  MAX_ZOOM: number;
  MIN_ZOOM: number;
  MAP_TYPES: MapTypeConfig;
  DEFAULT_MAP_TYPE: string;
  CONTROLS: ControlsConfig;
  ANIMATION: AnimationConfig;
  MARKER: MarkerConfig;
  INFO_WINDOW: InfoWindowConfig;
  POLYGON: PolygonConfig;
  POLYLINE: PolylineConfig;
  HEATMAP: HeatmapConfig;
  LAYERS: LayersConfig;
  EVENTS: EventsConfig;
  GEOLOCATION: GeolocationConfig;
  SEARCH: SearchConfig;
  RESTRICTIONS: RestrictionsConfig;
  STYLES: StylesConfig;
  CUSTOM_ICONS: CustomIconsConfig;
  LOADING: LoadingConfig;
}

export interface MapConfigExtended extends MapConfigType {
  getApiKey: () => string;
  getStyle: (styleType?: string) => StyleConfig[];
  getCustomIcon: (category: string, type: string) => IconConfig;
  calculateDistance: (point1: LatLng, point2: LatLng) => number;
  isPointInPolygon: (point: LatLng, polygon: LatLng[]) => boolean;
}

/**
 * 地图配置常量
 */
const MAP_CONFIG: MapConfigType = {
  // 默认地图中心点坐标
  DEFAULT_CENTER: {
    lat: 39.9042,
    lng: 116.4074
  },
  
  // 默认地图缩放级别
  DEFAULT_ZOOM: 10,
  
  // 最大缩放级别
  MAX_ZOOM: 18,
  
  // 最小缩放级别
  MIN_ZOOM: 3,
  
  // 地图类型
  MAP_TYPES: {
    STANDARD: 'standard',
    SATELLITE: 'satellite',
    HYBRID: 'hybrid',
    TERRAIN: 'terrain'
  },
  
  // 默认地图类型
  DEFAULT_MAP_TYPE: 'standard',
  
  // 地图控件配置
  CONTROLS: {
    // 缩放控件
    ZOOM: {
      ENABLED: true,
      POSITION: 'bottom_right',
      STYLE: 'large'
    },
    
    // 地图类型控件
    MAP_TYPE: {
      ENABLED: true,
      POSITION: 'top_right'
    },
    
    // 比例尺控件
    SCALE: {
      ENABLED: true,
      POSITION: 'bottom_left'
    },
    
    // 全景控件
    PANORAMA: {
      ENABLED: false,
      POSITION: 'top_left'
    },
    
    // 定位控件
    LOCATION: {
      ENABLED: true,
      POSITION: 'top_right'
    }
  },
  
  // 地图动画配置
  ANIMATION: {
    // 平移动画持续时间（毫秒）
    PAN_DURATION: 500,
    
    // 缩放动画持续时间（毫秒）
    ZOOM_DURATION: 500,
    
    // 是否启用动画
    ENABLED: true
  },
  
  // 标记点配置
  MARKER: {
    // 默认图标配置
    DEFAULT_ICON: {
      url: '/assets/images/markers/default-marker.png',
      size: [32, 40],
      origin: [0, 0],
      anchor: [16, 40],
      scaledSize: [32, 40]
    },
    
    // 选中图标配置
    SELECTED_ICON: {
      url: '/assets/images/markers/selected-marker.png',
      size: [32, 40],
      origin: [0, 0],
      anchor: [16, 40],
      scaledSize: [32, 40]
    },
    
    // 动画配置
    ANIMATION: {
      BOUNCE: 'bounce',
      DROP: 'drop',
      NONE: 'none'
    },
    
    // 默认动画
    DEFAULT_ANIMATION: 'none'
  },
  
  // 信息窗口配置
  INFO_WINDOW: {
    // 是否可拖动
    DRAGGABLE: false,
    
    // 是否自动打开
    AUTO_OPEN: true,
    
    // 最大宽度
    MAX_WIDTH: 300,
    
    // 像素偏移
    PIXEL_OFFSET: [0, -40]
  },
  
  // 多边形配置
  POLYGON: {
    // 默认填充颜色
    FILL_COLOR: 'rgba(0, 150, 136, 0.3)',
    
    // 默认边框颜色
    STROKE_COLOR: 'rgba(0, 150, 136, 0.8)',
    
    // 默认边框宽度
    STROKE_WIDTH: 2,
    
    // 默认点击事件启用
    CLICKABLE: true,
    
    // 是否可编辑
    EDITABLE: false,
    
    // 是否可拖动
    DRAGGABLE: false
  },
  
  // 折线配置
  POLYLINE: {
    // 默认颜色
    STROKE_COLOR: 'rgba(0, 122, 255, 0.8)',
    
    // 默认宽度
    STROKE_WIDTH: 3,
    
    // 默认线帽样式
    STROKE_LINE_CAP: 'round',
    
    // 默认线段连接样式
    STROKE_LINE_JOIN: 'round',
    
    // 默认点击事件启用
    CLICKABLE: true,
    
    // 是否可编辑
    EDITABLE: false,
    
    // 是否可拖动
    DRAGGABLE: false
  },
  
  // 热力图配置
  HEATMAP: {
    // 默认半径
    RADIUS: 20,
    
    // 默认不透明度
    OPACITY: 0.6,
    
    // 默认最大强度
    MAX_INTENSITY: 10,
    
    // 默认梯度颜色
    GRADIENT: {
      0.4: 'blue',
      0.6: 'cyan',
      0.7: 'lime',
      0.8: 'yellow',
      1.0: 'red'
    }
  },
  
  // 图层配置
  LAYERS: {
    // 是否启用交通图层
    TRAFFIC: {
      ENABLED: false
    },
    
    // 是否启用卫星图层
    SATELLITE: {
      ENABLED: false
    },
    
    // 是否启用路网图层
    ROAD_NETWORK: {
      ENABLED: true
    },
    
    // 是否启用建筑物图层
    BUILDINGS: {
      ENABLED: true
    }
  },
  
  // 地图事件配置
  EVENTS: {
    // 启用的事件列表
    ENABLED: [
      'click',
      'dblclick',
      'drag',
      'dragend',
      'dragstart',
      'idle',
      'mousemove',
      'mouseout',
      'mouseover',
      'resize',
      'rightclick',
      'zoom_changed'
    ]
  },
  
  // 定位配置
  GEOLOCATION: {
    // 是否启用高精度
    HIGH_ACCURACY: true,
    
    // 超时时间（毫秒）
    TIMEOUT: 10000,
    
    // 最大年龄（毫秒）
    MAX_AGE: 0,
    
    // 定位失败时的默认坐标
    DEFAULT_LOCATION: {
      lat: 39.9042,
      lng: 116.4074
    }
  },
  
  // 搜索配置
  SEARCH: {
    // 自动完成启用
    AUTOCOMPLETE: true,
    
    // 搜索半径（米）
    RADIUS: 50000,
    
    // 最多返回结果数
    MAX_RESULTS: 10
  },
  
  // 地图限制配置
  RESTRICTIONS: {
    // 是否启用边界限制
    ENABLE_BOUNDS: false,
    
    // 边界坐标（西南和东北）
    BOUNDS: {
      SW: { lat: 18.16, lng: 73.85 },
      NE: { lat: 53.55, lng: 135.08 }
    },
    
    // 是否限制国家/地区
    REGION: 'CN'
  },
  
  // 地图样式配置
  STYLES: {
    // 标准样式
    STANDARD: [],
    
    // 深色样式
    DARK: [
      { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
      { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
      { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
      { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#38414e' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
      { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#746855' }] },
      { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
      { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
      { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
      { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }
    ],
    
    // 浅色样式
    LIGHT: []
  },
  
  // 自定义标记点图标集合
  CUSTOM_ICONS: {
    // 设备状态相关图标
    DEVICE: {
      NORMAL: {
        url: '/assets/images/markers/device-normal.png',
        size: [32, 32],
        anchor: [16, 32]
      },
      ALERT: {
        url: '/assets/images/markers/device-alert.png',
        size: [32, 32],
        anchor: [16, 32]
      },
      OFFLINE: {
        url: '/assets/images/markers/device-offline.png',
        size: [32, 32],
        anchor: [16, 32]
      },
      MAINTENANCE: {
        url: '/assets/images/markers/device-maintenance.png',
        size: [32, 32],
        anchor: [16, 32]
      }
    },
    
    // 事件类型相关图标
    EVENT: {
      WARNING: {
        url: '/assets/images/markers/event-warning.png',
        size: [24, 24],
        anchor: [12, 24]
      },
      ERROR: {
        url: '/assets/images/markers/event-error.png',
        size: [24, 24],
        anchor: [12, 24]
      },
      INFO: {
        url: '/assets/images/markers/event-info.png',
        size: [24, 24],
        anchor: [12, 24]
      },
      SUCCESS: {
        url: '/assets/images/markers/event-success.png',
        size: [24, 24],
        anchor: [12, 24]
      }
    }
  },
  
  // 地图加载超时配置
  LOADING: {
    // 超时时间（毫秒）
    TIMEOUT: 15000,
    
    // 重试次数
    RETRY_COUNT: 3,
    
    // 重试间隔（毫秒）
    RETRY_INTERVAL: 3000
  }
};

/**
 * 根据环境变量获取地图密钥
 */
const getMapApiKey = (): string => {
  // 使用全局window对象的环境变量，避免依赖Node.js类型
  const globalEnv = (window as any).ENV || {};
  const nodeEnv = globalEnv.NODE_ENV;
  
  switch (nodeEnv) {
    case 'production':
      return globalEnv.MAP_API_KEY_PROD || '';
    case 'test':
      return globalEnv.MAP_API_KEY_TEST || '';
    default:
      return globalEnv.MAP_API_KEY_DEV || '';
  }
};

/**
 * 获取地图样式
 */
const getMapStyle = (styleType: string = 'standard'): StyleConfig[] => {
  return MAP_CONFIG.STYLES[styleType.toUpperCase() as keyof StylesConfig] || [];
};

/**
 * 获取自定义标记图标
 */
const getCustomMarkerIcon = (category: string, type: string): IconConfig => {
  return MAP_CONFIG.CUSTOM_ICONS[category as keyof CustomIconsConfig]?.[type] || MAP_CONFIG.MARKER.DEFAULT_ICON;
};

/**
 * 计算两点之间的距离（米）
 */
const calculateDistance = (point1: LatLng, point2: LatLng): number => {
  const R = 6371e3; // 地球半径（米）
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * 判断点是否在多边形内部
 */
const isPointInPolygon = (point: LatLng, polygon: LatLng[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    const intersect = 
      ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * 导出地图配置
 */
const mapConfig: MapConfigExtended = {
  // 基础配置
  ...MAP_CONFIG,
  
  // 方法
  getApiKey: getMapApiKey,
  getStyle: getMapStyle,
  getCustomIcon: getCustomMarkerIcon,
  calculateDistance,
  isPointInPolygon
};

export default mapConfig;