import ajax from '@/utils/axios.config'
import type {
  LocalTemplateCategory,
  LocalTemplateRecord,
  LocalTemplateSnapshot,
} from '@/types/local-component-library'

export interface LocalTemplateListParams {
  categoryId?: string
  keyword?: string
}

export const getLocalTemplateCategories = () => {
  return ajax<LocalTemplateCategory[]>({
    method: 'get',
    url: '/v1/component-templates/categories',
  })
}

export const createLocalTemplateCategory = (data: { name: string }) => {
  return ajax<LocalTemplateCategory>({
    method: 'post',
    url: '/v1/component-templates/categories',
    data,
  })
}

export const deleteLocalTemplateCategory = (data: { id: string }) => {
  return ajax<{ success: boolean }>({
    method: 'post',
    url: '/v1/component-templates/categories/delete',
    data,
  })
}

export const getLocalTemplates = (data?: LocalTemplateListParams) => {
  return ajax<LocalTemplateRecord[]>({
    method: 'get',
    url: '/v1/component-templates/templates',
    data,
  })
}

export const getLocalTemplateById = (id: string) => {
  return ajax<LocalTemplateRecord | null>({
    method: 'get',
    url: `/v1/component-templates/templates/${id}`,
  })
}

export const createLocalTemplate = (data: {
  name: string
  categoryId: string
  sourceSignature: string
  snapshot: LocalTemplateSnapshot
}) => {
  return ajax<LocalTemplateRecord>({
    method: 'post',
    url: '/v1/component-templates/templates',
    data,
  })
}

export const deleteLocalTemplate = (data: { id: string }) => {
  return ajax<{ success: boolean }>({
    method: 'post',
    url: '/v1/component-templates/templates/delete',
    data,
  })
}
