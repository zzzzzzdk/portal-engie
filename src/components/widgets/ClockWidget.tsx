import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { WidgetConfig } from '@/types';

// 设置中文
dayjs.locale('zh-cn');

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

  // 中文星期
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekDay = weekDays[time.day()];

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
        {time.format('YYYY年MM月DD日')} {weekDay}
      </div>
    </div>
  );
};

export default ClockWidget;
