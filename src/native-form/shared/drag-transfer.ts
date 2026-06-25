export const NATIVE_FORM_FIELD_DRAG_MIME = 'application/x-portal-native-form-field'
const NATIVE_FORM_FIELD_DRAG_TEXT_PREFIX = 'portal-native-form-field:'
let currentNativeFormFieldDragType: string | null = null

export const setNativeFormFieldDragData = (
  dataTransfer: DataTransfer,
  fieldType: string,
) => {
  currentNativeFormFieldDragType = fieldType
  dataTransfer.effectAllowed = 'copy'
  dataTransfer.setData(NATIVE_FORM_FIELD_DRAG_MIME, fieldType)
  dataTransfer.setData('text/plain', `${NATIVE_FORM_FIELD_DRAG_TEXT_PREFIX}${fieldType}`)
}

export const getCurrentNativeFormFieldDragType = (): string | null => currentNativeFormFieldDragType

export const clearCurrentNativeFormFieldDragType = () => {
  currentNativeFormFieldDragType = null
}

export const getNativeFormFieldDragType = (
  dataTransfer?: DataTransfer | null,
): string | null => {
  if (!dataTransfer) {
    return null
  }

  const directValue = dataTransfer.getData(NATIVE_FORM_FIELD_DRAG_MIME)
  if (directValue) {
    return directValue
  }

  const textValue = dataTransfer.getData('text/plain')
  if (textValue?.startsWith(NATIVE_FORM_FIELD_DRAG_TEXT_PREFIX)) {
    return textValue.slice(NATIVE_FORM_FIELD_DRAG_TEXT_PREFIX.length)
  }

  return null
}

export const hasNativeFormFieldDragType = (
  dataTransfer?: DataTransfer | null,
): boolean => {
  if (!dataTransfer) {
    return false
  }

  const types = Array.from(dataTransfer.types || [])
  if (types.includes(NATIVE_FORM_FIELD_DRAG_MIME)) {
    return true
  }

  return Boolean(getNativeFormFieldDragType(dataTransfer))
}
