import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Tag, Spin, Empty, Typography } from 'antd';
import { WidgetConfig, Widget } from '@/types';
import { safeIntervalMs } from '@/constants/dashboard';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';

/**
 * 列配置
 */
interface ColumnConfig {
  key: string;           // 字段key
  title: string;         // 列标题
  dataIndex: string;     // 数据字段
  width?: number | string;  // 列宽
  align?: 'left' | 'center' | 'right';  // 对齐方式
  type?: 'text' | 'number' | 'tag' | 'date' | 'status';  // 列类型
  tagColorMap?: Record<string, string>;  // tag颜色映射
  statusConfig?: { success: string[]; error: string[]; warning: string[] };  // 状态配置
  ellipsis?: boolean;    // 是否超长省略
  fixed?: 'left' | 'right';  // 固定列
  sorter?: boolean;      // 是否可排序
}

/**
 * 数据表格组件配置
 */
interface DataTableWidgetConfig extends WidgetConfig {
  apiEndpoint?: string;      // 数据接口地址
  apiHeaders?: Record<string, string>;  // 请求头
  refreshInterval?: number;  // 刷新间隔(秒)
  columns?: ColumnConfig[];  // 列配置
  tableData?: any[];         // 静态数据
  rowKey?: string;           // 行key字段
  pagination?: boolean | { pageSize?: number; showTotal?: boolean };  // 分页配置
  scrollY?: number;          // 表格纵向滚动高度
  scrollX?: number | string; // 表格横向滚动宽度
  bordered?: boolean;        // 是否显示边框
  size?: 'small' | 'middle' | 'large';  // 表格尺寸
  showHeader?: boolean;      // 是否显示表头
}

interface DataTableWidgetProps {
  config?: DataTableWidgetConfig;
  widget?: Widget;
}

// 默认列配置
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', title: '姓名', dataIndex: 'name' },
  { key: 'age', title: '年龄', dataIndex: 'age', type: 'number' },
  { key: 'status', title: '状态', dataIndex: 'status', type: 'tag' },
];

// 默认数据
const DEFAULT_DATA = [
  { key: '1', name: '张三', age: 32, status: '在线' },
  { key: '2', name: '李四', age: 42, status: '离线' },
  { key: '3', name: '王五', age: 28, status: '在线' },
];

const DataTableWidget: React.FC<DataTableWidgetProps> = ({ config, widget }) => {
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 获取配置
  const tableConfig = config as DataTableWidgetConfig;
  const apiEndpoint = tableConfig?.apiEndpoint;
  const refreshInterval = tableConfig?.refreshInterval || 0;
  const columnsConfig = tableConfig?.columns || DEFAULT_COLUMNS;
  const staticData = tableConfig?.tableData;
  const rowKey = tableConfig?.rowKey || 'key';
  const paginationConfig = tableConfig?.pagination;
  const scrollY = tableConfig?.scrollY || 240;
  const scrollX = tableConfig?.scrollX;
  const bordered = tableConfig?.bordered ?? false;
  const size = tableConfig?.size || 'small';
  const showTableHeader = tableConfig?.showHeader ?? true;

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (apiEndpoint) {
        // 从接口获取数据
        const headers = tableConfig?.apiHeaders;
        const response = await axios.get(apiEndpoint.trim(), headers ? { headers } : {});
        const data = response.data?.data || response.data?.list || response.data;
        if (Array.isArray(data)) {
          setTableData(data.map((item, index) => ({
            ...item,
            [rowKey]: item[rowKey] || `row-${index}`,
          })));
        } else {
          setTableData([]);
        }
      } else if (staticData && staticData.length > 0) {
        // 使用静态配置数据
        setTableData(staticData);
      } else {
        // 使用默认数据
        await new Promise(resolve => setTimeout(resolve, 300));
        setTableData(DEFAULT_DATA);
      }
    } catch (err: any) {
      console.error('加载表格数据失败:', err);
      setError(err.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, staticData, rowKey]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 设置轮询
  useEffect(() => {
    if (refreshInterval > 0 && apiEndpoint) {
      intervalRef.current = setInterval(() => {
        loadData();
      }, safeIntervalMs(refreshInterval));
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
      console.log('刷新表格组件数据...');
      loadData();
    }
  }, [widget?.refreshCount, loadData]);

  // 渲染列内容
  const renderColumnContent = (colConfig: ColumnConfig, value: any, _record: any) => {
    switch (colConfig.type) {
      case 'tag':
        if (Array.isArray(value)) {
          return (
            <>
              {value.map((tag: string, index: number) => {
                const color = colConfig.tagColorMap?.[tag] || (tag.length > 5 ? 'geekblue' : 'green');
                return (
                  <Tag color={color} key={`${tag}-${index}`}>
                    {tag}
                  </Tag>
                );
              })}
            </>
          );
        }
        const tagColor = colConfig.tagColorMap?.[value] || 'blue';
        return <Tag color={tagColor}>{value}</Tag>;

      case 'status':
        const { success = [], error: err = [], warning = [] } = colConfig.statusConfig || {};
        let statusColor = 'default';
        if (success.includes(value)) statusColor = 'success';
        else if (err.includes(value)) statusColor = 'error';
        else if (warning.includes(value)) statusColor = 'warning';
        return <Tag color={statusColor}>{value}</Tag>;

      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;

      case 'date':
        if (value) {
          try {
            return new Date(value).toLocaleDateString('zh-CN');
          } catch {
            return value;
          }
        }
        return '-';

      case 'text':
      default:
        if (colConfig.ellipsis) {
          return (
            <Typography.Text ellipsis={{ tooltip: value }}>
              {value ?? '-'}
            </Typography.Text>
          );
        }
        return value ?? '-';
    }
  };

  // 生成 Ant Design Table 列配置
  const generateColumns = useCallback((): ColumnsType<any> => {
    return columnsConfig.map(col => ({
      key: col.key,
      title: col.title,
      dataIndex: col.dataIndex,
      width: col.width,
      align: col.align,
      ellipsis: col.ellipsis,
      fixed: col.fixed,
      sorter: col.sorter ? (a: any, b: any) => {
        const aVal = a[col.dataIndex];
        const bVal = b[col.dataIndex];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal;
        }
        return String(aVal || '').localeCompare(String(bVal || ''));
      } : undefined,
      render: (value: any, record: any) => renderColumnContent(col, value, record),
    }));
  }, [columnsConfig]);

  // 分页配置
  const getPagination = () => {
    if (paginationConfig === false) return false;
    if (paginationConfig === true) return { pageSize: 10 };
    if (typeof paginationConfig === 'object') {
      return {
        pageSize: paginationConfig.pageSize || 10,
        showTotal: paginationConfig.showTotal ? (total: number) => `共 ${total} 条` : undefined,
      };
    }
    return false;
  };

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={error} />
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <Table
        columns={generateColumns()}
        dataSource={tableData}
        rowKey={rowKey}
        pagination={getPagination()}
        size={size}
        bordered={bordered}
        showHeader={showTableHeader}
        scroll={{ y: scrollY, x: scrollX }}
      />
    </Spin>
  );
};

export default DataTableWidget;
