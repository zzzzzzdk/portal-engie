import { useState, useEffect, useCallback } from 'react'

export interface UseTableScrollOptions {
  /** 页面顶部固定区域高度（导航 + 面包屑等），默认 140 */
  headerHeight?: number
  /** 页面底部区域高度（分页器 + 边距等），默认 80 */
  footerHeight?: number
  /** 最小高度，默认 200 */
  minHeight?: number
}

export interface UseTableScrollResult {
  /** 表格滚动区域高度 */
  scrollY: number
  /** 手动重新计算高度 */
  recalculate: () => void
}

/**
 * 自适应表格高度 Hook
 * 基于 window.innerHeight 减去固定区域高度计算
 *
 * 使用方式：
 * const { scrollY } = useTableScroll({ headerHeight: 140, footerHeight: 80 })
 * <Table scroll={{ y: scrollY }} />
 */
export const useTableScroll = (options: UseTableScrollOptions = {}): UseTableScrollResult => {
  const {
    headerHeight = 171,  // 导航栏 60 + 面包屑 40 + 内容区 padding 20 + 任意表单头部 + 表头 51
    footerHeight = 120,   // 分页器 52 + 底部padding 20 + 底部边距 20 + footer高度 28
    minHeight = 60
  } = options

  const [scrollY, setScrollY] = useState<number>(minHeight)

  const calculateHeight = useCallback(() => {
    const windowHeight = window.innerHeight
    const availableHeight = windowHeight - headerHeight - footerHeight
    const finalHeight = Math.max(availableHeight, minHeight)
    setScrollY(finalHeight)
  }, [headerHeight, footerHeight, minHeight])

  useEffect(() => {
    // 初始计算
    calculateHeight()

    // 监听窗口变化
    window.addEventListener('resize', calculateHeight)

    return () => {
      window.removeEventListener('resize', calculateHeight)
    }
  }, [calculateHeight])

  return {
    scrollY,
    recalculate: calculateHeight
  }
}
