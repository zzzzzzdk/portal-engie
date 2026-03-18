import React, { useState } from 'react'
import { Button, FormInstance, Modal, Typography, message } from 'antd'
import { ApiOutlined } from '@ant-design/icons'
import {
  WidgetApiConfig,
  WidgetApiPageState,
  buildWidgetApiRequest,
  requestWidgetApi,
} from '@/utils/widgetApi'

interface WidgetApiDebugButtonProps {
  form: FormInstance
  buildConfig: (formValues: any) => WidgetApiConfig | null
  buildPageState?: (formValues: any) => WidgetApiPageState | undefined
  disabled?: boolean
}

const WidgetApiDebugButton: React.FC<WidgetApiDebugButtonProps> = ({
  form,
  buildConfig,
  buildPageState,
  disabled,
}) => {
  const [loading, setLoading] = useState(false)

  const handleDebug = async () => {
    try {
      const values = await form.validateFields()
      const config = buildConfig(values)

      if (!config?.endpoint?.trim()) {
        message.warning('\u8bf7\u5148\u586b\u5199\u63a5\u53e3\u5730\u5740')
        return
      }

      setLoading(true)
      const pageState = buildPageState?.(values)
      const requestConfig = buildWidgetApiRequest(config, pageState)
      const result = await requestWidgetApi(config, pageState)

      Modal.info({
        title: '\u63a5\u53e3\u8c03\u8bd5\u7ed3\u679c',
        width: 860,
        content: (
          <div style={{ display: 'grid', gap: 12, maxHeight: '70vh', overflow: 'auto' }}>
            <div>
              <Typography.Text strong>{'\u8bf7\u6c42\u914d\u7f6e'}</Typography.Text>
              <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(requestConfig, null, 2)}
              </pre>
            </div>
            <div>
              <Typography.Text strong>{'\u89e3\u6790\u7ed3\u679c'}</Typography.Text>
              <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(
                  {
                    dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
                    listLength: result.list.length,
                    resolvedPaths: result.resolvedPaths,
                    pagination: result.pagination,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
            <div>
              <Typography.Text strong>{'\u54cd\u5e94\u9884\u89c8'}</Typography.Text>
              <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </div>
          </div>
        ),
      })
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      message.error(error?.message || '\u63a5\u53e3\u8c03\u8bd5\u5931\u8d25')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      icon={<ApiOutlined />}
      onClick={handleDebug}
      loading={loading}
      disabled={disabled}
    >
      {'\u63a5\u53e3\u8c03\u8bd5'}
    </Button>
  )
}

export default WidgetApiDebugButton
