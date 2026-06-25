import type { LocalTemplateRecord } from '@/types/local-component-library'

const templateRegistry = new Map<string, LocalTemplateRecord>()

export const setLocalTemplateRegistry = (templates: LocalTemplateRecord[]) => {
  templateRegistry.clear()
  templates.forEach((template) => {
    templateRegistry.set(template.id, template)
  })
}

export const upsertLocalTemplateRegistryItem = (template: LocalTemplateRecord) => {
  templateRegistry.set(template.id, template)
}

export const removeLocalTemplateRegistryItem = (templateId: string) => {
  templateRegistry.delete(templateId)
}

export const getLocalTemplateRegistryItem = (templateId: string) => {
  return templateRegistry.get(templateId) || null
}

export const clearLocalTemplateRegistry = () => {
  templateRegistry.clear()
}
