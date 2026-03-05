import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useConfigStore } from '@/store/useConfigStore';
import { publishDashboard, serializeDashboardSnapshot } from '@/services';
import { getStylePreset } from '@/theme/tokens/styles';
import type { StyleMode } from '@/theme/tokens/semantic';
import sanitizeDashboardConfig from '@/utils/dashboardConfig';
import { DASHBOARD_LAST_EDIT_ID_KEY } from '@/constants/dashboard';

const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5分钟

interface UseAutoSaveOptions {
  enabled: boolean; // 是否在工作台路由上
  onSaveStatusChange?: (status: 'saving' | 'saved' | 'error' | 'idle') => void;
}

/**
 * 静默更新 URL 中的 editId，使用 replaceState 避免触发 React Router 重渲染
 * 不会打断用户的拖拽、编辑等操作
 */
const updateEditIdSilently = (editId: string) => {
  const hash = window.location.hash;
  const [hashPath, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  if (params.get('editId') === editId) return; // 已是最新，无需更新
  params.set('editId', editId);
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${hashPath}?${params.toString()}`
  );
};

/**
 * 从 URL hash 中获取 editId（兼容 HashRouter）
 */
const getEditIdFromUrl = (): string | undefined => {
  const hash = window.location.hash;
  const queryString = hash.split('?')[1] || '';
  return new URLSearchParams(queryString).get('editId') || undefined;
};

export const useAutoSave = ({ enabled, onSaveStatusChange }: UseAutoSaveOptions) => {
  const isEditMode = useStore((s) => s.isEditMode);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef<Date | null>(null);

  const silentSave = useCallback(async () => {
    const {
      isDirty,
      widgets,
      groups,
      floatingModules,
      dashboardConfig,
      clearDirty,
    } = useStore.getState();

    // 无变更或正在保存中，跳过
    if (!isDirty || isSavingRef.current) return;

    const editId = getEditIdFromUrl()
      || localStorage.getItem(DASHBOARD_LAST_EDIT_ID_KEY)
      || undefined;

    const title = dashboardConfig?.title?.trim() || '未命名';

    isSavingRef.current = true;
    onSaveStatusChange?.('saving');

    try {
      // 画布级主题配置已在 dashboardConfig 中，全局配色从 ConfigStore 取
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
        id: editId,
        title,
        dashboardConfig: serializeDashboardSnapshot(snapshot),
        status: 0, // 始终保存为草稿
        cover_url: '',
      });

      if (res.code !== 20000 || !res.data) {
        throw new Error(res.message || '自动保存失败');
      }

      // 处理返回的 ID：静默写入 URL + localStorage
      const responseId = res.data.id || editId || '';
      if (responseId) {
        updateEditIdSilently(responseId);
        localStorage.setItem(DASHBOARD_LAST_EDIT_ID_KEY, responseId);
      }

      clearDirty();
      lastSaveTimeRef.current = new Date();
      onSaveStatusChange?.('saved');
    } catch (error) {
      console.error('[AutoSave] 自动保存失败:', error);
      onSaveStatusChange?.('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [onSaveStatusChange]);

  // 编辑模式变化时：启动/停止定时器 + 切到非编辑模式时触发一次保存
  useEffect(() => {
    if (!enabled) return;

    if (isEditMode) {
      // 启动定时器
      timerRef.current = setInterval(silentSave, AUTO_SAVE_INTERVAL);
    } else {
      // 切到非编辑模式，触发一次保存
      silentSave();
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
