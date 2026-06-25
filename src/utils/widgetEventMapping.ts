import { getValueByPath } from '@/utils/widgetApi'

const LITERAL_PREFIX = 'literal:'

export const readWidgetEventPath = (source: Record<string, any>, path?: string) => {
  if (path == null || path === '') {
    return undefined
  }

  if (typeof path !== 'string') {
    return path
  }

  if (path.startsWith(LITERAL_PREFIX)) {
    return path.slice(LITERAL_PREFIX.length)
  }

  if (path === 'payload' || path === 'meta') {
    return source[path]
  }

  const value = getValueByPath(source, path)
  if (value !== undefined) {
    return value
  }

  if (path.startsWith('payload.') && source.meta?.originalPayload) {
    return getValueByPath({ payload: source.meta.originalPayload }, path)
  }

  return value
}

export const applyWidgetEventMapping = (
  source: Record<string, any>,
  mapping?: Record<string, string>,
) => {
  if (!mapping || !Object.keys(mapping).length) {
    return source.payload && typeof source.payload === 'object' ? source.payload : {}
  }

  return Object.entries(mapping).reduce<Record<string, any>>((result, [targetKey, sourcePath]) => {
    result[targetKey] = readWidgetEventPath(source, sourcePath)
    return result
  }, {})
}

export const mergeWidgetRuntimeParams = (
  current: Record<string, any>,
  incoming: Record<string, any>,
  mode: 'merge' | 'replace' | 'clearThenMerge' = 'merge',
) => {
  if (mode === 'replace' || mode === 'clearThenMerge') {
    return { ...incoming }
  }

  return {
    ...current,
    ...incoming,
  }
}
