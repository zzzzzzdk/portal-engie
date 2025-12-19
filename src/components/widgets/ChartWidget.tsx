import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { Spin, Empty } from 'antd';
import { WidgetConfig, Widget } from '@/types';
import axios from 'axios';

/**
 * 图表类型
 */
type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';

/**
 * 图表组件配置
 */
interface ChartWidgetConfig extends WidgetConfig {
  apiEndpoint?: string;      // 数据接口地址
  refreshInterval?: number;  // 刷新间隔(秒)
  chartType?: ChartType;     // 图表类型
  chartTitle?: string;       // 图表标题
  xAxisField?: string;       // X轴数据字段
  yAxisField?: string;       // Y轴数据字段
  seriesField?: string;      // 系列数据字段
  smooth?: boolean;          // 是否平滑曲线
  showLegend?: boolean;      // 是否显示图例
  colors?: string[];         // 自定义颜色
}

interface ChartWidgetProps {
  config?: ChartWidgetConfig;
  widget?: Widget;
}

// 默认图表数据
const DEFAULT_DATA = {
  xAxis: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  series: [150, 230, 224, 218, 135, 147, 260],
};

const ChartWidget: React.FC<ChartWidgetProps> = ({ config, widget }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(DEFAULT_DATA);

  // 获取配置
  const chartConfig = config as ChartWidgetConfig;
  const apiEndpoint = chartConfig?.apiEndpoint;
  const refreshInterval = chartConfig?.refreshInterval || 0;
  const chartType = chartConfig?.chartType || 'line';
  const chartTitle = chartConfig?.chartTitle;
  const xAxisField = chartConfig?.xAxisField || 'xAxis';
  const yAxisField = chartConfig?.yAxisField || 'series';
  const smooth = chartConfig?.smooth ?? true;
  const showLegend = chartConfig?.showLegend ?? false;

  // 加载数据
  const loadData = useCallback(async () => {
    if (!apiEndpoint) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(apiEndpoint);
      const data = response.data?.data || response.data;
      setChartData(data);
    } catch (err: any) {
      console.error('加载图表数据失败:', err);
      setError(err.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  // 初始加载
  useEffect(() => {
    if (apiEndpoint) {
      loadData();
    }
  }, [apiEndpoint, loadData]);

  // 设置轮询
  useEffect(() => {
    if (refreshInterval > 0 && apiEndpoint) {
      intervalRef.current = setInterval(() => {
        loadData();
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshInterval, apiEndpoint, loadData]);

  // 响应刷新操作
  useEffect(() => {
    if (widget?.refreshCount && widget.refreshCount > 0) {
      console.log('刷新图表组件数据...');
      if (apiEndpoint) {
        loadData();
      }
    }
  }, [widget?.refreshCount, apiEndpoint, loadData]);

  // 生成图表配置
  const generateOption = useCallback(() => {
    const xData = chartData[xAxisField] || chartData.xAxis || DEFAULT_DATA.xAxis;
    const yData = chartData[yAxisField] || chartData.series || DEFAULT_DATA.series;

    const baseOption: echarts.EChartsOption = {
      grid: {
        top: chartTitle ? 40 : 30,
        bottom: 30,
        left: 30,
        right: 30,
        containLabel: true,
      },
      tooltip: {
        trigger: chartType === 'pie' ? 'item' : 'axis',
      },
      legend: showLegend ? { show: true } : { show: false },
    };

    if (chartTitle) {
      baseOption.title = {
        text: chartTitle,
        left: 'center',
        textStyle: { fontSize: 14 },
      };
    }

    // 根据图表类型生成不同配置
    switch (chartType) {
      case 'pie':
        return {
          ...baseOption,
          series: [
            {
              type: 'pie',
              radius: ['40%', '70%'],
              data: Array.isArray(yData[0])
                ? yData
                : xData.map((name: string, index: number) => ({
                    name,
                    value: yData[index] || 0,
                  })),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)',
                },
              },
              label: {
                formatter: '{b}: {c} ({d}%)',
              },
            },
          ],
        };

      case 'bar':
        return {
          ...baseOption,
          xAxis: { type: 'category', data: xData },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'bar',
              data: yData,
              itemStyle: {
                borderRadius: [4, 4, 0, 0],
              },
            },
          ],
        };

      case 'area':
        return {
          ...baseOption,
          xAxis: { type: 'category', data: xData, boundaryGap: false },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'line',
              data: yData,
              smooth,
              areaStyle: { opacity: 0.3 },
            },
          ],
        };

      case 'scatter':
        return {
          ...baseOption,
          xAxis: { type: 'value' },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'scatter',
              data: yData,
              symbolSize: 10,
            },
          ],
        };

      case 'line':
      default:
        return {
          ...baseOption,
          xAxis: { type: 'category', data: xData },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'line',
              data: yData,
              smooth,
            },
          ],
        };
    }
  }, [chartData, chartType, chartTitle, xAxisField, yAxisField, smooth, showLegend]);

  // 初始化和更新图表
  useEffect(() => {
    if (!chartRef.current || error) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = generateOption();
    chartInstance.current.setOption(option, true);

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [chartData, generateOption, error]);

  // 清理
  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={error} />
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <div ref={chartRef} style={{ height: '100%', width: '100%', minHeight: '200px' }} />
    </Spin>
  );
};

export default ChartWidget;
