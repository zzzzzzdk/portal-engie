/**
 * AssistantHub (助手中心) 类型定义
 */

/** 入口项 - 系统下的功能入口 */
export interface AssistantEntry {
  id: string;
  name: string;
  icon?: string;              // Ant Design 图标名称
  description?: string;       // 入口描述
  // 该入口对应的微应用配置
  microApp: {
    systemId?: string;
    moduleId?: string;
    url: string;              // 微应用 URL
    entry: string;            // 微应用入口
    props?: Record<string, any>;  // 传递给微应用的参数
  };
}

/** 系统分类 */
export interface AssistantSystem {
  id: string;
  name: string;
  icon?: string;              // 系统图标 (Ant Design 图标名称)
  entries: AssistantEntry[];  // 入口列表
  expanded?: boolean;         // 默认是否展开
}

/** AssistantHub 组件 Props */
export interface AssistantHubProps {
  systems: AssistantSystem[];   // 静态配置的系统数据
  collapsedIcon?: string;       // 收起时的图标（Ant Design 图标名称）
  title?: string;               // 悬浮窗标题
  onEntrySelect?: (entry: AssistantEntry) => void;  // 入口选择回调
}
