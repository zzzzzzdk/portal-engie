import React, { useState } from 'react'
import { Button } from 'antd'
import {
  AppstoreOutlined,
  BarChartOutlined,
  BlockOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CompassOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  FontSizeOutlined,
  FormOutlined,
  GroupOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  PieChartOutlined,
  RobotOutlined,
  SearchOutlined,
  SwapOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { CHART_PRESET_LIST } from '@/components/widgets/chart/presets'
import './index.scss'

interface WidgetItem {
  key: string
  label: string
  icon?: React.ReactNode
  description?: string
  gsW?: number
  gsH?: number
  gsMinW?: number
  gsMinH?: number
  draggable?: boolean
}

interface WidgetCategory {
  title: string
  items: WidgetItem[]
}

interface WidgetDrawerProps {
  open: boolean
  onClose: () => void
  onSelect: (key: string) => void
}

const getChartPresetIcon = (category: string) => {
  switch (category) {
    case '趋势':
    case '柱状':
    case '仪表':
      return <BarChartOutlined />
    case '分布':
      return <PieChartOutlined />
    case '地图':
      return <CompassOutlined />
    case '关系':
      return <SwapOutlined />
    case '双轴':
      return <OrderedListOutlined />
    default:
      return <PieChartOutlined />
  }
}

const chartWidgetItems: WidgetItem[] = CHART_PRESET_LIST.map(preset => ({
  key: `chart:${preset.key}`,
  label: preset.title,
  icon: getChartPresetIcon(preset.drawerCategory),
  description: preset.description,
  gsW: preset.defaultLayout?.w || 8,
  gsH: preset.defaultLayout?.h || 9,
  gsMinW: preset.defaultLayout?.minW || 4,
  gsMinH: preset.defaultLayout?.minH || 4,
  draggable: true,
}))

const widgetCategories: WidgetCategory[] = [
  {
    title: '分组组件',
    items: [
      { key: 'create-group', label: '新建分组', icon: <GroupOutlined />, description: '创建新的分组容器', gsW: 6, gsH: 5, gsMinW: 2, gsMinH: 2, draggable: true },
      { key: 'headerBar', label: '导航栏', icon: <FolderOutlined />, description: '页面顶部导航栏', gsW: 4, gsH: 2, gsMinW: 1, gsMinH: 1, draggable: true },
    ],
  },
  {
    title: '基础组件',
    items: [
      { key: 'typography', label: '文本', icon: <FontSizeOutlined />, description: '文本或标题展示', gsW: 4, gsH: 3, gsMinW: 2, gsMinH: 1, draggable: true },
      { key: 'richText', label: '富文本', icon: <FileTextOutlined />, description: '富文本内容编辑与展示', gsW: 8, gsH: 6, gsMinW: 4, gsMinH: 3, draggable: true },
      { key: 'clock', label: '时钟', icon: <ClockCircleOutlined />, description: '实时日期时间', gsW: 4, gsH: 6, gsMinW: 2, gsMinH: 3, draggable: true },
      { key: 'stats', label: '统计卡片', icon: <BarChartOutlined />, description: '多指标统计展示', gsW: 10, gsH: 6, gsMinW: 4, gsMinH: 3, draggable: true },
      { key: 'indicatorCard', label: '指标卡', icon: <BarChartOutlined />, description: '单个指标值与描述展示', gsW: 8, gsH: 5, gsMinW: 2, gsMinH: 2, draggable: true },
      { key: 'carousel', label: '轮播图', icon: <PictureOutlined />, description: '轮播展示内容', gsW: 40, gsH: 12, gsMinW: 4, gsMinH: 3, draggable: true },
      { key: 'link', label: '快捷链接', icon: <LinkOutlined />, description: '快捷入口列表', gsW: 5, gsH: 5, gsMinW: 2, gsMinH: 2, draggable: true },
      { key: 'pageNavigator', label: '页面切换器', icon: <SwapOutlined />, description: '控制页面跳转', gsW: 12, gsH: 3, gsMinW: 6, gsMinH: 1, draggable: true },
      { key: 'news', label: '新闻动态', icon: <FileTextOutlined />, description: '新闻资讯列表', gsW: 6, gsH: 10, gsMinW: 4, gsMinH: 4, draggable: true },
      { key: 'topList', label: '排行榜', icon: <OrderedListOutlined />, description: '排行列表展示', gsW: 5, gsH: 9, gsMinW: 3, gsMinH: 4, draggable: true },
      { key: 'search', label: '搜索', icon: <SearchOutlined />, description: '搜索条件提交', gsW: 8, gsH: 4, gsMinW: 4, gsMinH: 2, draggable: true },
      { key: 'queryFilter', label: '查询筛选', icon: <SearchOutlined />, description: '多条件筛选查询', gsW: 12, gsH: 5, gsMinW: 6, gsMinH: 3, draggable: true },
      { key: 'dataTable', label: '数据表格', icon: <TableOutlined />, description: '表格数据展示', gsW: 10, gsH: 8, gsMinW: 6, gsMinH: 4, draggable: true },
      { key: 'customForm', label: '自定义表单', icon: <FormOutlined />, description: '自定义表单录入', gsW: 8, gsH: 11, gsMinW: 4, gsMinH: 4, draggable: true },
      { key: 'myDocuments', label: '我的文档', icon: <FolderOpenOutlined />, description: '文档管理入口', gsW: 4, gsH: 3, gsMinW: 1, gsMinH: 1, draggable: true },
    ],
  },
  {
    title: '图表组件',
    items: chartWidgetItems,
  },
  {
    title: '导航组件',
    items: [
      { key: 'iconNav', label: '图标导航', icon: <CompassOutlined />, description: '图标式导航卡片', gsW: 2, gsH: 3, gsMinW: 1, gsMinH: 1, draggable: true },
      { key: 'navGroup', label: '导航组', icon: <BlockOutlined />, description: '导航分组集合', gsW: 10, gsH: 10, gsMinW: 4, gsMinH: 4, draggable: true },
    ],
  },
  {
    title: '微应用组件',
    items: [
      { key: 'microApp', label: '微应用', icon: <AppstoreOutlined />, description: '嵌入微应用模块', gsW: 6, gsH: 5, gsMinW: 2, gsMinH: 2, draggable: true },
    ],
  },
  {
    title: '悬浮模块',
    items: [
      { key: 'floating-microApp', label: '微应用（悬浮）', icon: <RobotOutlined />, description: '悬浮微应用模块', draggable: true },
      { key: 'floating-assistantHub', label: '助手中心', icon: <RobotOutlined />, description: '智能助手入口', draggable: true },
    ],
  },
]

const WidgetDrawer: React.FC<WidgetDrawerProps> = ({ open, onClose, onSelect }) => {
  const [collapsedMap, setCollapsedMap] = useState(() =>
    Object.fromEntries(widgetCategories.map(category => [category.title, false])),
  )

  const handleToggleCategory = (title: string) => {
    setCollapsedMap(prev => ({
      ...prev,
      [title]: !prev?.[title],
    }))
  }

  if (!open) {
    return null
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
        {widgetCategories.map(category => (
          <div key={category.title} className="widget-category">
            <button
              type="button"
              className="widget-category__header"
              onClick={() => handleToggleCategory(category.title)}
            >
              <div className="widget-category__left">
                <span className="widget-category__title">
                  {category.title}（{category.items.length}）
                </span>
              </div>
              <span className="widget-category__count">
                <DownOutlined
                  className={`widget-category__arrow ${collapsedMap[category.title] ? 'is-collapsed' : ''}`}
                />
              </span>
            </button>
            {!collapsedMap[category.title] && (
              <div className="widget-grid">
                {category.items.map(item => (
                  <div
                    key={item.key}
                    className={`widget-card ${item.draggable ? 'widget-drag-item' : ''}`}
                    onClick={() => onSelect(item.key)}
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
                      {item.description ? <div className="widget-card-desc">{item.description}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default WidgetDrawer
