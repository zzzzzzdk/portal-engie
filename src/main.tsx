import './polyfills/array-find-last'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import './assets/css/index.scss'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('e2e') === 'widget-events') {
  import('./e2e/WidgetEventLinkageFixture').then(({ default: WidgetEventLinkageFixture }) => {
    root.render(<WidgetEventLinkageFixture />)
  })
} else {
  root.render(
    // <React.StrictMode>
      <ErrorBoundary>
        <ConfigProvider locale={zhCN}>
          <AntdApp>
            <App />
          </AntdApp>
        </ConfigProvider>
      </ErrorBoundary>
    // </React.StrictMode>,
  )
}
