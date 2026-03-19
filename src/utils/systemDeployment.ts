import type { SysConfigResponse } from '@/services/system'

const normalizeSystemId = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase()
  }
  if (typeof value === 'number') {
    return String(value).trim().toLowerCase()
  }
  return ''
}

const extractSystemId = (item: unknown): string => {
  if (typeof item === 'string' || typeof item === 'number') {
    return normalizeSystemId(item)
  }

  if (item && typeof item === 'object') {
    const candidate = item as Record<string, unknown>
    return normalizeSystemId(
      candidate.systemId ??
      candidate.system_id ??
      candidate.id ??
      candidate.code ??
      candidate.key ??
      candidate.value
    )
  }

  return ''
}

const findSystemArray = (sysConfig?: SysConfigResponse | null): unknown[] => {
  if (!sysConfig || typeof sysConfig !== 'object') {
    return []
  }

  const config = sysConfig as unknown as Record<string, unknown>
  return Array.isArray(config.system_list) ? config.system_list : []
}

export const buildDeployedSystemSet = (sysConfig?: SysConfigResponse | null): Set<string> => {
  const source = findSystemArray(sysConfig)
  const systemIds = source
    .map(extractSystemId)
    .filter(Boolean)

  return new Set(systemIds)
}

export const isSystemDeployed = (
  deployedSystemSet: Set<string>,
  systemId?: string
): boolean => {
  const normalizedSystemId = normalizeSystemId(systemId)

  if (!normalizedSystemId) {
    return true
  }

  if (deployedSystemSet.size === 0) {
    return true
  }

  return deployedSystemSet.has(normalizedSystemId)
}
