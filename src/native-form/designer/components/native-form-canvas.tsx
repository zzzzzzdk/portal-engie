import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Button, Form, Table, Typography } from 'antd'
import {
  CopyOutlined,
  DeleteOutlined,
  DragOutlined,
} from '@ant-design/icons'
import type {
  NativeFormAppearanceConfig,
  NativeFormGridCell,
  NativeFormNode,
  NativeFormNodePlacement,
  NativeFormOptionItem,
} from '@/types'
import NativeFormFieldControl from '@/native-form/runtime/native-form-field-control'
import {
  getNativeFormFieldDragType,
  hasNativeFormFieldDragType,
} from '@/native-form/shared/drag-transfer'
import { isNativeFormContainerField } from '@/native-form/shared/field-factory'
import {
  getNativeFormFieldControlStyle,
  getNativeFormFieldItemClassName,
  getNativeFormFieldItemLabel,
  getNativeFormFieldItemStyle,
  getNativeFormFieldLabelLayout,
  parseNativeFormDefaultValue,
} from '@/native-form/shared/field-helpers'
import { getValueByPath, parseJsonConfig } from '@/utils/widgetApi'
import './native-form-canvas.scss'

interface NativeFormCanvasProps {
  fields: NativeFormNode[]
  selectedNodeId?: string | null
  draggingNodeId?: string | null
  layoutMode?: 'vertical' | 'horizontal' | 'inline'
  labelWidth?: number
  labelCol?: Record<string, any> | string
  wrapperCol?: Record<string, any> | string
  fieldSpacing?: number
  labelAlign?: 'left' | 'right'
  colon?: boolean
  size?: 'small' | 'middle' | 'large'
  variant?: 'outlined' | 'borderless' | 'filled'
  appearance?: NativeFormAppearanceConfig
  onDragNodeStart?: (nodeId: string) => void
  onDragNodeEnd?: () => void
  onSelectNode: (nodeId: string) => void
  onMoveUp: (nodeId: string) => void
  onMoveDown: (nodeId: string) => void
  onMoveNode: (nodeId: string, placement: NativeFormNodePlacement) => void
  onDeleteNode: (nodeId: string) => void
  onDuplicateNode: (nodeId: string) => void
  onDropField?: (fieldType: string, placement?: NativeFormNodePlacement) => void
}

interface NativeFormCanvasNodeProps
  extends Omit<NativeFormCanvasProps, 'fields' | 'appearance'> {
  field: NativeFormNode
  level: number
  parentNodeId: string | null
  activeDropSlot: string | null
  setActiveDropSlot: (slotId: string | null) => void
  remoteOptionsMap: Record<string, NativeFormOptionItem[]>
}

interface NativeFormDropSlotProps {
  slotId: string
  placement: NativeFormNodePlacement
  activeDropSlot: string | null
  setActiveDropSlot: (slotId: string | null) => void
  draggingNodeId?: string | null
  onDropNode?: (nodeId: string, placement: NativeFormNodePlacement) => void
  onDropField?: (fieldType: string, placement?: NativeFormNodePlacement) => void
  compact?: boolean
}

interface NativeFormGridCellDropProps {
  parentNodeId: string
  cell: NativeFormGridCell
  activeDropSlot: string | null
  setActiveDropSlot: (slotId: string | null) => void
  draggingNodeId?: string | null
  onDropNode?: (nodeId: string, placement: NativeFormNodePlacement) => void
  onDropField?: (fieldType: string, placement?: NativeFormNodePlacement) => void
  children?: React.ReactNode
}

const NATIVE_FORM_NODE_DRAG_TEXT_PREFIX = 'portal-native-form-node:'

const buildSlotId = (parentNodeId: string | null, beforeNodeId?: string | null) =>
  `${parentNodeId || 'root'}::${beforeNodeId || 'append'}`

const buildGridCellSlotId = (parentNodeId: string, cellId: string) =>
  `${parentNodeId}::cell::${cellId}`

const parseNativeFormLayoutCol = (value: unknown) => {
  const parsed = parseJsonConfig(value as any)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed
    : undefined
}

const getPlacementSlotId = (placement: NativeFormNodePlacement) => {
  if (placement.targetCellId && placement.parentNodeId) {
    return buildGridCellSlotId(placement.parentNodeId, placement.targetCellId)
  }

  return buildSlotId(placement.parentNodeId, placement.beforeNodeId)
}

const resolveListPlacementFromPointer = (
  event: React.DragEvent<HTMLElement>,
  parentNodeId: string | null,
): NativeFormNodePlacement => {
  const container = event.currentTarget
  const childNodes = Array.from(
    container.querySelectorAll<HTMLElement>(':scope > .native-form-canvas__node'),
  )
  const axis = window.getComputedStyle(container).flexDirection.startsWith('row') ? 'x' : 'y'

  for (const childNode of childNodes) {
    const childId = childNode.dataset.nodeId
    if (!childId) {
      continue
    }

    const rect = childNode.getBoundingClientRect()
    const pointerPosition = axis === 'x' ? event.clientX : event.clientY
    const middlePosition = axis === 'x'
      ? rect.left + rect.width / 2
      : rect.top + rect.height / 2

    if (pointerPosition < middlePosition) {
      return { parentNodeId, beforeNodeId: childId }
    }
  }

  return { parentNodeId }
}

const getDraggingNodeIdFromTransfer = (dataTransfer?: DataTransfer | null): string | null => {
  if (!dataTransfer) {
    return null
  }

  const textValue = dataTransfer.getData('text/plain')
  if (textValue?.startsWith(NATIVE_FORM_NODE_DRAG_TEXT_PREFIX)) {
    return textValue.slice(NATIVE_FORM_NODE_DRAG_TEXT_PREFIX.length)
  }

  return null
}

const getNodeChildren = (field: NativeFormNode): NativeFormNode[] => {
  if (field.type === 'grid') {
    return (field.gridCells || [])
      .map(cell => cell.node || null)
      .filter(Boolean) as NativeFormNode[]
  }

  return field.children || []
}

const buildCanvasBodyStyle = (
  appearance: NativeFormAppearanceConfig | undefined,
): React.CSSProperties => ({
  padding: appearance?.padding,
  borderRadius: appearance?.borderRadius,
  backgroundColor: appearance?.backgroundColor || undefined,
  borderColor:
    appearance?.bordered === false
      ? undefined
      : (appearance?.borderColor || 'var(--ant-color-border)'),
  boxShadow: appearance?.boxShadow || undefined,
  borderStyle: appearance?.bordered === false ? 'none' : 'solid',
  borderWidth: appearance?.bordered === false ? 0 : 1,
})

const buildContainerPreviewStyle = (field: NativeFormNode): React.CSSProperties => ({
  padding: field.componentProps?.padding,
  backgroundColor: field.componentProps?.backgroundColor || undefined,
  borderColor: field.componentProps?.borderColor || undefined,
  borderStyle: field.componentProps?.borderStyle || undefined,
  borderRadius: field.componentProps?.borderRadius,
  width: field.styleProps?.width || undefined,
  height: field.styleProps?.height || undefined,
  marginTop: field.styleProps?.marginTop,
  marginBottom: field.styleProps?.marginBottom,
})

const buildGridLayoutStyle = (
  field: NativeFormNode,
): React.CSSProperties | undefined => {
  if (field.type !== 'grid') {
    return undefined
  }

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${field.columns || 2}, minmax(0, 1fr))`,
    columnGap: field.componentProps?.columnGap,
    rowGap: field.componentProps?.rowGap,
  }
}

const buildFlexLayoutStyle = (
  field: NativeFormNode,
): React.CSSProperties | undefined => {
  if (field.type !== 'flex') {
    return undefined
  }

  return {
    display: 'flex',
    flexDirection: field.componentProps?.direction === 'vertical' ? 'column' : 'row',
    gap: field.componentProps?.gap,
    flexWrap: field.componentProps?.wrap ? 'wrap' : 'nowrap',
    justifyContent: field.componentProps?.justify || 'flex-start',
    alignItems: field.componentProps?.align || 'stretch',
  }
}

const resolveRemoteOptions = (rawData: any, field: NativeFormNode): NativeFormOptionItem[] => {
  const listField = field.requestConfig?.listField?.trim()
  const labelField = field.requestConfig?.labelField?.trim()
  const valueField = field.requestConfig?.valueField?.trim()
  const childrenField = field.requestConfig?.childrenField?.trim()
  const rawList = listField ? getValueByPath(rawData, listField) : rawData

  if (!Array.isArray(rawList)) {
    return []
  }

  const mapItem = (item: any): NativeFormOptionItem => {
    const label = labelField ? item?.[labelField] : item?.label ?? item?.name ?? item?.title
    const value = valueField ? item?.[valueField] : item?.value ?? item?.id ?? item?.key
    const children = childrenField ? item?.[childrenField] : item?.children

    return {
      label: String(label ?? ''),
      value: value ?? '',
      children: Array.isArray(children) ? children.map(mapItem) : undefined,
    }
  }

  return rawList.map(mapItem)
}

const collectRequestFields = (nodes: NativeFormNode[]): NativeFormNode[] =>
  nodes.flatMap((field) => {
    const current = (
      ['select', 'transfer', 'checkableTag', 'radioGroup', 'checkboxGroup', 'cascader', 'treeSelect'].includes(field.type) &&
      field.dataSourceType === 'request' &&
      field.requestConfig?.endpoint
    ) ? [field] : []
    const children = collectRequestFields(getNodeChildren(field))
    return [...current, ...children]
  })

const NativeFormDropSlot: React.FC<NativeFormDropSlotProps> = ({
  slotId,
  placement,
  activeDropSlot,
  setActiveDropSlot,
  draggingNodeId,
  onDropNode,
  onDropField,
  compact = false,
}) => {
  const isActive = activeDropSlot === slotId

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    const isFieldDrag = hasNativeFormFieldDragType(event.dataTransfer)
    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (!isFieldDrag && !movingNodeId) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = movingNodeId ? 'move' : 'copy'
    setActiveDropSlot(slotId)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (movingNodeId) {
      event.preventDefault()
      event.stopPropagation()
      setActiveDropSlot(null)
      onDropNode?.(movingNodeId, placement)
      return
    }

    const fieldType = getNativeFormFieldDragType(event.dataTransfer)
    if (!fieldType) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setActiveDropSlot(null)
    onDropField?.(fieldType, placement)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const isFieldDrag = hasNativeFormFieldDragType(event.dataTransfer)
    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (!isFieldDrag && !movingNodeId) {
      return
    }

    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return
    }

    if (activeDropSlot === slotId) {
      setActiveDropSlot(null)
    }
  }

  return (
    <div
      className={`native-form-canvas__drop-slot ${compact ? 'is-compact' : ''} ${isActive ? 'is-active' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      <span className="native-form-canvas__drop-slot-line" />
    </div>
  )
}

const NativeFormGridCellDrop: React.FC<NativeFormGridCellDropProps> = ({
  parentNodeId,
  cell,
  activeDropSlot,
  setActiveDropSlot,
  draggingNodeId,
  onDropNode,
  onDropField,
  children,
}) => {
  const slotId = buildGridCellSlotId(parentNodeId, cell.id)
  const isActive = activeDropSlot === slotId

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    const isFieldDrag = hasNativeFormFieldDragType(event.dataTransfer)
    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (!isFieldDrag && !movingNodeId) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = movingNodeId ? 'move' : 'copy'
    setActiveDropSlot(slotId)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const placement: NativeFormNodePlacement = {
      parentNodeId,
      targetCellId: cell.id,
    }

    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (movingNodeId) {
      event.preventDefault()
      event.stopPropagation()
      setActiveDropSlot(null)
      onDropNode?.(movingNodeId, placement)
      return
    }

    const fieldType = getNativeFormFieldDragType(event.dataTransfer)
    if (!fieldType) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setActiveDropSlot(null)
    onDropField?.(fieldType, placement)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const isFieldDrag = hasNativeFormFieldDragType(event.dataTransfer)
    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (!isFieldDrag && !movingNodeId) {
      return
    }

    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return
    }

    if (activeDropSlot === slotId) {
      setActiveDropSlot(null)
    }
  }

  return (
    <div
      className={`native-form-canvas__grid-cell ${isActive ? 'is-drop-active' : ''} ${cell.node ? 'has-node' : 'is-empty'}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      <div className="native-form-canvas__grid-cell-inner">
        {children || (
          <div className="native-form-canvas__grid-cell-placeholder">
            拖入字段到此格子
          </div>
        )}
      </div>
    </div>
  )
}

const DesignerSubTablePreview: React.FC<{ field: NativeFormNode }> = ({ field }) => {
  const columns = (field.tableColumns || []).map(column => ({
    title: column.label,
    dataIndex: column.field,
    key: column.id,
    width: column.width,
    render: () => (
      <div className="native-form-canvas__sub-table-cell">
        {column.type === 'select' || column.type === 'radioGroup' || column.type === 'checkboxGroup'
          ? '选项'
          : column.type === 'inputNumber'
            ? '0'
            : column.type === 'datePicker'
              ? '日期'
              : column.type === 'timePicker'
                ? '时间'
                : '输入'}
      </div>
    ),
  }))

  return (
    <div className="native-form-canvas__sub-table-preview">
      <Table
        size="small"
        pagination={false}
        rowKey="id"
        dataSource={[{ id: `${field.id}-preview-row` }]}
        columns={columns}
      />
    </div>
  )
}

const NativeFormCanvasFieldPreview: React.FC<{
  field: NativeFormNode
  layoutMode?: 'vertical' | 'horizontal' | 'inline'
  labelWidth?: number
  labelCol?: Record<string, any>
  wrapperCol?: Record<string, any>
  labelAlign?: 'left' | 'right'
  colon?: boolean
  size?: 'small' | 'middle' | 'large'
  variant?: 'outlined' | 'borderless' | 'filled'
  containerContent?: React.ReactNode
  remoteOptions?: NativeFormOptionItem[]
}> = ({
  field,
  layoutMode = 'vertical',
  labelWidth,
  labelCol,
  wrapperCol,
  labelAlign,
  colon,
  size,
  variant,
  containerContent,
  remoteOptions,
}) => {
  const previewValue = useMemo(() => parseNativeFormDefaultValue(field), [field])
  const labelLayout = getNativeFormFieldLabelLayout(
    field,
    layoutMode,
    labelCol ? undefined : labelWidth,
  )
  const previewLabelLayout = layoutMode === 'horizontal'
    ? {
        labelCol: labelLayout.labelCol || labelCol,
        wrapperCol: labelLayout.wrapperCol || wrapperCol,
      }
    : labelLayout

  if (field.type === 'subTable') {
    return <DesignerSubTablePreview field={field} />
  }

  if (isNativeFormContainerField(field.type)) {
    return (
      <div
        className={`native-form-canvas__container-preview native-form-canvas__container-preview--${field.type}`}
        style={buildContainerPreviewStyle(field)}
      >
        {containerContent}
      </div>
    )
  }

  return (
    <div className="native-form-canvas__control-preview">
      <Form
        layout={layoutMode}
        labelAlign={labelAlign}
        colon={colon}
        size={size}
        variant={variant}
        {...previewLabelLayout}
      >
        <Form.Item
          label={getNativeFormFieldItemLabel(field)}
          required={field.required}
          className={getNativeFormFieldItemClassName('native-form-canvas__preview-item', field)}
          style={getNativeFormFieldItemStyle(field)}
          tooltip={field.itemProps?.tooltip}
          labelAlign={field.itemProps?.labelAlign}
          colon={colon}
          {...previewLabelLayout}
        >
          <div style={getNativeFormFieldControlStyle(field)}>
            <NativeFormFieldControl
              field={field}
              options={remoteOptions || field.options}
              value={previewValue}
              onClick={() => undefined}
            />
          </div>
        </Form.Item>
      </Form>
    </div>
  )
}

const NativeFormCanvasNode: React.FC<NativeFormCanvasNodeProps> = ({
  field,
  level,
  parentNodeId,
  selectedNodeId,
  draggingNodeId,
  layoutMode,
  labelWidth,
  labelCol,
  wrapperCol,
  fieldSpacing = 16,
  labelAlign,
  colon,
  size,
  variant,
  onDragNodeStart,
  onDragNodeEnd,
  onSelectNode,
  onMoveUp,
  onMoveDown,
  onMoveNode,
  onDeleteNode,
  onDuplicateNode,
  onDropField,
  activeDropSlot,
  setActiveDropSlot,
  remoteOptionsMap,
}) => {
  const isSelected = selectedNodeId === field.id
  const isContainer = isNativeFormContainerField(field.type)
  const childNodes = getNodeChildren(field)
  const childCount = childNodes.length
  const beforeSlotId = buildSlotId(parentNodeId, field.id)
  const appendSlotId = buildSlotId(field.id, null)
  const isContainerDropActive = activeDropSlot?.startsWith(`${field.id}::`) || false

  const handleContainerDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    const isFieldDrag = hasNativeFormFieldDragType(event.dataTransfer)
    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if ((!isFieldDrag && !movingNodeId) || !isContainer || field.type === 'grid') {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = movingNodeId ? 'move' : 'copy'
    const placement = resolveListPlacementFromPointer(event, field.id)
    setActiveDropSlot(getPlacementSlotId(placement))
  }

  const handleContainerDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isContainer || field.type === 'grid') {
      return
    }

    const placement = resolveListPlacementFromPointer(event, field.id)

    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (movingNodeId) {
      event.preventDefault()
      event.stopPropagation()
      setActiveDropSlot(null)
      onMoveNode(movingNodeId, placement)
      return
    }

    const fieldType = getNativeFormFieldDragType(event.dataTransfer)
    if (!fieldType) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setActiveDropSlot(null)
    onDropField?.(fieldType, placement)
  }

  const handleContainerDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const isFieldDrag = hasNativeFormFieldDragType(event.dataTransfer)
    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if ((!isFieldDrag && !movingNodeId) || !isContainer || field.type === 'grid') {
      return
    }

    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return
    }

    if (activeDropSlot?.startsWith(`${field.id}::`)) {
      setActiveDropSlot(null)
    }
  }

  const handleNodeDragStart = (event: React.DragEvent<HTMLButtonElement | HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${NATIVE_FORM_NODE_DRAG_TEXT_PREFIX}${field.id}`)
    onDragNodeStart?.(field.id)
  }

  const handleNodeDragEnd = () => {
    onDragNodeEnd?.()
    setActiveDropSlot(null)
  }

  const renderChildren = () => {
    if (!isContainer) {
      return null
    }

    if (field.type === 'grid') {
      return (
        <div
          className="native-form-canvas__grid-layout"
          style={buildGridLayoutStyle(field)}
        >
          {(field.gridCells || []).map((cell) => (
            <NativeFormGridCellDrop
              key={cell.id}
              parentNodeId={field.id}
              cell={cell}
              activeDropSlot={activeDropSlot}
              setActiveDropSlot={setActiveDropSlot}
              draggingNodeId={draggingNodeId}
              onDropNode={onMoveNode}
              onDropField={onDropField}
            >
              {cell.node ? (
                <NativeFormCanvasNode
                  field={cell.node}
                  level={level + 1}
                  parentNodeId={field.id}
                  selectedNodeId={selectedNodeId}
                  draggingNodeId={draggingNodeId}
                  layoutMode={layoutMode}
                  labelWidth={labelWidth}
                  labelCol={labelCol}
                  wrapperCol={wrapperCol}
                  fieldSpacing={fieldSpacing}
                  labelAlign={labelAlign}
                  colon={colon}
                  size={size}
                  variant={variant}
                  onDragNodeStart={onDragNodeStart}
                  onDragNodeEnd={onDragNodeEnd}
                  onSelectNode={onSelectNode}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onMoveNode={onMoveNode}
                  onDeleteNode={onDeleteNode}
                  onDuplicateNode={onDuplicateNode}
                  onDropField={onDropField}
                  activeDropSlot={activeDropSlot}
                  setActiveDropSlot={setActiveDropSlot}
                  remoteOptionsMap={remoteOptionsMap}
                />
              ) : null}
            </NativeFormGridCellDrop>
          ))}
        </div>
      )
    }

    return (
      <div
        className={`native-form-canvas__children native-form-canvas__children--${field.type} ${childCount === 0 ? 'is-empty' : ''} ${isContainerDropActive ? 'is-drop-active' : ''}`}
        style={field.type === 'flex' ? buildFlexLayoutStyle(field) : undefined}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        onDragLeave={handleContainerDragLeave}
      >
        {childCount > 0 ? (
          <>
            {childNodes.map((child) => (
              <NativeFormCanvasNode
                key={child.id}
                field={child}
                level={level + 1}
                parentNodeId={field.id}
                selectedNodeId={selectedNodeId}
                draggingNodeId={draggingNodeId}
                layoutMode={layoutMode}
                labelWidth={labelWidth}
                labelCol={labelCol}
                wrapperCol={wrapperCol}
                fieldSpacing={fieldSpacing}
                labelAlign={labelAlign}
                colon={colon}
                size={size}
                variant={variant}
                onDragNodeStart={onDragNodeStart}
                onDragNodeEnd={onDragNodeEnd}
                onSelectNode={onSelectNode}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onMoveNode={onMoveNode}
                onDeleteNode={onDeleteNode}
                onDuplicateNode={onDuplicateNode}
                onDropField={onDropField}
                activeDropSlot={activeDropSlot}
                setActiveDropSlot={setActiveDropSlot}
                remoteOptionsMap={remoteOptionsMap}
              />
            ))}

            <NativeFormDropSlot
              slotId={appendSlotId}
              placement={{ parentNodeId: field.id }}
              activeDropSlot={activeDropSlot}
              setActiveDropSlot={setActiveDropSlot}
              draggingNodeId={draggingNodeId}
              onDropNode={onMoveNode}
              onDropField={onDropField}
              compact
            />
          </>
        ) : (
          <div className="native-form-canvas__children-empty">
            <NativeFormDropSlot
              slotId={appendSlotId}
              placement={{ parentNodeId: field.id }}
              activeDropSlot={activeDropSlot}
              setActiveDropSlot={setActiveDropSlot}
              draggingNodeId={draggingNodeId}
              onDropNode={onMoveNode}
              onDropField={onDropField}
            />
            <span>拖入表单字段到当前容器</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`native-form-canvas__node native-form-canvas__node--level-${Math.min(level, 3)}`}
      data-node-id={field.id}
    >
      {parentNodeId || level === 0 ? (
        <NativeFormDropSlot
          slotId={beforeSlotId}
          placement={{ parentNodeId, beforeNodeId: field.id }}
          activeDropSlot={activeDropSlot}
          setActiveDropSlot={setActiveDropSlot}
          draggingNodeId={draggingNodeId}
          onDropNode={onMoveNode}
          onDropField={onDropField}
          compact
        />
      ) : null}

      <div
        className={`native-form-canvas__field ${isContainer ? 'is-container-field' : ''} ${isSelected ? 'is-selected' : ''} ${draggingNodeId === field.id ? 'is-dragging' : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          onSelectNode(field.id)
        }}
      >
        <div className="native-form-canvas__field-outline" />
        <div className="native-form-canvas__field-content">
          <NativeFormCanvasFieldPreview
            field={field}
            layoutMode={layoutMode}
            labelWidth={labelWidth}
            labelCol={parseNativeFormLayoutCol(labelCol)}
            wrapperCol={parseNativeFormLayoutCol(wrapperCol)}
            labelAlign={labelAlign}
            colon={colon}
            size={size}
            variant={variant}
            containerContent={renderChildren()}
            remoteOptions={remoteOptionsMap[field.id]}
          />
        </div>

        {isSelected ? (
          <div
            className="native-form-canvas__field-actions"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="primary"
              size="small"
              className="native-form-canvas__helper-button"
              icon={<CopyOutlined />}
              onClick={() => onDuplicateNode(field.id)}
            />
            <Button
              type="primary"
              size="small"
              className="native-form-canvas__helper-button native-form-canvas__helper-button--drag"
              icon={<DragOutlined />}
              draggable
              onDragStart={handleNodeDragStart}
              onDragEnd={handleNodeDragEnd}
            />
            <Button
              type="primary"
              danger
              size="small"
              className="native-form-canvas__helper-button"
              icon={<DeleteOutlined />}
              onClick={() => onDeleteNode(field.id)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

const NativeFormCanvas: React.FC<NativeFormCanvasProps> = ({
  fields,
  selectedNodeId,
  draggingNodeId,
  layoutMode = 'vertical',
  labelWidth,
  labelCol,
  wrapperCol,
  fieldSpacing = 16,
  labelAlign,
  colon,
  size,
  variant,
  appearance,
  onDragNodeStart,
  onDragNodeEnd,
  onSelectNode,
  onMoveUp,
  onMoveDown,
  onMoveNode,
  onDeleteNode,
  onDuplicateNode,
  onDropField,
}) => {
  const [activeDropSlot, setActiveDropSlot] = useState<string | null>(null)
  const [remoteOptionsMap, setRemoteOptionsMap] = useState<Record<string, NativeFormOptionItem[]>>({})
  const rootAppendSlotId = buildSlotId(null, null)
  const isRootDropActive = activeDropSlot?.startsWith('root::') || false
  const parsedLabelCol = useMemo(() => parseNativeFormLayoutCol(labelCol), [labelCol])
  const parsedWrapperCol = useMemo(() => parseNativeFormLayoutCol(wrapperCol), [wrapperCol])
  const previewLabelCol = parsedLabelCol || { span: 6 }
  const previewWrapperCol = parsedWrapperCol || { span: 12 }
  const bodyStyle = useMemo(() => buildCanvasBodyStyle(appearance), [appearance])

  const canvasStyle = {
    ...bodyStyle,
    '--native-form-field-gap': `${fieldSpacing}px`,
  } as React.CSSProperties

  useEffect(() => {
    let cancelled = false

    const loadOptions = async () => {
      const requestFields = collectRequestFields(fields)
      const nextMap: Record<string, NativeFormOptionItem[]> = {}

      for (const field of requestFields) {
        try {
          const method = field.requestConfig?.method || 'GET'
          const response = await axios({
            method,
            url: field.requestConfig?.endpoint,
            headers: field.requestConfig?.headers,
            params: parseJsonConfig(field.requestConfig?.query),
            ...(method === 'GET' ? {} : { data: parseJsonConfig(field.requestConfig?.body) }),
          })
          nextMap[field.id] = resolveRemoteOptions(response.data, field)
        } catch (error) {
          console.error('原生表单设计态字段远程选项加载失败:', error)
          nextMap[field.id] = []
        }
      }

      if (!cancelled) {
        setRemoteOptionsMap(nextMap)
      }
    }

    void loadOptions()

    return () => {
      cancelled = true
    }
  }, [fields])

  const handleRootDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    const isFieldDrag = hasNativeFormFieldDragType(event.dataTransfer)
    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (!isFieldDrag && !movingNodeId) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = movingNodeId ? 'move' : 'copy'
    const placement = resolveListPlacementFromPointer(event, null)
    setActiveDropSlot(getPlacementSlotId(placement))
  }

  const handleRootDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const placement = resolveListPlacementFromPointer(event, null)

    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (movingNodeId) {
      event.preventDefault()
      event.stopPropagation()
      setActiveDropSlot(null)
      onMoveNode(movingNodeId, placement)
      return
    }

    const fieldType = getNativeFormFieldDragType(event.dataTransfer)
    if (!fieldType) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setActiveDropSlot(null)
    onDropField?.(fieldType, placement)
  }

  const handleRootDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const isFieldDrag = hasNativeFormFieldDragType(event.dataTransfer)
    const movingNodeId = draggingNodeId || getDraggingNodeIdFromTransfer(event.dataTransfer)
    if (!isFieldDrag && !movingNodeId) {
      return
    }

    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return
    }

    if (activeDropSlot?.startsWith('root::')) {
      setActiveDropSlot(null)
    }
  }

  const renderCanvasContent = () => {
    if (!fields.length) {
      return (
        <>
          <div className="native-form-canvas__empty-content">
            <Typography.Text strong>原生表单</Typography.Text>
            <Typography.Text type="secondary">
              当前表单还没有字段，可以从左侧“表单”Tab 点击或拖入字段。
            </Typography.Text>
          </div>
          <NativeFormDropSlot
            slotId={rootAppendSlotId}
            placement={{ parentNodeId: null }}
            activeDropSlot={activeDropSlot}
            setActiveDropSlot={setActiveDropSlot}
            draggingNodeId={draggingNodeId}
            onDropField={onDropField}
          />
        </>
      )
    }

    return (
      <>
        {fields.map((field) => (
          <NativeFormCanvasNode
            key={field.id}
            field={field}
            level={0}
            parentNodeId={null}
            selectedNodeId={selectedNodeId}
            draggingNodeId={draggingNodeId}
            layoutMode={layoutMode}
            labelWidth={labelWidth}
            labelCol={previewLabelCol}
            wrapperCol={previewWrapperCol}
            fieldSpacing={fieldSpacing}
            labelAlign={labelAlign}
            colon={colon}
            size={size}
            variant={variant}
            onDragNodeStart={onDragNodeStart}
            onDragNodeEnd={onDragNodeEnd}
            onSelectNode={onSelectNode}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onMoveNode={onMoveNode}
            onDeleteNode={onDeleteNode}
            onDuplicateNode={onDuplicateNode}
            onDropField={onDropField}
            activeDropSlot={activeDropSlot}
            setActiveDropSlot={setActiveDropSlot}
            remoteOptionsMap={remoteOptionsMap}
          />
        ))}

        <NativeFormDropSlot
          slotId={rootAppendSlotId}
          placement={{ parentNodeId: null }}
          activeDropSlot={activeDropSlot}
          setActiveDropSlot={setActiveDropSlot}
          draggingNodeId={draggingNodeId}
          onDropNode={onMoveNode}
          onDropField={onDropField}
        />
      </>
    )
  }

  return (
    <div className="native-form-canvas-shell">
      <div
        className={`native-form-canvas ${!fields.length ? 'native-form-canvas--empty' : ''} ${isRootDropActive ? 'is-drop-active' : ''}`}
        style={canvasStyle}
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
        onDragLeave={handleRootDragLeave}
      >
        {renderCanvasContent()}
      </div>
    </div>
  )
}

export default NativeFormCanvas
