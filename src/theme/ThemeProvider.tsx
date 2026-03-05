import { useEffect, useMemo } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useConfigStore } from '@/store'
import { generatePalette, injectColorPalette, injectCSSVariables } from './algorithms'
import { baseTokens } from './tokens/base'

/**
 * 全局主题提供者（系统 UI 始终浅色）
 *
 * 职责：
 * 1. 生成调色板并注入 CSS 变量（全局配色）
 * 2. 注入基础 Token 到 CSS 变量
 * 3. 注入自定义 Token（布局等）到 CSS 变量
 * 4. 配置 Ant Design 全局主题（始终浅色算法）
 *
 * 注意：widget/card 风格变量（--widget-*, --card-*）已迁移到 CanvasThemeProvider，
 * 由画布容器级别注入，不再在此处处理。
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themePreset = useConfigStore((state) => state.themePreset)
  const baseColors = useConfigStore((state) => state.baseColors)
  const customTokens = useConfigStore((state) => state.customTokens)

  // 生成调色板（基于基础颜色）
  const palette = useMemo(() => generatePalette(baseColors), [baseColors])

  // 注入全局 CSS 变量（调色板、基础 Token、布局 Token）
  useEffect(() => {
    const root = document.documentElement

    // 延迟执行，确保在 Ant Design ConfigProvider 注入变量之后
    const timeoutId = setTimeout(() => {
      // 1. 注入调色板（--ant-color-primary-1 ~ --ant-color-primary-10 等）
      injectColorPalette(palette, 'ant')

      // 2. 注入基础 Token（--ant-spacing-xs, --ant-font-size-sm 等）
      Object.entries(baseTokens).forEach(([category, values]) => {
        Object.entries(values).forEach(([key, value]) => {
          const cssVarName = `--ant-${category}-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
          const cssValue = typeof value === 'number' ? `${value}px` : String(value)
          root.style.setProperty(cssVarName, cssValue)
        })
      })

      // 3. 注入自定义 Token（--ant-layout-header-gradient-bg 等）
      injectCSSVariables(customTokens.layout, 'ant', 'layout')

      // 4. 设置主题预设到 data 属性（供 CSS 选择器使用）
      root.dataset.preset = themePreset
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [palette, themePreset, customTokens])

  // Ant Design 全局主题配置（始终浅色）
  const antdThemeConfig = useMemo(() => {
    return {
      cssVar: {
        key: 'ant',
        prefix: 'ant',
      },
      hashed: false,
      algorithm: antdTheme.defaultAlgorithm, // 系统 UI 始终浅色
      token: {
        // 基础颜色
        colorPrimary: baseColors.primary,
        colorSuccess: baseColors.success,
        colorWarning: baseColors.warning,
        colorError: baseColors.error,
        colorInfo: baseColors.info,

        // 基础尺寸
        borderRadius: baseTokens.borderRadius.md,
        fontSize: baseTokens.fontSize.sm,
      },
      components: {
        Layout: {
          headerHeight: customTokens.layout.header.height,
        },
        Menu: {},
      },
    }
  }, [baseColors, customTokens])

  return (
    <ConfigProvider locale={zhCN} theme={antdThemeConfig}>
      {children}
    </ConfigProvider>
  )
}
