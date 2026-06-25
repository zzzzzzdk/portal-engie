import { createCustomEventName, emit, on } from '@/utils/eventBus'

export interface LocalTemplateSaveRequest {
  targetType: 'widget' | 'group'
  targetId: string
}

export const LOCAL_TEMPLATE_SAVE_REQUEST_EVENT = createCustomEventName('local-template-save-request')

export const requestLocalTemplateSave = (payload: LocalTemplateSaveRequest) => {
  emit(LOCAL_TEMPLATE_SAVE_REQUEST_EVENT, payload)
}

export const subscribeLocalTemplateSave = (
  handler: (payload: LocalTemplateSaveRequest) => void,
) => {
  return on<LocalTemplateSaveRequest>(LOCAL_TEMPLATE_SAVE_REQUEST_EVENT, handler)
}
