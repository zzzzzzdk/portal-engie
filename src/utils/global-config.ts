import type {
  GlobalBackgroundConfig,
  GlobalConfigDetail,
  GlobalThemeScheme,
  GlobalWidgetTitleConfig,
} from '@/services'

export const DEFAULT_GLOBAL_MESSAGE_COPIES = {
  'form.success': '表单提交成功',
  'form.error': '表单提交失败，请稍后重试',
} as const

export const getDefaultGlobalThemeId = (detail?: GlobalConfigDetail | null) => {
  if (!detail) {
    return undefined
  }

  return detail.currentThemeId || detail.themes?.[0]?.id
}

export const getGlobalThemeScheme = (
  detail?: GlobalConfigDetail | null,
  themeId?: string,
): GlobalThemeScheme | undefined => {
  if (!detail?.themes?.length) {
    return undefined
  }

  if (themeId) {
    const matchedTheme = detail.themes.find(item => item.id === themeId)
    if (matchedTheme) {
      return matchedTheme
    }
  }

  const defaultThemeId = getDefaultGlobalThemeId(detail)
  return detail.themes.find(item => item.id === defaultThemeId) || detail.themes[0]
}

export const getGlobalThemeOptions = (detail?: GlobalConfigDetail | null) => {
  return (detail?.themes || []).map(item => ({
    label: item.name,
    value: item.id,
  }))
}

export const getGlobalMessageCopy = (
  detail: GlobalConfigDetail | null | undefined,
  key: keyof typeof DEFAULT_GLOBAL_MESSAGE_COPIES,
) => {
  return detail?.messageCopies?.[key] || DEFAULT_GLOBAL_MESSAGE_COPIES[key]
}

export const buildBackgroundFormValues = (config?: GlobalBackgroundConfig) => ({
  backgroundType: config?.backgroundType || 'color',
  backgroundColor: config?.backgroundColor,
  backgroundImage: config?.backgroundImage,
  backgroundGradient: config?.backgroundGradient,
  backgroundSize: config?.backgroundSize,
  backgroundRepeat: config?.backgroundRepeat,
  backgroundPosition: config?.backgroundPosition,
  backdropBlur: config?.backdropBlur,
  boxShadow: config?.boxShadow,
})

export const buildWidgetTitleStyleFormValues = (config?: GlobalWidgetTitleConfig) => ({
  showTitle: config?.showTitle !== false,
  titleColor: config?.titleColor,
  titleFontSize: config?.titleFontSize,
  titleFontWeight: config?.titleFontWeight,
})
