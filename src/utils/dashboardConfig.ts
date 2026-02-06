import type { DashboardConfig } from '@/types';

export const sanitizeDashboardConfig = (config?: DashboardConfig | null): DashboardConfig => {
  if (!config) {
    return {};
  }
  const { customTokens, ...rest } = config as DashboardConfig & { customTokens?: unknown };
  return rest;
};

export default sanitizeDashboardConfig;
