import { useCallback, useRef, useState } from 'react'
import { mergeWidgetRuntimeParams } from '@/utils/widgetEventMapping'

export const useWidgetRuntimeParams = () => {
  const paramsRef = useRef<Record<string, any>>({})
  const [paramsVersion, setParamsVersion] = useState(0)

  const setRuntimeParams = useCallback((params: Record<string, any>, mode: 'merge' | 'replace' | 'clearThenMerge' = 'merge') => {
    paramsRef.current = mergeWidgetRuntimeParams(paramsRef.current, params, mode)
    setParamsVersion(version => version + 1)
    return paramsRef.current
  }, [])

  const clearRuntimeParams = useCallback(() => {
    paramsRef.current = {}
    setParamsVersion(version => version + 1)
  }, [])

  return {
    runtimeParamsRef: paramsRef,
    paramsVersion,
    setRuntimeParams,
    clearRuntimeParams,
  }
}
