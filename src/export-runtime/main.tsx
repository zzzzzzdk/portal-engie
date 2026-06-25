import '@/polyfills/array-find-last'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import 'gridstack/dist/gridstack.min.css'
import '@/assets/css/index.scss'
import '@/pages/DashboardGridStack/index.scss'
import '@/pages/DashboardPreview/index.scss'
import ErrorBoundary from '@/components/ErrorBoundary'
import ExportRuntimeApp from './app'
import './runtime.scss'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ConfigProvider locale={zhCN}>
      <AntdApp>
        <ExportRuntimeApp />
      </AntdApp>
    </ConfigProvider>
  </ErrorBoundary>,
)
