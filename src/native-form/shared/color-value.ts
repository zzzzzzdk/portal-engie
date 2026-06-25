export const normalizeNativeFormColorValue = (
  value: any,
  fallbackValue?: string,
): string | undefined => {
  if (!value) {
    return fallbackValue
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && typeof value.toRgbString === 'function') {
    return value.toRgbString()
  }

  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString()
  }

  if (typeof value === 'object' && value?.metaColor) {
    const { r, g, b, a } = value.metaColor
    if (a !== undefined && a < 1) {
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }

  return fallbackValue
}
