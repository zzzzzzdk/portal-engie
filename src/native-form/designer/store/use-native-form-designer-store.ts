import { create } from 'zustand'
import type { NativeFormSchema } from '@/types'
import { cloneNativeFormSchema } from '@/native-form/shared/defaults'

interface NativeFormDesignerState {
  active: boolean
  activeWidgetId: string | null
  selectedNodeId: string | null
  dirty: boolean
  draftSchema: NativeFormSchema | null
  activate: (widgetId: string, schema?: NativeFormSchema | null) => void
  deactivate: () => void
  setSelectedNodeId: (nodeId: string | null) => void
  setDraftSchema: (schema: NativeFormSchema | null) => void
  syncFromWidget: (schema?: NativeFormSchema | null) => void
  resetDirty: () => void
}

export const useNativeFormDesignerStore = create<NativeFormDesignerState>((set) => ({
  active: false,
  activeWidgetId: null,
  selectedNodeId: null,
  dirty: false,
  draftSchema: null,
  activate: (widgetId, schema) => set((state) => ({
    active: true,
    activeWidgetId: widgetId,
    selectedNodeId:
      state.activeWidgetId === widgetId ? state.selectedNodeId : null,
    dirty: false,
    draftSchema: cloneNativeFormSchema(schema),
  })),
  deactivate: () => set({
    active: false,
    activeWidgetId: null,
    selectedNodeId: null,
    dirty: false,
    draftSchema: null,
  }),
  setSelectedNodeId: (nodeId) => set({
    selectedNodeId: nodeId,
  }),
  setDraftSchema: (schema) => set({
    draftSchema: schema ? cloneNativeFormSchema(schema) : null,
    dirty: true,
  }),
  syncFromWidget: (schema) => set((state) => ({
    draftSchema: schema ? cloneNativeFormSchema(schema) : null,
    dirty: state.dirty,
  })),
  resetDirty: () => set({
    dirty: false,
  }),
}))
