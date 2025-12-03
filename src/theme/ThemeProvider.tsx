import { useEffect, useMemo } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useConfigStore } from '@/store'
import { generatePalette, injectColorPalette, injectCSSVariables } from './algorithms'
import { baseTokens } from './tokens/base'

/**
 * 主题提供者组件
 * 负责：
 * 1. 生成调色板并注入 CSS 变量
 * 2. 注入基础 Token 到 CSS 变量
 * 3. 注入自定义 Token 到 CSS 变量
 * 4. 配置 Ant Design 主题
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeMode = useConfigStore((state) => state.themeMode)
  const themePreset = useConfigStore((state) => state.themePreset)
  const baseColors = useConfigStore((state) => state.baseColors)
  const customTokens = useConfigStore((state) => state.customTokens)
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

      // 4. 设置主题模式到 data 属性（供 CSS 选择器使用）
      root.dataset.theme = themeMode
      root.dataset.preset = themePreset
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [palette, themeMode, themePreset, customTokens])

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
