import React, { useEffect, useMemo, useState } from 'react'
import { LoadingOutlined } from '@ant-design/icons'
import { Result, Spin } from 'antd'
import './index.scss'

interface MicroAppDegradeCardProps {
  title?: string
  systemId?: string
  moduleId?: string
  url?: string
  entry?: string
  compact?: boolean
}

const MicroAppDegradeCard: React.FC<MicroAppDegradeCardProps> = ({ title, url, entry }) => {
  const targetUrl = useMemo(() => url || entry || '', [entry, url])
  const displayTitle = title || '微应用'
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  
  useEffect(() => {
    setLoaded(false)
    setError(!targetUrl)
  }, [targetUrl])

  return (
    <div className="micro-app-degrade-card">
      {!loaded && !error ? (
        <div className="micro-app-degrade-card__loading">
          <Spin indicator={<LoadingOutlined spin />} />
        </div>
      ) : null}
      {error ? (
        <div className="micro-app-degrade-card__empty">
          <Result status="error" title="微应用加载失败" />
        </div>
      ) : null}
      {targetUrl ? (
        <iframe
          className="micro-app-degrade-card__frame"
          src={targetUrl}
          title={displayTitle}
          loading="lazy"
          allow="fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            setLoaded(true)
            setError(false)
          }}
          onError={() => {
            setLoaded(true)
            setError(true)
          }}
        />
      ) : null}
    </div>
  )
}

export default MicroAppDegradeCard
