import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { WidgetConfig } from '@/types';

interface ChartWidgetProps {
  config?: WidgetConfig;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ config: _config }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      const option = {
        grid: {
          top: 30,
          bottom: 30,
          left: 30,
          right: 30,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            data: [150, 230, 224, 218, 135, 147, 260],
            type: 'line',
            smooth: true
          }
        ]
      };

      chartInstance.current.setOption(option);
    }

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    // 使用 ResizeObserver 监听容器大小变化，比 window.resize 更准确
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return (
    <div ref={chartRef} style={{ height: '100%', width: '100%' }} />
  );
};

export default ChartWidget;
