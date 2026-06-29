import React from 'react'
import MicroAppWidget from '@/components/widgets/MicroAppWidget'
import MicroAppDegradeCard from '@/components/MicroAppDegradeCard'
import { LocalComponentRegistry } from '@/components/FloatingModule/components'
import { usePortalRuntime } from '@/runtime/portal-runtime-context'
import type { DashboardConfig, FloatingModuleConfig, Widget } from '@/types'

interface MobileFloatingModuleSectionProps {
  modules: Widget[]
  dashboardConfig?: DashboardConfig
}

const MobileFloatingModuleSection: React.FC<MobileFloatingModuleSectionProps> = ({
  modules,
  dashboardConfig,
}) => {
  const { microAppMode } = usePortalRuntime()

  if (!modules.length) {
    return null
  }

  return (
    <section className="mobile-dashboard-floating">
      <div className="mobile-dashboard-floating__header">悬浮模块</div>
      <div className="mobile-dashboard-floating__list">
        {modules.map(module => {
          const config = module.config as FloatingModuleConfig

          return (
            <section className="mobile-dashboard-floating__item" key={module.id}>
              <div className="mobile-dashboard-floating__title">{module.title}</div>
              <div className="mobile-dashboard-floating__content">
                {config.contentType === 'microApp' ? (
                  microAppMode === 'degrade'
                    ? (
                      <MicroAppDegradeCard
                        title={module.title}
                        systemId={config.microApp?.systemId}
                        moduleId={config.microApp?.moduleId}
                        url={config.microApp?.url}
                        entry={config.microApp?.entry}
                      />
                    )
                    : (
                      <MicroAppWidget
                        config={{
                          systemId: config.microApp?.systemId,
                          moduleId: config.microApp?.moduleId,
                          microAppUrl: config.microApp?.url,
                          microAppEntry: config.microApp?.entry,
                          props: config.microApp?.props,
                          sync: config.microApp?.sync,
                          alive: config.microApp?.alive,
                        }}
                        dashboardConfig={dashboardConfig}
                      />
                    )
                ) : null}
                {config.contentType === 'localComponent' ? (() => {
                  const componentType = config.localComponent?.componentType
                  if (!componentType) {
                    return <div className="mobile-dashboard-preview__unsupported">未配置组件类型</div>
                  }

                  const Component = LocalComponentRegistry[componentType]
                  if (!Component) {
                    return <div className="mobile-dashboard-preview__unsupported">未找到组件 {componentType}</div>
                  }

                  return <Component {...(config.localComponent?.componentProps || {})} />
                })() : null}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

export default MobileFloatingModuleSection
