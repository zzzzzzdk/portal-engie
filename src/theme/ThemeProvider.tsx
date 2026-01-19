import { useEffect, useMemo } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useConfigStore } from '@/store'
import { generatePalette, injectColorPalette, injectCSSVariables } from './algorithms'
import { baseTokens } from './tokens/base'
import type { IWidgetStyleTokens } from './tokens/semantic'

/**
 * 注入风格 Token 到 CSS 变量
 */
const injectStyleTokens = (tokens: IWidgetStyleTokens, root: HTMLElement) => {
  // 注入 widget 风格变量
  const { widget, card } = tokens

  // Widget 变量（处理可选属性）
  root.style.setProperty('--widget-background', widget.background)
  root.style.setProperty('--widget-backdrop-filter', widget.backdropFilter ?? 'none')
  root.style.setProperty('--widget-border-radius', `${widget.borderRadius}px`)
  root.style.setProperty('--widget-border-color', widget.borderColor ?? 'transparent')
  root.style.setProperty('--widget-border-width', `${widget.borderWidth ?? 0}px`)
  root.style.setProperty('--widget-box-shadow', widget.boxShadow ?? 'none')
  root.style.setProperty('--widget-title-color', widget.titleColor ?? 'inherit')
  root.style.setProperty('--widget-text-color', widget.textColor ?? 'inherit')

  // Card 变量（处理可选属性）
  root.style.setProperty('--card-background', card.background)
  root.style.setProperty('--card-backdrop-filter', card.backdropFilter)
  root.style.setProperty('--card-border-radius', `${card.borderRadius ?? 8}px`)
  root.style.setProperty('--card-border-color', card.borderColor ?? 'transparent')
  root.style.setProperty('--card-box-shadow', card.boxShadow ?? 'none')
}

/**
 * 主题提供者组件
 * 负责：
 * 1. 生成调色板并注入 CSS 变量
 * 2. 注入基础 Token 到 CSS 变量
 * 3. 注入自定义 Token 到 CSS 变量
 * 4. 注入风格 Token 到 CSS 变量
 * 5. 配置 Ant Design 主题
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeMode = useConfigStore((state) => state.themeMode)
  const themePreset = useConfigStore((state) => state.themePreset)
  const baseColors = useConfigStore((state) => state.baseColors)
  const customTokens = useConfigStore((state) => state.customTokens)
  const styleMode = useConfigStore((state) => state.styleMode)
  const styleTokens = useConfigStore((state) => state.styleTokens)
  console.log(customTokens)
  // 生成调色板（基于基础颜色）
  const palette = useMemo(() => generatePalette(baseColors), [baseColors])

  // 注入所有 CSS 变量（在 ConfigProvider 渲染后执行，确保覆盖 Ant Design 的默认值）
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
      // 使用 important 优先级，确保覆盖 Ant Design 的默认值
      injectCSSVariables(customTokens.layout, 'ant', 'layout')

      // 4. 注入风格 Token（--ant-widget-background, --ant-widget-backdrop-filter 等）
      injectStyleTokens(styleTokens, root)

      // 5. 设置主题模式到 data 属性（供 CSS 选择器使用）
      root.dataset.theme = themeMode
      root.dataset.preset = themePreset
      root.dataset.style = styleMode
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [palette, themeMode, themePreset, customTokens, styleMode, styleTokens])

  // Ant Design 主题配置
  const antdThemeConfig = useMemo(() => {
    const isDark = themeMode === 'dark'

    return {
      cssVar: {
        key: 'ant',
        prefix: 'ant',
      },
      hashed: false,
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        // 基础颜色 - 这些会生成对应的 CSS 变量
        colorPrimary: baseColors.primary,
        colorSuccess: baseColors.success,
        colorWarning: baseColors.warning,
        colorError: baseColors.error,
        colorInfo: baseColors.info,

        // 基础尺寸
        borderRadius: baseTokens.borderRadius.md,
        fontSize: baseTokens.fontSize.sm,

        // 暗色模式特殊配置
        ...(isDark && {
          colorBgBase: '#141414',
          colorTextBase: '#fff',
        }),
      },
      components: {
        Layout: {
          headerHeight: customTokens.layout.header.height,
          // 注意：不在这里设置 headerBg 和 siderBg，
          // 因为我们使用自定义 CSS 变量 --ant-layout-header-gradient-bg
        },
        Menu: {
          // 让 Ant Design 根据 algorithm 自动适配菜单颜色
        },
      },
    }
  }, [themeMode, baseColors, customTokens])

  return (
    <ConfigProvider locale={zhCN} theme={antdThemeConfig}>
      {children}
    </ConfigProvider>
  )
}
