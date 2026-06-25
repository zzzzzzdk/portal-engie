import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Popover, Spin } from 'antd'
import {
  EllipsisOutlined,
  LinkOutlined,
  LockOutlined,
  PictureOutlined,
} from '@ant-design/icons'
import IconRenderer from '@/components/IconRenderer'
import { safeIntervalMs } from '@/constants/dashboard'
import { useSystemStore } from '@/store/useSystemStore'
import type {
  RecognitionCardQuickLink,
  RecognitionCardWidgetConfig,
  Widget,
} from '@/types'
import { buildDeployedSystemSet, isSystemDeployed } from '@/utils/systemDeployment'
import { getWidgetDefaultFieldValue } from '@/utils/widgetApiDefaults'
import { getValueByPath, requestWidgetApi } from '@/utils/widgetApi'
import { useWidgetEventEmitter } from '@/hooks/useWidgetEventEmitter'
import { useWidgetEventInputs } from '@/hooks/useWidgetEventInputs'
import { useWidgetRuntimeParams } from '@/hooks/useWidgetRuntimeParams'
import './index.scss'

interface RecognitionCardWidgetProps {
  config?: RecognitionCardWidgetConfig
  widget?: Widget
  isEditMode?: boolean
}

const DEFAULT_INFO_ICON = 'InfoCircleOutlined'
const EMPTY_IMAGE_TEXT = '暂无图片'

const formatSimilarity = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '--'
  }
  return `${numeric.toFixed(2)}%`
}

const normalizeQuickLinks = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const link = item as RecognitionCardQuickLink
      const title = typeof link.title === 'string' ? link.title.trim() : ''
      if (!title) {
        return null
      }

      return {
        id: link.id || `quick-link-${index}`,
        title,
        url: typeof link.url === 'string' ? link.url.trim() : '',
        systemId: link.systemId,
        openInNew: link.openInNew ?? false,
      }
    })
    .filter(Boolean) as RecognitionCardQuickLink[]
}

const RecognitionCardWidget: React.FC<RecognitionCardWidgetProps> = ({
  config,
  widget,
  isEditMode,
}) => {
  const widgetConfig = config as RecognitionCardWidgetConfig
  const sysConfig = useSystemStore(state => state.sysConfig)
  const deployedSystemSet = useMemo(() => buildDeployedSystemSet(sysConfig), [sysConfig])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const emitWidgetEvent = useWidgetEventEmitter(widget)
  const { runtimeParamsRef, setRuntimeParams, clearRuntimeParams } = useWidgetRuntimeParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordData, setRecordData] = useState<Record<string, any> | null>(
    widgetConfig?.staticData || null,
  )

  const defaultDataField = getWidgetDefaultFieldValue('recognitionCard')
  const dataSource = widgetConfig?.dataSource || 'static'
  const infoItems = Array.isArray(widgetConfig?.infoItems) ? widgetConfig.infoItems : []

  const loadData = useCallback(async () => {
    if (dataSource === 'static' || !widgetConfig?.apiEndpoint?.trim()) {
      setError(null)
      setRecordData(widgetConfig?.staticData || null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await requestWidgetApi({
        endpoint: widgetConfig.apiEndpoint.trim(),
        method: widgetConfig.apiMethod,
        headers: widgetConfig.apiHeaders,
        query: widgetConfig.apiQuery,
        body: widgetConfig.apiBody,
        dataField: widgetConfig.apiDataField || defaultDataField,
        timeout: widgetConfig.timeout,
        runtimeParams: runtimeParamsRef.current,
      })

      const payload = result.data ?? result.raw
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        setRecordData(payload as Record<string, any>)
        emitWidgetEvent('data.loaded', { data: payload, raw: result.raw }, 'system')
      } else {
        setRecordData(null)
      }
    } catch (err: any) {
      console.error('加载识别卡片数据失败:', err)
      const message = err?.message || '识别卡片数据加载失败'
      setError(message)
      emitWidgetEvent('data.error', { message, error: err }, 'system')
    } finally {
      setLoading(false)
    }
  }, [
    dataSource,
    defaultDataField,
    widgetConfig?.apiBody,
    widgetConfig?.apiDataField,
    widgetConfig?.apiEndpoint,
    widgetConfig?.apiHeaders,
    widgetConfig?.apiMethod,
    widgetConfig?.apiQuery,
    emitWidgetEvent,
    runtimeParamsRef,
    widgetConfig?.staticData,
    widgetConfig?.timeout,
  ])

  useWidgetEventInputs(widget, {
    reload: () => {
      void loadData()
    },
    setParams: (params, message) => {
      const input = widget?.config?.eventInputs?.find(item =>
        item.listenWidgetId === message.sourceWidgetId && item.listenEventName === message.name,
      )
      setRuntimeParams(params, 'replace')
    },
    setParamsAndReload: (params, message) => {
      const input = widget?.config?.eventInputs?.find(item =>
        item.listenWidgetId === message.sourceWidgetId && item.listenEventName === message.name,
      )
      setRuntimeParams(params, 'replace')
      void loadData()
    },
    clearParams: () => {
      clearRuntimeParams()
      void loadData()
    },
  })

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (
      dataSource !== 'static'
      && widgetConfig?.refreshInterval
      && widgetConfig.refreshInterval > 0
      && widgetConfig.apiEndpoint
    ) {
      intervalRef.current = setInterval(() => {
        void loadData()
      }, safeIntervalMs(widgetConfig.refreshInterval))
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [dataSource, loadData, widgetConfig?.apiEndpoint, widgetConfig?.refreshInterval])

  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      void loadData()
    }
  }, [loadData, widget?.refreshCount])

  const similarity = getValueByPath(recordData, widgetConfig?.similarityField || 'similarity')
  const imageUrl = getValueByPath(recordData, widgetConfig?.imageField || 'imageUrl')
  const plateNo = getValueByPath(recordData, widgetConfig?.plateNoField || 'plateNo')
  const personName = getValueByPath(recordData, widgetConfig?.personNameField || 'personName')
  const quickLinks = normalizeQuickLinks(recordData?.quickLinks)
  const visibleQuickLinks = quickLinks.slice(0, 2)
  const overflowQuickLinks = quickLinks.slice(2)

  const isLinkAvailable = useCallback(
    (link: RecognitionCardQuickLink) => {
      if (!link.url) {
        return false
      }
      return isSystemDeployed(deployedSystemSet, link.systemId)
    },
    [deployedSystemSet],
  )

  const handleLinkClick = useCallback(
    (link: RecognitionCardQuickLink) => {
      emitWidgetEvent('recognition.quickLinkClick', { link, data: recordData }, 'click')

      if (isEditMode || !isLinkAvailable(link) || !link.url) {
        return
      }

      if (link.openInNew) {
        window.open(link.url, '_blank', 'noopener,noreferrer')
        return
      }

      window.location.href = link.url
    },
    [emitWidgetEvent, isEditMode, isLinkAvailable, recordData],
  )

  const moreContent = (
    <div className="recognition-card-widget__more-links">
      {overflowQuickLinks.map(link => {
        const available = isLinkAvailable(link)
        return (
          <button
            key={link.id}
            type="button"
            className={`recognition-card-widget__quick-link recognition-card-widget__quick-link--popover ${available ? '' : 'is-disabled'}`}
            onClick={(event) => {
              event.stopPropagation()
              handleLinkClick(link)
            }}
          >
            <span>{link.title}</span>
            {/* {!available ? <LockOutlined /> : null} */}
          </button>
        )
      })}
    </div>
  )

  if (error) {
    return (
      <div className="recognition-card-widget__state">
        <Empty description={error} />
      </div>
    )
  }

  return (
    <Spin spinning={loading} wrapperClassName="recognition-card-widget__state">
      <div
        className="recognition-card-widget"
        onClick={() => emitWidgetEvent('recognition.click', { data: recordData }, 'click')}
      >
        {widgetConfig?.showSimilarity !== false ? (
          <div className="recognition-card-widget__header">
            <div className="recognition-card-widget__similarity">
              {formatSimilarity(similarity)}
            </div>
          </div>
        ) : null}

        <div className="recognition-card-widget__body">
          <div className="recognition-card-widget__image-wrap">
            {typeof imageUrl === 'string' && imageUrl.trim() ? (
              <img
                src={imageUrl}
                alt="识别图片"
                className="recognition-card-widget__image"
              />
            ) : (
              <div className="recognition-card-widget__image-empty">
                <PictureOutlined />
                <span>{EMPTY_IMAGE_TEXT}</span>
              </div>
            )}
          </div>

          <div className="recognition-card-widget__main">
            {(widgetConfig?.showPlateNo !== false || widgetConfig?.showPersonName !== false) ? (
              <div className="recognition-card-widget__name-row">
                {widgetConfig?.showPlateNo !== false ? (
                  <span className="recognition-card-widget__name">
                    {plateNo == null || plateNo === '' ? '--' : String(plateNo)}
                  </span>
                ) : null}
                {widgetConfig?.showPersonName !== false ? (
                  <span className="recognition-card-widget__sub-name">
                    {personName == null || personName === '' ? '--' : String(personName)}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="recognition-card-widget__info-list">
              {infoItems.map(item => {
                const fieldValue = getValueByPath(recordData, item.field)
                return (
                  <div key={item.id || item.field} className="recognition-card-widget__info-item">
                    <IconRenderer
                      value={item.icon || DEFAULT_INFO_ICON}
                      size={14}
                      className="recognition-card-widget__info-icon"
                    />
                    <span title={fieldValue == null ? '' : String(fieldValue)}>
                      {fieldValue == null || fieldValue === '' ? '--' : String(fieldValue)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {widgetConfig?.showQuickLinks !== false ? (
          <div className="recognition-card-widget__footer">
            {visibleQuickLinks.map(link => {
              const available = isLinkAvailable(link)
              return (
                <button
                  key={link.id}
                  type="button"
                  className={`recognition-card-widget__quick-link ${available ? '' : 'is-disabled'}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleLinkClick(link)
                  }}
                >
                  <span>{link.title}</span>
                  {/* {!available ? <LockOutlined /> : null} */}
                </button>
              )
            })}
            {overflowQuickLinks.length ? (
              <Popover placement="topRight" content={moreContent} trigger="hover">
                <button
                  type="button"
                  className="recognition-card-widget__more-trigger"
                >
                  <EllipsisOutlined />
                </button>
              </Popover>
            ) : null}
            {!visibleQuickLinks.length && !overflowQuickLinks.length ? (
              <div className="recognition-card-widget__footer-empty">
                <LinkOutlined />
                <span>暂无快捷链接</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Spin>
  )
}

export default RecognitionCardWidget
