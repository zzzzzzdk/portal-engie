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

const getReadableDataType = (value: unknown) => {
  if (value === undefined) {
    return '未解析到数据'
  }

  if (value === null) {
    return '空值'
  }

  if (Array.isArray(value)) {
    return '数组'
  }

  switch (typeof value) {
    case 'object':
      return '对象'
    case 'string':
      return '字符串'
    case 'number':
      return '数字'
    case 'boolean':
      return '布尔值'
    default:
      return '未知类型'
  }
}

const getDataDebugTip = (value: unknown, dataField?: string) => {
  if (value !== undefined) {
    return undefined
  }

  if (dataField?.trim()) {
    return `当前数据字段未取到值，请检查字段路径“${dataField}”是否正确`
  }

  return '接口未返回可解析的数据'
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
        message.warning('请先填写接口地址')
        return
      }

      setLoading(true)
      const pageState = buildPageState?.(values)
      const requestConfig = buildWidgetApiRequest(config, pageState)
      const result = await requestWidgetApi(config, pageState)

      Modal.info({
        title: '接口调试结果',
        width: 860,
        // footer: null,
        content: (
          <div style={{ display: 'grid', gap: 12, maxHeight: '70vh', overflow: 'auto' }}>
            <div>
              <Typography.Text strong>{'请求配置'}</Typography.Text>
              <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(requestConfig, null, 2)}
              </pre>
            </div>
            {/* <div>
              <Typography.Text strong>{'解析结果'}</Typography.Text>
              <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(
                  {
                    dataType: getReadableDataType(result.data),
                    dataTip: getDataDebugTip(result.data, config.dataField),
                    listLength: result.list.length,
                    resolvedPaths: result.resolvedPaths,
                    pagination: result.pagination,
                  },
                  null,
                  2,
                )}
              </pre>
            </div> */}
            <div>
              <Typography.Text strong>{'响应预览'}</Typography.Text>
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
      message.error(error?.message || '接口调试失败')
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
      接口调试
    </Button>
  )
}

export default WidgetApiDebugButton
