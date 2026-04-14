import React, { useEffect, useMemo } from 'react'
import { Divider, Form, Modal, message } from 'antd'
import { useStore } from '@/store/useStore'
import { DashboardConfig } from '@/types'
import BackgroundSettings from '@/components/BackgroundSettings'
import GlobalThemeReferenceFields from '@/components/GlobalThemeReferenceFields'
import { useGlobalConfigStore } from '@/store/useGlobalConfigStore'
import {
  buildBackgroundFormValues,
  getDefaultGlobalThemeId,
  getGlobalThemeOptions,
  getGlobalThemeScheme,
} from '@/utils/global-config'

interface DashboardConfigDialogProps {
  isOpen: boolean
  onClose: () => void
}

const normalizeColorValue = (value: any, fallbackValue?: string) => {
  if (!value) {
    return fallbackValue
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && typeof value.toRgbString === 'function') {
    return value.toRgbString()
  }

  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString()
  }

  if (typeof value === 'object' && value.metaColor) {
    const { r, g, b, a } = value.metaColor
    if (a !== undefined && a < 1) {
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }

  return fallbackValue
}

const DashboardConfigDialog: React.FC<DashboardConfigDialogProps> = ({ isOpen, onClose }) => {
  const { dashboardConfig, updateDashboardConfig } = useStore()
  const globalConfigDetail = useGlobalConfigStore(state => state.detail)
  const ensureGlobalConfigLoaded = useGlobalConfigStore(state => state.ensureLoaded)
  const [form] = Form.useForm()

  const pageBackgroundUseGlobalConfig =
    Form.useWatch('pageBackgroundUseGlobalConfig', form) ?? false
  const pageBackgroundGlobalThemeId = Form.useWatch('pageBackgroundGlobalThemeId', form)
  const globalThemeOptions = useMemo(() => getGlobalThemeOptions(globalConfigDetail), [globalConfigDetail])

  useEffect(() => {
    if (isOpen) {
      void ensureGlobalConfigLoaded()
    }
  }, [ensureGlobalConfigLoaded, isOpen])

  useEffect(() => {
    if (isOpen && dashboardConfig) {
      form.setFieldsValue({
        ...buildBackgroundFormValues(dashboardConfig as any),
        pageBackgroundUseGlobalConfig:
          (dashboardConfig as any).pageBackgroundUseGlobalConfig ?? false,
        pageBackgroundGlobalThemeId: (dashboardConfig as any).pageBackgroundGlobalThemeId,
      })
    }
  }, [dashboardConfig, form, isOpen])

  useEffect(() => {
    if (!isOpen || !globalConfigDetail || !pageBackgroundUseGlobalConfig) {
      return
    }

    const nextThemeId = pageBackgroundGlobalThemeId || getDefaultGlobalThemeId(globalConfigDetail)
    if (!pageBackgroundGlobalThemeId && nextThemeId) {
      form.setFieldValue('pageBackgroundGlobalThemeId', nextThemeId)
      return
    }

    const theme = getGlobalThemeScheme(globalConfigDetail, nextThemeId)
    if (!theme?.pageBackground) {
      return
    }

    form.setFieldsValue(buildBackgroundFormValues(theme.pageBackground))
  }, [
    form,
    globalConfigDetail,
    isOpen,
    pageBackgroundGlobalThemeId,
    pageBackgroundUseGlobalConfig,
  ])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()

      const config: Partial<DashboardConfig> & {
        pageBackgroundUseGlobalConfig?: boolean
        pageBackgroundGlobalThemeId?: string
      } = {
        ...buildBackgroundFormValues(values),
        backgroundColor: normalizeColorValue(values.backgroundColor, '#f5f5f5'),
        pageBackgroundUseGlobalConfig: values.pageBackgroundUseGlobalConfig ?? false,
        pageBackgroundGlobalThemeId: values.pageBackgroundGlobalThemeId,
      }

      updateDashboardConfig(config as any)
      message.success('页面设置已更新')
      onClose()
    } catch (error) {
      console.error('Failed to update dashboard config:', error)
    }
  }

  return (
    <Modal title="页面设置" open={isOpen} onOk={handleOk} onCancel={onClose} width={560}>
      <Form form={form} layout="vertical">
        <Divider>页面背景</Divider>
        <GlobalThemeReferenceFields
          form={form}
          useFieldName="pageBackgroundUseGlobalConfig"
          themeIdFieldName="pageBackgroundGlobalThemeId"
          options={globalThemeOptions}
          hint="开启后会自动填充全局主题中的页面背景设置，引用期间不可编辑。"
        />
        <BackgroundSettings
          form={form}
          initialValues={dashboardConfig}
          showEffects={false}
          disabled={pageBackgroundUseGlobalConfig}
        />
      </Form>
    </Modal>
  )
}

export default DashboardConfigDialog
