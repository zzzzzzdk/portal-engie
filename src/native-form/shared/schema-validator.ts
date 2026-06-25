import { v4 as uuidv4 } from 'uuid'
import type { NativeFormGridCell, NativeFormNode, NativeFormSchema } from '@/types'
import { cloneNativeFormSchema } from '@/native-form/shared/defaults'
import { getNativeFormFieldManifest } from '@/native-form/manifests'
import { createNativeFormFieldNode, isNativeFormContainerField } from '@/native-form/shared/field-factory'

export interface NativeFormSchemaValidationResult {
  valid: boolean
  errors: string[]
}

const getNodeChildren = (node: NativeFormNode): NativeFormNode[] => {
  if (node.type === 'grid') {
    return (node.gridCells || [])
      .map(cell => cell.node || null)
      .filter(Boolean) as NativeFormNode[]
  }

  return Array.isArray(node.children) ? node.children : []
}

const collectSchemaErrors = (
  nodes: NativeFormNode[],
  options?: {
    parentPath?: string
    nodeIds?: Set<string>
    fieldNames?: Set<string>
  },
): string[] => {
  const parentPath = options?.parentPath || '表单'
  const nodeIds = options?.nodeIds || new Set<string>()
  const fieldNames = options?.fieldNames || new Set<string>()
  const errors: string[] = []

  nodes.forEach((node, index) => {
    const manifest = getNativeFormFieldManifest(node.type)
    const supports = manifest?.supports || {}
    const nodeLabel = node.label || node.field || node.type || `节点${index + 1}`
    const nodePath = `${parentPath} / ${nodeLabel}`

    if (!node.id?.trim()) {
      errors.push(`${nodePath} 缺少节点 id`)
    } else if (nodeIds.has(node.id)) {
      errors.push(`${nodePath} 的节点 id 重复：${node.id}`)
    } else {
      nodeIds.add(node.id)
    }

    if (supports.fieldName) {
      const fieldName = node.field?.trim()
      if (!fieldName) {
        errors.push(`${nodePath} 缺少字段名`)
      } else if (fieldNames.has(fieldName)) {
        errors.push(`${nodePath} 的字段名重复：${fieldName}`)
      } else {
        fieldNames.add(fieldName)
      }
    }

    if (isNativeFormContainerField(node.type)) {
      if (node.type === 'subTable') {
        const columnFieldNames = new Set<string>()
        ;(node.tableColumns || []).forEach((column, columnIndex) => {
          const columnLabel = column.label || column.field || `列${columnIndex + 1}`
          const columnPath = `${nodePath} / ${columnLabel}`

          if (!column.id?.trim()) {
            errors.push(`${columnPath} 缺少列 id`)
          }

          const columnField = column.field?.trim()
          if (!columnField) {
            errors.push(`${columnPath} 缺少列字段名`)
          } else if (columnFieldNames.has(columnField)) {
            errors.push(`${columnPath} 的列字段名重复：${columnField}`)
          } else {
            columnFieldNames.add(columnField)
          }
        })
      } else if (node.tableColumns?.length) {
        errors.push(`${nodePath} 不是子表格，不能包含 tableColumns`)
      }

      if (node.type === 'grid') {
        if (!Array.isArray(node.gridCells) || node.gridCells.length !== Math.max(1, Number(node.columns || 1))) {
          errors.push(`${nodePath} 的栅格单元数量与列数不一致`)
        }

        ;(node.gridCells || []).forEach((cell, cellIndex) => {
          if (!cell.id?.trim()) {
            errors.push(`${nodePath} 的第 ${cellIndex + 1} 个栅格单元缺少 id`)
          }
        })
      } else if (node.gridCells?.length) {
        errors.push(`${nodePath} 不是栅格，不能包含 gridCells`)
      }

      const childNodes = getNodeChildren(node)
      if (childNodes.length > 0) {
        errors.push(...collectSchemaErrors(childNodes, {
          parentPath: nodePath,
          nodeIds,
          fieldNames,
        }))
      }
    } else {
      if (Array.isArray(node.children) && node.children.length > 0) {
        errors.push(`${nodePath} 不是容器字段，不能包含子节点`)
      }

      if (Array.isArray(node.gridCells) && node.gridCells.length > 0) {
        errors.push(`${nodePath} 不是栅格字段，不能包含 gridCells`)
      }
    }
  })

  return errors
}

export const validateNativeFormSchema = (
  schema?: NativeFormSchema | null,
): NativeFormSchemaValidationResult => {
  if (!schema) {
    return {
      valid: false,
      errors: ['表单 schema 不能为空'],
    }
  }

  if (!Array.isArray(schema.children)) {
    return {
      valid: false,
      errors: ['表单 schema.children 必须为数组'],
    }
  }

  const errors = collectSchemaErrors(schema.children)
  return {
    valid: errors.length === 0,
    errors,
  }
}

const makeUniqueFieldName = (rawField: string | undefined, usedFields: Set<string>) => {
  const base = (rawField?.trim() || 'field').replace(/\s+/g, '_')
  if (!usedFields.has(base)) {
    usedFields.add(base)
    return base
  }

  let index = 2
  let next = `${base}_${index}`
  while (usedFields.has(next)) {
    index += 1
    next = `${base}_${index}`
  }
  usedFields.add(next)
  return next
}

const regenerateGridCells = (
  cells: NativeFormGridCell[] | undefined,
  usedFields: Set<string>,
) => (cells || []).map(cell => ({
  ...cell,
  id: uuidv4(),
  node: cell.node ? regenerateNodeIdentity(cell.node, usedFields) : null,
}))

const regenerateNodeIdentity = (
  node: NativeFormNode,
  usedFields: Set<string>,
): NativeFormNode => {
  const manifest = getNativeFormFieldManifest(node.type)
  const supports = manifest?.supports || {}
  const nextNode: NativeFormNode = {
    ...node,
    id: uuidv4(),
  }

  if (supports.fieldName) {
    nextNode.field = makeUniqueFieldName(node.field, usedFields)
  }

  if (node.type === 'subTable') {
    const usedColumnFields = new Set<string>()
    nextNode.tableColumns = (node.tableColumns || []).map(column => ({
      ...column,
      id: uuidv4(),
      field: makeUniqueFieldName(column.field, usedColumnFields),
    }))
  }

  if (node.type === 'grid') {
    nextNode.gridCells = regenerateGridCells(node.gridCells, usedFields)
    nextNode.children = undefined
    return nextNode
  }

  if (Array.isArray(node.children) && node.children.length > 0) {
    nextNode.children = node.children.map(child => regenerateNodeIdentity(child, usedFields))
  }

  return nextNode
}

const collectUsedFieldNames = (
  nodes: NativeFormNode[],
  result: Set<string> = new Set<string>(),
) => {
  nodes.forEach(node => {
    const manifest = getNativeFormFieldManifest(node.type)
    if (manifest?.supports.fieldName && node.field?.trim()) {
      result.add(node.field.trim())
    }

    getNodeChildren(node).forEach(child => {
      collectUsedFieldNames([child], result)
    })
  })

  return result
}

export const duplicateNativeFormNode = (
  sourceNode: NativeFormNode,
  schema: NativeFormSchema,
): NativeFormNode => {
  const usedFields = collectUsedFieldNames(schema.children)
  return regenerateNodeIdentity(sourceNode, usedFields)
}

export const normalizeImportedNativeFormSchema = (
  input: unknown,
): NativeFormSchema => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('导入内容不是合法的表单 schema 对象')
  }

  const schema = cloneNativeFormSchema(input as NativeFormSchema)
  const validation = validateNativeFormSchema(schema)
  if (!validation.valid) {
    throw new Error(validation.errors[0] || '导入的表单 schema 不合法')
  }

  return schema
}

export const createEmptyDuplicateField = (type: NativeFormNode['type']) =>
  createNativeFormFieldNode(type)
