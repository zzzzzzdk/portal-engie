import type { NativeFormFieldType, NativeFormNode } from '@/types'

export interface NativeFormMaterialManifest {
  label: string
  description: string
  icon?: string
  createNode: () => NativeFormNode
}

export interface NativeFormFieldCapabilityManifest {
  groups: Array<
    | 'basic'
    | 'item'
    | 'component'
    | 'dataSource'
    | 'validation'
    | 'linkage'
    | 'events'
    | 'style'
    | 'advanced'
  >
  supports: {
    fieldName?: boolean
    required?: boolean
    placeholder?: boolean
    defaultValue?: boolean
    options?: boolean
    treeOptions?: boolean
    upload?: boolean
    subTableColumns?: boolean
    children?: boolean
  }
  traits?: {
    container?: boolean
    textInput?: boolean
    numericInput?: boolean
    select?: boolean
    selectLike?: boolean
    transferLike?: boolean
    tagLike?: boolean
    treeSelect?: boolean
    choiceGroup?: boolean
    dateLike?: boolean
    rangeValue?: boolean
    switch?: boolean
    colorLike?: boolean
    sliderLike?: boolean
    rateLike?: boolean
    plateLike?: boolean
    vehicleModelLike?: boolean
  }
}

export interface NativeFormFieldManifest
  extends NativeFormMaterialManifest, NativeFormFieldCapabilityManifest {
  type: NativeFormFieldType
}
