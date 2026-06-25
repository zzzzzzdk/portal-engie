import type {
  NativeFormFieldWidgetConfig,
  NativeFormNode,
  NativeFormSchema,
  NativeFormWidgetConfig,
} from '@/types'
import { createNativeFormFieldNode } from '@/native-form/shared/field-factory'
import { sanitizeNativeFormSchema } from '@/native-form/shared/field-helpers'

const DEFAULT_SUCCESS_MESSAGE = '表单提交成功'
const DEFAULT_FAILURE_MESSAGE = '表单提交失败，请稍后重试'
const DEFAULT_SUBMIT_BUTTON_TEXT = '提交'

const normalizeNativeFormNode = (node: NativeFormNode): NativeFormNode => ({
  ...node,
  itemProps: {
    showLabel: true,
    asterisk: true,
    ...(node.itemProps || {}),
  },
  styleProps: {
    ...(node.styleProps || {}),
  },
  eventConfig: {
    changeRoutes: Array.isArray(node.eventConfig?.changeRoutes)
      ? node.eventConfig?.changeRoutes || []
      : [],
    clickRoutes: Array.isArray(node.eventConfig?.clickRoutes)
      ? node.eventConfig?.clickRoutes || []
      : [],
  },
  gridCells: Array.isArray(node.gridCells)
    ? node.gridCells.map(cell => ({
      ...cell,
      node: cell.node ? normalizeNativeFormNode(cell.node) : null,
    }))
    : node.gridCells,
  children: Array.isArray(node.children)
    ? node.children.map((child) => normalizeNativeFormNode(child))
    : node.children,
})

export const normalizeNativeFormSchema = (schema?: NativeFormSchema | null): NativeFormSchema => {
  const baseSchema = schema || createEmptyNativeFormSchema()

  return {
    ...baseSchema,
    meta: {
      ...createEmptyNativeFormSchema().meta,
      ...(baseSchema.meta || {}),
    },
    layout: {
      ...createEmptyNativeFormSchema().layout,
      ...(baseSchema.layout || {}),
    },
    children: sanitizeNativeFormSchema(
      Array.isArray(baseSchema.children)
        ? baseSchema.children.map(item => normalizeNativeFormNode(item))
        : [],
    ),
  }
}

export const createEmptyNativeFormSchema = (): NativeFormSchema => ({
  version: 1,
  meta: {
    name: '未命名表单',
    description: '',
  },
  layout: {
    mode: 'horizontal',
    labelWidth: 96,
    labelCol: { span: 6 },
    wrapperCol: { span: 12 },
    fieldSpacing: 16,
    labelAlign: 'right',
    colon: true,
    size: 'middle',
    variant: 'outlined',
  },
  children: [],
})

export const cloneNativeFormSchema = (
  schema?: NativeFormSchema | null,
): NativeFormSchema => {
  if (!schema) {
    return createEmptyNativeFormSchema()
  }

  return JSON.parse(JSON.stringify(schema)) as NativeFormSchema
}

export const createDefaultNativeFormConfig = (): NativeFormWidgetConfig => ({
  title: '原生表单',
  showTitle: true,
  contentPadding: 0,
  refreshInterval: 0,
  formSchema: createEmptyNativeFormSchema(),
  submitConfig: {
    mode: 'api',
    apiMethod: 'POST',
    eventRoutes: [],
    submitButtonText: DEFAULT_SUBMIT_BUTTON_TEXT,
    successMessage: DEFAULT_SUCCESS_MESSAGE,
    failureMessage: DEFAULT_FAILURE_MESSAGE,
  },
  appearance: {
    bordered: true,
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '',
    borderColor: '',
    boxShadow: '',
  },
  linkageRuntime: {
    emitChangeOnExternalSetValue: false,
    runInternalLinkageOnExternalSetValue: true,
    validateOnExternalSetValue: false,
    reloadOptionsOnParamsChange: true,
    defaultChangeDebounce: 300,
  },
})

export const cloneNativeFormFieldNode = (
  field?: NativeFormNode | null,
): NativeFormNode => {
  if (!field) {
    return createNativeFormFieldNode('input')
  }

  return JSON.parse(JSON.stringify(field)) as NativeFormNode
}

export const createDefaultNativeFormFieldConfig = (
  field?: NativeFormNode,
): NativeFormFieldWidgetConfig => {
  const normalizedField = cloneNativeFormFieldNode(field)

  return {
    title: normalizedField.label || '表单字段',
    showTitle: true,
    contentPadding: 12,
    refreshInterval: 0,
    field: normalizeNativeFormNode(normalizedField),
    runtime: {
      mode: 'standalone',
      emitOnChange: true,
    },
    eventConfig: {
      changeRoutes: [],
      clickRoutes: [],
    },
  }
}

export const normalizeNativeFormConfig = (
  config?: Partial<NativeFormWidgetConfig> | null,
): NativeFormWidgetConfig => {
  const defaultConfig = createDefaultNativeFormConfig()
  const defaultSubmitConfig = defaultConfig.submitConfig || {}

  return {
    ...defaultConfig,
    ...(config || {}),
    formSchema: normalizeNativeFormSchema({
      ...defaultConfig.formSchema,
      ...(config?.formSchema || {}),
      meta: {
        ...defaultConfig.formSchema.meta,
        ...(config?.formSchema?.meta || {}),
      },
      layout: {
        ...defaultConfig.formSchema.layout,
        ...(config?.formSchema?.layout || {}),
      },
    }),
    submitConfig: {
      ...defaultSubmitConfig,
      ...(config?.submitConfig || {}),
      eventRoutes: Array.isArray(config?.submitConfig?.eventRoutes)
        ? config?.submitConfig?.eventRoutes || []
        : defaultSubmitConfig.eventRoutes,
    },
    appearance: {
      ...defaultConfig.appearance,
      ...(config?.appearance || {}),
    },
    linkageRuntime: {
      ...defaultConfig.linkageRuntime,
      ...(config?.linkageRuntime || {}),
    },
  }
}

export const normalizeNativeFormFieldConfig = (
  config?: Partial<NativeFormFieldWidgetConfig> | null,
): NativeFormFieldWidgetConfig => {
  const defaultConfig = createDefaultNativeFormFieldConfig()
  const normalizedField = normalizeNativeFormNode(cloneNativeFormFieldNode(config?.field))

  return {
    ...defaultConfig,
    ...(config || {}),
    title: config?.title || normalizedField.label || defaultConfig.title,
    field: normalizedField,
    runtime: {
      ...defaultConfig.runtime,
      ...(config?.runtime || {}),
    },
    eventConfig: {
      ...defaultConfig.eventConfig,
      ...(config?.eventConfig || {}),
      changeRoutes: Array.isArray(config?.eventConfig?.changeRoutes)
        ? config?.eventConfig?.changeRoutes || []
        : defaultConfig.eventConfig?.changeRoutes || [],
      clickRoutes: Array.isArray(config?.eventConfig?.clickRoutes)
        ? config?.eventConfig?.clickRoutes || []
        : defaultConfig.eventConfig?.clickRoutes || [],
    },
  }
}
