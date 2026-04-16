import React, { useEffect, useState } from "react";
import { Select, Spin, Typography, message } from "antd";
import { getDataSourceList } from "@/services/dataSource";
import type { DataSourceItem, DataSourceMethod } from "@/services/dataSource";
import "./index.scss";

const { Text } = Typography;

interface DataSourceSelectProps {
  value?: string;
  onChange?: (id: string, dataSource: DataSourceItem) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: number | string;
}

const METHOD_COLORS: Record<DataSourceMethod, string> = {
  GET: "#52c41a",
  POST: "#1677ff",
};

const DataSourceSelect: React.FC<DataSourceSelectProps> = ({
  value,
  onChange,
  placeholder = "请选择数据源接口",
  disabled = false,
  width,
}) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<DataSourceItem[]>([]);

  useEffect(() => {
    const loadDataSources = async () => {
      setLoading(true);
      try {
        const res = await getDataSourceList({ page: 1, page_size: 999 });
        setOptions(res.data?.list ?? []);
      } catch (err) {
        console.error("Failed to load data sources:", err);
        message.error("加载数据源列表失败");
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    void loadDataSources();
  }, []);

  const handleChange = (id: string) => {
    const selected = options.find((item) => item.id === id);
    if (!selected) {
      return;
    }

    onChange?.(id, selected);
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{ width: width ?? "100%" }}
      showSearch
      filterOption={
        (input, option: any) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        // String(option?.data?.searchText || '').toLowerCase().includes(input.toLowerCase())
      }
      options={options.map((item) => ({
        label: item.name,
        value: item.id,
        dataSource: item,
        searchText: [item.name, item.url, item.description]
          .filter(Boolean)
          .join(" "),
      }))}
      optionRender={(option) => {
        const dataSource = option.data.dataSource as DataSourceItem;

        return (
          <div className="data-source-option">
            <span
              className="data-source-method-tag"
              style={{
                color: METHOD_COLORS[dataSource.method],
                borderColor: METHOD_COLORS[dataSource.method],
              }}
            >
              {dataSource.method}
            </span>
            <Text className="data-source-name">{dataSource.name}</Text>
          </div>
        );
      }}
      notFoundContent={
        loading ? (
          <Spin size="small" />
        ) : (
          <Text type="secondary">暂无可用数据源</Text>
        )
      }
    />
  );
};

export default DataSourceSelect;
