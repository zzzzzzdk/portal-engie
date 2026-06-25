import { getLocalTemplateById } from '@/services/local-component-library'
import type { LocalTemplateRecord } from '@/types/local-component-library'
import { getLocalTemplateRegistryItem, upsertLocalTemplateRegistryItem } from './local-template-registry'

export const resolveLocalTemplateRecord = async (templateId: string) => {
  const cachedTemplate = getLocalTemplateRegistryItem(templateId)
  if (cachedTemplate) {
    return cachedTemplate
  }

  const response = await getLocalTemplateById(templateId)
  const template = (response.data || null) as LocalTemplateRecord | null

  if (template) {
    upsertLocalTemplateRegistryItem(template)
  }

  return template
}
