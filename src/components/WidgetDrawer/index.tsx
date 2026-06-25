import React, { useEffect, useMemo, useState } from 'react'
import {
  AppstoreOutlined,
  BlockOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CompassOutlined,
  DeleteOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  FontSizeOutlined,
  FormOutlined,
  GroupOutlined,
  IdcardOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PlusOutlined,
  RobotOutlined,
  SaveOutlined,
  SearchOutlined,
  SwapOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { App, Button, Empty, Input, Modal, Popconfirm, Tabs } from 'antd'
import Icon from '@/components/Icon'
import { CHART_PRESET_LIST } from '@/components/widgets/chart/presets'
import NativeFormMaterialTab from '@/native-form/designer/components/native-form-material-tab'
import type { LocalTemplateCategory, LocalTemplateRecord } from '@/types/local-component-library'
import {
  createLocalTemplateDragContent,
  createLocalTemplateKey,
} from '@/utils/local-component-library'
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
  onSelectNativeFormField?: (fieldType: string) => void
  activeNativeFormWidgetId?: string | null
  localCategories?: LocalTemplateCategory[]
  localTemplates?: LocalTemplateRecord[]
  onCreateLocalCategory?: (name: string) => Promise<void> | void
  onDeleteLocalCategory?: (categoryId: string) => Promise<void> | void
  onDeleteLocalTemplate?: (templateId: string) => Promise<void> | void
}

const CHART_PRESET_ICON_MAP: Record<string, string> = {
  'basic-line': 'line_jichuzhexiantu',
  'basic-bar': 'line_jichuzhuzhuangtu',
  'stacked-bar': 'line_duidiezhuzhuangtu',
  'percent-bar': 'line_baifenbizhuzhuangtu',
  'grouped-bar': 'line_fenzuzhuzhuangtu',
  'basic-horizontal-bar': 'line_jichutiaoxingtu',
  'stacked-horizontal-bar': 'line_duidietiaoxingtu',
  'progress-bar': 'line_jindutiao',
  gauge: 'line_yibiaopan',
  pie: 'line_bingtu',
  donut: 'line_huanxingtu',
  radar: 'line_leidatu',
  'area-map': 'line_quyuditu',
  'flow-map': 'line_liuxiangditu',
  funnel: 'line_loudoutu',
  scatter: 'line_sandiantu',
  'dual-axis': 'line_zhuxianzuhetu',
  'grouped-dual-axis': 'line_fenzuzhuxianzuhetu',
}

const renderPortalIcon = (type: string) => <Icon type={type} />

const getChartPresetIcon = (presetKey: string) => {
  const iconType = CHART_PRESET_ICON_MAP[presetKey] || 'line_jichuzhexiantu'
  return renderPortalIcon(iconType)
}

const chartWidgetItems: WidgetItem[] = CHART_PRESET_LIST.map((preset) => ({
  key: `chart:${preset.key}`,
  label: preset.title,
  icon: getChartPresetIcon(preset.key),
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
      {
        key: 'create-group',
        label: '新建分组',
        icon: <GroupOutlined />,
        description: '创建新的分组容器',
        gsW: 6,
        gsH: 5,
        gsMinW: 2,
        gsMinH: 2,
        draggable: true,
      },
      {
        key: 'headerBar',
        label: '导航栏',
        icon: <FolderOutlined />,
        description: '页面顶部导航栏',
        gsW: 4,
        gsH: 2,
        gsMinW: 1,
        gsMinH: 1,
        draggable: true,
      },
    ],
  },
  {
    title: '基础组件',
    items: [
      { key: 'typography', label: '文本', icon: <FontSizeOutlined />, description: '文本或标题展示', gsW: 4, gsH: 3, gsMinW: 2, gsMinH: 1, draggable: true },
      { key: 'richText', label: '富文本', icon: <FileTextOutlined />, description: '富文本内容编辑与展示', gsW: 8, gsH: 6, gsMinW: 4, gsMinH: 3, draggable: true },
      { key: 'clock', label: '时钟', icon: <ClockCircleOutlined />, description: '实时时间展示', gsW: 4, gsH: 6, gsMinW: 2, gsMinH: 3, draggable: true },
      { key: 'stats', label: '统计卡片', icon: renderPortalIcon('line_yibiaopan'), description: '多指标统计展示', gsW: 10, gsH: 6, gsMinW: 4, gsMinH: 3, draggable: true },
      { key: 'indicatorCard', label: '指标卡片', icon: renderPortalIcon('line_zhibiaoka'), description: '单个指标值与描述展示', gsW: 8, gsH: 5, gsMinW: 2, gsMinH: 2, draggable: true },
      { key: 'indicatorCardList', label: '指标列表卡片', icon: renderPortalIcon('line_zhibiaoka'), description: '支持数组数据的指标列表展示', gsW: 10, gsH: 6, gsMinW: 4, gsMinH: 3, draggable: true },
      { key: 'recognitionCard', label: '识别卡片', icon: <IdcardOutlined />, description: '单条识别结果信息卡片', gsW: 6, gsH: 10, gsMinW: 4, gsMinH: 7, draggable: true },
      { key: 'carousel', label: '轮播图', icon: renderPortalIcon('line_tupianlunbo'), description: '轮播展示内容', gsW: 40, gsH: 12, gsMinW: 4, gsMinH: 3, draggable: true },
      { key: 'link', label: '快捷链接', icon: <LinkOutlined />, description: '快捷入口列表', gsW: 5, gsH: 5, gsMinW: 2, gsMinH: 2, draggable: true },
      { key: 'pageNavigator', label: '页面切换器', icon: <SwapOutlined />, description: '控制页面跳转', gsW: 12, gsH: 3, gsMinW: 6, gsMinH: 1, draggable: true },
      { key: 'news', label: '新闻动态', icon: <FileTextOutlined />, description: '新闻资讯列表', gsW: 6, gsH: 10, gsMinW: 4, gsMinH: 4, draggable: true },
      { key: 'topList', label: '排行榜', icon: <OrderedListOutlined />, description: '排行列表展示', gsW: 5, gsH: 9, gsMinW: 3, gsMinH: 4, draggable: true },
      { key: 'search', label: '搜索', icon: <SearchOutlined />, description: '搜索条件提交', gsW: 8, gsH: 4, gsMinW: 4, gsMinH: 2, draggable: true },
      { key: 'queryFilter', label: '查询筛选', icon: <SearchOutlined />, description: '多条件筛选查询', gsW: 12, gsH: 5, gsMinW: 6, gsMinH: 3, draggable: true },
      { key: 'dataTable', label: '数据表格', icon: <TableOutlined />, description: '表格数据展示', gsW: 10, gsH: 8, gsMinW: 6, gsMinH: 4, draggable: true },
      { key: 'customForm', label: '自定义表单', icon: <FormOutlined />, description: '自定义表单录入', gsW: 8, gsH: 11, gsMinW: 4, gsMinH: 4, draggable: true },
      { key: 'nativeForm', label: '原生表单', icon: <FormOutlined />, description: 'Portal 原生表单容器', gsW: 12, gsH: 12, gsMinW: 8, gsMinH: 8, draggable: true },
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

const WidgetDrawer: React.FC<WidgetDrawerProps> = ({
  open,
  onClose,
  onSelect,
  onSelectNativeFormField,
  activeNativeFormWidgetId,
  localCategories = [],
  localTemplates = [],
  onCreateLocalCategory,
  onDeleteLocalCategory,
  onDeleteLocalTemplate,
}) => {
  const { message } = App.useApp()
  const [activeTab, setActiveTab] = useState<'system' | 'form' | 'local'>('system')
  const [localSearchKeyword, setLocalSearchKeyword] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(widgetCategories.map((category) => [category.title, false])),
  )
  const hasLocalSearchKeyword = localSearchKeyword.trim().length > 0

  useEffect(() => {
    setCollapsedMap((prev) => {
      let changed = false
      const next = { ...prev }

      localCategories.forEach((category) => {
        if (next[category.id] === undefined) {
          next[category.id] = false
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [localCategories])

  const templateMapByCategory = useMemo(() => {
    return localCategories.reduce<Record<string, LocalTemplateRecord[]>>((result, category) => {
      result[category.id] = localTemplates.filter((item) => item.categoryId === category.id)
      return result
    }, {})
  }, [localCategories, localTemplates])

  const filteredLocalCategoryList = useMemo(() => {
    const keyword = localSearchKeyword.trim().toLowerCase()

    if (!keyword) {
      return localCategories.map((category) => ({
        category,
        templates: templateMapByCategory[category.id] || [],
      }))
    }

    return localCategories.reduce<Array<{
      category: LocalTemplateCategory
      templates: LocalTemplateRecord[]
    }>>((result, category) => {
      const templates = templateMapByCategory[category.id] || []
      const categoryMatched = category.name.toLowerCase().includes(keyword)
      const matchedTemplates = categoryMatched
        ? templates
        : templates.filter((item) => item.name.toLowerCase().includes(keyword))

      if (categoryMatched || matchedTemplates.length > 0) {
        result.push({
          category,
          templates: matchedTemplates,
        })
      }

      return result
    }, [])
  }, [localCategories, localSearchKeyword, templateMapByCategory])

  const handleToggleCategory = (key: string) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [key]: !prev?.[key],
    }))
  }

  const handleOpenCreateCategoryDialog = () => {
    setNewCategoryName('')
    setCreateCategoryDialogOpen(true)
  }

  const handleCloseCreateCategoryDialog = () => {
    if (localLoading) {
      return
    }

    setCreateCategoryDialogOpen(false)
    setNewCategoryName('')
  }

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      message.warning('请输入分类名称')
      return
    }

    if (!onCreateLocalCategory) {
      return
    }

    try {
      setLocalLoading(true)
      await onCreateLocalCategory(trimmedName)
      setCreateCategoryDialogOpen(false)
      setNewCategoryName('')
    } catch (error: any) {
      message.error(error?.message || '新增分类失败')
    } finally {
      setLocalLoading(false)
    }
  }

  const renderWidgetCard = (item: WidgetItem) => (
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
  )

  const renderLocalTemplateCard = (template: LocalTemplateRecord) => {
    const isGroup = template.scope === 'group'
    const dragKey = createLocalTemplateKey(template.id)
    const snapshot = template.snapshot
    const groupWidgetCount = snapshot.scope === 'group' ? snapshot.widgets.length : 1

    return (
      <div
        key={template.id}
        className="widget-card widget-card--template widget-drag-item"
        onClick={() => onSelect(dragKey)}
        data-widget-type={dragKey}
        data-gs-widget={JSON.stringify({
          w: snapshot.scope === 'group' ? snapshot.group.layout?.w || 6 : snapshot.widget.layout?.w || 4,
          h: snapshot.scope === 'group' ? snapshot.group.layout?.h || 5 : snapshot.widget.layout?.h || 4,
          minW: snapshot.scope === 'group' ? snapshot.group.layout?.minW || 2 : snapshot.widget.layout?.minW || 1,
          minH: snapshot.scope === 'group' ? snapshot.group.layout?.minH || 2 : snapshot.widget.layout?.minH || 1,
          id: `sidebar-${dragKey}`,
          content: createLocalTemplateDragContent(template.id),
        })}
      >
        <div className="widget-card-icon">
          {isGroup ? <GroupOutlined /> : <SaveOutlined />}
        </div>
        <div className="widget-card-info">
          <div className="widget-card-label widget-card-label--template" title={template.name}>
            {template.name}
          </div>
          <div className="widget-card-desc">
            {isGroup ? `分组模板 · ${groupWidgetCount} 个组件` : '组件模板'}
          </div>
        </div>
        {onDeleteLocalTemplate ? (
          <Popconfirm
            title="删除模板"
            description={isGroup ? '确认删除该分组模板吗？' : '确认删除该组件模板吗？'}
            okText="删除"
            cancelText="取消"
            onConfirm={(event) => {
              event?.stopPropagation?.()
              return onDeleteLocalTemplate(template.id)
            }}
          >
            <Button
              type="text"
              size="small"
              danger
              className="widget-card__delete"
              icon={<DeleteOutlined />}
              onClick={(event) => event.stopPropagation()}
            />
          </Popconfirm>
        ) : null}
      </div>
    )
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

      <Tabs
        activeKey={activeTab}
        onChange={(value) => setActiveTab(value as 'system' | 'form' | 'local')}
        items={[
          {
            key: 'system',
            label: '系统组件',
          },
          {
            key: 'form',
            label: '表单',
          },
          {
            key: 'local',
            label: '组件模板',
          },
        ]}
        className="widget-drawer__tabs"
      />

      {activeTab === 'system' ? (
        <div className="widget-drawer-content">
          {widgetCategories.map((category) => (
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
                  {category.items
                    .filter(item => item.key !== 'nativeForm')
                    .map(renderWidgetCard)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : activeTab === 'form' ? (
        <div className="widget-drawer-content widget-drawer-content--form">
          <NativeFormMaterialTab
            activeWidgetId={activeNativeFormWidgetId}
            onAddFormWidget={() => onSelect('nativeForm')}
            onAddField={onSelectNativeFormField}
          />
        </div>
      ) : (
        <div className="widget-drawer-content widget-drawer-content--local">
          <div className="local-template-toolbar">
            <Input
              allowClear
              value={localSearchKeyword}
              onChange={(event) => setLocalSearchKeyword(event.target.value)}
              placeholder="筛选分类或组件"
              prefix={<SearchOutlined />}
              className="local-template-toolbar__search"
            />
            <Button
              type="default"
              size="small"
              icon={<PlusOutlined />}
              loading={localLoading}
              onClick={handleOpenCreateCategoryDialog}
              className="local-template-toolbar__create-btn"
            >
              新增分类
            </Button>
          </div>

          <div className="local-template-list">
            {localCategories.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无分类，请先新增分类"
              />
            ) : filteredLocalCategoryList.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="没有匹配的分类或组件"
              />
            ) : (
              filteredLocalCategoryList.map(({ category, templates }) => {
                const isCollapsed = !hasLocalSearchKeyword && Boolean(collapsedMap[category.id])

                return (
                  <div key={category.id} className="widget-category widget-category--local">
                    <div className="widget-category__header-row">
                      <button
                        type="button"
                        className="widget-category__header"
                        onClick={() => handleToggleCategory(category.id)}
                      >
                        <div className="widget-category__left">
                          <span className="widget-category__title">
                            {category.name}（{templates.length}）
                          </span>
                        </div>
                        <span className="widget-category__count">
                          <DownOutlined
                            className={`widget-category__arrow ${isCollapsed ? 'is-collapsed' : ''}`}
                          />
                        </span>
                      </button>
                      {!category.builtIn && onDeleteLocalCategory ? (
                        <Popconfirm
                          title="删除分类"
                          description="确认删除该分类吗？"
                          okText="删除"
                          cancelText="取消"
                          onConfirm={() => onDeleteLocalCategory(category.id)}
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            className="widget-category__header-action"
                            onClick={(event) => event.stopPropagation()}
                          />
                        </Popconfirm>
                      ) : null}
                    </div>
                    {!isCollapsed && (
                      templates.length > 0 ? (
                        <div className="widget-grid">
                          {templates.map(renderLocalTemplateCard)}
                        </div>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="该分类下暂无组件模板"
                        />
                      )
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      <Modal
        title="新增分类"
        open={createCategoryDialogOpen}
        onOk={() => void handleCreateCategory()}
        onCancel={handleCloseCreateCategoryDialog}
        confirmLoading={localLoading}
        okText="确认"
        cancelText="取消"
        destroyOnHidden
      >
        <Input
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          placeholder="请输入分类名称"
          maxLength={20}
          onPressEnter={() => void handleCreateCategory()}
        />
      </Modal>
    </div>
  )
}

export default WidgetDrawer
