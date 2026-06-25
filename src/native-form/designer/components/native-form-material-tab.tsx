import React from 'react'
import { NATIVE_FORM_FIELD_MANIFESTS } from '@/native-form/manifests'
import {
  clearCurrentNativeFormFieldDragType,
  setNativeFormFieldDragData,
} from '@/native-form/shared/drag-transfer'

interface NativeFormMaterialTabProps {
  activeWidgetId?: string | null
  onAddFormWidget?: () => void
  onAddField?: (fieldType: (typeof NATIVE_FORM_FIELD_MANIFESTS)[number]['type']) => void
}

const TEXT = {
  formContainer: '\u539f\u751f\u8868\u5355\u5bb9\u5668',
  formContainerDesc:
    '\u5148\u653e\u5165\u8868\u5355\u5bb9\u5668\uff0c\u518d\u5728\u5bb9\u5668\u5185\u90e8\u7f16\u6392\u5b57\u6bb5\u4e0e\u8868\u5355\u4ea4\u4e92',
  formContainerTag: '\u8868\u5355\u5bb9\u5668',
  dragToCanvas: '\u62d6\u62fd\u5230\u5de5\u4f5c\u53f0',
}

const NativeFormMaterialTab: React.FC<NativeFormMaterialTabProps> = ({
  onAddFormWidget,
  onAddField,
}) => {
  const visibleItems = NATIVE_FORM_FIELD_MANIFESTS.filter(item => item.type !== 'subTable')

  return (
    <div className="native-form-material-tab">
      <div className="native-form-material-tab__placeholder">
        <div className="native-form-material-tab__grid">
          <div
            className="widget-card native-form-material-tab__container-card widget-drag-item"
            onClick={() => onAddFormWidget?.()}
            data-widget-type="nativeForm"
            data-gs-widget={JSON.stringify({
              w: 12,
              h: 12,
              minW: 8,
              minH: 8,
              id: 'sidebar-nativeForm',
              content: 'nativeForm',
            })}
          >
            <div className="widget-card-info native-form-material-tab__container-copy">
              <div className="widget-card-label native-form-material-tab__container-label">
                {TEXT.formContainer}
              </div>
              <div className="widget-card-desc native-form-material-tab__container-desc">
                {TEXT.formContainerDesc}
              </div>
              <div className="native-form-material-tab__container-hint">
                <span className="native-form-material-tab__container-tag">
                  {TEXT.formContainerTag}
                </span>
                <span className="native-form-material-tab__container-drag">
                  {TEXT.dragToCanvas}
                </span>
              </div>
            </div>
          </div>

          {visibleItems.map((item) => (
            <button
              key={item.type}
              type="button"
              className="native-form-material-tab__item"
              onClick={() => onAddField?.(item.type)}
              draggable
              onDragStart={(event) => {
                if (event.dataTransfer) {
                  setNativeFormFieldDragData(event.dataTransfer, item.type)
                }
              }}
              onDragEnd={clearCurrentNativeFormFieldDragType}
            >
              <div className="native-form-material-tab__item-label">{item.label}</div>
              <div className="native-form-material-tab__item-desc">{item.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NativeFormMaterialTab
