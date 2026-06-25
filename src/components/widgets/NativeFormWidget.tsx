import React, { useCallback, useMemo, useState } from 'react'
import { App, Form } from 'antd'
import type {
  NativeFormAppearanceConfig,
  NativeFormNode,
  NativeFormNodePlacement,
  NativeFormWidgetConfig,
  Widget,
  WidgetConfig,
} from '@/types'
import NativeFormRenderer from '@/native-form/runtime/native-form-renderer'
import NativeFormCanvas from '@/native-form/designer/components/native-form-canvas'
import { normalizeNativeFormConfig } from '@/native-form/shared/defaults'
import {
  createNativeFormFieldNode,
  isNativeFormContainerField,
} from '@/native-form/shared/field-factory'
import {
  findNativeFormNodeById,
  findNodePlacementById,
  insertNativeFormNodeAtPlacement,
  moveNativeFormNodeToPlacement,
  removeNativeFormNodeById,
} from '@/native-form/shared/field-helpers'
import {
  duplicateNativeFormNode,
  validateNativeFormSchema,
} from '@/native-form/shared/schema-validator'
import { useNativeFormDesignerStore } from '@/native-form/designer/store/use-native-form-designer-store'
import { useStore } from '@/store/useStore'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'
import type { WidgetEventMessage } from '@/types/widget-event'
import './native-form-widget.scss'

interface NativeFormWidgetProps {
  config: WidgetConfig
  widget?: Widget
  isEditMode?: boolean
}

const collectNativeFormFields = (nodes: NativeFormNode[] = []): NativeFormNode[] => {
  return nodes.flatMap((node) => {
    const current = node.field ? [node] : []

    if (node.type === 'grid') {
      const gridChildren = (node.gridCells || [])
        .flatMap(cell => cell.node ? collectNativeFormFields([cell.node]) : [])
      return [...current, ...gridChildren]
    }

    if (isNativeFormContainerField(node.type)) {
      return [...current, ...collectNativeFormFields(node.children || [])]
    }

    return current
  })
}

const NativeFormWidget: React.FC<NativeFormWidgetProps> = ({
  config,
  widget,
  isEditMode = false,
}) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const emitWidgetEvent = useWidgetEventEmitter(widget)
  const normalizedConfig = useMemo(
    () => normalizeNativeFormConfig(config as NativeFormWidgetConfig),
    [config],
  )
  const activeWidgetId = useNativeFormDesignerStore(state => state.activeWidgetId)
  const selectedNodeId = useNativeFormDesignerStore(state => state.selectedNodeId)
  const setSelectedNodeId = useNativeFormDesignerStore(state => state.setSelectedNodeId)
  const activate = useNativeFormDesignerStore(state => state.activate)
  const openConfigPanel = useStore(state => state.openConfigPanel)
  const isActive = Boolean(widget?.id) && activeWidgetId === widget?.id
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [runtimeParams, setRuntimeParams] = useState<Record<string, any>>({})
  const [formValueVersion, setFormValueVersion] = useState(0)
  const appearance = normalizedConfig.appearance

  const handleExternalFormChange = useCallback((
    changedValues: Record<string, any>,
    sourceMessage?: WidgetEventMessage,
  ) => {
    if (normalizedConfig.linkageRuntime?.runInternalLinkageOnExternalSetValue !== false) {
      setFormValueVersion(value => value + 1)
    }

    if (normalizedConfig.linkageRuntime?.validateOnExternalSetValue) {
      form.validateFields(Object.keys(changedValues)).catch(() => undefined)
    }

    if (!normalizedConfig.linkageRuntime?.emitChangeOnExternalSetValue) {
      return
    }

    const values = form.getFieldsValue(true)
    const changedField = Object.keys(changedValues)[0]
    const fieldConfig = changedField
      ? collectNativeFormFields(normalizedConfig.formSchema.children).find(field => field.field === changedField)
      : undefined
    emitWidgetEvent('form.change', {
      values,
      changedValues,
      changedField,
      changedValue: changedField ? changedValues[changedField] : undefined,
      fieldConfig,
      sourceEvent: sourceMessage,
    }, 'change')
  }, [emitWidgetEvent, form, normalizedConfig.formSchema.children, normalizedConfig.linkageRuntime?.emitChangeOnExternalSetValue, normalizedConfig.linkageRuntime?.runInternalLinkageOnExternalSetValue, normalizedConfig.linkageRuntime?.validateOnExternalSetValue])

  useWidgetEventInputs(widget, {
    setValue: (params, sourceMessage) => {
      form.setFieldsValue(params)
      handleExternalFormChange(params, sourceMessage)
    },
    clearValue: (params, sourceMessage) => {
      const currentValues = form.getFieldsValue(true)
      const fields = Array.isArray(params.fields) ? params.fields : Object.keys(currentValues)
      const clearedValues = fields.reduce<Record<string, any>>((result, fieldName) => {
        result[fieldName] = undefined
        return result
      }, {})

      form.setFieldsValue(clearedValues)
      handleExternalFormChange(clearedValues, sourceMessage)
    },
    reset: (_params, sourceMessage) => {
      const previousValues = form.getFieldsValue(true)
      form.resetFields()
      setFormValueVersion(value => value + 1)
      const values = form.getFieldsValue(true)
      const resetOutputEnabled = normalizedConfig.eventOutputs?.some(item => item.enabled !== false && item.eventName === 'form.reset')
      if (resetOutputEnabled) {
        emitWidgetEvent('form.reset', {
          values,
          previousValues,
          sourceEvent: sourceMessage,
        }, 'reset')
      }
    },
    setParams: (params) => {
      setRuntimeParams(prev => ({ ...prev, ...params }))
    },
    setParamsAndReload: (params) => {
      setRuntimeParams(prev => ({ ...prev, ...params, __reloadKey: Date.now() }))
    },
    clearParams: () => {
      setRuntimeParams({})
    },
  })

  if (!isEditMode) {
    return (
      <NativeFormRenderer
        config={normalizedConfig}
        widgetId={widget?.id}
        form={form}
        runtimeParams={runtimeParams}
        formValueVersion={formValueVersion}
        onFormSubmit={(values, response) => {
          const submitOutputEnabled = normalizedConfig.eventOutputs?.some(item => item.enabled !== false && item.eventName === 'form.submit')
          if (!submitOutputEnabled) return
          emitWidgetEvent('form.submit', { values, response, submitConfig: normalizedConfig.submitConfig }, 'submit')
        }}
        onFormChange={(changedValues, values, meta) => {
          if (meta?.shouldEmitOutput === false) return
          const changeOutputEnabled = normalizedConfig.eventOutputs?.some(item => item.enabled !== false && item.eventName === 'form.change')
          if (!changeOutputEnabled) return
          const changedField = Object.keys(changedValues)[0]
          const fieldConfig = changedField
            ? collectNativeFormFields(normalizedConfig.formSchema.children).find(field => field.field === changedField)
            : undefined
          emitWidgetEvent('form.change', {
            values,
            changedValues,
            changedField,
            changedValue: changedValues[changedField],
            fieldConfig,
          }, 'change')
        }}
        onFormReset={(values, previousValues) => {
          const resetOutputEnabled = normalizedConfig.eventOutputs?.some(item => item.enabled !== false && item.eventName === 'form.reset')
          if (!resetOutputEnabled) return
          emitWidgetEvent('form.reset', { values, previousValues }, 'reset')
        }}
        onFieldEvent={(eventName, payload) => {
          const outputEnabled = normalizedConfig.eventOutputs?.some(item => item.enabled !== false && item.eventName === eventName)
          if (!outputEnabled) return
          emitWidgetEvent(eventName, payload, eventName === 'field.click' ? 'click' : 'change')
        }}
      />
    )
  }

  const fields = normalizedConfig.formSchema.children

  const updateFieldTree = (
    updater: (prev: NativeFormNode[]) => NativeFormNode[],
  ) => {
    if (!widget?.id) {
      return
    }

    const nextChildren = updater(fields)
    useStore.getState().updateWidget(widget.id, {
      config: {
        ...normalizedConfig,
        formSchema: {
          ...normalizedConfig.formSchema,
          children: nextChildren,
        },
      },
    })
  }

  const appendField = (
    fieldType: string,
    placement?: NativeFormNodePlacement,
  ) => {
    const nextField = createNativeFormFieldNode(fieldType as any)

    updateFieldTree((prev) => {
      if (placement) {
        const nextChildren = insertNativeFormNodeAtPlacement(prev, placement, nextField)
        const validation = validateNativeFormSchema({
          ...normalizedConfig.formSchema,
          children: nextChildren,
        })
        if (!validation.valid) {
          message.error(validation.errors[0] || '字段添加失败')
          return prev
        }
        return nextChildren
      }

      const selectedNode = selectedNodeId
        ? findNativeFormNodeById(prev, selectedNodeId)
        : null
      const nextPlacement: NativeFormNodePlacement =
        selectedNode && isNativeFormContainerField(selectedNode.type)
          ? { parentNodeId: selectedNode.id }
          : { parentNodeId: null }

      const nextChildren = insertNativeFormNodeAtPlacement(prev, nextPlacement, nextField)
      const validation = validateNativeFormSchema({
        ...normalizedConfig.formSchema,
        children: nextChildren,
      })
      if (!validation.valid) {
        message.error(validation.errors[0] || '字段添加失败')
        return prev
      }
      return nextChildren
    })

    if (widget?.id && activeWidgetId !== widget.id) {
      activate(widget.id, normalizedConfig.formSchema)
    }
    setDraggingNodeId(null)
    setSelectedNodeId(nextField.id)
  }

  const handleMoveUp = (nodeId: string) => {
    updateFieldTree((prev) => {
      const currentPlacement = findNodePlacementById(prev, nodeId)
      if (!currentPlacement?.beforeNodeId || currentPlacement.targetCellId) {
        return prev
      }

      const placement = {
        parentNodeId: currentPlacement.parentNodeId,
        beforeNodeId: currentPlacement.beforeNodeId,
      }

      if (currentPlacement.targetCellId) {
        if (!placement) {
          return prev
        }
      }

      return moveNativeFormNodeToPlacement(prev, nodeId, placement)
    })
    setSelectedNodeId(nodeId)
  }

  const handleMoveDown = (nodeId: string) => {
    updateFieldTree((prev) => {
      const currentPlacement = findNodePlacementById(prev, nodeId)
      if (!currentPlacement || currentPlacement.targetCellId) {
        return prev
      }

      const placement: NativeFormNodePlacement = {
        parentNodeId: currentPlacement.parentNodeId,
        beforeNodeId: null,
      }

      if (!currentPlacement.targetCellId && currentPlacement.beforeNodeId) {
        const parentNode = currentPlacement.parentNodeId
          ? findNativeFormNodeById(prev, currentPlacement.parentNodeId)
          : null
        const siblings = parentNode?.children || prev
        const currentIndex = siblings.findIndex(item => item.id === nodeId)
        placement.beforeNodeId = siblings[currentIndex + 2]?.id || null
      }

      if (currentPlacement.targetCellId) {
        if (!placement) {
          return prev
        }
      }

      return moveNativeFormNodeToPlacement(prev, nodeId, placement)
    })
    setSelectedNodeId(nodeId)
  }

  const handleMoveNode = (
    nodeId: string,
    placement: NativeFormNodePlacement,
  ) => {
    updateFieldTree((prev) => {
      const nextChildren = moveNativeFormNodeToPlacement(prev, nodeId, placement)
      const validation = validateNativeFormSchema({
        ...normalizedConfig.formSchema,
        children: nextChildren,
      })
      if (!validation.valid) {
        message.error(validation.errors[0] || '字段移动后 schema 不合法')
        return prev
      }
      return nextChildren
    })
    setDraggingNodeId(null)
    setSelectedNodeId(nodeId)
  }

  const handleDelete = (nodeId: string) => {
    updateFieldTree((prev) => removeNativeFormNodeById(prev, nodeId))
    setDraggingNodeId(null)
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
  }

  const handleDuplicate = (nodeId: string) => {
    const currentNode = findNativeFormNodeById(fields, nodeId)
    if (!currentNode) {
      return
    }

    const nextNode = duplicateNativeFormNode(currentNode, normalizedConfig.formSchema)

    updateFieldTree((prev) => {
      const placement = findNodePlacementById(prev, nodeId) || { parentNodeId: null }
      const nextChildren = insertNativeFormNodeAtPlacement(prev, placement, nextNode)
      const validation = validateNativeFormSchema({
        ...normalizedConfig.formSchema,
        children: nextChildren,
      })
      if (!validation.valid) {
        message.error(validation.errors[0] || '复制后 schema 不合法')
        return prev
      }
      return nextChildren
    })

    setDraggingNodeId(null)
    setSelectedNodeId(nextNode.id)
  }

  const handleActivate = () => {
    if (!widget?.id) {
      return
    }

    setSelectedNodeId(null)
    activate(widget.id, normalizedConfig.formSchema)
    openConfigPanel({ type: 'widget', id: widget.id })
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!widget?.id) {
      return
    }

    const target = event.target as HTMLElement | null
    if (!target || typeof target.closest !== 'function') {
      return
    }

    if (target.closest('.native-form-canvas__field')) {
      return
    }
    if (target.closest('.native-form-canvas__drop-slot')) {
      return
    }
    if (target.closest('.native-form-canvas__children-header')) {
      return
    }

    handleActivate()
  }

  const handleSelectNode = (nodeId: string) => {
    if (!widget?.id) {
      return
    }

    if (activeWidgetId !== widget.id) {
      activate(widget.id, normalizedConfig.formSchema)
    }

    openConfigPanel({ type: 'widget', id: widget.id })
    setSelectedNodeId(nodeId)
  }

  return (
    <div className={`native-form-widget ${isActive ? 'is-active' : ''}`}>
      <div
        className="native-form-widget__canvas"
        onMouseDown={handleCanvasMouseDown}
      >
        <NativeFormCanvas
          fields={fields}
          selectedNodeId={selectedNodeId}
          draggingNodeId={draggingNodeId}
          layoutMode={normalizedConfig.formSchema.layout.mode}
          labelWidth={normalizedConfig.formSchema.layout.labelWidth}
          labelCol={normalizedConfig.formSchema.layout.labelCol}
          wrapperCol={normalizedConfig.formSchema.layout.wrapperCol}
          fieldSpacing={normalizedConfig.formSchema.layout.fieldSpacing}
          labelAlign={normalizedConfig.formSchema.layout.labelAlign}
          colon={normalizedConfig.formSchema.layout.colon}
          size={normalizedConfig.formSchema.layout.size}
          variant={normalizedConfig.formSchema.layout.variant}
          appearance={appearance as NativeFormAppearanceConfig}
          onDragNodeStart={setDraggingNodeId}
          onDragNodeEnd={() => setDraggingNodeId(null)}
          onSelectNode={handleSelectNode}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onMoveNode={handleMoveNode}
          onDeleteNode={handleDelete}
          onDuplicateNode={handleDuplicate}
          onDropField={appendField}
        />
      </div>
    </div>
  )
}

export default NativeFormWidget
