import React from 'react';
import { useStore } from '@/store/useStore';
import MicroAppWidget from '@/components/widgets/MicroAppWidget';
import { MicroAppWidgetConfig } from '@/types';

/**
 * 全局无边框微应用容器
 * 用于渲染那些自带窗口管理（如气泡+弹窗）的微应用
 * 它们不需要 FloatingModule 的外壳，而是直接挂载在页面上
 */
const GlobalMicroAppContainer: React.FC = () => {
  const { globalMicroApps } = useStore();

  if (!globalMicroApps || globalMicroApps.length === 0) {
    return null;
  }

  return (
    <div 
      className="global-micro-app-container" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: 1, 
        height: 1, 
        zIndex: 9000, // 确保在较上层，但低于 Modal
        pointerEvents: 'none' // 容器不阻挡点击
      }}
    >
      {globalMicroApps.map(app => (
        <div 
          key={app.id} 
          style={{ 
            pointerEvents: 'auto', // 恢复子应用点击
            position: 'absolute',
            width: 1,
            height: 1
          }}
        >
          <MicroAppWidget 
            config={app.config as MicroAppWidgetConfig} 
          />
        </div>
      ))}
    </div>
  );
};

export default GlobalMicroAppContainer;
