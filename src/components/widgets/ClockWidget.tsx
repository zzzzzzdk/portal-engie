import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { WidgetConfig } from '@/types';

interface ClockWidgetProps {
  config?: WidgetConfig;
}

const ClockWidget: React.FC<ClockWidgetProps> = ({ config }) => {
  const [time, setTime] = useState(dayjs());

  useEffect(() => {
    const interval = config?.refreshInterval ? config.refreshInterval * 1000 : 1000;
    const timer = setInterval(() => {
      setTime(dayjs());
    }, interval);

    return () => clearInterval(timer);
  }, [config?.refreshInterval]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100%',
      color: '#1890ff'
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        {time.format('HH:mm:ss')}
      </div>
      <div style={{ fontSize: '1rem', color: '#666' }}>
        {time.format('YYYY-MM-DD dddd')}
      </div>
    </div>
  );
};

export default ClockWidget;
