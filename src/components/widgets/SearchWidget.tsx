import React from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { WidgetConfig } from '@/types';

interface SearchWidgetProps {
  config?: WidgetConfig;
}

const SearchWidget: React.FC<SearchWidgetProps> = ({ config: _config }) => {
  const onSearch = (value: string) => console.log(value);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 20px' }}>
      <Input.Search
        placeholder="Search everything..."
        allowClear
        enterButton={<Button type="primary" icon={<SearchOutlined />}>Search</Button>}
        size="large"
        onSearch={onSearch}
      />
    </div>
  );
};

export default SearchWidget;
