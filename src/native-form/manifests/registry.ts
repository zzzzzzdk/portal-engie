import type { NativeFormFieldType } from '@/types'
import { createNativeFormFieldNode } from '@/native-form/shared/field-factory'
import type { NativeFormFieldManifest } from './types'

const createManifest = (
  type: NativeFormFieldType,
  config: Omit<NativeFormFieldManifest, 'type'>,
): NativeFormFieldManifest => ({
  type,
  ...config,
})

export const NATIVE_FORM_FIELD_MANIFESTS: NativeFormFieldManifest[] = [
  createManifest('input', {
    label: '输入框',
    description: '单行文本输入',
    createNode: () => createNativeFormFieldNode('input'),
    groups: ['basic', 'item', 'component', 'validation', 'linkage', 'events', 'style'],
    traits: {
      textInput: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
    },
  }),
  createManifest('password', {
    label: '密码框',
    description: '密码文本输入',
    createNode: () => createNativeFormFieldNode('password'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      textInput: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
    },
  }),
  createManifest('textarea', {
    label: '文本域',
    description: '多行文本输入',
    createNode: () => createNativeFormFieldNode('textarea'),
    groups: ['basic', 'item', 'component', 'validation', 'linkage', 'events', 'style'],
    traits: {
      textInput: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
    },
  }),
  createManifest('inputNumber', {
    label: '数字输入',
    description: '数值录入',
    createNode: () => createNativeFormFieldNode('inputNumber'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      numericInput: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
    },
  }),
  createManifest('select', {
    label: '下拉框',
    description: '单选或多选下拉',
    createNode: () => createNativeFormFieldNode('select'),
    groups: [
      'basic',
      'item',
      'component',
      'dataSource',
      'linkage',
      'events',
      'style',
    ],
    traits: {
      select: true,
      selectLike: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
      options: true,
    },
  }),
  createManifest('transfer', {
    label: '穿梭框',
    description: '双栏穿梭选择',
    createNode: () => createNativeFormFieldNode('transfer'),
    groups: [
      'basic',
      'item',
      'component',
      'dataSource',
      'linkage',
      'events',
      'style',
    ],
    traits: {
      selectLike: true,
      transferLike: true,
    },
    supports: {
      fieldName: true,
      required: true,
      defaultValue: true,
      options: true,
    },
  }),
  createManifest('checkableTag', {
    label: '可选标签',
    description: '标签式单选或多选',
    createNode: () => createNativeFormFieldNode('checkableTag'),
    groups: [
      'basic',
      'item',
      'component',
      'dataSource',
      'linkage',
      'events',
      'style',
    ],
    traits: {
      selectLike: true,
      tagLike: true,
    },
    supports: {
      fieldName: true,
      required: true,
      defaultValue: true,
      options: true,
    },
  }),
  createManifest('radioGroup', {
    label: '单选组',
    description: '单项选择',
    createNode: () => createNativeFormFieldNode('radioGroup'),
    groups: [
      'basic',
      'item',
      'component',
      'dataSource',
      'linkage',
      'events',
      'style',
    ],
    traits: {
      choiceGroup: true,
    },
    supports: {
      fieldName: true,
      required: true,
      defaultValue: true,
      options: true,
    },
  }),
  createManifest('checkboxGroup', {
    label: '复选组',
    description: '多项选择',
    createNode: () => createNativeFormFieldNode('checkboxGroup'),
    groups: [
      'basic',
      'item',
      'component',
      'dataSource',
      'linkage',
      'events',
      'style',
    ],
    traits: {
      choiceGroup: true,
    },
    supports: {
      fieldName: true,
      required: true,
      defaultValue: true,
      options: true,
    },
  }),
  createManifest('datePicker', {
    label: '日期',
    description: '日期选择',
    createNode: () => createNativeFormFieldNode('datePicker'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      dateLike: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
    },
  }),
  createManifest('dateRangePicker', {
    label: '日期范围',
    description: '开始和结束日期选择',
    createNode: () => createNativeFormFieldNode('dateRangePicker'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      dateLike: true,
      rangeValue: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
    },
  }),
  createManifest('timePicker', {
    label: '时间',
    description: '时间选择',
    createNode: () => createNativeFormFieldNode('timePicker'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      dateLike: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
    },
  }),
  createManifest('timeRangePicker', {
    label: '时间范围',
    description: '开始和结束时间选择',
    createNode: () => createNativeFormFieldNode('timeRangePicker'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      dateLike: true,
      rangeValue: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
    },
  }),
  createManifest('cascader', {
    label: '级联',
    description: '层级联动选择',
    createNode: () => createNativeFormFieldNode('cascader'),
    groups: [
      'basic',
      'item',
      'component',
      'dataSource',
      'linkage',
      'events',
      'style',
    ],
    traits: {
      selectLike: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
      options: true,
    },
  }),
  createManifest('treeSelect', {
    label: '树选择',
    description: '树形结构选择',
    createNode: () => createNativeFormFieldNode('treeSelect'),
    groups: [
      'basic',
      'item',
      'component',
      'dataSource',
      'linkage',
      'events',
      'style',
    ],
    traits: {
      selectLike: true,
      treeSelect: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: true,
      defaultValue: true,
      treeOptions: true,
    },
  }),
  createManifest('upload', {
    label: '上传',
    description: '文件上传',
    createNode: () => createNativeFormFieldNode('upload'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    supports: {
      fieldName: true,
      required: true,
      defaultValue: true,
      upload: true,
    },
  }),
  createManifest('switch', {
    label: '开关',
    description: '布尔值切换',
    createNode: () => createNativeFormFieldNode('switch'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      switch: true,
    },
    supports: {
      fieldName: true,
      required: true,
      defaultValue: true,
    },
  }),
  createManifest('colorPicker', {
    label: '颜色选择',
    description: '颜色值选择',
    createNode: () => createNativeFormFieldNode('colorPicker'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      colorLike: true,
    },
    supports: {
      fieldName: true,
      required: true,
      placeholder: false,
      defaultValue: true,
    },
  }),
  createManifest('slider', {
    label: '滑动输入',
    description: '拖动滑块录入数值',
    createNode: () => createNativeFormFieldNode('slider'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      numericInput: true,
      sliderLike: true,
    },
    supports: {
      fieldName: true,
      required: true,
      defaultValue: true,
    },
  }),
  createManifest('rate', {
    label: '评分',
    description: '星级评分选择',
    createNode: () => createNativeFormFieldNode('rate'),
    groups: ['basic', 'item', 'component', 'linkage', 'events', 'style'],
    traits: {
      rateLike: true,
    },
    supports: {
      fieldName: true,
      required: true,
      defaultValue: true,
    },
  }),
  createManifest('flex', {
    label: '弹性布局',
    description: '按弹性方式组合字段',
    createNode: () => createNativeFormFieldNode('flex'),
    groups: ['basic', 'component', 'style'],
    traits: {
      container: true,
    },
    supports: {
      children: true,
    },
  }),
  createManifest('group', {
    label: '分组',
    description: '承载一组字段',
    createNode: () => createNativeFormFieldNode('group'),
    groups: ['basic', 'style'],
    traits: {
      container: true,
    },
    supports: {
      children: true,
    },
  }),
  createManifest('grid', {
    label: '栅格',
    description: '多列字段布局',
    createNode: () => createNativeFormFieldNode('grid'),
    groups: ['basic', 'component', 'style'],
    traits: {
      container: true,
    },
    supports: {
      children: true,
    },
  }),
  createManifest('subTable', {
    label: '子表格',
    description: '表格化字段集合',
    createNode: () => createNativeFormFieldNode('subTable'),
    groups: ['basic', 'component', 'events', 'style'],
    traits: {
      container: true,
    },
    supports: {
      subTableColumns: true,
    },
  }),
  createManifest('button', {
    label: '按钮',
    description: '表单操作按钮',
    createNode: () => createNativeFormFieldNode('button'),
    groups: ['basic', 'component', 'events', 'style'],
    supports: {},
  }),
]

export const NATIVE_FORM_FIELD_MANIFEST_MAP = NATIVE_FORM_FIELD_MANIFESTS.reduce<
  Record<NativeFormFieldType, NativeFormFieldManifest>
>((result, item) => {
  result[item.type] = item
  return result
}, {} as Record<NativeFormFieldType, NativeFormFieldManifest>)

export const getNativeFormFieldManifest = (type: NativeFormFieldType) =>
  NATIVE_FORM_FIELD_MANIFEST_MAP[type]
