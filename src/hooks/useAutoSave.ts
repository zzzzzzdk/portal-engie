import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useConfigStore } from '@/store/useConfigStore';
import { publishDashboard, serializeDashboardSnapshot } from '@/services';
import { getStylePreset } from '@/theme/tokens/styles';
import type { StyleMode } from '@/theme/tokens/semantic';
import sanitizeDashboardConfig from '@/utils/dashboardConfig';

const AUTO_SAVE_INTERVAL = 5 * 60 * 1000;

interface UseAutoSaveOptions {
  enabled: boolean;
  dashboardId?: string;
  getCoverUrl?: () => string;
  onSaveStatusChange?: (status: 'saving' | 'saved' | 'error' | 'idle') => void;
}

interface SilentSaveOptions {
  force?: boolean;
}

export const useAutoSave = ({
  enabled,
  dashboardId,
  getCoverUrl,
  onSaveStatusChange,
}: UseAutoSaveOptions) => {
  const isEditMode = useStore((s) => s.isEditMode);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef<Date | null>(null);

  const silentSave = useCallback(async (options?: SilentSaveOptions): Promise<boolean> => {
    const {
      isDirty,
      widgets,
      groups,
      floatingModules,
      dashboardConfig,
      clearDirty,
    } = useStore.getState();

    if (isSavingRef.current || !dashboardId) {
      return true;
    }

    if (!options?.force && !isDirty) {
      return true;
    }

    const title = dashboardConfig?.title?.trim() || '未命名';

    isSavingRef.current = true;
    onSaveStatusChange?.('saving');

    try {
      const { themePreset, baseColors } = useConfigStore.getState();
      const baseDashboardConfig = sanitizeDashboardConfig(dashboardConfig);
      const canvasStyleMode = (baseDashboardConfig.styleMode as StyleMode) || 'normal';
      const canvasThemeMode = baseDashboardConfig.themeMode || 'light';
      const publishConfig = {
        ...baseDashboardConfig,
        themeMode: canvasThemeMode,
        themePreset,
        styleMode: canvasStyleMode,
        styleTokens: getStylePreset(canvasStyleMode, canvasThemeMode === 'dark'),
        baseColors,
        title,
      };
      const snapshot = {
        widgets,
        groups,
        floatingModules,
        dashboardConfig: publishConfig,
      };

      const res = await publishDashboard({
        id: dashboardId,
        title,
        dashboardConfig: serializeDashboardSnapshot(snapshot),
        cover_url: getCoverUrl?.() ?? '',
        action: 'save_draft',
      });

      if (res.code !== 20000 || !res.data) {
        throw new Error(res.message || '自动保存失败');
      }

      clearDirty();
      lastSaveTimeRef.current = new Date();
      onSaveStatusChange?.('saved');
      return true;
    } catch (error) {
      console.error('[AutoSave] 自动保存失败:', error);
      onSaveStatusChange?.('error');
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [dashboardId, getCoverUrl, onSaveStatusChange]);

  useEffect(() => {
    if (!enabled) return;

    if (isEditMode) {
      timerRef.current = setInterval(silentSave, AUTO_SAVE_INTERVAL);
    } else {
      void silentSave();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, isEditMode, silentSave]);

  return {
    silentSave,
    lastSaveTimeRef,
  };
};

export default useAutoSave;
