import React from 'react';
import { Table, Tag } from 'antd';
import { WidgetConfig } from '@/types';

interface DataTableWidgetProps {
  config?: WidgetConfig;
}

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Status',
    key: 'tags',
    dataIndex: 'tags',
    render: (_: any, { tags }: any) => (
      <>
        {tags.map((tag: string) => {
          let color = tag.length > 5 ? 'geekblue' : 'green';
          if (tag === 'loser') {
            color = 'volcano';
          }
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          );
        })}
      </>
    ),
  },
];

const data = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    tags: ['nice', 'developer'],
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    tags: ['loser'],
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    tags: ['cool', 'teacher'],
  },
];

const DataTableWidget: React.FC<DataTableWidgetProps> = ({ config: _config }) => {
  return (
    <Table columns={columns} dataSource={data} pagination={false} size="small" scroll={{ y: 240 }} />
  );
};

export default DataTableWidget;
