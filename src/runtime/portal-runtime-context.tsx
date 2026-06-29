import React, { createContext, useContext, useMemo } from 'react'

export type PortalRuntimeMode = 'app' | 'export-runtime' | 'mobile-runtime'
export type PortalMicroAppMode = 'live' | 'degrade'

interface PortalRuntimeContextValue {
  mode: PortalRuntimeMode
  microAppMode: PortalMicroAppMode
}

const DEFAULT_CONTEXT: PortalRuntimeContextValue = {
  mode: 'app',
  microAppMode: 'live',
}

const PortalRuntimeContext = createContext<PortalRuntimeContextValue>(DEFAULT_CONTEXT)

interface PortalRuntimeProviderProps {
  children: React.ReactNode
  value?: Partial<PortalRuntimeContextValue>
}

export const PortalRuntimeProvider: React.FC<PortalRuntimeProviderProps> = ({
  children,
  value,
}) => {
  const mergedValue = useMemo(
    () => ({
      ...DEFAULT_CONTEXT,
      ...value,
    }),
    [value],
  )

  return (
    <PortalRuntimeContext.Provider value={mergedValue}>
      {children}
    </PortalRuntimeContext.Provider>
  )
}

export const usePortalRuntime = (): PortalRuntimeContextValue => {
  return useContext(PortalRuntimeContext)
}
