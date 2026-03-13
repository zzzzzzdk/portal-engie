import React, { useState } from 'react';
import { Button } from 'antd';
import {
  GroupOutlined,
  FolderOutlined,
  FontSizeOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LinkOutlined,
  SwapOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  SearchOutlined,
  TableOutlined,
  FormOutlined,
  AppstoreOutlined,
  CompassOutlined,
  BlockOutlined,
  RobotOutlined,
  CloseOutlined,
  DownOutlined,
  PictureOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import './index.scss';

interface WidgetItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  // GridStack 拖拽配置
  gsW?: number;
  gsH?: number;
  gsMinW?: number;
  gsMinH?: number;
  // 是否支持拖拽（微应用等需要选择器的组件也支持拖拽，落下后打开选择器）
  draggable?: boolean;
}

interface WidgetCategory {
  title: string;
  items: WidgetItem[];
}

interface WidgetDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
}

// 组件分类数据（包含 GridStack 拖拽配置）
const widgetCategories: WidgetCategory[] = [
  {
    title: '分组组件',
    items: [
      { key: 'create-group', label: '新建分组', icon: <GroupOutlined />, description: '创建新分组', gsW: 6, gsH: 5, gsMinW: 2, gsMinH: 2, draggable: true },
      { key: 'headerBar', label: '导航栏', icon: <FolderOutlined />, description: '页面顶部栏', gsW: 4, gsH: 2, gsMinW: 1, gsMinH: 1, draggable: true },
    ]
  },
  {
    title: '基础小部件',
    items: [
      { key: 'typography', label: '文本', icon: <FontSizeOutlined />, description: '文本/标题展示', gsW: 4, gsH: 3, gsMinW: 2, gsMinH: 1, draggable: true },
      { key: 'clock', label: '时钟', icon: <ClockCircleOutlined />, description: '实时时钟显示', gsW: 4, gsH: 6, gsMinW: 2, gsMinH: 3, draggable: true },
      { key: 'stats', label: '统计卡片', icon: <BarChartOutlined />, description: '数据统计展示', gsW: 10, gsH: 6, gsMinW: 4, gsMinH: 3, draggable: true },
      { key: 'chart', label: '图表', icon: <PieChartOutlined />, description: '可视化图表', gsW: 8, gsH: 9, gsMinW: 4, gsMinH: 4, draggable: true },
      { key: 'carousel', label: '轮播图', icon: <PictureOutlined />, description: '图片轮播展示', gsW: 40, gsH: 12, gsMinW: 4, gsMinH: 3, draggable: true },
      { key: 'link', label: '快捷链接', icon: <LinkOutlined />, description: '快速访问链接', gsW: 5, gsH: 5, gsMinW: 2, gsMinH: 2, draggable: true },
      { key: 'pageNavigator', label: '页面切换组', icon: <SwapOutlined />, description: '控制跳转页面', gsW: 12, gsH: 3, gsMinW: 6, gsMinH: 1, draggable: true },
      { key: 'news', label: '新闻动态', icon: <FileTextOutlined />, description: '新闻资讯列表', gsW: 6, gsH: 10, gsMinW: 4, gsMinH: 4, draggable: true },
      { key: 'topList', label: '排行榜', icon: <OrderedListOutlined />, description: '排名列表展示', gsW: 5, gsH: 9, gsMinW: 3, gsMinH: 4, draggable: true },
      { key: 'search', label: '搜索', icon: <SearchOutlined />, description: '搜索功能', gsW: 8, gsH: 4, gsMinW: 4, gsMinH: 2, draggable: true },
      { key: 'dataTable', label: '数据表格', icon: <TableOutlined />, description: '表格数据展示', gsW: 10, gsH: 8, gsMinW: 6, gsMinH: 4, draggable: true },
      { key: 'customForm', label: '自定义表单', icon: <FormOutlined />, description: '自定义表单', gsW: 8, gsH: 11, gsMinW: 4, gsMinH: 4, draggable: true },
      { key: 'myDocuments', label: '我的文档', icon: <FolderOpenOutlined />, description: '文件管理', gsW: 4, gsH: 3, gsMinW: 1, gsMinH: 1, draggable: true },
    ]
  },
  {
    title: '导航组件',
    items: [
      { key: 'iconNav', label: '图标导航', icon: <CompassOutlined />, description: '图标式导航', gsW: 2, gsH: 3, gsMinW: 1, gsMinH: 1, draggable: true },
      { key: 'navGroup', label: '导航组', icon: <BlockOutlined />, description: '导航项组合', gsW: 10, gsH: 10, gsMinW: 4, gsMinH: 4, draggable: true },
    ]
  },
  {
    title: '微应用小部件',
    items: [
      // 微应用支持拖拽，落下后打开选择器
      { key: 'microApp', label: '微应用', icon: <AppstoreOutlined />, description: '嵌入微应用', gsW: 6, gsH: 5, gsMinW: 2, gsMinH: 2, draggable: true },
    ]
  },
  {
    title: '悬浮模块',
    items: [
      // 悬浮模块支持拖拽，落下后打开选择器或直接添加
      { key: 'floating-microApp', label: '微应用（悬浮）', icon: <RobotOutlined />, description: '悬浮微应用', draggable: true },
      { key: 'floating-assistantHub', label: '助手中心', icon: <RobotOutlined />, description: '智能助手入口', draggable: true },
    ]
  },
];

const WidgetDrawer: React.FC<WidgetDrawerProps> = ({ open, onClose, onSelect }) => {
  const [collapsedMap, setCollapsedMap] = useState(() =>
    Object.fromEntries(widgetCategories.map((category) => [category.title, false]))
  );

  const handleSelect = (key: string) => {
    onSelect(key);
  };

  const handleToggleCategory = (title: string) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [title]: !prev?.[title],
    }));
  };

  if (!open) {
    return null;
  }

  return (
    <div className="widget-drawer">
      <div className="widget-drawer__header">
        <div className="widget-drawer__title">
          <AppstoreOutlined />
          <span>组件库</span>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>
      <div className="widget-drawer-content">
        {widgetCategories.map((category) => (
          <div key={category.title} className="widget-category">
            <button
              type="button"
              className="widget-category__header"
              onClick={() => handleToggleCategory(category.title)}
            >
              <div className="widget-category__left">

                <span className="widget-category__title">{category.title}（{category.items.length}）</span>
              </div>
              <span className="widget-category__count">
                <DownOutlined
                  className={`widget-category__arrow ${collapsedMap[category.title] ? 'is-collapsed' : ''}`}
                /></span>
            </button>
            {!collapsedMap[category.title] && (
              <div className="widget-grid">
                {category.items.map((item) => (
                  <div
                    key={item.key}
                    className={`widget-card ${item.draggable ? 'widget-drag-item' : ''}`}
                    onClick={() => handleSelect(item.key)}
                    data-widget-type={item.key}
                    data-gs-widget={
                      item.draggable
                        ? JSON.stringify({
                          w: item.gsW || 4,
                          h: item.gsH || 4,
                          minW: item.gsMinW || 1,
                          minH: item.gsMinH || 1,
                          id: `sidebar-${item.key}`,
                          content: item.key,
                        })
                        : undefined
                    }
                  >
                    <div className="widget-card-icon">{item.icon}</div>
                    <div className="widget-card-info">
                      <div className="widget-card-label">{item.label}</div>
                      {item.description && <div className="widget-card-desc">{item.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WidgetDrawer;
