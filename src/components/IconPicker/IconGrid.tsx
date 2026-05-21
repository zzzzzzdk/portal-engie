/**
 * IconGrid 组件
 * 图标网格展示，支持搜索和分组过滤
 */

import React, { useState, useMemo, useCallback } from 'react'
import { Input, Segmented, Empty, Tooltip } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import Icon from '@/components/Icon'
import {
  ANTD_OUTLINED_ICONS,
  ANTD_FILLED_ICONS,
  ICONFONT_ICONS,
  WANXIANG_ICONS,
  searchIcons,
} from './iconData'
import type { IconGridProps, IconItem, IconType } from './types'

type FilterType = 'all' | IconType

const FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: 'Outlined', value: 'antd-outlined' },
  { label: 'Filled', value: 'antd-filled' },
  { label: 'Iconfont', value: 'iconfont' },
]

const IconGrid: React.FC<IconGridProps> = ({ value, onSelect }) => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')

  const baseIcons = useMemo(() => {
    switch (filterType) {
      case 'antd-outlined':
        return ANTD_OUTLINED_ICONS
      case 'antd-filled':
        return ANTD_FILLED_ICONS
      case 'iconfont':
        return [...ICONFONT_ICONS, ...WANXIANG_ICONS]
      default:
        return [...ANTD_OUTLINED_ICONS, ...ANTD_FILLED_ICONS, ...ICONFONT_ICONS, ...WANXIANG_ICONS]
    }
  }, [filterType])

  const filteredIcons = useMemo(() => searchIcons(searchKeyword, baseIcons), [searchKeyword, baseIcons])

  const renderIcon = useCallback((icon: IconItem) => {
    if (icon.type === 'iconfont') {
      return <Icon type={icon.name} style={{ fontSize: 20 }} />
    }

    if (icon.component) {
      const IconComponent = icon.component
      return <IconComponent style={{ fontSize: 20 }} />
    }

    return null
  }, [])

  const handleIconClick = useCallback((icon: IconItem) => {
    onSelect(icon.name)
  }, [onSelect])

  return (
    <div className="icon-grid-container">
      <Input
        placeholder="搜索图标名称..."
        prefix={<SearchOutlined />}
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        allowClear
        size="small"
        className="icon-search-input"
      />

      <Segmented
        options={FILTER_OPTIONS}
        value={filterType}
        onChange={(val) => setFilterType(val as FilterType)}
        size="small"
        block
        className="icon-filter-segmented"
      />

      <div className="icon-grid">
        {filteredIcons.length > 0 ? (
          filteredIcons.map((icon) => (
            <Tooltip key={icon.name} title={icon.name} placement="top">
              <div
                className={`icon-grid-item ${value === icon.name ? 'selected' : ''}`}
                onClick={() => handleIconClick(icon)}
              >
                {renderIcon(icon)}
              </div>
            </Tooltip>
          ))
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="未找到匹配的图标"
            className="icon-grid-empty"
          />
        )}
      </div>
    </div>
  )
}

export default IconGrid
