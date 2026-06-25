import type { Widget, WidgetGroup } from './index'

export type LocalTemplateScope = 'widget' | 'group'

export interface LocalTemplateSourceMeta {
  sourceSignature: string
  sourceTemplateId?: string
  sourceTemplateName?: string
  sourceType?: 'system' | 'local-template'
  sourceKey?: string
  sourceUpdatedAt?: string
}

export interface LocalTemplateCategory {
  id: string
  name: string
  sort: number
  builtIn?: boolean
  createdAt: string
  updatedAt: string
  templateCount?: number
}

export interface LocalTemplateWidgetSnapshot {
  scope: 'widget'
  widget: Widget
}

export interface LocalTemplateGroupSnapshot {
  scope: 'group'
  group: WidgetGroup
  widgets: Widget[]
}

export type LocalTemplateSnapshot =
  | LocalTemplateWidgetSnapshot
  | LocalTemplateGroupSnapshot

export interface LocalTemplateRecord {
  id: string
  name: string
  categoryId: string
  scope: LocalTemplateScope
  sourceSignature: string
  createdAt: string
  updatedAt: string
  snapshot: LocalTemplateSnapshot
}
